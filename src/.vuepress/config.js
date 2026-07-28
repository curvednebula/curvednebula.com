module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Curved Nebula',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: 'Creative apps and online tools for photo editing, color grading, relaxation, and everyday image tasks.',
  dest: 'dist',

  // VuePress 1's webpack parser predates the modern syntax used by webm-muxer.
  // Transpile only that dependency instead of widening Babel processing to all node_modules.
  chainWebpack: (config) => {
    config.module
      .rule('transpile-webm-muxer')
      .test(/webm-muxer[\\/]build[\\/]webm-muxer\.m?js$/)
      .use('babel-loader')
      .loader('babel-loader')
      .options({
        presets: [require.resolve('@babel/preset-env')]
      })

    config.module
      .rule('transpile-web-demuxer')
      .test(/web-demuxer[\\/]dist[\\/]web-demuxer\.js$/)
      .use('babel-loader')
      .loader('babel-loader')
      .options({
        presets: [require.resolve('@babel/preset-env')]
      })
  },

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', {name: 'theme-color', content: '#883388'}],
    ['meta', {name: 'apple-mobile-web-app-capable', content: 'yes'}],
    ['meta', {name: 'apple-mobile-web-app-status-bar-style', content: 'black'}],
    ['link', {rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico'}],
    // Google Analytics
    ['script', {'async src': 'https://www.googletagmanager.com/gtag/js?id=G-Z40PJ8416Z'}, ''],
    ['script', {}, `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-Z40PJ8416Z');
    `]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    repo: '',
    editLinks: false,
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    nav: [
      { text: 'Photo Curves', link: '/photocurves/' },
      { text: 'Lullwave', link: '/lullwave/' },
      {
        text: "Other",
        items: [
          { text: 'Crop & Resize Image', link: '/cropimage/' },
          { text: 'Crop & Resize Video', link: '/cropvideo/' },
          { text: 'ApiBake - OpenAPI to PDF', link: '/apibake/' }
        ]
      },
      { text: 'Privacy Policy', link: '/privacy_policy.html' },
      { text: 'Contacts', link: '/contacts.html' }
    ],
    sidebar: {}
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
