<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { Alert, Col, Empty, Menu, Row, Space } from "ant-design-vue"
import * as api from "~/api"
import TreeView from "~/components/TreeView.vue"
import { formatDate } from "~/labels"
import type { PublishedVersion, VersionReference } from "~/types"

const productId = String(useRoute().params.productId)

const versions = ref<VersionReference[]>([])
const selectedKeys = ref<number[]>([])
const version = ref<PublishedVersion | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
	try {
		versions.value = await api.getVersions(productId)
		const latest = versions.value.at(-1)
		if (latest) selectedKeys.value = [latest.versionNumber]
	} catch (e) {
		error.value = (e as Error).message
	}
})

watch(selectedKeys, async ([versionNumber]) => {
	version.value = versionNumber === undefined ? null : await api.getVersion(productId, versionNumber)
})

const menuItems = computed(() =>
	[...versions.value].reverse().map((v) => ({
		key: v.versionNumber,
		label: `Version ${v.versionNumber}`,
	})),
)
</script>

<template>
	<Space>
		<NuxtLink to="/">← Produits</NuxtLink>
	</Space>
	<div class="page-header"><h1>Versions publiées</h1></div>

	<Alert v-if="error" type="error" show-icon :message="error" />

	<Empty v-else-if="versions.length === 0" description="Aucune version publiée. Publiez depuis l’arbre de travail." />

	<Row v-else :gutter="24">
		<Col :xs="24" :md="7">
			<Menu v-model:selected-keys="selectedKeys" :items="menuItems" mode="inline" />
		</Col>

		<Col v-if="version" :xs="24" :md="17">
			<h2>Version {{ version.versionNumber }}</h2>
			<p class="muted">Publiée le {{ formatDate(version.publishedAt) }}.</p>

			<TreeView :product="version.tree.rootItem" />
		</Col>
	</Row>
</template>
