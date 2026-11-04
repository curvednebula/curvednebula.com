<template>
  <div class="crop-tool">
    <section
      v-if="!image"
      class="drop-zone"
      :class="{ 'is-dragging': isDraggingOver }"
      @dragenter.prevent="isDraggingOver = true"
      @dragover.prevent="isDraggingOver = true"
      @dragleave.prevent="isDraggingOver = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        class="visually-hidden"
        type="file"
        accept="image/*"
        @change="onFileSelected"
      >
      <div class="upload-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>
        </svg>
      </div>
      <h2>Choose an image to crop or resize</h2>
      <p>Drop an image here, or select one from your device.</p>
      <button class="primary-button" type="button" @click="openFilePicker">
        Select image
      </button>
      <span class="privacy-note">Your image never leaves your device.</span>
    </section>

    <div v-else class="workspace">
      <div class="toolbar">
        <div class="file-summary">
          <span class="file-name" :title="sourceName">{{ sourceName }}</span>
          <span>{{ imageWidth }} × {{ imageHeight }} px</span>
        </div>
        <button class="text-button" type="button" @click="openFilePicker">
          Another Image
        </button>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept="image/*"
          @change="onFileSelected"
        >
      </div>

      <div class="editor-layout">
        <section class="canvas-panel">
          <div ref="stage" class="canvas-stage">
            <canvas
              ref="canvas"
              tabindex="0"
              aria-label="Image crop area. Drag to move the crop, Shift-drag to move the image, scroll or pinch to zoom, and use handles to resize the crop."
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @wheel.prevent="onWheel"
              @dblclick="onCanvasDoubleClick"
              @keydown="onCanvasKeydown"
            />
          </div>
          <div ref="transformPanel" class="transform-panel" aria-label="Image transforms">
            <div class="rotation-control">
              <div class="rotation-label">
                <label for="image-rotation">Rotation</label>
                <output for="image-rotation">{{ Math.round(rotation * 100) / 100 }}°</output>
              </div>
              <input
                id="image-rotation"
                :value="rotationSliderPosition"
                type="range"
                min="-45"
                max="45"
                step="0.01"
                :aria-valuetext="`${Math.round(rotation * 100) / 100} degrees`"
                @input="updateRotation"
                @dblclick="resetRotation"
              >
            </div>
            <div class="transform-buttons">
              <button class="transform-button" type="button" title="Rotate left 90°" aria-label="Rotate left 90 degrees" @click="rotateImage(-90)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></svg>
                <span>−90°</span>
              </button>
              <button class="transform-button" type="button" title="Rotate right 90°" aria-label="Rotate right 90 degrees" @click="rotateImage(90)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10a8 8 0 1 0-1 7M20 4v6h-6"/></svg>
                <span>+90°</span>
              </button>
              <button class="transform-button" type="button" title="Flip horizontally" aria-label="Flip horizontally" :aria-pressed="flipHorizontal" @click="toggleFlip('horizontal')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M8 6 3 12l5 6V6Zm8 0 5 6-5 6V6Z"/></svg>
              </button>
              <button class="transform-button" type="button" title="Flip vertically" aria-label="Flip vertically" :aria-pressed="flipVertical" @click="toggleFlip('vertical')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M6 8l6-5 6 5H6Zm0 8 6 5 6-5H6Z"/></svg>
              </button>
              <button class="transform-button" type="button" title="Reset image transforms" aria-label="Reset image transforms" @click="resetTransforms">
                Reset
              </button>
            </div>
          </div>
        </section>

        <aside class="settings-panel">
          <div class="setting-group">
            <label for="crop-shape">Crop shape</label>
            <select id="crop-shape" v-model="cropShape" @change="onCropShapeChange">
              <option value="square">Square corners</option>
              <option value="round">Round</option>
              <option value="squircle">Squircle</option>
              <option value="rounded">Rounded corners</option>
            </select>
            <label v-if="cropShape === 'rounded'" class="radius-control">
              <span>Corner radius (output px)</span>
              <input
                :value="effectiveCornerRadius"
                type="number"
                min="0"
                :max="maxCornerRadius"
                @change="updateCornerRadius"
              >
            </label>
          </div>

          <div class="setting-group">
            <label for="crop-aspect">Aspect ratio</label>
            <select
              id="crop-aspect"
              v-model="aspect"
              :disabled="isSquareShapeLocked"
              @change="applyAspectRatio"
            >
              <option value="free">Freeform</option>
              <option value="1">Square · 1:1</option>
              <option value="1.3333333333">Landscape · 4:3</option>
              <option value="0.75">Portrait · 3:4</option>
              <option value="1.5">Photo · 3:2</option>
              <option value="0.6666666667">Vertical Photo · 2:3</option>
              <option value="1.7777777778">Widescreen · 16:9</option>
              <option value="0.5625">Story · 9:16</option>
            </select>
          </div>

          <div class="setting-group">
            <div class="setting-heading">
              <span>Crop area</span>
              <button class="mini-button" type="button" @click="resetCrop">Reset</button>
            </div>
            <div class="number-grid">
              <label>
                <span>X</span>
                <input
                  :value="roundedCrop.x"
                  type="number"
                  :min="cropBounds.left"
                  :max="cropBounds.right - roundedCrop.w"
                  @change="updateCropValue('x', $event)"
                >
              </label>
              <label>
                <span>Y</span>
                <input
                  :value="roundedCrop.y"
                  type="number"
                  :min="cropBounds.top"
                  :max="cropBounds.bottom - roundedCrop.h"
                  @change="updateCropValue('y', $event)"
                >
              </label>
              <label>
                <span>Width</span>
                <input
                  :value="roundedCrop.w"
                  type="number"
                  min="1"
                  :max="cropBounds.w"
                  @change="updateCropValue('w', $event)"
                >
              </label>
              <label>
                <span>Height</span>
                <input
                  :value="roundedCrop.h"
                  type="number"
                  min="1"
                  :max="cropBounds.h"
                  @change="updateCropValue('h', $event)"
                >
              </label>
            </div>
          </div>

          <div class="divider" />

          <div class="setting-group">
            <label class="check-control">
              <input
                v-model="resizeEnabled"
                type="checkbox"
                @change="toggleResize"
              >
              <span>Resize output</span>
            </label>
            <template v-if="resizeEnabled">
              <div class="number-grid resize-grid">
                <label>
                  <span>Width</span>
                  <input
                    :value="resizeWidth"
                    type="number"
                    min="1"
                    :max="maxOutputDimension"
                    @change="updateOutputDimension('w', $event)"
                  >
                </label>
                <label>
                  <span>Height</span>
                  <input
                    :value="resizeHeight"
                    type="number"
                    min="1"
                    :max="maxOutputDimension"
                    @change="updateOutputDimension('h', $event)"
                  >
                </label>
              </div>
              <label class="check-control resize-lock">
                <input
                  v-model="resizeAspectLocked"
                  type="checkbox"
                  :disabled="isSquareShapeLocked"
                  @change="updateResizeLock"
                >
                <span>Keep aspect ratio</span>
              </label>
            </template>
          </div>

          <div class="setting-group">
            <label for="output-format">File format</label>
            <select
              id="output-format"
              v-model="outputFormat"
              :disabled="cropShape !== 'square'"
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>

          <div v-if="outputFormat !== 'image/png'" class="setting-group">
            <div class="range-label">
              <label for="output-quality">Quality</label>
              <span>{{ Math.round(quality * 100) }}%</span>
            </div>
            <input
              id="output-quality"
              v-model.number="quality"
              class="quality-range"
              type="range"
              min="0.4"
              max="1"
              step="0.01"
            >
          </div>

          <div class="output-summary">
            <span class="output-label">Output resolution</span>
            <span class="output-value">{{ outputSize.w }} × {{ outputSize.h }} px</span>
          </div>

          <button
            class="primary-button save-button"
            type="button"
            :disabled="isSaving"
            @click="saveImage"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/>
            </svg>
            {{ isSaving ? 'Saving…' : 'Save Image' }}
          </button>
        </aside>
      </div>
    </div>

    <p v-if="message" class="status-message" role="status">{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'ImageCrop',

  data () {
    return {
      image: null,
      imageUrl: '',
      sourceName: '',
      imageWidth: 0,
      imageHeight: 0,
      rotation: 0,
      quarterRotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      zoomFactor: 1,
      rotationCoverZoom: 1,
      imageOffset: { x: 0, y: 0 },
      touchPoints: {},
      crop: { x: 0, y: 0, w: 0, h: 0 },
      cropShape: 'square',
      cornerRadius: null,
      aspect: 'free',
      outputFormat: 'image/png',
      quality: 0.92,
      resizeEnabled: false,
      resizeWidth: 0,
      resizeHeight: 0,
      resizeAspectLocked: true,
      resizeRatio: 1,
      maxOutputDimension: 8192,
      display: { width: 0, height: 0, scale: 1, offsetX: 0, offsetY: 0, canvasWidth: 0, canvasHeight: 0 },
      interaction: null,
      isDraggingOver: false,
      isSaving: false,
      message: '',
      resizeObserver: null
    }
  },

  computed: {
    rotationSliderPosition () {
      return Math.sign(this.rotation) * Math.sqrt(Math.abs(this.rotation) / 45) * 45
    },

    rotationRadians () {
      return (this.quarterRotation + this.rotation) * Math.PI / 180
    },

    imageCropBounds () {
      const crop = this.roundedCrop
      const halfWidth = this.imageWidth / 2
      const halfHeight = this.imageHeight / 2
      const cosine = Math.cos(this.rotationRadians)
      const sine = Math.sin(this.rotationRadians)
      const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }

      for (const x of [crop.x, crop.x + crop.w]) {
        for (const y of [crop.y, crop.y + crop.h]) {
          const dx = (x - halfWidth) * (this.flipHorizontal ? -1 : 1)
          const dy = (y - halfHeight) * (this.flipVertical ? -1 : 1)
          const sourceX = cosine * dx + sine * dy
          const sourceY = -sine * dx + cosine * dy
          bounds.minX = Math.min(bounds.minX, sourceX)
          bounds.maxX = Math.max(bounds.maxX, sourceX)
          bounds.minY = Math.min(bounds.minY, sourceY)
          bounds.maxY = Math.max(bounds.maxY, sourceY)
        }
      }
      return bounds
    },

    cropCoverZoom () {
      if (!this.image) return 1
      const bounds = this.imageCropBounds
      const minimum = Math.max(
        1,
        Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX)) / (this.imageWidth / 2),
        Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY)) / (this.imageHeight / 2)
      )
      return minimum
    },

    minimumZoomFactor () {
      const { w: width, h: height } = this.cropBounds
      const cosine = Math.abs(Math.cos(this.rotationRadians))
      const sine = Math.abs(Math.sin(this.rotationRadians))
      const rotatedWidth = this.imageWidth * cosine + this.imageHeight * sine
      const rotatedHeight = this.imageWidth * sine + this.imageHeight * cosine
      return Math.min(1, width / rotatedWidth, height / rotatedHeight) / this.rotationCoverZoom
    },

    imageZoom () {
      return this.rotationCoverZoom * this.zoomFactor
    },

    constrainedImageOffset () {
      if (this.imageZoom < this.cropCoverZoom - 1e-9 || this.zoomFactor <= this.minimumZoomFactor + 1e-9) {
        const bounds = this.cropBounds
        const cosine = Math.abs(Math.cos(this.rotationRadians))
        const sine = Math.abs(Math.sin(this.rotationRadians))
        const imageWidth = (this.imageWidth * cosine + this.imageHeight * sine) * this.imageZoom
        const imageHeight = (this.imageWidth * sine + this.imageHeight * cosine) * this.imageZoom
        const limitX = Math.abs(bounds.w - imageWidth) / 2
        const limitY = Math.abs(bounds.h - imageHeight) / 2
        const centerX = (bounds.left + bounds.right - this.imageWidth) / 2
        const centerY = (bounds.top + bounds.bottom - this.imageHeight) / 2
        return {
          x: this.clamp(this.imageOffset.x, centerX - limitX, centerX + limitX),
          y: this.clamp(this.imageOffset.y, centerY - limitY, centerY + limitY)
        }
      }
      const bounds = this.imageCropBounds
      const cosine = Math.cos(this.rotationRadians)
      const sine = Math.sin(this.rotationRadians)
      const dx = this.imageOffset.x * (this.flipHorizontal ? -1 : 1)
      const dy = this.imageOffset.y * (this.flipVertical ? -1 : 1)
      const halfWidth = this.imageWidth * this.imageZoom / 2
      const halfHeight = this.imageHeight * this.imageZoom / 2
      const x = this.clamp(cosine * dx + sine * dy, bounds.maxX - halfWidth, bounds.minX + halfWidth)
      const y = this.clamp(-sine * dx + cosine * dy, bounds.maxY - halfHeight, bounds.minY + halfHeight)
      return {
        x: (cosine * x - sine * y) * (this.flipHorizontal ? -1 : 1),
        y: (sine * x + cosine * y) * (this.flipVertical ? -1 : 1)
      }
    },

    transformedImageBounds () {
      const cosine = Math.abs(Math.cos(this.rotationRadians))
      const sine = Math.abs(Math.sin(this.rotationRadians))
      const snap = value => Math.abs(value - Math.round(value)) < 1e-8 ? Math.round(value) : value
      const width = snap((this.imageWidth * cosine + this.imageHeight * sine) * this.imageZoom)
      const height = snap((this.imageWidth * sine + this.imageHeight * cosine) * this.imageZoom)
      return {
        x: snap(this.imageWidth / 2 + this.imageOffset.x - width / 2),
        y: snap(this.imageHeight / 2 + this.imageOffset.y - height / 2),
        w: width,
        h: height
      }
    },

    cropBounds () {
      const scale = this.display.scale || 1
      const left = this.display.canvasWidth ? Math.ceil((12 - this.display.offsetX) / scale - 1e-8) : 0
      const top = this.display.canvasHeight ? Math.ceil((12 - this.display.offsetY) / scale - 1e-8) : 0
      const right = Math.max(left + 1, this.display.canvasWidth
        ? Math.floor((this.display.canvasWidth - 12 - this.display.offsetX) / scale + 1e-8) : this.imageWidth)
      const bottom = Math.max(top + 1, this.display.canvasHeight
        ? Math.floor(((this.display.previewHeight || this.display.canvasHeight) - 12 - this.display.offsetY) / scale + 1e-8) : this.imageHeight)
      return { left, top, right, bottom, w: right - left, h: bottom - top }
    },

    roundedCrop () {
      const bounds = this.cropBounds
      const left = this.clamp(Math.round(this.crop.x), bounds.left, bounds.right - 1)
      const top = this.clamp(Math.round(this.crop.y), bounds.top, bounds.bottom - 1)
      const rounded = {
        x: left,
        y: top,
        w: this.clamp(Math.round(this.crop.x + this.crop.w), left + 1, bounds.right) - left,
        h: this.clamp(Math.round(this.crop.y + this.crop.h), top + 1, bounds.bottom) - top
      }
      if (this.isSquareShapeLocked) {
        const size = Math.min(rounded.w, rounded.h)
        rounded.w = size
        rounded.h = size
      }
      return rounded
    },

    aspectValue () {
      return this.aspect === 'free' ? null : Number(this.aspect)
    },

    outputSize () {
      if (!this.resizeEnabled) {
        return {
          w: this.roundedCrop.w,
          h: this.roundedCrop.h
        }
      }
      if (this.isSquareShapeLocked) {
        const size = this.clamp(Math.round(this.resizeWidth), 1, this.maxOutputDimension)
        return { w: size, h: size }
      }
      return {
        w: this.clamp(Math.round(this.resizeWidth), 1, this.maxOutputDimension),
        h: this.clamp(Math.round(this.resizeHeight), 1, this.maxOutputDimension)
      }
    },

    outputExtension () {
      if (this.outputFormat === 'image/jpeg') return 'jpg'
      if (this.outputFormat === 'image/webp') return 'webp'
      return 'png'
    },

    maxCornerRadius () {
      return Math.max(0, Math.floor(Math.min(this.outputSize.w, this.outputSize.h) / 2))
    },

    defaultCornerRadius () {
      return Math.round(Math.min(this.outputSize.w, this.outputSize.h) * 0.2)
    },

    effectiveCornerRadius () {
      const radius = this.cornerRadius === null
        ? this.defaultCornerRadius
        : Math.round(this.cornerRadius)
      return this.clamp(radius, 0, this.maxCornerRadius)
    },

    isSquareShapeLocked () {
      return this.cropShape === 'round' || this.cropShape === 'squircle'
    }
  },

  beforeUnmount () {
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl)
    if (this.resizeObserver) this.resizeObserver.disconnect()
    window.removeEventListener('resize', this.layoutCanvas)
  },

  methods: {
    openFilePicker () {
      this.message = ''
      this.$refs.fileInput.click()
    },

    onFileSelected (event) {
      const file = event.target.files && event.target.files[0]
      if (file) this.loadFile(file)
      event.target.value = ''
    },

    onDrop (event) {
      this.isDraggingOver = false
      const file = event.dataTransfer.files && event.dataTransfer.files[0]
      if (file) this.loadFile(file)
    },

    loadFile (file) {
      if (!file.type || !file.type.startsWith('image/')) {
        this.message = 'Please choose a valid image file.'
        return
      }

      const nextUrl = URL.createObjectURL(file)
      const nextImage = new Image()
      nextImage.onload = () => {
        if (this.imageUrl) URL.revokeObjectURL(this.imageUrl)
        this.imageUrl = nextUrl
        this.image = nextImage
        this.sourceName = file.name
        this.rotation = 0
        this.quarterRotation = 0
        this.flipHorizontal = false
        this.flipVertical = false
        this.zoomFactor = 1
        this.rotationCoverZoom = 1
        this.imageOffset = { x: 0, y: 0 }
        this.touchPoints = {}
        this.display = { width: 0, height: 0, scale: 1, offsetX: 0, offsetY: 0, canvasWidth: 0, canvasHeight: 0 }
        this.imageWidth = nextImage.naturalWidth
        this.imageHeight = nextImage.naturalHeight
        this.outputFormat = this.cropShape === 'square' && file.type === 'image/jpeg'
          ? 'image/jpeg'
          : 'image/png'
        this.cornerRadius = null
        this.resizeEnabled = false
        this.resizeAspectLocked = true
        this.message = ''
        this.resetCrop()
        this.setResizeSizeFromCrop()
        this.$nextTick(() => {
          this.layoutCanvas()
          if (typeof ResizeObserver !== 'undefined') {
            if (this.resizeObserver) this.resizeObserver.disconnect()
            this.resizeObserver = new ResizeObserver(this.layoutCanvas)
            this.resizeObserver.observe(this.$refs.stage)
            this.resizeObserver.observe(this.$refs.transformPanel)
          } else {
            window.addEventListener('resize', this.layoutCanvas)
          }
        })
      }
      nextImage.onerror = () => {
        URL.revokeObjectURL(nextUrl)
        this.message = 'This image could not be opened. Try a PNG, JPEG, or WebP file.'
      }
      nextImage.src = nextUrl
    },

    rotateImage (degrees) {
      // Flips act in preview coordinates, so reverse the source rotation when
      // one axis is mirrored to keep the buttons' visible direction consistent.
      const direction = this.flipHorizontal !== this.flipVertical ? -1 : 1
      this.quarterRotation = (this.quarterRotation + degrees * direction + 360) % 360
      this.updateImageTransform()
    },

    toggleFlip (axis) {
      if (axis === 'horizontal') this.flipHorizontal = !this.flipHorizontal
      else this.flipVertical = !this.flipVertical
      this.imageOffset = { ...this.constrainedImageOffset }
      this.message = ''
      this.draw()
    },

    updateRotation (event) {
      const position = this.clamp(Number(event.target.value), -45, 45) / 45
      this.rotation = Math.sign(position) * position * position * 45
      this.updateImageTransform()
    },

    resetRotation () {
      this.rotation = 0
      this.updateImageTransform()
    },

    resetTransforms () {
      this.rotation = 0
      this.quarterRotation = 0
      this.flipHorizontal = false
      this.flipVertical = false
      this.zoomFactor = 1
      this.imageOffset = { x: 0, y: 0 }
      this.updateImageTransform()
    },

    updateImageTransform () {
      if (!this.image) return
      this.rotationCoverZoom = this.cropCoverZoom
      this.zoomFactor = this.clamp(this.zoomFactor, this.minimumZoomFactor, 32)
      this.imageOffset = { ...this.constrainedImageOffset }
      this.message = ''
      this.interaction = null
      this.draw()
    },

    drawTransformedImage (ctx, x, y, width, height) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(width / this.imageWidth, height / this.imageHeight)
      const offset = this.imageOffset
      ctx.translate(this.imageWidth / 2 + offset.x, this.imageHeight / 2 + offset.y)
      ctx.scale(this.flipHorizontal ? -1 : 1, this.flipVertical ? -1 : 1)
      ctx.rotate(this.rotationRadians)
      ctx.scale(this.imageZoom, this.imageZoom)
      ctx.drawImage(this.image, -this.image.naturalWidth / 2, -this.image.naturalHeight / 2)
      ctx.restore()
    },

    layoutCanvas () {
      if (!this.image || !this.$refs.stage || !this.$refs.canvas) return
      const wasAtMinimum = this.zoomFactor <= this.minimumZoomFactor + 1e-9

      const pad = 12
      const canvasWidth = Math.max(1, this.$refs.stage.clientWidth)
      const canvasHeight = Math.max(1, this.$refs.stage.clientHeight)
      const controls = this.$refs.transformPanel
      const previewHeight = controls
        ? Math.max(1, Math.min(canvasHeight, controls.offsetTop - this.$refs.stage.offsetTop))
        : canvasHeight
      const availableWidth = Math.max(1, canvasWidth - pad * 2)
      const availableHeight = Math.max(1, previewHeight - pad * 2)
      const scale = Math.min(
        availableWidth / this.imageWidth,
        availableHeight / this.imageHeight,
        1
      )
      const width = this.imageWidth * scale
      const height = this.imageHeight * scale
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = this.$refs.canvas

      this.display = {
        width, height, scale, canvasWidth, canvasHeight, previewHeight,
        offsetX: (canvasWidth - width) / 2,
        offsetY: (previewHeight - height) / 2
      }
      this.constrainCrop()
      this.zoomFactor = wasAtMinimum ? this.minimumZoomFactor : this.clamp(this.zoomFactor, this.minimumZoomFactor, 32)
      this.imageOffset = { ...this.constrainedImageOffset }
      canvas.width = Math.round(canvasWidth * pixelRatio)
      canvas.height = Math.round(canvasHeight * pixelRatio)
      canvas._pixelRatio = pixelRatio
      this.draw()
    },

    draw () {
      const canvas = this.$refs.canvas
      if (!canvas || !this.image || !this.display.width) return

      const ratio = canvas._pixelRatio || 1
      const ctx = canvas.getContext('2d')
      const x = this.display.offsetX
      const y = this.display.offsetY
      const width = this.display.width
      const height = this.display.height
      const canvasWidth = this.display.canvasWidth
      const canvasHeight = this.display.canvasHeight
      const box = this.displayCrop()

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      this.drawTransformedImage(ctx, x, y, width, height)
      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = 'rgba(13, 18, 28, 0.62)'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      ctx.restore()

      ctx.save()
      this.traceCropShape(ctx, box)
      ctx.clip()
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      this.drawTransformedImage(ctx, x, y, width, height)

      ctx.save()
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)'
      ctx.fillRect(box.x, box.y, box.w, box.h)
      ctx.restore()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(box.x + box.w / 3, box.y)
      ctx.lineTo(box.x + box.w / 3, box.y + box.h)
      ctx.moveTo(box.x + (box.w * 2) / 3, box.y)
      ctx.lineTo(box.x + (box.w * 2) / 3, box.y + box.h)
      ctx.moveTo(box.x, box.y + box.h / 3)
      ctx.lineTo(box.x + box.w, box.y + box.h / 3)
      ctx.moveTo(box.x, box.y + (box.h * 2) / 3)
      ctx.lineTo(box.x + box.w, box.y + (box.h * 2) / 3)
      ctx.stroke()
      ctx.restore()

      const borderWidth = 1
      const borderOutset = borderWidth / 2
      const borderBox = {
        x: box.x - borderOutset,
        y: box.y - borderOutset,
        w: box.w + borderOutset * 2,
        h: box.h + borderOutset * 2
      }
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = borderWidth
      this.traceCropShape(ctx, borderBox)
      ctx.stroke()
      this.drawHandles(ctx, box)
    },

    traceCropShape (ctx, box) {
      if (this.cropShape === 'round') {
        ctx.beginPath()
        ctx.ellipse(
          box.x + box.w / 2,
          box.y + box.h / 2,
          box.w / 2,
          box.h / 2,
          0,
          0,
          Math.PI * 2
        )
        return
      }
      if (this.cropShape === 'squircle') {
        this.traceSquircle(ctx, box.x, box.y, box.w, box.h)
        return
      }

      const scale = Math.min(
        box.w / Math.max(1, this.outputSize.w),
        box.h / Math.max(1, this.outputSize.h)
      )
      const radius = this.cropShape === 'rounded'
        ? this.effectiveCornerRadius * scale
        : 0
      this.traceRoundedRect(ctx, box.x, box.y, box.w, box.h, radius)
    },

    traceRoundedRect (ctx, x, y, width, height, radius) {
      const r = this.clamp(radius, 0, Math.min(width, height) / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + width - r, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + r)
      ctx.lineTo(x + width, y + height - r)
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
      ctx.lineTo(x + r, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    },

    traceSquircle (ctx, x, y, width, height) {
      const centerX = x + width / 2
      const centerY = y + height / 2
      const radiusX = width / 2
      const radiusY = height / 2
      const segments = Math.min(4096, Math.max(512, Math.ceil(Math.max(width, height) / 2)))

      ctx.beginPath()
      for (let index = 0; index <= segments; index += 1) {
        const angle = (index / segments) * Math.PI * 2
        const cosine = Math.cos(angle)
        const sine = Math.sin(angle)
        const pointX = centerX + radiusX * Math.sign(cosine) * Math.sqrt(Math.abs(cosine))
        const pointY = centerY + radiusY * Math.sign(sine) * Math.sqrt(Math.abs(sine))
        if (index === 0) ctx.moveTo(pointX, pointY)
        else ctx.lineTo(pointX, pointY)
      }
      ctx.closePath()
    },

    drawHandles (ctx, box) {
      const positions = this.handlePositions(box)
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
      ctx.shadowBlur = 3
      Object.keys(positions).forEach((name) => {
        const point = positions[name]
        if (name.length === 1) {
          const horizontal = name === 'n' || name === 's'
          const width = horizontal ? Math.min(24, box.w / 3) : 4
          const height = horizontal ? 4 : Math.min(24, box.h / 3)
          ctx.fillRect(point.x - width / 2, point.y - height / 2, width, height)
          return
        }
        const thickness = 5
        const lengthX = Math.min(20, box.w / 3)
        const lengthY = Math.min(20, box.h / 3)
        const left = name.includes('w')
        const top = name.includes('n')
        const x = point.x - (left ? thickness / 2 : lengthX - thickness / 2)
        const y = point.y - (top ? thickness / 2 : lengthY - thickness / 2)
        ctx.beginPath()
        ctx.rect(x, point.y - thickness / 2, lengthX, thickness)
        ctx.rect(point.x - thickness / 2, y, thickness, lengthY)
        ctx.fill()
      })
      ctx.restore()
    },

    handlePositions (box) {
      const edgeOffset = 2
      const cornerOffset = 2.5
      return {
        nw: { x: box.x - cornerOffset, y: box.y - cornerOffset },
        n: { x: box.x + box.w / 2, y: box.y - edgeOffset },
        ne: { x: box.x + box.w + cornerOffset, y: box.y - cornerOffset },
        e: { x: box.x + box.w + edgeOffset, y: box.y + box.h / 2 },
        se: { x: box.x + box.w + cornerOffset, y: box.y + box.h + cornerOffset },
        s: { x: box.x + box.w / 2, y: box.y + box.h + edgeOffset },
        sw: { x: box.x - cornerOffset, y: box.y + box.h + cornerOffset },
        w: { x: box.x - edgeOffset, y: box.y + box.h / 2 }
      }
    },

    displayCrop () {
      const crop = this.roundedCrop
      return {
        x: crop.x * this.display.scale + this.display.offsetX,
        y: crop.y * this.display.scale + this.display.offsetY,
        w: crop.w * this.display.scale,
        h: crop.h * this.display.scale
      }
    },

    pointerPosition (event) {
      const rect = this.$refs.canvas.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    },

    imagePoint (point) {
      return {
        x: (point.x - this.display.offsetX) / this.display.scale,
        y: (point.y - this.display.offsetY) / this.display.scale
      }
    },

    zoomImage (factor, anchor, previousZoom = this.imageZoom, previousOffset = this.imageOffset, destination = anchor) {
      this.zoomFactor = this.clamp(factor, this.minimumZoomFactor, 32)
      const ratio = this.imageZoom / previousZoom
      const centerX = this.imageWidth / 2
      const centerY = this.imageHeight / 2
      this.imageOffset = {
        x: destination.x - centerX - (anchor.x - centerX - previousOffset.x) * ratio,
        y: destination.y - centerY - (anchor.y - centerY - previousOffset.y) * ratio
      }
      this.imageOffset = { ...this.constrainedImageOffset }
      this.message = ''
      this.draw()
    },

    onWheel (event) {
      if (!this.image || this.interaction || !event.deltaY) return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.display.canvasHeight : 1
      const delta = this.clamp(event.deltaY * unit, -500, 500)
      this.zoomImage(this.zoomFactor * Math.exp(-delta * 0.002), this.imagePoint(this.pointerPosition(event)))
    },

    pinchPoints () {
      const [first, second] = Object.values(this.touchPoints)
      return {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        center: this.imagePoint({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 })
      }
    },

    hitTest (point) {
      const box = this.displayCrop()
      const handles = this.handlePositions(box)
      const hitRadius = 14

      for (const name of Object.keys(handles)) {
        if (
          Math.abs(point.x - handles[name].x) <= hitRadius &&
          Math.abs(point.y - handles[name].y) <= hitRadius
        ) return name
      }

      if (
        point.x >= box.x &&
        point.x <= box.x + box.w &&
        point.y >= box.y &&
        point.y <= box.y + box.h
      ) return 'move'

      return null
    },

    onPointerDown (event) {
      if (event.pointerType !== 'touch' && event.button !== 0) return
      const point = this.pointerPosition(event)
      event.preventDefault()
      this.$refs.canvas.focus({ preventScroll: true })
      this.$refs.canvas.setPointerCapture(event.pointerId)
      if (event.pointerType === 'touch') {
        this.touchPoints[event.pointerId] = point
        if (Object.keys(this.touchPoints).length >= 2) {
          if (this.interaction?.handle !== 'pinch') {
            const pinch = this.pinchPoints()
            this.interaction = {
              handle: 'pinch',
              start: pinch.center,
              distance: Math.max(1, pinch.distance),
              zoomFactor: this.zoomFactor,
              imageZoom: this.imageZoom,
              offset: { ...this.imageOffset }
            }
          }
          return
        }
      }
      const hit = this.hitTest(point)
      const handle = hit && hit !== 'move' ? hit : event.pointerType === 'touch' || event.shiftKey ? 'image' : hit
      if (!handle) {
        this.interaction = null
        return
      }
      this.interaction = {
        handle,
        start: this.imagePoint(point),
        offset: { ...this.imageOffset },
        crop: { ...this.crop }
      }
      this.setCursor(handle)
    },

    onPointerMove (event) {
      const point = this.pointerPosition(event)
      if (event.pointerType === 'touch' && this.touchPoints[event.pointerId]) {
        this.touchPoints[event.pointerId] = point
      }
      if (!this.interaction) {
        const handle = this.hitTest(point)
        this.setCursor(event.shiftKey && (!handle || handle === 'move') ? 'image' : handle)
        return
      }

      event.preventDefault()
      if (this.interaction.handle === 'pinch') {
        const pinch = this.pinchPoints()
        const original = this.interaction
        this.zoomImage(
          original.zoomFactor * pinch.distance / original.distance,
          original.start, original.imageZoom, original.offset, pinch.center
        )
        return
      }
      const naturalPoint = this.imagePoint(point)
      const delta = {
        x: naturalPoint.x - this.interaction.start.x,
        y: naturalPoint.y - this.interaction.start.y
      }

      if (this.interaction.handle === 'image') {
        this.imageOffset = {
          x: this.interaction.offset.x + delta.x,
          y: this.interaction.offset.y + delta.y
        }
        this.imageOffset = { ...this.constrainedImageOffset }
        this.message = ''
      } else if (this.interaction.handle === 'move') {
        this.moveCrop(delta)
      } else {
        this.resizeCrop(delta)
      }
      this.draw()
    },

    onPointerUp (event) {
      delete this.touchPoints[event.pointerId]
      if (this.$refs.canvas.hasPointerCapture(event.pointerId)) {
        this.$refs.canvas.releasePointerCapture(event.pointerId)
      }
      if (!this.interaction) return
      if (this.interaction.handle === 'pinch' && Object.keys(this.touchPoints).length) {
        if (Object.keys(this.touchPoints).length >= 2) {
          const pinch = this.pinchPoints()
          this.interaction = {
            handle: 'pinch', start: pinch.center,
            distance: Math.max(1, pinch.distance),
            zoomFactor: this.zoomFactor, imageZoom: this.imageZoom,
            offset: { ...this.imageOffset }
          }
          return
        }
        this.interaction = {
          handle: 'image',
          start: this.imagePoint(Object.values(this.touchPoints)[0]),
          offset: { ...this.imageOffset }
        }
        return
      }
      if (this.interaction.handle !== 'image' && this.interaction.handle !== 'pinch') this.crop = { ...this.roundedCrop }
      this.interaction = null
      this.draw()
      const handle = this.hitTest(this.pointerPosition(event))
      this.setCursor(handle)
    },

    onCanvasDoubleClick (event) {
      const point = this.pointerPosition(event)
      const box = this.displayCrop()
      const isInside = (
        point.x >= box.x &&
        point.x <= box.x + box.w &&
        point.y >= box.y &&
        point.y <= box.y + box.h
      )
      if (!isInside) return

      event.preventDefault()
      this.aspect = this.isSquareShapeLocked ? '1' : 'free'
      this.resetCrop()
    },

    moveCrop (delta) {
      const original = this.interaction.crop
      const bounds = this.cropBounds
      this.crop.x = this.clamp(original.x + delta.x, bounds.left, bounds.right - original.w)
      this.crop.y = this.clamp(original.y + delta.y, bounds.top, bounds.bottom - original.h)
    },

    resizeCrop (delta) {
      const handle = this.interaction.handle
      const original = this.interaction.crop
      const bounds = this.cropBounds
      const minSize = Math.min(Math.max(10, 24 / this.display.scale), original.w, original.h, bounds.w, bounds.h)
      let left = original.x
      let right = original.x + original.w
      let top = original.y
      let bottom = original.y + original.h

      if (handle.includes('w')) left = this.clamp(original.x + delta.x, bounds.left, right - minSize)
      if (handle.includes('e')) right = this.clamp(original.x + original.w + delta.x, left + minSize, bounds.right)
      if (handle.includes('n')) top = this.clamp(original.y + delta.y, bounds.top, bottom - minSize)
      if (handle.includes('s')) bottom = this.clamp(original.y + original.h + delta.y, top + minSize, bounds.bottom)

      if (this.aspectValue) {
        const ratio = this.aspectValue
        if (handle.length === 2) {
          let width = right - left
          let height = bottom - top
          if (width / height > ratio) height = width / ratio
          else width = height * ratio

          const anchorX = handle.includes('e') ? original.x : original.x + original.w
          const anchorY = handle.includes('s') ? original.y : original.y + original.h
          const maxWidth = handle.includes('e') ? bounds.right - anchorX : anchorX - bounds.left
          const maxHeight = handle.includes('s') ? bounds.bottom - anchorY : anchorY - bounds.top
          const fitScale = Math.min(1, maxWidth / width, maxHeight / height)
          width *= fitScale
          height *= fitScale
          left = handle.includes('e') ? anchorX : anchorX - width
          right = handle.includes('e') ? anchorX + width : anchorX
          top = handle.includes('s') ? anchorY : anchorY - height
          bottom = handle.includes('s') ? anchorY + height : anchorY
        } else if (handle === 'e' || handle === 'w') {
          let width = right - left
          let height = width / ratio
          const centerY = original.y + original.h / 2
          const maxHeight = 2 * Math.min(centerY - bounds.top, bounds.bottom - centerY)
          if (height > maxHeight) {
            height = maxHeight
            width = height * ratio
            if (handle === 'w') left = right - width
            else right = left + width
          }
          top = centerY - height / 2
          bottom = centerY + height / 2
        } else {
          let height = bottom - top
          let width = height * ratio
          const centerX = original.x + original.w / 2
          const maxWidth = 2 * Math.min(centerX - bounds.left, bounds.right - centerX)
          if (width > maxWidth) {
            width = maxWidth
            height = width / ratio
            if (handle === 'n') top = bottom - height
            else bottom = top + height
          }
          left = centerX - width / 2
          right = centerX + width / 2
        }
      }

      this.crop = {
        x: this.clamp(left, bounds.left, bounds.right - 1),
        y: this.clamp(top, bounds.top, bounds.bottom - 1),
        w: this.clamp(right - left, 1, bounds.right - left),
        h: this.clamp(bottom - top, 1, bounds.bottom - top)
      }
      this.constrainCrop()
    },

    setCursor (handle) {
      if (!this.$refs.canvas) return
      const cursors = {
        image: this.interaction?.handle === 'image' ? 'grabbing' : 'grab',
        move: 'move',
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        nw: 'nwse-resize',
        se: 'nwse-resize'
      }
      this.$refs.canvas.style.cursor = cursors[handle] || 'default'
    },

    onCanvasKeydown (event) {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      if (!keys.includes(event.key)) return
      event.preventDefault()
      const amount = event.shiftKey ? 10 : 1
      if (event.key === 'ArrowLeft') this.crop.x -= amount
      if (event.key === 'ArrowRight') this.crop.x += amount
      if (event.key === 'ArrowUp') this.crop.y -= amount
      if (event.key === 'ArrowDown') this.crop.y += amount
      this.crop.x = this.clamp(this.crop.x, this.cropBounds.left, this.cropBounds.right - this.crop.w)
      this.crop.y = this.clamp(this.crop.y, this.cropBounds.top, this.cropBounds.bottom - this.crop.h)
      this.draw()
    },

    applyAspectRatio () {
      if (!this.aspectValue) return
      const centerX = this.crop.x + this.crop.w / 2
      const centerY = this.crop.y + this.crop.h / 2
      let width = this.crop.w
      let height = this.crop.h

      if (width / height > this.aspectValue) width = height * this.aspectValue
      else height = width / this.aspectValue

      const fit = Math.min(1, this.cropBounds.w / width, this.cropBounds.h / height)
      width *= fit
      height *= fit
      this.crop = {
        x: this.clamp(centerX - width / 2, this.cropBounds.left, this.cropBounds.right - width),
        y: this.clamp(centerY - height / 2, this.cropBounds.top, this.cropBounds.bottom - height),
        w: width,
        h: height
      }
      this.draw()
    },

    onCropShapeChange () {
      if (this.cropShape !== 'square') this.outputFormat = 'image/png'
      if (this.cropShape === 'rounded') this.cornerRadius = null
      if (this.isSquareShapeLocked) {
        this.aspect = '1'
        this.resizeAspectLocked = true
        this.resizeRatio = 1
        this.applyAspectRatio()
        if (this.resizeEnabled) this.setResizeSizeFromCrop()
      } else {
        this.draw()
      }
      this.message = ''
    },

    updateCornerRadius (event) {
      const value = Number(event.target.value)
      this.cornerRadius = Number.isFinite(value)
        ? this.clamp(Math.round(value), 0, this.maxCornerRadius)
        : this.effectiveCornerRadius
      event.target.value = this.effectiveCornerRadius
      this.message = ''
      this.draw()
    },

    resetCrop () {
      if (!this.image) return
      let bounds = this.transformedImageBounds
      const limits = this.cropBounds
      if (this.display.canvasWidth && (
        bounds.x < limits.left - 1e-8 || bounds.y < limits.top - 1e-8 ||
        bounds.x + bounds.w > limits.right + 1e-8 || bounds.y + bounds.h > limits.bottom + 1e-8
      )) {
        this.zoomImage(this.minimumZoomFactor, { x: this.imageWidth / 2, y: this.imageHeight / 2 })
        bounds = this.transformedImageBounds
      }
      const left = Math.floor(bounds.x)
      const top = Math.floor(bounds.y)
      let width = Math.ceil(bounds.x + bounds.w) - left
      let height = Math.ceil(bounds.y + bounds.h) - top
      const centerX = left + width / 2
      const centerY = top + height / 2

      if (this.aspectValue) {
        if (width / height > this.aspectValue) width = height * this.aspectValue
        else height = width / this.aspectValue
      }

      this.crop = {
        x: centerX - width / 2,
        y: centerY - height / 2,
        w: width,
        h: height
      }
      this.constrainCrop()
      this.message = ''
      this.draw()
    },

    constrainCrop () {
      const bounds = this.cropBounds
      const fit = Math.min(1, bounds.w / Math.max(1, this.crop.w), bounds.h / Math.max(1, this.crop.h))
      const width = Math.max(1, this.crop.w * fit)
      const height = Math.max(1, this.crop.h * fit)
      const x = this.clamp(this.crop.x, bounds.left, bounds.right - width)
      const y = this.clamp(this.crop.y, bounds.top, bounds.bottom - height)
      if (x !== this.crop.x || y !== this.crop.y || width !== this.crop.w || height !== this.crop.h) {
        this.crop = { x, y, w: width, h: height }
      }
    },

    updateCropValue (key, event) {
      const value = Number(event.target.value)
      if (!Number.isFinite(value)) {
        event.target.value = this.roundedCrop[key]
        return
      }

      if (key === 'x') {
        this.crop.x = this.clamp(value, this.cropBounds.left, this.cropBounds.right - this.crop.w)
      } else if (key === 'y') {
        this.crop.y = this.clamp(value, this.cropBounds.top, this.cropBounds.bottom - this.crop.h)
      } else if (key === 'w') {
        this.crop.w = this.clamp(value, 1, this.cropBounds.right - this.crop.x)
        if (this.aspectValue) {
          this.crop.h = Math.min(this.crop.w / this.aspectValue, this.cropBounds.bottom - this.crop.y)
          this.crop.w = this.crop.h * this.aspectValue
        }
      } else if (key === 'h') {
        this.crop.h = this.clamp(value, 1, this.cropBounds.bottom - this.crop.y)
        if (this.aspectValue) {
          this.crop.w = Math.min(this.crop.h * this.aspectValue, this.cropBounds.right - this.crop.x)
          this.crop.h = this.crop.w / this.aspectValue
        }
      }
      this.constrainCrop()
      event.target.value = this.roundedCrop[key]
      this.draw()
    },

    setResizeSizeFromCrop () {
      const crop = this.roundedCrop
      if (this.isSquareShapeLocked) {
        const size = Math.min(crop.w, crop.h, this.maxOutputDimension)
        this.resizeWidth = Math.max(1, Math.round(size))
        this.resizeHeight = this.resizeWidth
        this.resizeRatio = 1
        return
      }
      const scale = Math.min(
        1,
        this.maxOutputDimension / crop.w,
        this.maxOutputDimension / crop.h
      )
      this.resizeWidth = Math.max(1, Math.round(crop.w * scale))
      this.resizeHeight = Math.max(1, Math.round(crop.h * scale))
      this.resizeRatio = this.resizeWidth / this.resizeHeight
    },

    toggleResize () {
      if (this.resizeEnabled) this.setResizeSizeFromCrop()
      this.message = ''
    },

    updateResizeLock () {
      if (this.isSquareShapeLocked) {
        this.resizeAspectLocked = true
        this.resizeRatio = 1
        return
      }
      if (this.resizeAspectLocked) {
        this.resizeRatio = this.resizeWidth / this.resizeHeight
      }
    },

    setResizeDimensions (width, height) {
      const scale = Math.min(
        1,
        this.maxOutputDimension / width,
        this.maxOutputDimension / height
      )
      this.resizeWidth = Math.max(1, Math.round(width * scale))
      this.resizeHeight = Math.max(1, Math.round(height * scale))
    },

    updateOutputDimension (key, event) {
      const current = key === 'w' ? this.resizeWidth : this.resizeHeight
      const value = Number(event.target.value)
      if (!Number.isFinite(value) || value < 1) {
        event.target.value = current
        return
      }

      const next = this.clamp(Math.round(value), 1, this.maxOutputDimension)
      if (this.isSquareShapeLocked) {
        this.resizeWidth = next
        this.resizeHeight = next
        event.target.value = next
        this.message = ''
        this.draw()
        return
      }
      if (key === 'w') {
        if (this.resizeAspectLocked) {
          this.setResizeDimensions(next, next / this.resizeRatio)
        } else this.resizeWidth = next
      } else {
        if (this.resizeAspectLocked) {
          this.setResizeDimensions(next * this.resizeRatio, next)
        } else this.resizeHeight = next
      }
      event.target.value = key === 'w' ? this.resizeWidth : this.resizeHeight
      this.message = ''
    },

    async saveImage () {
      if (!this.image || this.isSaving) return
      this.isSaving = true
      this.message = ''
      const crop = this.roundedCrop
      const outputSize = this.outputSize
      const filename = this.makeOutputName()

      try {
        let fileHandle = null
        if (typeof window.showSaveFilePicker === 'function') {
          try {
            fileHandle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: `${this.outputExtension.toUpperCase()} image`,
                accept: { [this.outputFormat]: [`.${this.outputExtension}`] }
              }]
            })
          } catch (error) {
            if (error && error.name === 'AbortError') {
              this.isSaving = false
              return
            }
            throw error
          }
        }

        const blob = await this.createCroppedBlob(crop, outputSize)
        if (fileHandle) {
          const writable = await fileHandle.createWritable()
          await writable.write(blob)
          await writable.close()
          this.message = `Saved ${filename}`
        } else {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          link.remove()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          this.message = `Downloaded ${filename}`
        }
      } catch (error) {
        console.error(error)
        this.message = 'The cropped image could not be saved. Please try again.'
      } finally {
        this.isSaving = false
      }
    },

    createCroppedBlob (crop, outputSize) {
      return new Promise((resolve, reject) => {
        const output = document.createElement('canvas')
        output.width = outputSize.w
        output.height = outputSize.h
        const ctx = output.getContext('2d')

        if (this.outputFormat === 'image/jpeg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, output.width, output.height)
        }
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.save()
        if (this.cropShape === 'round') {
          ctx.beginPath()
          ctx.ellipse(
            output.width / 2,
            output.height / 2,
            output.width / 2,
            output.height / 2,
            0,
            0,
            Math.PI * 2
          )
          ctx.clip()
        } else if (this.cropShape === 'squircle') {
          this.traceSquircle(ctx, 0, 0, output.width, output.height)
          ctx.clip()
        } else if (this.cropShape === 'rounded') {
          this.traceRoundedRect(
            ctx,
            0,
            0,
            output.width,
            output.height,
            this.effectiveCornerRadius
          )
          ctx.clip()
        }
        ctx.scale(outputSize.w / crop.w, outputSize.h / crop.h)
        this.drawTransformedImage(ctx, -crop.x, -crop.y, this.imageWidth, this.imageHeight)
        ctx.restore()
        output.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Image encoding failed')),
          this.outputFormat,
          this.quality
        )
      })
    },

    makeOutputName () {
      const base = this.sourceName.replace(/\.[^.]+$/, '') || 'image'
      return `${base}-cropped.${this.outputExtension}`
    },

    clamp (value, min, max) {
      return Math.min(Math.max(value, min), Math.max(min, max))
    }
  }
}
</script>

<style scoped>
.crop-tool {
  --accent: var(--vp-c-brand-1);
  --accent-dark: var(--vp-c-brand-3);
  --ink: #29242e;
  --muted: #716a76;
  --line: #e5dfe8;
  --panel: var(--vp-c-bg);
  margin: 2rem 0 4rem;
  color: var(--ink);
}

.drop-zone {
  min-height: 27rem;
  padding: 3rem 2rem;
  border: 2px dashed #b9cbdd;
  border-radius: 1.25rem;
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.drop-zone.is-dragging {
  border-color: var(--accent);
  background-color: #f0f5fb;
  transform: scale(1.005);
}

.drop-zone h2 {
  margin: 1.25rem 0 0.35rem;
  border: 0;
  font-size: 1.55rem;
}

.drop-zone p {
  margin: 0 0 1.5rem;
  color: var(--muted);
}

.upload-icon {
  width: 4.25rem;
  height: 4.25rem;
  border-radius: 1.2rem;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: #e2edf8;
}

.upload-icon svg {
  width: 2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.privacy-note {
  margin-top: 1rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

button,
select,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.primary-button {
  min-height: 2.9rem;
  padding: 0.72rem 1.2rem;
  border: 0;
  border-radius: 0.65rem;
  color: #fff;
  background: var(--accent);
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(33, 77, 121, 0.18);
  transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}

.primary-button:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(33, 77, 121, 0.24);
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.68;
  transform: none;
}

.toolbar {
  min-height: 2.8rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.85rem 0.85rem 0 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #fff;
}

.file-summary {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.file-name {
  max-width: 24rem;
  overflow: hidden;
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-button,
.mini-button {
  border: 0;
  color: var(--accent);
  background: transparent;
  font-weight: 600;
}

.text-button:hover,
.mini-button:hover {
  color: var(--accent-dark);
}

.editor-layout {
  border: 1px solid var(--line);
  border-top: 0;
  border-radius: 0 0 0.85rem 0.85rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 13rem;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 18px 50px rgba(39, 27, 43, 0.08);
}

.canvas-panel {
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(clamp(20rem, 58vh, 40rem), 1fr) auto;
  background-color: #202027;
}

.canvas-stage {
  position: relative;
  grid-area: 1 / 1 / 3 / 2;
  min-height: 0;
  overflow: hidden;
  background-image:
    linear-gradient(45deg, #25252d 25%, transparent 25%),
    linear-gradient(-45deg, #25252d 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #25252d 75%),
    linear-gradient(-45deg, transparent 75%, #25252d 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
}

canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  outline: 0;
}

canvas:focus-visible {
  box-shadow: 0 0 0 3px rgba(126, 177, 223, 0.8);
}

.transform-panel {
  position: relative;
  z-index: 1;
  grid-area: 2 / 1 / 3 / 2;
  margin: 1rem 1.35rem 0.8rem;
  padding: 0.85rem;
  border: 1px solid #484850;
  border-radius: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  color: #f5f5f7;
  background: rgba(41, 41, 48, 0.85);
  backdrop-filter: blur(8px);
}

.rotation-control {
  flex: 1 1 10rem;
  max-width: 22rem;
}

.rotation-label {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.8rem;
}

.rotation-label output {
  font-variant-numeric: tabular-nums;
}

.rotation-control input {
  appearance: none;
  width: 100%;
  height: 1.5rem;
  display: block;
  margin-top: 0.5rem;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.rotation-control input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: #808080;
}

.rotation-control input::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -5px;
  border: 0;
  border-radius: 50%;
  background: currentColor;
}

.rotation-control input::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: #808080;
}

.rotation-control input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 50%;
  background: currentColor;
}

.transform-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
}

.transform-button {
  min-width: 2.6rem;
  min-height: 2.6rem;
  padding: 0.45rem;
  border: 1px solid #64646e;
  border-radius: 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  color: #fff;
  background: #36363f;
  font-size: 0.75rem;
  cursor: pointer;
}

.transform-button:hover {
  background: #484854;
}

.transform-button[aria-pressed="true"] {
  border-color: #a5c9ef;
  color: #dcecff;
  background: #355574;
}

.transform-button:focus-visible,
.rotation-control input:focus-visible {
  outline: 2px solid #a5c9ef;
  outline-offset: 3px;
}

.transform-button svg {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.settings-panel {
  padding: 1.25rem;
  border-left: 1px solid var(--line);
  background: var(--panel);
}

.setting-group + .setting-group {
  margin-top: 1.1rem;
}

.setting-group > label,
.setting-heading,
.range-label {
  margin-bottom: 0.45rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4d4651;
  font-size: 0.8rem;
  font-weight: 650;
}

.setting-heading .mini-button {
  padding: 0;
  font-size: 0.75rem;
}

select,
.number-grid input,
.radius-control input {
  width: 100%;
  min-height: 2.45rem;
  border: 1px solid #d8d0dc;
  border-radius: 0.48rem;
  color: var(--ink);
  background: #fff;
  outline: none;
  box-sizing: border-box;
}

select {
  padding: 0 0.65rem;
}

select:focus,
.number-grid input:focus,
.radius-control input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(50, 109, 167, 0.1);
}

select:disabled,
input:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.number-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.number-grid label {
  min-width: 0;
  color: var(--muted);
  font-size: 0.72rem;
}

.number-grid label span {
  margin-bottom: 0.25rem;
  display: block;
}

.number-grid input {
  padding: 0 0.55rem;
}

.radius-control {
  margin-top: 0.65rem;
  display: block !important;
}

.radius-control span {
  margin-bottom: 0.25rem;
  display: block;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 500;
}

.radius-control input {
  padding: 0 0.55rem;
}

.check-control {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  color: #4d4651;
  font-size: 0.8rem;
  font-weight: 650;
  cursor: pointer;
}

.check-control input {
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: var(--accent);
}

.resize-grid {
  margin-top: 0.65rem;
}

.resize-lock {
  margin-top: 0.65rem;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 500;
}

.divider {
  height: 1px;
  margin: 1.25rem 0;
  background: var(--line);
}

.range-label span {
  color: var(--muted);
}

.quality-range {
  width: 100%;
  accent-color: var(--accent);
}

.output-summary {
  margin: 1.25rem 0 0.85rem;
  font-size: 0.8rem;
}

.output-label {
  margin-bottom: 0.3rem;
  display: block;
  color: #4d4651;
  font-weight: 650;
}

.output-value {
  display: block;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 400;
}

.save-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
}

.save-button svg {
  width: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.status-message {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
}

@media (max-width: 760px) {
  .crop-tool {
    margin-top: 1.25rem;
  }

  .editor-layout {
    grid-template-columns: 1fr;
  }

  .settings-panel {
    border-top: 1px solid var(--line);
    border-left: 0;
  }

  .canvas-panel {
    grid-template-rows: minmax(clamp(14rem, 50vh, 30rem), 1fr) auto;
  }

  .transform-panel {
    margin: 0.8rem 0.8rem 0.65rem;
  }
}

@media (max-width: 480px) {
  .drop-zone {
    min-height: 22rem;
    padding: 2rem 1rem;
  }

  .toolbar {
    align-items: flex-start;
  }

  .file-summary {
    display: block;
  }

  .file-summary > span {
    display: block;
  }

  .file-name {
    max-width: 12rem;
  }

  .text-button {
    padding-right: 0;
    text-align: right;
  }
}
</style>
