export type ItemKind = "PRODUCT" | "COMPONENT" | "MATERIAL"
export type CorrectableStepField = "supplierId" | "countryCode"
export type CorrectionStatus = "APPLIED" | "CONFLICT" | "ORPHANED"

export interface CompositionEntry {
	id: string
	rawMaterial: string
	percentage: number
	originCountryCode: string | null
}

export interface DeclaredValue<T> {
	provenance: "DECLARED"
	value: T
}

export interface CorrectedValue<T> {
	provenance: "CORRECTED"
	value: T
	correctionId: string
	status: "APPLIED" | "CONFLICT"
	declaredValue: T
}

export type TrackedValue<T> = DeclaredValue<T> | CorrectedValue<T>

export interface ResolvedStep {
	id: string
	process: string
	supplierId: TrackedValue<string | null>
	countryCode: TrackedValue<string | null>
	provenance: "DECLARED" | "CORRECTED"
	addedByCorrectionId?: string
}

interface ResolvedItemBase {
	id: string
	label: string
	steps: ResolvedStep[]
	children: ResolvedTreeItem[]
}

export interface ResolvedProductItem extends ResolvedItemBase {
	kind: "PRODUCT"
}

export interface ResolvedComponentItem extends ResolvedItemBase {
	kind: "COMPONENT"
	usageCategory: string
	usagePercentage: number
	composition: TrackedValue<CompositionEntry[]>
}

export interface ResolvedMaterialItem extends ResolvedItemBase {
	kind: "MATERIAL"
	rawMaterial: string
	originCountryCode: string | null
}

export type ResolvedTreeItem = ResolvedProductItem | ResolvedComponentItem | ResolvedMaterialItem

export interface ProductInfo {
	id: string
	name: string
	reference: string
	season: string
	category: string
	weightGrams: number
	lastModifiedAt: string
}

export interface Step {
	id: string
	process: string
	supplierId: string | null
	countryCode: string | null
}

interface CorrectionBase {
	id: string
	createdAt: string
}

export type Correction =
	| (CorrectionBase & {
			type: "SET_STEP_FIELD"
			target: { stepId: string; field: CorrectableStepField }
			value: string | null
			declaredValueAtCorrection: string | null
	  })
	| (CorrectionBase & { type: "ADD_STEP"; target: { itemId: string }; value: Step })
	| (CorrectionBase & {
			type: "SET_COMPOSITION"
			target: { itemId: string }
			value: CompositionEntry[]
			declaredValueAtCorrection: CompositionEntry[]
	  })

export interface CorrectionWithStatus {
	correction: Correction
	status: CorrectionStatus
}

export interface ResolvedTree {
	brand: { id: string; name: string }
	product: ProductInfo
	rootItem: ResolvedProductItem
	corrections: CorrectionWithStatus[]
}

export interface CompositionProblem {
	itemId: string
	itemLabel: string
	message: string
}

export interface VersionReference {
	versionNumber: number
	publishedAt: string
}

export interface WorkingTreeView {
	tree: ResolvedTree
	compositionProblems: CompositionProblem[]
	hasUnpublishedChanges: boolean
	lastVersion: VersionReference | null
}

export interface RefreshOutcome {
	accepted: boolean
	workingTree: WorkingTreeView
}

export interface CompositionEntryInput {
	id?: string
	rawMaterial: string
	percentage: number
	originCountryCode: string | null
}

export type CorrectionInput =
	| { type: "SET_STEP_FIELD"; stepId: string; field: CorrectableStepField; value: string | null }
	| { type: "ADD_STEP"; itemId: string; process: string; supplierId: string | null; countryCode: string | null }
	| { type: "SET_COMPOSITION"; itemId: string; composition: CompositionEntryInput[] }

export interface ProductSummary {
	productId: string
	name: string
	reference: string
	season: string
	lastVersion: VersionReference | null
	hasUnpublishedChanges: boolean
	lastModifiedAt: string
}

export interface PublishedVersion extends VersionReference {
	tree: ResolvedTree
}

export interface Supplier {
	id: string
	name: string
	city: string
	countryCode: string
}

export interface ProcessDefinition {
	code: string
	label: string
	appliesTo: ItemKind[]
}

export interface ReferenceData {
	suppliers: Supplier[]
	processes: ProcessDefinition[]
	rawMaterials: string[]
}
