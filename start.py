#!/usr/bin/env python3

"""
SSH Manager - Simple Startup Script

This script provides an easy way to start SSH Manager without
needing to remember the full path or activate virtual environments.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Main startup function."""
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    
    # Change to the SSH Manager directory
    os.chdir(script_dir)
    
    # Check if virtual environment exists
    venv_dir = script_dir / "venv"
    if venv_dir.exists():
        # Use virtual environment
        if os.name == 'nt':  # Windows
            python_path = venv_dir / "Scripts" / "python.exe"
        else:  # Unix-like
            python_path = venv_dir / "bin" / "python"
    else:
        # Use system Python
        python_path = sys.executable
    
    # SSH Manager main script path
    main_script = script_dir / "src" / "ssh_manager" / "main.py"
    
    # Build command
    cmd = [str(python_path), str(main_script)]
    
    # Add any command line arguments
    if len(sys.argv) > 1:
        cmd.extend(sys.argv[1:])
    else:
        # Default to GUI if no arguments
        cmd.append("gui")
    
    # Execute SSH Manager
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\nSSH Manager terminated by user")
    except FileNotFoundError:
        print(f"Error: Could not find Python at {python_path}")
        print("Please ensure virtual environment is set up or Python is installed")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting SSH Manager: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()