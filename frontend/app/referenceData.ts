import { ref } from "vue"
import { getReferenceData } from "./api"
import type { ReferenceData } from "./types"

export const referenceData = ref<ReferenceData | null>(null)

export async function loadReferenceData(): Promise<void> {
	referenceData.value = await getReferenceData()
}

export function supplierName(supplierId: string): string {
	const supplier = referenceData.value?.suppliers.find((s) => s.id === supplierId)
	return supplier?.name ?? supplierId
}
