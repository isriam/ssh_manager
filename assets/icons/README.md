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
- **Terminal aesthetic**: Dark terminal window background
- **SSH identity**: ">_ssh" prompt text in terminal green
- **Security**: Golden key icon indicating SSH key management
- **Management**: "manager" subtitle showing it's a management tool

Current design elements:
- Dark terminal window with rounded corners
- Green terminal text: ">_ssh 🔑"
- White subtitle: "manager" 
- Terminal cursor for active/live feel
- Clean, professional design for developer tools

## Generation Tools

You can create `.icns` files from PNG sources using:
- `iconutil` (macOS built-in): `iconutil -c icns icon.iconset`
- Online converters
- Design tools like Sketch, Figma with icon export plugins

## Current Icons

SSH Manager now has custom branded icons featuring:
- Terminal window design with ">_ssh 🔑" and "manager" text
- Cross-platform support with .png, .ico, and .icns formats
- Multiple sizes from 16x16 to 512x512 for crisp display at any scale

Generated using `create_ssh_manager_icon.py` and converted with `convert_icons.sh`.