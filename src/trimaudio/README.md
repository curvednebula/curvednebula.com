---
title: Free Online Audio Trimmer with Waveform
description: Trim MP3, WAV, M4A, Ogg, Opus, FLAC, and AAC audio with an interactive waveform. Export Ogg, MP3, M4A, or WAV locally.
pageClass: crop-tool-layout
permalink: /trimaudio/
canonicalUrl: https://curvednebula.com/trimaudio/
meta:
  - name: keywords
    content: trim audio online, audio cutter online, MP3 trimmer, WAV trimmer, audio waveform editor, cut audio in browser, private audio trimmer
  - property: og:title
    content: Free Online Audio Trimmer with Waveform
  - property: og:description
    content: Select a range on an interactive waveform and export trimmed Ogg, MP3, M4A, or WAV audio locally in your browser.
  - property: og:type
    content: website
  - property: og:url
    content: https://curvednebula.com/trimaudio/
  - name: twitter:card
    content: summary
  - name: twitter:title
    content: Free Online Audio Trimmer with Waveform
  - name: twitter:description
    content: Trim audio against an interactive waveform without uploading your file.
---

<AudioTrim />

# Trim Audio Online

Cut unwanted time from the beginning or end of an audio file using an interactive waveform. Click or drag the waveform to move the playhead, drag either edge handle to select the part to keep, preview the selection, and export it as Ogg Opus, MP3, M4A AAC, or WAV audio.

The waveform is generated incrementally from short regions distributed across the track. Each decoded sample is reduced into a waveform peak and released immediately, so the entire audio file is not retained in browser memory. Your audio stays on your device and is never uploaded.

## How to trim audio

1. Select an audio file or drag it into the trimmer.
2. Click or drag the waveform to navigate through the audio.
3. Drag the waveform edge handles to select the range to keep, or enter exact start and end timestamps.
4. Preview the selected range with the play button.
5. Choose an output format and bitrate, then select **Save Audio**.

## Browser compatibility

Recent Chromium-based browsers such as Chrome and Edge provide the best compatibility. Audio export requires WebCodecs and must run in a secure browser context such as HTTPS.

**Input files supported:** MP3, WAV/WAVE, M4A, Ogg/OGA, Opus, FLAC, and AAC.

- **MP3 and WAV:** Generally provide the broadest input compatibility.
- **M4A and AAC:** Browser- and operating-system-specific. M4A is a container, so the audio codec inside it must also be supported; AAC is the most common.
- **Ogg, Opus, and FLAC:** Support varies between browsers and operating systems.
- An accepted filename extension does not guarantee that a file can be edited. The browser must be able to play the file for preview and decode its exact codec through WebCodecs for waveform generation and export.

**Output files supported:** Ogg Opus, MP3, M4A AAC, and uncompressed 16-bit WAV.

- **WAV PCM:** The most dependable output choice. It does not require a compressed-audio encoder, but the browser must still be able to decode the input audio.
- **Ogg Opus:** Requires an Opus `AudioEncoder` and is available only when the current browser reports support.
- **M4A AAC:** Browser-specific. AAC encoding may be unavailable in Firefox or on desktop Linux.
- **MP3:** Highly browser-specific and usually unavailable because current major browsers do not normally expose an MP3 `AudioEncoder`.
- Unsupported compressed formats are disabled automatically in the output selector. Safari added WebCodecs audio encoding and decoding in Safari 26, so earlier Safari versions cannot export audio with this tool.

