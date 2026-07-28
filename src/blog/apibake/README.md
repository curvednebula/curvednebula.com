---
title: ApiBake OpenAPI to PDF Generator
description: Convert OpenAPI 3 JSON or YAML specifications into clean PDF API documentation with bookmarks, schema links and customizable colors.
permalink: /apibake/
canonicalUrl: https://curvednebula.com/apibake/
meta:
  - name: keywords
    content: ApiBake, OpenAPI to PDF, API documentation generator, OpenAPI PDF, Swagger PDF, OpenAPI CLI
  - property: og:title
    content: ApiBake OpenAPI to PDF Generator
  - property: og:description
    content: Generate readable PDF API documentation from OpenAPI 3 JSON or YAML files with bookmarks and linked schemas.
  - property: og:type
    content: website
  - property: og:url
    content: https://curvednebula.com/apibake/
---

# ApiBake OpenAPI to PDF Generator

ApiBake is a command-line API documentation generator that converts OpenAPI 3 JSON or YAML specifications into a clean, readable PDF document.

## OpenAPI PDF documentation features

- PDF bookmarks and schema cross-references for quick navigation
- API schemas formatted for easy copying into TypeScript code
- Customizable document colors
- Support for individual OpenAPI files or folders
- OpenAPI 3.0.0 and newer specifications

## Install ApiBake

ApiBake requires Node.js 16 or newer. Install it globally from npm:

```bash
npm install -g apibake
```

## Convert OpenAPI to PDF

Pass an OpenAPI JSON file, YAML file, or folder to the command:

```bash
apibake <openapi.json|.yaml|folder-name>
```

Run `apibake -h` to see all available command-line options.

## ApiBake links

- [Install ApiBake from npm](https://www.npmjs.com/package/apibake)
- [View the ApiBake source code on GitHub](https://github.com/curvednebula/apibake-js)

## Why generate API documentation as PDF?

PDF documentation is convenient for offline reading, review, archiving, and sharing a stable version of an API specification. ApiBake focuses on producing a less cluttered document while preserving useful navigation between endpoints and schemas.
