const { description } = require('../../package')

module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Curved Nebula',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: 'Developer of Photo Curves color grading app for Android, iOS, macOS',
  dest: 'dist',

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', {name: 'theme-color', content: '#883388'}],
    ['meta', {name: 'apple-mobile-web-app-capable', content: 'yes'}],
    ['meta', {name: 'apple-mobile-web-app-status-bar-style', content: 'black'}],
    ['link', {rel: 'shortcut icon', type: 'image/x-icon', href: 'favicon.ico'}],
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
      { text: 'ApiBake', link: '/docbaker/' },
      { text: 'Contacts', link: '/contacts.html' },
    ],
    sidebar: {
      '/photocurves/': [
        {
          title: 'Photo Curves',
          collapsable: false,
          children: [
            '',
            'privacy_policy'
          ]
        }
      ],
      '/docbaker/': [
        {
          title: 'ApiBake',
          collapsable: false,
          children: [
            ''
          ]
        }
      ],
    }
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
