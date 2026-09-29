import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { findCompositionProblems } from '../domain/composition';
import {
  addCorrection,
  keepCorrection,
  removeCorrection,
} from '../domain/corrections';
import { hasChangesSince, publishVersion } from '../domain/publish';
import {
  currentDeclaredTree,
  receiveDeclaredTree,
  resolveWorkingTree,
} from '../domain/resolve';
import type {
  CompositionProblem,
  Correction,
  CorrectionInput,
  DeclaredTree,
  PublishedVersion,
  ResolvedTree,
} from '../domain/types';
import {
  TraceabilityStore,
  type ProductRecord,
  type ReferenceData,
} from './traceability.store';

export interface VersionReference {
  versionNumber: number;
  publishedAt: string;
}

export interface ProductSummary {
  productId: string;
  name: string;
  reference: string;
  season: string;
  lastVersion: VersionReference | null;
  hasUnpublishedChanges: boolean;
  lastModifiedAt: string;
}

export interface WorkingTreeView {
  tree: ResolvedTree;
  compositionProblems: CompositionProblem[];
  hasUnpublishedChanges: boolean;
  lastVersion: VersionReference | null;
}

export interface RefreshOutcome {
  accepted: boolean;
  workingTree: WorkingTreeView;
}

@Injectable()
export class TraceabilityService {
  constructor(private readonly store: TraceabilityStore) {}

  getReferenceData(): ReferenceData {
    return this.store.referenceData;
  }

  listProducts(): ProductSummary[] {
    return this.store.listProductIds().map((productId) => {
      const product = this.getProduct(productId);
      const view = this.buildView(product);
      return {
        productId,
        name: view.tree.product.name,
        reference: view.tree.product.reference,
        season: view.tree.product.season,
        lastVersion: view.lastVersion,
        hasUnpublishedChanges: view.hasUnpublishedChanges,
        lastModifiedAt: product.lastModifiedAt,
      };
    });
  }

  getWorkingTree(productId: string): WorkingTreeView {
    return this.buildView(this.getProduct(productId));
  }

  addCorrection(productId: string, input: CorrectionInput): WorkingTreeView {
    const product = this.getProduct(productId);
    const declared = currentDeclaredTree(product.declaredTrees);
    return this.saveCorrections(
      productId,
      addCorrection(declared, product.corrections, input),
    );
  }

  removeCorrection(productId: string, correctionId: string): WorkingTreeView {
    const product = this.getProduct(productId);
    return this.saveCorrections(
      productId,
      removeCorrection(product.corrections, correctionId),
    );
  }

  keepCorrection(productId: string, correctionId: string): WorkingTreeView {
    const product = this.getProduct(productId);
    const declared = currentDeclaredTree(product.declaredTrees);
    return this.saveCorrections(
      productId,
      keepCorrection(declared, product.corrections, correctionId),
    );
  }

  receiveRefresh(productId: string, tree: DeclaredTree): RefreshOutcome {
    if (tree.product?.id !== productId) {
      throw new BadRequestException(
        `Ce refresh ne concerne pas le produit ${productId}.`,
      );
    }
    const product = this.getProduct(productId);
    const receivedAt = new Date().toISOString();
    const declaredTrees = receiveDeclaredTree(
      product.declaredTrees,
      tree,
      receivedAt,
    );
    const accepted = declaredTrees !== product.declaredTrees;
    if (accepted) {
      this.store.saveProduct(productId, {
        ...product,
        declaredTrees,
        lastModifiedAt: receivedAt,
      });
    }
    return { accepted, workingTree: this.getWorkingTree(productId) };
  }

  simulateRefresh(productId: string): RefreshOutcome {
    const refreshes = this.store.refreshFiles
      .filter((file) => file.product.id === productId)
      .sort((a, b) => a.refreshedAt.localeCompare(b.refreshedAt));
    if (refreshes.length === 0) {
      throw new NotFoundException('Aucun refresh à simuler pour ce produit.');
    }

    const product = this.getProduct(productId);
    const currentDate = currentDeclaredTree(product.declaredTrees).product
      .lastModifiedAt;
    const next = refreshes.find(
      (file) => file.product.lastModifiedAt > currentDate,
    );
    if (!next)
      return { accepted: false, workingTree: this.getWorkingTree(productId) };

    return this.receiveRefresh(productId, next);
  }

  publish(productId: string): PublishedVersion {
    const product = this.getProduct(productId);
    const version = publishVersion(
      product.versions,
      this.resolve(product),
      new Date().toISOString(),
    );
    this.store.saveProduct(productId, {
      ...product,
      versions: [...product.versions, version],
    });
    return version;
  }

  listVersions(productId: string): VersionReference[] {
    return this.getProduct(productId).versions.map(toReference);
  }

  getVersion(productId: string, versionNumber: number): PublishedVersion {
    const { versions } = this.getProduct(productId);
    const version = versions.find((v) => v.versionNumber === versionNumber);
    if (!version)
      throw new NotFoundException(`Version ${versionNumber} introuvable.`);
    return version;
  }

  private getProduct(productId: string): ProductRecord {
    const product = this.store.findProduct(productId);
    if (!product)
      throw new NotFoundException(`Produit ${productId} introuvable.`);
    return product;
  }

  private resolve(product: ProductRecord) {
    return resolveWorkingTree(
      currentDeclaredTree(product.declaredTrees),
      product.corrections,
    );
  }

  private buildView(product: ProductRecord): WorkingTreeView {
    const tree = this.resolve(product);
    const lastVersion = product.versions.at(-1);
    return {
      tree,
      compositionProblems: findCompositionProblems(tree),
      hasUnpublishedChanges: hasChangesSince(lastVersion, tree),
      lastVersion: lastVersion ? toReference(lastVersion) : null,
    };
  }

  private saveCorrections(
    productId: string,
    corrections: Correction[],
  ): WorkingTreeView {
    const product = this.getProduct(productId);
    const updated = {
      ...product,
      corrections,
      lastModifiedAt: new Date().toISOString(),
    };
    this.store.saveProduct(productId, updated);
    return this.buildView(updated);
  }
}

function toReference(version: PublishedVersion): VersionReference {
  return {
    versionNumber: version.versionNumber,
    publishedAt: version.publishedAt,
  };
}
