export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: true },

  app: {
    head: {
      title: '回忆碎片',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '那些被悄悄记下的心事与碎碎念' },
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&family=ZCOOL+KuaiLe&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || '',
    public: {},
  },

  nitro: {
    experimental: {
      tasks: true,
    },
  },
})
