<template>
  <div class="color-palette-tool">
    <div class="editor-layout">
      <section class="picker-panel">
        <div class="picker-head">
          <label class="color-swatch-field" title="Pick a color">
            <input
              :value="baseHex"
              type="color"
              aria-label="Choose the base color with the system color picker"
              @input="applyHex($event.target.value)"
            >
          </label>
          <label class="hex-field">
            <span>Base color</span>
            <input
              :value="hexInput"
              type="text"
              spellcheck="false"
              autocapitalize="off"
              maxlength="7"
              aria-label="Base color hex value"
              @input="hexInput = $event.target.value"
              @change="applyHexInput"
              @keyup.enter="applyHexInput"
            >
          </label>
        </div>

        <div ref="wheelStage" class="wheel-stage">
          <canvas
            ref="wheelCanvas"
            class="wheel-canvas"
            tabindex="0"
            role="img"
            :aria-label="wheelAriaLabel"
            @pointerdown="onWheelPointerDown"
            @pointermove="onWheelPointerMove"
            @pointerup="onWheelPointerUp"
            @pointercancel="onWheelPointerUp"
            @keydown="onWheelKeydown"
          />
          <span
            v-for="marker in wheelMarkers"
            :key="marker.slug"
            class="wheel-marker"
            :class="{ 'is-base': marker.isBase }"
            :style="{ left: `${marker.x}%`, top: `${marker.y}%`, background: marker.hex }"
            :title="`${marker.label} · ${marker.hex}`"
          />
        </div>

        <div class="setting-group wheel-model-group">
          <div class="chip-row" role="group" aria-label="Color wheel model">
            <button
              class="chip"
              type="button"
              :class="{ 'is-active': wheelModel === 'ryb' }"
              :aria-pressed="wheelModel === 'ryb' ? 'true' : 'false'"
              @click="wheelModel = 'ryb'"
            >
              RYB · traditional
            </button>
            <button
              class="chip"
              type="button"
              :class="{ 'is-active': wheelModel === 'rgb' }"
              :aria-pressed="wheelModel === 'rgb' ? 'true' : 'false'"
              @click="wheelModel = 'rgb'"
            >
              RGB · digital
            </button>
          </div>
          <p class="hint">{{ wheelHint }}</p>
        </div>

        <div class="sliders">
          <div class="slider">
            <span class="slider-label">
              <span>Hue</span>
              <span>{{ Math.round(hue) }}°</span>
            </span>
            <span class="slider-track" :style="{ backgroundImage: hueGradient }">
              <input
                :value="Math.round(hue)"
                type="range"
                min="0"
                max="360"
                step="1"
                aria-label="Hue in degrees"
                @input="hue = Number($event.target.value)"
              >
            </span>
          </div>

          <div class="slider">
            <span class="slider-label">
              <span>Saturation</span>
              <span>{{ Math.round(saturation) }}%</span>
            </span>
            <span class="slider-track" :style="{ backgroundImage: saturationGradient }">
              <input
                :value="Math.round(saturation)"
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Saturation percentage"
                @input="saturation = Number($event.target.value)"
              >
            </span>
          </div>

          <div class="slider">
            <span class="slider-label">
              <span>Value</span>
              <span>{{ Math.round(value) }}%</span>
            </span>
            <span class="slider-track" :style="{ backgroundImage: valueGradient }">
              <input
                :value="Math.round(value)"
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Value, or brightness, percentage"
                @input="value = Number($event.target.value)"
              >
            </span>
          </div>
        </div>

        <div class="contrast-row">
          <span class="contrast-item">
            <span class="contrast-chip" :style="{ background: baseHex, color: '#ffffff' }">Aa</span>
            <span>{{ contrastWithWhite.toFixed(2) }}:1 on white text</span>
          </span>
          <span class="contrast-item">
            <span class="contrast-chip" :style="{ background: baseHex, color: '#000000' }">Aa</span>
            <span>{{ contrastWithBlack.toFixed(2) }}:1 on black text</span>
          </span>
        </div>
      </section>

      <aside class="scheme-panel">
        <div class="setting-group">
          <span class="setting-heading">Harmony</span>
          <div class="chip-row" role="group" aria-label="Color harmony scheme">
            <button
              v-for="option in schemes"
              :key="option.key"
              class="chip"
              type="button"
              :class="{ 'is-active': option.key === scheme }"
              :aria-pressed="option.key === scheme ? 'true' : 'false'"
              @click="scheme = option.key"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <p class="scheme-description">{{ activeScheme.description }}</p>

        <div class="palette" aria-label="Generated color palette">
          <div class="palette-headers">
            <div v-for="role in palette" :key="`${role.slug}-heading`" class="role-heading">
              <span class="role-name">{{ role.label }}</span>
              <span class="role-offset">{{ role.offsetLabel }}</span>
            </div>
          </div>
          <div class="palette-columns">
            <div v-for="role in palette" :key="`${role.slug}-swatches`" class="role-swatches">
              <button
                v-for="swatch in role.swatches"
                :key="swatch.id"
                class="swatch"
                type="button"
                :class="{ 'is-base': swatch.isBase }"
                :style="{ background: swatch.hex, color: swatch.textColor }"
                :title="`Copy ${swatch.hex}`"
                @click="copyText(swatch.id, swatch.hex)"
              >
                <span class="swatch-level">{{ swatch.key }}</span>
                <span class="swatch-hex">{{ copiedKey === swatch.id ? 'Copied' : swatch.hex }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="export-actions">
          <span class="setting-heading">Export</span>
          <button class="text-button" type="button" @click="copyText('hex', hexListText)">Copy hex list</button>
          <button class="text-button" type="button" @click="copyText('css', cssText)">Copy CSS variables</button>
          <button class="text-button" type="button" @click="copyText('json', jsonText)">Copy JSON</button>
          <button class="primary-button" type="button" @click="downloadPalettePng">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/>
            </svg>
            Save PNG
          </button>
        </div>
      </aside>
    </div>

    <section
      class="preview"
      :style="{ background: previewTheme.surface, color: previewTheme.text, borderColor: previewTheme.line }"
      aria-label="Palette preview"
    >
      <div class="preview-copy">
        <span class="preview-eyebrow" :style="{ color: previewTheme.accent }">{{ activeScheme.label }}</span>
        <h3 :style="{ color: previewTheme.heading }">Every palette needs a place to sit</h3>
        <p>
          The base color carries the surface and the text, and the harmony color earns attention because
          nothing else competes for it.
        </p>
        <div class="preview-buttons">
          <span class="preview-button" :style="{ background: previewTheme.primary, color: previewTheme.primaryText }">
            Primary action
          </span>
          <span class="preview-button is-ghost" :style="{ borderColor: previewTheme.accent, color: previewTheme.accent }">
            Accent
          </span>
        </div>
      </div>
      <div class="preview-card" :style="{ background: previewTheme.card, borderColor: previewTheme.line }">
        <span class="preview-bar" :style="{ background: previewTheme.primary, width: '82%' }" />
        <span class="preview-bar" :style="{ background: previewTheme.accent, width: '58%' }" />
        <span class="preview-bar" :style="{ background: previewTheme.muted, width: '34%' }" />
      </div>
    </section>

    <p v-if="message" class="status-message" :class="{ error: messageIsError }" role="status">{{ message }}</p>
  </div>
</template>

<script>
const LEVELS = [
  { key: '100', lighten: 0.68, saturate: 0.86 },
  { key: '300', lighten: 0.36, saturate: 0.94 },
  { key: '500', lighten: 0, saturate: 1 },
  { key: '700', darken: 0.3, saturate: 1.06 },
  { key: '900', darken: 0.56, saturate: 1.12 }
]

const SCHEMES = [
  {
    key: 'complementary',
    label: 'Complementary',
    description: 'The base hue plus the hue directly opposite it on the wheel. This is the strongest contrast two hues can make, so it works best with one color dominant and the complement held back for accents.',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Complement', offset: 180 }
    ]
  },
  {
    key: 'split',
    label: 'Split complementary',
    description: 'Rather than the exact opposite, the two hues either side of it. Keeps almost all of the contrast of a complementary pair with much less tension, which makes it the most forgiving high-contrast scheme.',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Split A', offset: 150 },
      { label: 'Split B', offset: 210 }
    ]
  },
  {
    key: 'triadic',
    label: 'Triadic',
    description: 'Three hues spaced evenly around the wheel. Vivid and balanced, but let one hue lead and use the other two sparingly or the result reads as noise.',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Triad A', offset: 120 },
      { label: 'Triad B', offset: 240 }
    ]
  },
  {
    key: 'tetradic',
    label: 'Tetradic',
    description: 'Two complementary pairs: the base and its complement, plus a second pair one step around the wheel. Rich, and it needs a clearly dominant color plus plenty of neutral space.',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Complement', offset: 180 },
      { label: 'Pair B', offset: 60 },
      { label: 'Pair B complement', offset: 240 }
    ]
  },
  {
    key: 'analogous',
    label: 'Analogous',
    description: 'Neighbouring hues. Calm and cohesive with no complementary contrast at all, so reach for a tint or a shade when you need emphasis.',
    roles: [
      { label: 'Analogous A', offset: -30 },
      { label: 'Base', offset: 0 },
      { label: 'Analogous B', offset: 30 }
    ]
  },
  {
    key: 'monochromatic',
    label: 'Monochromatic',
    description: 'One hue across five levels of lightness. The safest scheme there is, and a good starting point before you add a single complementary accent.',
    roles: [
      { label: 'Base', offset: 0 }
    ]
  }
]

// Anchor pairs of [traditional RYB wheel angle, RGB hue]. Artists' color theory
// puts green opposite red and orange opposite blue, which the RGB hue circle does
// not: there, red sits opposite cyan. Interpolating between these anchors maps one
// wheel onto the other so complementary offsets land where a painter expects them.
const WHEEL_ANCHORS = [
  [0, 0],
  [60, 30],
  [120, 60],
  [180, 120],
  [240, 240],
  [300, 280],
  [360, 360]
]

function mod360 (angle) {
  return ((angle % 360) + 360) % 360
}

function clamp (input, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, input))
}

function interpolateWheel (angle, fromIndex, toIndex) {
  const input = mod360(angle)
  for (let index = 1; index < WHEEL_ANCHORS.length; index++) {
    const previous = WHEEL_ANCHORS[index - 1]
    const next = WHEEL_ANCHORS[index]
    if (input <= next[fromIndex]) {
      const span = next[fromIndex] - previous[fromIndex]
      const ratio = span === 0 ? 0 : (input - previous[fromIndex]) / span
      return previous[toIndex] + (next[toIndex] - previous[toIndex]) * ratio
    }
  }
  return input
}

function rgbHueToWheelAngle (hue) {
  return interpolateWheel(hue, 1, 0)
}

function wheelAngleToRgbHue (angle) {
  return interpolateWheel(angle, 0, 1)
}

function hsvToRgb (hue, saturation, value) {
  const s = clamp(saturation, 0, 100) / 100
  const v = clamp(value, 0, 100) / 100
  const chroma = v * s
  const sector = mod360(hue) / 60
  const secondary = chroma * (1 - Math.abs(sector % 2 - 1))
  const base = v - chroma
  let channels
  if (sector < 1) channels = [chroma, secondary, 0]
  else if (sector < 2) channels = [secondary, chroma, 0]
  else if (sector < 3) channels = [0, chroma, secondary]
  else if (sector < 4) channels = [0, secondary, chroma]
  else if (sector < 5) channels = [secondary, 0, chroma]
  else channels = [chroma, 0, secondary]
  return {
    r: Math.round((channels[0] + base) * 255),
    g: Math.round((channels[1] + base) * 255),
    b: Math.round((channels[2] + base) * 255)
  }
}

function rgbToHsv (rgb) {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const maximum = Math.max(r, g, b)
  const minimum = Math.min(r, g, b)
  const chroma = maximum - minimum
  let hue = 0
  if (chroma > 0) {
    if (maximum === r) hue = (g - b) / chroma * 60
    else if (maximum === g) hue = (b - r) / chroma * 60 + 120
    else hue = (r - g) / chroma * 60 + 240
  }
  return {
    h: mod360(hue),
    s: maximum === 0 ? 0 : chroma / maximum * 100,
    v: maximum * 100
  }
}

function hsvToHsl (saturation, value) {
  const s = clamp(saturation, 0, 100) / 100
  const v = clamp(value, 0, 100) / 100
  const lightness = v * (1 - s / 2)
  const saturationL = lightness === 0 || lightness === 1
    ? 0
    : (v - lightness) / Math.min(lightness, 1 - lightness)
  return { s: saturationL * 100, l: lightness * 100 }
}

function hslToHsv (saturation, lightness) {
  const s = clamp(saturation, 0, 100) / 100
  const l = clamp(lightness, 0, 100) / 100
  const value = l + s * Math.min(l, 1 - l)
  return { s: value === 0 ? 0 : 2 * (1 - l / value) * 100, v: value * 100 }
}

function rgbToHex (rgb) {
  const channel = input => clamp(Math.round(input), 0, 255).toString(16).padStart(2, '0')
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`
}

function hexToRgb (text) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(text).trim())
  if (!match) return null
  const digits = match[1]
  const expanded = digits.length === 3
    ? digits.split('').map(digit => digit + digit).join('')
    : digits
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16)
  }
}

function relativeLuminance (rgb) {
  const channel = input => {
    const ratio = input / 255
    return ratio <= 0.03928 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

function contrastRatio (first, second) {
  const a = relativeLuminance(first)
  const b = relativeLuminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function readableTextColor (rgb) {
  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 17, g: 17, b: 17 }
  return contrastRatio(rgb, white) >= contrastRatio(rgb, black) ? '#ffffff' : '#111111'
}

function rampColor (hue, saturation, value, level) {
  const base = hsvToHsl(saturation, value)
  const lightness = level.lighten
    ? base.l + (100 - base.l) * level.lighten
    : base.l * (1 - (level.darken || 0))
  const adjusted = hslToHsv(clamp(base.s * level.saturate, 0, 100), clamp(lightness, 0, 100))
  return hsvToRgb(hue, adjusted.s, adjusted.v)
}

function slugify (label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default {
  name: 'ColorPalette',

  data () {
    return {
      hue: 268,
      saturation: 74,
      value: 62,
      scheme: 'complementary',
      wheelModel: 'ryb',
      // Filled in by the immediate baseHex watcher, before the first render.
      hexInput: '',
      copiedKey: '',
      copyResetHandle: null,
      message: '',
      messageIsError: false,
      resizeObserver: null,
      wheelDrawHandle: null,
      wheelPointerId: null
    }
  },

  computed: {
    schemes () {
      return SCHEMES
    },

    activeScheme () {
      return SCHEMES.find(option => option.key === this.scheme) || SCHEMES[0]
    },

    baseRgb () {
      return hsvToRgb(this.hue, this.saturation, this.value)
    },

    baseHex () {
      return rgbToHex(this.baseRgb)
    },

    palette () {
      return this.activeScheme.roles.map(role => {
        const hue = this.harmonyHue(role.offset)
        const slug = slugify(role.label)
        const swatches = LEVELS.map(level => {
          const rgb = rampColor(hue, this.saturation, this.value, level)
          return {
            key: level.key,
            id: `${slug}-${level.key}`,
            name: `--${slug}-${level.key}`,
            hex: rgbToHex(rgb),
            textColor: readableTextColor(rgb),
            isBase: role.offset === 0 && level.key === '500'
          }
        })
        return {
          label: role.label,
          slug,
          offset: role.offset,
          offsetLabel: role.offset === 0 ? 'base hue' : `${role.offset > 0 ? '+' : '−'}${Math.abs(role.offset)}°`,
          hue,
          swatches
        }
      })
    },

    wheelMarkers () {
      return this.palette.map(role => {
        const angle = this.wheelModel === 'ryb'
          ? rgbHueToWheelAngle(role.hue)
          : role.hue
        const radians = angle * Math.PI / 180
        const radius = clamp(this.saturation, 0, 100) / 100 * 50
        return {
          slug: role.slug,
          label: role.label,
          hex: role.swatches.find(swatch => swatch.key === '500').hex,
          isBase: role.offset === 0,
          x: 50 + Math.sin(radians) * radius,
          y: 50 - Math.cos(radians) * radius
        }
      })
    },

    hueGradient () {
      const stops = []
      for (let hue = 0; hue <= 360; hue += 30) {
        stops.push(rgbToHex(hsvToRgb(hue, this.saturation, this.value)))
      }
      return `linear-gradient(90deg, ${stops.join(', ')})`
    },

    saturationGradient () {
      const start = rgbToHex(hsvToRgb(this.hue, 0, this.value))
      const end = rgbToHex(hsvToRgb(this.hue, 100, this.value))
      return `linear-gradient(90deg, ${start}, ${end})`
    },

    valueGradient () {
      const end = rgbToHex(hsvToRgb(this.hue, this.saturation, 100))
      return `linear-gradient(90deg, #000000, ${end})`
    },

    contrastWithWhite () {
      return contrastRatio(this.baseRgb, { r: 255, g: 255, b: 255 })
    },

    contrastWithBlack () {
      return contrastRatio(this.baseRgb, { r: 0, g: 0, b: 0 })
    },

    wheelHint () {
      return this.wheelModel === 'ryb'
        ? 'Complements are taken on the traditional red-yellow-blue wheel, so red pairs with green and blue pairs with orange.'
        : 'Complements are taken on the RGB hue circle used by CSS and screens, so red pairs with cyan and blue pairs with yellow.'
    },

    wheelAriaLabel () {
      const wheel = this.wheelModel === 'ryb' ? 'traditional RYB' : 'digital RGB'
      return `Interactive ${wheel} color wheel. The base color is ${this.baseHex} at hue ` +
        `${Math.round(this.hue)} degrees and ${Math.round(this.saturation)} percent saturation. ` +
        'Use the left and right arrow keys to change hue and the up and down arrow keys to change saturation.'
    },

    previewTheme () {
      const base = this.swatchesBySlugKey(this.palette[0])
      const accentRole = this.palette.length > 1
        ? this.palette[this.palette.length - 1]
        : this.palette[0]
      const accent = this.swatchesBySlugKey(accentRole)
      return {
        surface: base['100'],
        card: '#ffffff',
        line: base['300'],
        heading: base['900'],
        text: base['700'],
        muted: base['300'],
        primary: base['500'],
        primaryText: readableTextColor(hexToRgb(base['500'])),
        accent: accent['700']
      }
    },

    hexListText () {
      return this.palette
        .map(role => `${role.label}: ${role.swatches.map(swatch => swatch.hex).join(' ')}`)
        .join('\n')
    },

    cssText () {
      const lines = [`/* ${this.activeScheme.label} palette from ${this.baseHex} */`, ':root {']
      for (const role of this.palette) {
        for (const swatch of role.swatches) {
          lines.push(`  ${swatch.name}: ${swatch.hex};`)
        }
      }
      lines.push('}')
      return lines.join('\n')
    },

    jsonText () {
      return JSON.stringify({
        base: this.baseHex,
        hsv: {
          h: Math.round(this.hue),
          s: Math.round(this.saturation),
          v: Math.round(this.value)
        },
        scheme: this.activeScheme.key,
        wheel: this.wheelModel,
        roles: this.palette.map(role => ({
          name: role.label,
          hueOffset: role.offset,
          hue: Math.round(role.hue),
          colors: role.swatches.reduce((colors, swatch) => {
            colors[swatch.key] = swatch.hex
            return colors
          }, {})
        }))
      }, null, 2)
    }
  },

  watch: {
    baseHex: {
      immediate: true,
      handler (hex) {
        this.hexInput = hex
      }
    },

    value () {
      this.scheduleWheelDraw()
    },

    wheelModel () {
      this.scheduleWheelDraw()
    }
  },

  mounted () {
    this.setupWheelLayout()
  },

  beforeUnmount () {
    if (this.copyResetHandle) clearTimeout(this.copyResetHandle)
    if (this.wheelDrawHandle) cancelAnimationFrame(this.wheelDrawHandle)
    if (this.resizeObserver) this.resizeObserver.disconnect()
    window.removeEventListener('resize', this.layoutWheel)
  },

  methods: {
    harmonyHue (offset) {
      if (this.wheelModel === 'rgb') return mod360(this.hue + offset)
      return mod360(wheelAngleToRgbHue(mod360(rgbHueToWheelAngle(this.hue) + offset)))
    },

    swatchesBySlugKey (role) {
      return role.swatches.reduce((colors, swatch) => {
        colors[swatch.key] = swatch.hex
        return colors
      }, {})
    },

    applyHexInput () {
      if (!this.applyHex(this.hexInput)) {
        this.hexInput = this.baseHex
        this.setMessage('Enter a hex color such as #4a4a4a or #444.', true)
        return
      }
      // Shorthand and uppercase input round-trips to the same color, so the
      // baseHex watcher would not fire to normalise the field on its own.
      this.hexInput = this.baseHex
      this.clearMessage()
    },

    applyHex (text) {
      const rgb = hexToRgb(text)
      if (!rgb) return false
      const hsv = rgbToHsv(rgb)
      // A neutral has no meaningful hue, so keep the current one rather than
      // snapping the wheel and every harmony marker back to red.
      if (hsv.s > 0) this.hue = hsv.h
      this.saturation = hsv.s
      this.value = hsv.v
      return true
    },

    setupWheelLayout () {
      this.layoutWheel()
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.layoutWheel)
        if (this.$refs.wheelStage) this.resizeObserver.observe(this.$refs.wheelStage)
      } else {
        window.addEventListener('resize', this.layoutWheel)
      }
    },

    layoutWheel () {
      const stage = this.$refs.wheelStage
      const canvas = this.$refs.wheelCanvas
      if (!stage || !canvas) return
      const size = Math.max(160, Math.round(stage.clientWidth))
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      canvas.width = Math.round(size * pixelRatio)
      canvas.height = Math.round(size * pixelRatio)
      canvas._pixelRatio = pixelRatio
      this.drawWheel()
    },

    scheduleWheelDraw () {
      if (typeof requestAnimationFrame === 'undefined') return
      if (this.wheelDrawHandle) return
      this.wheelDrawHandle = requestAnimationFrame(() => {
        this.wheelDrawHandle = null
        this.drawWheel()
      })
    },

    drawWheel () {
      const canvas = this.$refs.wheelCanvas
      if (!canvas || !canvas.width) return
      const size = canvas.width
      const context = canvas.getContext('2d')
      const image = context.createImageData(size, size)
      const data = image.data
      const radius = size / 2
      const feather = Math.max(1, canvas._pixelRatio || 1)
      const isTraditional = this.wheelModel === 'ryb'
      const value = this.value

      for (let y = 0; y < size; y++) {
        const dy = y + 0.5 - radius
        for (let x = 0; x < size; x++) {
          const dx = x + 0.5 - radius
          const distance = Math.sqrt(dx * dx + dy * dy)
          const index = (y * size + x) * 4
          if (distance > radius) {
            data[index + 3] = 0
            continue
          }
          const angle = mod360(Math.atan2(dx, -dy) * 180 / Math.PI)
          const hue = isTraditional ? wheelAngleToRgbHue(angle) : angle
          const { r, g, b } = hsvToRgb(hue, distance / radius * 100, value)
          data[index] = r
          data[index + 1] = g
          data[index + 2] = b
          data[index + 3] = distance > radius - feather
            ? Math.round(clamp((radius - distance) / feather, 0, 1) * 255)
            : 255
        }
      }

      context.putImageData(image, 0, 0)
    },

    selectFromWheel (event) {
      const canvas = this.$refs.wheelCanvas
      if (!canvas) return
      const bounds = canvas.getBoundingClientRect()
      const radius = bounds.width / 2
      if (radius <= 0) return
      const dx = event.clientX - bounds.left - radius
      const dy = event.clientY - bounds.top - radius
      const distance = Math.sqrt(dx * dx + dy * dy)
      const angle = mod360(Math.atan2(dx, -dy) * 180 / Math.PI)
      this.hue = this.wheelModel === 'ryb' ? wheelAngleToRgbHue(angle) : angle
      this.saturation = clamp(distance / radius * 100, 0, 100)
      this.clearMessage()
    },

    onWheelPointerDown (event) {
      const canvas = this.$refs.wheelCanvas
      this.wheelPointerId = event.pointerId
      if (canvas && canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId)
      if (canvas) canvas.focus()
      this.selectFromWheel(event)
    },

    onWheelPointerMove (event) {
      if (this.wheelPointerId !== event.pointerId) return
      this.selectFromWheel(event)
    },

    onWheelPointerUp (event) {
      if (this.wheelPointerId !== event.pointerId) return
      const canvas = this.$refs.wheelCanvas
      if (canvas && canvas.releasePointerCapture) {
        try {
          canvas.releasePointerCapture(event.pointerId)
        } catch (error) {
          // The pointer was already released by the browser.
        }
      }
      this.wheelPointerId = null
    },

    onWheelKeydown (event) {
      const step = event.shiftKey ? 10 : 2
      if (event.key === 'ArrowLeft') this.hue = mod360(this.hue - step)
      else if (event.key === 'ArrowRight') this.hue = mod360(this.hue + step)
      else if (event.key === 'ArrowUp') this.saturation = clamp(this.saturation + step, 0, 100)
      else if (event.key === 'ArrowDown') this.saturation = clamp(this.saturation - step, 0, 100)
      else return
      event.preventDefault()
    },

    async copyText (key, text) {
      const copied = await this.writeToClipboard(text)
      if (!copied) {
        this.setMessage('Your browser blocked clipboard access. Select the value and copy it manually.', true)
        return
      }
      this.clearMessage()
      this.copiedKey = key
      if (this.copyResetHandle) clearTimeout(this.copyResetHandle)
      this.copyResetHandle = setTimeout(() => {
        this.copiedKey = ''
        this.copyResetHandle = null
      }, 1400)
      if (key === 'hex') this.setMessage('Hex list copied to the clipboard.')
      else if (key === 'css') this.setMessage('CSS custom properties copied to the clipboard.')
      else if (key === 'json') this.setMessage('Palette JSON copied to the clipboard.')
    },

    async writeToClipboard (text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch (error) {
        // Permission was refused or the document is not focused; try the legacy path.
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.top = '0'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(area)
        return copied
      } catch (error) {
        return false
      }
    },

    downloadPalettePng () {
      const roles = this.palette
      const swatchWidth = 200
      const swatchHeight = 108
      const gap = 10
      const padding = 32
      const headerHeight = 76
      const labelHeight = 30
      const canvas = document.createElement('canvas')
      canvas.width = padding * 2 + roles.length * swatchWidth + (roles.length - 1) * gap
      canvas.height = padding * 2 + headerHeight + labelHeight +
        LEVELS.length * swatchHeight + (LEVELS.length - 1) * gap
      const context = canvas.getContext('2d')

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#29242e'
      context.font = '600 30px system-ui, sans-serif'
      context.textBaseline = 'top'
      context.fillText(`${this.activeScheme.label} palette`, padding, padding)
      context.fillStyle = '#716a76'
      context.font = '400 17px system-ui, sans-serif'
      context.fillText(
        `Base ${this.baseHex} · ${this.wheelModel === 'ryb' ? 'RYB wheel' : 'RGB wheel'} · curvednebula.com`,
        padding,
        padding + 40
      )

      roles.forEach((role, roleIndex) => {
        const left = padding + roleIndex * (swatchWidth + gap)
        context.fillStyle = '#4d4651'
        context.font = '650 16px system-ui, sans-serif'
        context.fillText(role.label, left, padding + headerHeight)

        role.swatches.forEach((swatch, levelIndex) => {
          const top = padding + headerHeight + labelHeight + levelIndex * (swatchHeight + gap)
          context.fillStyle = swatch.hex
          context.fillRect(left, top, swatchWidth, swatchHeight)
          context.fillStyle = swatch.textColor
          context.font = '650 15px system-ui, sans-serif'
          context.fillText(swatch.key, left + 14, top + 14)
          context.font = '400 19px ui-monospace, SFMono-Regular, Menlo, monospace'
          context.fillText(swatch.hex.toUpperCase(), left + 14, top + swatchHeight - 30)
        })
      })

      canvas.toBlob(blob => {
        if (!blob) {
          this.setMessage('The palette image could not be created.', true)
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `palette-${this.activeScheme.key}-${this.baseHex.slice(1)}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        this.setMessage('Palette image saved.')
      }, 'image/png')
    },

    setMessage (text, isError = false) {
      this.message = text
      this.messageIsError = isError
    },

    clearMessage () {
      this.message = ''
      this.messageIsError = false
    }
  }
}
</script>

<style scoped>
.color-palette-tool {
  --accent: #3a3a3a;
  --accent-dark: #1f1f1f;
  --ink: #29242e;
  --muted: #716a76;
  --line: #e5dfe8;
  --panel: #faf8fb;
  margin: 2rem 0 4rem;
  color: var(--ink);
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.editor-layout {
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  overflow: hidden;
  background: #fff;
  box-shadow: 0 18px 50px rgba(39, 27, 43, 0.08);
}

.picker-panel {
  min-width: 0;
  padding: 1.25rem;
}

.picker-head {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
}

.color-swatch-field {
  width: 3.6rem;
  flex-shrink: 0;
  display: block;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  overflow: hidden;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.color-swatch-field input {
  width: 100%;
  height: 100%;
  display: block;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.color-swatch-field input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-swatch-field input::-webkit-color-swatch {
  border: 0;
}

.color-swatch-field input::-moz-color-swatch {
  border: 0;
}

.hex-field {
  min-width: 0;
  flex: 1;
  color: #4d4651;
  font-size: 0.8rem;
  font-weight: 650;
}

.hex-field span {
  margin-bottom: 0.35rem;
  display: block;
}

.hex-field input {
  width: 100%;
  min-height: 2.45rem;
  padding: 0 0.6rem;
  border: 1px solid #d8d0dc;
  border-radius: 0.48rem;
  color: var(--ink);
  background: #fff;
  outline: none;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-transform: lowercase;
}

.hex-field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(58, 58, 58, 0.14);
}

.wheel-stage {
  position: relative;
  max-width: 16rem;
  margin: 1.25rem auto 0;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wheel-canvas {
  display: block;
  border-radius: 50%;
  touch-action: none;
  outline: 0;
  box-shadow: 0 6px 18px rgba(39, 27, 43, 0.18);
}

.wheel-canvas:focus-visible {
  box-shadow: 0 0 0 3px rgba(58, 58, 58, 0.5), 0 6px 18px rgba(39, 27, 43, 0.18);
}

.wheel-marker {
  position: absolute;
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
}

.wheel-marker.is-base {
  width: 1.4rem;
  height: 1.4rem;
  border-width: 3px;
}

.sliders {
  margin-top: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.slider-label {
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4d4651;
  font-size: 0.8rem;
  font-weight: 650;
}

.slider-track {
  position: relative;
  height: 0.8rem;
  display: block;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.slider-track input[type='range'] {
  position: absolute;
  top: -0.4rem;
  left: 0;
  width: 100%;
  height: calc(100% + 0.8rem);
  margin: 0;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: 0;
  cursor: pointer;
}

.slider-track input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 1.05rem;
  height: 1.05rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--ink);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
}

.slider-track input[type='range']::-moz-range-thumb {
  width: 1.05rem;
  height: 1.05rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--ink);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
}

.slider-track input[type='range']:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(58, 58, 58, 0.4);
}

.slider-track input[type='range']:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px rgba(58, 58, 58, 0.4);
}

.contrast-row {
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.78rem;
}

.contrast-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.contrast-chip {
  width: 2rem;
  height: 1.5rem;
  border-radius: 0.32rem;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.scheme-panel {
  padding: 1.25rem;
  border-left: 1px solid var(--line);
  background: var(--panel);
}

.setting-group + .setting-group {
  margin-top: 1.2rem;
}

.wheel-model-group {
  margin-top: 1rem;
}

.wheel-model-group .chip-row {
  justify-content: center;
}

.setting-heading {
  margin-bottom: 0.5rem;
  display: block;
  color: #4d4651;
  font-size: 0.8rem;
  font-weight: 650;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  min-height: 2.1rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid #d8d0dc;
  border-radius: 0.5rem;
  color: #4d4651;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.chip.is-active {
  border-color: var(--accent);
  color: #fff;
  background: var(--accent);
}

.scheme-description {
  margin: 0.9rem 0 0;
  color: var(--muted);
  font-size: 0.83rem;
  line-height: 1.55;
}

.hint {
  margin: 0.55rem 0 0;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.export-actions {
  margin-top: 1.3rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.1rem;
}

.export-actions .setting-heading {
  margin-bottom: 0;
}

.export-actions .primary-button {
  margin-left: auto;
}

.text-button {
  border: 0;
  padding: 0;
  color: var(--accent);
  background: transparent;
  font-size: 0.83rem;
  font-weight: 600;
}

.text-button:hover {
  color: var(--accent-dark);
}

.primary-button {
  min-height: 2.6rem;
  padding: 0.6rem 1.1rem;
  border: 0;
  border-radius: 0.65rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #fff;
  background: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(20, 20, 20, 0.2);
  transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}

.primary-button:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(20, 20, 20, 0.28);
}

.primary-button svg {
  width: 1.05rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.palette {
  margin-top: 1.3rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--line);
}

.palette-headers,
.palette-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.8rem;
}

.palette-headers {
  margin-bottom: 0.5rem;
}

.role-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.role-name {
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 650;
}

.role-offset {
  color: var(--muted);
  font-size: 0.72rem;
}

.role-swatches {
  border-radius: 0.7rem;
  overflow: hidden;
  box-shadow: 0 10px 26px rgba(39, 27, 43, 0.1);
}

.swatch {
  width: 100%;
  min-height: 3.9rem;
  padding: 0.55rem 0.7rem;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  text-align: left;
  transition: filter 140ms ease;
}

.swatch:hover {
  filter: brightness(1.06);
}

.swatch.is-base {
  box-shadow: inset 0 0 0 2px currentColor;
}

.swatch-level {
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.85;
}

.swatch-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
}

.preview {
  margin-top: 1.5rem;
  padding: 1.6rem;
  border: 1px solid;
  border-radius: 0.85rem;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  align-items: center;
  gap: 1.5rem;
  transition: background 200ms ease, color 200ms ease;
}

.preview-eyebrow {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview h3 {
  margin: 0.5rem 0 0.55rem;
  border: 0;
  padding: 0;
  font-size: 1.35rem;
  line-height: 1.3;
}

.preview p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
}

.preview-buttons {
  margin-top: 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.preview-button {
  padding: 0.55rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.55rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.preview-button.is-ghost {
  background: transparent;
}

.preview-card {
  padding: 1.1rem;
  border: 1px solid;
  border-radius: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.preview-bar {
  height: 0.7rem;
  border-radius: 0.35rem;
}

.status-message {
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 0.82rem;
}

.status-message.error {
  color: #a32a4a;
}

@media (max-width: 860px) {
  .editor-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .scheme-panel {
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .preview {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
