---
title: Creative Apps and Online Tools
description: Curved Nebula creates color grading, photo editing, sleep sound, and private browser-based UI color palette, image, and video tools for Android, iOS, macOS, and the web.
permalink: /
canonicalUrl: https://curvednebula.com/
meta:
  - name: keywords
    content: Curved Nebula, Photo Curves, Lullwave, image tools, video tools, color grading app, sleep sounds, UI color palette generator, CSS variables generator, design tokens
  - property: og:title
    content: Curved Nebula Creative Apps and Online Tools
  - property: og:description
    content: Discover Photo Curves for color grading, Lullwave for calming sounds, a UI color palette generator, and private browser-based image and video tools.
  - property: og:type
    content: website
  - property: og:url
    content: https://curvednebula.com/
  - property: og:image
    content: https://curvednebula.com/images/curvednebula.png
  - name: twitter:card
    content: summary
---

<style>
.home-intro {
  margin: 0 auto;
  max-width: 45rem;
}
.home-intro h1 {
  margin-bottom: 0.75rem;
}
.home-intro p {
  color: #666;
  font-size: 1.05rem;
  line-height: 1.7;
}
.apps-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2.5rem;
  margin: 2.5rem auto;
  max-width: 64rem;
}
.app-item {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
  text-align: center;
}
.app-icon {
  width: 8rem;
  height: 8rem;
  min-width: 8rem;
  min-height: 8rem;
  flex-shrink: 0;
}
.app-info h3 {
  margin-top: 0;
  margin-bottom: 0.625rem;
}
.app-info p {
  margin: 0;
  color: #666;
}
.app-info a {
  text-decoration: none;
  color: inherit;
}
.app-info a:hover {
  opacity: 0.8;
}
.copyright {
  margin: 4rem 0 1rem;
  text-align: center;
  color: #666;
  font-size: 0.875rem;
  padding: 0.625rem 0;
}
@media (max-width: 768px) {
  .apps-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .apps-container {
    grid-template-columns: 1fr;
  }
  .app-icon {
    width: 5rem;
    height: 5rem;
    min-width: 5rem;
    min-height: 5rem;
  }
}
</style>

<div class="home-intro">
  <h1>Creative Apps and Online Tools </h1>
</div>

<div class="apps-container">
  <div class="app-item">
    <a href="/photocurves/">
      <img src="/images/photocurves_icon_rounded_256x256.png" alt="Photo Curves color grading app" class="app-icon" />
    </a>
    <div class="app-info">
      <a href="/photocurves/"><h3>Photo Curves</h3></a>
      <p>A color grading photo editor and 3D LUT creator with curves, color wheels, layer masks, and selective color tools. Available on Android, iOS, macOS, and the web.</p>
    </div>
  </div>
  <div class="app-item">
    <a href="/cropimage/" aria-label="Open the free online image cropper and resizer">
      <svg class="app-icon crop-icon" viewBox="0 0 128 128" role="img" aria-label="Crop and Resize Image online tool icon">
        <rect width="128" height="128" rx="28" fill="#333333"/>
        <path d="M36 20v64c0 5 4 8 8 8h64M20 36h64c5 0 8 4 8 8v64" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>
    <div class="app-info">
      <a href="/cropimage/"><h3>Crop and Resize Images Online</h3></a>
      <p>Crop and resize PNG, JPEG, and WebP images to exact output dimensions or common aspect ratios. Images are processed privately in your browser.</p>
    </div>
  </div>
  <div class="app-item">
    <a href="/cropvideo/" aria-label="Open the free online video cropper, trimmer, and resizer">
      <svg class="app-icon crop-icon" viewBox="0 0 128 128" role="img" aria-label="Crop, Trim, and Resize Video online tool icon">
        <rect width="128" height="128" rx="28" fill="#333333"/>
        <path d="M36 20v64c0 5 4 8 8 8h64M20 36h64c5 0 8 4 8 8v64" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M57 50.2c-1.6-.9-3.5.2-3.5 2v23.6c0 1.9 1.9 2.9 3.5 2l20-11.8c1.6-.9 1.6-3.1 0-4z" fill="#fff"/>
      </svg>
    </a>
    <div class="app-info">
      <a href="/cropvideo/"><h3>Crop, Trim, and Resize Videos Online</h3></a>
      <p>Crop, trim, and resize MP4, WebM, MKV, MOV, and AVI videos locally. Export as WebM, MKV, or MP4.</p>
    </div>
  </div>
  <div class="app-item">
    <a href="/trimaudio/" aria-label="Open the free online audio trimmer with waveform">
      <svg class="app-icon crop-icon" viewBox="0 0 128 128" role="img" aria-label="Trim Audio online tool icon">
        <rect width="128" height="128" rx="28" fill="#333333"/>
        <path d="M24 59v10m10-23v36m10-52v68m10-55v42m10-68v94m10-78v62m10-48v34m10-28v22m10-16v10" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      </svg>
    </a>
    <div class="app-info">
      <a href="/trimaudio/"><h3>Trim Audio Online</h3></a>
      <p>Navigate and trim MP3, WAV, M4A, Ogg, Opus, FLAC, and AAC files with an interactive waveform. Audio is processed privately in your browser.</p>
    </div>
  </div>
  <div class="app-item">
    <a href="/colorpalette/" aria-label="Open the free online UI color palette generator">
      <svg class="app-icon crop-icon" viewBox="0 0 128 128" role="img" aria-label="UI Color Palette Generator online tool icon">
        <rect width="128" height="128" rx="28" fill="#333333"/>
        <circle cx="64" cy="41" r="15" fill="#42a1eb"/>
        <circle cx="41" cy="80" r="15" fill="#eb42a1"/>
        <circle cx="87" cy="80" r="15" fill="#a1eb42"/>
      </svg>
    </a>
    <div class="app-info">
      <a href="/colorpalette/"><h3>UI Color Palette Generator</h3></a>
      <p>Build a complete UI color palette from a single color, preview it as a light and dark interface, and export CSS variables, design tokens, or JSON.</p>
    </div>
  </div>
  <div class="app-item">
    <a href="/lullwave/">
      <img src="/images/lullwave_icon_rounded_256x256.png" alt="Lullwave sleep sounds app" class="app-icon" />
    </a>
    <div class="app-info">
      <a href="/lullwave/"><h3>Lullwave</h3></a>
      <p>Colored noise and ambient sounds for sleep, relaxation, focus, and sound masking, including rain, water, sea waves, train, and fireplace sounds.</p>
    </div>
  </div>
</div>

<div class="copyright">
  © 2020-2026 Curved Nebula
</div>
