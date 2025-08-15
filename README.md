# SSH Manager

A cross-platform GUI application for managing SSH configurations through organized folders and visual forms, distributed via npm with desktop shortcuts.

## Overview

SSH Manager simplifies the management of multiple SSH connections by providing:
- **Visual Configuration**: Easy-to-use forms instead of editing config files
- **Organized Storage**: Group connections by work/personal/projects
- **One-Click Connections**: Desktop shortcuts for quick SSH access
- **Template System**: Pre-built configurations for common setups
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Target Users

- Network engineers managing multiple servers
- Developers with various deployment environments
- System administrators with complex SSH setups
- Anyone who frequently connects to remote systems

## Installation

```bash
npm install -g ssh-manager
ssh-manager create-shortcut  # Creates desktop shortcut
```

## Quick Start

1. Install the package globally via npm
2. Run `ssh-manager create-shortcut` to add desktop icon
3. Click the desktop shortcut to open the GUI
4. Add your first SSH connection using the visual form
5. Organize connections into folders (work/personal/projects)

## Features

### Current (Phase 1)
- ✅ Project structure and git setup
- 🔄 Core SSH config file management
- ⏳ SSH config parsing and validation
- ⏳ Template system

### Planned (Phase 2-4)
- **GUI Interface**: Electron-based desktop application
- **Visual Forms**: Add/edit SSH connections without touching config files
- **Connection Management**: One-click SSH launching
- **SSH Key Management**: Generate, import, and assign SSH keys
- **Templates**: Pre-built configurations for common scenarios
- **Import/Export**: Backup and restore configurations
- **Connection Testing**: Verify SSH connectivity

## Architecture

```
┌─────────────────────────────────────────┐
│             Desktop Shortcut            │
│          (OS-specific icon)             │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│         Electron Main Process          │
│        (Node.js Backend Logic)          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│        Electron Renderer Process       │
│         (HTML/CSS/JS Frontend)          │
└─────────────────────────────────────────┘
```

## File Organization

SSH Manager creates an organized structure in your home directory:

```
~/ssh_manager/
├── config/
│   ├── work/           # Work-related SSH connections
│   ├── personal/       # Personal servers
│   └── projects/       # Project-specific connections
├── keys/               # SSH key files organized by category
├── templates/          # Configuration templates
└── backups/           # Automatic configuration backups
```

Your main SSH config (`~/.ssh/config`) will include these organized files automatically.

## Development

### Project Structure
```
ssh_manager/
├── src/
│   ├── main.js              # Electron main process
│   ├── backend/             # Core SSH management logic
│   └── frontend/            # GUI interface
├── assets/
│   ├── icons/               # Application icons
│   └── templates/           # SSH config templates
└── bin/
    └── ssh-manager.js       # CLI entry point
```

### Development Setup
```bash
git clone https://github.com/isriam/ssh_manager.git
cd ssh_manager
npm install
npm run dev
```

### Development Phases

1. **Phase 1**: Core Backend (Node.js Foundation) - *Current*
2. **Phase 2**: Electron Application Shell
3. **Phase 3**: GUI Frontend Development
4. **Phase 4**: System Integration & Packaging

## Contributing

This project is designed for network engineers and developers who need better SSH connection management. Contributions welcome!

## License

MIT License - see LICENSE file for details.

## Security

SSH Manager is a defensive security tool focused on:
- Secure storage of SSH configurations
- No logging of sensitive data
- Proper file permission handling
- Input validation and sanitization

---

**Status**: Phase 1 Development  
**Repository**: https://github.com/isriam/ssh_manager  
**npm Package**: `ssh-manager` (coming soon)
