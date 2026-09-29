<script setup lang="ts">
import { onMounted, ref } from "vue"
import { Alert, Table as ATable, Tag, type TableColumnsType } from "ant-design-vue"
import { getProducts } from "~/api"
import { formatDate } from "~/labels"
import type { ProductSummary } from "~/types"

const products = ref<ProductSummary[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
	try {
		products.value = await getProducts()
	} catch (e) {
		error.value = (e as Error).message
	}
})

const columns: TableColumnsType = [
	{ title: "Produit", key: "name" },
	{ title: "Saison", key: "season", width: 90 },
	{ title: "Dernière version publiée", key: "lastVersion" },
	{ title: "État", key: "status" },
	{ title: "Dernière modification", key: "lastModifiedAt" },
	{ title: "", key: "links", width: 100 },
]

function asProduct(record: unknown): ProductSummary {
	return record as ProductSummary
}
</script>

<template>
	<div class="page-header"><h1>Produits</h1></div>

	<Alert v-if="error" type="error" show-icon :message="error" />

	<ATable v-else :columns="columns" :data-source="products" :pagination="false" row-key="productId">
		<template #bodyCell="{ column, record }">
			<template v-if="column.key === 'name'">
				<NuxtLink :to="`/products/${asProduct(record).productId}`">
					<strong>{{ asProduct(record).name }}</strong>
				</NuxtLink>
				<div class="muted">{{ asProduct(record).reference }}</div>
			</template>
			<template v-else-if="column.key === 'season'">{{ asProduct(record).season }}</template>
			<template v-else-if="column.key === 'lastVersion'">
				<template v-if="asProduct(record).lastVersion">
					Version {{ asProduct(record).lastVersion?.versionNumber }}
					<div class="muted">{{ formatDate(asProduct(record).lastVersion?.publishedAt ?? "") }}</div>
				</template>
				<span v-else class="muted">Jamais publié</span>
			</template>
			<template v-else-if="column.key === 'status'">
				<Tag v-if="asProduct(record).hasUnpublishedChanges" color="gold">Modifications à publier</Tag>
				<Tag v-else color="green">À jour</Tag>
			</template>
			<template v-else-if="column.key === 'lastModifiedAt'">
				{{ formatDate(asProduct(record).lastModifiedAt) }}
			</template>
			<NuxtLink v-else-if="column.key === 'links'" :to="`/products/${asProduct(record).productId}/versions`">
				Versions
			</NuxtLink>
		</template>
	</ATable>
</template>
