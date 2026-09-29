<script setup lang="ts">
import { onMounted, ref } from "vue"
import { ConfigProvider } from "ant-design-vue"
import frFR from "ant-design-vue/es/locale/fr_FR"
import { loadReferenceData, referenceData } from "~/referenceData"

const loadError = ref<string | null>(null)

onMounted(async () => {
	try {
		await loadReferenceData()
	} catch (error) {
		loadError.value = (error as Error).message
	}
})
</script>

<template>
	<!-- ConfigProvider : textes en français pour tous les composants Ant Design (tableau vide, etc.). -->
	<ConfigProvider :locale="frFR">
		<header class="app-header">
			<!-- NuxtLink : l'équivalent du composant Link de React Router. -->
			<NuxtLink to="/" class="app-title">Traçabilité produits</NuxtLink>
		</header>
		<main class="app-main">
			<p v-if="loadError" class="load-error">{{ loadError }}</p>
			<!-- NuxtPage : l'équivalent d'Outlet dans React Router, affiche la page qui correspond à l'URL (fichiers de app/pages/). -->
			<NuxtPage v-else-if="referenceData" />
		</main>
	</ConfigProvider>
</template>
