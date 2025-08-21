# SSH Manager - Complete Build Plan

## Project Overview
A cross-platform GUI application for managing SSH configurations through organized folders and visual forms, distributed via npm with desktop shortcuts.

**Repository**: https://github.com/isriam/ssh_manager  
**Target Users**: Network engineers and developers managing multiple SSH connections  
**Distribution**: npm global package with OS-specific desktop shortcuts  

## Architecture Overview

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

## Development Phases

### Phase 1: Core Backend (Node.js Foundation)
**Duration**: 1-2 weeks  
**Goal**: Basic SSH config file management without GUI

#### 1.1 Project Setup
- [x] Initialize npm project with package.json
- [x] Install core dependencies:
  - `electron` - Desktop app framework
  - `ssh-config` - SSH config file parsing
  - `commander` - CLI argument parsing (for shortcuts)
  - `fs-extra` - Enhanced file operations
- [x] Create basic project structure
- [x] Setup git repository integration

#### 1.2 File System Management
- [ ] Create `~/ssh_manager/` folder structure initialization
- [ ] Implement SSH config file reading/writing
- [ ] Create template system for common configurations
- [ ] Build SSH config validation and syntax checking
- [ ] Implement export functionality for configuration text files

#### 1.3 SSH Config Integration  
- [ ] Parse existing `~/.ssh/config` file
- [ ] Generate Include directive for main SSH config
- [ ] Create organized config files in subfolders
- [ ] Handle SSH key file detection and management

**Deliverable**: Working Node.js module that can manage SSH configs programmatically

### Phase 2: Electron Application Shell
**Duration**: 1 week  
**Goal**: Basic Electron app that opens a window

#### 2.1 Electron Setup
- [ ] Create main.js (Electron main process)
- [ ] Setup window creation and management
- [ ] Configure IPC (Inter-Process Communication) between main/renderer
- [ ] Implement proper app lifecycle management

#### 2.2 Basic Window Interface
- [ ] Create index.html with basic layout
- [ ] Setup CSS framework (simple/minimal to start)
- [ ] Create placeholder sections for main features
- [ ] Test cross-platform window behavior

**Deliverable**: Electron app that opens a window with basic HTML interface

### Phase 3: GUI Frontend Development
**Duration**: 2-3 weeks  
**Goal**: Complete visual interface for SSH management

#### 3.1 Core UI Components
- [ ] **Server List View**: Collapsible groups (work/personal/projects)
- [ ] **Add/Edit Server Form**: 
  - Host, Username, Port fields
  - SSH key dropdown selection
  - Port forwarding configuration
  - Advanced options (ProxyJump, etc.)
- [ ] **Connection Manager**: One-click SSH launch
- [ ] **Template System**: Pre-built configuration templates

#### 3.2 Advanced GUI Features
- [ ] **Visual SSH Key Management**: Generate/import/assign keys
- [ ] **Configuration Validation**: Real-time form validation
- [ ] **Export**: Export configurations to text files for backup purposes
- [ ] **Connection Testing**: Test SSH connectivity with status feedback
- [ ] **Search/Filter**: Find servers quickly in large lists

#### 3.3 User Experience Polish
- [ ] **Responsive Layout**: Handle window resizing gracefully  
- [ ] **Keyboard Shortcuts**: Common actions (Ctrl+N for new, etc.)
- [ ] **Dark/Light Theme**: Theme switching capability
- [ ] **Error Handling**: User-friendly error messages
- [ ] **Loading States**: Progress indicators for long operations

**Deliverable**: Fully functional GUI for SSH config management

### Phase 4: System Integration & Packaging
**Duration**: 1 week  
**Goal**: npm distribution with desktop shortcuts

#### 4.1 NPM Package Configuration
- [ ] Configure package.json for global installation
- [ ] Setup binary command (`ssh-manager`)
- [ ] Create pre/post install scripts if needed
- [ ] Test installation on clean systems

#### 4.2 Desktop Shortcut Creation
- [ ] **macOS**: Create .app bundle or alias
- [ ] **Windows**: Generate .lnk shortcut files  
- [ ] **Linux**: Create .desktop files
- [ ] Implement `ssh-manager create-shortcut` command
- [ ] Bundle custom icons for each platform

#### 4.3 Cross-Platform Testing
- [ ] Test on macOS (your primary system)
- [ ] Test on Windows (VM or separate machine)
- [ ] Test on Linux (Ubuntu/CentOS/Arch)
- [ ] Verify npm install/uninstall process
- [ ] Test desktop shortcut functionality

**Deliverable**: Published npm package with working desktop shortcuts

## Technical Stack Details

### Backend Dependencies
```json
{
  "electron": "^28.0.0",
  "ssh-config": "^4.1.6", 
  "fs-extra": "^11.1.1",
  "commander": "^11.1.0",
  "node-ssh": "^13.1.0"
}
```

### Frontend Approach
- **Start Simple**: Vanilla HTML/CSS/JavaScript
- **Upgrade Path**: Can migrate to React/Vue later without changing backend
- **Styling**: Simple CSS initially, can add framework later
- **Icons**: Font Awesome or similar icon library

### File Structure
```
ssh_manager/
├── package.json
├── README.md
├── src/
│   ├── main.js              # Electron main process
│   ├── backend/
│   │   ├── ssh-manager.js   # Core SSH management logic
│   │   ├── file-utils.js    # File system operations
│   │   ├── shortcuts.js     # Desktop shortcut creation
│   │   └── templates.js     # Configuration templates
│   └── frontend/
│       ├── index.html       # Main GUI interface
│       ├── styles.css       # Application styling  
│       ├── app.js           # Frontend JavaScript
│       └── components/      # Future: modular UI components
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
│   │   ├── production.conf
│   │   ├── staging.conf
│   │   └── development.conf
│   ├── personal/
│   │   ├── home-lab.conf
│   │   └── vps.conf
│   └── projects/
│       └── client-name.conf
├── keys/
│   ├── work/
│   ├── personal/
│   └── projects/
└── templates/
    ├── basic-server.conf
    ├── jump-host.conf
    └── port-forward.conf
```

## Success Criteria

### Phase 1 Success:
- [ ] Can programmatically create/edit SSH configs
- [ ] Folder structure automatically created
- [ ] SSH Include directive properly configured

### Phase 2 Success:  
- [ ] Electron app opens window on all platforms
- [ ] Basic HTML interface loads correctly
- [ ] npm global install works

### Phase 3 Success:
- [ ] Can add/edit/delete SSH configurations via GUI
- [ ] Visual organization into groups works
- [ ] One-click SSH connections launch terminal

### Phase 4 Success:
- [ ] `npm install -g ssh-manager` works on all platforms
- [ ] Desktop shortcuts successfully created and functional
- [ ] App feels like native desktop application

## Risk Mitigation

### Technical Risks:
- **Electron learning curve**: Start with simple examples, build incrementally
- **Cross-platform SSH differences**: Test early and often on different OS
- **File permission issues**: Handle gracefully with proper error messages

### Scope Risks:
- **Feature creep**: Stick to core functionality first, expand later
- **UI complexity**: Start with simple forms, enhance iteratively  
- **Platform compatibility**: Focus on common use cases initially

## Future Enhancement Ideas
- Web-based interface option (same backend)
- SSH session recording/logging
- Team configuration sharing
- Integration with cloud providers (AWS, Azure)
- SSH tunnel management dashboard
- Configuration version control with git
- Plugin system for custom templates

---

**Created**: 2025-01-15  
**Last Updated**: 2025-01-15  
**Status**: Planning Phase Complete