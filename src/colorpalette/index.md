---
title: Free Color Palette Generator for UI and CSS
description: Build a full UI color palette from one color. Preview it as a light and dark interface, check WCAG contrast, then export CSS variables and design tokens.
pageClass: crop-tool-layout
permalink: /colorpalette/
canonicalUrl: https://curvednebula.com/colorpalette/
meta:
  - name: keywords
    content: color palette generator, UI color palette generator, color palette from one color, CSS variables generator, CSS custom properties, design tokens, design system colors, UI design colors, web design color scheme, dark mode color palette, light and dark theme colors, semantic color tokens, button and surface colors, accessible color palette, WCAG contrast checker, color scheme generator, complementary colors, color wheel, HSV color picker, hue saturation value, monochromatic palette, analogous colors, triadic colors, split complementary, tetradic colors, square color scheme, tints and shades
  - property: og:title
    content: Free Color Palette Generator for UI and CSS
  - property: og:description
    content: Build a full UI color palette from one color. Preview it as a light and dark interface, check WCAG contrast, then export CSS variables and design tokens.
  - property: og:type
    content: website
  - property: og:url
    content: https://curvednebula.com/colorpalette/
  - name: twitter:card
    content: summary
  - name: twitter:title
    content: Free Color Palette Generator for UI and CSS
  - name: twitter:description
    content: Turn one color into a light and dark UI palette with CSS variables and design tokens. Free, private, and browser-based.
---

<ColorPalette />

# Create a UI Color Palette from One Color

This is a color palette generator built for interface work. Pick a base color with the hue, saturation, and value sliders — or drop in a hex value — and it derives a complete palette using classic color theory. Each hue in the scheme comes with five levels, from a pale tint through the base color to a deep shade.

Where it goes further than a swatch generator is what happens next. The preview lays your palette out as a working interface in both a light and a dark theme, so you can see the colors doing real jobs before you commit to them. The exports then name every color by the job it does — page background, card surface, border, heading, body text, primary button — which means what you copy is a set of design tokens ready to paste into a stylesheet, not a bag of hex values you still have to assign. Take it as a hex list, as CSS custom properties, or as JSON, or save the palette as an image. Everything is calculated in your browser, and nothing is uploaded.

## How to build a UI color palette

1. Set the base color. Drag inside the color wheel to choose a hue and saturation at once, use the **Hue**, **Saturation**, and **Value** sliders for precision, or type a hex value such as `#883388`.
2. Choose a harmony. **Complementary** takes the hue directly opposite the base on the wheel; the other schemes spread the hues differently around the same wheel. [The nine harmonies](#the-nine-harmonies) below explains what each one is good for.
3. Choose the color wheel. **RYB** follows traditional artists' color theory, where red pairs with green. **RGB** follows the hue circle used by screens and CSS, where red pairs with cyan.
4. Click any swatch to copy its hex value.
5. Check the **Preview**. It lays the palette out as a small interface — a top bar, a heading, buttons and chips, and a chart — so you can see the colors doing a real job. The two panels show the same palette seated two ways: a plain page with tinted cards on the left, and a tinted page with plain cards on the right. Switch between **Light UI** and **Dark UI** to see both on a pale and a deep background.
6. Export the whole palette with **Copy hex list**, **Copy CSS variables**, or **Copy JSON**, or use **Save PNG** for an image of the palette. Every export carries the raw ramps *and* a named role for each UI element — `--ui-surface`, `--ui-heading`, `--ui-primary`, and so on — for both preview variants in both light and dark.

## Using the palette in your CSS

The CSS export is a drop-in stylesheet fragment. Because the variables are named after interface roles rather than after colors, your rules read as intent and the palette can change underneath them without a single selector being touched:

```css
.card {
  background: var(--ui-surface-card);
  border: 1px solid var(--ui-border);
  color: var(--ui-card-text);
}

.card h2 {
  color: var(--ui-card-heading);
}

.button-primary {
  background: var(--ui-primary);
  color: var(--ui-primary-text);
}

.link {
  color: var(--ui-accent);
}
```

Dark mode needs no extra work: the export ships the dark values inside a `prefers-color-scheme: dark` media query under the same variable names, so the rules above follow the reader's system setting on their own. The raw ramps come along too, as `--base-100` through `--base-900` and one set per harmony hue, for the cases where you want a specific step rather than a role.

The ramps tell you which colors you have; the roles tell you where to put them. Alongside `--base-500` and friends, each export names the job every color does: `--ui-surface` for the page background, `--ui-surface-card` for cards and panels, `--ui-border`, `--ui-heading` and `--ui-text` for type, `--ui-primary` with its matching `--ui-primary-text`, `--ui-accent` for links and highlights, `--ui-subtle` for quiet fills like chips and progress tracks, plus `-on-card` variants for text that sits on a panel rather than the page. Every hue in the scheme also gets `-fill`, `-tint`, `-border`, `-heading` and `-text` so you can use it for charts and status colors.

Both preview variants are exported, labelled **variant 1** (plain page, tinted cards — the left panel) and **variant 2** (tinted page, plain cards — the right panel), each in light and dark.

In the CSS export the variable names are identical across all four, so nothing in your components has to change when you switch. Variant 1 lands in `:root` and applies by default; variant 2 lands in `:root[data-ui-variant='2']`, so setting `data-ui-variant="2"` on your `<html>` element switches the whole interface over. Both dark blocks sit inside a single `prefers-color-scheme: dark` media query after the light ones, which is what makes the cascade resolve correctly for either variant. The hex list separates the four under plain headings, and the JSON export nests them under `ui.variant1` and `ui.variant2` with a `use` note on every token.

## How complementary color theory works

Complementary colors sit opposite each other on the color wheel. Because they share no common hue, placing them side by side produces the maximum contrast available between two colors — which is exactly why a complementary pair works best when one color dominates and the other is saved for the elements that must be noticed: a button, a highlight, a call to action.

Every other harmony in the tool is a variation on that one idea: how far around the wheel to step, and how many times. The degrees below are measured from your base hue, and each of those hues then gets the same five levels.

## The nine harmonies

**Monochromatic** — one hue across five levels of lightness, and the scheme the tool opens with. The safest there is, and a good starting point before you add a single complementary accent.

**Complementary** — the base hue plus the hue directly opposite it, at +180°. This is the strongest contrast two hues can make, so it works best with one color dominant and the complement held back for accents.

**Split complementary** — rather than the exact opposite, the two hues either side of it, at +150° and +210°. Keeps almost all of the contrast of a complementary pair with much less tension, which makes it the most forgiving high-contrast scheme.

**Double split** — both ends of a complementary pair, split: the two hues either side of the base at ±30°, and the two either side of its complement at +150° and +210°. The base hue itself sits out and only anchors the four. Softer than a straight tetrad, with the same variety.

**Triadic** — three hues spaced evenly around the wheel, at +120° and +240°. Vivid and balanced, but let one hue lead and use the other two sparingly or the result reads as noise.

**Tetradic** — two complementary pairs: the base and its complement, plus a second pair one step around the wheel at +60° and +240°. Rich, and it needs a clearly dominant color plus plenty of neutral space.

**Square** — four hues at even quarter turns, +90°, +180° and +270°. Steadier than the tetradic rectangle because every hue keeps the same distance from its neighbours — but four vivid hues is a lot, so let one lead and mute the rest.

**Analogous** — neighbouring hues at ±30°. Calm and cohesive with no complementary contrast at all, so reach for a tint or a shade when you need emphasis.

**Accented analogous** — an analogous trio with the base's complement dropped in at +180° as an accent, and a designers' favourite. The neighbours keep everything calm and cohesive while the complement gives you one loud color for the things that must be noticed.

## Frequently asked questions

### What is a complementary color?

The complementary color is the hue directly opposite your base color on the color wheel, 180 degrees away. On the traditional red-yellow-blue wheel that makes green the complement of red and orange the complement of blue. On the RGB hue circle used by screens, red's complement is cyan and blue's is yellow. Both are correct for their own wheel, which is why this tool lets you choose.

### Why do RYB and RGB give different complements?

The two wheels order the hues differently. The red-yellow-blue wheel comes from mixing pigment and is what most color theory teaching is based on; the RGB hue circle comes from mixing light and is what CSS `hsl()` and every screen uses. Choose RYB when you want the palette to feel like traditional color theory, and RGB when you want the hue offsets to match the values in your code.

### What is the difference between saturation and value?

Saturation is how much of the hue is present, from a neutral grey at 0% to the purest form of the color at 100%. Value is how bright the color is, from black at 0% to the brightest version of that hue at 100%. Lowering saturation mutes a color; lowering value darkens it.

### How are the tints and shades generated?

Each hue in the scheme is converted to lightness, then five levels are derived from it: two lighter steps (100 and 300), the base level (500), and two darker steps (700 and 900). Tints are slightly desaturated and shades slightly more saturated, which keeps pale colors from looking washed out and dark colors from looking muddy.

### How many colors does an interface actually need?

Fewer than most palettes give you. A great many production interfaces run on one hue plus neutrals. Add a second hue only when you have a job for it, typically a single accent for the one element on a screen that must be noticed. The familiar 60-30-10 guideline is a decent sanity check: roughly 60% of the area a dominant neutral or tint, 30% a secondary tone, 10% the accent. If you cannot say what each hue in your palette is *for*, you have too many.

### Can I use these colors as design tokens in a design system?

That is what the exports are shaped for. The role names are the token layer — `--ui-surface`, `--ui-heading`, `--ui-primary` — and the five-step ramps are the primitive layer beneath them, which is the same two-tier structure most design systems settle on. Paste the CSS straight into a stylesheet, or take the JSON export, where every token carries both its hex value and a `use` note describing the element it belongs to, and transform it into whatever format your pipeline expects.

### Are the palettes WCAG accessible?

The tool shows the contrast ratio of your base color against white and black text so you can check it against WCAG requirements — 4.5:1 for normal body text and 3:1 for large text. Swatch labels automatically switch between light and dark for legibility, and the preview picks the level from each ramp that clears those thresholds against the background it sits on, so what you see there is readable. Always verify the specific color pairs you plan to use, though: a pale, unsaturated hue has a compressed ramp, and its darkest shade may not be dark enough to carry body text on its own tint.
