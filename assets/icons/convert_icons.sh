#!/bin/bash

# SSH Manager Icon Conversion Script
# Converts PNG files to required formats for cross-platform packaging

ICON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ICON_DIR"

echo "🔄 Converting SSH Manager icons to required formats..."

# Check if we have the generated PNG files
if [ ! -f "ssh_manager_512.png" ]; then
    echo "❌ Error: PNG icons not found. Run create_ssh_manager_icon.py first"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Convert to ICO for Windows
echo "📦 Creating Windows .ico file..."
if command_exists convert; then
    # Using ImageMagick convert
    convert ssh_manager_256.png ssh_manager_128.png ssh_manager_64.png ssh_manager_48.png ssh_manager_32.png ssh_manager_16.png icon.ico
    echo "✅ Created icon.ico"
elif command_exists magick; then
    # Using newer ImageMagick magick command
    magick ssh_manager_256.png ssh_manager_128.png ssh_manager_64.png ssh_manager_32.png ssh_manager_16.png icon.ico
    echo "✅ Created icon.ico"
else
    echo "⚠️  ImageMagick not found. Cannot create .ico file"
    echo "   Install with: sudo apt-get install imagemagick (Linux) or brew install imagemagick (macOS)"
fi

# Convert to ICNS for macOS
echo "🍎 Creating macOS .icns file..."

if command_exists iconutil && [[ "$OSTYPE" == "darwin"* ]]; then
    # Create iconset directory structure for macOS
    mkdir -p icon.iconset
    
    # Copy files with macOS naming convention
    cp ssh_manager_16.png icon.iconset/icon_16x16.png
    cp ssh_manager_32.png icon.iconset/icon_16x16@2x.png
    cp ssh_manager_32.png icon.iconset/icon_32x32.png
    cp ssh_manager_64.png icon.iconset/icon_32x32@2x.png
    cp ssh_manager_128.png icon.iconset/icon_128x128.png
    cp ssh_manager_256.png icon.iconset/icon_128x128@2x.png
    cp ssh_manager_256.png icon.iconset/icon_256x256.png
    cp ssh_manager_512.png icon.iconset/icon_256x256@2x.png
    cp ssh_manager_512.png icon.iconset/icon_512x512.png
    
    # Create the .icns file
    iconutil -c icns icon.iconset
    
    # Cleanup
    rm -rf icon.iconset
    
    echo "✅ Created icon.icns"
    
elif command_exists png2icns; then
    # Alternative using png2icns if available
    png2icns icon.icns ssh_manager_512.png ssh_manager_256.png ssh_manager_128.png ssh_manager_64.png ssh_manager_32.png ssh_manager_16.png
    echo "✅ Created icon.icns"
    
else
    echo "⚠️  iconutil or png2icns not found. Cannot create .icns file"
    echo "   On macOS: iconutil is built-in"
    echo "   On Linux: install png2icns or use online converter"
fi

# Update the main icon.png (copy the 512px version)
echo "🐧 Updating Linux icon..."
cp ssh_manager_512.png icon.png
echo "✅ Updated icon.png (512x512)"

# Create additional common sizes if they don't exist
echo "📐 Creating additional icon sizes..."

# Create 48x48 for Windows if ImageMagick is available
if (command_exists convert || command_exists magick) && [ ! -f "ssh_manager_48.png" ]; then
    if command_exists convert; then
        convert ssh_manager_64.png -resize 48x48 ssh_manager_48.png
    else
        magick ssh_manager_64.png -resize 48x48 ssh_manager_48.png
    fi
    echo "✅ Created ssh_manager_48.png"
fi

echo ""
echo "🎉 Icon conversion complete!"
echo ""
echo "Generated files:"
echo "  📁 PNG files: ssh_manager_{16,32,64,128,256,512}.png"
echo "  🐧 Linux: icon.png"

if [ -f "icon.ico" ]; then
    echo "  🪟 Windows: icon.ico"
fi

if [ -f "icon.icns" ]; then
    echo "  🍎 macOS: icon.icns"
fi

echo ""
echo "Next steps:"
echo "1. Test the new icons by running: npm run dev"
echo "2. Commit the new icon files"
echo "3. Build and test on different platforms"