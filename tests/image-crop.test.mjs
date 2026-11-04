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
  state.freeformAspect = 2
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

test('wheel zoom anchors at the pointer, preserves the crop, and stops at coverage and zoom limits', () => {
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
  assertImageCoversCrop(state)
})

test('zoom slider adjusts smoothly, follows wheel zoom and keeps rotated frames covered', () => {
  for (const angle of [0, 30, 90, 135]) {
    const { state, event } = interactiveEditor()
    state.rotation = angle
    state.updateImageTransform()
    const crop = { ...state.crop }
    const display = state.display
    let previous = 0
    for (const position of [0, 0.01, 0.02, 0.1, 10, 50, 100]) {
      state.updateZoom({ target: { value: String(position) } })
      near(state.zoomSliderPosition, position)
      assert.ok(state.zoomFactor > previous)
      if (position === 0.01) assert.ok(state.zoomFactor / previous < 1.001)
      previous = state.zoomFactor
      assertImageCoversCrop(state)
      assert.deepEqual(state.crop, crop)
      assert.equal(state.display, display)
    }
    near(state.zoomFactor, 32)
    state.updateZoom({ target: { value: '-10' } })
    near(state.zoomFactor, state.minimumZoomFactor)
    state.onWheel(event(200, 100, { deltaY: -100, deltaMode: 0 }))
    assert.ok(state.zoomSliderPosition > 0)
    near(state.zoomSliderPosition, 100 * Math.log(state.zoomFactor / state.minimumZoomFactor) / Math.log(32 / state.minimumZoomFactor))
    const zoom = state.zoomFactor
    state.updateZoom({ target: { value: 'invalid' } })
    near(state.zoomFactor, zoom)
    state.interaction = { handle: 'image' }
    state.updateZoom({ target: { value: '0' } })
    near(state.zoomFactor, zoom)
  }
})

test('mouse, touch and pen drag the image at the center, edges and former crop handles without moving the frame', () => {
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    for (const [x, y] of [[200, 100], [100, 50], [200, 50], [300, 50], [300, 100], [300, 150], [200, 150], [100, 150], [100, 100], [20, 20]]) {
      const { state, event, captures } = interactiveEditor()
      state.zoomFactor = 2
      state.crop = { x: 100, y: 50, w: 200, h: 100 }
      const crop = { ...state.crop }
      state.onPointerDown(event(x, y, { pointerType }))
      assert.equal(state.interaction.handle, 'image')
      assert.equal(state.$refs.canvas.style.cursor, 'grabbing')
      state.onPointerMove(event(x + 40, y + 20, { pointerType }))
      near(state.imageOffset.x, 40)
      near(state.imageOffset.y, 20)
      assert.deepEqual(state.crop, crop)
      state.onPointerUp(event(x + 40, y + 20, { pointerType }))
      assert.equal(state.interaction, null)
      assert.equal(state.$refs.canvas.style.cursor, 'grab')
      assert.equal(captures.size, 0)
    }
  }
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

test('pinching inward stops at crop coverage and pointer cancellation releases the gesture', () => {
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
  assertImageCoversCrop(state)
  state.onPointerUp(touch(1, 195, 100))
  state.onPointerUp(touch(2, 205, 100))
  assert.equal(state.interaction, null)
  assert.deepEqual(state.touchPoints, {})
  assert.equal(captures.size, 0)
})

function assertImageCoversCrop (state) {
  const ctx = context()
  state.drawTransformedImage(ctx, 0, 0, state.imageWidth, state.imageHeight)
  assertCovered(ctx.images[0], state.roundedCrop)
}

test('frame uses the maximum preview area for every ratio and stays centered through resize and zoom', t => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  t.after(() => {
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow)
    else delete globalThis.window
  })
  globalThis.window = { devicePixelRatio: 2 }
  for (const [width, height] of [[400, 200], [200, 400], [40, 20], [403, 201]]) {
    const state = editor()
    state.image = { naturalWidth: width, naturalHeight: height }
    state.imageWidth = width
    state.imageHeight = height
    for (const ratio of [1 / 16, 0.5625, 0.75, 1, 4 / 3, 16 / 9, 2, 16]) {
      state.freeformAspect = ratio
      state.applyAspectRatio()
      for (const [canvasWidth, canvasHeight, previewHeight] of [[800, 600, 500], [280, 240, 160], [360, 800, 650]]) {
        const canvas = {}
        state.$refs = {
          stage: { clientWidth: canvasWidth, clientHeight: canvasHeight, offsetTop: 0 },
          transformPanel: { offsetTop: previewHeight }, canvas
        }
        const crop = { ...state.crop }
        const output = state.outputSize
        component.methods.layoutCanvas.call(state)
        assert.equal(canvas.width, canvasWidth * 2)
        assert.equal(canvas.height, canvasHeight * 2)
        const box = state.displayCrop()
        near(box.x + box.w / 2, canvasWidth / 2)
        near(box.y + box.h / 2, previewHeight / 2)
        assert.ok(box.x >= 12 - 1e-7 && box.y >= 12 - 1e-7)
        assert.ok(Math.abs(box.w - (canvasWidth - 24)) < 1e-7 || Math.abs(box.h - (previewHeight - 24)) < 1e-7)
        assert.deepEqual(state.crop, crop)
        assert.deepEqual(state.outputSize, output)
        state.zoomImage(3, { x: width / 2, y: height / 2 })
        assert.deepEqual(state.displayCrop(), box)
        assertImageCoversCrop(state)
      }
    }
  }
})

test('preview canvas fits beside the sidebar and below the toolbar while the image extends behind zoom controls', t => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  t.after(() => {
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow)
    else delete globalThis.window
  })
  globalThis.window = { devicePixelRatio: 2 }
  const state = editor()
  state.$refs = {
    stage: { clientWidth: 800, clientHeight: 600, offsetTop: 0 },
    toolbar: { offsetHeight: 48 },
    transformPanel: { offsetTop: 500 },
    zoomPanel: { clientWidth: 56 },
    settingsPanel: { clientWidth: 208, offsetTop: 0 },
    canvas: {}
  }
  state.zoomFactor = 2
  component.methods.layoutCanvas.call(state)
  assert.equal(state.$refs.canvas.width, 1600)
  assert.equal(state.$refs.canvas.height, 1200)
  assert.deepEqual(state.displayCrop(), { x: 68, y: 70, w: 720, h: 360 })
  const ctx = context()
  const d = state.display
  state.drawTransformedImage(ctx, d.offsetX, d.offsetY, d.width, d.height)
  assert.ok(ctx.images[0][0][0] < 0, 'Zoomed image extends across the zoom panel to the canvas edge')
  assertImageCoversCrop(state)
  state.$refs.zoomPanel.clientWidth = 0
  state.$refs.stage.clientWidth = 800
  state.$refs.settingsPanel.offsetTop = 600
  component.methods.layoutCanvas.call(state)
  assert.deepEqual(state.displayCrop(), { x: 12, y: 56, w: 776, h: 388 })
})

test('freeform slider updates proportions in both orientations and keeps locked output proportions in sync', () => {
  const state = editor()
  state.resizeEnabled = true
  state.resizeWidth = 600
  for (const position of [-4, -1, 0, 1, 4]) {
    state.updateFreeformAspect({ target: { value: String(position) } })
    near(state.aspectValue, 2 ** position)
    near(state.freeformSliderPosition, position)
    near(state.crop.w / state.crop.h, 2 ** position)
    near(state.crop.x + state.crop.w / 2, state.imageWidth / 2)
    near(state.crop.y + state.crop.h / 2, state.imageHeight / 2)
    assert.ok(Math.abs(state.resizeWidth - state.resizeHeight * state.resizeRatio) <= (1 + state.resizeRatio) / 2)
    assertImageCoversCrop(state)
  }
  const crop = state.crop
  state.updateFreeformAspect({ target: { value: 'invalid' } })
  assert.equal(state.crop, crop)
  state.aspect = '0.75'
  state.applyAspectRatio()
  near(state.crop.w / state.crop.h, 0.75)
  state.cropShape = 'round'
  state.onCropShapeChange()
  near(state.aspectValue, 1)
  assert.equal(state.roundedCrop.w, state.roundedCrop.h)
  assert.equal(state.resizeWidth, state.resizeHeight)
})

test('wheel zoom, extreme pointer drags and arrow keys never expose empty frame space at any rotation or flip', () => {
  for (const [width, height] of [[400, 200], [200, 400], [1600, 300], [300, 1600], [403, 201]]) {
    for (const ratio of [1 / 16, 0.5625, 1, 16 / 9, 16]) {
      for (const rotation of [-45, 0, 30, 90, 135, 270]) {
        for (const [horizontal, vertical] of [[false, false], [true, false], [false, true], [true, true]]) {
          const { state, event } = interactiveEditor()
          state.image = { naturalWidth: width, naturalHeight: height }
          state.imageWidth = width
          state.imageHeight = height
          state.freeformAspect = ratio
          state.rotation = rotation
          state.flipHorizontal = horizontal
          state.flipVertical = vertical
          state.applyAspectRatio()
          const crop = { ...state.crop }
          for (const zoom of [32, 2, 0.001]) {
            state.zoomImage(zoom, { x: width / 3, y: height / 3 })
            assertImageCoversCrop(state)
            for (const direction of [-1, 1]) {
              state.onPointerDown(event(width / 2, height / 2))
              state.onPointerMove(event(direction * 100000, -direction * 100000))
              state.onPointerUp(event(direction * 100000, -direction * 100000))
              assertImageCoversCrop(state)
            }
          }
          state.onWheel(event(width / 2, height / 2, { deltaY: 5000, deltaMode: 2 }))
          near(state.zoomFactor, state.minimumZoomFactor)
          assertImageCoversCrop(state)
          for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
            state.onCanvasKeydown({ key, shiftKey: true, preventDefault () {} })
            assertImageCoversCrop(state)
          }
          assert.deepEqual(state.crop, crop)
        }
      }
    }
  }
})

test('crop reset restores centered framing and minimum zoom while preserving the selected preset and shape', () => {
  const { state, event } = interactiveEditor()
  state.aspect = '0.75'
  state.applyAspectRatio()
  state.rotateImage(90)
  state.zoomImage(4, { x: 200, y: 100 })
  state.imageOffset = { x: 30, y: -40 }
  state.resetCrop()
  near(state.crop.w / state.crop.h, 4 / 3)
  near(state.zoomFactor, 1)
  assert.deepEqual(state.imageOffset, { x: 0, y: 0 })
  assertImageCoversCrop(state)
  state.onCanvasDoubleClick(event(200, 100))
  assert.equal(state.aspect, 'free')
  near(state.aspectValue, 0.5)
  assertImageCoversCrop(state)
  state.cropShape = 'squircle'
  state.onCropShapeChange()
  state.resetCrop()
  assert.equal(state.roundedCrop.w, state.roundedCrop.h)
  assertImageCoversCrop(state)
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

test('quarter turns rotate the crop proportions and keep the complete image visible at minimum zoom', () => {
  const state = editor()
  const original = state.image
  const display = state.display
  state.rotateImage(90)
  assert.equal(state.display, display)
  assert.deepEqual(state.roundedCrop, { x: 100, y: -100, w: 200, h: 400 })
  assert.equal(state.imageWidth, 400)
  assert.equal(state.imageHeight, 200)
  near(state.imageZoom, 1)
  const ctx = context()
  state.drawTransformedImage(ctx, 0, 0, 400, 200)
  const expected = [[300, -100], [300, 300], [100, -100], [100, 300]]
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

test('fully zoomed-out images fit the preview before and after quarter turns in either direction', t => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  t.after(() => {
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow)
    else delete globalThis.window
  })
  globalThis.window = { devicePixelRatio: 1 }
  for (const [width, height] of [[400, 200], [200, 400], [1600, 300], [403, 201]]) {
    for (const [canvasWidth, previewHeight] of [[800, 500], [280, 400]]) {
      for (const turn of [-90, 90]) {
        for (const [horizontal, vertical] of [[false, false], [true, false], [false, true], [true, true]]) {
          const { state, event } = interactiveEditor()
          state.image = { naturalWidth: width, naturalHeight: height }
          state.imageWidth = width
          state.imageHeight = height
          state.flipHorizontal = horizontal
          state.flipVertical = vertical
          state.$refs.stage = { clientWidth: canvasWidth, clientHeight: previewHeight + 100, offsetTop: 0 }
          state.$refs.transformPanel = { offsetTop: previewHeight }
          state.layoutCanvas = component.methods.layoutCanvas.bind(state)
          state.resetCrop()
          const assertFits = () => {
            const ctx = context()
            const d = state.display
            state.drawTransformedImage(ctx, d.offsetX, d.offsetY, d.width, d.height)
            const box = state.displayCrop()
            for (const [x, y] of ctx.images[0]) {
              assert.ok(x >= box.x - 1e-7 && x <= box.x + box.w + 1e-7)
              assert.ok(y >= box.y - 1e-7 && y <= box.y + box.h + 1e-7)
              assert.ok(x >= 12 - 1e-7 && x <= canvasWidth - 12 + 1e-7)
              assert.ok(y >= 12 - 1e-7 && y <= previewHeight - 12 + 1e-7)
            }
            near(box.x + box.w / 2, canvasWidth / 2)
            near(box.y + box.h / 2, previewHeight / 2)
            near(state.imageZoom, 1)
            assertImageCoversCrop(state)
          }
          assertFits()
          for (let i = 1; i <= 4; i++) {
            state.rotateImage(turn)
            assert.deepEqual(state.outputSize, i % 2 ? { w: height, h: width } : { w: width, h: height })
            assertFits()
            state.zoomImage(3, { x: width / 2, y: height / 2 })
            for (let j = 0; j < 4; j++) state.onWheel(event(width / 2, height / 2, { deltaY: 5000, deltaMode: 2 }))
            assertFits()
          }
        }
      }
    }
  }
})

test('quarter turns swap aspect presets and locked output dimensions and rotate the image position', () => {
  const state = editor()
  state.aspect = '1.7777777778'
  state.applyAspectRatio()
  state.resizeEnabled = true
  state.resizeWidth = 1600
  state.resizeHeight = 900
  state.zoomFactor = 3
  state.imageOffset = { x: 30, y: -20 }
  state.rotateImage(90)
  assert.equal(state.aspect, '0.5625')
  assert.deepEqual(state.outputSize, { w: 900, h: 1600 })
  near(state.imageOffset.x, 20)
  near(state.imageOffset.y, 30)
  assertImageCoversCrop(state)
  state.resetTransforms()
  assert.equal(state.aspect, '1.7777777778')
  assert.deepEqual(state.outputSize, { w: 1600, h: 900 })
  assertImageCoversCrop(state)
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
  assert.deepEqual(state.roundedCrop, { x: 100, y: -100, w: 200, h: 400 })
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
  state.resetCrop()
  state.rotateImage(90)
  state.zoomImage(0.001, { x: 200, y: 100 })
  await state.createCroppedBlob(state.roundedCrop, state.outputSize)
  assert.equal(canvas.width, 200)
  assert.equal(canvas.height, 400)
  assertCovered(output.images.at(-1), { x: 0, y: 0, w: 200, h: 400 })
})
