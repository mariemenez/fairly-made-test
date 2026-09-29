import { supplierName } from "./referenceData"
import type { CompositionEntry, CorrectableStepField, Correction, ItemKind } from "./types"

const PROCESS_LABELS: Record<string, string> = {
	FIBER_PRODUCTION: "Production de la fibre",
	SPINNING: "Filature",
	WEAVING: "Tissage",
	KNITTING: "Tricotage",
	DYEING: "Teinture",
	PRINTING: "Impression",
	WASHING: "Lavage",
	FINISHING: "Finition",
	CUTTING: "Coupe",
	MAKING: "Confection / assemblage",
	PACKAGING: "Emballage",
}

const MATERIAL_LABELS: Record<string, string> = {
	COTTON: "Coton",
	COTTON_ORGANIC: "Coton biologique",
	COTTON_RECYCLED: "Coton recyclé",
	POLYESTER: "Polyester",
	POLYESTER_RECYCLED: "Polyester recyclé",
	ELASTANE: "Élasthanne",
	VISCOSE: "Viscose",
	LINEN: "Lin",
	WOOL_MERINO: "Laine mérinos",
	WOOL_RECYCLED: "Laine recyclée",
	POLYAMIDE: "Polyamide",
	SILK: "Soie",
	BRASS: "Laiton",
}

const USAGE_CATEGORY_LABELS: Record<string, string> = {
	MAIN_FABRIC: "Tissu principal",
	SECONDARY_FABRIC: "Tissu secondaire",
	LINING: "Doublure",
	TRIM: "Garniture",
	LABEL: "Étiquette",
	THREAD: "Fil",
	HARDWARE: "Accessoire métallique",
	PACKAGING: "Emballage",
}

const KIND_LABELS: Record<ItemKind, string> = {
	PRODUCT: "Produit",
	COMPONENT: "Composant",
	MATERIAL: "Matière",
}

const CORRECTION_LABELS: Record<Correction["type"], string> = {
	SET_STEP_FIELD: "Correction d’une étape",
	ADD_STEP: "Étape ajoutée par la marque",
	SET_COMPOSITION: "Correction de composition",
}

const NOT_SET = "non renseigné"

export const COUNTRY_CODES = [
	"AU",
	"BD",
	"BE",
	"BG",
	"CN",
	"DE",
	"EG",
	"ES",
	"FR",
	"GB",
	"ID",
	"IN",
	"IT",
	"KH",
	"LK",
	"MA",
	"NL",
	"PE",
	"PK",
	"PT",
	"RO",
	"TN",
	"TR",
	"US",
	"VN",
]

const countryNames = new Intl.DisplayNames(["fr"], { type: "region" })

export function processLabel(code: string): string {
	return PROCESS_LABELS[code] ?? code
}

export function materialLabel(code: string): string {
	return MATERIAL_LABELS[code] ?? code
}

export function usageCategoryLabel(code: string): string {
	return USAGE_CATEGORY_LABELS[code] ?? code
}

export function kindLabel(kind: ItemKind): string {
	return KIND_LABELS[kind]
}

export function countryName(code: string): string {
	return countryNames.of(code) ?? code
}

export function formatDate(isoDate: string): string {
	return new Date(isoDate).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
}

export function stepFieldText(field: CorrectableStepField, value: string | null): string {
	if (value === null) return NOT_SET
	return field === "supplierId" ? supplierName(value) : countryName(value)
}

export function compositionText(entries: CompositionEntry[]): string {
	return entries.map((entry) => `${materialLabel(entry.rawMaterial)} ${entry.percentage} %`).join(", ")
}

export function orphanedCorrectionText(correction: Correction): string {
	return `${CORRECTION_LABELS[correction.type]} : l’élément concerné a été retiré par le fournisseur.`
}
