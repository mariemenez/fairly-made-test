import {
  mariniereRefresh,
  mariniereTree,
  receiveAll,
  setStepField,
} from '../../test/fixtures';
import { addCorrection, keepCorrection } from './corrections';
import { currentDeclaredTree, resolveWorkingTree } from './resolve';

describe('corrections', () => {
  it('mémorise la valeur déclarée au moment de la correction', () => {
    const [correction] = addCorrection(mariniereTree, [], {
      type: 'SET_STEP_FIELD',
      stepId: 'stp_b2',
      field: 'supplierId',
      value: 'sup_8b23',
    });

    expect(correction).toMatchObject({
      type: 'SET_STEP_FIELD',
      value: 'sup_8b23',
      declaredValueAtCorrection: 'sup_3e91',
    });
  });

  it('une nouvelle correction sur la même cible remplace l’ancienne', () => {
    const existing = [
      setStepField('cor_old', 'stp_b2', 'supplierId', 'sup_8b23', 'sup_3e91'),
    ];

    const corrections = addCorrection(mariniereTree, existing, {
      type: 'SET_STEP_FIELD',
      stepId: 'stp_b2',
      field: 'supplierId',
      value: 'sup_7f60',
    });

    expect(corrections).toHaveLength(1);
    expect(corrections[0].value).toBe('sup_7f60');
  });

  it('garder un conflit : la correction repasse en APPLIED', () => {
    const declared = currentDeclaredTree(
      receiveAll([mariniereTree, mariniereRefresh]),
    );
    const conflict = setStepField(
      'cor_1',
      'stp_b2',
      'supplierId',
      'sup_8b23',
      'sup_3e91',
    );

    const corrections = keepCorrection(declared, [conflict], 'cor_1');

    expect(
      resolveWorkingTree(declared, corrections).corrections[0].status,
    ).toBe('APPLIED');
  });
});
