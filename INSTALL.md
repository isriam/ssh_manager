# SSH Manager - Installation Guide

## Quick Start

### 1. Prerequisites
- Python 3.8 or higher
- Git

### 2. Clone and Setup
```bash
git clone https://github.com/isriam/ssh_manager.git
cd ssh_manager

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# For GUI support (Linux)
sudo apt install python3-tk
```

### 3. Initialize SSH Manager
```bash
# Using the runner script (recommended)
./run.sh init

# Or manually
source venv/bin/activate
python src/ssh_manager/main.py init
```

### 4. Launch
```bash
# GUI (default)
./run.sh

# CLI
./run.sh --help
./run.sh list
./run.sh add -n "server1" --host "example.com" -u "user"
```

## Usage Examples

### CLI Commands
```bash
./run.sh init                                    # Initialize SSH Manager
./run.sh add -n "web-server" --host "192.168.1.100" -u "admin" -g "work"
./run.sh list                                    # List all connections
./run.sh list -g work                            # List connections in 'work' group
./run.sh connect web-server -g work              # Connect to server
./run.sh test web-server -g work                 # Test connection
./run.sh groups                                  # Show all groups
./run.sh backup -o my_backup.zip                # Create backup
```

### GUI
```bash
./run.sh gui                                     # Launch GUI directly
./run.sh                                         # Launch GUI (default)
```

## Troubleshooting

### GUI Won't Launch
```bash
# Install tkinter
sudo apt install python3-tk      # Ubuntu/Debian/Mint
sudo dnf install tkinter          # Fedora
sudo pacman -S tk                 # Arch Linux
```

### Python Virtual Environment Issues
```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### SSH Connection Issues
- Ensure SSH keys exist: `ls ~/.ssh/`
- Test SSH manually: `ssh -o ConnectTimeout=5 <server-name>`
- Check SSH config: `ssh -F ~/.ssh/config -T <server-name>`