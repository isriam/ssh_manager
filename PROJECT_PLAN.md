# SSH Manager - Technical Project Plan

## Project Overview

A clean, focused SSH session manager inspired by SecureCRT. Provides a simple GUI to manage SSH connections organized in nested folders, with visual forms instead of manual config editing.

**Core Philosophy:** Simple, focused, no bloat.

---

## Architecture

### Technology Stack
- **Language:** Python 3.8+
- **GUI Framework:** PySide6 (Qt for Python)
- **SSH Integration:** Native SSH client (no paramiko needed)
- **Storage:** Filesystem-based (`.conf` files)
- **Config Method:** SSH `Include` statements

### Dependencies
```
PySide6>=6.5.0  # GUI framework only
```

---

## Directory Structure

```
ssh_manager/
├── main.py                          # Application entry point
├── requirements.txt                 # PySide6 dependency
├── README.md                        # User documentation
├── PROJECT_PLAN.md                  # This file
├── .gitignore                       # Python gitignore
│
├── core/                            # Business logic (no GUI dependencies)
│   ├── __init__.py
│   ├── connection.py                # Connection data model
│   ├── config_manager.py            # SSH config CRUD operations
│   └── terminal_launcher.py         # Terminal auto-detection & launch
│
└── ui/                              # GUI components (PySide6)
    ├── __init__.py
    ├── main_window.py               # Main application window
    ├── connection_tree.py           # Tree view widget
    └── connection_dialog.py         # Add/Edit dialog

User's System After Installation:
~/ssh_manager/
└── groups/                          # SSH config storage
    ├── work/
    │   ├── server1.conf
    │   └── clients/
    │       └── acme/
    │           └── prod.conf
    └── personal/
        └── homeserver.conf

~/.ssh/config                        # User's existing SSH config
# ... existing user configs ...
# SSH Manager - Auto-generated
Include ~/ssh_manager/groups/**/*.conf
```

---

## Data Model

### Connection Object

```python
@dataclass
class Connection:
    """SSH connection configuration."""

    # Basic Settings
    name: str                        # Host alias (e.g., "production-api")
    hostname: str                    # IP or domain (e.g., "192.168.1.50")
    user: str                        # SSH username (e.g., "deploy")
    port: int = 22                   # SSH port
    identity_file: str = ""          # Path to private key
    folder: str = "personal"         # Nested folder path (e.g., "work/clients/acme")

    # Advanced Settings
    proxy_jump: str = ""             # Jump host (e.g., "bastion")
    local_forwards: List[Tuple[int, str, int]] = []   # [(local_port, remote_host, remote_port)]
    remote_forwards: List[Tuple[int, str, int]] = []  # [(remote_port, local_host, local_port)]

    # UI Metadata
    color_tag: str = ""              # "production", "staging", "development"
```

### SSH Config File Format

Each connection is stored as a separate `.conf` file:

```ssh
# File: ~/ssh_manager/groups/work/clients/acme/prod-db.conf
# SSH Manager Metadata: {"color": "production"}

Host prod-db
    HostName 10.0.1.50
    User dbadmin
    Port 22
    IdentityFile ~/.ssh/acme_key
    ProxyJump bastion.acme.com
    LocalForward 5432 localhost:5432
    LocalForward 8080 web.internal:80
```

---

## Component Specifications

### 1. Core Module: `connection.py`

**Purpose:** Data model for SSH connections

**Key Methods:**
- `to_ssh_config() -> str` - Generate SSH config file content
- `from_ssh_config(content: str) -> Connection` - Parse existing config
- `validate() -> List[str]` - Return validation errors

**Responsibilities:**
- SSH config syntax generation
- Parsing existing SSH config files
- Data validation (hostname, port range, file paths)

---

### 2. Core Module: `config_manager.py`

**Purpose:** Manage SSH config files and folder structure

**Key Methods:**
```python
def initialize() -> None:
    """First-run setup: create directories, update ~/.ssh/config"""

def get_folder_tree() -> Dict[str, Any]:
    """Scan filesystem and return folder hierarchy"""

def list_connections(folder: str = None) -> List[Connection]:
    """List all connections, optionally filtered by folder"""

def save_connection(conn: Connection) -> None:
    """Write connection to .conf file"""

def load_connection(folder: str, name: str) -> Connection:
    """Load connection from .conf file"""

def delete_connection(folder: str, name: str) -> None:
    """Remove .conf file"""

def move_connection(conn: Connection, new_folder: str) -> None:
    """Move .conf file to different folder"""

def create_folder(folder_path: str) -> None:
    """Create new nested folder"""

def delete_folder(folder_path: str, recursive: bool = False) -> None:
    """Delete folder (must be empty unless recursive=True)"""

def check_existing_ssh_config() -> Dict[str, Any]:
    """Check ~/.ssh/config for existing connections and Include statement"""
```

**Responsibilities:**
- Filesystem operations (create, read, update, delete)
- SSH config Include statement management
- Folder hierarchy scanning
- Backup existing ~/.ssh/config before modifications

---

### 3. Core Module: `terminal_launcher.py`

**Purpose:** Auto-detect terminal emulator and launch SSH sessions

**Key Methods:**
```python
def detect_terminal() -> Optional[str]:
    """Detect available terminal emulator on system"""

def launch_ssh(connection_name: str) -> bool:
    """Launch SSH connection in new terminal window"""

def get_ssh_command(connection_name: str) -> str:
    """Get SSH command for manual execution"""
```

**Terminal Detection Order (Linux):**
1. gnome-terminal
2. konsole
3. xfce4-terminal
4. alacritty
5. kitty
6. tilix
7. xterm (fallback)

**Responsibilities:**
- Detect available terminal emulator
- Launch SSH in new terminal window
- Handle terminal-specific command syntax

---

### 4. UI Module: `main_window.py`

**Purpose:** Main application window and UI orchestration

**Layout:**
```
┌─────────────────────────────────────────┐
│ SSH Manager                        [×]  │
├─────────────────────────────────────────┤
│ [+] [✏️] [🗑️] [📁]          [Connect]  │ <- Toolbar
├─────────────────────────────────────────┤
│ 🔍 Search connections...                │ <- Search bar
├─────────────────────────────────────────┤
│ 📁 work                               ▼ │
│   💻 production-api            [prod]   │
│   💻 staging-db                [stg]    │
│   📁 clients                          ▼ │
│     📁 acme                           ▼ │
│       💻 acme-prod             [prod]   │
│ 📁 personal                           ▼ │
│   💻 homeserver                         │
│                                         │
│ Status: 5 connections in 2 folders     │
└─────────────────────────────────────────┘
```

**Dimensions:**
- Width: 400px
- Height: 600px (resizable)
- Minimum: 350x400px

**Features:**
- Toolbar with action buttons
- Real-time search filter
- Status bar showing connection count
- Keyboard shortcuts (Ctrl+N, F2, Delete, etc.)

---

### 5. UI Module: `connection_tree.py`

**Purpose:** Tree view widget for folders and connections

**Features:**
- Nested folder display
- Color-coded connection badges (🔴 prod, 🟡 staging, 🟢 dev)
- Drag & drop support (move connections between folders)
- Right-click context menu
- Double-click to connect
- Expand/collapse state persistence

**Context Menu:**
- Connect
- Edit
- Duplicate
- Delete
- ---
- New Folder (if folder selected)
- Rename Folder
- Delete Folder

---

### 6. UI Module: `connection_dialog.py`

**Purpose:** Add/Edit connection modal dialog

**Layout:**
```
┌───────────────────────────────────────────┐
│ ✏️ Edit Connection: production-api        │
├───────────────────────────────────────────┤
│                                           │
│ Connection Name                           │
│ ┌───────────────────────────────────────┐ │
│ │ production-api                        │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Hostname                                  │
│ ┌───────────────────────────────────────┐ │
│ │ 192.168.1.50                          │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Username              Port                │
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ deploy           │ │ 22               │ │
│ └──────────────────┘ └──────────────────┘ │
│                                           │
│ SSH Key File                        [📁] │
│ ┌───────────────────────────────────────┐ │
│ │ ~/.ssh/id_ed25519                     │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Folder                                [▼]│
│ ┌───────────────────────────────────────┐ │
│ │ work/clients/acme                     │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Color Tag                             [▼]│
│ ┌───────────────────────────────────────┐ │
│ │ 🔴 Production                         │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ▼ Advanced Settings                       │
│ ┌─────────────────────────────────────┐   │
│ │ Jump Host (ProxyJump)               │   │
│ │ ┌─────────────────────────────────┐ │   │
│ │ │ bastion.company.com             │ │   │
│ │ └─────────────────────────────────┘ │   │
│ │                                     │   │
│ │ Local Port Forwards                 │   │
│ │ ┌─────────────────────────────────┐ │   │
│ │ │ 8080 → localhost:80         [×] │ │   │
│ │ │ 5432 → db.internal:5432     [×] │ │   │
│ │ └─────────────────────────────────┘ │   │
│ │ [+ Add Local Forward]               │   │
│ │                                     │   │
│ │ Remote Port Forwards                │   │
│ │ ┌─────────────────────────────────┐ │   │
│ │ │ (none)                          │ │   │
│ │ └─────────────────────────────────┘ │   │
│ │ [+ Add Remote Forward]              │   │
│ └─────────────────────────────────────┘   │
│                                           │
│        [Cancel]  [Test]  [Save]           │
└───────────────────────────────────────────┘
```

**Validation:**
- Connection name: Required, alphanumeric + dash/underscore
- Hostname: Required, valid IP or domain
- Port: Integer, 1-65535
- Identity file: Optional, must exist if specified
- Folder: Must exist or create new

---

## User Workflows

### First-Run Experience

1. User launches application
2. App checks if `~/ssh_manager/groups/` exists
3. If not:
   - Show welcome dialog
   - Create directory structure
   - Check `~/.ssh/config` for existing connections
   - If existing connections found:
     - Show notice: "We detected X existing connections in ~/.ssh/config"
     - Option: "Keep my existing config (recommended)" or "Learn more"
     - Explain: "SSH Manager will add connections separately. Your existing config stays untouched."
   - Add Include statement to end of `~/.ssh/config`:
     ```
     # SSH Manager - Auto-generated connections
     Include ~/ssh_manager/groups/**/*.conf
     ```
   - Create default folders: `work/`, `personal/`
4. Show empty main window

### Adding a Connection

1. User clicks **[+] New Connection**
2. Connection dialog opens
3. User fills in:
   - Name: "production-api"
   - Hostname: "api.company.com"
   - Username: "deploy"
   - SSH Key: Browse to `~/.ssh/company_key`
   - Folder: "work/production" (creates folder if needed)
   - Color: Red (Production)
   - ProxyJump: "bastion.company.com"
   - Local Forward: 8080 → localhost:80
4. User clicks **Save**
5. File created: `~/ssh_manager/groups/work/production/production-api.conf`
6. Tree view refreshes, shows new connection

### Connecting to Server

**Method 1: Double-Click**
1. User double-clicks "production-api" in tree
2. App detects terminal (e.g., gnome-terminal)
3. New terminal window opens
4. SSH session starts: `ssh production-api`

**Method 2: Toolbar Button**
1. User selects "production-api" in tree
2. User clicks **[Connect]** button
3. Terminal launches (same as above)

**Method 3: Context Menu**
1. User right-clicks "production-api"
2. Selects "Connect" from menu
3. Terminal launches

### Editing a Connection

1. User right-clicks "production-api"
2. Selects "Edit" (or presses F2)
3. Connection dialog opens with existing values
4. User modifies fields (e.g., adds port forward)
5. User clicks **Save**
6. `.conf` file updated
7. Tree view refreshes (changes apply immediately to SSH)

### Organizing with Folders

1. User right-clicks "work" folder
2. Selects "New Subfolder"
3. Enters name: "clients/acme"
4. Folder created: `~/ssh_manager/groups/work/clients/acme/`
5. User drags "acme-server" connection to new folder
6. File moved, SSH config automatically updates

---

## Implementation Phases

### **Phase 1: Core Backend (Day 1 - Morning)**

**Duration:** 3 hours
**Files:** `core/connection.py`, `core/config_manager.py`, `core/terminal_launcher.py`

**Tasks:**
- [ ] Create `Connection` dataclass
- [ ] Implement `to_ssh_config()` method
- [ ] Implement `from_ssh_config()` parser (basic)
- [ ] Create `ConfigManager` class
- [ ] Implement `initialize()` - create directories
- [ ] Implement `save_connection()` - write .conf files
- [ ] Implement `load_connection()` - read .conf files
- [ ] Implement `list_connections()` - scan directories
- [ ] Implement `get_folder_tree()` - build hierarchy
- [ ] Create `TerminalLauncher` class
- [ ] Implement `detect_terminal()` - Linux terminals
- [ ] Implement `launch_ssh()` - spawn terminal

**Testing:**
```python
# Manual test script
from core.config_manager import ConfigManager
from core.connection import Connection

mgr = ConfigManager()
mgr.initialize()

conn = Connection(
    name="test-server",
    hostname="192.168.1.100",
    user="admin",
    folder="work"
)

mgr.save_connection(conn)
print(mgr.list_connections())
```

---

### **Phase 2: Basic GUI (Day 1 - Afternoon)**

**Duration:** 4 hours
**Files:** `ui/main_window.py`, `ui/connection_tree.py`, `ui/connection_dialog.py`, `main.py`

**Tasks:**
- [ ] Create main.py entry point
- [ ] Create `MainWindow` class (QMainWindow)
- [ ] Add toolbar with buttons
- [ ] Add search bar (QLineEdit)
- [ ] Create `ConnectionTreeView` class (QTreeWidget)
- [ ] Implement folder/connection display
- [ ] Implement tree item icons (📁 💻)
- [ ] Create `ConnectionDialog` class (QDialog)
- [ ] Build form layout (basic fields only)
- [ ] Connect signals: Add button → open dialog
- [ ] Connect signals: Save button → create connection
- [ ] Connect signals: Double-click tree → launch SSH
- [ ] Test: Add connection, see it in tree, launch it

**Milestone:** Can add a basic connection and launch SSH

---

### **Phase 3: Advanced Features (Day 2 - Morning)**

**Duration:** 3 hours
**Files:** Extend existing UI modules

**Tasks:**
- [ ] Add port forwards UI to connection dialog
- [ ] Add "Add Forward" / "Remove Forward" buttons
- [ ] Implement port forward validation
- [ ] Add ProxyJump field to dialog
- [ ] Add color tag dropdown (Production/Staging/Dev)
- [ ] Implement color badges in tree view (🔴🟡🟢)
- [ ] Add folder creation dialog
- [ ] Implement Edit connection (right-click → Edit)
- [ ] Implement Delete connection (with confirmation)
- [ ] Add right-click context menu to tree

---

### **Phase 4: Polish & Refinement (Day 2 - Afternoon)**

**Duration:** 3 hours
**Files:** All modules (refinement)

**Tasks:**
- [ ] Implement search/filter functionality
- [ ] Add keyboard shortcuts (Ctrl+N, F2, Delete, Enter)
- [ ] Implement drag & drop (move connections between folders)
- [ ] Add connection count to status bar
- [ ] Implement first-run wizard/welcome dialog
- [ ] Add error handling (file permissions, invalid configs)
- [ ] Implement Test connection button (stub for now)
- [ ] Add confirmation dialogs (delete connection, delete folder)
- [ ] Polish UI spacing and alignment
- [ ] Add tooltips to toolbar buttons
- [ ] Test on Linux with different terminals
- [ ] Write README with screenshots

---

## File-by-File Implementation Order

1. `requirements.txt` - Dependencies
2. `.gitignore` - Python standard
3. `core/__init__.py` - Empty
4. `core/connection.py` - Data model
5. `core/config_manager.py` - File operations
6. `core/terminal_launcher.py` - SSH launching
7. `ui/__init__.py` - Empty
8. `ui/connection_dialog.py` - Add/Edit form (build first, easier to test)
9. `ui/connection_tree.py` - Tree view widget
10. `ui/main_window.py` - Main window (ties everything together)
11. `main.py` - Entry point
12. Test and refine

---

## Testing Strategy

### Manual Testing Checklist

**Core Functionality:**
- [ ] First-run initialization creates directories
- [ ] Include statement added to ~/.ssh/config
- [ ] Existing SSH config detected (if present)
- [ ] Add connection creates .conf file
- [ ] Edit connection updates .conf file
- [ ] Delete connection removes .conf file
- [ ] Folder creation works (nested paths)
- [ ] SSH launch works (terminal opens)

**UI Testing:**
- [ ] Tree view displays folders and connections
- [ ] Search filters connections in real-time
- [ ] Double-click launches SSH
- [ ] Right-click menu works
- [ ] Drag & drop moves connections
- [ ] Color tags display correctly
- [ ] Port forwards save/load correctly
- [ ] ProxyJump field works

**Edge Cases:**
- [ ] Empty folder display
- [ ] Connection with no SSH key specified
- [ ] Invalid hostname (validation)
- [ ] Port out of range (validation)
- [ ] Folder with special characters
- [ ] Connection name with spaces (should reject)
- [ ] Missing ~/.ssh directory

---

## Security Considerations

1. **File Permissions:**
   - `.conf` files: 0644 (readable by user)
   - Private keys: Not managed by app (user responsibility)
   - No credential storage (SSH handles auth)

2. **SSH Config Safety:**
   - Backup ~/.ssh/config before any modifications
   - Validate SSH config syntax before writing
   - Never delete user's original config

3. **Input Validation:**
   - Sanitize connection names (no special chars)
   - Validate hostnames (basic format check)
   - Check port ranges (1-65535)
   - Prevent path traversal in folder names

---

## Future Enhancements (Not in v1)

- Import existing SSH config connections
- Export connections to file
- SSH key generation interface
- Connection usage statistics
- Command snippets per connection
- Multi-connection actions (run command on multiple servers)
- Connection groups (beyond folders)
- Theme support (dark mode)
- Windows/macOS support (currently Linux-only)

---

## Success Criteria

**v1.0 is complete when:**
1. ✅ User can add/edit/delete connections via GUI
2. ✅ Connections organized in nested folders
3. ✅ Double-click launches SSH in terminal
4. ✅ Port forwards and ProxyJump supported
5. ✅ Search/filter works
6. ✅ First-run setup is smooth
7. ✅ Existing SSH config remains untouched
8. ✅ No crashes on basic operations
9. ✅ README has clear installation instructions
10. ✅ Code is clean and maintainable

---

**End of Project Plan**
