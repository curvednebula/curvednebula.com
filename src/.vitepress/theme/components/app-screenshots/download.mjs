const encoder = new TextEncoder()
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let value = i
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

export function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(name, bytes) {
  const chunk = new Uint8Array(12 + bytes.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, bytes.length)
  chunk.set(encoder.encode(name), 4)
  chunk.set(bytes, 8)
  view.setUint32(8 + bytes.length, crc32(chunk.subarray(4, 8 + bytes.length)))
  return chunk
}

// Store submissions disallow alpha channels. Canvas PNG encoders may write RGBA
// even for opaque canvases, so encode RGB (PNG color type 2) explicitly.
export async function canvasPng(canvas) {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('PNG export needs a newer browser. Choose JPEG, or update your browser.')
  }
  const { width, height } = canvas
  const rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data
  const stride = width * 3 + 1
  const rgb = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const row = y * stride
    rgb[row] = 1 // PNG Sub filter keeps screenshots and gradients small.
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = row + 1 + x * 3
      for (let c = 0; c < 3; c++) {
        rgb[dst + c] = (rgba[src + c] - (x ? rgba[src - 4 + c] : 0)) & 255
      }
    }
  }
  const compressed = new Uint8Array(await new Response(
    new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))
  ).arrayBuffer())
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header[8] = 8
  header[9] = 2
  return new Blob([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header), pngChunk('IDAT', compressed), pngChunk('IEND', new Uint8Array())
  ], { type: 'image/png' })
}

export function canvasJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode the image. Try a smaller output size.')), 'image/jpeg', 0.95)
  })
}

// Images are already compressed. ZIP's store method needs no extra dependency.
export async function createZip(files) {
  const contents = []
  const directory = []
  let offset = 0
  let directorySize = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const bytes = new Uint8Array(await file.blob.arrayBuffer())
    const crc = crc32(bytes)
    const local = new Uint8Array(30 + name.length)
    const l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(4, 20, true)
    l.setUint16(6, 0x0800, true)
    l.setUint16(12, 0x21, true) // 1980-01-01
    l.setUint32(14, crc, true)
    l.setUint32(18, bytes.length, true)
    l.setUint32(22, bytes.length, true)
    l.setUint16(26, name.length, true)
    local.set(name, 30)
    contents.push(local, file.blob)

    const central = new Uint8Array(46 + name.length)
    const c = new DataView(central.buffer)
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint16(14, 0x21, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, bytes.length, true)
    c.setUint32(24, bytes.length, true)
    c.setUint16(28, name.length, true)
    c.setUint32(42, offset, true)
    central.set(name, 46)
    directory.push(central)
    directorySize += central.length
    offset += local.length + bytes.length
  }
  const end = new Uint8Array(22)
  const e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, files.length, true)
  e.setUint16(10, files.length, true)
  e.setUint32(12, directorySize, true)
  e.setUint32(16, offset, true)
  return new Blob([...contents, ...directory, end], { type: 'application/zip' })
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
