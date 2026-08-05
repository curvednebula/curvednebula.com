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

        <div class="preview-block">
          <div class="preview-head">
            <span class="setting-heading">Preview</span>
            <div class="chip-row" role="group" aria-label="Preview interface theme">
              <button
                class="chip"
                type="button"
                :class="{ 'is-active': previewMode === 'light' }"
                :aria-pressed="previewMode === 'light' ? 'true' : 'false'"
                @click="previewMode = 'light'"
              >
                Light UI
              </button>
              <button
                class="chip"
                type="button"
                :class="{ 'is-active': previewMode === 'dark' }"
                :aria-pressed="previewMode === 'dark' ? 'true' : 'false'"
                @click="previewMode = 'dark'"
              >
                Dark UI
              </button>
            </div>
          </div>

          <div class="preview-pair">
            <div v-for="variant in previewVariants" :key="variant.key" class="preview-pane">
              <span class="preview-pane-label">{{ variant.label }}</span>
              <section
                class="preview"
                :style="{ background: variant.theme.surface, color: variant.theme.text, borderColor: variant.theme.line }"
                :aria-label="`Palette preview: ${variant.label}`"
              >
                <div class="mock-bar" :style="{ background: variant.theme.card, borderColor: variant.theme.line }">
                  <span class="mock-logo" :style="{ background: variant.theme.primary }" />
                  <span class="mock-brand" :style="{ color: variant.theme.cardHeading }">Dashboard</span>
                  <span class="mock-nav">
                    <span :style="{ color: variant.theme.cardAccent }">Overview</span>
                    <span :style="{ color: variant.theme.cardMuted }">Reports</span>
                  </span>
                  <span class="mock-avatar" :style="{ background: variant.theme.muted, color: variant.theme.mutedText }">CN</span>
                </div>

                <div class="mock-hero">
                  <span class="preview-eyebrow" :style="{ color: variant.theme.accent }">{{ activeScheme.label }}</span>
                  <h3 :style="{ color: variant.theme.heading }">A place for every color</h3>
                  <p>One hue leads, the rest wait their turn.</p>
                </div>

                <div class="mock-controls">
                  <span class="preview-button" :style="{ background: variant.theme.primary, color: variant.theme.primaryText }">
                    Primary
                  </span>
                  <span class="preview-button is-ghost" :style="{ borderColor: variant.theme.accent, color: variant.theme.accent }">
                    Accent
                  </span>
                  <span class="preview-button" :style="{ background: variant.theme.muted, color: variant.theme.mutedText }">
                    Subtle
                  </span>
                  <span
                    v-for="role in variant.roles"
                    :key="`tag-${variant.key}-${role.slug}`"
                    class="mock-tag"
                    :style="{ background: role.tint, color: role.ink, borderColor: role.line }"
                  >
                    {{ role.label }}
                  </span>
                </div>

                <div class="mock-card" :style="{ background: variant.theme.card, borderColor: variant.theme.line }">
                  <span class="mock-card-head">
                    <span :style="{ color: variant.theme.cardHeading }">Traffic by channel</span>
                    <span :style="{ color: variant.theme.cardMuted }">30 days</span>
                  </span>
                  <span
                    v-for="role in variant.roles"
                    :key="`row-${variant.key}-${role.slug}`"
                    class="mock-row"
                  >
                    <span class="mock-row-name" :style="{ color: variant.theme.cardText }">
                      <span class="mock-swatch" :style="{ background: role.solid, borderColor: role.line }" />
                      {{ role.label }}
                    </span>
                    <span class="mock-track" :style="{ background: variant.theme.muted }">
                      <span class="mock-fill" :style="{ background: role.solid, width: role.metric }" />
                    </span>
                    <span class="mock-row-value" :style="{ color: role.onCard }">{{ role.metric }}</span>
                  </span>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div class="export-actions">
          <span class="setting-heading">Export</span>
          <button class="copy-button" type="button" @click="copyText('hex', hexListText)">Copy hex list</button>
          <button class="copy-button" type="button" @click="copyText('css', cssText)">Copy CSS variables</button>
          <button class="copy-button" type="button" @click="copyText('json', jsonText)">Copy JSON</button>
          <button class="primary-button" type="button" @click="downloadPalettePng">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/>
            </svg>
            Save PNG
          </button>
        </div>
      </aside>
    </div>

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

// Sample readings for the preview tiles and chart rows, one per role in order.
const PREVIEW_METRICS = ['82%', '64%', '47%', '33%', '21%']

// Hue offsets are measured from the base hue on whichever wheel is selected. The
// prose explaining what each harmony is for lives on the page around the tool,
// not here.
const SCHEMES = [
  {
    key: 'monochromatic',
    label: 'Monochromatic',
    roles: [
      { label: 'Base', offset: 0 }
    ]
  },
  {
    key: 'complementary',
    label: 'Complementary',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Complement', offset: 180 }
    ]
  },
  {
    key: 'split',
    label: 'Split complementary',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Split A', offset: 150 },
      { label: 'Split B', offset: 210 }
    ]
  },
  {
    key: 'double-split',
    label: 'Double split',
    roles: [
      { label: 'Base split A', offset: -30 },
      { label: 'Base split B', offset: 30 },
      { label: 'Far split A', offset: 150 },
      { label: 'Far split B', offset: 210 }
    ]
  },
  {
    key: 'triadic',
    label: 'Triadic',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Triad A', offset: 120 },
      { label: 'Triad B', offset: 240 }
    ]
  },
  {
    key: 'tetradic',
    label: 'Tetradic',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Complement', offset: 180 },
      { label: 'Pair B', offset: 60 },
      { label: 'Pair B complement', offset: 240 }
    ]
  },
  {
    key: 'square',
    label: 'Square',
    roles: [
      { label: 'Base', offset: 0 },
      { label: 'Square B', offset: 90 },
      { label: 'Complement', offset: 180 },
      { label: 'Square D', offset: 270 }
    ]
  },
  {
    key: 'analogous',
    label: 'Analogous',
    roles: [
      { label: 'Analogous A', offset: -30 },
      { label: 'Base', offset: 0 },
      { label: 'Analogous B', offset: 30 }
    ]
  },
  {
    key: 'accented',
    label: 'Accented analogous',
    roles: [
      { label: 'Analogous A', offset: -30 },
      { label: 'Base', offset: 0 },
      { label: 'Analogous B', offset: 30 },
      { label: 'Accent', offset: 180 }
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

function mixRgb (first, second, ratio) {
  return {
    r: first.r + (second.r - first.r) * ratio,
    g: first.g + (second.g - first.g) * ratio,
    b: first.b + (second.b - first.b) * ratio
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

// Text in the preview has to stay legible even where a ramp is compressed: a
// pale, unsaturated yellow's 900 shade is only about 2.5:1 against its own 100
// tint. Take the intended level when it carries enough contrast, step to another
// level on the same ramp when it does not, and only fall back to plain near-black
// or near-white when the hue itself cannot do the job.
function readableLevel (levels, backgroundHex, preferredKeys, minimum = 4.5) {
  const background = hexToRgb(backgroundHex)
  for (const key of preferredKeys) {
    if (contrastRatio(hexToRgb(levels[key]), background) >= minimum) return levels[key]
  }
  return readableTextColor(background)
}

// Secondary text has to clear the same threshold as body copy, so asking for the
// first level that passes can hand back something louder than the body color it
// sits beneath. Take the quietest passing level instead, or null when the ramp
// has nothing legible to offer and the caller should reuse its body color.
function quietestReadableLevel (levels, backgroundHex, minimum = 4.5) {
  const background = hexToRgb(backgroundHex)
  let best = null
  for (const key of Object.keys(levels)) {
    const ratio = contrastRatio(hexToRgb(levels[key]), background)
    if (ratio >= minimum && (!best || ratio < best.ratio)) best = { hex: levels[key], ratio }
  }
  return best ? best.hex : null
}

// Two ways to seat a palette, both common in real interfaces. A neutral page
// keeps white (or near-black) behind everything and lets only the cards carry the
// hue; a tinted page puts the color behind everything and keeps the cards plain.
//
// Surfaces get their own ladder rather than reusing ramp levels. A base color
// that is very dark or very pale crushes its own ramp — a near-black base puts
// its 900 shade within 1.003:1 of the page behind it, which is invisible.
//
// Page, card and quiet fill are fixed mixes toward white (light) or black (dark),
// which is what makes them read as tints and shades of the hue rather than as the
// hue itself. They are deliberately not luminance-matched: a pale yellow is
// physically bright, so forcing one down to a blue tint's luminance turns it into
// vivid #f4f43f instead of a tint. Tone alone therefore cannot always separate a
// card from the page — which is what the border is for, so that one IS a
// luminance target, dark enough in light mode and light enough in dark mode to
// outline a card whatever its hue. `null` means plain white.
const SURFACE_STEPS = {
  light: {
    neutral: { pageMix: null, cardMix: 0.9, quietMix: 0.74, lineLum: 0.42 },
    tinted: { pageMix: 0.85, cardMix: null, quietMix: 0.66, lineLum: 0.38 }
  },
  dark: {
    neutral: { pageMix: 0.9, cardMix: 0.78, quietMix: 0.58, lineLum: 0.1 },
    tinted: { pageMix: 0.8, cardMix: 0.64, quietMix: 0.44, lineLum: 0.14 }
  }
}

// One definition of the two seatings, shared by the preview panes and all three
// exports so the labels a reader sees match the values they copy.
const SURFACE_VARIANTS = [
  {
    key: 'neutral',
    number: 1,
    summary: 'plain page, tinted cards',
    detail: 'The page stays white in light mode and near-black in dark mode, and only the cards carry a tint of the base hue. The more common arrangement.',
    lightLabel: 'White page, tinted cards',
    darkLabel: 'Near-black page, tinted cards'
  },
  {
    key: 'tinted',
    number: 2,
    summary: 'tinted page, plain cards',
    detail: 'The page carries a tint of the base hue and the cards stay plain: white in light mode, a lighter shade in dark mode.',
    lightLabel: 'Tinted page, white cards',
    darkLabel: 'Tinted page, lighter cards'
  }
]

function purestTone (hue, saturation) {
  return hsvToRgb(hue, Math.min(saturation, 85), 100)
}

function mixedTone (hue, saturation, ratio, mode) {
  if (ratio === null) return '#ffffff'
  const toward = mode === 'dark' ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 }
  return rgbToHex(mixRgb(purestTone(hue, saturation), toward, ratio))
}

// White and black bracket the whole luminance range, so mixing toward whichever
// side the target lies on always converges on it.
function toneAtLuminance (hue, saturation, target) {
  const pure = purestTone(hue, saturation)
  const towardWhite = target > relativeLuminance(pure)
  const toward = towardWhite ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }
  let low = 0
  let high = 1
  for (let step = 0; step < 20; step++) {
    const middle = (low + high) / 2
    const luminance = relativeLuminance(mixRgb(pure, toward, middle))
    if (towardWhite ? luminance < target : luminance > target) low = middle
    else high = middle
  }
  return rgbToHex(mixRgb(pure, toward, (low + high) / 2))
}

// A near-grey base collapses every mix toward the same near-white, which can leave
// a chip or a progress track invisible on the card it sits on. When the tint alone
// does not separate, step by luminance instead.
function separatedTone (candidate, cardHex, hue, saturation, mode) {
  if (contrastRatio(hexToRgb(candidate), hexToRgb(cardHex)) >= 1.12) return candidate
  const cardLuminance = relativeLuminance(hexToRgb(cardHex))
  const target = mode === 'dark'
    ? (cardLuminance + 0.05) * 1.35 - 0.05
    : (cardLuminance + 0.05) / 1.35 - 0.05
  return toneAtLuminance(hue, saturation, clamp(target, 0, 1))
}

function surfacePlan (hue, saturation, mode, variant) {
  const step = SURFACE_STEPS[mode][variant]
  const card = mixedTone(hue, saturation, step.cardMix, mode)
  return {
    surface: mixedTone(hue, saturation, step.pageMix, mode),
    card,
    subtle: separatedTone(mixedTone(hue, saturation, step.quietMix, mode), card, hue, saturation, mode),
    line: toneAtLuminance(hue, saturation, step.lineLum)
  }
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
      // Blue is the most-cited favourite colour across cross-cultural surveys.
      hue: 215,
      saturation: 50,
      value: 82,
      scheme: 'monochromatic',
      wheelModel: 'ryb',
      previewMode: 'light',
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

    // The base hue is not always the first role: analogous schemes list a
    // neighbour ahead of it, and the double split leaves it out altogether.
    uiBaseRole () {
      return this.palette.find(role => role.offset === 0) || this.palette[0]
    },

    // Whichever role sits furthest from the base around the wheel makes the
    // strongest accent — the true complement rather than just the last role in
    // the list. Distance is measured on the scheme's own wheel offsets, not on
    // the resulting RGB hues, so the RYB mapping cannot bend a 180° pairing into
    // looking closer than a 120° one.
    uiAccentRole () {
      const baseRole = this.uiBaseRole
      let winner = baseRole
      let furthest = -1
      for (const role of this.palette) {
        if (role === baseRole) continue
        const delta = mod360(role.offset - baseRole.offset)
        const distance = Math.min(delta, 360 - delta)
        if (distance > furthest) {
          furthest = distance
          winner = role
        }
      }
      return winner
    },

    previewVariants () {
      const isDark = this.previewMode === 'dark'
      return SURFACE_VARIANTS.map(variant => ({
        key: variant.key,
        label: `Variant ${variant.number} · ${isDark ? variant.darkLabel : variant.lightLabel}`,
        theme: this.uiTheme(this.previewMode, variant.key),
        roles: this.uiRoles(this.previewMode, variant.key)
      }))
    },

    hexListText () {
      const lines = [
        `${this.activeScheme.label} palette from ${this.baseHex} · curvednebula.com`,
        '',
        'RAMPS'
      ]
      for (const role of this.palette) {
        lines.push(`  ${role.label}: ${role.swatches.map(swatch => swatch.hex).join(' ')}`)
      }
      for (const variant of SURFACE_VARIANTS) {
        lines.push('', `VARIANT ${variant.number} — ${variant.summary}`, `  ${variant.detail}`)
        for (const mode of ['light', 'dark']) {
          const tokens = this.uiTokens(mode, variant.key)
          const width = Math.max(...tokens.map(token => token.name.length))
          lines.push('', `  ${mode.toUpperCase()}`)
          for (const token of tokens) {
            lines.push(`    ${token.name.padEnd(width)}  ${token.hex}  ${token.note}`)
          }
        }
      }
      return lines.join('\n')
    },

    cssText () {
      const [first, second] = SURFACE_VARIANTS
      const lines = [
        `/* ${this.activeScheme.label} palette from ${this.baseHex} · curvednebula.com`,
        ' *',
        ` * Variant ${first.number} — ${first.summary}.`,
        ` *   ${first.detail}`,
        ` * Variant ${second.number} — ${second.summary}.`,
        ` *   ${second.detail}`,
        ' *',
        ` * Variant ${first.number} applies by default. For variant ${second.number}, put`,
        ` * data-ui-variant="${second.number}" on <html>. Both follow the reader's`,
        ' * light or dark system setting. */',
        ':root {',
        '  /* Palette ramps */'
      ]
      for (const role of this.palette) {
        for (const swatch of role.swatches) {
          lines.push(`  ${swatch.name}: ${swatch.hex};`)
        }
      }
      lines.push('', `  /* Variant ${first.number} · light — ${first.summary} */`)
      lines.push(...this.uiTokenLines('light', first.key, '  '))
      lines.push('}', '')
      lines.push(`:root[data-ui-variant='${second.number}'] {`)
      lines.push(`  /* Variant ${second.number} · light — ${second.summary} */`)
      lines.push(...this.uiTokenLines('light', second.key, '  '))
      lines.push('}', '')
      // Both dark blocks sit after both light ones, and the variant 2 selector
      // carries the same extra specificity in each, so source order decides and
      // dark always wins over light for whichever variant is active.
      lines.push('@media (prefers-color-scheme: dark) {', '  :root {')
      lines.push(`    /* Variant ${first.number} · dark — ${first.summary} */`)
      lines.push(...this.uiTokenLines('dark', first.key, '    '))
      lines.push('  }', '')
      lines.push(`  :root[data-ui-variant='${second.number}'] {`)
      lines.push(`    /* Variant ${second.number} · dark — ${second.summary} */`)
      lines.push(...this.uiTokenLines('dark', second.key, '    '))
      lines.push('  }', '}')
      return lines.join('\n')
    },

    jsonText () {
      const ui = {}
      for (const variant of SURFACE_VARIANTS) {
        const themes = {}
        for (const mode of ['light', 'dark']) {
          themes[mode] = this.uiTokens(mode, variant.key).reduce((tokens, token) => {
            tokens[token.name] = { hex: token.hex, use: token.note }
            return tokens
          }, {})
        }
        ui[`variant${variant.number}`] = {
          summary: variant.summary,
          description: variant.detail,
          isDefault: variant.number === 1,
          ...themes
        }
      }
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
        })),
        ui
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

    // Maps the palette onto the interface roles a design system actually needs.
    // Takes the mode as an argument rather than reading previewMode so the
    // exports can emit both themes no matter which one is on screen.
    uiTheme (mode, variant = 'neutral') {
      const isDark = mode === 'dark'
      const base = this.swatchesBySlugKey(this.uiBaseRole)
      const accent = this.swatchesBySlugKey(this.uiAccentRole)
      const { surface, card, subtle, line } = surfacePlan(this.uiBaseRole.hue, this.saturation, mode, variant)
      const inkKeys = isDark ? ['100', '300'] : ['900', '700']
      const bodyKeys = isDark ? ['300', '100'] : ['700', '900']
      const cardText = readableLevel(base, card, bodyKeys)
      return {
        surface,
        card,
        line,
        muted: subtle,
        mutedText: readableTextColor(hexToRgb(subtle)),
        primary: base['500'],
        primaryText: readableTextColor(hexToRgb(base['500'])),
        // Headings are large enough to sit at the 3:1 threshold; body copy is not.
        heading: readableLevel(base, surface, inkKeys, 3),
        text: readableLevel(base, surface, bodyKeys),
        accent: readableLevel(accent, surface, bodyKeys),
        // The top bar and the chart card sit on `card`, not on the surface, so
        // their text has to be measured against that background instead.
        cardHeading: readableLevel(base, card, inkKeys, 3),
        cardText,
        cardMuted: quietestReadableLevel(base, card) || cardText,
        cardAccent: readableLevel(accent, card, bodyKeys)
      }
    },

    // Every harmony hue gets the same slots, so it can fill a chart bar, tint a
    // chip, and label a row without any per-scheme special casing.
    uiRoles (mode, variant = 'neutral') {
      const isDark = mode === 'dark'
      const { card } = surfacePlan(this.uiBaseRole.hue, this.saturation, mode, variant)
      return this.palette.map((role, index) => {
        const levels = this.swatchesBySlugKey(role)
        const tint = isDark ? levels['900'] : levels['100']
        return {
          slug: role.slug,
          label: role.label,
          metric: PREVIEW_METRICS[index % PREVIEW_METRICS.length],
          tint,
          line: isDark ? levels['700'] : levels['300'],
          solid: levels['500'],
          ink: readableLevel(levels, tint, isDark ? ['100', '300'] : ['900', '700'], 3),
          soft: readableLevel(levels, tint, isDark ? ['300', '100'] : ['700', '900']),
          onCard: readableLevel(levels, card, isDark ? ['300', '100'] : ['700', '900'])
        }
      })
    },

    // The same mapping as a flat, exportable token list. Names and notes say
    // which interface element each color is for, so the export is usable
    // without having to reverse-engineer the preview.
    uiTokenLines (mode, variant, indent) {
      return this.uiTokens(mode, variant)
        .map(token => `${indent}--${token.name}: ${token.hex}; /* ${token.note} */`)
    },

    uiTokens (mode, variant = 'neutral') {
      const theme = this.uiTheme(mode, variant)
      const tokens = [
        { name: 'ui-surface', hex: theme.surface, note: 'page background' },
        { name: 'ui-surface-card', hex: theme.card, note: 'cards, panels, top bar' },
        { name: 'ui-border', hex: theme.line, note: 'hairlines and card borders' },
        { name: 'ui-heading', hex: theme.heading, note: 'headings on the page background' },
        { name: 'ui-text', hex: theme.text, note: 'body copy on the page background' },
        { name: 'ui-accent', hex: theme.accent, note: 'links and highlights on the page background' },
        { name: 'ui-primary', hex: theme.primary, note: 'primary button fill' },
        { name: 'ui-primary-text', hex: theme.primaryText, note: 'label on the primary button' },
        { name: 'ui-subtle', hex: theme.muted, note: 'quiet fills: chips, avatars, progress tracks' },
        { name: 'ui-subtle-text', hex: theme.mutedText, note: 'label on a quiet fill' },
        { name: 'ui-card-heading', hex: theme.cardHeading, note: 'headings on a card' },
        { name: 'ui-card-text', hex: theme.cardText, note: 'body copy on a card' },
        { name: 'ui-card-muted', hex: theme.cardMuted, note: 'secondary and meta text on a card' },
        { name: 'ui-card-accent', hex: theme.cardAccent, note: 'links and highlights on a card' }
      ]
      for (const role of this.uiRoles(mode, variant)) {
        tokens.push(
          { name: `ui-${role.slug}-fill`, hex: role.solid, note: `${role.label}: chart fill, dot, badge` },
          { name: `ui-${role.slug}-tint`, hex: role.tint, note: `${role.label}: tinted panel or track` },
          { name: `ui-${role.slug}-border`, hex: role.line, note: `${role.label}: border on its tinted panel` },
          { name: `ui-${role.slug}-heading`, hex: role.ink, note: `${role.label}: heading on its tinted panel` },
          { name: `ui-${role.slug}-text`, hex: role.soft, note: `${role.label}: body copy on its tinted panel` },
          { name: `ui-${role.slug}-on-card`, hex: role.onCard, note: `${role.label}: label on a card` }
        )
      }
      return tokens
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
      if (key === 'hex') this.setMessage('Hex list copied, with both surface variants in light and dark.')
      else if (key === 'css') this.setMessage('CSS custom properties copied: the ramps plus a named role for every UI element, for both variants in light and dark.')
      else if (key === 'json') this.setMessage('Palette JSON copied, with both surface variants in light and dark.')
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
  padding: 1rem;
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

.hint {
  margin: 0.55rem 0 0;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.export-actions {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.export-actions .setting-heading {
  margin-bottom: 0;
  margin-right: 0.35rem;
}

.export-actions .primary-button {
  margin-left: auto;
}

.copy-button {
  min-height: 2.2rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid #d8d0dc;
  border-radius: 0.5rem;
  color: #4d4651;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}

.copy-button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.copy-button:active {
  background: var(--panel);
}

.primary-button {
  min-height: 2.2rem;
  padding: 0.4rem 0.9rem;
  border: 0;
  border-radius: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #fff;
  background: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(20, 20, 20, 0.18);
  transition: background 140ms ease, box-shadow 140ms ease;
}

.primary-button:hover {
  background: var(--accent-dark);
  box-shadow: 0 6px 16px rgba(20, 20, 20, 0.26);
}

.primary-button svg {
  width: 0.95rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.palette {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--line);
}

.palette-headers,
.palette-columns {
  display: grid;
  /* Capped rather than 1fr: monochromatic has a single role, and auto-fit would
   * otherwise stretch its one column across the whole panel. */
  grid-template-columns: repeat(auto-fit, minmax(4.6rem, 9rem));
  gap: 0.3rem;
}

.palette-headers {
  margin-bottom: 0.25rem;
}

.role-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.role-name {
  color: var(--ink);
  font-size: 0.7rem;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-offset {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 0.6rem;
}

.role-swatches {
  border-radius: 0.4rem;
  overflow: hidden;
  box-shadow: 0 5px 14px rgba(39, 27, 43, 0.1);
}

.swatch {
  width: 100%;
  min-height: 1.45rem;
  padding: 0.1rem 0.32rem;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
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
  flex-shrink: 0;
  font-size: 0.56rem;
  font-weight: 700;
  opacity: 0.8;
}

.swatch-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.62rem;
}

.preview-block {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--line);
}

.preview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.preview-head .setting-heading {
  margin-bottom: 0;
}

.preview-pair {
  margin-top: 0.7rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.55rem;
}

.preview-pane {
  min-width: 0;
}

.preview-pane-label {
  margin-bottom: 0.3rem;
  display: block;
  color: var(--muted);
  font-size: 0.66rem;
  font-weight: 650;
}

.preview {
  padding: 0.6rem;
  border: 1px solid;
  border-radius: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  transition: background 200ms ease, color 200ms ease;
}

.mock-bar {
  padding: 0.38rem 0.55rem;
  border: 1px solid;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.mock-logo {
  width: 0.7rem;
  height: 0.7rem;
  flex-shrink: 0;
  border-radius: 0.22rem;
}

.mock-brand {
  font-size: 0.72rem;
  font-weight: 700;
}

.mock-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-left: 0.3rem;
  font-size: 0.68rem;
  font-weight: 600;
}

.mock-avatar {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  margin-left: auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.54rem;
  font-weight: 700;
}

.mock-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.mock-card {
  padding: 0.5rem 0.6rem 0.6rem;
  border: 1px solid;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.mock-card-head {
  margin-bottom: 0.06rem;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 650;
}

.mock-card-head span:last-child {
  font-size: 0.62rem;
  font-weight: 500;
}

.mock-row {
  display: grid;
  grid-template-columns: minmax(3.8rem, 6rem) minmax(0, 1fr) 1.9rem;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.64rem;
}

.mock-row-name {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mock-swatch {
  width: 0.52rem;
  height: 0.52rem;
  flex-shrink: 0;
  border: 1px solid;
  border-radius: 0.16rem;
}

.mock-track {
  height: 0.38rem;
  display: block;
  border-radius: 0.2rem;
  overflow: hidden;
}

.mock-fill {
  height: 100%;
  display: block;
  border-radius: 0.25rem;
}

.mock-row-value {
  font-weight: 650;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.mock-tag {
  padding: 0.14rem 0.42rem;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 650;
}

.mock-hero {
  padding: 0 0.15rem;
}

.preview-eyebrow {
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview h3 {
  margin: 0.25rem 0 0.3rem;
  border: 0;
  padding: 0;
  font-size: 0.95rem;
  line-height: 1.3;
}

.preview p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
}

.preview-button {
  padding: 0.3rem 0.65rem;
  border: 1px solid transparent;
  border-radius: 0.42rem;
  font-size: 0.7rem;
  font-weight: 600;
}

.preview-button.is-ghost {
  background: transparent;
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
}
</style>
