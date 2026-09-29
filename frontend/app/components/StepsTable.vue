<script setup lang="ts">
import { Button, Table as ATable, Tag, type TableColumnsType } from "ant-design-vue"
import AddStepForm from "~/components/AddStepForm.vue"
import StepField from "~/components/StepField.vue"
import { useTreeActions } from "~/treeActions"
import type { ItemKind, ResolvedStep } from "~/types"
import { processLabel } from "~/labels"

defineProps<{
	steps: ResolvedStep[]
	itemId: string
	itemKind: ItemKind
}>()

const actions = useTreeActions()

const columns: TableColumnsType = [
	{ title: "Étape", key: "process", width: "25%" },
	{ title: "Fournisseur", key: "supplierId" },
	{ title: "Pays", key: "countryCode", width: "30%" },
]

function asStep(record: unknown): ResolvedStep {
	return record as ResolvedStep
}
</script>

<template>
	<ATable
		:columns="columns"
		:data-source="steps"
		:pagination="false"
		row-key="id"
		size="small"
		:locale="{ emptyText: 'Aucune étape renseignée' }"
	>
		<template #bodyCell="{ column, record }">
			<div v-if="column.key === 'process'" class="step-process">
				<strong>{{ processLabel(asStep(record).process) }}</strong>
				<template v-if="asStep(record).addedByCorrectionId">
					<Tag color="blue">Ajoutée par la marque</Tag>
					<Button
						v-if="actions"
						type="link"
						size="small"
						danger
						@click="actions.removeCorrection(asStep(record).addedByCorrectionId ?? '')"
					>
						Supprimer
					</Button>
				</template>
			</div>
			<StepField v-else-if="column.key === 'supplierId'" :step="asStep(record)" field="supplierId" />
			<StepField v-else-if="column.key === 'countryCode'" :step="asStep(record)" field="countryCode" />
		</template>
	</ATable>

	<AddStepForm v-if="actions" :item-id="itemId" :item-kind="itemKind" />
</template>
