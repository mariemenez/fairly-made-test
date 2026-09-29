<script setup lang="ts">
import { computed, ref } from "vue"
import { Button, Select, Space } from "ant-design-vue"
import { referenceData } from "~/referenceData"
import { useTreeActions } from "~/treeActions"
import type { ItemKind } from "~/types"
import { COUNTRY_CODES, countryName, processLabel } from "~/labels"

const props = defineProps<{ itemId: string; itemKind: ItemKind }>()

const actions = useTreeActions()

const processOptions = computed(() =>
	(referenceData.value?.processes ?? [])
		.filter((process) => process.appliesTo.includes(props.itemKind))
		.map((process) => ({ value: process.code, label: processLabel(process.code) })),
)
const supplierOptions = computed(() =>
	(referenceData.value?.suppliers ?? []).map((s) => ({ value: s.id, label: s.name })),
)
const countryOptions = COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) }))

const open = ref(false)
const process = ref<string | undefined>()
const supplierId = ref<string | undefined>()
const countryCode = ref<string | undefined>()

function close() {
	process.value = undefined
	supplierId.value = undefined
	countryCode.value = undefined
	open.value = false
}

async function submit() {
	if (!actions || !process.value) return
	const saved = await actions.addCorrection({
		type: "ADD_STEP",
		itemId: props.itemId,
		process: process.value,
		supplierId: supplierId.value ?? null,
		countryCode: countryCode.value ?? null,
	})
	if (saved) close()
}
</script>

<template>
	<div class="add-step">
		<Button v-if="!open" type="dashed" size="small" @click="open = true">+ Ajouter une étape</Button>

		<Space v-else wrap>
			<Select
				v-model:value="process"
				:options="processOptions"
				placeholder="Étape"
				aria-label="Étape"
				style="width: 200px"
			/>
			<Select
				v-model:value="supplierId"
				:options="supplierOptions"
				show-search
				option-filter-prop="label"
				allow-clear
				placeholder="Fournisseur inconnu"
				aria-label="Fournisseur"
				style="width: 220px"
			/>
			<Select
				v-model:value="countryCode"
				:options="countryOptions"
				show-search
				option-filter-prop="label"
				allow-clear
				placeholder="Pays inconnu"
				aria-label="Pays"
				style="width: 160px"
			/>
			<Button type="primary" size="small" :disabled="!process" @click="submit">Ajouter</Button>
			<Button size="small" @click="close">Annuler</Button>
		</Space>
	</div>
</template>

<style scoped>
.add-step {
	margin-top: 8px;
}
</style>
