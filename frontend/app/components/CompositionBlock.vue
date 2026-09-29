<script setup lang="ts">
import { computed, ref } from "vue"
import { Alert, Button, InputNumber, Select, Space, Table, Tag, type TableColumnsType } from "ant-design-vue"
import CorrectionNotice from "~/components/CorrectionNotice.vue"
import { referenceData } from "~/referenceData"
import { useTreeActions } from "~/treeActions"
import type { CompositionEntry, ResolvedComponentItem } from "~/types"
import { COUNTRY_CODES, compositionText, countryName, materialLabel } from "~/labels"

const props = defineProps<{
	item: ResolvedComponentItem
	problem?: string
}>()

const actions = useTreeActions()

const tracked = computed(() => props.item.composition)

const columns: TableColumnsType = [
	{ title: "Matière", key: "rawMaterial", dataIndex: "rawMaterial" },
	{ title: "Part", key: "percentage", dataIndex: "percentage", width: "20%" },
	{ title: "Origine", key: "originCountryCode", dataIndex: "originCountryCode", width: "30%" },
]

function asEntry(record: unknown): CompositionEntry {
	return record as CompositionEntry
}

const materialOptions = computed(() =>
	(referenceData.value?.rawMaterials ?? []).map((code) => ({ value: code, label: materialLabel(code) })),
)
const countryOptions = COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) }))

interface DraftRow {
	id?: string
	rawMaterial: string
	percentage: number
	origin?: string
}

const editing = ref(false)
const rows = ref<DraftRow[]>([])

const draftTotal = computed(
	() => Math.round(rows.value.reduce((sum, row) => sum + (row.percentage || 0), 0) * 100) / 100,
)

function startEditing() {
	rows.value = tracked.value.value.map((entry) => ({
		id: entry.id,
		rawMaterial: entry.rawMaterial,
		percentage: entry.percentage,
		origin: entry.originCountryCode ?? undefined,
	}))
	editing.value = true
}

async function save() {
	if (!actions) return
	const saved = await actions.addCorrection({
		type: "SET_COMPOSITION",
		itemId: props.item.id,
		composition: rows.value.map((row) => ({
			id: row.id,
			rawMaterial: row.rawMaterial,
			percentage: row.percentage,
			originCountryCode: row.origin ?? null,
		})),
	})
	if (saved) editing.value = false
}
</script>

<template>
	<div class="stack">
		<Alert
			v-if="problem"
			type="error"
			show-icon
			:message="`${problem} La publication est bloquée tant qu’elle n’est pas corrigée.`"
		/>

		<template v-if="!editing">
			<Table :columns="columns" :data-source="tracked.value" :pagination="false" row-key="id" size="small">
				<template #bodyCell="{ column, record }">
					<template v-if="column.key === 'rawMaterial'">{{ materialLabel(asEntry(record).rawMaterial) }}</template>
					<template v-else-if="column.key === 'percentage'">{{ asEntry(record).percentage }} %</template>
					<template v-else-if="column.key === 'originCountryCode'">
						<Tag v-if="asEntry(record).originCountryCode === null" color="red">À renseigner</Tag>
						<template v-else>{{ countryName(asEntry(record).originCountryCode ?? "") }}</template>
					</template>
				</template>
			</Table>

			<CorrectionNotice
				v-if="tracked.provenance === 'CORRECTED'"
				:correction-id="tracked.correctionId"
				:status="tracked.status"
				:declared-text="compositionText(tracked.declaredValue)"
			/>
			<div v-if="actions">
				<Button size="small" @click="startEditing">Corriger la composition</Button>
			</div>
		</template>

		<div v-else class="stack">
			<Space v-for="(row, index) in rows" :key="index" wrap>
				<Select
					v-model:value="row.rawMaterial"
					:options="materialOptions"
					placeholder="Matière"
					aria-label="Matière"
					style="width: 200px"
				/>
				<InputNumber
					v-model:value="row.percentage"
					:min="0"
					:max="100"
					addon-after="%"
					aria-label="Part"
					style="width: 130px"
				/>
				<Select
					v-model:value="row.origin"
					:options="countryOptions"
					show-search
					option-filter-prop="label"
					allow-clear
					placeholder="Origine inconnue"
					aria-label="Origine"
					style="width: 180px"
				/>
				<Button type="link" danger size="small" @click="rows.splice(index, 1)">Retirer</Button>
			</Space>

			<div>
				<Button type="dashed" size="small" @click="rows.push({ rawMaterial: '', percentage: 0 })">
					+ Ajouter une matière
				</Button>
			</div>

			<Space>
				<Tag :color="draftTotal === 100 ? 'green' : 'red'">Total : {{ draftTotal }} %</Tag>
				<Button type="primary" size="small" :disabled="draftTotal !== 100" @click="save">Enregistrer</Button>
				<Button size="small" @click="editing = false">Annuler</Button>
			</Space>
		</div>
	</div>
</template>
