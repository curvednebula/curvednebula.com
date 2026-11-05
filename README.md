# Curved Nebula website

## Development

```bash
npm install
npm run dev
```

To test obfuscation and the production domain lock during development, run:

```bash
npm run dev:obfuscated
```

This intentionally redirects localhost and other unapproved hosts to
`https://curvednebula.com/`. Stop it and use `npm run dev` to develop locally
without obfuscation or the domain lock.

## Production build

```bash
npm run build
```

Production browser builds obfuscate JavaScript from
`src/.vitepress/theme/components/`, including its helper modules, using
[`javascript-obfuscator`](https://github.com/javascript-obfuscator/javascript-obfuscator).
The domain lock allows only `curvednebula.com` and `www.curvednebula.com`;
other hosts redirect to `https://curvednebula.com/`. Consequently, use
`npm run dev` for local tool development; the tools in `npm run preview`
also enforce the production domain lock. Server rendering, page content,
and third-party libraries are excluded from obfuscation.

Run the obfuscation and domain-lock checks with `npm run test:obfuscation`.

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

Search and social metadata share each page's title and description. Set
`canonicalUrl` in page frontmatter and add new public pages to
`src/public/sitemap.xml`. Page-specific share images can override `og:image`
through `meta`; other pages use the site emblem.

After building, verify metadata, canonical URLs, sitemap coverage, and crawlable
internal links with `npm run test:seo`.

```bash
npm run deploy -- "Improve the screenshot editor"
```

You can also use `npm run deploy -- -m "Your commit message"`.
Running `npm run deploy` without a message keeps the default `new deployment`.
The command builds the site, stages changes, commits with your message, pushes
the current branch, and publishes `dist` to `gh-pages`.
