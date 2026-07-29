---
title: Free Online Video Cropper, Trimmer, and Resizer
description: Crop, trim, and resize MP4, WebM, MKV, MOV, and AVI videos to a new duration, aspect ratio, or exact resolution. Export privately as WebM, MKV, or MP4.
pageClass: crop-tool-layout
permalink: /cropvideo/
canonicalUrl: https://curvednebula.com/cropvideo/
meta:
  - name: keywords
    content: crop video online, trim video online, resize video online, MKV video cropper, AVI video cropper, crop AVI video, change video aspect ratio, video resolution converter, WebCodecs video editor, crop video to 9:16, crop video to 16:9
  - property: og:title
    content: Free Online Video Cropper, Trimmer, and Resizer
  - property: og:description
    content: Crop, trim, and resize MP4, WebM, MKV, MOV, and AVI videos locally, then export as WebM, MKV, or MP4.
  - property: og:type
    content: website
  - property: og:url
    content: https://curvednebula.com/cropvideo/
  - name: twitter:card
    content: summary
  - name: twitter:title
    content: Free Online Video Cropper, Trimmer, and Resizer
  - name: twitter:description
    content: Crop, trim, and resize MP4, WebM, MKV, MOV, and AVI videos locally, then export as WebM, MKV, or MP4.
---

# Crop, Trim, and Resize Videos Online

<VideoCrop />

## About

Crop a video to a custom area or a common aspect ratio, trim unwanted time from the beginning or end, resize it to an exact output resolution, and save the result as WebM, MKV, or MP4. MP4, WebM, MKV, MOV, and AVI input files are supported. Processing happens locally in your browser — your video is never uploaded.

## How to crop a video

1. Select a video from your device or drag and drop it into the cropper.
2. Drag inside the crop area to reposition it, then drag the handles to resize it.
3. Drag the trim handles to select the part of the video to keep, or set either boundary to the playhead.
4. Choose an aspect ratio such as 16:9, 1:1, 4:5, or 9:16.
5. Keep the crop resolution, choose a long-edge preset, or enter a custom width and height.
6. Select WebM, MKV, or MP4, set a frame rate and quality level, then choose **Save Video**.

The editor previews only the selected time range with the same crop. Exported dimensions are kept even for broad codec compatibility.

MP4, MOV, WebM, and MKV input files use a sequential Mediabunny decode pipeline instead of seeking separately for every output frame. AVI and compatibility exports use the same output writers, so every export path supports the selected format.

## Browser compatibility

Recent Chromium-based browsers such as Chrome and Edge offer the best compatibility. Video export requires WebCodecs and must run in a secure browser context such as HTTPS.

**Input files supported:** MP4, M4V, MOV, WebM, MKV, and AVI.

- **MP4, M4V, and MOV:** Usually offer the broadest input compatibility when they contain H.264 video and AAC audio. Files using HEVC, ProRes, or another codec still depend on the codecs available in the browser and operating system.
- **WebM:** Requires browser support for the VP8 or VP9 video codec used by the file. Opus audio also requires a compatible audio decoder.
- **MKV and AVI:** Browser-specific. The tool can read these containers, but the video and audio codecs inside them must still be supported by WebCodecs on the current device. Recent Chrome and Edge generally provide the best results.
- Non-AVI files must also be playable by the browser's built-in video player so the editor can show a preview.

**Output files supported:** WebM, MKV, and MP4.

- **WebM and MKV:** Use VP9 or VP8 video and, when available, Opus audio. VP9, VP8, and Opus encoder availability varies by browser and device.
- **MP4:** Uses H.264 video and, when available, AAC audio. H.264 encoding can depend on the device's hardware and operating system. AAC encoding is especially browser-specific and may be unavailable in Firefox or on desktop Linux.
- The tool checks the selected output codecs at runtime. If the video codec is unavailable, export stops with an explanatory message. If only the audio encoder is unavailable, the video is exported without audio and the tool shows a warning.
- Safari added WebCodecs audio encoding and decoding in Safari 26. Earlier Safari versions may open some input videos but cannot preserve their audio during export.

## Frequently asked questions

### Can I remove time from the beginning or end?

Yes. Move the start and end trim handles, enter exact timestamps, or move the playhead and choose **Set to playhead**. Preview playback stays inside the selected range, and the exported video starts at time zero.

### Can I crop a landscape video into a vertical video?

Yes. Choose **Vertical · 9:16**, move the selection over the important part of the frame, and select a suitable output resolution such as a 1080-pixel long edge.

### Can I enter an exact video resolution?

Yes. Choose **Custom** under Output resolution, then enter the width and height. Keep the aspect ratio option enabled to avoid stretching.


