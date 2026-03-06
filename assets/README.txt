Place your app icons here before building:

  assets/icon.ico   — Windows icon (256x256)
  assets/icon.icns  — macOS icon bundle
  assets/icon.png   — Linux icon (512x512)

You can generate these from a single PNG using:
  - https://www.icoconverter.com (for .ico)
  - https://iconverticons.com    (for .icns)

Or use the `electron-icon-builder` npm package:
  pnpm add -D electron-icon-builder
  pnpm electron-icon-builder --input=assets/icon-source.png --output=assets
