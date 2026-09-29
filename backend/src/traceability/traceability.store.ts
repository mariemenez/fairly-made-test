import { Injectable } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { receiveDeclaredTree } from '../domain/resolve';
import type {
  Correction,
  DeclaredTree,
  DeclaredTreeRecord,
  ProcessDefinition,
  PublishedVersion,
  RefreshFile,
  Supplier,
} from '../domain/types';

export interface ProductRecord {
  declaredTrees: DeclaredTreeRecord[];
  corrections: Correction[];
  versions: PublishedVersion[];
  lastModifiedAt: string;
}

export interface ReferenceData {
  suppliers: Supplier[];
  processes: ProcessDefinition[];
  rawMaterials: string[];
}

const DATA_DIR = join(__dirname, '..', '..', '..', 'data');

@Injectable()
export class TraceabilityStore {
  private readonly products = new Map<string, ProductRecord>();
  readonly refreshFiles = readJsonFiles<RefreshFile>('refreshes');
  readonly referenceData = readReferenceData();

  constructor() {
    for (const tree of readJsonFiles<DeclaredTree>('trees')) {
      const receivedAt = tree.product.lastModifiedAt;
      this.products.set(tree.product.id, {
        declaredTrees: receiveDeclaredTree([], tree, receivedAt),
        corrections: [],
        versions: [],
        lastModifiedAt: receivedAt,
      });
    }
  }

  listProductIds(): string[] {
    return [...this.products.keys()];
  }

  findProduct(productId: string): ProductRecord | undefined {
    return this.products.get(productId);
  }

  saveProduct(productId: string, record: ProductRecord): void {
    this.products.set(productId, record);
  }
}

function readReferenceData(): ReferenceData {
  const { suppliers } = readJson<{ suppliers: Supplier[] }>('suppliers.json');
  const { processes, rawMaterials } =
    readJson<Omit<ReferenceData, 'suppliers'>>('processes.json');
  return { suppliers, processes, rawMaterials };
}

function readJsonFiles<T>(directory: string): T[] {
  return readdirSync(join(DATA_DIR, directory))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
    .map((fileName) => readJson<T>(join(directory, fileName)));
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, relativePath), 'utf-8')) as T;
}
