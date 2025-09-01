# SSH Manager - Design Documentation

## Project Overview

SSH Manager is a streamlined cross-platform GUI desktop application built with Electron that simplifies SSH configuration management through organized folders and visual forms. It follows a minimal dependency approach with simple git clone and launch workflow.

## Core Philosophy

- **Simplicity**: Minimal dependencies (~124 packages vs typical 600+)
- **Security**: Defensive security tool with proper backup/restore
- **Usability**: Visual forms instead of manual config file editing
- **Organization**: Group connections by work/personal/projects
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Project Structure

```
ssh_manager/
├── src/
│   ├── main.js              # Electron main process & IPC handlers  
│   ├── backend/             # Core SSH management logic
│   │   ├── ssh-manager.js   # Main SSH management class
│   │   ├── file-utils.js    # File system utilities  
│   │   └── templates.js     # SSH config templates
│   └── frontend/            # GUI interface
│       ├── index.html       # Main application window
│       ├── app.js           # Frontend application logic
│       ├── preload.js       # Electron preload script
│       └── styles.css       # Application styles
├── assets/icons/            # App icons (all platforms)
├── config/                  # SSH configuration files organized by groups
├── bin/ssh-manager.js       # CLI entry point
└── templates/               # SSH config templates
```

## Target Users

- Network engineers managing multiple servers
- Developers needing X11 forwarding and port tunneling
- System administrators with complex SSH setups
- Users requiring SOCKS proxy and connection multiplexing
- Anyone who frequently connects to remote systems

## Core Features

### GUI Interface
- **Visual Configuration**: Easy-to-use forms instead of editing config files
- **Organized Storage**: Group connections by work/personal/projects  
- **One-Click Connections**: Launch SSH sessions directly from the GUI
- **Search & Filter**: Find connections quickly across all groups

### SSH Management
- **Template System**: Pre-built configurations (Basic Server, AWS EC2, Jump Host, Developer)
- **SSH Key Management**: Generate and manage SSH keys with proper permissions
- **Connection Testing**: Built-in SSH connectivity testing
- **Advanced Features**: Port forwarding, multiplexing, X11 forwarding, SOCKS proxy

### Backup & Restore System
- **Automatic Backup**: Creates backup of original SSH config during first setup
- **Revert to Original**: Menu option to restore original SSH configuration
- **Enable/Disable Integration**: Toggle SSH Manager integration on/off
- **State Detection**: App automatically detects and adapts to current integration state

## Architecture

### Electron Structure
```
┌─────────────────────────────────────────┐
│              npm start                  │
│         (Auto-install & Launch)         │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│         Electron Main Process          │
│        (Node.js Backend Logic)          │
│    - SSH configuration management      │
│    - File system operations            │
│    - Template processing               │
│    - IPC handlers                      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│        Electron Renderer Process       │
│         (HTML/CSS/JS Frontend)          │
│    - Connection sidebar tree view      │
│    - Add/Edit connection forms         │
│    - Real-time validation              │
└─────────────────────────────────────────┘
```

### Key Classes & Files

#### Backend Components

**`ssh-manager.js`** (Main SSH Management Class):
- Connection CRUD operations
- SSH config file management
- Template processing and variable substitution
- Backup/restore functionality
- Connection testing via node-ssh
- Integration state management

**`file-utils.js`** (File System Operations):
- Directory structure creation (~/.ssh_manager/)
- SSH config file parsing with ssh-config library
- Backup creation and restoration
- File permission management

**`templates.js`** (Template System):
- Pre-built SSH configuration templates
- Variable substitution for dynamic configs
- Template categories: Basic Server, AWS EC2, Jump Host, Developer

#### Frontend Components

**`main.js`** (Electron Main Process):
- Window management and state persistence
- IPC handler registration for all SSH operations
- Modal window creation for add/edit operations
- Application lifecycle management

**`app.js`** (Frontend Logic):
- DOM manipulation and event handling
- IPC communication with backend
- Connection tree view management
- Form validation and submission

**`preload.js`** (Security Bridge):
- Secure IPC API exposure to renderer
- Context isolation boundary
- Backend method proxying

## File Organization

SSH Manager creates organized structure:

```
~/ssh_manager/
├── config/
│   ├── work/           # Work-related SSH connections
│   ├── personal/       # Personal servers
│   └── projects/       # Project-specific connections
├── keys/               # SSH key files organized by category
├── templates/          # Configuration templates
└── backups/            # Configuration backups

~/.ssh/
├── config              # Main SSH config (includes SSH Manager)
└── config.ssh-manager-backup  # Backup of original SSH config
```

## Dependencies

**Runtime Dependencies** (minimal approach):
```json
{
  "electron": "^28.0.0",      // Desktop application framework
  "ssh-config": "^4.1.6",     // SSH config parsing/generation
  "fs-extra": "^11.1.1",      // Enhanced file operations
  "node-ssh": "^13.1.0",      // SSH connection testing
  "commander": "^11.1.0",     // CLI interface
  "archiver": "^6.0.2"        // Backup functionality
}
```

**Total packages**: ~124 (vs typical 600+ in Electron apps)
**Installation time**: ~18 seconds
**No build step required**: Direct execution

## Development Workflow

### Quick Start
```bash
git clone https://github.com/isriam/ssh_manager.git
cd ssh_manager
npm start                    # Auto-installs deps and launches
```

### Development Mode
```bash
npm run dev                  # Opens with DevTools
```

### Available Scripts
- `npm start`: Auto-install dependencies and launch
- `npm run dev`: Development mode with DevTools
- `npm run create-shortcut`: Create desktop shortcut

## Security Considerations

SSH Manager is designed as a defensive security tool:

- **No Credential Harvesting**: Does not collect or transmit credentials
- **Local File Management**: All operations are local filesystem
- **Proper Permissions**: Maintains SSH key file permissions
- **Input Validation**: Sanitizes all configuration inputs
- **Backup Safety**: Creates backups before any modifications
- **Read-Only Mode**: Shows configs as read-only when integration disabled

## Integration State Management

The app handles three states:
1. **Integrated**: SSH Manager controls SSH config via Include directive
2. **Reverted**: Original SSH config restored, SSH Manager disabled
3. **Re-enabled**: SSH Manager integration restored from reverted state

Menu options adapt based on current state:
- File → Revert to Original SSH Config (when integrated)
- File → Enable SSH Manager Integration (when reverted)

## UI Components

### Main Window Layout
- **Header**: App title and menu bar
- **Sidebar**: Collapsible connection tree by groups
- **Detail Panel**: Selected connection information
- **Action Buttons**: Connect, Edit, Test, Delete

### Modal Windows
- **Add Connection**: Template-based form with validation
- **Edit Connection**: Comprehensive settings with advanced options
- **Standalone Windows**: Separate windows for complex operations

## Template System

Pre-built templates with variable substitution:

**Available Templates**:
- Basic Server: Simple SSH connection
- AWS EC2: EC2 instance with key-based auth
- Jump Host: Bastion host configuration
- Developer: X11 forwarding, port tunneling, multiplexing

**Template Variables**:
- Connection details: name, host, user, port
- Authentication: key_file paths
- Forwarding: local_port, remote_port, socks_port
- Advanced: control_master, control_persist, timeouts

## Error Handling

- **Graceful Degradation**: App continues if non-critical operations fail
- **User Feedback**: Clear error messages for common issues
- **Backup Recovery**: Automatic revert on configuration errors
- **Validation**: Real-time SSH config syntax checking

## Performance Optimizations

- **Lazy Loading**: Templates loaded on demand
- **Efficient IPC**: Minimal data transfer between processes
- **Window State**: Persistent window size/position
- **Connection Caching**: SSH config parsed once, cached for reuse

This design emphasizes simplicity, security, and user experience while maintaining the flexibility needed for complex SSH management scenarios.