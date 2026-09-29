export type ProcessCode = string;
export type CountryCode = string;
export type SupplierId = string;

export type ItemKind = 'PRODUCT' | 'COMPONENT' | 'MATERIAL';

export interface Step {
  id: string;
  process: ProcessCode;
  supplierId: SupplierId | null;
  countryCode: CountryCode | null;
}

export interface CompositionEntry {
  id: string;
  rawMaterial: string;
  percentage: number;
  originCountryCode: CountryCode | null;
}

export interface ProductItem {
  kind: 'PRODUCT';
  id: string;
  label: string;
  steps: Step[];
  children: TreeItem[];
}

export interface ComponentItem {
  kind: 'COMPONENT';
  id: string;
  label: string;
  usageCategory: string;
  usagePercentage: number;
  composition: CompositionEntry[];
  steps: Step[];
  children: TreeItem[];
}

export interface MaterialItem {
  kind: 'MATERIAL';
  id: string;
  label: string;
  rawMaterial: string;
  originCountryCode: CountryCode | null;
  steps: Step[];
  children: TreeItem[];
}

export type TreeItem = ProductItem | ComponentItem | MaterialItem;

export interface Brand {
  id: string;
  name: string;
}

export interface ProductInfo {
  id: string;
  name: string;
  reference: string;
  season: string;
  category: string;
  weightGrams: number;
  lastModifiedAt: string;
}

export interface DeclaredTree {
  brand: Brand;
  product: ProductInfo;
  rootItem: ProductItem;
}

export type RefreshFile = DeclaredTree & {
  comment?: string;
  refreshedAt: string;
};

export interface DeclaredTreeRecord {
  receivedAt: string;
  tree: DeclaredTree;
}

export type CorrectableStepField = 'supplierId' | 'countryCode';

interface CorrectionBase {
  id: string;
  createdAt: string;
}

export interface SetStepFieldCorrection extends CorrectionBase {
  type: 'SET_STEP_FIELD';
  target: { stepId: string; field: CorrectableStepField };
  value: string | null;
  declaredValueAtCorrection: string | null;
}

export interface AddStepCorrection extends CorrectionBase {
  type: 'ADD_STEP';
  target: { itemId: string };
  value: Step;
}

export interface SetCompositionCorrection extends CorrectionBase {
  type: 'SET_COMPOSITION';
  target: { itemId: string };
  value: CompositionEntry[];
  declaredValueAtCorrection: CompositionEntry[];
}

export type Correction =
  SetStepFieldCorrection | AddStepCorrection | SetCompositionCorrection;

export type CorrectionType = Correction['type'];

export type CorrectionInput =
  | {
      type: 'SET_STEP_FIELD';
      stepId: string;
      field: CorrectableStepField;
      value: string | null;
    }
  | {
      type: 'ADD_STEP';
      itemId: string;
      process: ProcessCode;
      supplierId: SupplierId | null;
      countryCode: CountryCode | null;
    }
  | {
      type: 'SET_COMPOSITION';
      itemId: string;
      composition: CompositionEntryInput[];
    };

export interface CompositionEntryInput {
  id?: string;
  rawMaterial: string;
  percentage: number;
  originCountryCode: CountryCode | null;
}

export type CorrectionStatus = 'APPLIED' | 'CONFLICT' | 'ORPHANED';

export interface CorrectionWithStatus {
  correction: Correction;
  status: CorrectionStatus;
}

export type Provenance = 'DECLARED' | 'CORRECTED';

export interface DeclaredValue<T> {
  provenance: 'DECLARED';
  value: T;
}

export interface CorrectedValue<T> {
  provenance: 'CORRECTED';
  value: T;
  correctionId: string;
  status: 'APPLIED' | 'CONFLICT';
  declaredValue: T;
}

export type TrackedValue<T> = DeclaredValue<T> | CorrectedValue<T>;

export interface ResolvedStep {
  id: string;
  process: ProcessCode;
  supplierId: TrackedValue<SupplierId | null>;
  countryCode: TrackedValue<CountryCode | null>;
  provenance: Provenance;
  addedByCorrectionId?: string;
}

export interface ResolvedProductItem {
  kind: 'PRODUCT';
  id: string;
  label: string;
  steps: ResolvedStep[];
  children: ResolvedTreeItem[];
}

export interface ResolvedComponentItem {
  kind: 'COMPONENT';
  id: string;
  label: string;
  usageCategory: string;
  usagePercentage: number;
  composition: TrackedValue<CompositionEntry[]>;
  steps: ResolvedStep[];
  children: ResolvedTreeItem[];
}

export interface ResolvedMaterialItem {
  kind: 'MATERIAL';
  id: string;
  label: string;
  rawMaterial: string;
  originCountryCode: CountryCode | null;
  steps: ResolvedStep[];
  children: ResolvedTreeItem[];
}

export type ResolvedTreeItem =
  ResolvedProductItem | ResolvedComponentItem | ResolvedMaterialItem;

export interface ResolvedTree {
  brand: Brand;
  product: ProductInfo;
  rootItem: ResolvedProductItem;
  // Toutes les corrections avec leur statut ; les ORPHANED sont listées mais pas appliquées.
  corrections: CorrectionWithStatus[];
}

export interface PublishedVersion {
  readonly versionNumber: number;
  readonly publishedAt: string;
  readonly tree: ResolvedTree;
}

export interface CompositionProblem {
  itemId: string;
  itemLabel: string;
  message: string;
}

export interface Supplier {
  id: SupplierId;
  name: string;
  city: string;
  countryCode: CountryCode;
}

export interface ProcessDefinition {
  code: ProcessCode;
  label: string;
  appliesTo: ItemKind[];
}
