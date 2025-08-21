# SSH Manager Icons

## Required Icon Files

For proper packaging, the following icon files are needed:

### macOS
- `icon.icns` - macOS application icon (512x512, 256x256, 128x128, 64x64, 32x32, 16x16)
- `dmg-background.png` - DMG installer background image (540x380)

### Windows  
- `icon.ico` - Windows application icon (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)

### Linux
- `icon.png` - Linux application icon (512x512)

## Icon Design Guidelines

The SSH Manager icon represents:
- **Simplicity**: Clean, high-contrast design
- **Clarity**: Direct text identification of the application
- **Visibility**: Excellent contrast for all themes and backgrounds
- **Professionalism**: Classic black and white styling

Current design elements:
- Solid black background
- White text: "SSH" (larger) and "Manager" (smaller)
- Two-line centered layout
- Clean typography with high contrast
- No decorative elements - pure simplicity
- Cross-platform compatibility

## Generation Tools

You can create `.icns` files from PNG sources using:
- `iconutil` (macOS built-in): `iconutil -c icns icon.iconset`
- Online converters
- Design tools like Sketch, Figma with icon export plugins

## Current Icons

SSH Manager now has clean, simple icons featuring:
- Black background with white text design
- "SSH" and "Manager" on two centered lines
- High contrast for excellent visibility
- Cross-platform support with .png, .ico, and .icns formats
- Multiple sizes from 16x16 to 512x512 for crisp display at any scale

Generated using `create_black_white_icon.py` and converted with `convert_icons.sh`.