import {
  findResolvedItem,
  findResolvedStep,
  getResolvedStep,
  mariniereRefresh as refresh,
  mariniereTree as initialTree,
  receiveAll,
  setStepField,
  statusOf,
} from '../../test/fixtures';
import {
  currentDeclaredTree,
  receiveDeclaredTree,
  resolveWorkingTree,
} from './resolve';
import type { AddStepCorrection } from './types';

const afterRefresh = currentDeclaredTree(receiveAll([initialTree, refresh]));

describe('resolveWorkingTree', () => {
  it('une correction de pays survit à un refresh, et le reste du refresh est pris tel quel', () => {
    const correction = setStepField(
      'cor_1',
      'stp_d1',
      'countryCode',
      'ES',
      'PT',
    );

    const tree = resolveWorkingTree(afterRefresh, [correction]);

    expect(getResolvedStep(tree, 'stp_d1').countryCode).toEqual({
      provenance: 'CORRECTED',
      value: 'ES',
      correctionId: 'cor_1',
      status: 'APPLIED',
      declaredValue: 'PT',
    });
    expect(tree.product.weightGrams).toBe(225);
    expect(getResolvedStep(tree, 'stp_b3').supplierId).toEqual({
      provenance: 'DECLARED',
      value: 'sup_1f3a',
    });
    expect(findResolvedItem(tree, 'itm_ts0142_c5')).toBeDefined();
  });

  it('une correction survit à plusieurs refresh successifs', () => {
    const correction = setStepField(
      'cor_1',
      'stp_d1',
      'countryCode',
      'ES',
      'PT',
    );
    const secondRefresh = structuredClone(refresh);
    secondRefresh.product.weightGrams = 230;

    const history = receiveAll([initialTree, refresh, secondRefresh]);
    const tree = resolveWorkingTree(currentDeclaredTree(history), [correction]);

    expect(history).toHaveLength(3);
    expect(tree.product.weightGrams).toBe(230);
    expect(statusOf(tree, 'cor_1')).toBe('APPLIED');
  });

  it('appliquer deux fois le même refresh ne change rien', () => {
    const once = receiveAll([initialTree, refresh]);

    const twice = receiveDeclaredTree(once, refresh, refresh.refreshedAt);

    expect(twice).toBe(once);
  });

  it('un refresh qui contredit une correction → CONFLICT, la correction gagne', () => {
    const correction = setStepField(
      'cor_1',
      'stp_b2',
      'supplierId',
      'sup_8b23',
      'sup_3e91',
    );

    const tree = resolveWorkingTree(afterRefresh, [correction]);

    expect(getResolvedStep(tree, 'stp_b2').supplierId).toEqual({
      provenance: 'CORRECTED',
      value: 'sup_8b23',
      correctionId: 'cor_1',
      status: 'CONFLICT',
      declaredValue: 'sup_2b7c',
    });
  });

  it('abandonner la correction → la valeur déclarée revient', () => {
    const tree = resolveWorkingTree(afterRefresh, []);

    expect(getResolvedStep(tree, 'stp_b2').supplierId).toEqual({
      provenance: 'DECLARED',
      value: 'sup_2b7c',
    });
  });

  it("un refresh qui supprime l'étape corrigée → ORPHANED, étape non ressuscitée", () => {
    const correction = setStepField(
      'cor_1',
      'stp_a3',
      'supplierId',
      'sup_7f60',
      null,
    );

    const tree = resolveWorkingTree(afterRefresh, [correction]);

    expect(findResolvedStep(tree, 'stp_a3')).toBeUndefined();
    expect(statusOf(tree, 'cor_1')).toBe('ORPHANED');
  });

  it('si le fournisseur déclare maintenant la valeur corrigée → APPLIED, pas CONFLICT', () => {
    const correction = setStepField(
      'cor_1',
      'stp_b3',
      'supplierId',
      'sup_1f3a',
      null,
    );

    expect(
      statusOf(resolveWorkingTree(afterRefresh, [correction]), 'cor_1'),
    ).toBe('APPLIED');
  });

  it("ADD_STEP ajoute l'étape à la fin de l'item, marquée CORRECTED", () => {
    const correction: AddStepCorrection = {
      id: 'cor_1',
      createdAt: '2026-09-10T10:00:00.000Z',
      type: 'ADD_STEP',
      target: { itemId: 'itm_ts0142_c2' },
      value: {
        id: 'stp_app_1',
        process: 'DYEING',
        supplierId: null,
        countryCode: 'PT',
      },
    };

    const tree = resolveWorkingTree(afterRefresh, [correction]);

    expect(
      findResolvedItem(tree, 'itm_ts0142_c2')?.steps.map((s) => s.id),
    ).toEqual(['stp_d1', 'stp_app_1']);
    expect(getResolvedStep(tree, 'stp_app_1').provenance).toBe('CORRECTED');
  });
});
