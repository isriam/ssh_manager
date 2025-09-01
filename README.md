# SSH Manager

A streamlined cross-platform GUI application for managing SSH configurations through organized folders and visual forms. Built with Python and Tkinter for maximum compatibility and minimal dependencies.

<div align="center">
  <img src="./assets/icons/ssh_manager_128.png" alt="SSH Manager Icon" width="64" height="64">
</div>

## Overview

SSH Manager simplifies the management of multiple SSH connections by providing:

- 🖥️ **Visual Configuration**: Easy-to-use forms instead of editing config files
- 📁 **Organized Storage**: Group connections by work/personal/projects  
- 🚀 **One-Click Connections**: Launch SSH sessions directly from the GUI/CLI
- 📋 **Template System**: Pre-built configurations for common setups
- 🌍 **Cross-Platform**: Works on macOS, Windows, and Linux
- 🔐 **SSH Key Management**: Generate and manage SSH keys with proper permissions
- 🔧 **Developer Features**: Port forwarding, multiplexing, X11 forwarding
- 🔄 **Backup & Restore**: Revert to original SSH config when needed
- ⚡ **Minimal Setup**: Python-based with minimal dependencies
- 🖥️ **CLI + GUI**: Full command-line interface plus optional GUI

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Linux: `python3-tkinter` for GUI (install via package manager)

### Quick Setup
```bash
git clone https://github.com/isriam/ssh_manager.git
cd ssh_manager

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install paramiko sshtunnel

# Initialize SSH Manager
python3 src/ssh_manager/main.py init
```

### Launch Options
```bash
# CLI Interface (always available)
python3 src/ssh_manager/main.py --help

# GUI Interface (requires tkinter)
python3 src/ssh_manager/main.py gui

# Default (launches GUI if available, otherwise shows CLI help)
python3 src/ssh_manager/main.py
```

## Target Users

- Network engineers managing multiple servers
- Developers needing X11 forwarding and port tunneling
- System administrators with complex SSH setups
- Users requiring SOCKS proxy and connection multiplexing
- Anyone who frequently connects to remote systems

## Interface Overview

### 🖥️ Main Application Window
- **Connection Sidebar**: Organized tree view with collapsible groups (work/personal/projects)
- **Connection Details**: Right panel showing selected connection information
- **Quick Actions**: Connect, Edit, Test, and Delete buttons for each connection
- **Search & Filter**: Find connections quickly across all groups

### ➕ Add Connection Dialog  
- **Simple Form**: Name, hostname, username, port, and SSH key selection
- **Template Selection**: Choose from Basic Server, AWS EC2, Jump Host, Developer, etc.
- **Advanced Options**: Connection timeouts, compression, host key checking
- **Developer Features**: Port forwarding, X11 forwarding, agent forwarding

### ✏️ Edit Connection Interface
- **Comprehensive Settings**: All SSH configuration options in organized sections
- **Port Forward Management**: Add/remove local and remote port forwards
- **Connection Testing**: Built-in SSH connectivity testing
- **Template Migration**: Change connection templates while preserving settings

### 📊 Connection Management
- **Drag & Drop**: Move connections between groups easily
- **Bulk Operations**: Export configurations, backup settings
- **Real-time Validation**: SSH config syntax checking
- **Integration**: Seamless integration with system SSH client

## Features

### Core Features
- **GUI Interface**: Clean Electron-based desktop application
- **Visual Forms**: Add/edit SSH connections without touching config files
- **Connection Management**: One-click SSH launching with advanced settings
- **Developer Features**: Connection multiplexing, X11/agent forwarding, port forwarding
- **SOCKS Proxy**: Dynamic port forwarding for secure tunneling
- **Templates**: Pre-built configurations (Basic Server, Developer Workstation, AWS EC2, Jump Host)
- **SSH Key Management**: Generate, import, and assign SSH keys
- **Export Configurations**: Export SSH configurations as text files for backup purposes
- **Connection Testing**: Verify SSH connectivity

### Backup & Restore System
- **Automatic Backup**: Creates backup of original SSH config during first setup
- **Revert to Original**: Menu option to restore your original SSH configuration
- **Enable/Disable Integration**: Toggle SSH Manager integration on/off
- **State Detection**: App automatically detects and adapts to current integration state
- **Read-Only Mode**: Shows configurations as read-only when integration is disabled

### Menu Options
- **File → Revert to Original SSH Config**: Restore your original SSH configuration
- **File → Enable SSH Manager Integration**: Re-enable SSH Manager after reverting

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
└── backups/            # Configuration backups

~/.ssh/
├── config              # Your main SSH config (modified to include SSH Manager)
└── config.ssh-manager-backup  # Backup of your original SSH config
```

Your main SSH config (`~/.ssh/config`) will include the organized SSH Manager files automatically via an Include directive.

## Architecture

```
┌─────────────────────────────────────────┐
│              npm start                  │
│         (Auto-install & Launch)         │
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

## Development

### Project Structure
```
ssh_manager/
├── src/
│   ├── main.js              # Electron main process
│   ├── backend/             # Core SSH management logic
│   │   ├── ssh-manager.js   # Main SSH management class
│   │   ├── file-utils.js    # File system utilities
│   │   └── templates.js     # Template management
│   └── frontend/            # GUI interface
│       ├── index.html       # Main application window
│       ├── app.js           # Frontend application logic
│       ├── preload.js       # Electron preload script
│       └── styles.css       # Application styles
├── assets/
│   └── icons/               # Application icons (all platforms)
├── templates/               # SSH config templates
├── bin/
│   └── ssh-manager.js       # CLI entry point
└── scripts/                 # Installation scripts
    ├── postinstall.js       # Post-installation setup
    └── preuninstall.js      # Pre-uninstall cleanup
```

### Development Setup
```bash
git clone https://github.com/isriam/ssh_manager.git
cd ssh_manager

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# For GUI support (Linux)
sudo apt install python3-tk

# Initialize and test
./run.sh init
./run.sh list
```

### Available Launch Methods
```bash
./run.sh                    # Launch GUI (recommended)
./run.sh --help            # Show CLI help
python3 start.py            # Alternative launcher
python3 src/ssh_manager/main.py gui  # Direct execution
```

## CLI Usage Examples

### Basic Commands
```bash
# Initialize SSH Manager
python3 src/ssh_manager/main.py init

# Add a connection
python3 src/ssh_manager/main.py add -n "web-server" --host "192.168.1.100" -u "admin" -g "work"

# List all connections
python3 src/ssh_manager/main.py list

# List connections in specific group
python3 src/ssh_manager/main.py list -g work

# Connect to a server
python3 src/ssh_manager/main.py connect web-server -g work

# Test connection
python3 src/ssh_manager/main.py test web-server -g work

# View all groups
python3 src/ssh_manager/main.py groups

# Create backup
python3 src/ssh_manager/main.py backup -o my_ssh_backup.zip
```

### Advanced Connection Options
```bash
# Add connection with custom template and port
python3 src/ssh_manager/main.py add \
  -n "database-server" \
  --host "db.example.com" \
  -u "dbadmin" \
  -p 2222 \
  -g "databases" \
  -t "basic-server" \
  -k "~/.ssh/db_key"
```

## Technical Details

### Minimal Dependencies
SSH Manager uses only essential Python packages:
- `paramiko` - SSH connection and testing
- `sshtunnel` - SSH tunneling support  
- `tkinter` - GUI framework (built into Python)

**Total dependencies**: 2 packages + Python standard library  
**No build step required** - pure Python application

## Contributing

This project is designed for network engineers and developers who need better SSH connection management. Contributions welcome!

### Development Workflow
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Make changes: `cd ssh_manager && npm start`
4. Test your changes
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Security

SSH Manager is a defensive security tool focused on:
- Secure storage of SSH configurations
- No logging of sensitive data
- Proper file permission handling
- Input validation and sanitization
- Safe backup and restore operations

---

**Version**: 0.1.2  
**Repository**: https://github.com/isriam/ssh_manager  
**Dependencies**: Minimal Electron setup (~124 packages)