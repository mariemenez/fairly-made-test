<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue"
import { useRoute } from "vue-router"
import { Alert, Button, Space, Tag, message } from "ant-design-vue"
import * as api from "~/api"
import TreeView from "~/components/TreeView.vue"
import { orphanedCorrectionText } from "~/labels"
import { TREE_ACTIONS, type TreeActions } from "~/treeActions"
import type { WorkingTreeView } from "~/types"

const productId = String(useRoute().params.productId)

const view = ref<WorkingTreeView | null>(null)
const loadError = ref<string | null>(null)
const busy = ref(false)

onMounted(async () => {
	try {
		view.value = await api.getWorkingTree(productId)
	} catch (error) {
		loadError.value = (error as Error).message
	}
})

async function run(action: () => Promise<string>): Promise<boolean> {
	busy.value = true
	try {
		message.success(await action())
		return true
	} catch (error) {
		message.error((error as Error).message)
		return false
	} finally {
		busy.value = false
	}
}

const actions: TreeActions = {
	addCorrection: (input) =>
		run(async () => {
			view.value = await api.addCorrection(productId, input)
			return "Correction enregistrée."
		}),
	removeCorrection: (correctionId) =>
		run(async () => {
			view.value = await api.removeCorrection(productId, correctionId)
			return "Correction retirée : la valeur déclarée est rétablie."
		}),
	keepCorrection: (correctionId) =>
		run(async () => {
			view.value = await api.keepCorrection(productId, correctionId)
			return "Correction confirmée."
		}),
}
provide(TREE_ACTIONS, actions)

const simulateRefresh = () =>
	run(async () => {
		const outcome = await api.simulateRefresh(productId)
		view.value = outcome.workingTree
		return outcome.accepted
			? "Nouvelles informations fournisseurs intégrées. Vos corrections sont conservées."
			: "Rien de nouveau depuis le dernier refresh reçu."
	})

const publish = () =>
	run(async () => {
		const version = await api.publishVersion(productId)
		view.value = await api.getWorkingTree(productId)
		return `Version ${version.versionNumber} publiée.`
	})

const orphans = computed(() => view.value?.tree.corrections.filter((c) => c.status === "ORPHANED") ?? [])
</script>

<template>
	<Space>
		<NuxtLink to="/">← Produits</NuxtLink>
	</Space>

	<Alert v-if="loadError" type="error" show-icon :message="loadError" />

	<template v-else-if="view">
		<div class="page-header">
			<div>
				<h1>{{ view.tree.product.name }}</h1>
				<Space>
					<span class="muted">{{ view.tree.product.reference }} · {{ view.tree.product.season }}</span>
					<Tag v-if="view.lastVersion">v{{ view.lastVersion.versionNumber }} publiée</Tag>
					<Tag v-else>Jamais publié</Tag>
					<Tag v-if="view.hasUnpublishedChanges" color="gold">Modifications à publier</Tag>
				</Space>
			</div>
			<Space>
				<Button :loading="busy" @click="simulateRefresh">Simuler un refresh</Button>
				<Button
					type="primary"
					:loading="busy"
					:disabled="view.compositionProblems.length > 0 || !view.hasUnpublishedChanges"
					@click="publish"
				>
					Publier une version
				</Button>
			</Space>
		</div>

		<div class="stack">
			<Alert
				v-if="view.compositionProblems.length > 0"
				type="error"
				show-icon
				message="Publication bloquée : une composition est invalide (voir le composant concerné)."
			/>

			<Alert v-if="orphans.length > 0" type="warning" show-icon>
				<template #description>
					<div v-for="orphan in orphans" :key="orphan.correction.id">
						{{ orphanedCorrectionText(orphan.correction) }}
						<Button type="link" size="small" danger @click="actions.removeCorrection(orphan.correction.id)">
							Supprimer
						</Button>
					</div>
				</template>
			</Alert>
		</div>

		<TreeView :product="view.tree.rootItem" :composition-problems="view.compositionProblems" />
	</template>
</template>
