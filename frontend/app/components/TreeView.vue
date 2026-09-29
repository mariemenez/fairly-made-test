<script setup lang="ts">
import { Card } from "ant-design-vue"
import ItemCard from "~/components/ItemCard.vue"
import StepsTable from "~/components/StepsTable.vue"
import type { CompositionProblem, ResolvedProductItem } from "~/types"

withDefaults(
	defineProps<{
		product: ResolvedProductItem
		compositionProblems?: CompositionProblem[]
	}>(),
	{ compositionProblems: () => [] },
)
</script>

<template>
	<h2 class="section-title">Assemblage du produit</h2>
	<Card size="small">
		<StepsTable :steps="product.steps" :item-id="product.id" item-kind="PRODUCT" />
	</Card>

	<h2 class="section-title">Composants</h2>
	<div class="stack">
		<ItemCard
			v-for="child in product.children"
			:key="child.id"
			:item="child"
			:composition-problems="compositionProblems"
		/>
	</div>
</template>
