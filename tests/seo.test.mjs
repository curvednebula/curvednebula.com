import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const origin = 'https://curvednebula.com'
const read = path => readFileSync(join(dist, path), 'utf8')
const decode = text => text.replace(/&(?:amp|quot|lt|gt|#39);/g, entity => ({
  '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&#39;': "'"
})[entity])
const attributes = tag => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])
)

function htmlFiles(directory = '') {
  return readdirSync(join(dist, directory), { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : []
  })
}

const pages = htmlFiles().filter(path => path !== '404.html').map(path => {
  const urlPath = '/' + path.replaceAll('\\', '/').replace(/index\.html$/, '')
  const html = read(path)
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/)[1]
  const metas = [...head.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attributes(tag))
  return { path, url: origin + urlPath, html, head, metas }
})

test('each page has unique search metadata, one main heading, and a self-referencing canonical', () => {
  const titles = new Set()
  const descriptions = new Set()
  for (const page of pages) {
    const titlesOnPage = [...page.head.matchAll(/<title>(.*?)<\/title>/g)]
    assert.equal(titlesOnPage.length, 1, page.path)
    const title = decode(titlesOnPage[0][1])
    assert.ok(title.endsWith(' | Curved Nebula'), page.path)
    assert.ok(!titles.has(title), `Duplicate title: ${page.path}`)
    titles.add(title)
    const descriptionsOnPage = page.metas.filter(meta => meta.name === 'description')
    assert.equal(descriptionsOnPage.length, 1, page.path)
    const description = descriptionsOnPage[0].content
    assert.ok(description?.trim(), `Missing description: ${page.path}`)
    assert.ok(!descriptions.has(description), `Duplicate description: ${page.path}`)
    descriptions.add(description)
    assert.equal([...page.html.matchAll(/<h1\b/g)].length, 1, page.path)
    const canonicals = [...page.head.matchAll(/<link\b[^>]*>/g)]
      .map(([tag]) => attributes(tag)).filter(link => link.rel === 'canonical')
    assert.deepEqual(canonicals.map(link => link.href), [page.url], page.path)
    assert.ok(!page.metas.some(meta => meta.name === 'keywords'), page.path)
    assert.ok(!page.metas.some(meta => meta.name === 'robots' && /noindex/i.test(meta.content)), page.path)
  }
})

test('social previews match search metadata and reference existing local images', () => {
  for (const page of pages) {
    const meta = key => {
      const matches = page.metas.filter(item => (item.property ?? item.name) === key)
      assert.equal(matches.length, 1, `${page.path}: ${key}`)
      return matches[0].content
    }
    const title = decode(page.head.match(/<title>(.*?)<\/title>/)[1])
    assert.equal(meta('og:title'), title, page.path)
    assert.equal(meta('twitter:title'), title, page.path)
    assert.equal(meta('og:description'), meta('description'), page.path)
    assert.equal(meta('twitter:description'), meta('description'), page.path)
    assert.equal(meta('og:url'), page.url, page.path)
    assert.equal(meta('og:type'), 'website', page.path)
    assert.equal(meta('og:site_name'), 'Curved Nebula', page.path)
    assert.equal(meta('twitter:card'), 'summary', page.path)
    const image = new URL(meta('og:image'))
    assert.equal(image.origin, origin, page.path)
    assert.ok(existsSync(join(dist, image.pathname.slice(1))), `${page.path}: image missing`)
    assert.equal(meta('twitter:image'), image.href, page.path)
  }
})

test('sitemap covers every public page and all pages are reachable through HTML links', () => {
  const sitemapUrls = [...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url)
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'Duplicate sitemap entries')
  assert.deepEqual(sitemapUrls.sort(), pages.map(page => page.url).sort())
  assert.ok(read('robots.txt').includes(`Sitemap: ${origin}/sitemap.xml`))
  assert.ok(!/^Disallow:\s*\/\s*$/m.test(read('robots.txt')))
  const byUrl = new Map(pages.map(page => [page.url, page]))
  const reachable = new Set([origin + '/'])
  for (const url of reachable) {
    for (const [tag] of byUrl.get(url).html.matchAll(/<a\b[^>]*>/g)) {
      const href = attributes(tag).href
      if (!href) continue
      const target = new URL(href, url)
      target.hash = ''
      if (byUrl.has(target.href)) reachable.add(target.href)
    }
  }
  assert.deepEqual([...reachable].sort(), [...byUrl.keys()].sort())
})
