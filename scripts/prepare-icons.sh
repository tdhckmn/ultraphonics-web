#!/bin/bash
# Convert band logo to proper Electron icon formats

set -e

ICON_DIR="build/icons"
SOURCE_ICON="assets/images/apple-touch-icon.png"

echo "Preparing Electron app icons..."

# Create build/icons directory
mkdir -p "$ICON_DIR"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Error: Source icon not found at $SOURCE_ICON"
    exit 1
fi

# macOS (.icns) - requires iconutil on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Creating macOS icon (.icns)..."

    # Create iconset directory
    ICONSET="$ICON_DIR/icon.iconset"
    mkdir -p "$ICONSET"

    # Generate different sizes for .icns
    sips -z 16 16     "$SOURCE_ICON" --out "$ICONSET/icon_16x16.png" 2>/dev/null
    sips -z 32 32     "$SOURCE_ICON" --out "$ICONSET/icon_16x16@2x.png" 2>/dev/null
    sips -z 32 32     "$SOURCE_ICON" --out "$ICONSET/icon_32x32.png" 2>/dev/null
    sips -z 64 64     "$SOURCE_ICON" --out "$ICONSET/icon_32x32@2x.png" 2>/dev/null
    sips -z 128 128   "$SOURCE_ICON" --out "$ICONSET/icon_128x128.png" 2>/dev/null
    sips -z 256 256   "$SOURCE_ICON" --out "$ICONSET/icon_128x128@2x.png" 2>/dev/null
    sips -z 256 256   "$SOURCE_ICON" --out "$ICONSET/icon_256x256.png" 2>/dev/null
    sips -z 512 512   "$SOURCE_ICON" --out "$ICONSET/icon_256x256@2x.png" 2>/dev/null
    sips -z 512 512   "$SOURCE_ICON" --out "$ICONSET/icon_512x512.png" 2>/dev/null
    sips -z 1024 1024 "$SOURCE_ICON" --out "$ICONSET/icon_512x512@2x.png" 2>/dev/null

    # Convert to .icns
    iconutil -c icns "$ICONSET" -o "$ICON_DIR/icon.icns"

    # Cleanup iconset
    rm -rf "$ICONSET"

    echo "✓ Created icon.icns"
fi

# Windows (.ico) - using ImageMagick if available
if command -v magick &> /dev/null || command -v convert &> /dev/null; then
    echo "Creating Windows icon (.ico)..."

    CONVERT_CMD="convert"
    if command -v magick &> /dev/null; then
        CONVERT_CMD="magick"
    fi

    # Create multi-resolution .ico (16, 32, 48, 64, 128, 256)
    $CONVERT_CMD "$SOURCE_ICON" -resize 256x256 \
        \( -clone 0 -resize 16x16 \) \
        \( -clone 0 -resize 32x32 \) \
        \( -clone 0 -resize 48x48 \) \
        \( -clone 0 -resize 64x64 \) \
        \( -clone 0 -resize 128x128 \) \
        -delete 0 "$ICON_DIR/icon.ico"

    echo "✓ Created icon.ico"
else
    echo "⚠ ImageMagick not found, skipping .ico generation"
    echo "  Install with: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
fi

# Linux (.png) - needs to be at least 256x256, preferably 512x512
echo "Creating Linux icon (.png)..."
if command -v sips &> /dev/null; then
    # macOS - use sips
    sips -z 512 512 "$SOURCE_ICON" --out "$ICON_DIR/icon.png" 2>/dev/null
    echo "✓ Created icon.png (512x512)"
elif command -v magick &> /dev/null || command -v convert &> /dev/null; then
    # ImageMagick - use convert/magick
    CONVERT_CMD="convert"
    if command -v magick &> /dev/null; then
        CONVERT_CMD="magick"
    fi
    $CONVERT_CMD "$SOURCE_ICON" -resize 512x512 "$ICON_DIR/icon.png"
    echo "✓ Created icon.png (512x512)"
else
    # No image tools available - error out for Linux builds
    echo "⚠ WARNING: No image conversion tools available!"
    echo "  For Linux builds, icon.png must be at least 256x256"
    echo "  Source icon is only 180x180 - build will fail"
    echo "  Install ImageMagick: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
    # Copy anyway for local dev, but warn
    cp "$SOURCE_ICON" "$ICON_DIR/icon.png"
    echo "✗ Created icon.png (180x180 - TOO SMALL FOR LINUX BUILD)"
fi

echo ""
echo "Icon preparation complete! Icons saved to $ICON_DIR/"
