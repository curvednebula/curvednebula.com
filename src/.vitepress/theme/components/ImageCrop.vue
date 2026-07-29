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
              aria-label="Image crop area. Drag to move the crop and use the handles to resize it."
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @dblclick="onCanvasDoubleClick"
              @keydown="onCanvasKeydown"
            />
          </div>
          <p class="canvas-help">
            Drag inside to move · Drag handles to resize · Double-click for full image · Arrow keys nudge
          </p>
        </section>

        <aside class="settings-panel">
          <div class="setting-group">
            <label for="crop-aspect">Aspect ratio</label>
            <select id="crop-aspect" v-model="aspect" @change="applyAspectRatio">
              <option value="free">Freeform</option>
              <option value="1">Square · 1:1</option>
              <option value="1.3333333333">Landscape · 4:3</option>
              <option value="1.5">Photo · 3:2</option>
              <option value="1.7777777778">Widescreen · 16:9</option>
              <option value="0.75">Portrait · 3:4</option>
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
                  min="0"
                  :max="Math.max(0, imageWidth - roundedCrop.w)"
                  @change="updateCropValue('x', $event)"
                >
              </label>
              <label>
                <span>Y</span>
                <input
                  :value="roundedCrop.y"
                  type="number"
                  min="0"
                  :max="Math.max(0, imageHeight - roundedCrop.h)"
                  @change="updateCropValue('y', $event)"
                >
              </label>
              <label>
                <span>Width</span>
                <input
                  :value="roundedCrop.w"
                  type="number"
                  min="1"
                  :max="imageWidth"
                  @change="updateCropValue('w', $event)"
                >
              </label>
              <label>
                <span>Height</span>
                <input
                  :value="roundedCrop.h"
                  type="number"
                  min="1"
                  :max="imageHeight"
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
                  @change="updateResizeLock"
                >
                <span>Keep aspect ratio</span>
              </label>
            </template>
          </div>

          <div class="setting-group">
            <label for="output-format">File format</label>
            <select id="output-format" v-model="outputFormat">
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
      crop: { x: 0, y: 0, w: 0, h: 0 },
      aspect: 'free',
      outputFormat: 'image/png',
      quality: 0.92,
      resizeEnabled: false,
      resizeWidth: 0,
      resizeHeight: 0,
      resizeAspectLocked: true,
      resizeRatio: 1,
      maxOutputDimension: 8192,
      display: { width: 0, height: 0, scale: 1, pad: 0 },
      interaction: null,
      isDraggingOver: false,
      isSaving: false,
      message: '',
      resizeObserver: null
    }
  },

  computed: {
    roundedCrop () {
      if (!this.imageWidth || !this.imageHeight) {
        return { x: 0, y: 0, w: 1, h: 1 }
      }
      const left = this.clamp(Math.round(this.crop.x), 0, this.imageWidth - 1)
      const top = this.clamp(Math.round(this.crop.y), 0, this.imageHeight - 1)
      const right = this.clamp(
        Math.round(this.crop.x + this.crop.w),
        left + 1,
        this.imageWidth
      )
      const bottom = this.clamp(
        Math.round(this.crop.y + this.crop.h),
        top + 1,
        this.imageHeight
      )
      return {
        x: left,
        y: top,
        w: right - left,
        h: bottom - top
      }
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
      return {
        w: this.clamp(Math.round(this.resizeWidth), 1, this.maxOutputDimension),
        h: this.clamp(Math.round(this.resizeHeight), 1, this.maxOutputDimension)
      }
    },

    outputExtension () {
      if (this.outputFormat === 'image/jpeg') return 'jpg'
      if (this.outputFormat === 'image/webp') return 'webp'
      return 'png'
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
        this.imageWidth = nextImage.naturalWidth
        this.imageHeight = nextImage.naturalHeight
        this.outputFormat = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
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

    layoutCanvas () {
      if (!this.image || !this.$refs.stage || !this.$refs.canvas) return

      const pad = 12
      const availableWidth = Math.max(280, this.$refs.stage.clientWidth) - pad * 2
      const availableHeight = Math.min(640, Math.max(320, window.innerHeight * 0.58)) - pad * 2
      const scale = Math.min(
        availableWidth / this.imageWidth,
        availableHeight / this.imageHeight,
        1
      )
      const width = Math.max(1, Math.round(this.imageWidth * scale))
      const height = Math.max(1, Math.round(this.imageHeight * scale))
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = this.$refs.canvas

      this.display = { width, height, scale: width / this.imageWidth, pad }
      canvas.style.width = `${width + pad * 2}px`
      canvas.style.height = `${height + pad * 2}px`
      canvas.width = Math.round((width + pad * 2) * pixelRatio)
      canvas.height = Math.round((height + pad * 2) * pixelRatio)
      canvas._pixelRatio = pixelRatio
      this.draw()
    },

    draw () {
      const canvas = this.$refs.canvas
      if (!canvas || !this.image || !this.display.width) return

      const ratio = canvas._pixelRatio || 1
      const ctx = canvas.getContext('2d')
      const pad = this.display.pad
      const width = this.display.width
      const height = this.display.height
      const box = this.displayCrop()

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width + pad * 2, height + pad * 2)
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 8
      ctx.drawImage(this.image, pad, pad, width, height)
      ctx.restore()
      ctx.fillStyle = 'rgba(13, 18, 28, 0.62)'
      ctx.fillRect(pad, pad, width, height)

      ctx.save()
      ctx.beginPath()
      ctx.rect(box.x, box.y, box.w, box.h)
      ctx.clip()
      ctx.drawImage(this.image, pad, pad, width, height)

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

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2)
      this.drawHandles(ctx, box)
    },

    drawHandles (ctx, box) {
      const positions = this.handlePositions(box)
      ctx.fillStyle = '#883388'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      Object.keys(positions).forEach((name) => {
        const point = positions[name]
        const size = name.length === 1 ? 9 : 11
        ctx.beginPath()
        ctx.rect(point.x - size / 2, point.y - size / 2, size, size)
        ctx.fill()
        ctx.stroke()
      })
    },

    handlePositions (box) {
      const offset = 6
      return {
        nw: { x: box.x - offset, y: box.y - offset },
        n: { x: box.x + box.w / 2, y: box.y - offset },
        ne: { x: box.x + box.w + offset, y: box.y - offset },
        e: { x: box.x + box.w + offset, y: box.y + box.h / 2 },
        se: { x: box.x + box.w + offset, y: box.y + box.h + offset },
        s: { x: box.x + box.w / 2, y: box.y + box.h + offset },
        sw: { x: box.x - offset, y: box.y + box.h + offset },
        w: { x: box.x - offset, y: box.y + box.h / 2 }
      }
    },

    displayCrop () {
      const crop = this.roundedCrop
      return {
        x: crop.x * this.display.scale + this.display.pad,
        y: crop.y * this.display.scale + this.display.pad,
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
      const point = this.pointerPosition(event)
      const handle = this.hitTest(point)
      if (!handle) return

      event.preventDefault()
      this.$refs.canvas.focus()
      this.$refs.canvas.setPointerCapture(event.pointerId)
      this.interaction = {
        handle,
        start: {
          x: (point.x - this.display.pad) / this.display.scale,
          y: (point.y - this.display.pad) / this.display.scale
        },
        crop: { ...this.crop }
      }
      this.setCursor(handle)
    },

    onPointerMove (event) {
      const point = this.pointerPosition(event)
      if (!this.interaction) {
        const handle = this.hitTest(point)
        this.setCursor(handle)
        return
      }

      event.preventDefault()
      const naturalPoint = {
        x: (point.x - this.display.pad) / this.display.scale,
        y: (point.y - this.display.pad) / this.display.scale
      }
      const delta = {
        x: naturalPoint.x - this.interaction.start.x,
        y: naturalPoint.y - this.interaction.start.y
      }

      if (this.interaction.handle === 'move') {
        this.moveCrop(delta)
      } else {
        this.resizeCrop(delta)
      }
      this.draw()
    },

    onPointerUp (event) {
      if (!this.interaction) return
      if (this.$refs.canvas.hasPointerCapture(event.pointerId)) {
        this.$refs.canvas.releasePointerCapture(event.pointerId)
      }
      this.crop = { ...this.roundedCrop }
      this.interaction = null
      this.draw()
      this.setCursor(this.hitTest(this.pointerPosition(event)))
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
      this.aspect = 'free'
      this.crop = {
        x: 0,
        y: 0,
        w: this.imageWidth,
        h: this.imageHeight
      }
      this.message = ''
      this.draw()
    },

    moveCrop (delta) {
      const original = this.interaction.crop
      this.crop.x = this.clamp(original.x + delta.x, 0, this.imageWidth - original.w)
      this.crop.y = this.clamp(original.y + delta.y, 0, this.imageHeight - original.h)
    },

    resizeCrop (delta) {
      const handle = this.interaction.handle
      const original = this.interaction.crop
      const minSize = Math.max(10, 24 / this.display.scale)
      let left = original.x
      let right = original.x + original.w
      let top = original.y
      let bottom = original.y + original.h

      if (handle.includes('w')) left = this.clamp(original.x + delta.x, 0, right - minSize)
      if (handle.includes('e')) right = this.clamp(original.x + original.w + delta.x, left + minSize, this.imageWidth)
      if (handle.includes('n')) top = this.clamp(original.y + delta.y, 0, bottom - minSize)
      if (handle.includes('s')) bottom = this.clamp(original.y + original.h + delta.y, top + minSize, this.imageHeight)

      if (this.aspectValue) {
        const ratio = this.aspectValue
        if (handle.length === 2) {
          let width = right - left
          let height = bottom - top
          if (width / height > ratio) height = width / ratio
          else width = height * ratio

          const anchorX = handle.includes('e') ? original.x : original.x + original.w
          const anchorY = handle.includes('s') ? original.y : original.y + original.h
          const maxWidth = handle.includes('e') ? this.imageWidth - anchorX : anchorX
          const maxHeight = handle.includes('s') ? this.imageHeight - anchorY : anchorY
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
          const maxHeight = 2 * Math.min(centerY, this.imageHeight - centerY)
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
          const maxWidth = 2 * Math.min(centerX, this.imageWidth - centerX)
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
        x: this.clamp(left, 0, this.imageWidth - 1),
        y: this.clamp(top, 0, this.imageHeight - 1),
        w: this.clamp(right - left, 1, this.imageWidth - left),
        h: this.clamp(bottom - top, 1, this.imageHeight - top)
      }
    },

    setCursor (handle) {
      if (!this.$refs.canvas) return
      const cursors = {
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
      this.$refs.canvas.style.cursor = cursors[handle] || 'crosshair'
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
      this.crop.x = this.clamp(this.crop.x, 0, this.imageWidth - this.crop.w)
      this.crop.y = this.clamp(this.crop.y, 0, this.imageHeight - this.crop.h)
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

      width = Math.min(width, this.imageWidth)
      height = Math.min(height, this.imageHeight)
      this.crop = {
        x: this.clamp(centerX - width / 2, 0, this.imageWidth - width),
        y: this.clamp(centerY - height / 2, 0, this.imageHeight - height),
        w: width,
        h: height
      }
      this.draw()
    },

    resetCrop () {
      if (!this.image) return
      let width = this.imageWidth
      let height = this.imageHeight

      if (this.aspectValue) {
        if (width / height > this.aspectValue) width = height * this.aspectValue
        else height = width / this.aspectValue
      }

      this.crop = {
        x: (this.imageWidth - width) / 2,
        y: (this.imageHeight - height) / 2,
        w: width,
        h: height
      }
      this.draw()
    },

    updateCropValue (key, event) {
      const value = Number(event.target.value)
      if (!Number.isFinite(value)) {
        event.target.value = this.roundedCrop[key]
        return
      }

      if (key === 'x') {
        this.crop.x = this.clamp(value, 0, this.imageWidth - this.crop.w)
      } else if (key === 'y') {
        this.crop.y = this.clamp(value, 0, this.imageHeight - this.crop.h)
      } else if (key === 'w') {
        this.crop.w = this.clamp(value, 1, this.imageWidth - this.crop.x)
        if (this.aspectValue) {
          this.crop.h = Math.min(this.crop.w / this.aspectValue, this.imageHeight - this.crop.y)
          this.crop.w = this.crop.h * this.aspectValue
        }
      } else if (key === 'h') {
        this.crop.h = this.clamp(value, 1, this.imageHeight - this.crop.y)
        if (this.aspectValue) {
          this.crop.w = Math.min(this.crop.h * this.aspectValue, this.imageWidth - this.crop.x)
          this.crop.h = this.crop.w / this.aspectValue
        }
      }
      event.target.value = this.roundedCrop[key]
      this.draw()
    },

    setResizeSizeFromCrop () {
      const crop = this.roundedCrop
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
        ctx.drawImage(
          this.image,
          crop.x,
          crop.y,
          crop.w,
          crop.h,
          0,
          0,
          outputSize.w,
          outputSize.h
        )
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
  --accent: #883388;
  --accent-dark: #6d286d;
  --ink: #29242e;
  --muted: #716a76;
  --line: #e5dfe8;
  --panel: #faf8fb;
  margin: 2rem 0 4rem;
  color: var(--ink);
}

.drop-zone {
  min-height: 27rem;
  padding: 3rem 2rem;
  border: 2px dashed #cfbfd2;
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at 50% 0%, rgba(136, 51, 136, 0.1), transparent 42%),
    #fcfbfc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.drop-zone.is-dragging {
  border-color: var(--accent);
  background-color: #f8f1f8;
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
  background: #f0e4f0;
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
  box-shadow: 0 8px 20px rgba(96, 29, 96, 0.18);
  transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}

.primary-button:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(96, 29, 96, 0.24);
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
  min-width: 0;
  padding: 1.35rem 1.35rem 0.8rem;
  background-color: #202027;
  background-image:
    linear-gradient(45deg, #25252d 25%, transparent 25%),
    linear-gradient(-45deg, #25252d 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #25252d 75%),
    linear-gradient(-45deg, transparent 75%, #25252d 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
}

.canvas-stage {
  min-height: 20rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

canvas {
  max-width: 100%;
  display: block;
  touch-action: none;
  outline: 0;
}

canvas:focus-visible {
  box-shadow: 0 0 0 3px rgba(196, 126, 196, 0.8);
}

.canvas-help {
  margin: 0.8rem 0 0;
  color: #aaa3ad;
  font-size: 0.75rem;
  text-align: center;
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
.number-grid input {
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
.number-grid input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(136, 51, 136, 0.1);
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
    padding: 0.8rem 0.8rem 0.65rem;
  }

  .canvas-stage {
    min-height: 14rem;
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

  .canvas-help {
    line-height: 1.45;
  }
}
</style>
