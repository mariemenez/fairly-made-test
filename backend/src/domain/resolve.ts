import type {
  CompositionEntry,
  CorrectableStepField,
  Correction,
  CorrectionStatus,
  CorrectionWithStatus,
  DeclaredTree,
  DeclaredTreeRecord,
  ResolvedStep,
  ResolvedTree,
  ResolvedTreeItem,
  Step,
  TrackedValue,
  TreeItem,
} from './types';

export function isSame(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Ajoute l'arbre reçu à l'historique, sauf s'il est strictement identique au dernier reçu
export function receiveDeclaredTree(
  history: DeclaredTreeRecord[],
  incoming: DeclaredTree,
  receivedAt: string,
): DeclaredTreeRecord[] {
  const current = history.at(-1);
  if (current && isSame(current.tree, incoming)) return history;
  return [...history, { receivedAt, tree: structuredClone(incoming) }];
}

export function currentDeclaredTree(
  history: DeclaredTreeRecord[],
): DeclaredTree {
  const current = history.at(-1);
  if (!current) throw new Error('No declared tree received yet');
  return current.tree;
}

export function computeStatus(
  correction: Correction,
  declared: DeclaredTree,
): CorrectionStatus {
  switch (correction.type) {
    case 'ADD_STEP':
      return findItem(declared.rootItem, correction.target.itemId)
        ? 'APPLIED'
        : 'ORPHANED';

    case 'SET_STEP_FIELD': {
      const step = findStep(declared.rootItem, correction.target.stepId);
      if (!step) return 'ORPHANED';
      return compare(step[correction.target.field], correction);
    }

    case 'SET_COMPOSITION': {
      const item = findItem(declared.rootItem, correction.target.itemId);
      if (item?.kind !== 'COMPONENT') return 'ORPHANED';
      return compare(item.composition, correction);
    }
  }
}

function compare(
  currentDeclared: unknown,
  correction: { value: unknown; declaredValueAtCorrection: unknown },
): 'APPLIED' | 'CONFLICT' {
  if (isSame(currentDeclared, correction.value)) return 'APPLIED';
  if (isSame(currentDeclared, correction.declaredValueAtCorrection))
    return 'APPLIED';
  return 'CONFLICT';
}

type ActiveCorrection = CorrectionWithStatus & {
  status: 'APPLIED' | 'CONFLICT';
};

export function resolveWorkingTree(
  declared: DeclaredTree,
  corrections: Correction[],
): ResolvedTree {
  const withStatus: CorrectionWithStatus[] = corrections.map((correction) => ({
    correction,
    status: computeStatus(correction, declared),
  }));
  // Une correction orpheline est listée mais jamais appliquée
  const active = withStatus.filter(
    (c): c is ActiveCorrection => c.status !== 'ORPHANED',
  );

  const root = declared.rootItem;
  return {
    brand: declared.brand,
    product: declared.product,
    rootItem: {
      ...root,
      steps: resolveSteps(root, active),
      children: root.children.map((child) => resolveItem(child, active)),
    },
    corrections: withStatus,
  };
}

function resolveItem(
  item: TreeItem,
  active: ActiveCorrection[],
): ResolvedTreeItem {
  const steps = resolveSteps(item, active);
  const children = item.children.map((child) => resolveItem(child, active));

  if (item.kind === 'COMPONENT') {
    const composition = resolveComposition(item.id, item.composition, active);
    return { ...item, composition, steps, children };
  }
  return { ...item, steps, children };
}

function resolveComposition(
  itemId: string,
  declaredValue: CompositionEntry[],
  active: ActiveCorrection[],
): TrackedValue<CompositionEntry[]> {
  for (const { correction, status } of active) {
    if (
      correction.type === 'SET_COMPOSITION' &&
      correction.target.itemId === itemId
    ) {
      return corrected(correction.value, correction.id, status, declaredValue);
    }
  }
  return { provenance: 'DECLARED', value: declaredValue };
}

function resolveSteps(
  item: TreeItem,
  active: ActiveCorrection[],
): ResolvedStep[] {
  const steps: ResolvedStep[] = item.steps.map((step) => ({
    id: step.id,
    process: step.process,
    supplierId: resolveStepField(step, 'supplierId', active),
    countryCode: resolveStepField(step, 'countryCode', active),
    provenance: 'DECLARED',
  }));

  for (const { correction } of active) {
    if (
      correction.type === 'ADD_STEP' &&
      correction.target.itemId === item.id
    ) {
      const added = correction.value;
      steps.push({
        id: added.id,
        process: added.process,
        supplierId: corrected(added.supplierId, correction.id, 'APPLIED', null),
        countryCode: corrected(
          added.countryCode,
          correction.id,
          'APPLIED',
          null,
        ),
        provenance: 'CORRECTED',
        addedByCorrectionId: correction.id,
      });
    }
  }
  return steps;
}

function resolveStepField(
  step: Step,
  field: CorrectableStepField,
  active: ActiveCorrection[],
): TrackedValue<string | null> {
  for (const { correction, status } of active) {
    if (
      correction.type === 'SET_STEP_FIELD' &&
      correction.target.stepId === step.id &&
      correction.target.field === field
    ) {
      return corrected(correction.value, correction.id, status, step[field]);
    }
  }
  return { provenance: 'DECLARED', value: step[field] };
}

function corrected<T>(
  value: T,
  correctionId: string,
  status: 'APPLIED' | 'CONFLICT',
  declaredValue: T,
): TrackedValue<T> {
  return {
    provenance: 'CORRECTED',
    value,
    correctionId,
    status,
    declaredValue,
  };
}

export function findItem(item: TreeItem, itemId: string): TreeItem | undefined {
  if (item.id === itemId) return item;
  for (const child of item.children) {
    const found = findItem(child, itemId);
    if (found) return found;
  }
  return undefined;
}

export function findStep(item: TreeItem, stepId: string): Step | undefined {
  const ownStep = item.steps.find((step) => step.id === stepId);
  if (ownStep) return ownStep;
  for (const child of item.children) {
    const found = findStep(child, stepId);
    if (found) return found;
  }
  return undefined;
}
