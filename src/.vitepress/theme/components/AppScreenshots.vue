<template>
  <div class="screenshot-creator">
    <header class="creator-heading">
      <div>
        <span class="eyebrow">APP STORE &amp; GOOGLE PLAY</span>
        <h1>App Screenshot Creator</h1>
      </div>
      <div class="local-badge"><span class="privacy-icon" aria-hidden="true">◈</span><div class="privacy-copy"><span>Private · on your device</span><span class="download-reminder">Download your frames before leaving or refreshing.</span></div></div>
    </header>

    <input ref="addInput" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple aria-label="Upload app screenshots" :disabled="busy" @change="addFromInput">
    <input ref="replaceInput" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Replace selected screenshot" :disabled="busy" @change="replaceFromInput">

    <section v-if="!frames.length" class="welcome" :class="{ dragging }"
      @dragover.prevent="dragging = true" @dragleave.self="dragging = false" @drop.prevent="dropFiles">
      <div class="welcome-art" aria-hidden="true">
        <div class="art-frame art-one"><span></span><i></i><b></b></div>
        <div class="art-frame art-two"><span></span><i></i><b></b></div>
        <div class="art-frame art-three"><span></span><i></i><b></b></div>
      </div>
      <h2>Turn screenshots into a story</h2>
      <p>Drop your app screenshots here. Add descriptions,<br class="desktop-break"> choose a background, and make the whole set feel connected.</p>
      <button class="button primary" type="button" :disabled="busy" @click="addInput.click()">{{ loading ? 'Opening images…' : 'Choose screenshots' }} <span aria-hidden="true">↗</span></button>
      <span class="upload-note">PNG, JPEG or WebP · up to 10 frames · 25 MB per image</span>
    </section>

    <section v-else class="studio" :aria-busy="busy">
      <fieldset class="studio-controls" :disabled="busy">
        <legend class="sr-only">Output settings</legend>
        <label class="preset-field"><span>Output size</span>
          <select v-model="presetId" @change="applyPreset">
            <option v-for="preset in OUTPUT_PRESETS" :key="preset.id" :value="preset.id">{{ preset.label }}</option>
          </select>
        </label>
        <div class="dimension-fields">
          <label><span>Width</span><input v-model.number="settings.width" aria-label="Output width" type="number" min="320" max="4096" step="1" @input="presetId = 'custom'"></label>
          <span class="dimension-times" aria-hidden="true">×</span>
          <label><span>Height</span><input v-model.number="settings.height" aria-label="Output height" type="number" min="320" max="4096" step="1" @input="presetId = 'custom'"></label>
          <button class="icon-button swap-button" type="button" aria-label="Swap width and height" title="Swap width and height" @click="swapDimensions">⇄</button>
        </div>
        <label class="format-field"><span>Format</span><select v-model="format"><option value="png">PNG</option><option value="jpg">JPEG</option></select></label>
        <div class="export-buttons">
          <button class="button secondary" type="button" :disabled="!canExport" @click="exportImages(false)">Save frame</button>
          <button class="button primary" type="button" :disabled="!canExport" @click="exportImages(true)">Download all <span class="button-count">{{ frames.length }}</span></button>
        </div>
      </fieldset>

      <div v-if="!dimensionsValid" class="notice warning" role="alert">Use whole-number dimensions from 320 to 4096 pixels, with at most 12 million pixels per frame. The preview keeps its last valid size.</div>
      <div v-if="storeNotice" class="notice warning" role="status">{{ storeNotice }}</div>

      <div class="sequence" :class="{ dragging }" @dragover.prevent="dragging = true" @dragleave.self="dragging = false" @drop.prevent="dropFiles">
        <div v-for="(frame, index) in frames" :key="frame.id" class="frame-card" :class="{ selected: selectedId === frame.id }" :style="{ '--frame-width': `${previewCssWidth}px` }" @click="selectFrame(frame)">
          <button v-if="selectedId === frame.id" class="icon-button frame-replace" type="button" aria-label="Replace selected image" title="Replace image" :disabled="busy" @click.stop="openReplace">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 16 5-4 5 5 3-3 5 4"/></svg>
          </button>
          <div v-if="selectedId === frame.id" class="reorder-buttons" role="group" :aria-label="`Reorder frame ${index + 1}`">
            <button class="icon-button" type="button" aria-label="Move selected frame left" :disabled="busy || index === 0" @click.stop="moveFrame(-1)">←</button>
            <button class="icon-button" type="button" aria-label="Move selected frame right" :disabled="busy || index === frames.length - 1" @click.stop="moveFrame(1)">→</button>
          </div>
          <button class="frame-preview" type="button" :aria-label="`Select frame ${index + 1}: ${frame.caption || frame.name}`" :aria-pressed="selectedId === frame.id" :disabled="busy">
            <canvas :ref="el => setCanvas(frame.id, el)" role="img" :aria-label="`Frame ${index + 1}. ${frame.caption || 'No description yet.'}`"></canvas>
          </button>
          <button v-if="selectedId === frame.id" class="icon-button frame-remove" type="button" :aria-label="`Remove frame ${index + 1}: ${frame.name}`" title="Remove screenshot" :disabled="busy" @click.stop="removeFrame(frame.id)">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
          </button>
          <div class="frame-meta"><span class="frame-number">{{ String(index + 1).padStart(2, '0') }}</span><span class="frame-name" :title="frame.name">{{ frame.name }}</span><span v-if="overflow[frame.id]" class="overflow-dot" title="Description does not fit" aria-label="Description does not fit">!</span></div>
        </div>
        <button class="add-frame" type="button" :disabled="busy || frames.length >= 10" @click="addInput.click()"><span aria-hidden="true">+</span>{{ loading ? 'Opening…' : 'Add screenshots' }}</button>
      </div>

      <fieldset v-if="selected" class="editing-controls" :disabled="busy">
        <legend class="sr-only">Frame and design settings</legend>
        <div class="settings-grid">
          <section class="settings-panel selected-panel">
            <div class="panel-heading"><h2>Frame {{ selectedIndex + 1 }}</h2></div>
            <label class="field"><span>Description</span><textarea v-model="selected.caption" rows="3" maxlength="500" placeholder="Make your app’s best feature the headline." :aria-describedby="overflow[selected.id] ? 'caption-help' : undefined"></textarea></label>
            <p v-if="overflow[selected.id]" id="caption-help" class="hint text-warning">Text does not fit. Shorten it, reduce text size, or increase the text area before downloading.</p>
          </section>

          <section class="settings-panel">
            <div class="panel-heading"><h2>Composition</h2><label class="checkbox-field composition-scope"><input :checked="selected.customLayout" type="checkbox" aria-label="Composition: this frame only" @change="toggleOverride('layout', $event.target.checked)"><span>This frame only</span></label></div>
            <label class="slider-field"><span>Margin <output>{{ activeLayout.margin }}%</output></span><input v-model.number="activeLayout.margin" type="range" min="0" max="20" step="1"></label>
            <label class="slider-field"><span>Text field size <output>{{ activeLayout.textArea }}%</output></span><input v-model.number="activeLayout.textArea" type="range" min="0" max="70" step="1"></label>
            <label class="slider-field"><span>Crop top (status bar) <output>{{ activeLayout.cropTop }}%</output></span><input v-model.number="activeLayout.cropTop" type="range" min="0" max="10" step="0.25"></label>
            <label class="field"><span>Text position</span><select v-model="activeLayout.textPosition"><option value="top">Top text</option><option value="bottom">Bottom text</option></select></label>
            <label class="field"><span>Screenshot decoration</span><select v-model="activeLayout.outline"><option value="none">None</option><option value="white">White outline</option><option value="dark-grey">Grey outline</option><option value="black">Black outline</option><option value="drop-shadow">Drop shadow</option></select></label>
          </section>

          <section class="settings-panel">
            <div class="panel-heading"><h2>Typography</h2><label class="checkbox-field text-scope"><input :checked="selected.customText" type="checkbox" aria-label="Typography: this frame only" @change="toggleOverride('text', $event.target.checked)"><span>This frame only</span></label></div>
            <div class="font-color-fields">
              <label class="field"><span>Font</span><select v-model="activeText.font"><option value="sans">Modern sans</option><option value="serif">Classic serif</option><option value="mono">Monospace</option></select></label>
              <label class="color-field font-color" :title="`Text color: ${activeText.color.toUpperCase()}`"><input v-model="activeText.color" type="color" aria-label="Description text color"></label>
            </div>
            <label class="slider-field"><span>Text size <output>{{ Math.round(settings.width * activeText.size / 100) || '–' }} px</output></span><input v-model.number="activeText.size" type="range" min="3" max="10" step="0.25"></label>
            <div class="paired-fields"><label class="field"><span>Weight</span><select v-model="activeText.weight"><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option></select></label><label class="field"><span>Alignment</span><select v-model="activeText.align"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div>
          </section>
          <section class="settings-panel background-panel">
          <div class="panel-heading background-heading"><h2>Background</h2><label class="checkbox-field background-scope"><input :checked="selected.customBackground" type="checkbox" aria-label="Background: this frame only" @change="toggleOverride('background', $event.target.checked)"><span>This frame only</span></label></div>
            <label class="field background-type"><select v-model="activeBackground.background" aria-label="Background type"><option value="gradient">Continuous gradient</option><option value="single-gradient">Single frame gradient</option><option value="solid">Solid color</option></select></label>
          <div class="background-settings">
            <div v-if="activeBackground.background !== 'solid'" class="gradient-controls">
              <div class="gradient-colors"><label class="color-field"><input v-model="activeGradient.start" type="color" aria-label="Gradient start color"><span>Start</span></label><span aria-hidden="true">→</span><label class="color-field"><input v-model="activeGradient.end" type="color" aria-label="Gradient end color"><span>End</span></label></div>
              <label class="slider-field gradient-direction"><span>Direction <output>{{ activeGradient.angle }}°</output></span><input v-model.number="activeGradient.angle" type="range" min="0" max="360" step="1"></label>
              <div v-for="group in gradientPresetGroups" :key="group.name" class="gradient-preset-group">
                <div class="gradient-swatches" role="group" :aria-label="`${group.name} gradient presets`"><button v-for="swatch in group.presets" :key="swatch.name" class="gradient-swatch" type="button" :title="swatch.name" :aria-label="`Use ${swatch.name} gradient`" :aria-pressed="activeGradient.start === swatch.start && activeGradient.end === swatch.end" :style="{ background: `linear-gradient(110deg, ${swatch.start}, ${swatch.end})` }" @click="setGradient(swatch)"></button></div>
              </div>
            </div>
            <div v-else class="solid-controls"><label class="color-field"><input v-model="activeBackground.color" type="color" aria-label="Frame background color"><span>{{ activeBackground.color.toUpperCase() }}</span></label></div>
          </div>
          </section>
        </div>
      </fieldset>
      <p v-if="hasOverflow" class="notice warning" role="alert">A description does not fit. Select the frame marked “!” and adjust its text or composition to enable downloads.</p>
    </section>

    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <p v-if="status" class="notice status" role="status" aria-live="polite">{{ status }}</p>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { OUTPUT_PRESETS, renderFrame, validDimensions } from './app-screenshots/render.mjs'
import { canvasJpeg, canvasPng, createZip, downloadBlob } from './app-screenshots/download.mjs'

const settings = reactive({
  width: 1080, height: 1920,
  layout: { margin: 0, textArea: 22, cropTop: 0, textPosition: 'top', outline: 'none' },
  text: { font: 'sans', size: 6, weight: '700', align: 'center', color: '#ffffff' },
  gradient: { start: '#743b9b', end: '#e68b7c', angle: 0 }
})
const gradientPresetGroups = [
  { name: 'Light', presets: [
    { name: 'Peach', start: '#f6a68a', end: '#fbd8b0' },
    { name: 'Lavender', start: '#b8a4e3', end: '#eac5dc' },
    { name: 'Sakura', start: '#f4c4d8', end: '#f8e3c6' },
    { name: 'Mint', start: '#b2e0cb', end: '#edf4c0' },
    { name: 'Butter & Periwinkle', start: '#f4dfa3', end: '#b7baf0' },
    { name: 'Apricot & Aqua', start: '#f6c3a8', end: '#a7dfe0' },
    { name: 'Rose & Pistachio', start: '#efbed2', end: '#c3dca0' }
  ] },
  { name: 'Dark', presets: [
    { name: 'Dusk', start: '#25284d', end: '#9b78bd' },
    { name: 'Twilight', start: '#312e81', end: '#be185d' },
    { name: 'Forest', start: '#153f35', end: '#70a37f' },
    { name: 'Espresso', start: '#34231d', end: '#a47764' },
    { name: 'Blue Hour', start: '#1e3a8a', end: '#7c3aed' },
    { name: 'Slate', start: '#182434', end: '#64748b' },
    { name: 'Graphite', start: '#111827', end: '#596273' }
  ] },
  { name: 'Other', presets: [
    { name: 'Orchid', start: '#743b9b', end: '#e68b7c' },
    { name: 'Ocean', start: '#123c69', end: '#39b8ad' },
    { name: 'Citrus', start: '#b94e36', end: '#edbc54' },
    { name: 'Rose Gold', start: '#c06c84', end: '#f6c5a5' },
    { name: 'Cobalt & Honey', start: '#496ca6', end: '#e2bc62' },
    { name: 'Teal & Coral', start: '#358d90', end: '#e69983' },
    { name: 'Violet & Lime', start: '#8659a6', end: '#b9ce70' }
  ] }
]
const frames = ref([])
const selectedId = ref(null)
const presetId = ref('android')
const format = ref('png')
const addInput = ref(null)
const replaceInput = ref(null)
const loading = ref(false)
const exporting = ref(false)
const dragging = ref(false)
const error = ref('')
const status = ref('')
const overflow = ref({})
const backgroundDefault = reactive({ background: 'gradient', color: '#743b9b' })
const canvasRefs = new Map()
let nextId = 0
let replacementId = null
let animationId = 0
let disposed = false

const selectedIndex = computed(() => frames.value.findIndex(frame => frame.id === selectedId.value))
const selected = computed(() => frames.value[selectedIndex.value])
const busy = computed(() => loading.value || exporting.value)
const dimensionsValid = computed(() => validDimensions(settings.width, settings.height))
const hasOverflow = computed(() => frames.value.some(frame => overflow.value[frame.id]))
const canExport = computed(() => !busy.value && dimensionsValid.value && frames.value.length > 0 && !hasOverflow.value)
const activeLayout = computed(() => selected.value?.customLayout ? selected.value.layout : settings.layout)
const activeText = computed(() => selected.value?.customText ? selected.value.text : settings.text)
const activeBackground = computed(() => selected.value?.customBackground ? selected.value : backgroundDefault)
const activeGradient = computed(() => selected.value?.customBackground ? selected.value.gradient : settings.gradient)
const previewCssWidth = computed(() => dimensionsValid.value && settings.width > settings.height ? 320 : 210)
const storeNotice = computed(() => {
  if (presetId.value === 'android') {
    return frames.value.length > 8 ? 'Google Play accepts up to 8 screenshots per device type. Export this set, then choose up to 8 for your listing.' :
      frames.value.length < 2 ? 'Google Play requires at least 2 screenshots for a store listing.' : ''
  }
  if (presetId.value === 'custom' && dimensionsValid.value) {
    return 'Custom sizes are not checked against store requirements. Confirm the dimensions for your target device before submitting.'
  }
  return ''
})

function setCanvas(id, el) {
  if (el) canvasRefs.set(id, el)
  else canvasRefs.delete(id)
}

function drawPreviews() {
  animationId = 0
  if (disposed || !dimensionsValid.value) return
  const nextOverflow = {}
  try {
    frames.value.forEach((frame, index) => {
      const canvas = canvasRefs.get(frame.id)
      if (canvas) nextOverflow[frame.id] = renderFrame(canvas, frame, index, frames.value.length, settings, previewCssWidth.value * Math.min(window.devicePixelRatio || 1, 2)).overflow
    })
    overflow.value = nextOverflow
  } catch (err) { error.value = err.message || 'Could not draw the preview.' }
}

function schedulePreview() {
  if (!disposed && !animationId) animationId = requestAnimationFrame(drawPreviews)
}

watch([frames, settings], () => { status.value = ''; schedulePreview() }, { deep: true, flush: 'post' })
watch(backgroundDefault, () => {
  frames.value.forEach(frame => {
    if (!frame.customBackground) Object.assign(frame, backgroundDefault)
  })
}, { deep: true, flush: 'sync' })
onMounted(() => {
  schedulePreview()
  window.addEventListener('beforeunload', beforeUnload)
  window.addEventListener('resize', schedulePreview)
})
onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(animationId)
  window.removeEventListener('beforeunload', beforeUnload)
  window.removeEventListener('resize', schedulePreview)
  canvasRefs.clear()
})

function beforeUnload(event) {
  if (frames.value.length) { event.preventDefault(); event.returnValue = '' }
}

function applyPreset() {
  if (presetId.value === 'custom') return
  const preset = OUTPUT_PRESETS.find(item => item.id === presetId.value)
  const landscape = settings.width > settings.height
  settings.width = landscape ? preset.height : preset.width
  settings.height = landscape ? preset.width : preset.height
}

function swapDimensions() { [settings.width, settings.height] = [settings.height, settings.width] }
function setGradient(swatch) { Object.assign(activeGradient.value, { start: swatch.start, end: swatch.end }) }
function toggleOverride(kind, enabled) {
  if (kind === 'background') {
    Object.assign(selected.value, backgroundDefault, { gradient: { ...settings.gradient }, customBackground: enabled })
    return
  }
  if (enabled) selected.value[kind] = { ...settings[kind] }
  selected.value[kind === 'layout' ? 'customLayout' : 'customText'] = enabled
}
function selectFrame(frame) {
  if (!busy.value) selectedId.value = frame.id
}
function moveFrame(direction) {
  const index = selectedIndex.value
  const target = index + direction
  if (target < 0 || target >= frames.value.length) return
  const [frame] = frames.value.splice(index, 1)
  frames.value.splice(target, 0, frame)
  nextTick(() => canvasRefs.get(frame.id)?.closest('.frame-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }))
}
function removeFrame(id) {
  if (busy.value) return
  const index = frames.value.findIndex(frame => frame.id === id)
  if (index < 0) return
  frames.value.splice(index, 1)
  if (selectedId.value === id) {
    selectedId.value = frames.value[Math.min(index, frames.value.length - 1)]?.id ?? null
  }
  error.value = ''
  nextTick(() => canvasRefs.get(selectedId.value)?.closest('.frame-preview')?.focus({ preventScroll: true }))
}
function openReplace() { replacementId = selectedId.value; replaceInput.value.click() }

async function decodeFile(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: choose a PNG, JPEG or WebP image.`)
  if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name}: images must be 25 MB or smaller.`)
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image has no dimensions.')
    if (image.naturalWidth * image.naturalHeight > 32000000) throw new Error(`${file.name}: use an image with at most 32 million pixels.`)
    return markRaw(image)
  } catch (err) {
    if (err.message.includes('32 million')) throw err
    throw new Error(`${file.name}: this image could not be opened. Try another file.`)
  } finally { URL.revokeObjectURL(url) }
}

async function addFiles(fileList) {
  if (busy.value || disposed) return
  const files = Array.from(fileList)
  if (!files.length) return
  loading.value = true
  error.value = ''
  status.value = ''
  const messages = []
  try {
    for (const file of files) {
      if (disposed) break
      if (frames.value.length >= 10) { messages.push('A set can contain up to 10 frames. Remaining files were skipped.'); break }
      try {
        const image = await decodeFile(file)
        if (disposed) break
        if (!frames.value.length && image.naturalWidth !== image.naturalHeight &&
          (settings.width > settings.height) !== (image.naturalWidth > image.naturalHeight)) swapDimensions()
        const frame = { id: ++nextId, name: file.name, image, caption: '', ...backgroundDefault,
          customLayout: false, customText: false, customBackground: false, gradient: { ...settings.gradient }, layout: { ...settings.layout }, text: { ...settings.text } }
        frames.value.push(frame)
        selectedId.value = frame.id
      } catch (err) { messages.push(err.message) }
    }
    error.value = messages.join(' ')
    await nextTick()
    schedulePreview()
  } finally { loading.value = false }
}

function addFromInput(event) { const files = Array.from(event.target.files || []); event.target.value = ''; addFiles(files) }
function dropFiles(event) { dragging.value = false; addFiles(event.dataTransfer.files) }
async function replaceFromInput(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || busy.value) return
  const frame = frames.value.find(item => item.id === replacementId)
  if (!frame) return
  loading.value = true
  error.value = ''
  try {
    const image = await decodeFile(file)
    if (!disposed) { frame.image = image; frame.name = file.name }
  } catch (err) { error.value = err.message }
  finally { loading.value = false }
}

async function exportImages(all) {
  // Flush any pending preview first so overflow checks use the latest edits.
  drawPreviews()
  if (!canExport.value) return
  exporting.value = true
  error.value = ''
  const canvas = document.createElement('canvas')
  const files = []
  try {
    const indexes = all ? frames.value.map((_, index) => index) : [selectedIndex.value]
    for (const [position, index] of indexes.entries()) {
      if (disposed) return
      status.value = `Preparing frame ${position + 1} of ${indexes.length}…`
      await new Promise(resolve => requestAnimationFrame(resolve))
      const result = renderFrame(canvas, frames.value[index], index, frames.value.length, settings)
      if (result.overflow) throw new Error(`The description in frame ${index + 1} does not fit. Adjust it before downloading.`)
      const blob = await (format.value === 'png' ? canvasPng(canvas) : canvasJpeg(canvas))
      files.push({ name: `screenshot-${String(index + 1).padStart(2, '0')}-${settings.width}x${settings.height}.${format.value}`, blob })
      // Release the full-size canvas between frames.
      canvas.width = canvas.height = 1
    }
    if (disposed) return
    if (all) downloadBlob(await createZip(files), `app-screenshots-${settings.width}x${settings.height}.zip`)
    else downloadBlob(files[0].blob, files[0].name)
    status.value = all ? '' : 'Your frame is ready. Check your downloads.'
  } catch (err) { error.value = err.message || 'Export failed. Try a smaller output size.'; status.value = '' }
  finally { exporting.value = false; canvas.width = canvas.height = 1 }
}
</script>

<style scoped>
.screenshot-creator { --ink: #292929; --muted: #737373; --line: #e5e5e5; --accent: #555555; --surface: #f5f5f5; --hover: #eeeeee; --focus: #666666; color: var(--ink); margin: 1rem 0 3rem; }
.creator-heading { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; margin: 0 0 1.6rem; }
.eyebrow { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.13em; color: var(--accent); }
.creator-heading h1 { margin: 0.45rem 0 0.6rem; font-size: clamp(1.65rem, 3vw, 2.3rem); line-height: 1.2; letter-spacing: -0.045em; border: 0; }
.local-badge { display: flex; gap: 0.55rem; align-items: center; max-width: 350px; font-size: 0.7rem; line-height: 1.5; color: #606060; border: 1px solid var(--line); border-radius: 10px; padding: 0.55rem 0.8rem; }
.privacy-icon { color: var(--accent); font-size: 1rem; }
.privacy-copy { display: flex; flex-direction: column; gap: 0.1rem; }
.download-reminder { color: var(--muted); font-size: 0.65rem; }
.welcome { position: relative; text-align: center; padding: 3rem 1.5rem; border: 1px dashed #c5c5c5; border-radius: 16px; background: radial-gradient(ellipse at 50% 20%, #ededed, #fafafa 70%); transition: border-color 0.15s, background 0.15s; }
.welcome.dragging, .sequence.dragging { background: #e8e8e8; outline: 2px solid var(--accent); outline-offset: -3px; }
.welcome h2 { margin: 1.75rem 0 0.65rem; padding: 0; border: 0; font-size: 1.4rem; letter-spacing: -0.035em; }
.welcome p { color: var(--muted); font-size: 0.9rem; line-height: 1.7; margin: 0 0 1.4rem; }
.upload-note { display: block; margin-top: 0.9rem; color: var(--muted); font-size: 0.7rem; }
.welcome-art { display: flex; justify-content: center; align-items: center; height: 180px; padding-top: 8px; }
.art-frame { position: relative; width: 96px; height: 168px; border-radius: 8px; box-shadow: 0 10px 22px #00000026; background: #737373; display: flex; align-items: center; flex-direction: column; padding-top: 20px; overflow: hidden; }
.art-frame span, .art-frame i { display: block; height: 4px; border-radius: 3px; background: #ffffffdf; width: 52px; margin-bottom: 5px; }
.art-frame i { width: 37px; opacity: 0.65; }
.art-frame b { width: 69px; height: 112px; margin-top: 12px; border-radius: 6px 6px 0 0; background: linear-gradient(#ffffffed 0 20%, #e6e6e6 20% 24%, #ffffffed 24% 45%, #e6e6e6 45% 49%, #ffffffed 49%); box-shadow: 0 3px 10px #00000033; }
.art-one { transform: rotate(-10deg) translate(8px, 4px); background: linear-gradient(120deg, #536bc6, #9464b6); }
.art-two { z-index: 1; transform: translateY(-8px); background: linear-gradient(120deg, #743b9b, #e68b7c); }
.art-three { transform: rotate(10deg) translate(-8px, 4px); background: linear-gradient(120deg, #e68b7c, #f4c28e); }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: 0.45; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.button { display: inline-flex; justify-content: center; align-items: center; gap: 0.7rem; border-radius: 7px; border: 1px solid transparent; min-height: 39px; padding: 0.55rem 0.9rem; font-size: 0.78rem; font-weight: 600; white-space: nowrap; line-height: 1.4; }
.primary { background: var(--accent); color: white; box-shadow: 0 2px 3px #00000012; }
.primary:hover:not(:disabled) { background: #404040; }
.secondary { background: white; border-color: #d4d4d4; color: var(--ink); }
.secondary:hover:not(:disabled) { background: var(--hover); }
.button-count { border-left: 1px solid #ffffff55; padding-left: 0.65rem; font-size: 0.72rem; }
.studio { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff; }
fieldset { padding: 0; margin: 0; min-width: 0; border: 0; }
.studio-controls { display: flex; gap: 0.8rem; align-items: flex-end; flex-wrap: wrap; padding: 1rem 1.15rem; border-bottom: 1px solid var(--line); }
label > span, .field > span { display: block; font-size: 0.7rem; font-weight: 600; margin-bottom: 0.35rem; }
input[type=number], select, textarea { width: 100%; border: 1px solid #d4d4d4; border-radius: 6px; background-color: #fff; color: var(--ink); min-height: 37px; padding: 0.4rem 0.55rem; font-size: 0.78rem; line-height: 1.5; }
select { padding-right: 1.3rem; }
.preset-field { width: 180px; }
.dimension-fields { display: flex; align-items: flex-end; gap: 0.4rem; }
.dimension-fields label { width: 76px; }
.dimension-times { padding-bottom: 8px; color: #969696; font-size: 0.8rem; }
.icon-button { border: 1px solid var(--line); width: 30px; height: 30px; border-radius: 5px; font-size: 1rem; background: #fff; display: inline-flex; justify-content: center; align-items: center; }
.icon-button:hover:not(:disabled) { background: var(--hover); }
.swap-button { margin: 0 0 3px 2px; }
.format-field { width: 78px; }
.export-buttons { margin-left: auto; display: flex; gap: 0.5rem; }
.sequence { display: flex; align-items: flex-start; overflow-x: auto; gap: 14px; padding: 48px 1.15rem 1rem; border-bottom: 1px solid var(--line); background: var(--surface); scrollbar-width: thin; scrollbar-color: #bdbdbd var(--surface); }
.frame-card { position: relative; flex: 0 0 var(--frame-width); min-width: 0; cursor: pointer; }
.frame-preview { display: block; width: 100%; padding: 0; border-radius: 3px; outline: 2px solid transparent; outline-offset: 3px; overflow: hidden; box-shadow: 0 3px 8px #00000014; transition: outline-color 0.15s; }
.selected .frame-preview { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent), 0 3px 8px #00000014; }
.frame-preview:focus-visible { outline-width: 3px; outline-color: var(--focus); }
.frame-preview canvas { display: block; width: 100%; height: auto; }
.frame-remove { position: absolute; top: -42px; right: 0; color: #595959; }
.frame-remove svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.frame-remove:hover:not(:disabled) { background: var(--hover); border-color: #bdbdbd; color: var(--ink); }
.frame-meta { display: flex; align-items: center; gap: 0.55rem; padding-top: 0.75rem; font-size: 0.65rem; color: var(--muted); }
.frame-number { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ink); }
.frame-name { white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.overflow-dot { display: grid; place-items: center; flex: 0 0 20px; width: 20px; height: 20px; margin-left: auto; padding: 0; border-radius: 50%; background: #d32f2f; color: #fff; font-size: 12px; line-height: 1; font-weight: 700; }
.add-frame { flex: 0 0 125px; align-self: center; display: flex; align-items: center; flex-direction: column; gap: 0.65rem; color: var(--muted); font-size: 0.75rem; padding: 1.5rem 0.5rem; border: 1px dashed #d0d0d0; border-radius: 7px; }
.add-frame span { font-size: 1.6rem; line-height: 1; color: var(--accent); }
.add-frame:hover:not(:disabled) { border-color: var(--accent); background: var(--hover); }
.settings-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.settings-panel { min-width: 0; padding: 1rem 0.8rem 1.1rem; }
.settings-panel + .settings-panel { border-left: 1px solid var(--line); }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.3rem; margin-bottom: 1rem; min-height: 30px; }
.settings-panel h2 { margin: 0; padding: 0; border: 0; font-size: 0.8rem; letter-spacing: -0.02em; }
.frame-replace { position: absolute; top: -42px; left: 0; }
.frame-replace svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.reorder-buttons { position: absolute; top: -42px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; }
.field { display: block; margin-bottom: 0.8rem; }
textarea { resize: vertical; min-height: 92px; }
.hint { font-size: 0.68rem; color: var(--muted); line-height: 1.6; margin: 0.4rem 0 0.85rem; }
.color-field { display: inline-flex; align-items: center; gap: 0.55rem; font-size: 0.7rem; }
.color-field input { -webkit-appearance: none; appearance: none; width: 32px; height: 30px; padding: 2px; border: 1px solid #d4d4d4; border-radius: 5px; background: white; cursor: pointer; }
.color-field input::-webkit-color-swatch-wrapper { padding: 0; }
.color-field input::-webkit-color-swatch { border: 0; border-radius: 3px; }
.color-field > span { margin: 0; font-weight: 500; font-size: 0.7rem; }
.checkbox-field { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 1.15rem; }
.checkbox-field input { accent-color: var(--accent); }
.checkbox-field > span { margin: 0; font-weight: 400; font-size: 0.65rem; }
.panel-heading .checkbox-field { margin: 0; flex-shrink: 0; white-space: nowrap; }
.slider-field { display: block; margin: 0.8rem 0 1rem; }
.slider-field > span { display: flex; justify-content: space-between; gap: 0.3rem; align-items: baseline; font-size: 0.68rem; }
output { font-size: 0.65rem; font-weight: 500; color: var(--muted); white-space: nowrap; }
input[type=range] { display: block; width: 100%; accent-color: var(--accent); cursor: pointer; margin: 0.45rem 0; height: 15px; }
.paired-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.font-color-fields { display: grid; grid-template-columns: minmax(0, 1fr) 32px; gap: 0.6rem; align-items: end; margin-bottom: 0.8rem; }
.font-color-fields .field { min-width: 0; margin-bottom: 0; }
.font-color input { height: 37px; }
.background-settings { min-width: 0; }
.gradient-controls { display: flex; flex-direction: column; gap: 0.85rem; align-items: stretch; }
.gradient-colors { display: flex; align-items: center; gap: 0.65rem; }
.gradient-colors > span { color: #adadad; }
.gradient-direction { width: 100%; margin: 0; }
.gradient-swatches { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; max-width: 218px; }
.gradient-swatches button { width: 100%; aspect-ratio: 1; border-radius: 50%; box-shadow: inset 0 0 0 1px #0000000d; }
.gradient-swatches button[aria-pressed=true] { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--accent); }
.notice { font-size: 0.75rem; line-height: 1.6; padding: 0.7rem 1rem; border-radius: 6px; margin: 0.8rem 0; }
.studio > .notice { border-radius: 0; margin: 0; }
.warning { background: #fff6e8; color: #885019; }
.text-warning { color: #9a4a0b; }
.error { background: #fff0f1; color: #a02d3a; }
.status { background: #f1f7f3; color: #386448; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 959px) {
  .creator-heading { align-items: flex-start; }
  .local-badge { font-size: 0.6rem; }
  .studio-controls { gap: 0.7rem; }
  .export-buttons { margin-left: 0; flex: 1 1 auto; justify-content: flex-end; }
  .settings-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .settings-panel:nth-child(odd) { border-left: 0; }
  .settings-panel:nth-child(n+3) { border-top: 1px solid var(--line); }
}
@media (max-width: 599px) {
  .creator-heading { display: block; }
  .local-badge { display: inline-flex; max-width: 100%; margin-top: 0.8rem; }
  .welcome { padding: 2rem 1rem; }
  .welcome h2 { font-size: 1.2rem; }
  .welcome p { font-size: 0.8rem; }
  .desktop-break { display: none; }
  .studio-controls { padding: 0.85rem; }
  .preset-field { flex: 1 1 150px; }
  .dimension-fields { order: 2; flex: 1 1 100%; }
  .dimension-fields label { flex: 1; }
  .export-buttons { order: 3; flex: 1 1 100%; justify-content: stretch; }
  .export-buttons .button { flex: 1; padding-left: 0.5rem; padding-right: 0.5rem; }
  .sequence { padding-left: 1rem; padding-right: 1rem; }
  .settings-grid { grid-template-columns: 1fr; }
  .settings-panel { padding: 1rem; }
  .settings-panel + .settings-panel { border-left: 0; border-top: 1px solid var(--line); }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; transition: none !important; } }
</style>
