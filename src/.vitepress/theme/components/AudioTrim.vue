<template>
  <div class="trim-audio-tool">
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
        accept="audio/*,.m4a,.mp3,.wav,.wave,.ogg,.oga,.opus,.flac,.aac"
        @change="onFileSelected"
      >
      <div class="upload-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 14.5v-5m4 8v-11m4 14v-17m4 14v-11m4 8v-5"/>
        </svg>
      </div>
      <h2>Choose an audio file to trim</h2>
      <p>Drop audio here, or select a file from your device.</p>
      <button class="primary-button" type="button" @click="openFilePicker">Select audio</button>
      <span class="privacy-note">
        Supports common browser audio formats · Exports Ogg, MP3, M4A, or WAV · Your audio stays on your device
      </span>
    </section>

    <div v-else class="workspace">
      <div class="toolbar">
        <div class="file-summary">
          <span class="file-name" :title="sourceName">{{ sourceName }}</span>
          <span>{{ sourceDetails }}</span>
        </div>
        <button class="text-button" type="button" :disabled="isExporting" @click="openFilePicker">
          Another Audio
        </button>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.wave,.ogg,.oga,.opus,.flac,.aac"
          @change="onFileSelected"
        >
      </div>

      <div class="editor-layout">
        <section class="waveform-panel">
          <div
            ref="waveformStage"
            class="waveform-stage"
            :style="{ cursor: waveformCursor }"
            @pointerdown="onWaveformPointerDown"
            @pointermove="onWaveformPointerMove"
            @pointerup="onWaveformPointerUp"
            @pointercancel="onWaveformPointerUp"
            @pointerleave="onWaveformPointerLeave"
          >
            <canvas
              ref="waveformCanvas"
              class="waveform-canvas"
              tabindex="0"
              role="img"
              :aria-label="waveformAriaLabel"
              @keydown="onWaveformKeydown"
            />
            <span v-if="isGeneratingWaveform" class="waveform-status" aria-live="polite">
              {{ isWaveformZoomed ? 'Refining waveform' : 'Reading waveform' }} · {{ Math.round(waveformProgress) }}%
            </span>
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
            <div class="waveform-zoom-controls" aria-label="Waveform zoom controls">
              <button
                class="waveform-zoom-button"
                type="button"
                :disabled="!canZoomIn"
                @click="zoomInWaveform"
              >
                Zoom In
              </button>
              <button
                class="waveform-zoom-button"
                type="button"
                :disabled="!canZoomOut"
                @click="zoomOutWaveform"
              >
                Zoom Out
              </button>
            </div>
            <span class="timecode">{{ formatTime(currentTime) }} / {{ formattedDuration }}</span>
          </div>

          <div class="trim-editor">
            <div class="trim-heading">
              <span>Trim audio</span>
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
          <p class="waveform-help">
            Click or drag the waveform to seek · Drag its edge handles to select the audio to keep
          </p>
        </section>

        <aside class="settings-panel">
          <div class="output-settings">
            <label for="audio-output-format">
              <span>File format</span>
              <select
                id="audio-output-format"
                v-model="outputFormat"
                :disabled="isExporting || isCheckingCodecSupport"
                @change="clearMessage"
              >
                <option value="ogg" :disabled="!codecSupport.opus">
                  Ogg Opus{{ codecSupport.opus ? '' : ' (unsupported)' }}
                </option>
                <option value="mp3" :disabled="!codecSupport.mp3">
                  MP3{{ codecSupport.mp3 ? '' : ' (unsupported)' }}
                </option>
                <option value="m4a" :disabled="!codecSupport.aac">
                  M4A AAC{{ codecSupport.aac ? '' : ' (unsupported)' }}
                </option>
                <option value="wav">WAV PCM</option>
              </select>
            </label>

            <label v-if="outputFormat !== 'wav'" for="audio-output-bitrate">
              <span>Bitrate</span>
              <select
                id="audio-output-bitrate"
                v-model.number="outputBitrate"
                :disabled="isExporting"
                @change="clearMessage"
              >
                <option :value="0">Auto</option>
                <option :value="96000">96 kbps</option>
                <option :value="128000">128 kbps</option>
                <option :value="160000">160 kbps</option>
                <option :value="192000">192 kbps</option>
                <option :value="256000">256 kbps</option>
              </select>
            </label>
          </div>

          <div class="output-summary">
            <span class="output-label">Output</span>
            <span class="output-value">{{ outputPreset.label }}</span>
            <span class="output-detail">{{ formattedTrimDuration }} · {{ formattedAudioBitrate }}</span>
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
            :disabled="!audioEncodingSupported || isCheckingCodecSupport"
            @click="saveAudio"
          >
            <svg v-if="!isExporting" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h10v10H7z"/>
            </svg>
            {{ isExporting ? 'Cancel' : 'Save Audio' }}
          </button>
        </aside>
      </div>
    </div>

    <p v-if="message" class="status-message" :class="{ error: messageIsError }" role="status">{{ message }}</p>
    <p v-if="hasSource && !baseAudioExportSupported" class="compatibility-message">
      Audio export requires WebCodecs audio decoding support. Open this tool in a recent Chrome, Edge, or another compatible browser.
    </p>
    <p v-else-if="hasSource && !selectedFormatSupported" class="compatibility-message">
      {{ outputPreset.label }} cannot be encoded by this browser. Choose another output format.
    </p>
  </div>
</template>

<script>
export default {
  name: 'AudioTrim',

  data () {
    return {
      audio: null,
      audioUrl: '',
      loadGeneration: 0,
      sourceFile: null,
      sourceName: '',
      duration: 0,
      currentTime: 0,
      trimStart: 0,
      trimEnd: 0,
      audioChannels: 0,
      audioSampleRate: 0,
      outputFormat: 'ogg',
      outputBitrate: 0,
      codecSupport: {
        opus: false,
        mp3: false,
        aac: false
      },
      isCheckingCodecSupport: true,
      waveformPeaks: null,
      fullWaveformPeaks: null,
      detailedWaveformCache: null,
      waveformViewStart: 0,
      waveformViewEnd: 0,
      waveformProgress: 0,
      isGeneratingWaveform: false,
      waveformGeneration: 0,
      waveformInput: null,
      waveformInteraction: null,
      waveformHover: null,
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
      previewFrameHandle: null
    }
  },

  computed: {
    hasSource () {
      return Boolean(this.audio)
    },

    baseAudioExportSupported () {
      return this.clientReady &&
        typeof window !== 'undefined' &&
        typeof window.AudioDecoder !== 'undefined' &&
        typeof window.AudioData !== 'undefined'
    },

    selectedFormatSupported () {
      return this.outputFormat === 'wav' || Boolean(this.codecSupport[this.outputPreset.codec])
    },

    audioEncodingSupported () {
      return this.baseAudioExportSupported && this.selectedFormatSupported
    },

    outputPreset () {
      const presets = {
        ogg: {
          label: 'Ogg Opus audio',
          description: 'Ogg Opus audio',
          codec: 'opus',
          extension: '.ogg',
          mimeType: 'audio/ogg'
        },
        mp3: {
          label: 'MP3 audio',
          description: 'MP3 audio',
          codec: 'mp3',
          extension: '.mp3',
          mimeType: 'audio/mpeg'
        },
        m4a: {
          label: 'M4A AAC audio',
          description: 'M4A AAC audio',
          codec: 'aac',
          extension: '.m4a',
          mimeType: 'audio/mp4'
        },
        wav: {
          label: 'WAV PCM audio',
          description: 'WAV PCM audio',
          codec: 'pcm-s16',
          extension: '.wav',
          mimeType: 'audio/wav'
        }
      }
      return presets[this.outputFormat] || presets.ogg
    },

    sourceDetails () {
      const channels = this.audioChannels === 1
        ? 'Mono'
        : this.audioChannels === 2
          ? 'Stereo'
          : this.audioChannels
            ? `${this.audioChannels} channels`
            : 'Audio'
      const sampleRate = this.audioSampleRate ? ` · ${(this.audioSampleRate / 1000).toFixed(1)} kHz` : ''
      return `${channels}${sampleRate} · ${this.formattedDuration}`
    },

    waveformAriaLabel () {
      const progress = this.isGeneratingWaveform ? `, ${Math.round(this.waveformProgress)} percent loaded` : ''
      const visibleRange = this.isWaveformZoomed
        ? ` Showing ${this.formatTimePrecise(this.waveformViewStart)} to ${this.formatTimePrecise(this.waveformViewEnd)}.`
        : ''
      return `Audio waveform for ${this.sourceName}.${visibleRange} Use the arrow keys to move the playhead${progress}.`
    },

    formattedDuration () {
      return this.formatTime(this.duration)
    },

    minimumTrimDuration () {
      return Math.min(this.duration, 0.01)
    },

    fullScanMaxDuration () {
      // Below this length the overview decodes every sample for an exact envelope;
      // longer files use coarse region sampling to stay fast.
      return 600
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

    isWaveformZoomed () {
      return this.waveformViewStart > 0.0005 ||
        this.waveformViewEnd < this.duration - 0.0005
    },

    canZoomIn () {
      if (this.isExporting || this.isGeneratingWaveform || !this.fullWaveformPeaks || !this.hasTrim) return false
      return Math.abs(this.trimStart - this.waveformViewStart) > 0.0005 ||
        Math.abs(this.trimEnd - this.waveformViewEnd) > 0.0005
    },

    canZoomOut () {
      return !this.isExporting && Boolean(this.fullWaveformPeaks) && this.isWaveformZoomed
    },

    audioBitrate () {
      return this.outputBitrate || (this.audioChannels === 1 ? 96000 : 160000)
    },

    formattedAudioBitrate () {
      if (this.outputFormat === 'wav') return '16-bit PCM'
      return `${Math.round(this.audioBitrate / 1000)} kbps`
    },

    waveformCursor () {
      const target = this.waveformInteraction ? this.waveformInteraction.type : this.waveformHover
      if (target === 'inactive') return 'default'
      return target === 'start' || target === 'end' || target === 'playhead'
        ? 'ew-resize'
        : 'crosshair'
    }
  },

  mounted () {
    this.clientReady = true
    this.detectCodecSupport()
  },

  beforeUnmount () {
    this.loadGeneration++
    this.cleanUpAudio()
  },

  methods: {
    async detectCodecSupport () {
      this.isCheckingCodecSupport = true
      try {
        const { canEncodeAudio } = await import('mediabunny')
        const options = {
          numberOfChannels: 2,
          sampleRate: 48000,
          bitrate: 160000
        }
        const check = codec => canEncodeAudio(codec, options).catch(() => false)
        const [opus, mp3, aac] = await Promise.all([
          check('opus'),
          check('mp3'),
          check('aac')
        ])
        this.codecSupport = { opus, mp3, aac }
        if (!this.selectedFormatSupported) this.outputFormat = 'wav'
      } catch (error) {
        console.error(error)
        this.codecSupport = { opus: false, mp3: false, aac: false }
        this.outputFormat = 'wav'
      } finally {
        this.isCheckingCodecSupport = false
      }
    },

    openFilePicker () {
      if (this.isExporting) return
      this.clearMessage()
      this.$refs.fileInput.click()
    },

    onFileSelected (event) {
      const file = event.target.files && event.target.files[0]
      if (file) this.loadFile(file)
      event.target.value = ''
    },

    onDrop (event) {
      this.isDraggingOver = false
      if (this.isExporting) return
      const file = event.dataTransfer.files && event.dataTransfer.files[0]
      if (file) this.loadFile(file)
    },

    loadFile (file) {
      if (this.isExporting) return
      const isAudio = file.type.startsWith('audio/') ||
        /\.(?:m4a|mp3|wav|wave|ogg|oga|opus|flac|aac)$/i.test(file.name)
      if (!isAudio) {
        this.setMessage('Please choose a supported audio file.', true)
        return
      }
      this.openBrowserAudio(file, ++this.loadGeneration)
    },

    openBrowserAudio (file, loadToken) {
      const nextUrl = URL.createObjectURL(file)
      const nextAudio = document.createElement('audio')
      nextAudio.preload = 'metadata'

      const onLoadError = () => {
        URL.revokeObjectURL(nextUrl)
        if (loadToken !== this.loadGeneration) return
        this.setMessage('This audio file could not be opened by your browser.', true)
      }

      nextAudio.addEventListener('loadedmetadata', () => {
        nextAudio.removeEventListener('error', onLoadError)
        if (loadToken !== this.loadGeneration) {
          URL.revokeObjectURL(nextUrl)
          nextAudio.removeAttribute('src')
          nextAudio.load()
          return
        }
        if (!Number.isFinite(nextAudio.duration) || nextAudio.duration <= 0) {
          URL.revokeObjectURL(nextUrl)
          this.setMessage('This file does not contain a readable audio track.', true)
          return
        }

        this.cleanUpAudio()
        this.audioUrl = nextUrl
        this.audio = nextAudio
        this.sourceFile = file
        this.sourceName = file.name
        this.duration = nextAudio.duration
        this.currentTime = 0
        this.trimStart = 0
        this.trimEnd = nextAudio.duration
        this.waveformViewStart = 0
        this.waveformViewEnd = nextAudio.duration
        this.isPlaying = false
        this.clearMessage()

        nextAudio.addEventListener('timeupdate', this.onAudioTimeUpdate)
        nextAudio.addEventListener('ended', this.onAudioEnded)

        const waveformToken = ++this.waveformGeneration
        this.isGeneratingWaveform = true
        this.waveformProgress = 0
        this.$nextTick(() => {
          this.setupWaveformLayout()
          this.generateWaveform(file, waveformToken).catch(error => {
            if (waveformToken !== this.waveformGeneration) return
            console.error(error)
            this.isGeneratingWaveform = false
            this.setMessage(
              `Audio opened, but its waveform could not be generated${error && error.message ? `: ${error.message}` : '.'}`,
              true
            )
            this.drawWaveform()
          })
        })
      }, { once: true })

      nextAudio.addEventListener('error', onLoadError, { once: true })
      nextAudio.src = nextUrl
    },

    async generateWaveform (file, generation) {
      const {
        ALL_FORMATS,
        AudioSampleSink,
        BlobSource,
        Input
      } = await import('mediabunny')
      if (generation !== this.waveformGeneration) return

      const input = new Input({
        source: new BlobSource(file, { maxCacheSize: 8 * 1024 * 1024 }),
        formats: ALL_FORMATS
      })
      this.waveformInput = input

      try {
        const track = await input.getPrimaryAudioTrack()
        if (!track) throw new Error('No audio track was found')
        const [channels, sampleRate, firstTimestamp] = await Promise.all([
          track.getNumberOfChannels(),
          track.getSampleRate(),
          track.getFirstTimestamp()
        ])
        if (generation !== this.waveformGeneration) return

        this.audioChannels = Number(channels) || 1
        this.audioSampleRate = Number(sampleRate) || 0
        const sink = new AudioSampleSink(track)

        // Short files decode fully for an exact peak envelope; long files fall back
        // to coarse region sampling to keep the initial overview fast.
        if (this.duration > 0 && this.duration <= this.fullScanMaxDuration) {
          await this.scanFullWaveform(sink, generation, firstTimestamp)
        } else {
          await this.sampleCoarseWaveform(sink, generation, firstTimestamp)
        }
      } finally {
        if (!input.disposed) input.dispose()
        if (this.waveformInput === input) this.waveformInput = null
      }
    },

    async scanFullWaveform (sink, generation, firstTimestamp) {
      const binCount = Math.round(this.clamp(Math.round(this.duration * 50), 800, 4000))
      const minimums = new Float32Array(binCount)
      const maximums = new Float32Array(binCount)
      this.waveformPeaks = { minimums, maximums }
      this.fullWaveformPeaks = null
      const totalDuration = Math.max(this.duration, 1e-6)
      const binScale = binCount / totalDuration
      let lastUpdate = performance.now()

      for await (const sample of sink.samples(firstTimestamp, firstTimestamp + this.duration)) {
        try {
          if (generation !== this.waveformGeneration) return
          const frameCount = sample.numberOfFrames
          const decodedSampleRate = sample.sampleRate || this.audioSampleRate || 48000
          const baseTime = sample.timestamp - firstTimestamp
          const plane = new Float32Array(frameCount)
          for (let channel = 0; channel < sample.numberOfChannels; channel++) {
            sample.copyTo(plane, { planeIndex: channel, format: 'f32-planar' })
            for (let frame = 0; frame < frameCount; frame++) {
              let binIndex = ((baseTime + frame / decodedSampleRate) * binScale) | 0
              if (binIndex < 0) binIndex = 0
              else if (binIndex >= binCount) binIndex = binCount - 1
              const value = plane[frame]
              if (value < minimums[binIndex]) minimums[binIndex] = value
              if (value > maximums[binIndex]) maximums[binIndex] = value
            }
          }
          const decodedThrough = Math.min(this.duration, sample.timestamp + sample.duration - firstTimestamp)
          this.waveformProgress = this.clamp(decodedThrough / totalDuration * 100, 0, 99)
        } finally {
          sample.close()
        }

        if (performance.now() - lastUpdate > 80) {
          this.drawWaveform()
          await this.nextTask()
          lastUpdate = performance.now()
        }
      }

      if (generation !== this.waveformGeneration) return
      this.fullWaveformPeaks = { minimums, maximums }
      this.waveformPeaks = this.fullWaveformPeaks
      this.waveformProgress = 100
      this.isGeneratingWaveform = false
      this.drawWaveform()
    },

    async sampleCoarseWaveform (sink, generation, firstTimestamp) {
      const durationScale = Math.log2(Math.max(1, this.duration / 60))
      const binCount = Math.round(this.clamp(820 - durationScale * 64, 420, 820))
      const minimums = new Float32Array(binCount)
      const maximums = new Float32Array(binCount)
      this.waveformPeaks = { minimums, maximums }
      this.fullWaveformPeaks = null
      const binDuration = this.duration / binCount
      const regionsPerBin = 2
      const regionDuration = Math.min(
        binDuration / regionsPerBin,
        Math.max(0.06, Math.min(0.12, binDuration * 0.18))
      )
      const totalRegions = binCount * regionsPerBin
      let completedRegions = 0
      let lastUpdate = performance.now()

      for (let binIndex = 0; binIndex < binCount; binIndex++) {
        const binStart = binIndex * binDuration
        for (let regionIndex = 0; regionIndex < regionsPerBin; regionIndex++) {
          if (generation !== this.waveformGeneration) return
          const center = binStart + ((regionIndex + 1) / (regionsPerBin + 1)) * binDuration
          const regionStart = Math.max(binStart, center - regionDuration / 2)
          const regionEnd = Math.min(binStart + binDuration, center + regionDuration / 2)

          for await (const sample of sink.samples(
            firstTimestamp + regionStart,
            firstTimestamp + regionEnd
          )) {
            try {
              if (generation !== this.waveformGeneration) return
              const frameCount = sample.numberOfFrames
              const plane = new Float32Array(frameCount)
              for (let channel = 0; channel < sample.numberOfChannels; channel++) {
                sample.copyTo(plane, { planeIndex: channel, format: 'f32-planar' })
                for (let frame = 0; frame < frameCount; frame++) {
                  const value = plane[frame]
                  if (value < minimums[binIndex]) minimums[binIndex] = value
                  if (value > maximums[binIndex]) maximums[binIndex] = value
                }
              }
            } finally {
              sample.close()
            }
          }

          completedRegions++
          this.waveformProgress = this.clamp(completedRegions / totalRegions * 100, 0, 99)
          if (performance.now() - lastUpdate > 80) {
            this.drawWaveform()
            await this.nextTask()
            lastUpdate = performance.now()
          }
        }
      }

      if (generation !== this.waveformGeneration) return
      this.fullWaveformPeaks = { minimums, maximums }
      this.waveformPeaks = this.fullWaveformPeaks
      this.waveformProgress = 100
      this.isGeneratingWaveform = false
      this.drawWaveform()
    },

    async generateDetailedWaveform (file, generation, rangeStart, rangeEnd) {
      const {
        ALL_FORMATS,
        AudioSampleSink,
        BlobSource,
        Input
      } = await import('mediabunny')
      if (generation !== this.waveformGeneration) return

      const input = new Input({
        source: new BlobSource(file, { maxCacheSize: 8 * 1024 * 1024 }),
        formats: ALL_FORMATS
      })
      this.waveformInput = input

      try {
        const track = await input.getPrimaryAudioTrack()
        if (!track) throw new Error('No audio track was found')
        const [sampleRateValue, firstTimestamp] = await Promise.all([
          track.getSampleRate(),
          track.getFirstTimestamp()
        ])
        if (generation !== this.waveformGeneration) return

        const sampleRate = Number(sampleRateValue) || this.audioSampleRate || 48000
        const rangeDuration = rangeEnd - rangeStart
        const canvas = this.$refs.waveformCanvas
        const canvasWidth = canvas ? canvas.width / (canvas._pixelRatio || 1) : 820
        const waveformPixelWidth = Math.max(1, canvasWidth - Math.min(18, canvasWidth / 4) * 2)
        const samplesPerPixel = rangeDuration * sampleRate / waveformPixelWidth
        if (rangeDuration <= 1 || samplesPerPixel <= 4) {
          await this.generateSampleWaveform(
            new AudioSampleSink(track),
            generation,
            rangeStart,
            rangeEnd,
            sampleRate,
            firstTimestamp
          )
          return
        }

        const targetBins = this.clamp(canvas ? canvas.width : 820, 280, 2048)
        const availableFrames = Math.max(1, Math.ceil(rangeDuration * sampleRate))
        const binCount = Math.max(1, Math.min(Math.round(targetBins), availableFrames))
        const projectedPeaks = this.projectFullWaveform(rangeStart, rangeEnd, binCount)
        const minimums = projectedPeaks ? projectedPeaks.minimums : new Float32Array(binCount)
        const maximums = projectedPeaks ? projectedPeaks.maximums : new Float32Array(binCount)
        const detailedBins = new Uint8Array(binCount)
        const detailedPeaks = { minimums, maximums }
        const sink = new AudioSampleSink(track)
        const absoluteStart = firstTimestamp + rangeStart
        const absoluteEnd = firstTimestamp + rangeEnd
        const requestStart = firstTimestamp + Math.max(0, rangeStart - 0.25)
        const binScale = binCount / rangeDuration
        let lastUpdate = performance.now()
        this.waveformPeaks = detailedPeaks
        this.drawWaveform()

        for await (const sample of sink.samples(requestStart, absoluteEnd)) {
          try {
            if (generation !== this.waveformGeneration) return
            const frameCount = sample.numberOfFrames
            const decodedSampleRate = sample.sampleRate || sampleRate
            const firstFrame = this.clamp(
              Math.ceil((absoluteStart - sample.timestamp) * decodedSampleRate - 1e-7),
              0,
              frameCount
            )
            const lastFrame = this.clamp(
              Math.ceil((absoluteEnd - sample.timestamp) * decodedSampleRate - 1e-7),
              0,
              frameCount
            )
            const plane = new Float32Array(frameCount)

            for (let channel = 0; channel < sample.numberOfChannels; channel++) {
              sample.copyTo(plane, { planeIndex: channel, format: 'f32-planar' })
              for (let frame = firstFrame; frame < lastFrame; frame++) {
                const frameTime = sample.timestamp + frame / decodedSampleRate
                const binIndex = this.clamp(
                  Math.floor((frameTime - absoluteStart) * binScale),
                  0,
                  binCount - 1
                )
                if (!detailedBins[binIndex]) {
                  minimums[binIndex] = 0
                  maximums[binIndex] = 0
                  detailedBins[binIndex] = 1
                }
                const value = plane[frame]
                if (value < minimums[binIndex]) minimums[binIndex] = value
                if (value > maximums[binIndex]) maximums[binIndex] = value
              }
            }

            const decodedThrough = Math.min(absoluteEnd, sample.timestamp + sample.duration)
            this.waveformProgress = this.clamp(
              (decodedThrough - absoluteStart) / rangeDuration * 100,
              0,
              99
            )
          } finally {
            sample.close()
          }

          if (performance.now() - lastUpdate > 80) {
            this.drawWaveform()
            await this.nextTask()
            lastUpdate = performance.now()
          }
        }

        if (generation !== this.waveformGeneration) return
        this.waveformPeaks = detailedPeaks
        this.detailedWaveformCache = {
          start: rangeStart,
          end: rangeEnd,
          peaks: detailedPeaks
        }
        this.waveformProgress = 100
        this.isGeneratingWaveform = false
        this.drawWaveform()
      } finally {
        if (!input.disposed) input.dispose()
        if (this.waveformInput === input) this.waveformInput = null
      }
    },

    async generateSampleWaveform (sink, generation, rangeStart, rangeEnd, sampleRate, firstTimestamp) {
      const rangeDuration = rangeEnd - rangeStart
      const boundaryFrames = 2
      const decodePreroll = 0.25
      const requestStart = firstTimestamp + Math.max(0, rangeStart - decodePreroll)
      const captureStart = firstTimestamp + Math.max(0, rangeStart - boundaryFrames / sampleRate)
      const captureEnd = firstTimestamp + Math.min(this.duration, rangeEnd + boundaryFrames / sampleRate)
      const absoluteStart = firstTimestamp + rangeStart
      const absoluteEnd = firstTimestamp + rangeEnd
      const rawTimes = []
      const rawValues = []
      const sampleWaveform = {
        mode: 'samples',
        times: [],
        values: [],
        rawTimes,
        rawValues,
        showsIndividualSamples: false,
        fallbackPeaks: this.projectFullWaveform(rangeStart, rangeEnd),
        refinedThrough: rangeStart
      }
      let lastUpdate = performance.now()
      this.waveformPeaks = sampleWaveform
      this.drawWaveform()

      for await (const sample of sink.samples(requestStart, captureEnd)) {
        try {
          if (generation !== this.waveformGeneration) return
          const frameCount = sample.numberOfFrames
          const decodedSampleRate = sample.sampleRate || sampleRate
          const firstFrame = this.clamp(
            Math.ceil((captureStart - sample.timestamp) * decodedSampleRate - 1e-7),
            0,
            frameCount
          )
          const lastFrame = this.clamp(
            Math.ceil((captureEnd - sample.timestamp) * decodedSampleRate - 1e-7),
            0,
            frameCount
          )
          const mixedFrames = new Float32Array(Math.max(0, lastFrame - firstFrame))
          const plane = new Float32Array(frameCount)

          for (let channel = 0; channel < sample.numberOfChannels; channel++) {
            sample.copyTo(plane, { planeIndex: channel, format: 'f32-planar' })
            for (let frame = firstFrame; frame < lastFrame; frame++) {
              const outputIndex = frame - firstFrame
              const value = plane[frame]
              if (Math.abs(value) > Math.abs(mixedFrames[outputIndex])) {
                mixedFrames[outputIndex] = value
              }
            }
          }

          for (let frame = firstFrame; frame < lastFrame; frame++) {
            const localTime = sample.timestamp + frame / decodedSampleRate - firstTimestamp
            if (rawTimes.length && localTime <= rawTimes[rawTimes.length - 1]) continue
            rawTimes.push(localTime)
            rawValues.push(mixedFrames[frame - firstFrame])
          }

          sampleWaveform.refinedThrough = this.clamp(
            sample.timestamp + sample.duration - firstTimestamp,
            rangeStart,
            rangeEnd
          )
          const decodedThrough = Math.min(absoluteEnd, sample.timestamp + sample.duration)
          this.waveformProgress = this.clamp(
            (decodedThrough - absoluteStart) / rangeDuration * 100,
            0,
            99
          )
        } finally {
          sample.close()
        }

        if (performance.now() - lastUpdate > 80) {
          const displayEnd = Math.max(rangeStart, sampleWaveform.refinedThrough)
          const displayData = this.buildSampleDisplayData(rawTimes, rawValues, rangeStart, displayEnd)
          sampleWaveform.times = displayData.times
          sampleWaveform.values = displayData.values
          sampleWaveform.showsIndividualSamples = displayData.showsIndividualSamples
          this.drawWaveform()
          await this.nextTask()
          lastUpdate = performance.now()
        }
      }

      if (generation !== this.waveformGeneration) return
      const displayData = this.buildSampleDisplayData(rawTimes, rawValues, rangeStart, rangeEnd)
      const completedWaveform = {
        mode: 'samples',
        times: displayData.times,
        values: displayData.values,
        rawTimes: Float64Array.from(rawTimes),
        rawValues: Float32Array.from(rawValues),
        showsIndividualSamples: displayData.showsIndividualSamples,
        fallbackPeaks: null,
        refinedThrough: rangeEnd
      }
      this.waveformPeaks = completedWaveform
      this.detailedWaveformCache = {
        start: rangeStart,
        end: rangeEnd,
        peaks: completedWaveform
      }
      this.waveformProgress = 100
      this.isGeneratingWaveform = false
      this.drawWaveform()
    },

    buildSampleDisplayData (rawTimes, rawValues, rangeStart, rangeEnd) {
      if (!rawTimes.length || rangeEnd <= rangeStart) {
        return { times: new Float64Array(0), values: new Float32Array(0), showsIndividualSamples: false }
      }

      const valueAt = time => {
        let right = 0
        while (right < rawTimes.length && rawTimes[right] < time) right++
        if (right === 0) return rawValues[0]
        if (right >= rawTimes.length) return rawValues[rawValues.length - 1]
        if (rawTimes[right] === time) return rawValues[right]
        const left = right - 1
        const span = rawTimes[right] - rawTimes[left]
        if (span <= 0) return rawValues[right]
        const ratio = (time - rawTimes[left]) / span
        return rawValues[left] + (rawValues[right] - rawValues[left]) * ratio
      }

      let firstInside = 0
      while (firstInside < rawTimes.length && rawTimes[firstInside] <= rangeStart) firstInside++
      let lastInside = firstInside
      while (lastInside < rawTimes.length && rawTimes[lastInside] < rangeEnd) lastInside++

      const canvas = this.$refs.waveformCanvas
      const canvasWidth = canvas ? canvas.width / (canvas._pixelRatio || 1) : 820
      const waveformWidth = Math.max(1, canvasWidth - Math.min(18, canvasWidth / 4) * 2)
      const maxDisplayPoints = Math.max(32, Math.ceil(waveformWidth * 2))
      const interiorCount = Math.max(0, lastInside - firstInside)
      const outputTimes = [rangeStart]
      const outputValues = [valueAt(rangeStart)]
      const appendPoint = (time, value) => {
        const lastIndex = outputTimes.length - 1
        if (lastIndex >= 0 && Math.abs(outputTimes[lastIndex] - time) <= 1e-12) {
          outputValues[lastIndex] = value
          return
        }
        outputTimes.push(time)
        outputValues.push(value)
      }

      if (interiorCount + 2 <= maxDisplayPoints) {
        for (let index = firstInside; index < lastInside; index++) {
          appendPoint(rawTimes[index], rawValues[index])
        }
        appendPoint(rangeEnd, valueAt(rangeEnd))
        return {
          times: Float64Array.from(outputTimes),
          values: Float32Array.from(outputValues),
          showsIndividualSamples: true
        }
      }

      const binCount = Math.max(1, Math.floor((maxDisplayPoints - 2) / 2))
      const minimums = new Float32Array(binCount)
      const maximums = new Float32Array(binCount)
      const minimumTimes = new Float64Array(binCount)
      const maximumTimes = new Float64Array(binCount)
      const populated = new Uint8Array(binCount)
      minimums.fill(Infinity)
      maximums.fill(-Infinity)
      const binScale = binCount / (rangeEnd - rangeStart)

      for (let index = firstInside; index < lastInside; index++) {
        const time = rawTimes[index]
        const value = rawValues[index]
        const binIndex = this.clamp(Math.floor((time - rangeStart) * binScale), 0, binCount - 1)
        populated[binIndex] = 1
        if (value < minimums[binIndex]) {
          minimums[binIndex] = value
          minimumTimes[binIndex] = time
        }
        if (value > maximums[binIndex]) {
          maximums[binIndex] = value
          maximumTimes[binIndex] = time
        }
      }

      for (let binIndex = 0; binIndex < binCount; binIndex++) {
        if (!populated[binIndex]) continue
        if (minimumTimes[binIndex] <= maximumTimes[binIndex]) {
          appendPoint(minimumTimes[binIndex], minimums[binIndex])
          if (maximumTimes[binIndex] !== minimumTimes[binIndex]) {
            appendPoint(maximumTimes[binIndex], maximums[binIndex])
          }
        } else {
          appendPoint(maximumTimes[binIndex], maximums[binIndex])
          appendPoint(minimumTimes[binIndex], minimums[binIndex])
        }
      }
      appendPoint(rangeEnd, valueAt(rangeEnd))

      return {
        times: Float64Array.from(outputTimes),
        values: Float32Array.from(outputValues),
        showsIndividualSamples: false
      }
    },

    projectFullWaveform (rangeStart, rangeEnd, requestedCount = null) {
      const fullPeaks = this.fullWaveformPeaks
      if (!fullPeaks || !this.duration) return null
      const canvas = this.$refs.waveformCanvas
      const targetCount = requestedCount == null
        ? Math.max(1, Math.round(this.clamp(canvas ? canvas.width : 820, 280, 2048)))
        : Math.max(1, Math.round(requestedCount))
      const minimums = new Float32Array(targetCount)
      const maximums = new Float32Array(targetCount)
      const sourceCount = fullPeaks.maximums.length
      const sourceStart = this.clamp(rangeStart / this.duration, 0, 1) * sourceCount
      const sourceEnd = this.clamp(rangeEnd / this.duration, 0, 1) * sourceCount
      const sourceSpan = Math.max(Number.EPSILON, sourceEnd - sourceStart)

      for (let outputIndex = 0; outputIndex < targetCount; outputIndex++) {
        const first = Math.floor(sourceStart + outputIndex / targetCount * sourceSpan)
        const last = Math.max(first + 1, Math.ceil(sourceStart + (outputIndex + 1) / targetCount * sourceSpan))
        for (let sourceIndex = first; sourceIndex < last && sourceIndex < sourceCount; sourceIndex++) {
          minimums[outputIndex] = Math.min(minimums[outputIndex], fullPeaks.minimums[sourceIndex])
          maximums[outputIndex] = Math.max(maximums[outputIndex], fullPeaks.maximums[sourceIndex])
        }
      }

      return { minimums, maximums }
    },

    detailedWaveformForTrim () {
      const cached = this.detailedWaveformCache
      if (!cached) return null
      const matchesStart = Math.abs(cached.start - this.trimStart) <= 1e-7
      const matchesEnd = Math.abs(cached.end - this.trimEnd) <= 1e-7
      return matchesStart && matchesEnd ? cached.peaks : null
    },

    invalidateDetailedWaveform () {
      this.detailedWaveformCache = null
    },

    zoomInWaveform () {
      if (!this.canZoomIn || !this.sourceFile) return
      this.pausePlayback()
      this.clearMessage()
      const rangeStart = this.trimStart
      const rangeEnd = this.trimEnd
      const cachedPeaks = this.detailedWaveformForTrim()
      const generation = ++this.waveformGeneration
      if (this.waveformInput && !this.waveformInput.disposed) this.waveformInput.dispose()
      this.waveformInput = null
      this.waveformViewStart = rangeStart
      this.waveformViewEnd = rangeEnd

      if (cachedPeaks) {
        this.waveformPeaks = cachedPeaks
        this.waveformProgress = 100
        this.isGeneratingWaveform = false
        if (this.currentTime < rangeStart || this.currentTime > rangeEnd) this.seekPreview(rangeStart)
        this.drawWaveform()
        return
      }

      this.detailedWaveformCache = null
      this.waveformPeaks = this.projectFullWaveform(rangeStart, rangeEnd)
      this.waveformProgress = 0
      this.isGeneratingWaveform = true
      if (this.currentTime < rangeStart || this.currentTime > rangeEnd) this.seekPreview(rangeStart)
      this.drawWaveform()

      this.generateDetailedWaveform(this.sourceFile, generation, rangeStart, rangeEnd).catch(error => {
        if (generation !== this.waveformGeneration) return
        console.error(error)
        this.isGeneratingWaveform = false
        this.setMessage(
          `The zoomed waveform could not be refined${error && error.message ? `: ${error.message}` : '.'}`,
          true
        )
        this.drawWaveform()
      })
    },

    zoomOutWaveform () {
      if (!this.canZoomOut) return
      this.pausePlayback()
      this.waveformGeneration++
      if (this.waveformInput && !this.waveformInput.disposed) this.waveformInput.dispose()
      this.waveformInput = null
      this.waveformViewStart = 0
      this.waveformViewEnd = this.duration
      this.waveformPeaks = this.fullWaveformPeaks
      this.waveformProgress = 0
      this.isGeneratingWaveform = false
      this.waveformInteraction = null
      this.waveformHover = null
      this.clearMessage()
      this.drawWaveform()
    },

    cleanUpAudio () {
      this.stopPreviewLoop()
      this.waveformGeneration++
      if (this.audio) {
        this.audio.pause()
        this.audio.removeEventListener('timeupdate', this.onAudioTimeUpdate)
        this.audio.removeEventListener('ended', this.onAudioEnded)
        this.audio.removeAttribute('src')
        this.audio.load()
      }
      if (this.audioUrl) URL.revokeObjectURL(this.audioUrl)
      if (this.waveformInput && !this.waveformInput.disposed) this.waveformInput.dispose()
      if (this.resizeObserver) this.resizeObserver.disconnect()
      window.removeEventListener('resize', this.layoutWaveform)
      this.audio = null
      this.audioUrl = ''
      this.waveformInput = null
      this.waveformPeaks = null
      this.fullWaveformPeaks = null
      this.detailedWaveformCache = null
      this.waveformViewStart = 0
      this.waveformViewEnd = 0
      this.waveformProgress = 0
      this.isGeneratingWaveform = false
      this.waveformInteraction = null
      this.waveformHover = null
      this.audioChannels = 0
      this.audioSampleRate = 0
    },

    setupWaveformLayout () {
      this.layoutWaveform()
      if (typeof ResizeObserver !== 'undefined') {
        if (this.resizeObserver) this.resizeObserver.disconnect()
        this.resizeObserver = new ResizeObserver(this.layoutWaveform)
        if (this.$refs.waveformStage) this.resizeObserver.observe(this.$refs.waveformStage)
      } else {
        window.addEventListener('resize', this.layoutWaveform)
      }
    },

    layoutWaveform () {
      if (!this.audio || !this.$refs.waveformStage || !this.$refs.waveformCanvas) return
      const width = Math.max(280, this.$refs.waveformStage.clientWidth)
      const height = Math.min(250, Math.max(170, window.innerHeight * 0.25))
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = this.$refs.waveformCanvas
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas._pixelRatio = pixelRatio
      this.drawWaveform()
    },

    drawWaveform () {
      const canvas = this.$refs.waveformCanvas
      if (!canvas || !this.audio) return
      const ratio = canvas._pixelRatio || 1
      const width = canvas.width / ratio
      const height = canvas.height / ratio
      const ctx = canvas.getContext('2d')
      const handleGutter = 36
      const sideGutter = Math.min(18, width / 4)
      const waveformLeft = sideGutter
      const waveformWidth = Math.max(1, width - sideGutter * 2)
      const waveformRight = waveformLeft + waveformWidth
      const waveformHeight = Math.max(1, height - handleGutter)
      const center = waveformHeight / 2
      const amplitudeHeight = center - 18
      const peaks = this.waveformPeaks
      const startX = this.timeToWaveformX(this.trimStart, width)
      const endX = this.timeToWaveformX(this.trimEnd, width)
      const startIsVisible = this.isTimeInWaveformView(this.trimStart)
      const endIsVisible = this.isTimeInWaveformView(this.trimEnd)

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#17171d'
      ctx.fillRect(waveformLeft, 0, waveformWidth, waveformHeight)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)'
      ctx.fillRect(waveformLeft, 0, Math.max(0, startX - waveformLeft), waveformHeight)
      ctx.fillRect(endX, 0, Math.max(0, waveformRight - endX), waveformHeight)
      ctx.fillStyle = 'rgba(136, 51, 136, 0.18)'
      ctx.fillRect(startX, 0, Math.max(0, endX - startX), waveformHeight)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(waveformLeft, center + 0.5)
      ctx.lineTo(waveformRight, center + 0.5)
      ctx.stroke()

      if (peaks) {
        const sampleData = peaks.mode === 'samples' ? peaks : null
        const peakData = sampleData ? sampleData.fallbackPeaks : peaks
        let absolutePeak = 0
        if (peakData) {
          for (let index = 0; index < peakData.maximums.length; index++) {
            absolutePeak = Math.max(absolutePeak, peakData.maximums[index], -peakData.minimums[index])
          }
        }
        if (sampleData) {
          for (let index = 0; index < sampleData.values.length; index++) {
            absolutePeak = Math.max(absolutePeak, Math.abs(sampleData.values[index]))
          }
        }
        const gain = 1 / Math.max(0.12, absolutePeak)

        if (peakData) {
          const drawPeaks = color => {
            ctx.strokeStyle = color
            ctx.lineWidth = 1
            ctx.beginPath()
            for (let offset = 0; offset < Math.ceil(waveformWidth); offset++) {
              const first = Math.floor(offset / waveformWidth * peakData.maximums.length)
              const last = Math.max(first + 1, Math.ceil((offset + 1) / waveformWidth * peakData.maximums.length))
              let minimum = 0
              let maximum = 0
              for (let index = first; index < last && index < peakData.maximums.length; index++) {
                minimum = Math.min(minimum, peakData.minimums[index])
                maximum = Math.max(maximum, peakData.maximums[index])
              }
              const x = waveformLeft + offset + 0.5
              ctx.moveTo(x, center - maximum * gain * amplitudeHeight)
              ctx.lineTo(x, center - minimum * gain * amplitudeHeight)
            }
            ctx.stroke()
          }

          ctx.save()
          if (sampleData) {
            const fallbackX = this.timeToWaveformX(sampleData.refinedThrough, width)
            ctx.beginPath()
            ctx.rect(fallbackX, 0, Math.max(0, waveformRight - fallbackX), waveformHeight)
            ctx.clip()
          }
          drawPeaks('#736d78')
          ctx.save()
          ctx.beginPath()
          ctx.rect(startX, 0, Math.max(0, endX - startX), waveformHeight)
          ctx.clip()
          drawPeaks('#d797d7')
          ctx.restore()
          ctx.restore()
        }

        if (sampleData && sampleData.values.length) {
          const drawSamples = color => {
            const sampleX = time => waveformLeft +
              (time - this.waveformViewStart) / (this.waveformViewEnd - this.waveformViewStart) * waveformWidth
            ctx.strokeStyle = color
            ctx.fillStyle = color
            ctx.lineWidth = 1.5
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'
            ctx.beginPath()
            for (let index = 0; index < sampleData.values.length; index++) {
              const x = sampleX(sampleData.times[index])
              const y = center - sampleData.values[index] * gain * amplitudeHeight
              if (index === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
            ctx.stroke()

            const sampleSpacing = waveformWidth / Math.max(1, sampleData.values.length - 3)
            if (sampleData.showsIndividualSamples && sampleSpacing >= 5) {
              for (let index = 0; index < sampleData.values.length; index++) {
                const x = sampleX(sampleData.times[index])
                const y = center - sampleData.values[index] * gain * amplitudeHeight
                ctx.beginPath()
                ctx.arc(x, y, 2.25, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          }

          ctx.save()
          ctx.beginPath()
          ctx.rect(waveformLeft, 0, waveformWidth, waveformHeight)
          ctx.clip()
          drawSamples('#736d78')
          ctx.save()
          ctx.beginPath()
          ctx.rect(startX, 0, Math.max(0, endX - startX), waveformHeight)
          ctx.clip()
          drawSamples('#d797d7')
          ctx.restore()
          ctx.restore()
        }
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
      ctx.lineWidth = 1
      ctx.strokeRect(waveformLeft + 0.5, 0.5, Math.max(0, waveformWidth - 1), Math.max(0, waveformHeight - 1))

      if (startIsVisible) this.drawTrimHandle(ctx, startX, waveformHeight, 'start')
      if (endIsVisible) this.drawTrimHandle(ctx, endX, waveformHeight, 'end')

      if (this.isTimeInWaveformView(this.currentTime)) {
        const playheadX = this.timeToWaveformX(this.currentTime, width)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(playheadX, 0)
        ctx.lineTo(playheadX, waveformHeight)
        ctx.stroke()
        ctx.fillStyle = '#883388'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(playheadX - 7, 0)
        ctx.lineTo(playheadX + 7, 0)
        ctx.lineTo(playheadX, 10)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }

    },

    drawTrimHandle (ctx, x, height, boundary) {
      const guideEndY = height + 18
      const handleTipY = guideEndY + 1
      const guideX = Math.round(x)
      const direction = boundary === 'start' ? -1 : 1
      const handleTipX = guideX - direction * 0.5
      ctx.save()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(guideX, 0)
      ctx.lineTo(guideX, guideEndY)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(handleTipX + direction * 2.8, handleTipY - 1.4)
      ctx.quadraticCurveTo(handleTipX - direction * 2.8, handleTipY, handleTipX + direction * 2.8, handleTipY + 1.4)
      ctx.lineTo(handleTipX + direction * 13.5, handleTipY + 6.8)
      ctx.quadraticCurveTo(handleTipX + direction * 16, handleTipY + 8, handleTipX + direction * 16, handleTipY + 5)
      ctx.lineTo(handleTipX + direction * 16, handleTipY - 5)
      ctx.quadraticCurveTo(handleTipX + direction * 16, handleTipY - 8, handleTipX + direction * 13.5, handleTipY - 6.8)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    },

    timeToWaveformX (time, width = null) {
      const canvas = this.$refs.waveformCanvas
      const canvasWidth = width == null && canvas ? canvas.width / (canvas._pixelRatio || 1) : width
      const viewDuration = this.waveformViewEnd - this.waveformViewStart
      if (!viewDuration || !canvasWidth) return 0
      const gutter = Math.min(18, canvasWidth / 4)
      const waveformWidth = Math.max(1, canvasWidth - gutter * 2)
      const ratio = (time - this.waveformViewStart) / viewDuration
      return gutter + this.clamp(ratio, 0, 1) * waveformWidth
    },

    isTimeInWaveformView (time) {
      return time >= this.waveformViewStart - 0.0005 &&
        time <= this.waveformViewEnd + 0.0005
    },

    waveformTimeFromEvent (event) {
      const rect = this.$refs.waveformCanvas.getBoundingClientRect()
      const gutter = Math.min(18, rect.width / 4)
      const waveformWidth = Math.max(1, rect.width - gutter * 2)
      const ratio = this.clamp((event.clientX - rect.left - gutter) / waveformWidth, 0, 1)
      return this.waveformViewStart + ratio * (this.waveformViewEnd - this.waveformViewStart)
    },

    waveformTargetFromEvent (event) {
      const rect = this.$refs.waveformCanvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const waveformHeight = Math.max(1, rect.height - 36)
      const startX = this.timeToWaveformX(this.trimStart, rect.width)
      const endX = this.timeToWaveformX(this.trimEnd, rect.width)
      const playheadX = this.timeToWaveformX(this.currentTime, rect.width)
      const handleRadius = 14
      const startDistance = this.isTimeInWaveformView(this.trimStart) ? Math.abs(x - startX) : Infinity
      const endDistance = this.isTimeInWaveformView(this.trimEnd) ? Math.abs(x - endX) : Infinity
      if (Math.min(startDistance, endDistance) <= handleRadius) {
        return startDistance <= endDistance ? 'start' : 'end'
      }
      if (y > waveformHeight) return 'inactive'
      if (this.isTimeInWaveformView(this.currentTime) && Math.abs(x - playheadX) <= 8) return 'playhead'
      return 'seek'
    },

    onWaveformPointerDown (event) {
      if (this.isExporting || event.button !== 0 || !this.duration) return
      const target = this.waveformTargetFromEvent(event)
      if (target === 'inactive') return
      event.preventDefault()
      this.pausePlayback()
      const type = target === 'start' || target === 'end' || target === 'playhead' ? target : 'seek'
      this.waveformInteraction = { type, pointerId: event.pointerId }
      this.$refs.waveformStage.setPointerCapture(event.pointerId)
      this.$refs.waveformCanvas.focus({ preventScroll: true })
      this.applyWaveformInteraction(event)
    },

    onWaveformPointerMove (event) {
      if (!this.waveformInteraction) {
        this.waveformHover = this.waveformTargetFromEvent(event)
        return
      }
      if (this.waveformInteraction.pointerId !== event.pointerId) return
      event.preventDefault()
      this.applyWaveformInteraction(event)
    },

    onWaveformPointerUp (event) {
      if (!this.waveformInteraction || this.waveformInteraction.pointerId !== event.pointerId) return
      if (this.$refs.waveformStage.hasPointerCapture(event.pointerId)) {
        this.$refs.waveformStage.releasePointerCapture(event.pointerId)
      }
      this.waveformInteraction = null
      this.waveformHover = this.waveformTargetFromEvent(event)
    },

    onWaveformPointerLeave () {
      if (!this.waveformInteraction) this.waveformHover = null
    },

    applyWaveformInteraction (event) {
      const time = this.waveformTimeFromEvent(event)
      const type = this.waveformInteraction && this.waveformInteraction.type
      if (type === 'start') {
        const nextStart = this.clamp(time, 0, Math.max(0, this.trimEnd - this.minimumTrimDuration))
        if (Math.abs(nextStart - this.trimStart) > 1e-7) this.invalidateDetailedWaveform()
        this.trimStart = nextStart
        this.drawWaveform()
      } else if (type === 'end') {
        const nextEnd = this.clamp(time, Math.min(this.duration, this.trimStart + this.minimumTrimDuration), this.duration)
        if (Math.abs(nextEnd - this.trimEnd) > 1e-7) this.invalidateDetailedWaveform()
        this.trimEnd = nextEnd
        this.drawWaveform()
      } else {
        this.seekPreview(time)
      }
      this.clearMessage()
    },

    onWaveformKeydown (event) {
      if (this.isExporting || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      let target = this.currentTime
      if (event.key === 'Home') target = this.waveformViewStart
      else if (event.key === 'End') target = this.waveformViewEnd
      else target += (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 1 : 0.1)
      this.seekPreview(this.clamp(target, this.waveformViewStart, this.waveformViewEnd))
    },

    updateTrimStart (event) {
      this.pausePlayback()
      const limit = Math.max(0, this.trimEnd - this.minimumTrimDuration)
      const value = this.parseTimestamp(event.target.value)
      const nextStart = this.clamp(Number.isFinite(value) ? value : this.trimStart, 0, limit)
      if (Math.abs(nextStart - this.trimStart) > 1e-7) this.invalidateDetailedWaveform()
      this.trimStart = nextStart
      event.target.value = this.formatTimePrecise(this.trimStart)
      this.seekPreview(this.trimStart)
      this.clearMessage()
      this.drawWaveform()
    },

    updateTrimEnd (event) {
      this.pausePlayback()
      const minimum = Math.min(this.duration, this.trimStart + this.minimumTrimDuration)
      const value = this.parseTimestamp(event.target.value)
      const nextEnd = this.clamp(Number.isFinite(value) ? value : this.trimEnd, minimum, this.duration)
      if (Math.abs(nextEnd - this.trimEnd) > 1e-7) this.invalidateDetailedWaveform()
      this.trimEnd = nextEnd
      event.target.value = this.formatTimePrecise(this.trimEnd)
      this.seekPreview(this.trimEnd)
      this.clearMessage()
      this.drawWaveform()
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
      this.invalidateDetailedWaveform()
      if (this.isWaveformZoomed && this.fullWaveformPeaks) {
        this.waveformGeneration++
        if (this.waveformInput && !this.waveformInput.disposed) this.waveformInput.dispose()
        this.waveformInput = null
        this.waveformViewStart = 0
        this.waveformViewEnd = this.duration
        this.waveformPeaks = this.fullWaveformPeaks
        this.waveformProgress = 0
        this.isGeneratingWaveform = false
      }
      this.clearMessage()
      this.drawWaveform()
    },

    seekPreview (time) {
      if (!this.audio) return
      const target = this.clamp(Number(time) || 0, 0, this.duration)
      this.currentTime = target
      this.audio.currentTime = Math.min(target, Math.max(0, this.duration - 0.001))
      this.drawWaveform()
    },

    pausePlayback () {
      if (this.audio) this.audio.pause()
      this.isPlaying = false
      this.stopPreviewLoop()
    },

    async togglePlayback () {
      if (!this.audio || this.isExporting) return
      if (this.audio.paused) {
        try {
          if (this.audio.currentTime < this.trimStart || this.audio.currentTime >= this.trimEnd - 0.01) {
            await this.seekAudio(this.trimStart)
            this.currentTime = this.trimStart
          }
          await this.audio.play()
          this.isPlaying = true
          this.startPreviewLoop()
        } catch (error) {
          this.setMessage('Audio preview could not start in this browser.', true)
        }
      } else {
        this.pausePlayback()
        this.drawWaveform()
      }
    },

    onAudioTimeUpdate () {
      this.currentTime = this.audio ? this.audio.currentTime : 0
      if (this.audio && this.isPlaying && this.currentTime >= this.trimEnd) {
        this.audio.pause()
        this.currentTime = this.trimEnd
        this.isPlaying = false
        this.stopPreviewLoop()
      }
      this.drawWaveform()
    },

    onAudioEnded () {
      this.isPlaying = false
      this.stopPreviewLoop()
      this.drawWaveform()
    },

    startPreviewLoop () {
      this.stopPreviewLoop()
      const tick = () => {
        if (!this.audio || this.audio.paused) return
        this.currentTime = this.audio.currentTime
        if (this.currentTime >= this.trimEnd) {
          this.audio.pause()
          this.currentTime = this.trimEnd
          this.isPlaying = false
          this.stopPreviewLoop()
          this.drawWaveform()
          return
        }
        this.drawWaveform()
        this.previewFrameHandle = requestAnimationFrame(tick)
      }
      this.previewFrameHandle = requestAnimationFrame(tick)
    },

    stopPreviewLoop () {
      if (this.previewFrameHandle) cancelAnimationFrame(this.previewFrameHandle)
      this.previewFrameHandle = null
    },

    seekAudio (time) {
      if (!this.audio) return Promise.reject(new Error('Audio preview is unavailable'))
      const target = this.clamp(time, 0, Math.max(0, this.duration - 0.001))
      if (Math.abs(this.audio.currentTime - target) < 0.0005 && this.audio.readyState >= 2) {
        return Promise.resolve()
      }
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('Timed out while seeking the audio preview'))
        }, 12000)
        const cleanup = () => {
          clearTimeout(timeout)
          this.audio.removeEventListener('seeked', onSeeked)
          this.audio.removeEventListener('error', onError)
        }
        const onSeeked = () => {
          cleanup()
          resolve()
        }
        const onError = () => {
          cleanup()
          reject(new Error('The source audio could not be decoded'))
        }
        this.audio.addEventListener('seeked', onSeeked, { once: true })
        this.audio.addEventListener('error', onError, { once: true })
        this.audio.currentTime = target
      })
    },

    async saveAudio () {
      if (this.isExporting) {
        this.cancelRequested = true
        this.exportStage = 'Canceling'
        if (this.activeConversion) this.activeConversion.cancel().catch(() => {})
        return
      }
      if (!this.audio || !this.audioEncodingSupported) return

      this.pausePlayback()
      this.isExporting = true
      this.cancelRequested = false
      this.exportProgress = 0
      this.exportStage = 'Preparing'
      this.clearMessage()

      const exportOptions = {
        format: this.outputFormat,
        preset: { ...this.outputPreset },
        bitrate: this.audioBitrate
      }
      const filename = this.makeOutputName()
      const originalTime = this.audio.currentTime
      let fileHandle = null
      let writable = null

      try {
        if (typeof window.showSaveFilePicker === 'function') {
          try {
            fileHandle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: exportOptions.preset.description,
                accept: {
                  [exportOptions.preset.mimeType]: [exportOptions.preset.extension]
                }
              }]
            })
          } catch (error) {
            if (error && error.name === 'AbortError') return
            throw error
          }
        }

        if (fileHandle) writable = await fileHandle.createWritable()
        const result = await this.encodeAudio(writable, exportOptions)
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')

        if (writable) {
          if (!result.writableClosed) await writable.close()
          writable = null
          this.setMessage(`Saved ${filename}`)
        } else {
          const blob = new Blob([result.buffer], { type: exportOptions.preset.mimeType })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          link.remove()
          setTimeout(() => URL.revokeObjectURL(url), 2000)
          this.setMessage(`Downloaded ${filename}`)
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
          this.setMessage(`Audio export failed${error && error.message ? `: ${error.message}` : '.'}`, true)
        }
      } finally {
        this.isExporting = false
        this.cancelRequested = false
        this.activeConversion = null
        this.exportProgress = 0
        this.exportStage = 'Preparing'
        await this.seekAudio(Math.min(originalTime, Math.max(0, this.duration - 0.001))).catch(() => {})
        this.currentTime = this.audio ? this.audio.currentTime : 0
        this.drawWaveform()
      }
    },

    async encodeAudio (writable = null, exportOptions = {}) {
      const {
        ALL_FORMATS,
        BlobSource,
        BufferTarget,
        canEncodeAudio,
        Conversion,
        ConversionCanceledError,
        Input,
        Mp3OutputFormat,
        Mp4OutputFormat,
        OggOutputFormat,
        Output,
        StreamTarget,
        WavOutputFormat
      } = await import('mediabunny')
      const formatName = exportOptions.format || this.outputFormat
      const preset = exportOptions.preset || this.outputPreset
      const bitrate = exportOptions.bitrate || this.audioBitrate
      const input = new Input({
        source: new BlobSource(this.sourceFile, { maxCacheSize: 8 * 1024 * 1024 }),
        formats: ALL_FORMATS
      })
      let conversion = null

      try {
        this.exportStage = 'Reading audio'
        const audioTrack = await input.getPrimaryAudioTrack()
        if (!audioTrack) throw new Error('No audio track was found')
        const [sourceChannels, sourceSampleRate] = await Promise.all([
          audioTrack.getNumberOfChannels(),
          audioTrack.getSampleRate()
        ])
        const channels = Math.min(Math.max(1, Number(sourceChannels) || 1), 2)
        const sampleRate = formatName === 'wav'
          ? Math.max(1, Number(sourceSampleRate) || 48000)
          : 48000
        if (formatName !== 'wav' && !await canEncodeAudio(preset.codec, {
          numberOfChannels: channels,
          sampleRate,
          bitrate
        })) {
          throw new Error(`${preset.label} cannot be encoded by this browser`)
        }
        const target = writable
          ? new StreamTarget(writable, { chunked: true, chunkSize: 8 * 1024 * 1024 })
          : new BufferTarget()
        const formats = {
          ogg: () => new OggOutputFormat(),
          mp3: () => new Mp3OutputFormat(),
          m4a: () => new Mp4OutputFormat(),
          wav: () => new WavOutputFormat()
        }
        const createFormat = formats[formatName] || formats.ogg
        const output = new Output({
          format: createFormat(),
          target
        })
        const audioOptions = {
          codec: preset.codec,
          sampleRate,
          numberOfChannels: channels,
          forceTranscode: true
        }
        if (formatName === 'wav') {
          audioOptions.sampleFormat = 's16'
          audioOptions.process = sample => {
            // Trim-frame rounding can leave the first PCM sample a fraction of
            // one sample before zero. WAV muxing requires non-negative timestamps.
            const timestampTolerance = 1 / sample.sampleRate
            if (sample.timestamp < 0 && sample.timestamp >= -timestampTolerance) {
              sample.setTimestamp(0)
            }
            return sample
          }
        } else {
          audioOptions.bitrate = bitrate
        }

        conversion = await Conversion.init({
          input,
          output,
          tracks: 'primary',
          trim: {
            start: this.trimStart,
            end: this.trimEnd
          },
          video: { discard: true },
          audio: audioOptions,
          showWarnings: false
        })

        const audioIsUsed = conversion.utilizedTracks.some(track => track === audioTrack)
        if (!conversion.isValid || !audioIsUsed) {
          throw new Error('This audio codec cannot be decoded and exported by this browser')
        }
        if (this.cancelRequested) throw new Error('EXPORT_CANCELED')

        this.activeConversion = conversion
        this.exportStage = 'Encoding audio'
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
        if (!writable && !target.buffer) throw new Error('The exported audio file is empty')
        return {
          buffer: writable ? null : target.buffer,
          writableClosed: Boolean(writable)
        }
      } finally {
        if (!input.disposed) input.dispose()
      }
    },

    makeOutputName () {
      const base = this.sourceName.replace(/\.[^.]+$/, '') || 'audio'
      return `${base}${this.hasTrim ? '-trimmed' : '-converted'}${this.outputPreset.extension}`
    },

    nextTask () {
      return new Promise(resolve => setTimeout(resolve, 0))
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
.trim-audio-tool {
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
  width: 2.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
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

button, input { font: inherit; }
button { cursor: pointer; }
button:disabled, input:disabled { cursor: not-allowed; opacity: 0.62; }

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

.text-button {
  border: 0;
  color: var(--accent);
  background: transparent;
  font-weight: 600;
}

.text-button:hover:not(:disabled) { color: var(--accent-dark); }

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

.waveform-panel {
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

.waveform-stage {
  position: relative;
  width: 100%;
  min-height: 10.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: transparent;
  touch-action: none;
}

.waveform-canvas {
  max-width: 100%;
  display: block;
  outline: 0;
  touch-action: none;
}

.waveform-canvas:focus-visible { box-shadow: inset 0 0 0 3px rgba(196, 126, 196, 0.85); }

.waveform-status {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  padding: 0.28rem 0.5rem;
  border-radius: 0.35rem;
  color: #e6dfe8;
  background: rgba(17, 17, 22, 0.82);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  transform: translateX(-50%);
  white-space: nowrap;
}

.playback {
  width: 100%;
  margin: 0.75rem auto 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.7rem;
}

.play-button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  justify-self: start;
}

.play-button:hover { background: rgba(255, 255, 255, 0.17); }
.play-button svg { width: 0.9rem; fill: currentColor; }

.waveform-zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  gap: 0.4rem;
}

.waveform-zoom-button {
  width: 5rem;
  min-height: 1.85rem;
  padding: 0 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.4rem;
  box-sizing: border-box;
  color: #eee7ef;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.68rem;
  font-weight: 600;
}

.waveform-zoom-button:hover:not(:disabled) {
  border-color: #c47ec4;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.waveform-zoom-button:disabled {
  color: #77717a;
  cursor: not-allowed;
  opacity: 0.65;
}

.timecode {
  color: #d1cad3;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  justify-self: end;
  text-align: right;
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

.waveform-help {
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

.output-settings {
  margin-bottom: 1rem;
  display: grid;
  gap: 0.75rem;
}

.output-settings label {
  display: grid;
  gap: 0.3rem;
  color: #4d4651;
  font-size: 0.72rem;
  font-weight: 650;
}

.output-settings select {
  width: 100%;
  min-height: 2.35rem;
  padding: 0 0.55rem;
  border: 1px solid #d8d0dc;
  border-radius: 0.45rem;
  box-sizing: border-box;
  color: var(--ink);
  background: #fff;
  outline: none;
  font-size: 0.75rem;
}

.output-settings select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(136, 51, 136, 0.1);
}

.output-summary { margin: 0 0 0.8rem; font-size: 0.78rem; }
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

.progress-wrap {
  margin: -0.2rem 0 0.8rem;
  color: var(--muted);
  font-size: 0.68rem;
  text-align: center;
}

.progress-track {
  height: 0.35rem;
  margin-bottom: 0.35rem;
  border-radius: 1rem;
  overflow: hidden;
  background: #e8e0e9;
}

.progress-track span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: var(--accent);
  transition: width 120ms linear;
}

.status-message, .compatibility-message {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
}

.status-message.error, .compatibility-message { color: #a33232; }

@media (max-width: 760px) {
  .trim-audio-tool { margin-top: 1.25rem; }
  .editor-layout { grid-template-columns: 1fr; }
  .settings-panel { border-top: 1px solid var(--line); border-left: 0; }
  .waveform-panel { padding: 0.8rem 0.8rem 0.65rem; }
  .waveform-stage { min-height: 10rem; }
}

@media (max-width: 480px) {
  .drop-zone { min-height: 22rem; padding: 2rem 1rem; }
  .toolbar { align-items: flex-start; }
  .file-summary { display: block; }
  .file-summary > span { display: block; }
  .file-name { max-width: 11rem; }
  .text-button { padding-right: 0; text-align: right; }
  .playback { grid-template-columns: 1fr 1fr; }
  .waveform-zoom-controls { grid-column: 1 / -1; grid-row: 2; }
  .trim-fields { grid-template-columns: 1fr 1fr; }
  .trim-fields > label { grid-template-columns: 1fr; }
  .trim-time, .trim-set-button { grid-column: 1; }
  .trim-reset-button { grid-column: 1 / -1; }
}
</style>
