# Curved Nebula website

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## App Screenshot Creator

The browser-local screenshot editor is available at `/appscreenshots/` and linked
from the homepage and Online Tools menu. It supports per-frame descriptions,
shared or individual composition and typography, solid backgrounds, continuous
gradients, and individual PNG/JPEG or batch ZIP downloads.

Run its rendering and export checks with:

```bash
npm run test:app-screenshots
```

## Publish

```bash
npm run deploy -- "Improve the screenshot editor"
```

You can also use `npm run deploy -- -m "Your commit message"`.
Running `npm run deploy` without a message keeps the default `new deployment`.
The command builds the site, stages changes, commits with your message, pushes
the current branch, and publishes `dist` to `gh-pages`.
