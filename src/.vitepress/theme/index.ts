import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ImageCrop from './components/ImageCrop.vue'
import VideoCrop from './components/VideoCrop.vue'
import AudioTrim from './components/AudioTrim.vue'
import ColorPalette from './components/ColorPalette.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ImageCrop', ImageCrop)
    app.component('VideoCrop', VideoCrop)
    app.component('AudioTrim', AudioTrim)
    app.component('ColorPalette', ColorPalette)
  }
} satisfies Theme
