import { findCompositionProblems } from './composition';
import { DomainError } from './domain-error';
import { isSame } from './resolve';
import type { PublishedVersion, ResolvedTree } from './types';

export function publishVersion(
  versions: PublishedVersion[],
  workingTree: ResolvedTree,
  publishedAt: string,
): PublishedVersion {
  const problem = findCompositionProblems(workingTree)[0];
  if (problem) {
    throw new DomainError(
      `Publication impossible — ${problem.itemLabel} : ${problem.message}`,
    );
  }
  if (!hasChangesSince(versions.at(-1), workingTree)) {
    throw new DomainError('Rien n’a changé depuis la dernière version.');
  }

  const version: PublishedVersion = {
    versionNumber: versions.length + 1,
    publishedAt,
    tree: structuredClone(workingTree),
  };
  return deepFreeze(version);
}

export function hasChangesSince(
  lastVersion: PublishedVersion | undefined,
  workingTree: ResolvedTree,
): boolean {
  if (!lastVersion) return true;
  const published = {
    product: lastVersion.tree.product,
    rootItem: lastVersion.tree.rootItem,
  };
  const current = {
    product: workingTree.product,
    rootItem: workingTree.rootItem,
  };
  return !isSame(published, current);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
