# SSH Manager

A clean, focused SSH session manager inspired by SecureCRT. Manage your SSH connections with a simple GUI instead of manually editing config files.

![SSH Manager](https://img.shields.io/badge/Python-3.8+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## Features

- 🖥️ **Simple GUI** - Clean PySide6 interface for managing SSH connections
- 📁 **Nested Folders** - Organize connections in hierarchical folders (work/clients/acme/production)
- 🚀 **One-Click Connect** - Double-click to launch SSH in your terminal
- 🔧 **SSH Features** - Port forwards, jump hosts, custom keys
- 🎨 **Color Coding** - Tag connections as Production (🔴), Staging (🟡), Development (🟢)
- 🔍 **Quick Search** - Real-time filtering across all connections
- 💾 **Native SSH Config** - Uses standard SSH config files with Include statements
- 🔒 **Non-Invasive** - Leaves your existing ~/.ssh/config untouched

## Installation

### Prerequisites

- **Python 3.8+** (check: `python3 --version`)
- **Linux** (currently supports Linux; macOS/Windows support planned)
- **SSH client** (already installed on most Linux systems)

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ssh_manager.git
cd ssh_manager

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies (just PySide6)
pip install -r requirements.txt

# Run the application
python3 main.py
```

### First Run

On first launch, SSH Manager will:
1. Create `~/ssh_manager/groups/` directory for storing connections
2. Create default folders: `work/` and `personal/`
3. Check your existing `~/.ssh/config` and notify you if connections are found
4. Add this line to the end of your `~/.ssh/config`:
   ```
   # SSH Manager - Auto-generated connections
   Include ~/ssh_manager/groups/**/*.conf
   ```

**Your existing SSH config remains completely untouched.** SSH Manager connections live separately in `~/ssh_manager/groups/`.

## Usage

### Adding a Connection

1. Click **[+] New Connection** in the toolbar
2. Fill in the form:
   - **Name**: Unique identifier (e.g., "production-api")
   - **Hostname**: IP address or domain (e.g., "192.168.1.50")
   - **Username**: SSH user (e.g., "deploy")
   - **Port**: Default is 22
   - **SSH Key**: Browse to your private key (e.g., `~/.ssh/id_ed25519`)
   - **Folder**: Organize it (e.g., "work/clients/acme")
   - **Color Tag**: Production, Staging, or Development
3. (Optional) Expand **Advanced Settings** for:
   - **Jump Host**: Bastion/proxy server
   - **Local Port Forwards**: Forward ports from remote to local
   - **Remote Port Forwards**: Forward ports from local to remote
4. Click **Save**

The connection appears in your tree and is immediately usable via `ssh production-api`.

### Connecting to a Server

**Three ways to connect:**

1. **Double-click** a connection in the tree
2. **Select** a connection and click **[Connect]** button
3. **Right-click** a connection → **Connect**

SSH Manager auto-detects your terminal (gnome-terminal, konsole, xterm, etc.) and opens a new window with your SSH session.

### Organizing with Folders

- **Create Folder**: Right-click parent folder → **New Subfolder**
- **Move Connection**: Drag & drop connections between folders
- **Delete Folder**: Right-click → **Delete Folder** (must be empty)

Example hierarchy:
```
📁 work
  📁 clients
    📁 acme
      💻 acme-prod    [🔴 Production]
      💻 acme-staging [🟡 Staging]
  💻 office-vpn
📁 personal
  💻 homeserver
  💻 raspberry-pi
```

### Editing Connections

- **Quick Edit**: Select connection → Press **F2** (or right-click → **Edit**)
- **Duplicate**: Right-click → **Duplicate** (creates copy with "-copy" suffix)
- **Delete**: Select connection → Press **Delete** (or right-click → **Delete**)

### Searching

Use the search bar to filter connections in real-time. Searches across:
- Connection names
- Hostnames
- Usernames
- Folder names

### Keyboard Shortcuts

- **Ctrl+N** - New connection
- **F2** - Edit selected connection
- **Delete** - Delete selected connection
- **Enter** - Connect to selected connection
- **Ctrl+F** - Focus search bar
- **Ctrl+Q** - Quit application

## How It Works

### File Structure

SSH Manager stores each connection as a separate `.conf` file:

```
~/ssh_manager/groups/
├── work/
│   ├── production-api.conf
│   └── clients/
│       └── acme/
│           └── acme-prod.conf
└── personal/
    └── homeserver.conf
```

Each `.conf` file contains standard SSH config syntax:

```ssh
# File: ~/ssh_manager/groups/work/production-api.conf
# SSH Manager Metadata: {"color": "production"}

Host production-api
    HostName 192.168.1.50
    User deploy
    Port 22
    IdentityFile ~/.ssh/company_key
    ProxyJump bastion.company.com
    LocalForward 8080 localhost:80
    LocalForward 5432 db.internal:5432
```

### SSH Config Integration

Your `~/.ssh/config` includes all SSH Manager connections:

```ssh
# Your existing SSH config (untouched)
Host old-server
    HostName 10.0.0.1
    User admin

# SSH Manager - Auto-generated connections
Include ~/ssh_manager/groups/**/*.conf
```

The `Include` statement (SSH native feature) loads all `.conf` files from subdirectories. This means:
- ✅ All SSH tools work seamlessly (`ssh`, `scp`, `rsync`, `git`, etc.)
- ✅ Your existing config stays intact
- ✅ Easy to backup (just copy `~/ssh_manager/groups/`)
- ✅ Easy to version control (Git each folder separately)

## Advanced Features

### Port Forwarding

**Local Forward** (Access remote service locally):
```
Local Port: 8080
Remote Host: localhost
Remote Port: 80
```
SSH command: `ssh -L 8080:localhost:80 production-api`

**Remote Forward** (Expose local service to remote):
```
Remote Port: 3000
Local Host: localhost
Local Port: 3000
```
SSH command: `ssh -R 3000:localhost:3000 production-api`

### Jump Hosts (Bastion Servers)

Connect to a server through an intermediate jump host:
```
Host: internal-server.local
ProxyJump: bastion.company.com
```
SSH automatically connects to bastion first, then to internal-server.

### Color Tagging

Organize connections by environment:
- 🔴 **Production** - Live servers (red badge)
- 🟡 **Staging** - Testing environments (yellow badge)
- 🟢 **Development** - Dev machines (green badge)

Visual safety net to avoid mistakes (e.g., won't accidentally restart production).

## Troubleshooting

### Terminal Not Launching

**Problem**: Double-clicking connection doesn't open terminal

**Solution**: SSH Manager auto-detects terminals. If yours isn't detected, install a supported one:
```bash
# Ubuntu/Debian
sudo apt install gnome-terminal

# Fedora
sudo dnf install gnome-terminal

# Arch
sudo pacman -S gnome-terminal
```

Supported terminals: gnome-terminal, konsole, xfce4-terminal, alacritty, kitty, tilix, xterm

### Existing SSH Config Warning

**Problem**: "We detected existing connections in ~/.ssh/config"

**Solution**: This is normal. SSH Manager detects your existing config and leaves it alone. New connections you create via SSH Manager are stored separately in `~/ssh_manager/groups/`.

If you want to manage existing connections, you can manually recreate them in SSH Manager, then remove from `~/.ssh/config`.

### Permission Denied

**Problem**: SSH connection fails with "Permission denied"

**Solution**: Check your SSH key permissions:
```bash
chmod 600 ~/.ssh/id_ed25519        # Private key
chmod 644 ~/.ssh/id_ed25519.pub    # Public key
```

SSH Manager doesn't manage key permissions - use standard SSH key setup.

### PySide6 Installation Issues

**Problem**: `pip install PySide6` fails or takes very long

**Solution**: PySide6 is a large package (~100MB). Ensure you have:
- Sufficient disk space
- Good internet connection
- Up-to-date pip: `pip install --upgrade pip`

Alternative for testing without GUI:
```bash
# Just generate SSH config files without GUI
python3 -c "from core.config_manager import ConfigManager; ..."
```

## Project Structure

```
ssh_manager/
├── main.py                  # Application entry point
├── requirements.txt         # Dependencies (PySide6 only)
├── README.md               # This file
├── PROJECT_PLAN.md         # Technical documentation
│
├── core/                   # Business logic (no GUI)
│   ├── connection.py       # Connection data model
│   ├── config_manager.py   # SSH config file operations
│   └── terminal_launcher.py # Terminal detection & SSH launching
│
└── ui/                     # GUI components
    ├── main_window.py      # Main application window
    ├── connection_tree.py  # Tree view widget
    └── connection_dialog.py # Add/Edit connection dialog
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## Roadmap

### v1.0 (Current)
- [x] Basic GUI with tree view
- [x] Add/Edit/Delete connections
- [x] Nested folder organization
- [x] Port forwards and jump hosts
- [x] Terminal auto-detection
- [x] Search/filter
- [x] Color tagging

### v1.1 (Planned)
- [ ] Import existing SSH config connections
- [ ] Export connections to file
- [ ] Connection templates
- [ ] Dark mode support
- [ ] Connection usage statistics

### v2.0 (Future)
- [ ] macOS support
- [ ] Windows support (with WSL)
- [ ] SSH key generation interface
- [ ] Multi-connection actions
- [ ] Built-in connection testing

## License

MIT License - see LICENSE file for details

## Credits

Inspired by SecureCRT's session management workflow.

Built with:
- [PySide6](https://doc.qt.io/qtforpython/) - Qt for Python
- Native SSH client (OpenSSH)

---

**Questions or issues?** Open an issue on GitHub or submit a pull request.
