<script setup lang="ts">
import { computed } from "vue"
import { Card, Divider, Space, Tag } from "ant-design-vue"
import CompositionBlock from "~/components/CompositionBlock.vue"
import StepsTable from "~/components/StepsTable.vue"
import type { CompositionProblem, ResolvedTreeItem } from "~/types"
import { countryName, usageCategoryLabel } from "~/labels"

const props = withDefaults(
	defineProps<{
		item: ResolvedTreeItem
		compositionProblems?: CompositionProblem[]
	}>(),
	{ compositionProblems: () => [] },
)

const compositionProblem = computed(
	() => props.compositionProblems.find((problem) => problem.itemId === props.item.id)?.message,
)
</script>

<template>
	<Card size="small" :title="item.label">
		<template #extra>
			<Space v-if="item.kind === 'COMPONENT'">
				<Tag>{{ usageCategoryLabel(item.usageCategory) }}</Tag>
				<span class="muted">{{ item.usagePercentage }} % du produit</span>
			</Space>
			<template v-else-if="item.kind === 'MATERIAL'">
				<span v-if="item.originCountryCode" class="muted">origine : {{ countryName(item.originCountryCode) }}</span>
				<Tag v-else color="red">Origine à renseigner</Tag>
			</template>
		</template>

		<template v-if="item.kind === 'COMPONENT'">
			<Divider orientation="left" plain>Composition</Divider>
			<CompositionBlock :item="item" :problem="compositionProblem" />
		</template>

		<Divider orientation="left" plain>Étapes de production</Divider>
		<StepsTable :steps="item.steps" :item-id="item.id" :item-kind="item.kind" />

		<template v-if="item.children.length > 0">
			<Divider orientation="left" plain>Matières</Divider>
			<div class="material-cards">
				<ItemCard
					v-for="child in item.children"
					:key="child.id"
					:item="child"
					:composition-problems="compositionProblems"
				/>
			</div>
		</template>
	</Card>
</template>
