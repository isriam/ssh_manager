#!/usr/bin/env python3
"""
SSH Manager - Main Entry Point

A clean, focused SSH session manager inspired by SecureCRT.
Manage your SSH connections with a simple GUI instead of manually editing config files.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from PySide6.QtWidgets import QApplication
from ui.main_window import MainWindow


def main():
    """Main application entry point."""
    # Create Qt application
    app = QApplication(sys.argv)
    app.setApplicationName("SSH Manager")
    app.setOrganizationName("SSH Manager")

    # Create and show main window
    window = MainWindow()
    window.show()

    # Run application event loop
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
