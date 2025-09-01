#!/bin/bash

# SSH Manager Runner Script
# Activates virtual environment and runs SSH Manager

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please create one first:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install paramiko sshtunnel"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if we should run GUI or CLI
if [ "$1" = "gui" ] || [ $# -eq 0 ]; then
    # Check if tkinter is available
    if python -c "import tkinter" 2>/dev/null; then
        echo "🚀 Launching SSH Manager GUI..."
        python src/ssh_manager/main.py gui
    else
        echo "❌ Tkinter not available for GUI. Please install:"
        echo "   sudo apt install python3-tkinter"
        echo ""
        echo "📋 Available CLI commands:"
        python src/ssh_manager/main.py --help
    fi
else
    # Run CLI with all arguments
    python src/ssh_manager/main.py "$@"
fi