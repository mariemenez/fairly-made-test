// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Outil interne, pas de référencement : rendu uniquement dans le navigateur, comme une SPA React classique.
  ssr: false,
  css: ['ant-design-vue/dist/reset.css', '~/assets/main.css'],
  typescript: { strict: true },
})
