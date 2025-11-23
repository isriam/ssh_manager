# SSH Manager - Design Documentation

## Project Overview

SSH Manager is a streamlined cross-platform desktop application built with Python and Tkinter that simplifies SSH configuration management through organized folders and visual forms. It provides both CLI and GUI interfaces with minimal dependencies.

## Core Philosophy

- **Simplicity**: Minimal dependencies (2 Python packages + standard library)
- **Security**: Defensive security tool with proper backup/restore
- **Usability**: Both CLI and GUI interfaces for maximum flexibility
- **Organization**: Group connections by work/personal/projects
- **Cross-Platform**: Python-based, works on macOS, Windows, and Linux

## Project Structure

```
ssh_manager/
├── src/
│   └── ssh_manager/
│       ├── main.py              # CLI/GUI entry point
│       ├── backend/             # Core SSH management logic
│       │   ├── ssh_manager.py   # Main SSH management class
│       │   ├── file_utils.py    # File system utilities  
│       │   └── templates.py     # SSH config templates
│       └── gui/                 # GUI interface (Tkinter)
│           ├── main.py          # Main GUI application
│           ├── connection_tree.py # Connection tree view
│           └── dialogs/         # Dialog windows
│               ├── add_connection.py
│               └── edit_connection.py
├── assets/icons/            # App icons (all platforms)
├── config/                  # SSH configuration files organized by groups
├── requirements.txt         # Python dependencies
├── setup.py                 # Python package setup
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

### Python/Tkinter Structure
```
┌─────────────────────────────────────────┐
│            ./run.sh or                  │
│         python3 start.py               │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│         Python Main Process            │
│         (CLI/GUI Entry Point)          │
│    - Command line argument parsing     │
│    - GUI/CLI mode selection           │
│    - Virtual environment handling      │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴────────┐
      ▼                ▼
┌──────────┐    ┌──────────────┐
│ CLI Mode │    │   GUI Mode   │
│          │    │   (Tkinter)  │
│ - Direct │    │ - Main window│
│   SSH    │    │ - Tree view  │
│   mgmt   │    │ - Dialogs    │
│ - Terminal│    │ - Menus     │
│   output │    │              │
└──────────┘    └──────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Backend Services              │
│         (Pure Python Classes)          │
│    - SSH configuration management      │
│    - File system operations           │
│    - Template processing              │
│    - Connection testing (paramiko)     │
└─────────────────────────────────────────┘
```

### Key Classes & Files

#### Backend Components

**`ssh_manager.py`** (Main SSH Management Class):
- Connection CRUD operations
- SSH config file management
- Template processing and variable substitution
- Backup/restore functionality
- Connection testing via paramiko
- Integration state management

**`file_utils.py`** (File System Operations):
- Directory structure creation (~/.ssh_manager/)
- SSH config file parsing
- Backup creation and restoration
- File permission management

**`templates.py`** (Template System):
- Pre-built SSH configuration templates
- Variable substitution for dynamic configs
- Template categories: Basic Server, AWS EC2, Jump Host, Developer

#### Frontend Components

**`main.py`** (GUI Main Window):
- Window management and layout
- Menu creation and event handling
- Connection tree view integration
- Dialog window management

**`connection_tree.py`** (Connection Tree View):
- Tree widget for displaying connections by groups
- Connection selection and display
- Context menu handling
- Tree refresh and update logic

**`dialogs/`** (Dialog Windows):
- `add_connection.py`: Add new connection dialog
- `edit_connection.py`: Edit existing connection dialog

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

**Runtime Dependencies** (minimal Python approach):
```python
# requirements.txt
paramiko>=3.0.0    # SSH connection and testing

# Built-in Python modules used:
# - tkinter (GUI framework)
# - pathlib, os (file operations)
# - subprocess (terminal launching)
# - argparse (CLI interface)
# - zipfile (backup functionality)
```

**Total packages**: 1 external + Python standard library
**Installation time**: ~10 seconds  
**No build step required**: Pure Python execution

## Development Workflow

### Quick Start
```bash
git clone https://github.com/isriam/ssh_manager.git
cd ssh_manager

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install GUI support (Linux)
sudo apt install python3-tk

# Test the application
./run.sh init
./run.sh list
./run.sh gui
```

### Development Mode
```bash
# Run with verbose output for debugging
python3 -u src/ssh_manager/main.py gui

# Test CLI functionality
python3 src/ssh_manager/main.py --help
python3 src/ssh_manager/main.py init
python3 src/ssh_manager/main.py add -n "test" --host "example.com" -u "user"
```

### Available Launch Methods
- `./run.sh`: Launch GUI (recommended)
- `./run.sh --help`: Show CLI commands
- `python3 start.py`: Alternative Python launcher
- Direct execution via `python3 src/ssh_manager/main.py`

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