import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Curved Nebula',
  description: 'Creative apps and online tools for photo editing, color grading, relaxation, and everyday image tasks.',
  outDir: '../dist',
  appearance: false,

  // VuePress treats README.md as an index page and supported custom permalinks.
  // These rewrites keep the existing production URLs unchanged in VitePress.
  rewrites: {
    'cropimage/README.md': 'cropimage/index.md',
    'cropvideo/README.md': 'cropvideo/index.md',
    'lullwave/README.md': 'lullwave/index.md',
    'photocurves/README.md': 'photocurves/index.md'
  },

  head: [
    ['meta', { name: 'theme-color', content: '#883388' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['link', { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-Z40PJ8416Z' }],
    ['script', {}, `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-Z40PJ8416Z');
    `]
  ],

  themeConfig: {
    nav: [
      { text: 'Photo Curves', link: '/photocurves/' },
      { text: 'Lullwave', link: '/lullwave/' },
      {
        text: 'Other',
        items: [
          { text: 'Crop & Resize Image', link: '/cropimage/' },
          { text: 'Crop & Resize Video', link: '/cropvideo/' },
          { text: 'ApiBake - OpenAPI to PDF', link: '/apibake/' }
        ]
      },
      { text: 'Privacy Policy', link: '/privacy_policy.html' },
      { text: 'Contacts', link: '/contacts.html' }
    ],
    search: {
      provider: 'local'
    },
    outline: false
  },

  transformPageData(pageData) {
    // The VuePress site had no document outline/sidebar.
    pageData.frontmatter.aside ??= false
  },

  transformHead({ pageData }) {
    const frontmatter = pageData.frontmatter
    const pageHead: Array<[string, Record<string, string>]> = []

    if (frontmatter.canonicalUrl) {
      pageHead.push([
        'link',
        { rel: 'canonical', href: String(frontmatter.canonicalUrl) }
      ])
    }

    if (Array.isArray(frontmatter.meta)) {
      for (const attributes of frontmatter.meta) {
        pageHead.push(['meta', attributes])
      }
    }

    return pageHead
  }
})
