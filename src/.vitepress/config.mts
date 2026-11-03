import { defineConfig } from 'vitepress'
import { obfuscateTools } from '../../scripts/obfuscate-tools.mjs'

export default defineConfig({
  title: 'Curved Nebula',
  description: 'Creative apps and online tools for photo editing, color grading, relaxation, and everyday image tasks.',
  outDir: '../dist',
  appearance: false,
  vite: {
    build: { sourcemap: false },
    plugins: [obfuscateTools({ dev: process.argv.includes('--obfuscate-tools') })]
  },

  head: [
    ['meta', { name: 'theme-color', content: '#326DA7' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['link', { rel: 'icon', type: 'image/x-icon', sizes: '16x16 32x32 48x48 64x64 256x256', href: '/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' }],
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-Z40PJ8416Z' }],
    ['script', {}, `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-Z40PJ8416Z');
    `]
  ],

  themeConfig: {
    siteTitle: false,
    logo: {
      src: '/images/curvednebula-retro.svg',
      alt: 'Curved Nebula'
    },
    nav: [
      { text: 'Photo Curves', link: '/photocurves/' },
      { text: 'Lullwave', link: '/lullwave/' },
      {
        text: 'Online Tools',
        items: [
          { text: 'Crop & Resize Image', link: '/cropimage/' },
          { text: 'Crop & Trim Video', link: '/cropvideo/' },
          { text: 'Trim Audio', link: '/trimaudio/' },
          { text: 'App Screenshot Creator', link: '/appscreenshots/' },
          { text: 'UI Color Palette Generator', link: '/colorpalette/' }
        ]
      },
      {
        text: 'Other',
        items: [
          { text: 'ApiBake - OpenAPI to PDF', link: '/apibake/' }
        ]
      },
      { text: 'Privacy Policy', link: '/privacy_policy.html' },
      { text: 'Contacts', link: '/contacts.html' }
    ],
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
