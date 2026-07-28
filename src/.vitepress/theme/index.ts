import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ImageCropper from './components/ImageCropper.vue'
import VideoCropper from './components/VideoCropper.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ImageCropper', ImageCropper)
    app.component('VideoCropper', VideoCropper)
  }
} satisfies Theme
