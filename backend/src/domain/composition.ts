import type {
  CompositionEntry,
  CompositionProblem,
  ResolvedTree,
  ResolvedTreeItem,
} from './types';

export function compositionError(entries: CompositionEntry[]): string | null {
  const total = entries.reduce((sum, entry) => sum + entry.percentage, 0);
  if (Math.abs(total - 100) < 0.01) return null;
  return `La composition fait ${Math.round(total * 100) / 100} % au lieu de 100 %.`;
}

export function findCompositionProblems(
  tree: ResolvedTree,
): CompositionProblem[] {
  return listItems(tree.rootItem).flatMap((item) => {
    if (item.kind !== 'COMPONENT') return [];
    const message = compositionError(item.composition.value);
    return message ? [{ itemId: item.id, itemLabel: item.label, message }] : [];
  });
}

export function listItems(item: ResolvedTreeItem): ResolvedTreeItem[] {
  return [item, ...item.children.flatMap(listItems)];
}
