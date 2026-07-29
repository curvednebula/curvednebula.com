<template>
  <div class="crop-tool">
    <section
      v-if="!hasSource"
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
        accept="video/*,.avi,.mkv,video/x-msvideo,video/x-matroska"
        @change="onFileSelected"
      >
      <div class="upload-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>
        </svg>
      </div>
      <h2>{{ isPreparingAvi ? 'Opening AVI video' : 'Choose a video to crop or resize' }}</h2>
      <p>{{ isPreparingAvi ? preparationStage : 'Drop a video here, or select one from your device.' }}</p>
      <button class="primary-button" type="button" @click="handleSelectButton">
        {{ isPreparingAvi ? 'Cancel opening' : 'Select video' }}
      </button>
      <span class="privacy-note">
        {{ isPreparingAvi ? 'Reading the file locally without loading it all into memory.' : 'Supports MP4, WebM, MKV, MOV, and AVI · Exports WebM · Your video stays on your device.' }}
      </span>
    </section>

    <div v-else class="workspace">
      <div class="toolbar">
        <div class="file-summary">
          <span class="file-name" :title="sourceName">{{ sourceName }}</span>
          <span>{{ videoWidth }} × {{ videoHeight }} px · {{ formattedDuration }}</span>
        </div>
        <button class="text-button" type="button" :disabled="isExporting" @click="openFilePicker">
          Another Video
        </button>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept="video/*,.avi,.mkv,video/x-msvideo,video/x-matroska"
          @change="onFileSelected"
        >
      </div>

      <div class="editor-layout">
        <section class="canvas-panel">
          <div ref="stage" class="canvas-stage">
            <canvas
              ref="canvas"
              tabindex="0"
              aria-label="Video crop area. Drag to move the crop and use the handles to resize it."
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @dblclick="onCanvasDoubleClick"
              @keydown="onCanvasKeydown"
            />
          </div>

          <div class="playback">
            <button
              class="play-button"
              type="button"
              :aria-label="isPlaying ? 'Pause preview' : 'Play preview'"
              @click="togglePlayback"
            >
              <svg v-if="!isPlaying" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5h4v14H7zm6 0h4v14h-4z"/>
              </svg>
            </button>
            <div class="timeline-stack">
              <input
                class="timeline"
                type="range"
                min="0"
                :max="duration || 0"
                step="0.01"
                :value="currentTime"
                aria-label="Video position"
                @input="scrubVideo"
              >
              <div
                ref="trimRange"
                class="trim-range"
                :style="trimRangeStyle"
                @pointerdown="onTrimPointerDown"
                @pointermove="onTrimPointerMove"
                @pointerup="onTrimPointerUp"
                @pointercancel="onTrimPointerUp"
              >
                <div class="trim-track" aria-hidden="true"><span /></div>
                <i class="trim-guide trim-guide-start" aria-hidden="true" />
                <i class="trim-guide trim-guide-end" aria-hidden="true" />
                <input
                  ref="trimStartRange"
                  type="range"
                  min="0"
                  :max="duration || 0"
                  step="0.01"
                  :value="trimStart"
                  :disabled="isExporting"
                  aria-label="Trim start"
                  @input="updateTrimStart"
                >
                <input
                  ref="trimEndRange"
                  type="range"
                  min="0"
                  :max="duration || 0"
                  step="0.01"
                  :value="trimEnd"
                  :disabled="isExporting"
                  aria-label="Trim end"
                  @input="updateTrimEnd"
                >
              </div>
            </div>
            <span class="timecode">{{ formatTime(currentTime) }} / {{ formattedDuration }}</span>
          </div>
          <div class="trim-editor">
            <div class="trim-heading">
              <span>Trim clip</span>
              <span>{{ formattedTrimDuration }} selected</span>
            </div>
            <div class="trim-fields">
              <label>
                <span>Start</span>
                <span class="trim-time">{{ formatTimePrecise(trimStart) }}</span>
                <input
                  :value="formatTimePrecise(trimStart)"
                  type="text"
                  placeholder="H:M:S.S"
                  :disabled="isExporting"
                  aria-label="Trim start time. Enter hours, minutes, and seconds; hours and minutes are optional"
                  @change="updateTrimStart"
                >
                <button class="trim-set-button" type="button" :disabled="isExporting" @click="setTrimBoundary('start')">
                  Set to playhead
                </button>
              </label>
              <label>
                <span>End</span>
                <span class="trim-time">{{ formatTimePrecise(trimEnd) }}</span>
                <input
                  :value="formatTimePrecise(trimEnd)"
                  type="text"
                  placeholder="H:M:S.S"
                  :disabled="isExporting"
                  aria-label="Trim end time. Enter hours, minutes, and seconds; hours and minutes are optional"
                  @change="updateTrimEnd"
                >
                <button class="trim-set-button" type="button" :disabled="isExporting" @click="setTrimBoundary('end')">
                  Set to playhead
                </button>
              </label>
              <button class="trim-reset-button" type="button" :disabled="isExporting || !hasTrim" @click="resetTrim">
                Reset trim
              </button>
            </div>
          </div>
          <p class="canvas-help">
            Drag inside to move · Drag handles to resize · Double-click for full video · Arrow keys nudge
          </p>
        </section>

        <aside class="settings-panel">
          <div class="setting-group">
            <label for="crop-aspect">Aspect ratio</label>
            <select id="crop-aspect" v-model="aspect" :disabled="isExporting" @change="applyAspectRatio">
              <option value="free">Freeform</option>
              <option value="1">Square · 1:1</option>
              <option value="1.3333333333">Landscape · 4:3</option>
              <option value="1.7777777778">Widescreen · 16:9</option>
              <option value="0.8">Portrait · 4:5</option>
              <option value="0.5625">Vertical · 9:16</option>
              <option value="2.35">Cinema · 2.35:1</option>
            </select>
          </div>

          <div class="setting-group">
            <div class="setting-heading">
              <span>Crop area</span>
              <button class="mini-button" type="button" :disabled="isExporting" @click="resetCrop">Reset</button>
            </div>
            <div class="number-grid">
              <label>
                <span>X</span>
                <input :value="roundedCrop.x" type="number" min="0" :disabled="isExporting" @change="updateCropValue('x', $event)">
              </label>
              <label>
                <span>Y</span>
                <input :value="roundedCrop.y" type="number" min="0" :disabled="isExporting" @change="updateCropValue('y', $event)">
              </label>
              <label>
                <span>Width</span>
                <input :value="roundedCrop.w" type="number" min="2" :max="videoWidth" :disabled="isExporting" @change="updateCropValue('w', $event)">
              </label>
              <label>
                <span>Height</span>
                <input :value="roundedCrop.h" type="number" min="2" :max="videoHeight" :disabled="isExporting" @change="updateCropValue('h', $event)">
              </label>
            </div>
          </div>

          <div class="divider" />

          <div class="setting-group">
            <label for="resolution-preset">Output resolution</label>
            <select id="resolution-preset" v-model="resolutionPreset" :disabled="isExporting" @change="applyResolutionPreset">
              <option value="crop">Same as crop</option>
              <option value="2160">2160p</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="custom">Custom</option>
            </select>
            <div class="number-grid output-grid">
              <label>
                <span>Width</span>
                <input :value="outputWidth" type="number" min="2" max="8192" :disabled="isExporting" @change="updateOutputDimension('w', $event)">
              </label>
              <label>
                <span>Height</span>
                <input :value="outputHeight" type="number" min="2" max="8192" :disabled="isExporting" @change="updateOutputDimension('h', $event)">
              </label>
            </div>
            <label class="check-control resize-lock">
              <input v-model="outputAspectLocked" type="checkbox" :disabled="isExporting">
              <span>Keep aspect ratio</span>
            </label>
          </div>

          <div class="setting-group compact-row">
            <label for="frame-rate">Frame rate</label>
            <select id="frame-rate" v-model.number="frameRate" :disabled="isExporting">
              <option :value="24">24 fps</option>
              <option :value="30">30 fps</option>
              <option :value="60">60 fps</option>
            </select>
          </div>

          <div class="setting-group">
            <div class="range-label">
              <label for="output-quality">Quality</label>
              <span>{{ qualityLabel }}</span>
            </div>
            <input
              id="output-quality"
              v-model.number="quality"
              class="quality-range"
              type="range"
              min="0.45"
              max="1"
              step="0.01"
              :disabled="isExporting"
            >
          </div>

          <div class="setting-group">
            <label class="check-control">
              <input
                v-model="preserveAudio"
                type="checkbox"
                :disabled="isExporting || !audioEncodingSupported || (isAviSource && !aviAudioExportSupported)"
              >
              <span>{{ audioOptionLabel }}</span>
            </label>
          </div>

          <div class="output-summary">
            <span class="output-label">Output</span>
            <span class="output-value">{{ outputSize.w }} × {{ outputSize.h }} px · WebM</span>
            <span class="output-detail">{{ formattedTrimDuration }} · {{ frameRate }} fps · {{ formattedBitrate }}</span>
          </div>

          <div v-if="isExporting" class="progress-wrap" aria-live="polite">
            <div class="progress-track">
              <span :style="{ width: `${exportProgress}%` }" />
            </div>
            <span>{{ exportStage }} · {{ Math.round(exportProgress) }}%</span>
          </div>

          <button
            class="primary-button save-button"
            type="button"
            :disabled="!webCodecsSupported"
            @click="saveVideo"
          >
            <svg v-if="!isExporting" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h10v10H7z"/>
            </svg>
            {{ isExporting ? 'Cancel' : 'Save Video' }}
          </button>
        </aside>
      </div>
    </div>

    <p v-if="message" class="status-message" :class="{ error: messageIsError }" role="status">{{ message }}</p>
    <p v-if="!webCodecsSupported" class="compatibility-message">
      Video export requires WebCodecs. Open this tool in a recent Chrome, Edge, or another browser with VideoEncoder support.
    </p>
  </div>
</template>

<script>
import { WebDemuxer } from 'web-demuxer'

export default {
  name: 'VideoCrop',

  data () {
    return {
      video: null,
      videoUrl: '',
      sourceFile: null,
      sourceName: '',
      videoWidth: 0,
      videoHeight: 0,
      duration: 0,
      currentTime: 0,
      trimStart: 0,
      trimEnd: 0,
      crop: { x: 0, y: 0, w: 0, h: 0 },
      aspect: 'free',
      resolutionPreset: 'crop',
      outputWidth: 2,
      outputHeight: 2,
      outputAspectLocked: true,
      frameRate: 30,
      quality: 0.78,
      preserveAudio: true,
      display: { width: 0, height: 0, scale: 1, pad: 0 },
      interaction: null,
      trimInteraction: null,
      isDraggingOver: false,
      isPlaying: false,
      isExporting: false,
      cancelRequested: false,
      activeConversion: null,
      exportProgress: 0,
      exportStage: 'Preparing',
      message: '',
      messageIsError: false,
      clientReady: false,
      resizeObserver: null,
      previewFrameHandle: null,
      isPreparingAvi: false,
      preparationStage: '',
      aviCancelRequested: false,
      aviDemuxer: null,
      aviDecoderConfig: null,
      aviVideoStream: null,
      aviAudioDecoderConfig: null,
      aviAudioStream: null,
      aviFrame: null,
      aviDecodeMode: '',
      aviDecodeGeneration: 0,
      aviDecodeOperations: [],
      aviSeekTimer: null,
      aviPlaybackStartedAt: 0,
      isAviSource: false
    }
  },

  computed: {
    hasSource () {
      return Boolean(this.video || this.aviDemuxer)
    },

    webCodecsSupported () {
      return this.clientReady &&
        typeof window !== 'undefined' &&
        typeof window.VideoEncoder !== 'undefined' &&
        typeof window.VideoFrame !== 'undefined'
    },

    audioEncodingSupported () {
      return typeof window !== 'undefined' &&
        typeof window.AudioEncoder !== 'undefined' &&
        typeof window.AudioData !== 'undefined'
    },

    aviAudioExportSupported () {
      return Boolean(this.aviAudioStream && this.aviAudioDecoderConfig)
    },

    audioOptionLabel () {
      if (!this.isAviSource) return 'Preserve audio when supported'
      if (!this.aviAudioStream) return 'This AVI has no audio track'
      if (!this.aviAudioExportSupported) return 'This AVI audio codec is not supported by this browser'
      return 'Preserve AVI audio'
    },

    roundedCrop () {
      if (!this.videoWidth || !this.videoHeight) return { x: 0, y: 0, w: 2, h: 2 }
      const left = this.clamp(Math.round(this.crop.x), 0, this.videoWidth - 2)
      const top = this.clamp(Math.round(this.crop.y), 0, this.videoHeight - 2)
      const right = this.clamp(Math.round(this.crop.x + this.crop.w), left + 2, this.videoWidth)
      const bottom = this.clamp(Math.round(this.crop.y + this.crop.h), top + 2, this.videoHeight)
      return { x: left, y: top, w: right - left, h: bottom - top }
    },

    aspectValue () {
      return this.aspect === 'free' ? null : Number(this.aspect)
    },

    outputSize () {
      return {
        w: this.makeEven(this.clamp(Math.round(this.outputWidth), 2, 8192)),
        h: this.makeEven(this.clamp(Math.round(this.outputHeight), 2, 8192))
      }
    },

    formattedDuration () {
      return this.formatTime(this.duration)
    },

    minimumTrimDuration () {
      return Math.min(this.duration, Math.max(0.01, 1 / this.frameRate))
    },

    trimDuration () {
      return Math.max(0, this.trimEnd - this.trimStart)
    },

    formattedTrimDuration () {
      return this.formatTimePrecise(this.trimDuration)
    },

    hasTrim () {
      return this.trimStart > 0.005 || this.trimEnd < this.duration - 0.005
    },

    trimRangeStyle () {
      const duration = this.duration || 1
      const startRatio = this.trimStart / duration
      const endRatio = this.trimEnd / duration
      return {
        '--trim-start-position': `calc(${startRatio * 100}% + ${1 - startRatio * 2}rem)`,
        '--trim-end-position': `calc(${endRatio * 100}% + ${1 - endRatio * 2}rem)`
      }
    },

    bitrate () {
      const pixelsPerSecond = this.outputSize.w * this.outputSize.h * this.frameRate
      const qualityFactor = 0.035 + this.quality * 0.095
      return Math.round(this.clamp(pixelsPerSecond * qualityFactor, 600000, 30000000))
    },

    formattedBitrate () {
      return `${(this.bitrate / 1000000).toFixed(1)} Mbps`
    },

    qualityLabel () {
      if (this.quality < 0.62) return 'Compact'
      if (this.quality < 0.86) return 'Balanced'
      return 'High'
    }
  },

  watch: {
    frameRate () {
      if (!this.duration || this.trimDuration >= this.minimumTrimDuration) return
      if (this.trimStart + this.minimumTrimDuration <= this.duration) {
        this.trimEnd = this.trimStart + this.minimumTrimDuration
      } else {
        this.trimStart = Math.max(0, this.trimEnd - this.minimumTrimDuration)
      }
    }
  },

  mounted () {
    // Keep the initial client render identical to the server-rendered markup.
    this.clientReady = true
  },

  beforeUnmount () {
    this.cancelAviPreparation()
    this.cleanUpVideo()
    if (this.resizeObserver) this.resizeObserver.disconnect()
    window.removeEventListener('resize', this.layoutCanvas)
  },

  methods: {
    openFilePicker () {
      if (this.isExporting || this.isPreparingAvi) return
      this.clearMessage()
      this.$refs.fileInput.click()
    },

    handleSelectButton () {
      if (this.isPreparingAvi) this.cancelAviPreparation()
      else this.openFilePicker()
    },

    onFileSelected (event) {
      const file = event.target.files && event.target.files[0]
      if (file) this.loadFile(file)
      event.target.value = ''
    },

    onDrop (event) {
      this.isDraggingOver = false
      if (this.isPreparingAvi) return
      const file = event.dataTransfer.files && event.dataTransfer.files[0]
      if (file) this.loadFile(file)
    },

    loadFile (file) {
      const isAvi = /\.avi$/i.test(file.name) ||
        file.type === 'video/x-msvideo' ||
        file.type === 'video/avi'
      const hasSupportedVideoExtension = /\.(?:avi|mkv|webm|mp4|m4v|mov)$/i.test(file.name)
      if ((!file.type || !file.type.startsWith('video/')) && !isAvi && !hasSupportedVideoExtension) {
        this.setMessage('Please choose a valid video file.', true)
        return
      }

      if (isAvi) {
        this.prepareAviFile(file)
        return
      }
      this.openBrowserVideo(file, file.name)
    },

    openBrowserVideo (file, displayName, loadNotice = '') {
      const nextUrl = URL.createObjectURL(file)
      const nextVideo = document.createElement('video')
      nextVideo.preload = 'auto'
      nextVideo.muted = true
      nextVideo.playsInline = true

      const onLoadError = () => {
        URL.revokeObjectURL(nextUrl)
        this.setMessage('This video could not be opened. Try an MP4, WebM, MKV, or MOV file supported by your browser.', true)
      }

      nextVideo.addEventListener('loadedmetadata', () => {
        nextVideo.removeEventListener('error', onLoadError)
        if (!nextVideo.videoWidth || !nextVideo.videoHeight || !Number.isFinite(nextVideo.duration)) {
          URL.revokeObjectURL(nextUrl)
          this.setMessage('This video does not contain a readable video track.', true)
          return
        }

        this.cleanUpVideo()
        this.videoUrl = nextUrl
        this.video = nextVideo
        this.sourceFile = file
        this.sourceName = displayName
        this.videoWidth = nextVideo.videoWidth
        this.videoHeight = nextVideo.videoHeight
        this.duration = nextVideo.duration
        this.currentTime = 0
        this.trimStart = 0
        this.trimEnd = nextVideo.duration
        this.aspect = 'free'
        this.resolutionPreset = 'crop'
        this.outputAspectLocked = true
        this.preserveAudio = true
        this.isPlaying = false
        if (loadNotice) this.setMessage(loadNotice)
        else this.clearMessage()
        this.resetCrop()
        this.setOutputFromCrop()

        nextVideo.addEventListener('timeupdate', this.onVideoTimeUpdate)
        nextVideo.addEventListener('ended', this.onVideoEnded)
        nextVideo.addEventListener('seeked', this.draw)
        nextVideo.addEventListener('loadeddata', this.draw)

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
      }, { once: true })

      nextVideo.addEventListener('error', onLoadError, { once: true })

      nextVideo.src = nextUrl
    },

    async prepareAviFile (file) {
      if (this.isPreparingAvi) return
      this.cleanUpVideo()
      this.isPreparingAvi = true
      this.aviCancelRequested = false
      this.preparationStage = 'Loading the local AVI reader…'
      this.clearMessage()

      let demuxer = null
      try {
        demuxer = new WebDemuxer({
          wasmFilePath: new URL('/web-demuxer/web-demuxer.wasm', window.location.origin).href
        })
        await demuxer.load(file)
        if (this.aviCancelRequested) throw new Error('AVI_CANCELED')

        this.preparationStage = 'Reading AVI metadata…'
        const mediaInfo = await demuxer.getMediaInfo()
        const videoStream = mediaInfo.streams && mediaInfo.streams.find(stream =>
          stream.codec_type === 0 || stream.codec_type_string === 'video'
        )
        const audioStream = mediaInfo.streams && mediaInfo.streams.find(stream =>
          stream.codec_type === 1 || stream.codec_type_string === 'audio'
        )
        if (!videoStream || !videoStream.width || !videoStream.height) {
          throw new Error('No readable video track was found.')
        }

        const decoderConfig = this.normalizeAviDecoderConfig(
          demuxer.genDecoderConfig('video', videoStream),
          videoStream
        )
        let decodeMode = ''
        try {
          const support = await VideoDecoder.isConfigSupported(decoderConfig)
          if (support.supported) decodeMode = 'webcodecs'
        } catch (error) {}
        if (!decodeMode && /mjpeg|mjpe?g/i.test(videoStream.codec_name || decoderConfig.codec || '')) {
          decodeMode = 'mjpeg'
        }
        if (!decodeMode) {
          const codec = videoStream.codec_name || decoderConfig.codec || 'unknown'
          const codecDetails = decoderConfig.codec && decoderConfig.codec !== codec
            ? `${codec} (${decoderConfig.codec})`
            : codec
          throw new Error(`The AVI uses the “${codecDetails}” codec, which this browser cannot decode with WebCodecs.`)
        }
        if (this.aviCancelRequested) throw new Error('AVI_CANCELED')

        let audioDecoderConfig = null
        if (audioStream && this.audioEncodingSupported && typeof window.AudioDecoder !== 'undefined') {
          const candidate = demuxer.genDecoderConfig('audio', audioStream)
          try {
            const decodeSupport = await AudioDecoder.isConfigSupported(candidate)
            const channels = Math.min(Math.max(1, Number(audioStream.channels) || 1), 2)
            const encodeSupport = await AudioEncoder.isConfigSupported({
              codec: 'opus',
              sampleRate: 48000,
              numberOfChannels: channels,
              bitrate: channels === 1 ? 96000 : 160000
            })
            if (decodeSupport.supported && encodeSupport.supported) audioDecoderConfig = candidate
          } catch (error) {
            console.warn('AVI audio is not supported by this browser.', error)
          }
        }

        this.aviDemuxer = demuxer
        demuxer = null
        this.aviDecoderConfig = decoderConfig
        this.aviVideoStream = videoStream
        this.aviAudioDecoderConfig = audioDecoderConfig
        this.aviAudioStream = audioStream || null
        this.aviDecodeMode = decodeMode
        this.isAviSource = true
        this.sourceFile = file
        this.sourceName = file.name
        this.videoWidth = videoStream.width
        this.videoHeight = videoStream.height
        this.duration = Number(mediaInfo.duration) || Number(videoStream.duration) || 0
        this.currentTime = 0
        this.trimStart = 0
        this.trimEnd = this.duration
        this.aspect = 'free'
        this.resolutionPreset = 'crop'
        this.outputAspectLocked = true
        this.preserveAudio = Boolean(audioDecoderConfig)
        this.isPlaying = false
        this.frameRate = this.closestFrameRate(this.parseFrameRate(videoStream.avg_frame_rate || videoStream.r_frame_rate))
        this.resetCrop()
        this.setOutputFromCrop()

        this.preparationStage = 'Decoding the first frame…'
        await this.decodeAviFrameAt(0)
        if (this.aviCancelRequested) throw new Error('AVI_CANCELED')

        this.isPreparingAvi = false
        this.aviCancelRequested = false
        this.preparationStage = ''
        const audioNotice = audioDecoderConfig
          ? ' Its audio can be preserved.'
          : audioStream
            ? ` Its ${audioStream.codec_name || 'audio'} track is not supported by this browser, so export will be video-only.`
            : ' It has no audio track.'
        this.setMessage(`AVI opened with streaming ${decodeMode === 'mjpeg' ? 'Motion JPEG' : 'WebCodecs'} decoding.${audioNotice}`)
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
      } catch (error) {
        const canceled = this.aviCancelRequested || (error && error.message === 'AVI_CANCELED')
        if (demuxer) demuxer.destroy()
        if (this.aviDemuxer) this.cleanUpVideo()
        this.isPreparingAvi = false
        this.aviCancelRequested = false
        this.preparationStage = ''
        if (canceled) this.setMessage('Opening AVI canceled.')
        else {
          console.error(error)
          this.setMessage(
            `This AVI could not be opened${error && error.message ? `: ${error.message}` : '.'}`,
            true
          )
        }
      }
    },

    cancelAviPreparation () {
      if (!this.isPreparingAvi) return
      this.aviCancelRequested = true
      this.preparationStage = 'Canceling…'
      if (this.aviDemuxer) this.aviDemuxer.destroy()
      this.aviDemuxer = null
      this.isPreparingAvi = false
      this.setMessage('Opening AVI canceled.')
    },

    decodeAviFrameAt (time) {
      const operation = this.performAviFrameDecode(time)
      this.aviDecodeOperations.push(operation)
      const removeOperation = () => {
        const index = this.aviDecodeOperations.indexOf(operation)
        if (index >= 0) this.aviDecodeOperations.splice(index, 1)
      }
      operation.then(removeOperation, removeOperation)
      return operation
    },

    async performAviFrameDecode (time) {
      if (!this.aviDemuxer) throw new Error('AVI source is unavailable.')
      const generation = ++this.aviDecodeGeneration
      const targetTime = this.clamp(Number(time) || 0, 0, Math.max(0, this.duration - 0.001))
      const chunk = await this.aviDemuxer.seek('video', targetTime)
      if (generation !== this.aviDecodeGeneration || !this.aviDemuxer) return

      let frame = null
      if (this.aviDecodeMode === 'mjpeg') {
        const bytes = new Uint8Array(chunk.byteLength)
        chunk.copyTo(bytes)
        frame = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }))
      } else {
        let decoderError = null
        const decoder = new VideoDecoder({
          output: decodedFrame => {
            if (frame) frame.close()
            frame = decodedFrame
          },
          error: error => { decoderError = error }
        })
        try {
          decoder.configure(this.aviDecoderConfig)
          decoder.decode(chunk)
          await decoder.flush()
        } finally {
          decoder.close()
        }
        if (decoderError) throw decoderError
      }

      if (!frame) throw new Error('The selected AVI frame could not be decoded.')
      if (generation !== this.aviDecodeGeneration || !this.aviDemuxer) {
        frame.close()
        return
      }
      if (this.aviFrame) this.aviFrame.close()
      this.aviFrame = frame
      this.currentTime = targetTime
      this.draw()
    },

    async finishPendingAviPreview () {
      if (!this.isAviSource) return
      if (this.aviSeekTimer) clearTimeout(this.aviSeekTimer)
      this.aviSeekTimer = null
      this.aviDecodeGeneration++
      const pending = [...this.aviDecodeOperations]
      if (pending.length) await Promise.allSettled(pending)
    },

    cleanUpVideo () {
      this.stopPreviewLoop()
      this.aviDecodeGeneration++
      if (this.aviSeekTimer) clearTimeout(this.aviSeekTimer)
      this.aviSeekTimer = null
      this.aviDecodeOperations = []
      if (this.video) {
        this.video.pause()
        this.video.removeEventListener('timeupdate', this.onVideoTimeUpdate)
        this.video.removeEventListener('ended', this.onVideoEnded)
        this.video.removeEventListener('seeked', this.draw)
        this.video.removeEventListener('loadeddata', this.draw)
        this.video.removeAttribute('src')
        this.video.load()
      }
      if (this.videoUrl) URL.revokeObjectURL(this.videoUrl)
      if (this.aviFrame) this.aviFrame.close()
      if (this.aviDemuxer) this.aviDemuxer.destroy()
      this.video = null
      this.videoUrl = ''
      this.aviFrame = null
      this.aviDemuxer = null
      this.aviDecoderConfig = null
      this.aviVideoStream = null
      this.aviAudioDecoderConfig = null
      this.aviAudioStream = null
      this.aviDecodeMode = ''
      this.isAviSource = false
    },

    layoutCanvas () {
      if (!this.hasSource || !this.$refs.stage || !this.$refs.canvas) return
      const pad = 12
      const availableWidth = Math.max(280, this.$refs.stage.clientWidth) - pad * 2
      const availableHeight = Math.min(610, Math.max(300, window.innerHeight * 0.52)) - pad * 2
      const scale = Math.min(availableWidth / this.videoWidth, availableHeight / this.videoHeight, 1)
      const width = Math.max(1, Math.round(this.videoWidth * scale))
      const height = Math.max(1, Math.round(this.videoHeight * scale))
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = this.$refs.canvas

      this.display = { width, height, scale: width / this.videoWidth, pad }
      canvas.style.width = `${width + pad * 2}px`
      canvas.style.height = `${height + pad * 2}px`
      canvas.width = Math.round((width + pad * 2) * pixelRatio)
      canvas.height = Math.round((height + pad * 2) * pixelRatio)
      canvas._pixelRatio = pixelRatio
      this.draw()
    },

    draw () {
      const canvas = this.$refs.canvas
      const source = this.isAviSource ? this.aviFrame : this.video
      if (!canvas || !source || !this.display.width || (!this.isAviSource && this.video.readyState < 2)) return
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
      ctx.drawImage(source, pad, pad, width, height)
      ctx.restore()
      ctx.fillStyle = 'rgba(13, 18, 28, 0.65)'
      ctx.fillRect(pad, pad, width, height)

      ctx.save()
      ctx.beginPath()
      ctx.rect(box.x, box.y, box.w, box.h)
      ctx.clip()
      ctx.drawImage(source, pad, pad, width, height)
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

      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2)
      this.drawHandles(ctx, box)
    },

    drawHandles (ctx, box) {
      const positions = this.handlePositions(box)
      ctx.fillStyle = '#883388'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      Object.keys(positions).forEach(name => {
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
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    },

    hitTest (point) {
      const box = this.displayCrop()
      const handles = this.handlePositions(box)
      const hitRadius = 14
      for (const name of Object.keys(handles)) {
        if (Math.abs(point.x - handles[name].x) <= hitRadius &&
          Math.abs(point.y - handles[name].y) <= hitRadius) return name
      }
      if (point.x >= box.x && point.x <= box.x + box.w &&
        point.y >= box.y && point.y <= box.y + box.h) return 'move'
      return null
    },

    onPointerDown (event) {
      if (this.isExporting) return
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
        this.setCursor(this.hitTest(point))
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
      if (this.interaction.handle === 'move') this.moveCrop(delta)
      else this.resizeCrop(delta)
      this.onCropChanged()
    },

    onPointerUp (event) {
      if (!this.interaction) return
      if (this.$refs.canvas.hasPointerCapture(event.pointerId)) {
        this.$refs.canvas.releasePointerCapture(event.pointerId)
      }
      this.crop = { ...this.roundedCrop }
      this.interaction = null
      this.onCropChanged()
      this.setCursor(this.hitTest(this.pointerPosition(event)))
    },

    onCanvasDoubleClick (event) {
      if (this.isExporting) return
      const point = this.pointerPosition(event)
      const box = this.displayCrop()
      const inside = point.x >= box.x && point.x <= box.x + box.w &&
        point.y >= box.y && point.y <= box.y + box.h
      if (!inside) return
      event.preventDefault()
      this.aspect = 'free'
      this.crop = { x: 0, y: 0, w: this.videoWidth, h: this.videoHeight }
      this.onCropChanged()
    },

    moveCrop (delta) {
      const original = this.interaction.crop
      this.crop.x = this.clamp(original.x + delta.x, 0, this.videoWidth - original.w)
      this.crop.y = this.clamp(original.y + delta.y, 0, this.videoHeight - original.h)
    },

    resizeCrop (delta) {
      const handle = this.interaction.handle
      const original = this.interaction.crop
      const minSize = Math.max(16, 24 / this.display.scale)
      let left = original.x
      let right = original.x + original.w
      let top = original.y
      let bottom = original.y + original.h

      if (handle.includes('w')) left = this.clamp(original.x + delta.x, 0, right - minSize)
      if (handle.includes('e')) right = this.clamp(original.x + original.w + delta.x, left + minSize, this.videoWidth)
      if (handle.includes('n')) top = this.clamp(original.y + delta.y, 0, bottom - minSize)
      if (handle.includes('s')) bottom = this.clamp(original.y + original.h + delta.y, top + minSize, this.videoHeight)

      if (this.aspectValue) {
        const ratio = this.aspectValue
        if (handle.length === 2) {
          let width = right - left
          let height = bottom - top
          if (width / height > ratio) height = width / ratio
          else width = height * ratio
          const anchorX = handle.includes('e') ? original.x : original.x + original.w
          const anchorY = handle.includes('s') ? original.y : original.y + original.h
          const maxWidth = handle.includes('e') ? this.videoWidth - anchorX : anchorX
          const maxHeight = handle.includes('s') ? this.videoHeight - anchorY : anchorY
          const fit = Math.min(1, maxWidth / width, maxHeight / height)
          width *= fit
          height *= fit
          left = handle.includes('e') ? anchorX : anchorX - width
          right = handle.includes('e') ? anchorX + width : anchorX
          top = handle.includes('s') ? anchorY : anchorY - height
          bottom = handle.includes('s') ? anchorY + height : anchorY
        } else if (handle === 'e' || handle === 'w') {
          let width = right - left
          let height = width / ratio
          const centerY = original.y + original.h / 2
          const maxHeight = 2 * Math.min(centerY, this.videoHeight - centerY)
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
          const maxWidth = 2 * Math.min(centerX, this.videoWidth - centerX)
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
        x: this.clamp(left, 0, this.videoWidth - 2),
        y: this.clamp(top, 0, this.videoHeight - 2),
        w: this.clamp(right - left, 2, this.videoWidth - left),
        h: this.clamp(bottom - top, 2, this.videoHeight - top)
      }
    },

    setCursor (handle) {
      if (!this.$refs.canvas) return
      const cursors = {
        move: 'move', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize'
      }
      this.$refs.canvas.style.cursor = cursors[handle] || 'crosshair'
    },

    onCanvasKeydown (event) {
      if (this.isExporting || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault()
      const amount = event.shiftKey ? 10 : 1
      if (event.key === 'ArrowLeft') this.crop.x -= amount
      if (event.key === 'ArrowRight') this.crop.x += amount
      if (event.key === 'ArrowUp') this.crop.y -= amount
      if (event.key === 'ArrowDown') this.crop.y += amount
      this.crop.x = this.clamp(this.crop.x, 0, this.videoWidth - this.crop.w)
      this.crop.y = this.clamp(this.crop.y, 0, this.videoHeight - this.crop.h)
      this.onCropChanged()
    },

    applyAspectRatio () {
      if (!this.aspectValue) return
      const centerX = this.crop.x + this.crop.w / 2
      const centerY = this.crop.y + this.crop.h / 2
      let width = this.crop.w
      let height = this.crop.h
      if (width / height > this.aspectValue) width = height * this.aspectValue
      else height = width / this.aspectValue
      width = Math.min(width, this.videoWidth)
      height = Math.min(height, this.videoHeight)
      this.crop = {
        x: this.clamp(centerX - width / 2, 0, this.videoWidth - width),
        y: this.clamp(centerY - height / 2, 0, this.videoHeight - height),
        w: width,
        h: height
      }
      this.onCropChanged()
    },

    resetCrop () {
      if (!this.hasSource) return
      let width = this.videoWidth
      let height = this.videoHeight
      if (this.aspectValue) {
        if (width / height > this.aspectValue) width = height * this.aspectValue
        else height = width / this.aspectValue
      }
      this.crop = {
        x: (this.videoWidth - width) / 2,
        y: (this.videoHeight - height) / 2,
        w: width,
        h: height
      }
      this.onCropChanged()
    },

    updateCropValue (key, event) {
      const value = Number(event.target.value)
      if (!Number.isFinite(value)) {
        event.target.value = this.roundedCrop[key]
        return
      }
      if (key === 'x') this.crop.x = this.clamp(value, 0, this.videoWidth - this.crop.w)
      if (key === 'y') this.crop.y = this.clamp(value, 0, this.videoHeight - this.crop.h)
      if (key === 'w') {
        this.crop.w = this.clamp(value, 2, this.videoWidth - this.crop.x)
        if (this.aspectValue) {
          this.crop.h = Math.min(this.crop.w / this.aspectValue, this.videoHeight - this.crop.y)
          this.crop.w = this.crop.h * this.aspectValue
        }
      }
      if (key === 'h') {
        this.crop.h = this.clamp(value, 2, this.videoHeight - this.crop.y)
        if (this.aspectValue) {
          this.crop.w = Math.min(this.crop.h * this.aspectValue, this.videoWidth - this.crop.x)
          this.crop.h = this.crop.w / this.aspectValue
        }
      }
      event.target.value = this.roundedCrop[key]
      this.onCropChanged()
    },

    onCropChanged () {
      if (this.resolutionPreset === 'crop') this.setOutputFromCrop()
      else if (this.resolutionPreset !== 'custom') this.applyResolutionPreset()
      this.clearMessage()
      this.draw()
    },

    setOutputFromCrop () {
      this.outputWidth = this.makeEven(this.roundedCrop.w)
      this.outputHeight = this.makeEven(this.roundedCrop.h)
    },

    applyResolutionPreset () {
      if (this.resolutionPreset === 'crop') {
        this.setOutputFromCrop()
        return
      }
      if (this.resolutionPreset === 'custom') return
      const longEdge = Number(this.resolutionPreset)
      const ratio = this.roundedCrop.w / this.roundedCrop.h
      if (ratio >= 1) {
        this.outputWidth = this.makeEven(longEdge)
        this.outputHeight = this.makeEven(longEdge / ratio)
      } else {
        this.outputHeight = this.makeEven(longEdge)
        this.outputWidth = this.makeEven(longEdge * ratio)
      }
      this.clearMessage()
    },

    updateOutputDimension (key, event) {
      const value = this.makeEven(this.clamp(Number(event.target.value) || 2, 2, 8192))
      const ratio = this.outputWidth / this.outputHeight || 1
      this.resolutionPreset = 'custom'
      if (key === 'w') {
        this.outputWidth = value
        if (this.outputAspectLocked) this.outputHeight = this.makeEven(value / ratio)
      } else {
        this.outputHeight = value
        if (this.outputAspectLocked) this.outputWidth = this.makeEven(value * ratio)
      }
      event.target.value = key === 'w' ? this.outputWidth : this.outputHeight
      this.clearMessage()
    },

    updateTrimStart (event) {
      this.pausePlayback()
      const limit = Math.max(0, this.trimEnd - this.minimumTrimDuration)
      const value = this.parseTimestamp(event.target.value)
      this.trimStart = this.clamp(Number.isFinite(value) ? value : this.trimStart, 0, limit)
      event.target.value = this.formatTimePrecise(this.trimStart)
      this.seekPreview(this.trimStart)
      this.clearMessage()
    },

    trimPositionFromClientX (clientX) {
      if (!this.$refs.trimRange || !this.duration) return 0
      const rect = this.$refs.trimRange.getBoundingClientRect()
      const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16
      const railPadding = Math.min(rootFontSize, rect.width / 2)
      const railWidth = Math.max(1, rect.width - railPadding * 2)
      const ratio = this.clamp((clientX - rect.left - railPadding) / railWidth, 0, 1)
      return ratio * this.duration
    },

    trimClientXFromTime (time) {
      if (!this.$refs.trimRange || !this.duration) return 0
      const rect = this.$refs.trimRange.getBoundingClientRect()
      const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16
      const railPadding = Math.min(rootFontSize, rect.width / 2)
      return rect.left + railPadding +
        (this.clamp(time, 0, this.duration) / this.duration) * Math.max(1, rect.width - railPadding * 2)
    },

    onTrimPointerDown (event) {
      if (this.isExporting || !this.duration || event.button !== 0) return
      event.preventDefault()
      this.pausePlayback()

      const startX = this.trimClientXFromTime(this.trimStart)
      const endX = this.trimClientXFromTime(this.trimEnd)
      let boundary
      if (event.clientX <= startX) boundary = 'start'
      else if (event.clientX >= endX) boundary = 'end'
      else boundary = event.clientX - startX <= endX - event.clientX ? 'start' : 'end'

      const tipX = boundary === 'start' ? startX : endX
      this.trimInteraction = {
        boundary,
        pointerId: event.pointerId,
        pointerOffset: event.clientX - tipX
      }
      this.$refs.trimRange.setPointerCapture(event.pointerId)
      const input = boundary === 'start' ? this.$refs.trimStartRange : this.$refs.trimEndRange
      if (input) input.focus({ preventScroll: true })
    },

    onTrimPointerMove (event) {
      const interaction = this.trimInteraction
      if (!interaction || interaction.pointerId !== event.pointerId) return
      event.preventDefault()
      const value = this.trimPositionFromClientX(event.clientX - interaction.pointerOffset)
      const mockEvent = { target: { value } }
      if (interaction.boundary === 'start') this.updateTrimStart(mockEvent)
      else this.updateTrimEnd(mockEvent)
    },

    onTrimPointerUp (event) {
      const interaction = this.trimInteraction
      if (!interaction || interaction.pointerId !== event.pointerId) return
      if (this.$refs.trimRange.hasPointerCapture(event.pointerId)) {
        this.$refs.trimRange.releasePointerCapture(event.pointerId)
      }
      this.trimInteraction = null
    },

    updateTrimEnd (event) {
      this.pausePlayback()
      const minimum = Math.min(this.duration, this.trimStart + this.minimumTrimDuration)
      const value = this.parseTimestamp(event.target.value)
      this.trimEnd = this.clamp(Number.isFinite(value) ? value : this.trimEnd, minimum, this.duration)
      event.target.value = this.formatTimePrecise(this.trimEnd)
      this.seekPreview(this.trimEnd)
      this.clearMessage()
    },

    setTrimBoundary (boundary) {
      const mockEvent = { target: { value: this.currentTime } }
      if (boundary === 'start') this.updateTrimStart(mockEvent)
      else this.updateTrimEnd(mockEvent)
    },

    resetTrim () {
      this.pausePlayback()
      this.trimStart = 0
      this.trimEnd = this.duration
      this.clearMessage()
    },

    pausePlayback () {
      if (this.video) this.video.pause()
      this.isPlaying = false
      this.stopPreviewLoop()
    },

    seekPreview (time) {
      const target = this.clamp(Number(time) || 0, this.trimStart, this.trimEnd)
      this.currentTime = target
      if (this.isAviSource) {
        if (this.aviSeekTimer) clearTimeout(this.aviSeekTimer)
        this.aviSeekTimer = setTimeout(() => {
          this.aviSeekTimer = null
          this.decodeAviFrameAt(target).catch(error => {
            console.error(error)
            this.setMessage(`AVI preview failed: ${error.message}`, true)
          })
        }, 80)
      } else if (this.video) {
        this.video.currentTime = Math.min(target, Math.max(0, this.duration - 0.001))
      }
    },

    async togglePlayback () {
      if (!this.hasSource || this.isExporting) return
      if (this.isAviSource) {
        if (this.isPlaying) {
          this.isPlaying = false
          this.stopPreviewLoop()
          return
        }
        if (this.currentTime < this.trimStart || this.currentTime >= this.trimEnd - 0.01) {
          await this.decodeAviFrameAt(this.trimStart)
        }
        this.isPlaying = true
        this.aviPlaybackStartedAt = performance.now() - this.currentTime * 1000
        this.startAviPreviewLoop()
        return
      }
      if (this.video.paused) {
        try {
          if (this.video.currentTime < this.trimStart || this.video.currentTime >= this.trimEnd - 0.01) {
            await this.seekVideo(this.trimStart)
            this.currentTime = this.trimStart
          }
          await this.video.play()
          this.isPlaying = true
          this.startPreviewLoop()
        } catch (error) {
          this.setMessage('Preview playback could not start in this browser.', true)
        }
      } else {
        this.video.pause()
        this.isPlaying = false
        this.stopPreviewLoop()
        this.draw()
      }
    },

    scrubVideo (event) {
      if (!this.hasSource || this.isExporting) return
      const target = this.clamp(Number(event.target.value), 0, this.duration)
      if (this.isAviSource) {
        this.isPlaying = false
        this.stopPreviewLoop()
        this.currentTime = target
        if (this.aviSeekTimer) clearTimeout(this.aviSeekTimer)
        this.aviSeekTimer = setTimeout(() => {
          this.aviSeekTimer = null
          this.decodeAviFrameAt(target).catch(error => {
            console.error(error)
            this.setMessage(`AVI preview failed: ${error.message}`, true)
          })
        }, 80)
        return
      }
      this.video.currentTime = Math.min(target, Math.max(0, this.duration - 0.001))
      this.currentTime = this.video.currentTime
    },

    onVideoTimeUpdate () {
      this.currentTime = this.video ? this.video.currentTime : 0
      if (this.video && this.isPlaying && this.currentTime >= this.trimEnd) {
        this.video.pause()
        this.currentTime = this.trimEnd
        this.isPlaying = false
        this.stopPreviewLoop()
        this.draw()
      }
    },

    onVideoEnded () {
      this.isPlaying = false
      this.stopPreviewLoop()
      this.draw()
    },

    startPreviewLoop () {
      this.stopPreviewLoop()
      const tick = () => {
        if (!this.video || this.video.paused) return
        this.currentTime = this.video.currentTime
        if (this.currentTime >= this.trimEnd) {
          this.video.pause()
          this.currentTime = this.trimEnd
          this.isPlaying = false
          this.stopPreviewLoop()
          this.draw()
          return
        }
        this.draw()
        this.previewFrameHandle = requestAnimationFrame(tick)
      }
      this.previewFrameHandle = requestAnimationFrame(tick)
    },

    startAviPreviewLoop () {
      this.stopPreviewLoop()
      const tick = async () => {
        if (!this.isAviSource || !this.isPlaying) return
        const target = (performance.now() - this.aviPlaybackStartedAt) / 1000
        if (target >= this.trimEnd) {
          this.currentTime = this.trimEnd
          this.onVideoEnded()
          return
        }
        try {
          await this.decodeAviFrameAt(target)
        } catch (error) {
          this.isPlaying = false
          this.setMessage(`AVI preview failed: ${error.message}`, true)
          return
        }
        if (this.isPlaying) this.previewFrameHandle = requestAnimationFrame(tick)
      }
      this.previewFrameHandle = requestAnimationFrame(tick)
    },

    stopPreviewLoop () {
      if (this.previewFrameHandle) cancelAnimationFrame(this.previewFrameHandle)
      this.previewFrameHandle = null
    },

    async saveVideo () {
      if (this.isExporting) {
        this.cancelRequested = true
        this.exportStage = 'Canceling'
        if (this.activeConversion) this.activeConversion.cancel().catch(() => {})
        return
      }
      if (!this.hasSource || !this.webCodecsSupported) return

      if (this.video) this.video.pause()
      this.isPlaying = false
      this.stopPreviewLoop()
      this.isExporting = true
      this.cancelRequested = false
      this.exportProgress = 0
      this.exportStage = 'Preparing'
      this.clearMessage()

      const filename = this.makeOutputName()
      let fileHandle = null
      let writable = null
      const originalTime = this.isAviSource ? this.currentTime : this.video.currentTime

      try {
        await this.finishPendingAviPreview()
        if (typeof window.showSaveFilePicker === 'function') {
          try {
            fileHandle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: 'WebM video',
                accept: { 'video/webm': ['.webm'] }
              }]
            })
          } catch (error) {
            if (error && error.name === 'AbortError') return
            throw error
          }
        }

        if (fileHandle) writable = await fileHandle.createWritable()
        const result = await this.encodeVideo(writable)
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')

        if (writable) {
          if (!result.writableClosed) await writable.close()
          writable = null
          this.setMessage(`Saved ${filename}${result.audioWarning ? ' without audio' : ''}`)
        } else {
          const blob = new Blob([result.buffer], { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          link.remove()
          setTimeout(() => URL.revokeObjectURL(url), 2000)
          this.setMessage(`Downloaded ${filename}${result.audioWarning ? ' without audio' : ''}`)
        }
      } catch (error) {
        if (writable) {
          await writable.abort().catch(() => {})
          writable = null
        }
        if (error && error.message === 'EXPORT_CANCELED') {
          this.setMessage('Export canceled.')
        } else {
          console.error(error)
          this.setMessage(`Video export failed${error && error.message ? `: ${error.message}` : '.'}`, true)
        }
      } finally {
        this.isExporting = false
        this.cancelRequested = false
        this.activeConversion = null
        this.exportProgress = 0
        this.exportStage = 'Preparing'
        if (this.isAviSource) {
          await this.decodeAviFrameAt(originalTime).catch(() => {})
        } else {
          await this.seekVideo(Math.min(originalTime, Math.max(0, this.duration - 0.001))).catch(() => {})
          this.currentTime = this.video ? this.video.currentTime : 0
        }
        this.draw()
      }
    },

    async encodeVideo (writable = null) {
      if (this.isAviSource) return this.encodeAviVideo(writable)
      if (this.canUseMediabunnyExport()) {
        const result = await this.encodeMediabunnyVideo(writable)
        if (result) return result
      }
      return this.encodeBrowserVideoLegacy(writable)
    },

    canUseMediabunnyExport () {
      return Boolean(
        this.sourceFile &&
        /\.(?:mkv|webm|mp4|m4v|mov)$/i.test(this.sourceName)
      )
    },

    async encodeMediabunnyVideo (writable = null) {
      const {
        BlobSource,
        BufferTarget,
        Conversion,
        ConversionCanceledError,
        Input,
        MATROSKA,
        MP4,
        Output,
        QTFF,
        StreamTarget,
        WEBM,
        WebMOutputFormat
      } = await import('mediabunny')
      const size = this.outputSize
      const crop = this.roundedCrop
      const encoderConfig = await this.chooseVideoConfig(size)
      const videoCodec = encoderConfig.codec.startsWith('vp09') ? 'vp9' : 'vp8'
      const input = new Input({
        source: new BlobSource(this.sourceFile),
        formats: [MP4, QTFF, WEBM, MATROSKA]
      })
      let conversion = null

      try {
        this.exportStage = 'Reading media'
        const videoTrack = await input.getPrimaryVideoTrack()
        if (!videoTrack) {
          console.warn('Mediabunny did not find a primary video track; using the compatibility exporter.')
          return null
        }

        const sourceAudioTrack = this.preserveAudio && this.audioEncodingSupported
          ? await input.getPrimaryAudioTrack()
          : null
        const target = writable
          ? new StreamTarget(writable, { chunked: true, chunkSize: 8 * 1024 * 1024 })
          : new BufferTarget()
        const output = new Output({
          format: new WebMOutputFormat(),
          target
        })

        try {
          conversion = await Conversion.init({
            input,
            output,
            tracks: 'primary',
            trim: {
              start: this.trimStart,
              end: this.trimEnd
            },
            video: {
              width: size.w,
              height: size.h,
              fit: 'fill',
              crop: {
                left: crop.x,
                top: crop.y,
                width: crop.w,
                height: crop.h
              },
              frameRate: this.frameRate,
              codec: videoCodec,
              bitrate: this.bitrate,
              keyFrameInterval: 4,
              forceTranscode: true,
              allowRotationMetadata: false
            },
            audio: sourceAudioTrack
              ? async track => {
                  const channels = Math.min(await track.getNumberOfChannels(), 2)
                  return {
                    codec: 'opus',
                    sampleRate: 48000,
                    numberOfChannels: channels,
                    bitrate: channels === 1 ? 96000 : 160000,
                    forceTranscode: true
                  }
                }
              : { discard: true },
            showWarnings: false
          })
        } catch (error) {
          console.warn('Mediabunny could not initialize this file; using the compatibility exporter.', error)
          return null
        }

        const videoIsUsed = conversion.utilizedTracks.some(track => track === videoTrack)
        if (!conversion.isValid || !videoIsUsed) {
          console.warn(
            'Mediabunny could not create a compatible video conversion; using the compatibility exporter.',
            conversion.discardedTracks
          )
          return null
        }
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')

        const audioIsUsed = sourceAudioTrack &&
          conversion.utilizedTracks.some(track => track === sourceAudioTrack)
        const audioWarning = this.preserveAudio &&
          (!this.audioEncodingSupported || !sourceAudioTrack || !audioIsUsed)

        this.activeConversion = conversion
        this.exportStage = audioIsUsed ? 'Encoding video and audio' : 'Encoding video'
        conversion.onProgress = progress => {
          this.exportProgress = Math.min(96, Math.round(progress * 96))
        }

        try {
          await conversion.execute()
        } catch (error) {
          if (error instanceof ConversionCanceledError || this.cancelRequested) {
            throw new Error('EXPORT_CANCELED')
          }
          throw error
        } finally {
          this.activeConversion = null
        }

        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
        this.exportStage = 'Finishing file'
        this.exportProgress = 100
        if (!writable && !target.buffer) throw new Error('The converted video file is empty.')
        return {
          buffer: writable ? null : target.buffer,
          audioWarning,
          writableClosed: Boolean(writable)
        }
      } finally {
        input.dispose()
      }
    },

    async encodeBrowserVideoLegacy (writable = null) {
      const size = this.outputSize
      const crop = this.roundedCrop
      const config = await this.chooseVideoConfig(size)
      let audioBuffer = null
      let audioWarning = this.preserveAudio && !this.audioEncodingSupported

      if (this.preserveAudio && this.audioEncodingSupported) {
        this.exportStage = 'Reading audio'
        try {
          audioBuffer = await this.decodeAndResampleAudio()
          if (audioBuffer.duration <= this.trimStart) {
            audioBuffer = null
            audioWarning = true
          }
        } catch (error) {
          console.warn('Audio could not be decoded for export.', error)
          audioWarning = true
        }
      }
      if (this.cancelRequested) throw new Error('EXPORT_CANCELED')

      const outputCanvas = document.createElement('canvas')
      outputCanvas.width = size.w
      outputCanvas.height = size.h
      const ctx = outputCanvas.getContext('2d', { alpha: false })
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const totalFrames = Math.max(1, Math.ceil(this.trimDuration * this.frameRate))
      const frameDuration = 1 / this.frameRate
      const session = await this.createManualWebMExport(
        writable,
        outputCanvas,
        config,
        audioBuffer ? audioBuffer.numberOfChannels : 0
      )
      this.exportStage = audioBuffer ? 'Encoding video and audio' : 'Encoding video'

      try {
        const videoTask = (async () => {
          try {
            for (let index = 0; index < totalFrames; index++) {
              if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
              const time = Math.min(
                this.trimStart + index / this.frameRate,
                Math.max(this.trimStart, this.trimEnd - 0.001)
              )
              await this.seekVideo(time)
              ctx.drawImage(
                this.video,
                crop.x, crop.y, crop.w, crop.h,
                0, 0, size.w, size.h
              )
              await session.videoSource.add(
                index * frameDuration,
                Math.min(frameDuration, Math.max(0, this.trimDuration - index * frameDuration)),
                { keyFrame: index % (this.frameRate * 4) === 0 }
              )

              if (index % 3 === 0 || index === totalFrames - 1) {
                this.exportProgress = Math.round(((index + 1) / totalFrames) * 96)
                await this.nextTask()
              }
            }
          } finally {
            session.videoSource.close()
          }
        })()
        const audioTask = audioBuffer
          ? this.addAudioBufferRange(
              audioBuffer,
              session.audioSource,
              session.AudioSample,
              this.trimStart,
              this.trimEnd
            ).finally(() => session.audioSource.close())
          : Promise.resolve()

        await Promise.all([videoTask, audioTask])
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')

        return await this.finalizeManualWebMExport(session, writable, audioWarning)
      } catch (error) {
        await this.cancelManualWebMExport(session)
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
        throw error
      } finally {
        if (this.activeConversion === session.output) this.activeConversion = null
      }
    },

    async encodeAviVideo (writable = null) {
      if (!this.aviDemuxer || !this.aviVideoStream) throw new Error('AVI source is unavailable.')
      const size = this.outputSize
      const crop = this.roundedCrop
      const config = await this.chooseVideoConfig(size)
      const outputCanvas = document.createElement('canvas')
      outputCanvas.width = size.w
      outputCanvas.height = size.h
      const ctx = outputCanvas.getContext('2d', { alpha: false })
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const totalFrames = Math.max(1, Math.ceil(this.trimDuration * this.frameRate))
      const frameDuration = 1 / this.frameRate
      const sourceStart = Number(this.aviVideoStream.start_time) || 0
      let nextOutputIndex = 0
      let decodedFrameCount = 0
      const audioEnabled = this.preserveAudio && this.aviAudioExportSupported
      const session = await this.createManualWebMExport(
        writable,
        outputCanvas,
        config,
        audioEnabled ? Math.min(Math.max(1, Number(this.aviAudioStream.channels) || 1), 2) : 0
      )
      this.exportStage = audioEnabled ? 'Encoding video and audio' : 'Encoding video'

      const encodeSourceFrame = async (source, timestamp) => {
        try {
          if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
          const sourceSeconds = Math.max(0, timestamp / 1000000 - sourceStart)
          const sourceIndex = Math.min(
            totalFrames - 1,
            Math.round((sourceSeconds - this.trimStart) * this.frameRate)
          )
          if (sourceIndex < nextOutputIndex) return

          while (nextOutputIndex <= sourceIndex && nextOutputIndex < totalFrames) {
            ctx.drawImage(
              source,
              crop.x, crop.y, crop.w, crop.h,
              0, 0, size.w, size.h
            )
            await session.videoSource.add(
              nextOutputIndex * frameDuration,
              Math.min(
                frameDuration,
                Math.max(0, this.trimDuration - nextOutputIndex * frameDuration)
              ),
              {
                keyFrame: nextOutputIndex % (this.frameRate * 4) === 0
              }
            )
            nextOutputIndex++
          }

          decodedFrameCount++
          if (decodedFrameCount % 3 === 0 || nextOutputIndex >= totalFrames) {
            this.exportProgress = Math.min(96, Math.round((nextOutputIndex / totalFrames) * 96))
            await this.nextTask()
          }
        } finally {
          source.close()
        }
      }

      try {
        const videoTask = (async () => {
          const reader = this.aviDemuxer.read('video', this.trimStart, this.trimEnd).getReader()
          try {
            if (this.aviDecodeMode === 'mjpeg') {
              while (true) {
                if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
                const item = await reader.read()
                if (item.done) break
                const chunk = item.value
                const bytes = new Uint8Array(chunk.byteLength)
                chunk.copyTo(bytes)
                const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }))
                await encodeSourceFrame(bitmap, chunk.timestamp)
              }
            } else {
              let decoderError = null
              let processingError = null
              let pendingFrames = 0
              let processing = Promise.resolve()
              const decoder = new VideoDecoder({
                output: frame => {
                  pendingFrames++
                  processing = processing.then(async () => {
                    if (processingError) {
                      frame.close()
                      pendingFrames--
                      return
                    }
                    try {
                      await encodeSourceFrame(frame, frame.timestamp)
                    } catch (error) {
                      processingError = error
                    } finally {
                      pendingFrames--
                    }
                  })
                },
                error: error => { decoderError = error }
              })
              try {
                decoder.configure(this.aviDecoderConfig)
                while (true) {
                  if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
                  const item = await reader.read()
                  if (item.done) break
                  decoder.decode(item.value)
                  while (decoder.decodeQueueSize > 12 || pendingFrames > 4) {
                    if (decoderError || processingError) throw decoderError || processingError
                    await this.nextTask()
                  }
                }
                await decoder.flush()
                await processing
              } finally {
                decoder.close()
              }
              if (decoderError || processingError) throw decoderError || processingError
            }
          } finally {
            await reader.cancel().catch(() => {})
            reader.releaseLock()
            session.videoSource.close()
          }

          if (!decodedFrameCount || !nextOutputIndex) {
            throw new Error('No AVI video frames could be decoded.')
          }
        })()
        const audioTask = audioEnabled
          ? this.encodeAviAudio(session.audioSource, session.AudioSample)
              .finally(() => session.audioSource.close())
          : Promise.resolve()

        await Promise.all([videoTask, audioTask])
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')

        return await this.finalizeManualWebMExport(
          session,
          writable,
          Boolean(this.aviAudioStream && !audioEnabled)
        )
      } catch (error) {
        await this.cancelManualWebMExport(session)
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
        throw error
      } finally {
        if (this.activeConversion === session.output) this.activeConversion = null
      }
    },

    async createManualWebMExport (writable, outputCanvas, videoConfig, audioChannels = 0) {
      const {
        AudioSample,
        AudioSampleSource,
        BufferTarget,
        CanvasSource,
        Output,
        StreamTarget,
        WebMOutputFormat
      } = await import('mediabunny')
      const target = writable
        ? new StreamTarget(writable, { chunked: true, chunkSize: 8 * 1024 * 1024 })
        : new BufferTarget()
      const output = new Output({
        format: new WebMOutputFormat(),
        target
      })
      const videoSource = new CanvasSource(outputCanvas, {
        codec: videoConfig.codec.startsWith('vp09') ? 'vp9' : 'vp8',
        bitrate: this.bitrate,
        keyFrameInterval: 4,
        latencyMode: 'quality'
      })
      output.addVideoTrack(videoSource)

      const channels = Math.min(Math.max(0, Number(audioChannels) || 0), 2)
      const audioSource = channels
        ? new AudioSampleSource({
            codec: 'opus',
            bitrate: channels === 1 ? 96000 : 160000,
            transform: {
              sampleRate: 48000,
              numberOfChannels: channels
            }
          })
        : null
      if (audioSource) output.addAudioTrack(audioSource)

      await output.start()
      this.activeConversion = output
      return { AudioSample, audioSource, output, target, videoSource }
    },

    async finalizeManualWebMExport (session, writable, audioWarning) {
      this.exportStage = 'Finishing file'
      this.exportProgress = 98
      await session.output.finalize()
      this.exportProgress = 100
      if (!writable && !session.target.buffer) throw new Error('The converted video file is empty.')
      return {
        buffer: writable ? null : session.target.buffer,
        audioWarning,
        writableClosed: Boolean(writable)
      }
    },

    async cancelManualWebMExport (session) {
      if (!session || !session.output || !['pending', 'started'].includes(session.output.state)) return
      await session.output.cancel().catch(() => {})
    },

    async addAudioBufferRange (audioBuffer, audioSource, AudioSample, startTime, endTime) {
      const samples = AudioSample.fromAudioBuffer(audioBuffer, 0)
      for (const sample of samples) {
        if (this.cancelRequested) {
          sample.close()
          throw new Error('EXPORT_CANCELED')
        }
        const overlapStart = Math.max(startTime, sample.timestamp)
        const overlapEnd = Math.min(endTime, sample.timestamp + sample.duration)
        if (overlapEnd <= overlapStart) {
          sample.close()
          continue
        }

        const startFrame = this.clamp(
          Math.round((overlapStart - sample.timestamp) * sample.sampleRate),
          0,
          sample.numberOfFrames
        )
        const endFrame = this.clamp(
          Math.round((overlapEnd - sample.timestamp) * sample.sampleRate),
          startFrame,
          sample.numberOfFrames
        )
        let finalSample = sample
        if (startFrame > 0 || endFrame < sample.numberOfFrames) {
          finalSample = sample.trim(startFrame, endFrame)
          sample.close()
        }
        try {
          if (!finalSample.numberOfFrames) continue
          finalSample.setTimestamp(Math.max(0, finalSample.timestamp - startTime))
          await audioSource.add(finalSample)
        } finally {
          finalSample.close()
        }
      }
    },

    async encodeAviAudio (audioSource, AudioSample) {
      if (!this.aviDemuxer || !this.aviAudioDecoderConfig || !this.aviAudioStream) return
      const streamStart = Number(this.aviAudioStream.start_time) || 0
      let stage = 'opening the audio stream'
      let audioDemuxer = null
      let reader = null
      let decoderError = null
      let processingError = null
      let pendingSamples = 0
      let decodedSamples = 0
      let processing = Promise.resolve()
      const decoder = new AudioDecoder({
        output: audioData => {
          pendingSamples++
          processing = processing.then(async () => {
            if (processingError) {
              audioData.close()
              pendingSamples--
              return
            }
            let sample = null
            try {
              sample = new AudioSample(audioData)
              const sourceStart = sample.timestamp - streamStart
              const sourceEnd = sourceStart + sample.duration
              const overlapStart = Math.max(this.trimStart, sourceStart)
              const overlapEnd = Math.min(this.trimEnd, sourceEnd)
              if (overlapEnd <= overlapStart) return

              const startFrame = this.clamp(
                Math.round((overlapStart - sourceStart) * sample.sampleRate),
                0,
                sample.numberOfFrames
              )
              const endFrame = this.clamp(
                Math.round((overlapEnd - sourceStart) * sample.sampleRate),
                startFrame,
                sample.numberOfFrames
              )
              if (startFrame > 0 || endFrame < sample.numberOfFrames) {
                const trimmed = sample.trim(startFrame, endFrame)
                sample.close()
                sample = trimmed
              }
              if (!sample.numberOfFrames) return
              sample.setTimestamp(Math.max(0, overlapStart - this.trimStart))
              await audioSource.add(sample)
              decodedSamples++
            } catch (error) {
              processingError = error
            } finally {
              if (sample) sample.close()
              else audioData.close()
              pendingSamples--
            }
          })
        },
        error: error => { decoderError = error }
      })

      try {
        audioDemuxer = new WebDemuxer({
          wasmFilePath: new URL('/web-demuxer/web-demuxer.wasm', window.location.origin).href
        })
        await audioDemuxer.load(this.sourceFile)
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
        reader = audioDemuxer.read('audio', this.trimStart, this.trimEnd).getReader()
        stage = 'configuring the decoder'
        decoder.configure(this.aviAudioDecoderConfig)
        stage = 'reading audio packets'
        while (true) {
          if (this.cancelRequested) throw new Error('EXPORT_CANCELED')
          const item = await reader.read()
          if (item.done) break
          stage = 'decoding audio packets'
          decoder.decode(item.value)
          while (decoder.decodeQueueSize > 24 || pendingSamples > 8) {
            if (decoderError || processingError) throw decoderError || processingError
            await this.nextTask()
          }
          stage = 'reading audio packets'
        }
        stage = 'flushing decoded audio'
        await decoder.flush()
        stage = 'encoding audio'
        await processing
        if (decoderError || processingError) throw decoderError || processingError
      } catch (error) {
        if (this.cancelRequested || (error && error.message === 'EXPORT_CANCELED')) throw error
        const detail = error && (error.message || error.name)
        console.error(`AVI audio export failed while ${stage}.`, error)
        throw new Error(`AVI audio export failed while ${stage}${detail ? `: ${detail}` : ''}.`)
      } finally {
        decoder.close()
        if (reader) {
          await reader.cancel().catch(() => {})
          reader.releaseLock()
        }
        if (audioDemuxer) audioDemuxer.destroy()
      }
      if (!decodedSamples) throw new Error('The AVI audio track did not contain decodable samples in the selected range.')
    },

    async chooseVideoConfig (size) {
      const base = {
        width: size.w,
        height: size.h,
        bitrate: this.bitrate,
        framerate: this.frameRate,
        latencyMode: 'quality'
      }
      const candidates = [
        { ...base, codec: 'vp09.00.10.08' },
        { ...base, codec: 'vp8' }
      ]
      for (const candidate of candidates) {
        try {
          const support = await VideoEncoder.isConfigSupported(candidate)
          if (support.supported) return candidate
        } catch (error) {}
      }
      throw new Error('No compatible VP9 or VP8 WebCodecs encoder was found.')
    },

    async decodeAndResampleAudio () {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) throw new Error('Web Audio is unavailable')
      const context = new AudioContextClass()
      try {
        const source = await this.sourceFile.arrayBuffer()
        const decoded = await context.decodeAudioData(source.slice(0))
        if (!decoded || !decoded.numberOfChannels) throw new Error('No audio track found')
        if (decoded.sampleRate === 48000 && decoded.numberOfChannels <= 2) return decoded

        const channels = Math.min(decoded.numberOfChannels, 2)
        const length = Math.ceil(decoded.duration * 48000)
        const offline = new OfflineAudioContext(channels, length, 48000)
        const sourceNode = offline.createBufferSource()
        sourceNode.buffer = decoded
        sourceNode.connect(offline.destination)
        sourceNode.start()
        return await offline.startRendering()
      } finally {
        await context.close().catch(() => {})
      }
    },

    seekVideo (time) {
      if (!this.video) return Promise.reject(new Error('Video is unavailable'))
      const target = this.clamp(time, 0, Math.max(0, this.duration - 0.001))
      if (Math.abs(this.video.currentTime - target) < 0.0005 && this.video.readyState >= 2) {
        return Promise.resolve()
      }
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('Timed out while reading a video frame.'))
        }, 12000)
        const cleanup = () => {
          clearTimeout(timeout)
          this.video.removeEventListener('seeked', onSeeked)
          this.video.removeEventListener('error', onError)
        }
        const onSeeked = () => {
          cleanup()
          resolve()
        }
        const onError = () => {
          cleanup()
          reject(new Error('A source video frame could not be decoded.'))
        }
        this.video.addEventListener('seeked', onSeeked, { once: true })
        this.video.addEventListener('error', onError, { once: true })
        this.video.currentTime = target
      })
    },

    nextTask () {
      return new Promise(resolve => setTimeout(resolve, 0))
    },

    makeOutputName () {
      const base = this.sourceName.replace(/\.[^.]+$/, '') || 'video'
      return `${base}-cropped${this.hasTrim ? '-trimmed' : ''}.webm`
    },

    formatTime (seconds) {
      if (!Number.isFinite(seconds)) return '0:00'
      const whole = Math.max(0, Math.floor(seconds))
      const hours = Math.floor(whole / 3600)
      const minutes = Math.floor((whole % 3600) / 60)
      const remaining = whole % 60
      return hours
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
        : `${minutes}:${String(remaining).padStart(2, '0')}`
    },

    formatTimePrecise (seconds) {
      if (!Number.isFinite(seconds)) return '0:00.00'
      const centiseconds = Math.round(Math.max(0, seconds) * 100)
      const whole = Math.floor(centiseconds / 100)
      const hundredths = centiseconds % 100
      const hours = Math.floor(whole / 3600)
      const minutes = Math.floor((whole % 3600) / 60)
      const remaining = whole % 60
      const base = hours
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
        : `${minutes}:${String(remaining).padStart(2, '0')}`
      return `${base}.${String(hundredths).padStart(2, '0')}`
    },

    parseTimestamp (value) {
      if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : NaN

      const parts = String(value).trim().split(':')
      if (parts.length > 3 || parts.some(part => !/^\d+(?:\.\d+)?$/.test(part))) return NaN
      if (parts.slice(0, -1).some(part => !/^\d+$/.test(part))) return NaN

      const seconds = Number(parts[parts.length - 1])
      const minutes = parts.length >= 2 ? Number(parts[parts.length - 2]) : 0
      const hours = parts.length === 3 ? Number(parts[0]) : 0
      if (seconds >= 60 || (parts.length === 3 && minutes >= 60)) return NaN

      return hours * 3600 + minutes * 60 + seconds
    },

    parseFrameRate (value) {
      if (!value) return 30
      const parts = String(value).split('/').map(Number)
      const rate = parts.length === 2 && parts[1] ? parts[0] / parts[1] : Number(value)
      return Number.isFinite(rate) && rate > 0 ? rate : 30
    },

    normalizeAviDecoderConfig (config, stream) {
      const codecName = `${config && config.codec ? config.codec : ''} ${stream.codec_name || ''}`
      if (!config || !/(^|\s)(h\.?264|avc|avc1\.)/i.test(codecName)) return config

      const profileName = String(stream.profile || '').toLowerCase()
      const numericProfile = Number(stream.profile)
      const profile = Number.isFinite(numericProfile)
        ? numericProfile & 0xff
        : profileName.includes('high') ? 0x64 : profileName.includes('main') ? 0x4d : 0x42
      const constraints = profileName.includes('constrained') || (Number.isFinite(numericProfile) && numericProfile > 0xff)
        ? 0xc0
        : 0x00
      const level = this.clamp(Number(stream.level) || 30, 0, 255)
      const codec = `avc1.${[profile, constraints, level]
        .map(value => Math.round(value).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()}`
      const normalized = { ...config, codec }

      // H.264 in AVI is normally byte-stream (Annex B), while WebCodecs treats
      // a config with `description` as length-prefixed AVC. Drop Annex B
      // extradata so the decoder reads the packet format correctly.
      const description = config.description
      if (description && description.length >= 4 &&
        description[0] === 0 && description[1] === 0 &&
        (description[2] === 1 || (description[2] === 0 && description[3] === 1))) {
        delete normalized.description
      }
      return normalized
    },

    closestFrameRate (value) {
      return [24, 30, 60].reduce((closest, rate) =>
        Math.abs(rate - value) < Math.abs(closest - value) ? rate : closest
      , 30)
    },

    makeEven (value) {
      return Math.max(2, Math.round(value / 2) * 2)
    },

    clamp (value, min, max) {
      return Math.min(Math.max(value, min), Math.max(min, max))
    },

    setMessage (message, isError = false) {
      this.message = message
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
  background: radial-gradient(circle at 50% 0%, rgba(136, 51, 136, 0.1), transparent 42%), #fcfbfc;
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

button, select, input { font: inherit; }
button { cursor: pointer; }
button:disabled, select:disabled, input:disabled { cursor: not-allowed; opacity: 0.62; }

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

.primary-button:hover:not(:disabled) {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(96, 29, 96, 0.24);
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

.text-button, .mini-button {
  border: 0;
  color: var(--accent);
  background: transparent;
  font-weight: 600;
}

.text-button:hover:not(:disabled), .mini-button:hover:not(:disabled) { color: var(--accent-dark); }

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
  min-height: 19rem;
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

canvas:focus-visible { box-shadow: 0 0 0 3px rgba(196, 126, 196, 0.8); }

.playback {
  width: 100%;
  margin: 0.75rem auto 0;
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  align-items: center;
  gap: 0.35rem 0.7rem;
}

.play-button {
  grid-column: 1;
  grid-row: 1;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.play-button:hover { background: rgba(255, 255, 255, 0.17); }
.play-button svg { width: 0.9rem; fill: currentColor; }

.timeline-stack {
  grid-column: 1 / -1;
  grid-row: 2;
  position: relative;
  min-width: 0;
  height: 2.5rem;
}

.timeline-stack::before {
  position: absolute;
  top: 0.475rem;
  right: 1rem;
  left: 1rem;
  height: 0.3rem;
  border-radius: 1rem;
  background: #5b5660;
  content: "";
}

.timeline {
  position: absolute;
  top: 0;
  right: 0.5rem;
  left: 0.5rem;
  z-index: 5;
  width: auto;
  height: 1.25rem;
  margin: 0;
  appearance: none;
  background: transparent;
  outline: none;
}

.timeline:focus-visible {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.9));
}

.timeline::-webkit-slider-runnable-track {
  height: 0.3rem;
  border-radius: 1rem;
  background: transparent;
}

.timeline::-webkit-slider-thumb {
  width: 1rem;
  height: 1rem;
  margin-top: -0.36rem;
  box-sizing: border-box;
  border: 2px solid #fff;
  border-radius: 50%;
  appearance: none;
  background: #883388;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
}

.timeline::-moz-range-track {
  height: 0.3rem;
  border-radius: 1rem;
  background: transparent;
}

.timeline::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  box-sizing: border-box;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #883388;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
}

.timecode {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  color: #d1cad3;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.trim-editor {
  width: min(100%, 38rem);
  margin: 0.85rem auto 0;
  padding: 0.75rem 0.85rem 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.7rem;
  box-sizing: border-box;
  color: #f4eef5;
  background: rgba(17, 17, 22, 0.78);
}

.trim-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #f4eef5;
  font-size: 0.75rem;
  font-weight: 650;
}

.trim-heading span:last-child {
  color: #c9c1cc;
  font-size: 0.68rem;
  font-weight: 500;
}

.trim-range {
  position: absolute;
  top: 0.8rem;
  right: 0;
  left: 0;
  z-index: 4;
  height: 1.7rem;
  cursor: ew-resize;
  touch-action: none;
}

.trim-track {
  position: absolute;
  top: -0.325rem;
  right: 0;
  left: 0;
  z-index: 1;
  height: 0.3rem;
  border-radius: 1rem;
  pointer-events: none;
  background: transparent;
}

.trim-track span {
  position: absolute;
  top: 0;
  right: calc(100% - var(--trim-end-position));
  bottom: 0;
  left: var(--trim-start-position);
  border-radius: inherit;
  background: #c47ec4;
}

.trim-guide {
  position: absolute;
  top: -0.45rem;
  z-index: 1;
  width: 2px;
  height: 1.3rem;
  pointer-events: none;
  background: #fff;
  transform: translateX(-1px);
}

.trim-guide-start { left: var(--trim-start-position); }
.trim-guide-end { left: var(--trim-end-position); }

.trim-range input[type="range"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 1.7rem;
  margin: 0;
  z-index: 2;
  appearance: none;
  pointer-events: none;
  background: transparent;
  outline: none;
}

.trim-range input[type="range"]:focus-visible {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.9));
}

.trim-range input[type="range"]::-webkit-slider-runnable-track {
  height: 0.3rem;
  background: transparent;
}

.trim-range input[type="range"]::-webkit-slider-thumb {
  width: 2rem;
  height: 1.25rem;
  margin-top: -0.48rem;
  border: 0;
  border-radius: 0;
  appearance: none;
  pointer-events: none;
  background-color: transparent;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.trim-range input[type="range"]::-moz-range-track {
  height: 0.3rem;
  background: transparent;
}

.trim-range input[type="range"]::-moz-range-thumb {
  width: 2rem;
  height: 1.25rem;
  border: 0;
  border-radius: 0;
  pointer-events: none;
  background-color: transparent;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.trim-range input[type="range"]:first-of-type::-webkit-slider-thumb {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 22'%3E%3Cpath d='M1 2v18l15-9z' fill='%23883388' stroke='%23fff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E");
}

.trim-range input[type="range"]:last-of-type::-webkit-slider-thumb {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 22'%3E%3Cpath d='M31 2v18l-15-9z' fill='%23883388' stroke='%23fff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E");
}

.trim-range input[type="range"]:first-of-type::-moz-range-thumb {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 22'%3E%3Cpath d='M1 2v18l15-9z' fill='%23883388' stroke='%23fff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E");
}

.trim-range input[type="range"]:last-of-type::-moz-range-thumb {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 22'%3E%3Cpath d='M31 2v18l-15-9z' fill='%23883388' stroke='%23fff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E");
}

.trim-fields {
  margin-top: 0.55rem;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: end;
  gap: 0.55rem;
}

.trim-fields > label {
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.22rem 0.4rem;
  color: #c9c1cc;
  font-size: 0.66rem;
}

.trim-time {
  color: #a9a1ad;
  font-variant-numeric: tabular-nums;
}

.trim-fields input {
  grid-column: 1;
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  padding: 0 0.45rem;
  border: 1px solid #5a535e;
  border-radius: 0.4rem;
  box-sizing: border-box;
  color: #fff;
  background: #2b2930;
  outline: none;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.trim-fields input:focus {
  border-color: #c47ec4;
  box-shadow: 0 0 0 2px rgba(196, 126, 196, 0.2);
}

.trim-set-button {
  grid-column: 2;
  min-height: 2rem;
  padding: 0 0.45rem;
  border: 1px solid #5a535e;
  border-radius: 0.4rem;
  color: #eee7ef;
  background: #37333b;
  font-size: 0.63rem;
  white-space: nowrap;
}

.trim-set-button:hover:not(:disabled), .trim-reset-button:hover:not(:disabled) {
  border-color: #c47ec4;
  color: #fff;
}

.trim-reset-button {
  min-height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid #5a535e;
  border-radius: 0.4rem;
  color: #d8d0da;
  background: transparent;
  font-size: 0.66rem;
  white-space: nowrap;
}

.canvas-help {
  margin: 0.6rem 0 0;
  color: #aaa3ad;
  font-size: 0.72rem;
  text-align: center;
}

.settings-panel {
  padding: 1.15rem;
  border-left: 1px solid var(--line);
  background: var(--panel);
}

.setting-group + .setting-group { margin-top: 1rem; }

.setting-group > label:not(.check-control),
.setting-heading,
.range-label {
  margin-bottom: 0.45rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4d4651;
  font-size: 0.78rem;
  font-weight: 650;
}

.setting-heading .mini-button { padding: 0; font-size: 0.75rem; }

select, .number-grid input {
  width: 100%;
  min-height: 2.35rem;
  border: 1px solid #d8d0dc;
  border-radius: 0.48rem;
  color: var(--ink);
  background: #fff;
  outline: none;
  box-sizing: border-box;
}

select { padding: 0 0.55rem; font-size: 0.78rem; }
select:focus, .number-grid input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(136, 51, 136, 0.1); }

.number-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.number-grid label { min-width: 0; color: var(--muted); font-size: 0.7rem; }
.number-grid label span { margin-bottom: 0.22rem; display: block; }
.number-grid input { padding: 0 0.5rem; }
.output-grid { margin-top: 0.6rem; }

.check-control {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  color: #4d4651;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
}

.check-control input { width: 1rem; height: 1rem; margin: 0; accent-color: var(--accent); }
.resize-lock { margin-top: 0.55rem; color: var(--muted); font-size: 0.72rem; font-weight: 500; }
.divider { height: 1px; margin: 1.1rem 0; background: var(--line); }
.range-label span { color: var(--muted); font-size: 0.72rem; }
.quality-range { width: 100%; accent-color: var(--accent); }

.output-summary { margin: 1.1rem 0 0.8rem; font-size: 0.78rem; }
.output-label { margin-bottom: 0.25rem; display: block; color: #4d4651; font-weight: 650; }
.output-value { display: block; color: var(--ink); font-size: 0.86rem; }
.output-detail { margin-top: 0.18rem; display: block; color: var(--muted); font-size: 0.7rem; }

.save-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.save-button svg {
  width: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.progress-wrap { margin: -0.2rem 0 0.8rem; color: var(--muted); font-size: 0.68rem; text-align: center; }
.progress-track { height: 0.35rem; margin-bottom: 0.35rem; border-radius: 1rem; overflow: hidden; background: #e8e0e9; }
.progress-track span { height: 100%; display: block; border-radius: inherit; background: var(--accent); transition: width 120ms linear; }

.status-message, .compatibility-message {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
}

.status-message.error, .compatibility-message { color: #a33232; }

@media (max-width: 760px) {
  .crop-tool { margin-top: 1.25rem; }
  .editor-layout { grid-template-columns: 1fr; }
  .settings-panel { border-top: 1px solid var(--line); border-left: 0; }
  .canvas-panel { padding: 0.8rem 0.8rem 0.65rem; }
  .canvas-stage { min-height: 14rem; }
}

@media (max-width: 480px) {
  .drop-zone { min-height: 22rem; padding: 2rem 1rem; }
  .toolbar { align-items: flex-start; }
  .file-summary { display: block; }
  .file-summary > span { display: block; }
  .file-name { max-width: 11rem; }
  .text-button { padding-right: 0; text-align: right; }
  .canvas-help { line-height: 1.45; }
  .playback { grid-template-columns: 2rem 1fr; }
  .timecode { grid-column: 2; text-align: right; }
  .trim-fields { grid-template-columns: 1fr 1fr; }
  .trim-fields > label { grid-template-columns: 1fr; }
  .trim-time { grid-column: 1; }
  .trim-set-button { grid-column: 1; }
  .trim-reset-button { grid-column: 1 / -1; }
}
</style>
