#!/bin/bash
# Build KickInsights extension ZIP for Chrome Web Store upload
# Usage: bash scripts/build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$EXT_DIR/build"
VERSION=$(node -p "require('$EXT_DIR/manifest.json').version")
ZIP_NAME="kickinsights-v${VERSION}.zip"

echo "Building KickInsights v${VERSION}..."

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy extension files (exclude dev/test files)
cp "$EXT_DIR/manifest.json" "$BUILD_DIR/"
cp -r "$EXT_DIR/src" "$BUILD_DIR/"
cp -r "$EXT_DIR/icons" "$BUILD_DIR/"

# Remove SVG icons (Chrome only uses PNG)
rm -f "$BUILD_DIR/icons/"*.svg

# Create ZIP
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -q

echo ""
echo "Built: $EXT_DIR/$ZIP_NAME"
echo "Size: $(du -h "$EXT_DIR/$ZIP_NAME" | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Go to https://chrome.google.com/webstore/devconsole"
echo "  2. Click 'New Item'"
echo "  3. Upload $ZIP_NAME"
echo "  4. Fill in listing details from STORE_LISTING.md"
echo ""
echo "IMPORTANT: Make sure icons/icon16.png, icon48.png, icon128.png"
echo "are proper PNGs (not placeholders). Open scripts/icon-renderer.html"
echo "in Chrome to generate them."
