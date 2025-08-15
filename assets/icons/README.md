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

The SSH Manager icon should represent:
- Network/connectivity (SSH tunnels, connections)
- Security (keys, locks, shields)
- Management/organization (folders, lists)

Suggested design elements:
- Terminal/command line aesthetics
- Network nodes or connection lines
- Key or lock symbol
- Clean, modern design suitable for developer tools

## Generation Tools

You can create `.icns` files from PNG sources using:
- `iconutil` (macOS built-in): `iconutil -c icns icon.iconset`
- Online converters
- Design tools like Sketch, Figma with icon export plugins

## Temporary Placeholder

Currently using placeholder icons. Replace these with proper branded icons before release.