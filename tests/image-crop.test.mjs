import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/.vitepress/theme/components/ImageCrop.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
const component = new Function(script.replace('export default', 'return'))()

function editor () {
  const state = component.data()
  for (const [name, method] of Object.entries(component.methods)) state[name] = method.bind(state)
  for (const [name, getter] of Object.entries(component.computed)) {
    Object.defineProperty(state, name, { get: getter.bind(state) })
  }
  state.image = { naturalWidth: 400, naturalHeight: 200 }
  state.imageWidth = 400
  state.imageHeight = 200
  state.crop = { x: 0, y: 0, w: 400, h: 200 }
  state.draw = () => {}
  state.layoutCanvas = () => {}
  return state
}

// Capture where actual canvas commands place the source image's corners.
function context () {
  let matrix = [1, 0, 0, 1, 0, 0]
  const stack = []
  const multiply = ([a, b, c, d, e, f]) => {
    const [A, B, C, D, E, F] = matrix
    matrix = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F]
  }
  return {
    images: [],
    save () { stack.push([...matrix]) },
    restore () { matrix = stack.pop() },
    translate (x, y) { multiply([1, 0, 0, 1, x, y]) },
    scale (x, y) { multiply([x, 0, 0, y, 0, 0]) },
    rotate (angle) { multiply([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]) },
    drawImage (image, x, y) {
      const point = (px, py) => [matrix[0] * px + matrix[2] * py + matrix[4], matrix[1] * px + matrix[3] * py + matrix[5]]
      this.images.push([
        point(x, y), point(x + image.naturalWidth, y),
        point(x, y + image.naturalHeight), point(x + image.naturalWidth, y + image.naturalHeight)
      ])
    }
  }
}

function near (actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} should equal ${expected}`)
}

function interactiveEditor () {
  const state = editor()
  state.display = { width: 200, height: 100, scale: 0.5, offsetX: 80, offsetY: 90, canvasWidth: 360, canvasHeight: 280 }
  const captures = new Set()
  state.$refs = { canvas: {
    style: {}, focus () {},
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    setPointerCapture: id => captures.add(id),
    hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id)
  } }
  const event = (x, y, extra = {}) => ({
    clientX: 10 + state.display.offsetX + x * state.display.scale,
    clientY: 20 + state.display.offsetY + y * state.display.scale,
    pointerId: 1, pointerType: 'mouse', button: 0, preventDefault () {}, ...extra
  })
  return { state, event, captures }
}

test('wheel zoom anchors at the pointer, preserves the crop, and stops at fit and zoom limits', () => {
  const { state, event } = interactiveEditor()
  state.zoomFactor = 2
  const crop = state.crop
  const before = context()
  state.drawTransformedImage(before, 0, 0, 400, 200)
  state.onWheel(event(250, 120, { deltaY: -100, deltaMode: 0 }))
  assert.ok(state.zoomFactor > 2)
  const after = context()
  state.drawTransformedImage(after, 0, 0, 400, 200)
  const ratio = state.zoomFactor / 2
  after.images[0].forEach(([x, y], i) => {
    near(x - 250, (before.images[0][i][0] - 250) * ratio)
    near(y - 120, (before.images[0][i][1] - 120) * ratio)
  })
  assert.equal(state.crop, crop)
  for (let i = 0; i < 10; i++) state.onWheel(event(250, 120, { deltaY: -500, deltaMode: 0 }))
  near(state.zoomFactor, 32)
  for (let i = 0; i < 10; i++) state.onWheel(event(250, 120, { deltaY: 10, deltaMode: 2 }))
  near(state.zoomFactor, 1)
  assertPreviewFits(state)
})

test('mouse dragging moves the crop, touch dragging pans the image, and handles still resize', () => {
  for (const pointerType of ['mouse', 'touch']) {
    const { state, event } = interactiveEditor()
    state.zoomFactor = 2
    state.crop = { x: 100, y: 50, w: 200, h: 100 }
    const crop = { ...state.crop }
    state.onPointerDown(event(200, 100, { pointerType }))
    assert.equal(state.interaction.handle, pointerType === 'mouse' ? 'move' : 'image')
    state.onPointerMove(event(240, 120, { pointerType }))
    if (pointerType === 'mouse') {
      assert.deepEqual(state.crop, { x: 140, y: 70, w: 200, h: 100 })
      assert.deepEqual(state.imageOffset, { x: 0, y: 0 })
    } else {
      near(state.imageOffset.x, 40)
      near(state.imageOffset.y, 20)
      assert.deepEqual(state.crop, crop)
    }
    state.onPointerUp(event(240, 120, { pointerType }))
    assert.equal(state.interaction, null)
  }
  const { state, event } = interactiveEditor()
  state.zoomFactor = 2
  state.crop = { x: 100, y: 50, w: 200, h: 100 }
  state.onPointerDown(event(200, 100, { shiftKey: true }))
  assert.equal(state.interaction.handle, 'image')
  state.onPointerMove(event(230, 110))
  near(state.imageOffset.x, 30)
  near(state.imageOffset.y, 10)
  assert.deepEqual(state.crop, { x: 100, y: 50, w: 200, h: 100 })
  state.onPointerUp(event(230, 110))
  state.onPointerDown(event(200, 100))
  assert.equal(state.interaction.handle, 'move')
  state.onPointerMove(event(230, 110))
  assert.deepEqual(state.crop, { x: 130, y: 60, w: 200, h: 100 })
  state.onPointerUp(event(230, 110))
  state.onPointerDown(event(334, 110))
  assert.equal(state.interaction.handle, 'e')
  state.onPointerMove(event(354, 110))
  assert.equal(state.crop.w, 220)
})

test('mobile pinch zooms and pans, then continues smoothly as a one-finger drag', () => {
  const { state, event, captures } = interactiveEditor()
  const touch = (id, x, y) => event(x, y, { pointerType: 'touch', pointerId: id })
  const crop = state.crop
  state.onPointerDown(touch(1, 150, 100))
  state.onPointerDown(touch(2, 250, 100))
  assert.equal(state.interaction.handle, 'pinch')
  state.onPointerMove(touch(1, 100, 100))
  state.onPointerMove(touch(2, 300, 100))
  near(state.zoomFactor, 2)
  near(state.constrainedImageOffset.x, 0)
  state.onPointerMove(touch(1, 120, 120))
  state.onPointerMove(touch(2, 320, 120))
  near(state.zoomFactor, 2)
  near(state.constrainedImageOffset.x, 20)
  near(state.constrainedImageOffset.y, 20)
  state.onPointerUp(touch(2, 320, 120))
  assert.equal(state.interaction.handle, 'image')
  state.onPointerMove(touch(1, 150, 130))
  near(state.constrainedImageOffset.x, 50)
  near(state.constrainedImageOffset.y, 30)
  state.onPointerUp(touch(1, 150, 130))
  assert.equal(state.interaction, null)
  assert.equal(captures.size, 0)
  assert.deepEqual(state.touchPoints, {})
  assert.equal(state.crop, crop)
})

test('drag limits keep rotated and flipped crops covered even at extreme offsets', () => {
  const state = editor()
  state.zoomFactor = 2
  for (const rotation of [-45, 0, 25, 90, 135, 270]) {
    state.rotation = rotation
    state.updateImageTransform()
    for (const horizontal of [true, false]) {
      for (const vertical of [true, false]) {
        state.flipHorizontal = horizontal
        state.flipVertical = vertical
        for (const offset of [{ x: 10000, y: -10000 }, { x: -10000, y: 10000 }]) {
          state.imageOffset = offset
          state.imageOffset = { ...state.constrainedImageOffset }
          const ctx = context()
          state.drawTransformedImage(ctx, 0, 0, 400, 200)
          assertCovered(ctx.images[0], state.roundedCrop)
        }
      }
    }
  }
})

test('pinching inward fits the entire rotated image and pointer cancellation releases the gesture', () => {
  const { state, event, captures } = interactiveEditor()
  state.zoomFactor = 2
  state.rotation = 30
  state.updateImageTransform()
  const touch = (id, x, y) => event(x, y, { pointerType: 'touch', pointerId: id })
  state.onPointerDown(touch(1, 100, 100))
  state.onPointerDown(touch(2, 300, 100))
  state.onPointerMove(touch(1, 195, 100))
  state.onPointerMove(touch(2, 205, 100))
  near(state.zoomFactor, state.minimumZoomFactor)
  assertPreviewFits(state)
  state.onPointerUp(touch(1, 195, 100))
  state.onPointerUp(touch(2, 205, 100))
  assert.equal(state.interaction, null)
  assert.deepEqual(state.touchPoints, {})
  assert.equal(captures.size, 0)
})

function assertPreviewFits (state) {
  const ctx = context()
  const display = state.display
  state.drawTransformedImage(ctx, display.offsetX, display.offsetY, display.width, display.height)
  for (const [x, y] of ctx.images[0]) {
    assert.ok(x >= 12 - 1e-7 && x <= display.canvasWidth - 12 + 1e-7, `Image corner x=${x} should fit in preview width ${display.canvasWidth}`)
    assert.ok(y >= 12 - 1e-7 && y <= (display.previewHeight || display.canvasHeight) - 12 + 1e-7, `Image corner y=${y} should fit above the rotation controls`)
  }
}

function assertCropFits (state) {
  const { x, y, w, h } = state.displayCrop()
  assert.ok(x >= 12 - 1e-7 && y >= 12 - 1e-7)
  assert.ok(x + w <= state.display.canvasWidth - 12 + 1e-7)
  assert.ok(y + h <= (state.display.previewHeight || state.display.canvasHeight) - 12 + 1e-7)
}

test('crop movement, resizing, keyboard and numeric edits stop at the padded preview regardless of image zoom', () => {
  const { state, event } = interactiveEditor()
  state.rotation = 45
  state.updateImageTransform()
  state.zoomFactor = 32
  const limits = { ...state.cropBounds }
  for (const [dx, dy] of [[-10000, -10000], [10000, 10000], [-10000, 10000], [10000, -10000]]) {
    state.crop = { x: 100, y: 50, w: 200, h: 100 }
    state.onPointerDown(event(200, 100))
    state.onPointerMove(event(200 + dx, 100 + dy))
    state.onPointerUp(event(200 + dx, 100 + dy))
    assertCropFits(state)
    assert.deepEqual(state.cropBounds, limits)
  }
  state.crop = { x: 100, y: 50, w: 200, h: 100 }
  state.onPointerDown(event(305, 155))
  assert.equal(state.interaction.handle, 'se')
  state.onPointerMove(event(10000, 10000))
  state.onPointerUp(event(10000, 10000))
  assertCropFits(state)
  for (const [key, value] of [['x', -10000], ['y', -10000], ['w', 10000], ['h', 10000]]) {
    state.updateCropValue(key, { target: { value: String(value) } })
    assertCropFits(state)
  }
  for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
    state.onCanvasKeydown({ key, shiftKey: true, preventDefault () {} })
    assertCropFits(state)
  }
})

test('full-image reset fits the rotated image and uses the crop frame padding for minimum-zoom pan limits', () => {
  const { state, event } = interactiveEditor()
  state.crop = { x: 100, y: 50, w: 200, h: 100 }
  state.rotateImage(90)
  state.zoomFactor = 16
  state.onCanvasDoubleClick(event(200, 100))
  near(state.zoomFactor, state.minimumZoomFactor)
  assertPreviewFits(state)
  assertCropFits(state)
  near(state.crop.w, state.transformedImageBounds.w)
  near(state.crop.h, state.transformedImageBounds.h)
  for (const direction of [-1, 1]) {
    state.imageOffset = { x: direction * 10000, y: direction * 10000 }
    state.imageOffset = { ...state.constrainedImageOffset }
    const image = state.transformedImageBounds
    near(image.x, direction < 0 ? state.cropBounds.left : state.cropBounds.right - image.w)
    near(image.y, direction < 0 ? state.cropBounds.top : state.cropBounds.bottom - image.h)
    assertPreviewFits(state)
  }
})

test('maximum zoom out shows every image corner for landscape and portrait sources at any rotation', () => {
  for (const [width, height] of [[400, 200], [200, 400], [1600, 300], [300, 1600]]) {
    for (const rotation of [-45, 0, 30, 90, 180, 270]) {
      const { state, event } = interactiveEditor()
      state.image = { naturalWidth: width, naturalHeight: height }
      state.imageWidth = width
      state.imageHeight = height
      state.crop = { x: 0, y: 0, w: width, h: height }
      const scale = Math.min(336 / width, 196 / height, 1)
      state.display = {
        scale, width: width * scale, height: height * scale,
        canvasWidth: 360, canvasHeight: 320, previewHeight: 220,
        offsetX: (360 - width * scale) / 2, offsetY: (220 - height * scale) / 2
      }
      state.rotation = rotation
      state.flipHorizontal = true
      state.updateImageTransform()
      state.imageOffset = { x: 1000, y: -1000 }
      for (let i = 0; i < 30; i++) state.onWheel(event(width / 3, height / 3, { deltaY: 500, deltaMode: 0 }))
      near(state.zoomFactor, state.minimumZoomFactor)
      assertPreviewFits(state)
      assert.deepEqual(state.roundedCrop, { x: 0, y: 0, w: width, h: height })
    }
  }
})

test('dragging the crop over a zoomed-out rotated image keeps image position and scale fixed', () => {
  const { state, event } = interactiveEditor()
  state.crop = { x: 100, y: 50, w: 200, h: 100 }
  state.rotation = 30
  state.updateImageTransform()
  state.zoomImage(state.minimumZoomFactor, { x: 200, y: 100 })
  const before = context()
  state.drawTransformedImage(before, 0, 0, 400, 200)
  state.onPointerDown(event(200, 100))
  state.onPointerMove(event(230, 110))
  state.onPointerUp(event(230, 110))
  assert.deepEqual(state.crop, { x: 130, y: 60, w: 200, h: 100 })
  const after = context()
  state.drawTransformedImage(after, 0, 0, 400, 200)
  assert.deepEqual(after.images, before.images)
})

test('a 90-degree crop moves above and below the original image and resets to the full portrait image', () => {
  const { state, event } = interactiveEditor()
  state.rotateImage(90)
  state.zoomImage(0.5, { x: 200, y: 100 })
  near(state.imageZoom, 1)
  assert.deepEqual(state.transformedImageBounds, { x: 100, y: -100, w: 200, h: 400 })
  state.crop = { x: 150, y: 0, w: 100, h: 100 }
  const before = context()
  state.drawTransformedImage(before, 0, 0, 400, 200)
  state.onPointerDown(event(200, 50))
  state.onPointerMove(event(200, -50))
  state.onPointerUp(event(200, -50))
  assert.equal(state.roundedCrop.y, -100)
  state.onPointerDown(event(200, -50))
  state.onPointerMove(event(200, 250))
  state.onPointerUp(event(200, 250))
  assert.equal(state.roundedCrop.y, 200)
  state.onCanvasKeydown({ key: 'ArrowDown', preventDefault () {} })
  assert.equal(state.roundedCrop.y, 201)
  state.updateCropValue('y', { target: { value: '-100' } })
  assert.equal(state.roundedCrop.y, -100)
  state.onCanvasDoubleClick(event(200, -50))
  assert.deepEqual(state.roundedCrop, { x: 100, y: -100, w: 200, h: 400 })
  assert.deepEqual(state.outputSize, { w: 200, h: 400 })
  const after = context()
  state.drawTransformedImage(after, 0, 0, 400, 200)
  assert.deepEqual(after.images, before.images)
})

test('rotated crop handles and numeric dimensions can extend beyond the original height', () => {
  const { state, event } = interactiveEditor()
  state.rotateImage(90)
  state.zoomImage(0.5, { x: 200, y: 100 })
  state.crop = { x: 125, y: -50, w: 150, h: 150 }
  state.onPointerDown(event(200, 104))
  assert.equal(state.interaction.handle, 's')
  state.onPointerMove(event(200, 304))
  state.onPointerUp(event(200, 304))
  assert.deepEqual(state.roundedCrop, { x: 125, y: -50, w: 150, h: 350 })
  state.updateCropValue('y', { target: { value: '-100' } })
  state.updateCropValue('h', { target: { value: '400' } })
  assert.equal(state.roundedCrop.y, -100)
  assert.equal(state.roundedCrop.h, 400)
})

test('full-image reset follows rotation, zoom and pan while round crops retain their square ratio', () => {
  const state = editor()
  state.display = { width: 400, height: 200, scale: 1, offsetX: 12, offsetY: 212, canvasWidth: 424, canvasHeight: 624, previewHeight: 624 }
  state.rotateImage(-90)
  state.zoomImage(0.5, { x: 200, y: 100 })
  state.imageOffset = { x: 30, y: -40 }
  state.resetCrop()
  assert.deepEqual(state.roundedCrop, { x: 130, y: -140, w: 200, h: 400 })
  state.cropShape = 'round'
  state.aspect = '1'
  state.resetCrop()
  assert.deepEqual(state.roundedCrop, { x: 130, y: -40, w: 200, h: 200 })
})

test('preview canvas spans the full checkerboard stage while the crop remains centered', t => {
  const state = editor()
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
  })
  globalThis.window = { devicePixelRatio: 2 }
  const canvas = {}
  state.$refs = { stage: { clientWidth: 800, clientHeight: 600 }, canvas }
  component.methods.layoutCanvas.call(state)
  assert.equal(canvas.width, 1600)
  assert.equal(canvas.height, 1200)
  assert.equal(state.display.canvasWidth, 800)
  assert.equal(state.display.canvasHeight, 600)
  assert.deepEqual(state.displayCrop(), { x: 200, y: 200, w: 400, h: 200 })
  state.zoomFactor = 2
  const ctx = context()
  state.drawTransformedImage(ctx, state.display.offsetX, state.display.offsetY, state.display.width, state.display.height)
  near(ctx.images[0][0][0], 0)
  near(ctx.images[0][1][0], 800)

  state.crop = { x: state.cropBounds.left, y: state.cropBounds.top, w: state.cropBounds.w, h: state.cropBounds.h }
  state.$refs.stage = { clientWidth: 280, clientHeight: 240, offsetTop: 0 }
  state.$refs.transformPanel = { offsetTop: 200 }
  component.methods.layoutCanvas.call(state)
  assertCropFits(state)
  assert.equal(state.display.previewHeight, 200)
})

test('rotation slider is symmetric, precise near zero, and reaches both 45-degree limits', () => {
  const state = editor()
  const crop = { ...state.crop }
  const angleAt = position => {
    state.updateRotation({ target: { value: String(position) } })
    near(state.rotationSliderPosition, position)
    assert.deepEqual(state.crop, crop)
    return state.rotation
  }
  near(angleAt(-45), -45)
  near(angleAt(0), 0)
  near(angleAt(45), 45)
  for (const position of [0.01, 5, 22.5, 40]) {
    const positive = angleAt(position)
    near(angleAt(-position), -positive)
  }
  const centerChange = angleAt(5) - angleAt(0)
  const endChange = angleAt(45) - angleAt(40)
  assert.ok(centerChange < endChange / 5)
  state.resetRotation()
  near(state.rotationSliderPosition, 0)
})

test('quarter turns keep the crop and workspace fixed and return to the intact original after a full turn', () => {
  const state = editor()
  const original = state.image
  const crop = state.crop
  const display = state.display
  state.rotateImage(90)
  assert.equal(state.crop, crop)
  assert.equal(state.display, display)
  assert.deepEqual(state.roundedCrop, { x: 0, y: 0, w: 400, h: 200 })
  assert.equal(state.imageWidth, 400)
  assert.equal(state.imageHeight, 200)
  near(state.imageZoom, 2)
  const ctx = context()
  state.drawTransformedImage(ctx, 0, 0, 400, 200)
  const expected = [[400, -300], [400, 500], [0, -300], [0, 500]]
  ctx.images[0].forEach((point, i) => point.forEach((value, j) => near(value, expected[i][j])))
  for (let i = 0; i < 3; i++) state.rotateImage(90)
  assert.deepEqual(state.roundedCrop, { x: 0, y: 0, w: 400, h: 200 })
  assert.equal(state.image, original)
  near(state.imageZoom, 1)
  state.rotateImage(-90)
  assert.equal(state.quarterRotation, 270)
  assert.equal(state.imageWidth, 400)
  assert.equal(state.imageHeight, 200)
})

test('flip buttons mirror the displayed axes and toggle back without altering the source', () => {
  const state = editor()
  state.rotateImage(90)
  const original = context()
  state.drawTransformedImage(original, 0, 0, 400, 200)
  state.toggleFlip('horizontal')
  let ctx = context()
  state.drawTransformedImage(ctx, 0, 0, 400, 200)
  ctx.images[0].forEach(([x, y], i) => {
    near(x, 400 - original.images[0][i][0])
    near(y, original.images[0][i][1])
  })
  state.toggleFlip('vertical')
  ctx = context()
  state.drawTransformedImage(ctx, 0, 0, 400, 200)
  ctx.images[0].forEach(([x, y], i) => {
    near(x, 400 - original.images[0][i][0])
    near(y, 200 - original.images[0][i][1])
  })
  state.toggleFlip('horizontal')
  state.toggleFlip('vertical')
  assert.equal(state.flipHorizontal, false)
  assert.equal(state.flipVertical, false)
  assert.deepEqual(state.roundedCrop, { x: 0, y: 0, w: 400, h: 200 })
})

// Invert the rendered image's axes to check actual coverage of the fixed crop.
function assertCovered (corners, crop) {
  const [origin, right, bottom] = corners
  const ux = right[0] - origin[0]
  const uy = right[1] - origin[1]
  const vx = bottom[0] - origin[0]
  const vy = bottom[1] - origin[1]
  const determinant = ux * vy - uy * vx
  for (const x of [crop.x, crop.x + crop.w]) {
    for (const y of [crop.y, crop.y + crop.h]) {
      const dx = x - origin[0]
      const dy = y - origin[1]
      const u = (dx * vy - dy * vx) / determinant
      const v = (ux * dy - uy * dx) / determinant
      assert.ok(u >= -1e-9 && u <= 1 + 1e-9, `Crop corner ${x}, ${y} is outside the source width`)
      assert.ok(v >= -1e-9 && v <= 1 + 1e-9, `Crop corner ${x}, ${y} is outside the source height`)
    }
  }
}

test('rotation automatically fills full, off-center, square, and portrait crops without moving them', () => {
  const state = editor()
  for (const crop of [
    { x: 0, y: 0, w: 400, h: 200 },
    { x: 0, y: 10, w: 180, h: 90 },
    { x: 290, y: 100, w: 100, h: 100 },
    { x: 180, y: 0, w: 70, h: 200 }
  ]) {
    state.crop = { ...crop }
    for (const quarter of [0, 90, 180, 270]) {
      state.quarterRotation = quarter
      for (const angle of [-45, -12.5, 0, 22.7, 45]) {
        for (const flips of [[false, false], [true, false], [false, true], [true, true]]) {
          state.rotation = angle
          ;[state.flipHorizontal, state.flipVertical] = flips
          state.updateImageTransform()
          assert.deepEqual(state.crop, crop)
          assert.deepEqual(state.outputSize, { w: crop.w, h: crop.h })
          const ctx = context()
          state.drawTransformedImage(ctx, 0, 0, state.imageWidth, state.imageHeight)
          assertCovered(ctx.images[0], crop)
        }
      }
    }
  }
})

test('rotation avoids unnecessary zoom for a small centered crop and resets without accumulating zoom', () => {
  const state = editor()
  state.crop = { x: 160, y: 60, w: 80, h: 80 }
  for (const angle of [-45, 0, 45, 0]) {
    state.rotation = angle
    state.updateImageTransform()
    near(state.imageZoom, 1)
  }
  state.resetCrop()
  state.rotation = 45
  state.updateImageTransform()
  assert.ok(state.imageZoom > 1)
  state.resetRotation()
  near(state.imageZoom, 1)
})

test('rotating a square crop repeatedly preserves its selected size', () => {
  const state = editor()
  state.aspect = '1'
  state.crop = { x: 100, y: 0, w: 200, h: 200 }
  for (let i = 0; i < 4; i++) {
    state.rotateImage(90)
    near(state.crop.w, 200)
    near(state.crop.h, 200)
  }
  for (const angle of [45, 0, -45, 0]) {
    state.rotation = angle
    state.updateImageTransform()
    near(state.crop.w, 200)
    near(state.crop.h, 200)
  }
})

test('slider reset keeps quarter turns and flips while the Reset button restores the original orientation', () => {
  const state = editor()
  state.rotateImage(90)
  state.rotation = 22.5
  state.updateImageTransform()
  state.toggleFlip('horizontal')
  state.resetRotation()
  assert.equal(state.rotation, 0)
  assert.equal(state.quarterRotation, 90)
  assert.equal(state.flipHorizontal, true)
  assert.equal(state.imageWidth, 400)
  assert.equal(state.imageHeight, 200)

  state.rotation = -15
  state.updateImageTransform()
  state.toggleFlip('vertical')
  state.resetTransforms()
  assert.equal(state.rotation, 0)
  assert.equal(state.quarterRotation, 0)
  assert.equal(state.flipHorizontal, false)
  assert.equal(state.flipVertical, false)
  assert.deepEqual(state.roundedCrop, { x: 0, y: 0, w: 400, h: 200 })
  const ctx = context()
  state.drawTransformedImage(ctx, 0, 0, 400, 200)
  assert.deepEqual(ctx.images[0], [[0, 0], [400, 0], [0, 200], [400, 200]])
})

test('export applies the preview transform with the selected crop and output size', async t => {
  const state = editor()
  state.rotation = 17.5
  state.updateImageTransform()
  state.rotateImage(-90)
  state.toggleFlip('horizontal')
  state.toggleFlip('vertical')
  state.crop = { x: 35, y: 20, w: 120, h: 180 }
  state.zoomFactor = 2.5
  state.imageOffset = { x: 30, y: -20 }
  const preview = context()
  state.drawTransformedImage(preview, 0, 0, state.imageWidth, state.imageHeight)
  const output = context()
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  t.after(() => {
    if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument)
    else delete globalThis.document
  })
  let canvas
  globalThis.document = {
    createElement (tag) {
      assert.equal(tag, 'canvas')
      canvas = { getContext: () => output, toBlob: (callback, type) => callback(new Blob(['encoded image'], { type })) }
      return canvas
    }
  }
  const blob = await state.createCroppedBlob(state.roundedCrop, { w: 240, h: 90 })
  assert.equal(blob.type, 'image/png')
  assert.equal(canvas.width, 240)
  assert.equal(canvas.height, 90)
  assertCovered(output.images[0], { x: 0, y: 0, w: 240, h: 90 })
  output.images[0].forEach(([x, y], index) => {
    near(x, (preview.images[0][index][0] - 35) * 2)
    near(y, (preview.images[0][index][1] - 20) * 0.5)
  })

  state.resetTransforms()
  state.display = { width: 400, height: 200, scale: 1, offsetX: 12, offsetY: 112, canvasWidth: 424, canvasHeight: 424, previewHeight: 424 }
  state.resetCrop()
  state.rotateImage(90)
  state.zoomImage(0.5, { x: 200, y: 100 })
  state.resetCrop()
  await state.createCroppedBlob(state.roundedCrop, state.outputSize)
  assert.equal(canvas.width, 200)
  assert.equal(canvas.height, 400)
  const expected = [[200, 0], [200, 400], [0, 0], [0, 400]]
  output.images.at(-1).forEach((point, i) => point.forEach((value, j) => near(value, expected[i][j])))
})
