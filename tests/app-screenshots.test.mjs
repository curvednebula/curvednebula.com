import test from 'node:test'
import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { gradientCoordinates, screenshotRect, wrapText, frameSettings, validDimensions, renderFrame } from '../src/.vitepress/theme/components/app-screenshots/render.mjs'
import { crc32, canvasPng, createZip } from '../src/.vitepress/theme/components/app-screenshots/download.mjs'

const vueUrl = pathToFileURL(createRequire(new URL('../node_modules/vitepress/package.json', import.meta.url)).resolve('vue')).href
const { createRenderer, nextTick } = await import(vueUrl)

test('frame selection, toolbar controls, and per-frame settings remain independent', async t => {
  const sourceUrl = new URL('../src/.vitepress/theme/components/AppScreenshots.vue', import.meta.url)
  const { descriptor } = parse(await readFile(sourceUrl, 'utf8'))
  const script = compileScript(descriptor, { id: 'frame-selection-test' })
  const template = compileTemplate({ source: descriptor.template.content, filename: 'AppScreenshots.vue', id: 'frame-selection-test', compilerOptions: { bindingMetadata: script.bindings } })
  assert.deepEqual(template.errors, [])
  const moduleUrl = new URL(`../tmp/frame-selection-${randomUUID()}.mjs`, import.meta.url)
  await mkdir(new URL('../tmp/', import.meta.url), { recursive: true })
  const compiled = `${script.content.replace('export default ', 'const component = ')}\n${template.code}\ncomponent.render = render;\nexport default component;`
    .replace(/from '(\.\/[^']+)'/g, (_, specifier) => `from '${new URL(specifier, sourceUrl).href}'`)
    .replace(/from (['"])vue\1/g, `from '${vueUrl}'`)
  await writeFile(moduleUrl, compiled)

  // Render the production component into VNodes without mounting its DOM or
  // drawing canvases. This retains Vue's real reactivity and template handlers.
  const originals = new Map(['window', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  globalThis.requestAnimationFrame = () => 1
  globalThis.cancelAnimationFrame = () => {}
  let app
  t.after(async () => {
    app?.unmount()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
    await unlink(moduleUrl)
  })
  const { default: component } = await import(moduleUrl.href)
  let tree
  const renderer = createRenderer({
    createComment: text => ({ text }),
    insert: (node, parent) => { parent.children.push(node); node.parent = parent },
    remove: node => { node.parent.children.splice(node.parent.children.indexOf(node), 1) },
    parentNode: node => node.parent,
    nextSibling: () => null
  })
  app = renderer.createApp({ ...component, render(...args) { tree = component.render.apply(this, args); return null } })
  app.mount({ children: [] })
  const state = app._instance.setupState
  state.backgroundDefault.color = '#123456'
  state.frames.push(...[1, 2, 3].map(id => ({ id, name: `frame-${id}.png`, caption: `Description ${id}`, ...state.backgroundDefault, customLayout: false, customText: false, customBackground: false, gradient: { ...state.settings.gradient }, layout: { ...state.settings.layout }, text: { ...state.settings.text } })))
  state.selectedId = 2
  state.overflow = { 1: true }
  await nextTick()

  function findClass(root, name) {
    const matches = []
    function visit(node, path) {
      if (!node || typeof node !== 'object') return
      const nextPath = [...path, node]
      if (typeof node.props?.class === 'string' && node.props.class.split(/\s+/).includes(name)) matches.push(nextPath)
      if (Array.isArray(node.children)) node.children.forEach(child => visit(child, nextPath))
    }
    visit(root, [])
    return matches
  }
  async function click(path) {
    let stopped = false
    const event = { stopPropagation() { stopped = true }, preventDefault() {} }
    for (const node of [...path].reverse()) {
      node.props?.onClick?.(event)
      if (stopped) break
    }
    await nextTick()
  }
  const cards = () => findClass(tree, 'frame-card')
  const within = (cardIndex, name) => {
    const cardPath = cards()[cardIndex]
    const childPath = findClass(cardPath.at(-1), name)[0]
    assert.ok(childPath, `Frame ${cardIndex + 1} should contain ${name}`)
    return [...cardPath.slice(0, -1), ...childPath]
  }

  const panels = findClass(tree, 'settings-grid')[0].at(-1).children.filter(node => node.type === 'section')
  assert.equal(panels.length, 4)
  assert.ok(panels[3].props.class.includes('background-panel'), 'Background follows Typography in the same settings grid')
  assert.equal(findClass(tree, 'frame-remove').length, 1)
  assert.match(findClass(tree, 'frame-remove')[0].at(-1).props['aria-label'], /Remove frame 2:/)
  assert.equal(findClass(tree, 'frame-replace').length, 1)
  let replacePickerOpened = 0
  state.replaceInput = { click() { replacePickerOpened++ } }
  await click(within(1, 'frame-replace'))
  assert.equal(replacePickerOpened, 1)
  assert.equal(state.replacementId, 2, 'The replace picker must target the selected frame')
  assert.equal(state.selectedId, 2)
  async function toggleScope(name, enabled) {
    const path = findClass(tree, `${name}-scope`)[0]
    assert.ok(path.at(-2).props.class.includes('panel-heading'), 'Scope checkbox belongs in the panel heading')
    path.at(-1).children[0].props.onChange({ target: { checked: enabled } })
    await nextTick()
  }
  await toggleScope('composition', true)
  state.activeLayout.top = 40
  assert.equal(state.settings.layout.top, 25)
  await click(within(0, 'frame-preview'))
  assert.equal(state.activeLayout.top, 25)
  await click(within(1, 'frame-preview'))
  assert.equal(state.activeLayout.top, 40)
  await toggleScope('composition', false)
  assert.equal(state.activeLayout.top, 25)
  await toggleScope('text', true)
  state.activeText.size = 8
  assert.equal(state.settings.text.size, 6)
  await toggleScope('text', false)
  assert.equal(state.activeText.size, 6)
  async function chooseBackground(type) {
    const typeLabel = findClass(tree, 'background-type')[0].at(-1)
    const select = typeLabel.children.find(node => node.type === 'select')
    select.props['onUpdate:modelValue'](type)
    await nextTick()
  }
  const originalGradient = { ...state.settings.gradient }
  assert.equal(findClass(tree, 'gradient-controls').length, 1)
  const presetGroups = findClass(tree, 'gradient-preset-group')
  assert.equal(presetGroups.length, 3)
  for (const group of presetGroups) assert.equal(findClass(group.at(-1), 'gradient-swatch').length, 7)
  await toggleScope('background', true)
  state.activeGradient.start = '#ff0000'
  state.activeGradient.angle = 90
  assert.deepEqual({ ...state.settings.gradient }, originalGradient, 'A frame-specific gradient must not change shared settings')
  await chooseBackground('solid')
  assert.equal(findClass(tree, 'gradient-controls').length, 0)
  assert.equal(findClass(tree, 'solid-controls').length, 1)
  const solidInput = findClass(tree, 'solid-controls')[0].at(-1).children[0].children[0]
  solidInput.props['onUpdate:modelValue']('#fedcba')
  await nextTick()
  assert.equal(state.selected.color, '#fedcba')
  assert.equal(state.activeGradient.start, '#ff0000')
  assert.equal(state.frames[0].color, '#123456', 'Solid colors apply only to the selected frame')
  await click(within(0, 'frame-preview'))
  assert.equal(findClass(tree, 'gradient-controls').length, 1)
  assert.equal(findClass(tree, 'solid-controls').length, 0)
  await click(within(1, 'frame-preview'))
  assert.equal(findClass(tree, 'solid-controls').length, 1)
  assert.equal(state.selected.color, '#fedcba')
  await chooseBackground('gradient')
  assert.equal(findClass(tree, 'solid-controls').length, 0)
  assert.deepEqual({ ...state.settings.gradient }, originalGradient, 'Switching background types preserves gradient settings')
  await chooseBackground('solid')
  await toggleScope('background', false)
  await chooseBackground('solid')
  state.activeBackground.color = '#fedcba'
  await nextTick()
  assert.ok(state.frames.every(frame => frame.background === 'solid' && frame.color === '#fedcba'))
  assert.ok(state.frames.every(frame => !frame.customBackground))
  state.activeBackground.color = '#334455'
  await nextTick()
  assert.ok(state.frames.every(frame => frame.color === '#334455'), 'Shared color edits update all frames without overrides')
  await toggleScope('background', true)
  state.activeBackground.color = '#abcdef'
  await click(within(0, 'frame-preview'))
  state.activeBackground.color = '#112233'
  await nextTick()
  assert.equal(state.frames[1].color, '#abcdef', 'Shared edits preserve a frame-specific background')
  await click(within(1, 'frame-preview'))
  await toggleScope('background', false)
  assert.equal(state.selected.color, '#112233', 'Disabling a frame override restores the current shared background')
  assert.equal(findClass(tree, 'reorder-buttons').length, 1)
  const leftControls = within(1, 'reorder-buttons')
  await click([...leftControls, leftControls.at(-1).children[0]])
  assert.deepEqual(state.frames.map(frame => frame.id), [2, 1, 3])
  assert.equal(state.selectedId, 2, 'Reordering must keep the same frame selected')
  const rightControls = within(0, 'reorder-buttons')
  assert.equal(rightControls.at(-1).children[0].props.disabled, true)
  await click([...rightControls, rightControls.at(-1).children[1]])
  assert.deepEqual(state.frames.map(frame => frame.id), [1, 2, 3])
  assert.equal(state.selectedId, 2)
  await click(within(0, 'frame-preview'))
  assert.equal(state.selectedId, 1)
  assert.equal(state.selected.caption, 'Description 1')
  await click(cards()[1])
  assert.equal(state.selectedId, 2)
  await click(within(0, 'frame-name'))
  assert.equal(state.selectedId, 1)
  await click(cards()[1])
  await click(within(0, 'overflow-dot'))
  assert.equal(state.selectedId, 1)
  assert.equal(findClass(tree, 'frame-remove').length, 1)
  await click(within(0, 'frame-remove'))
  assert.deepEqual(state.frames.map(frame => frame.id), [2, 3])
  assert.equal(state.selectedId, 2, 'Removing a frame must not reselect it through a bubbling click')
  for (let i = 0; i < 6; i++) {
    const index = i % 2
    await click(within(index, 'frame-preview'))
    assert.equal(state.selectedId, index + 2)
    assert.equal(state.selected.caption, `Description ${index + 2}`)
    assert.equal(findClass(tree, 'frame-remove').length, 1)
    assert.equal(findClass(tree, 'frame-replace').length, 1)
    assert.equal(findClass(tree, 'reorder-buttons').length, 1)
    assert.ok(cards()[index].at(-1).props.class.split(/\s+/).includes('selected'))
    assert.equal(within(index, 'frame-preview').at(-1).props['aria-pressed'], true)
  }
})

test('the same gradient color reaches both sides of every frame boundary', () => {
  function position(coords, x, y) {
    const [x0, y0, x1, y1] = coords
    return ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2)
  }
  for (const [width, height] of [[1080, 1920], [2868, 1320]]) {
    for (const count of [2, 4, 10]) {
      for (const angle of [0, 45, 90, 135, 180, 270, 360]) {
        for (let index = 0; index < count - 1; index++) {
          for (const y of [0, height / 2, height]) {
            const left = position(gradientCoordinates(width, height, count, index, angle), width, y)
            const right = position(gradientCoordinates(width, height, count, index + 1, angle), 0, y)
            assert.ok(Math.abs(left - right) < 1e-12)
          }
        }
      }
    }
  }
})

test('mixed screenshot aspect ratios fit completely below the description', () => {
  for (const [imageWidth, imageHeight] of [[1080, 2400], [2400, 1080], [500, 500]]) {
    for (const [width, height] of [[1080, 1920], [2752, 2064]]) {
      for (const top of [15, 25, 55]) {
        const rect = screenshotRect(imageWidth, imageHeight, width, height, { scale: 94, top, margin: 6 })
        assert.ok(rect.x >= width * 0.06)
        assert.ok(rect.y >= height * top / 100)
        assert.ok(rect.x + rect.w <= width * 0.94 + 1e-9)
        assert.ok(rect.y + rect.h <= height * 0.96 + 1e-9)
        assert.ok(Math.abs(rect.w / rect.h - imageWidth / imageHeight) < 1e-12)
      }
    }
  }
})

test('text wraps long words and preserves newlines, blank lines, and Unicode', () => {
  const ctx = { measureText: text => ({ width: Array.from(text).length * 10 }) }
  assert.deepEqual(wrapText(ctx, 'one two three', 70), ['one two', 'three'])
  assert.deepEqual(wrapText(ctx, 'abcdefghij', 40), ['abcd', 'efgh', 'ij'])
  assert.deepEqual(wrapText(ctx, 'one\r\n\r\ntwo', 70), ['one', '', 'two'])
  assert.deepEqual(wrapText(ctx, '😀😀😀', 20), ['😀😀', '😀'])
})

test('frame overrides stay separate from shared settings', () => {
  const shared = { layout: { top: 25 }, text: { size: 6 } }
  const frame = { layout: { top: 40 }, text: { size: 4 }, customLayout: true, customText: false }
  assert.equal(frameSettings(frame, shared).layout.top, 40)
  assert.equal(frameSettings(frame, shared).text.size, 6)
})

test('dimensions reject invalid, fractional, and excessively large outputs', () => {
  for (const size of [[1080, 1920], [1320, 2868], [2064, 2752], [320, 320]]) assert.ok(validDimensions(...size))
  for (const size of [[0, 1000], [1080.5, 1920], ['', 1920], [4096, 4096], [Infinity, 1080], [5000, 1000]]) assert.ok(!validDimensions(...size))
})

test('preview and export draw identical geometry and flag text overflow', () => {
  const shared = { width: 1080, height: 1920, layout: { scale: 94, top: 25, margin: 6 }, text: { size: 6, weight: '700', font: 'sans', align: 'center', color: '#fff' }, gradient: { start: '#111', end: '#aaa', angle: 45 } }
  const frame = { image: { naturalWidth: 1080, naturalHeight: 2400 }, background: 'gradient', caption: 'A useful description', customText: false, customLayout: false }
  const calls = []
  const ctx = {
    setTransform() {}, fillRect() {}, save() {}, beginPath() {}, rect() {}, clip() {}, restore() {},
    createLinearGradient: (...coords) => { calls.push(['gradient', ...coords]); return { addColorStop: (...args) => calls.push(['gradient-stop', ...args]) } },
    drawImage: (_, ...coords) => calls.push(['image', ...coords]),
    measureText: text => ({ width: Array.from(text).length * 32 }),
    fillText: (...args) => calls.push(['text', ...args])
  }
  const canvas = { getContext: () => ctx }
  assert.equal(renderFrame(canvas, frame, 1, 4, shared, 420).overflow, false)
  const preview = calls.splice(0)
  assert.equal(canvas.width, 420)
  renderFrame(canvas, frame, 1, 4, shared)
  assert.deepEqual(calls.splice(0), preview)
  assert.equal(canvas.width, 1080)
  assert.equal(canvas.height, 1920)
  frame.caption = 'A long description '.repeat(40)
  assert.equal(renderFrame(canvas, frame, 1, 4, shared).overflow, true)
  calls.splice(0)
  frame.customBackground = true
  frame.gradient = { start: '#ff0000', end: '#0000ff', angle: 90 }
  renderFrame(canvas, frame, 1, 4, shared)
  assert.deepEqual(calls.filter(call => call[0] === 'gradient-stop'), [['gradient-stop', 0, '#ff0000'], ['gradient-stop', 1, '#0000ff']])
  assert.deepEqual(calls.find(call => call[0] === 'gradient').slice(1), gradientCoordinates(1080, 1920, 4, 1, 90))
  assert.equal(shared.gradient.start, '#111')
})

test('PNG export writes correct RGB pixels, dimensions, checksums, and no alpha channel', async () => {
  const rgba = new Uint8ClampedArray([255, 20, 30, 255, 10, 200, 40, 255, 40, 50, 250, 255, 0, 0, 0, 255])
  const canvas = { width: 2, height: 2, getContext: () => ({ getImageData: () => ({ data: rgba }) }) }
  const blob = await canvasPng(canvas)
  assert.equal(blob.type, 'image/png')
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const view = new DataView(bytes.buffer)
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(view.getUint32(16), 2)
  assert.equal(view.getUint32(20), 2)
  assert.equal(bytes[24], 8)
  assert.equal(bytes[25], 2) // True-color RGB, not RGBA.
  let decoded
  for (let offset = 8; offset < bytes.length;) {
    const size = view.getUint32(offset)
    const name = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8))
    assert.equal(crc32(bytes.subarray(offset + 4, offset + 8 + size)), view.getUint32(offset + 8 + size))
    if (name === 'IDAT') decoded = inflateSync(bytes.subarray(offset + 8, offset + 8 + size))
    offset += 12 + size
  }
  const pixels = []
  for (let y = 0; y < 2; y++) {
    const row = y * 7
    assert.equal(decoded[row], 1)
    const recovered = []
    for (let i = 0; i < 6; i++) recovered.push((decoded[row + 1 + i] + (i >= 3 ? recovered[i - 3] : 0)) & 255)
    pixels.push(...recovered)
  }
  assert.deepEqual(pixels, [255, 20, 30, 10, 200, 40, 40, 50, 250, 0, 0, 0])
})

test('ZIP directory entries point to intact numbered images in sequence order', async () => {
  const files = [
    { name: 'screenshot-01-1080x1920.png', blob: new Blob([new Uint8Array([0, 137, 255, 14])]) },
    { name: 'screenshot-02-1080x1920.png', blob: new Blob(['second image']) }
  ]
  const blob = await createZip(files)
  assert.equal(blob.type, 'application/zip')
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const view = new DataView(bytes.buffer)
  const end = bytes.length - 22
  assert.equal(view.getUint32(end, true), 0x06054b50)
  assert.equal(view.getUint16(end + 10, true), 2)
  let directory = view.getUint32(end + 16, true)
  const directoryStart = directory
  for (const file of files) {
    assert.equal(view.getUint32(directory, true), 0x02014b50)
    const local = view.getUint32(directory + 42, true)
    assert.equal(view.getUint32(local, true), 0x04034b50)
    const nameSize = view.getUint16(directory + 28, true)
    assert.equal(new TextDecoder().decode(bytes.slice(directory + 46, directory + 46 + nameSize)), file.name)
    const payload = new Uint8Array(await file.blob.arrayBuffer())
    assert.equal(view.getUint32(local + 14, true), crc32(payload))
    assert.deepEqual(bytes.slice(local + 30 + nameSize, local + 30 + nameSize + payload.length), payload)
    directory += 46 + nameSize
  }
  assert.equal(directory, end)
  assert.equal(view.getUint32(end + 12, true), end - directoryStart)
})
