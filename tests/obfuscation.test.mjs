import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { obfuscateTools } from '../scripts/obfuscate-tools.mjs'

const components = fileURLToPath(new URL('../src/.vitepress/theme/components/', import.meta.url))
const source = 'globalThis.toolResult = "tool ready";'

function productionPlugin() {
  const plugin = obfuscateTools()
  plugin.configResolved({ isProduction: true, build: { ssr: false } })
  return plugin
}

test('only production browser JavaScript in the tools directory is obfuscated', () => {
  const plugin = productionPlugin()
  assert.equal(plugin.apply({}, { command: 'build' }), true)
  assert.equal(plugin.apply({}, { command: 'serve' }), false)
  for (const name of ['ImageCrop.vue', 'VideoCrop.vue', 'AudioTrim.vue', 'ColorPalette.vue', 'AppScreenshots.vue', 'app-screenshots/render.mjs', 'app-screenshots/download.mjs', 'AppScreenshots.vue?vue&type=template']) {
    assert.notEqual(plugin.transform(source, components + name).code, source, name)
  }
  for (const name of ['AppScreenshots.vue?vue&type=style&index=0&lang.css', 'AppScreenshots.vue?raw', 'app-screenshots/render.mjs?url', 'custom.css']) {
    assert.equal(plugin.transform(source, components + name), null, name)
  }
  for (const path of ['../index.ts', '../../../../index.md', '../../../../../node_modules/vue/index.mjs', '../components-other/tool.js']) {
    assert.equal(plugin.transform(source, fileURLToPath(new URL(path, new URL('../src/.vitepress/theme/components/', import.meta.url)))), null, path)
  }
  assert.equal(plugin.transform(source, components + 'ImageCrop.vue', { ssr: true }), null)
  for (const config of [{ isProduction: false, build: { ssr: false } }, { isProduction: true, build: { ssr: true } }]) {
    plugin.configResolved(config)
    assert.equal(plugin.transform(source, components + 'ImageCrop.vue'), null)
  }
})

test('development obfuscation is opt-in and still skips server rendering', () => {
  const plugin = obfuscateTools({ dev: true })
  assert.equal(plugin.apply({}, { command: 'serve' }), true)
  plugin.configResolved({ command: 'serve', isProduction: false, build: { ssr: false } })
  assert.notEqual(plugin.transform(source, components + 'ImageCrop.vue').code, source)
  assert.equal(plugin.transform(source, components + 'ImageCrop.vue', { ssr: true }), null)
})

for (const mode of ['production', 'dev']) {
  test(`${mode} domain lock accepts the site hosts and redirects other hosts`, () => {
    const plugin = mode === 'production' ? productionPlugin() : obfuscateTools({ dev: true })
    if (mode === 'dev') plugin.configResolved({ command: 'serve', isProduction: false, build: { ssr: false } })
    const { code } = plugin.transform(source, components + 'ImageCrop.vue')
    for (const hostname of ['curvednebula.com', 'www.curvednebula.com', 'localhost', '127.0.0.1', 'example.com', 'evilcurvednebula.com', 'curvednebula.com.example.com', 'preview.curvednebula.com']) {
      const location = { hostname, href: `https://${hostname}/` }
      const document = {
        domain: hostname,
        get location() { return location },
        set location(url) { location.href = url }
      }
      const context = { location, document }
      context.window = context
      runInNewContext(code, context, { timeout: 1000 })
      if (['curvednebula.com', 'www.curvednebula.com'].includes(hostname)) {
        assert.equal(location.href, `https://${hostname}/`, hostname)
        assert.equal(context.toolResult, 'tool ready', hostname)
      } else {
        assert.equal(location.href, 'https://curvednebula.com/', hostname)
      }
    }
  })

}

test('module imports and exported interfaces survive obfuscation', () => {
  const source = 'import { ref } from "vue"; export function tool() { return import("mediabunny").then(() => ref("ready")); }'
  const { code } = productionPlugin().transform(source, components + 'VideoCrop.vue')
  assert.match(code, /from\s*['"]vue['"]/)
  assert.match(code, /import\(['"]mediabunny['"]\)/)
  assert.match(code, /export\s*function tool\(/)
})
