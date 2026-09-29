import { randomUUID } from 'node:crypto';
import { compositionError } from './composition';
import { DomainError } from './domain-error';
import { computeStatus, findItem, findStep } from './resolve';
import type { Correction, CorrectionInput, DeclaredTree } from './types';

export function addCorrection(
  declared: DeclaredTree,
  corrections: Correction[],
  input: CorrectionInput,
): Correction[] {
  console.log('Adding correction with input:', input);
  const correction = buildCorrection(declared, corrections, input);
  console.log('Built correction:', correction);
  const others = corrections.filter(
    (existing) => !hasSameTarget(existing, correction),
  );
  console.log('Final corrections list:', [...others, correction]);
  return [...others, correction];
}

export function removeCorrection(
  corrections: Correction[],
  correctionId: string,
): Correction[] {
  findCorrection(corrections, correctionId);
  return corrections.filter((correction) => correction.id !== correctionId);
}

export function keepCorrection(
  declared: DeclaredTree,
  corrections: Correction[],
  correctionId: string,
): Correction[] {
  const correction = findCorrection(corrections, correctionId);
  if (computeStatus(correction, declared) !== 'CONFLICT') {
    throw new DomainError(
      'Seule une correction en conflit peut être confirmée.',
    );
  }
  const kept = withCurrentDeclaredValue(correction, declared);
  return corrections.map((c) => (c.id === correctionId ? kept : c));
}

function buildCorrection(
  declared: DeclaredTree,
  corrections: Correction[],
  input: CorrectionInput,
): Correction {
  const base = { id: `cor_${randomUUID()}`, createdAt: now() };

  switch (input.type) {
    case 'SET_STEP_FIELD': {
      const addedByBrand = corrections.some(
        (c) => c.type === 'ADD_STEP' && c.value.id === input.stepId,
      );
      if (addedByBrand) {
        throw new DomainError(
          'Étape ajoutée par la marque : supprimez-la puis ajoutez-la à nouveau.',
        );
      }
      const step = findStep(declared.rootItem, input.stepId);
      if (!step) throw new DomainError(`Étape ${input.stepId} introuvable.`);
      return {
        ...base,
        type: 'SET_STEP_FIELD',
        target: { stepId: input.stepId, field: input.field },
        value: input.value,
        declaredValueAtCorrection: step[input.field],
      };
    }

    case 'ADD_STEP': {
      if (!findItem(declared.rootItem, input.itemId)) {
        throw new DomainError(`Élément ${input.itemId} introuvable.`);
      }
      return {
        ...base,
        type: 'ADD_STEP',
        target: { itemId: input.itemId },
        value: {
          id: `stp_app_${randomUUID()}`,
          process: input.process,
          supplierId: input.supplierId,
          countryCode: input.countryCode,
        },
      };
    }

    case 'SET_COMPOSITION': {
      const item = findItem(declared.rootItem, input.itemId);
      if (item?.kind !== 'COMPONENT') {
        throw new DomainError(`Composant ${input.itemId} introuvable.`);
      }
      const composition = input.composition.map((entry) => ({
        id: entry.id ?? `cmp_app_${randomUUID()}`,
        rawMaterial: entry.rawMaterial,
        percentage: entry.percentage,
        originCountryCode: entry.originCountryCode,
      }));
      const error = compositionError(composition);
      if (error) throw new DomainError(error);
      return {
        ...base,
        type: 'SET_COMPOSITION',
        target: { itemId: input.itemId },
        value: composition,
        declaredValueAtCorrection: item.composition,
      };
    }
  }
}

function hasSameTarget(a: Correction, b: Correction): boolean {
  if (a.type === 'SET_STEP_FIELD' && b.type === 'SET_STEP_FIELD') {
    return (
      a.target.stepId === b.target.stepId && a.target.field === b.target.field
    );
  }
  if (a.type === 'SET_COMPOSITION' && b.type === 'SET_COMPOSITION') {
    return a.target.itemId === b.target.itemId;
  }
  return false;
}

function withCurrentDeclaredValue(
  correction: Correction,
  declared: DeclaredTree,
): Correction {
  const createdAt = now();
  if (correction.type === 'SET_STEP_FIELD') {
    const step = findStep(declared.rootItem, correction.target.stepId);
    return {
      ...correction,
      createdAt,
      declaredValueAtCorrection: step?.[correction.target.field] ?? null,
    };
  }
  if (correction.type === 'SET_COMPOSITION') {
    const item = findItem(declared.rootItem, correction.target.itemId);
    const composition = item?.kind === 'COMPONENT' ? item.composition : [];
    return { ...correction, createdAt, declaredValueAtCorrection: composition };
  }
  return correction;
}

function findCorrection(
  corrections: Correction[],
  correctionId: string,
): Correction {
  const correction = corrections.find((c) => c.id === correctionId);
  if (!correction)
    throw new DomainError(`Correction ${correctionId} introuvable.`);
  return correction;
}

function now(): string {
  return new Date().toISOString();
}
