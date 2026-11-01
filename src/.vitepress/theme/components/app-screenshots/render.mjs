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

export function screenshotRect(imageWidth, imageHeight, width, height, layout) {
  const margin = width * layout.margin / 100
  const top = height * layout.top / 100
  const availableWidth = width - margin * 2
  const availableHeight = height - top - height * 0.04
  const fit = Math.min(availableWidth / imageWidth, availableHeight / imageHeight)
  const scale = fit * layout.scale / 100
  const w = imageWidth * scale
  const h = imageHeight * scale
  return { x: (width - w) / 2, y: top + (availableHeight - h) / 2, w, h }
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
    const gradient = ctx.createLinearGradient(...gradientCoordinates(width, height, count, index, colors.angle))
    gradient.addColorStop(0, colors.start)
    gradient.addColorStop(1, colors.end)
    ctx.fillStyle = gradient
  }
  ctx.fillRect(0, 0, width, height)

  const { layout, text } = frameSettings(frame, settings)
  const rect = screenshotRect(frame.image.naturalWidth, frame.image.naturalHeight, width, height, layout)
  ctx.drawImage(frame.image, rect.x, rect.y, rect.w, rect.h)

  const fontSize = width * text.size / 100
  const lineHeight = fontSize * 1.2
  const textTop = height * 0.04
  const textBottom = height * layout.top / 100 - height * 0.025
  const inset = Math.max(width * layout.margin / 100, width * 0.05)
  const maxWidth = width - inset * 2
  ctx.font = `${text.weight} ${fontSize}px ${FONT_FAMILIES[text.font]}`
  ctx.fillStyle = text.color
  ctx.textAlign = text.align
  ctx.textBaseline = 'top'
  const lines = frame.caption.trim() ? wrapText(ctx, frame.caption, maxWidth) : []
  const maxLines = Math.max(0, Math.floor((textBottom - textTop) / lineHeight))
  const overflow = lines.length > maxLines
  const x = text.align === 'left' ? inset : text.align === 'right' ? width - inset : width / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(inset, textTop, maxWidth, Math.max(0, textBottom - textTop))
  ctx.clip()
  lines.slice(0, maxLines).forEach((line, i) => ctx.fillText(line, x, textTop + i * lineHeight))
  ctx.restore()
  return { overflow, lines: lines.length, maxLines }
}
