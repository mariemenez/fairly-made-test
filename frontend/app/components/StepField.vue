<script setup lang="ts">
import { computed, ref } from "vue"
import { EditOutlined } from "@ant-design/icons-vue"
import { Button, Select, Space, Tag, Tooltip } from "ant-design-vue"
import CorrectionNotice from "~/components/CorrectionNotice.vue"
import { referenceData } from "~/referenceData"
import { useTreeActions } from "~/treeActions"
import type { CorrectableStepField, ResolvedStep } from "~/types"
import { COUNTRY_CODES, countryName, stepFieldText } from "~/labels"

const props = defineProps<{
	step: ResolvedStep
	field: CorrectableStepField
}>()

const actions = useTreeActions()

const tracked = computed(() => props.step[props.field])
const canEdit = computed(() => actions !== null && props.step.provenance === "DECLARED")

const options = computed(() =>
	props.field === "supplierId"
		? (referenceData.value?.suppliers ?? []).map((s) => ({
				value: s.id,
				label: `${s.name} — ${s.city}`,
			}))
		: COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) })),
)

const editLabel = computed(() => (tracked.value.value === null ? "Renseigner" : "Corriger"))

const editing = ref(false)
const draft = ref<string | undefined>()

function startEditing() {
	draft.value = tracked.value.value ?? undefined
	editing.value = true
}

async function save() {
	if (!actions) return
	const saved = await actions.addCorrection({
		type: "SET_STEP_FIELD",
		stepId: props.step.id,
		field: props.field,
		value: draft.value ?? null,
	})
	if (saved) editing.value = false
}
</script>

<template>
	<div class="cell-block">
		<Space v-if="editing" wrap>
			<Select
				v-model:value="draft"
				:options="options"
				show-search
				option-filter-prop="label"
				allow-clear
				placeholder="Inconnu"
				:aria-label="field === 'supplierId' ? 'Fournisseur' : 'Pays'"
				style="width: 240px"
			/>
			<Button type="primary" size="small" @click="save">Enregistrer</Button>
			<Button size="small" @click="editing = false">Annuler</Button>
		</Space>

		<Space v-else size="small">
			<Tag v-if="tracked.value === null" color="red">À renseigner</Tag>
			<span v-else :class="{ 'value-corrected': tracked.provenance === 'CORRECTED' }">
				{{ stepFieldText(field, tracked.value) }}
			</span>
			<Tooltip v-if="canEdit" :title="editLabel">
				<Button type="text" size="small" :aria-label="editLabel" @click="startEditing">
					<template #icon><EditOutlined /></template>
				</Button>
			</Tooltip>
		</Space>

		<CorrectionNotice
			v-if="tracked.provenance === 'CORRECTED' && step.provenance === 'DECLARED'"
			:correction-id="tracked.correctionId"
			:status="tracked.status"
			:declared-text="stepFieldText(field, tracked.declaredValue)"
		/>
	</div>
</template>
