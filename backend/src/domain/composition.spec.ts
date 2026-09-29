import { denimTree } from '../../test/fixtures';
import { compositionError, findCompositionProblems } from './composition';
import { resolveWorkingTree } from './resolve';
import type { CompositionEntry } from './types';

function entry(rawMaterial: string, percentage: number): CompositionEntry {
  return { id: rawMaterial, rawMaterial, percentage, originCountryCode: null };
}

describe('composition', () => {
  it('accepte une composition qui somme à 100, décimales comprises', () => {
    expect(
      compositionError([entry('COTTON', 95), entry('ELASTANE', 5)]),
    ).toBeNull();
    expect(
      compositionError([
        entry('COTTON', 33.3),
        entry('LINEN', 33.3),
        entry('VISCOSE', 33.4),
      ]),
    ).toBeNull();
  });

  it('refuse une composition qui ne somme pas à 100, avec un message clair', () => {
    expect(compositionError([entry('COTTON', 96), entry('ELASTANE', 2)])).toBe(
      'La composition fait 98 % au lieu de 100 %.',
    );
  });

  it('signale la composition déclarée du denim (98 %)', () => {
    expect(findCompositionProblems(resolveWorkingTree(denimTree, []))).toEqual([
      {
        itemId: 'itm_jk0207_c1',
        itemLabel: 'Denim 12 oz',
        message: 'La composition fait 98 % au lieu de 100 %.',
      },
    ]);
  });
});
