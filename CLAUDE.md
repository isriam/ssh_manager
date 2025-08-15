# SSH Manager - Project Instructions

## Project Overview
This is a cross-platform GUI application for managing SSH configurations through organized folders and visual forms. It's built with Electron and distributed via npm with desktop shortcuts.

**Repository**: https://github.com/isriam/ssh_manager
**Target Users**: Network engineers and developers managing multiple SSH connections
**Distribution**: npm global package with OS-specific desktop shortcuts

## Development Phases

### Current Phase: Phase 1 - Core Backend (Node.js Foundation)
Focus on basic SSH config file management without GUI.

## Key Project Requirements

### Technical Stack
- **Backend**: Node.js with Electron
- **Frontend**: Start with vanilla HTML/CSS/JavaScript (upgrade path to React/Vue later)
- **Dependencies**: electron, ssh-config, fs-extra, commander, node-ssh
- **Distribution**: npm global package

### Core Functionality
1. Manage SSH configurations in organized folders (`~/ssh_manager/`)
2. Visual forms for adding/editing SSH connections
3. One-click SSH connections via desktop shortcuts
4. Template system for common configurations
5. SSH key management and assignment

### File Structure
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

### User Data Structure
```
~/ssh_manager/
├── config/
│   ├── work/
│   ├── personal/
│   └── projects/
├── keys/
├── templates/
└── backups/
```

## Development Guidelines

### Code Style
- Follow simplicity and readability principles
- Use early returns to avoid nested conditions
- Prefer functional, immutable approaches
- Start simple and build iteratively

### Testing Strategy
- Test frequently with realistic inputs
- Create testing environments for difficult-to-validate components
- Verify cross-platform compatibility

### Security Considerations
- Never log or expose SSH keys or passwords
- Handle file permissions carefully
- Validate all user inputs
- Secure storage of sensitive configuration data

## Current Priorities
1. ✓ Project setup and git initialization
2. ✓ Basic directory structure
3. ✓ Package.json configuration
4. 🔄 Core SSH config file management
5. ⏳ SSH config parsing and validation
6. ⏳ Template system implementation

## Important Notes
- This is a defensive security tool for managing SSH configurations
- Focus on network engineer workflows and simplicity
- Verify configurations before making changes
- Build incrementally - Phase 1 before Phase 2, etc.
- Test on macOS primarily (user's main platform)

## Success Criteria for Phase 1
- [ ] Can programmatically create/edit SSH configs
- [ ] Folder structure automatically created
- [ ] SSH Include directive properly configured
- [ ] Basic validation and error handling

---
*Last Updated*: 2025-08-15
*Current Status*: Phase 1 - Initial Setup Complete