export const OUTPUT_PRESETS = [
  { id: 'android', label: 'Android phone', width: 1080, height: 1920, limit: 8 },
  { id: 'iphone', label: 'iPhone · 6.9-inch', width: 1320, height: 2868, limit: 10 },
  { id: 'ipad', label: 'iPad · 13-inch', width: 2064, height: 2752, limit: 10 },
  { id: 'custom', label: 'Custom dimensions', width: 1080, height: 1920, limit: 10 }
]

export const FONT_FAMILIES = {
  sans: '"Segoe UI", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'Consolas, "Courier New", monospace'
}

const OUTLINE_COLORS = { white: '#ffffff', 'dark-grey': '#444444', black: '#000000' }

export function validDimensions(width, height) {
  return Number.isInteger(width) && Number.isInteger(height) &&
    width >= 320 && height >= 320 && width <= 4096 && height <= 4096 &&
    width * height <= 12000000
}

// Translate one strip-wide gradient into each frame, including solid frames.
export function gradientCoordinates(width, height, count, index, angle) {
  const radians = angle * Math.PI / 180
  const dx = Math.cos(radians)
  const dy = Math.sin(radians)
  const stripWidth = width * count
  const length = Math.abs(stripWidth * dx) + Math.abs(height * dy)
  const cx = stripWidth / 2 - index * width
  const cy = height / 2
  return [cx - dx * length / 2, cy - dy * length / 2,
    cx + dx * length / 2, cy + dy * length / 2]
}

export function compositionAreas(width, height, layout) {
  // One uniform margin, based on the shorter side, works in both orientations.
  const margin = Math.min(width, height) * layout.margin / 100
  const innerWidth = width - margin * 2
  const innerHeight = height - margin * 2
  const gap = layout.textArea > 0 ? margin : 0
  const textHeight = (innerHeight - gap) * layout.textArea / 100
  const screenshotHeight = innerHeight - gap - textHeight
  const bottomText = layout.textPosition === 'bottom'
  return {
    text: { x: margin, y: bottomText ? height - margin - textHeight : margin, w: innerWidth, h: textHeight },
    screenshot: { x: margin, y: bottomText ? margin : margin + textHeight + gap, w: innerWidth, h: screenshotHeight }
  }
}

function screenshotSource(imageWidth, imageHeight, layout) {
  const cropTop = Math.min(10, Math.max(0, layout.cropTop || 0))
  const y = Math.round(imageHeight * cropTop / 100)
  return { x: 0, y, w: imageWidth, h: imageHeight - y }
}

export function screenshotRect(imageWidth, imageHeight, width, height, layout) {
  const area = compositionAreas(width, height, layout).screenshot
  const source = screenshotSource(imageWidth, imageHeight, layout)
  const scale = Math.min(area.w / source.w, area.h / source.h)
  const w = source.w * scale
  const h = source.h * scale
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h }
}

export function wrapText(ctx, text, maxWidth) {
  const lines = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = ''
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      line = ''
      // Long words wrap by Unicode code point; explicit newlines are preserved.
      for (const char of word) {
        if (line && ctx.measureText(line + char).width > maxWidth) {
          lines.push(line)
          line = ''
        }
        line += char
      }
    }
    lines.push(line)
  }
  return lines
}

export function frameSettings(frame, settings) {
  return {
    layout: frame.customLayout ? frame.layout : settings.layout,
    text: frame.customText ? frame.text : settings.text
  }
}

// Geometry uses output pixels. A preview canvas only changes the transform.
export function renderFrame(canvas, frame, index, count, settings, previewWidth) {
  const { width, height } = settings
  const pixelWidth = previewWidth || width
  canvas.width = pixelWidth
  canvas.height = Math.round(pixelWidth * height / width)
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Your browser could not create an image canvas.')
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (frame.background === 'solid') {
    ctx.fillStyle = frame.color
  } else {
    const colors = frame.customBackground ? frame.gradient : settings.gradient
    const singleFrame = frame.background === 'single-gradient'
    const gradient = ctx.createLinearGradient(...gradientCoordinates(width, height, singleFrame ? 1 : count, singleFrame ? 0 : index, colors.angle))
    gradient.addColorStop(0, colors.start)
    gradient.addColorStop(1, colors.end)
    ctx.fillStyle = gradient
  }
  ctx.fillRect(0, 0, width, height)

  const { layout, text } = frameSettings(frame, settings)
  const source = screenshotSource(frame.image.naturalWidth, frame.image.naturalHeight, layout)
  const rect = screenshotRect(frame.image.naturalWidth, frame.image.naturalHeight, width, height, layout)
  const dropShadow = layout.outline === 'drop-shadow'
  if (dropShadow) {
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
    // Canvas shadow blur uses bitmap pixels, independent of the transform.
    ctx.shadowBlur = Math.min(width, height) * 0.075 * canvas.width / width
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }
  ctx.drawImage(frame.image, source.x, source.y, source.w, source.h, rect.x, rect.y, rect.w, rect.h)
  if (dropShadow) ctx.restore()
  const outlineColor = OUTLINE_COLORS[layout.outline]
  if (outlineColor) {
    const lineWidth = Math.min(width, height) * 0.004
    ctx.save()
    ctx.strokeStyle = outlineColor
    ctx.lineWidth = lineWidth
    // Draw outside the image; the canvas clips edges that touch the frame.
    ctx.strokeRect(rect.x - lineWidth / 2, rect.y - lineWidth / 2, rect.w + lineWidth, rect.h + lineWidth)
    ctx.restore()
  }

  const fontSize = width * text.size / 100
  const lineHeight = fontSize * 1.2
  const textArea = compositionAreas(width, height, layout).text
  ctx.font = `${text.weight} ${fontSize}px ${FONT_FAMILIES[text.font]}`
  ctx.fillStyle = text.color
  ctx.textAlign = text.align
  ctx.textBaseline = 'middle'
  const lines = frame.caption.trim() ? wrapText(ctx, frame.caption, textArea.w) : []
  const maxLines = Math.max(0, Math.floor(textArea.h / lineHeight))
  const overflow = lines.length > maxLines
  const visibleLines = lines.slice(0, maxLines)
  const textTop = textArea.y + (textArea.h - visibleLines.length * lineHeight) / 2
  const x = text.align === 'left' ? textArea.x : text.align === 'right' ? textArea.x + textArea.w : width / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(textArea.x, textArea.y, textArea.w, textArea.h)
  ctx.clip()
  visibleLines.forEach((line, i) => ctx.fillText(line, x, textTop + (i + 0.5) * lineHeight))
  ctx.restore()
  return { overflow, lines: lines.length, maxLines }
}
