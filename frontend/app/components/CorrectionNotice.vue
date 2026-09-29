<script setup lang="ts">
import { Button, Space, Tag, Tooltip } from "ant-design-vue"
import { useTreeActions } from "~/treeActions"

defineProps<{
	correctionId: string
	status: "APPLIED" | "CONFLICT"
	declaredText: string
}>()

const actions = useTreeActions()
</script>

<template>
	<Space size="small" wrap>
		<Tag v-if="status === 'CONFLICT'" color="orange">Conflit</Tag>
		<Tag v-else color="blue">Corrigé</Tag>
		<span class="muted">déclaré : {{ declaredText }}</span>

		<template v-if="actions && status === 'CONFLICT'">
			<Tooltip title="Garder ma correction malgré la nouvelle déclaration">
				<Button type="link" size="small" @click="actions.keepCorrection(correctionId)"> Garder </Button>
			</Tooltip>
			<Tooltip title="Abandonner ma correction et reprendre la valeur du fournisseur">
				<Button type="link" size="small" @click="actions.removeCorrection(correctionId)"> Revenir </Button>
			</Tooltip>
		</template>

		<Button v-else-if="actions" type="link" size="small" @click="actions.removeCorrection(correctionId)">
			Annuler
		</Button>
	</Space>
</template>
