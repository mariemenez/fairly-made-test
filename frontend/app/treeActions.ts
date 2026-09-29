import { inject, type InjectionKey } from "vue"
import type { CorrectionInput } from "./types"

export interface TreeActions {
	addCorrection: (input: CorrectionInput) => Promise<boolean>
	removeCorrection: (correctionId: string) => Promise<boolean>
	keepCorrection: (correctionId: string) => Promise<boolean>
}

export const TREE_ACTIONS: InjectionKey<TreeActions> = Symbol("tree-actions")

export function useTreeActions(): TreeActions | null {
	return inject(TREE_ACTIONS, null)
}
