import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import JavaScriptObfuscator from 'javascript-obfuscator'

const componentsDirectory = fileURLToPath(new URL('../src/.vitepress/theme/components/', import.meta.url)).replace(/\\/g, '/')

/** @returns {import('vitepress').Plugin} */
export function obfuscateTools({ dev = false } = {}) {
  let enabled = false

  return {
    name: 'curvednebula:obfuscate-tools',
    apply(_config, { command }) {
      return command === 'build' || dev
    },
    // Vue must compile its SFCs before we can obfuscate their JavaScript.
    enforce: 'post',
    configResolved(config) {
      enabled = (config.isProduction || (dev && config.command === 'serve')) && !config.build.ssr
    },
    options(options) {
      if (!enabled) return null
      const originalContext = options.moduleContext
      return {
        ...options,
        moduleContext(id) {
          // The obfuscator's domain guard uses top-level `this` as a browser
          // context. Resolve it explicitly when Rollup combines ES modules.
          if (id.replace(/\\/g, '/').startsWith(componentsDirectory)) return 'window'
          return typeof originalContext === 'function' ? originalContext(id) : originalContext?.[id]
        }
      }
    },
    transform(code, id, options) {
      if (!enabled || options?.ssr) return null

      const [filename, query = ''] = id.replace(/\\/g, '/').split('?')
      const params = new URLSearchParams(query)
      if (!filename.startsWith(componentsDirectory) || !/\.(vue|[cm]?js)$/.test(filename)) return null
      if (params.has('raw') || params.has('url')) return null
      if (params.has('type') && !['script', 'template'].includes(params.get('type'))) return null

      const moduleId = filename.slice(componentsDirectory.length) + '?' + query
      const prefix = createHash('sha256').update(moduleId).digest('hex').slice(0, 8)
      const result = JavaScriptObfuscator.obfuscate(code, {
        target: 'browser',
        compact: true,
        domainLock: ['curvednebula.com', 'www.curvednebula.com'],
        domainLockRedirectUrl: 'https://curvednebula.com/',
        // Preserve imports, Vue property names, and exports across modules.
        ignoreImports: true,
        renameGlobals: false,
        renameProperties: false,
        identifiersPrefix: `tool_${prefix}_`,
        seed: 42,
        // Internal maps let Rollup trace diagnostics; Vite does not publish them.
        sourceMap: true,
        sourceMapSourcesMode: 'sources',
        inputFileName: filename,
        // Keep media/canvas processing fast and allow Vite's final minification.
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        selfDefending: false
      })

      const map = JSON.parse(result.getSourceMap())
      // The obfuscator rewrites .mjs source names to .js; Vite needs the real
      // module path to resolve the map in its development server.
      map.sources = [filename]
      return { code: result.getObfuscatedCode(), map }
    }
  }
}
