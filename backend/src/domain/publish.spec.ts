import {
  denimTree,
  getResolvedStep,
  mariniereRefresh,
  mariniereTree,
  receiveAll,
  setStepField,
} from '../../test/fixtures';
import { publishVersion } from './publish';
import { currentDeclaredTree, resolveWorkingTree } from './resolve';

const DATE = '2026-09-15T10:00:00.000Z';

describe('publishVersion', () => {
  it('une version publiée ne change pas après un refresh, et ne peut pas être modifiée', () => {
    const correction = setStepField(
      'cor_1',
      'stp_a3',
      'supplierId',
      'sup_7f60',
      null,
    );
    const version = publishVersion(
      [],
      resolveWorkingTree(mariniereTree, [correction]),
      DATE,
    );

    const history = receiveAll([mariniereTree, mariniereRefresh]);
    const workingTree = resolveWorkingTree(currentDeclaredTree(history), [
      correction,
    ]);

    expect(workingTree.product.weightGrams).toBe(225);
    expect(version.tree.product.weightGrams).toBe(220);
    expect(getResolvedStep(version.tree, 'stp_a3').supplierId.value).toBe(
      'sup_7f60',
    );
    expect(() => {
      version.tree.product.weightGrams = 999;
    }).toThrow();
  });

  it('refuse de publier tant qu’une composition est invalide (denim à 98 %)', () => {
    expect(() =>
      publishVersion([], resolveWorkingTree(denimTree, []), DATE),
    ).toThrow(
      'Publication impossible — Denim 12 oz : La composition fait 98 % au lieu de 100 %.',
    );
  });

  it('refuse de publier si rien n’a changé depuis la dernière version', () => {
    const tree = resolveWorkingTree(mariniereTree, []);
    const first = publishVersion([], tree, DATE);

    expect(first.versionNumber).toBe(1);
    expect(() => publishVersion([first], tree, DATE)).toThrow(
      'Rien n’a changé',
    );
  });
});
