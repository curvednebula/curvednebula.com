---
title: Free Online Video Cropper, Trimmer, and Resizer
description: Crop, trim, and resize MP4, WebM, MKV, MOV, and AVI videos to a new duration, aspect ratio, or exact resolution. Export a private, browser-processed WebM video.
pageClass: crop-tool-layout
permalink: /cropvideo/
canonicalUrl: https://curvednebula.com/cropvideo/
meta:
  - name: keywords
    content: crop video online, trim video online, resize video online, MKV video cropper, AVI video cropper, crop AVI video, change video aspect ratio, video resolution converter, WebCodecs video editor, crop video to 9:16, crop video to 16:9
  - property: og:title
    content: Free Online Video Cropper, Trimmer, and Resizer
  - property: og:description
    content: Crop, trim, and resize MP4, WebM, MKV, MOV, and AVI videos locally, then export as WebM.
  - property: og:type
    content: website
  - property: og:url
    content: https://curvednebula.com/cropvideo/
  - name: twitter:card
    content: summary
  - name: twitter:title
    content: Free Online Video Cropper, Trimmer, and Resizer
  - name: twitter:description
    content: Crop, trim, and resize MP4, WebM, MKV, MOV, and AVI videos locally, then export as WebM.
---

# Crop, Trim, and Resize Videos Online

<VideoCropper />

## About

Crop a video to a custom area or a common aspect ratio, trim unwanted time from the beginning or end, resize it to an exact output resolution, and save the result as a WebM file. MP4, WebM, MKV, MOV, and AVI files are supported. Processing happens locally in your browser — your video is never uploaded.

## How to crop a video

1. Select a video from your device or drag and drop it into the cropper.
2. Drag inside the crop area to reposition it, then drag the handles to resize it.
3. Drag the trim handles to select the part of the video to keep, or set either boundary to the playhead.
4. Choose an aspect ratio such as 16:9, 1:1, 4:5, or 9:16.
5. Keep the crop resolution, choose a long-edge preset, or enter a custom width and height.
6. Select a frame rate and quality level, then choose **Save Video**.

The editor previews only the selected time range with the same crop. Exported dimensions are kept even for broad WebM codec compatibility.

MP4, MOV, WebM, and MKV exports use a sequential Mediabunny decode pipeline instead of seeking separately for every output frame. AVI and compatibility exports use the same Mediabunny WebM writer, so every export path shares one maintained output pipeline.

## Browser compatibility

Video export requires a browser with the WebCodecs VideoEncoder API. Recent Chromium-based browsers such as Chrome and Edge offer the broadest compatibility.

## Frequently asked questions

### Can I remove time from the beginning or end?

Yes. Move the start and end trim handles, enter exact times in seconds, or move the playhead and choose **Set to playhead**. Preview playback stays inside the selected range, and the exported video starts at time zero.

### Can I crop a landscape video into a vertical video?

Yes. Choose **Vertical · 9:16**, move the selection over the important part of the frame, and select a suitable output resolution such as a 1080-pixel long edge.

### Can I enter an exact video resolution?

Yes. Choose **Custom** under Output resolution, then enter the width and height. Keep the aspect ratio option enabled to avoid stretching.

### What format does the tool export?

The tool exports a WebM file encoded with VP9 or VP8. Audio is encoded as Opus when it can be preserved.

### Why can video export take a while?

Every frame must be decoded, cropped, resized, and encoded on your device. Longer videos, higher resolutions, and 60 fps exports require more processing.

