# DocBaker for OpenAPI

DocBaker (Alpha) is OpenAPI JSON to PDF document generator. It supports OpenAPI spec. 3.0.0+.

**[Try DocBaker Online](https://apidoc.curvednebula.com)**

Or download DocBaker CLI tool:

**[for Windows](/downloads/docbaker-win.zip)** | **[for macOS](/downloads/docbaker-mac.zip)**

```
Usage: docbaker <openapi.json> [<api2.json> <api3.json> ...] [<options>]
Options:
-o, --output                Output file.
                            (defaults to "api-spec.pdf")
    --title                 Document title.
                            (defaults to "API Spec")
    --subtitle              Document sub title.
    --[no-]merge-schemas    When multiple API files parsed merge all schemas into one section.
-h, --help                  Show this help page.
```

Source Code:

**[https://github.com/curvednebula/docbaker-cli](https://github.com/curvednebula/docbaker-cli)**
