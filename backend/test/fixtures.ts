// Données et utilitaires partagés par les tests du domaine : les vrais fichiers de data/.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { receiveDeclaredTree } from '../src/domain/resolve';
import type {
  CorrectableStepField,
  DeclaredTree,
  DeclaredTreeRecord,
  RefreshFile,
  ResolvedStep,
  ResolvedTree,
  ResolvedTreeItem,
  SetStepFieldCorrection,
} from '../src/domain/types';

const DATA_DIR = join(__dirname, '..', '..', 'data');

function loadJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, relativePath), 'utf-8')) as T;
}

export const mariniereTree = loadJson<DeclaredTree>(
  'trees/tshirt-mariniere.json',
);
export const mariniereRefresh = loadJson<RefreshFile>(
  'refreshes/tshirt-mariniere.refresh-2026-09-20.json',
);
export const denimTree = loadJson<DeclaredTree>('trees/jacket-denim-brut.json');

// Construit un historique en recevant chaque arbre dans l'ordre (daté par product.lastModifiedAt).
export function receiveAll(trees: DeclaredTree[]): DeclaredTreeRecord[] {
  let history: DeclaredTreeRecord[] = [];
  for (const tree of trees) {
    history = receiveDeclaredTree(history, tree, tree.product.lastModifiedAt);
  }
  return history;
}

export function setStepField(
  id: string,
  stepId: string,
  field: CorrectableStepField,
  value: string | null,
  declaredValueAtCorrection: string | null,
): SetStepFieldCorrection {
  return {
    id,
    createdAt: '2026-09-10T10:00:00.000Z',
    type: 'SET_STEP_FIELD',
    target: { stepId, field },
    value,
    declaredValueAtCorrection,
  };
}

function allSteps(item: ResolvedTreeItem): ResolvedStep[] {
  return [...item.steps, ...item.children.flatMap(allSteps)];
}

function allItems(item: ResolvedTreeItem): ResolvedTreeItem[] {
  return [item, ...item.children.flatMap(allItems)];
}

export function findResolvedStep(
  tree: ResolvedTree,
  stepId: string,
): ResolvedStep | undefined {
  return allSteps(tree.rootItem).find((step) => step.id === stepId);
}

export function getResolvedStep(
  tree: ResolvedTree,
  stepId: string,
): ResolvedStep {
  const step = findResolvedStep(tree, stepId);
  if (!step) throw new Error(`Step ${stepId} not found`);
  return step;
}

export function findResolvedItem(
  tree: ResolvedTree,
  itemId: string,
): ResolvedTreeItem | undefined {
  return allItems(tree.rootItem).find((item) => item.id === itemId);
}

export function statusOf(tree: ResolvedTree, correctionId: string) {
  return tree.corrections.find((c) => c.correction.id === correctionId)?.status;
}
