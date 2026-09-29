import type {
	CorrectionInput,
	ProductSummary,
	PublishedVersion,
	ReferenceData,
	RefreshOutcome,
	VersionReference,
	WorkingTreeView,
} from "./types"

const API_BASE = "http://localhost:3001"

async function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
	let response: Response
	try {
		response = await fetch(API_BASE + path, {
			method,
			headers: body === undefined ? undefined : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		})
	} catch {
		throw new Error("Le serveur ne répond pas. Le backend est-il lancé (port 3001) ?")
	}

	const data = await response.json()
	if (!response.ok) {
		throw new Error(typeof data.message === "string" ? data.message : "Erreur inconnue.")
	}
	return data as T
}

export function getReferenceData() {
	return request<ReferenceData>("GET", "/reference-data")
}

export function getProducts() {
	return request<ProductSummary[]>("GET", "/products")
}

export function getWorkingTree(productId: string) {
	return request<WorkingTreeView>("GET", `/products/${productId}/working-tree`)
}

export function getVersions(productId: string) {
	return request<VersionReference[]>("GET", `/products/${productId}/versions`)
}

export function getVersion(productId: string, versionNumber: number) {
	return request<PublishedVersion>("GET", `/products/${productId}/versions/${versionNumber}`)
}

// Sert aux trois types de correction : SET_STEP_FIELD, ADD_STEP, SET_COMPOSITION.
export function addCorrection(productId: string, input: CorrectionInput) {
	return request<WorkingTreeView>("POST", `/products/${productId}/corrections`, input)
}

// « Annuler », « Revenir », « Supprimer » : supprimer la correction.
export function removeCorrection(productId: string, correctionId: string) {
	return request<WorkingTreeView>("DELETE", `/products/${productId}/corrections/${correctionId}`)
}

// « Garder » une correction en conflit.
export function keepCorrection(productId: string, correctionId: string) {
	return request<WorkingTreeView>("POST", `/products/${productId}/corrections/${correctionId}/keep`)
}

export function simulateRefresh(productId: string) {
	return request<RefreshOutcome>("POST", `/products/${productId}/refreshes/simulate`)
}

export function publishVersion(productId: string) {
	return request<PublishedVersion>("POST", `/products/${productId}/versions`)
}
