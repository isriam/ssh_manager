"""
Main Application Window

Primary window for SSH Manager application with toolbar, tree view, and status bar.
"""

from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QToolBar, QLineEdit, QStatusBar, QMessageBox,
    QInputDialog, QLabel, QPushButton
)
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QAction, QKeySequence
from pathlib import Path
from typing import Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config_manager import ConfigManager
from core.connection import Connection
from core.terminal_launcher import TerminalLauncher
from .connection_tree import ConnectionTreeView
from .connection_dialog import ConnectionDialog


class MainWindow(QMainWindow):
    """
    Main application window for SSH Manager.

    Provides:
    - Toolbar with action buttons
    - Search bar for filtering connections
    - Tree view of connections organized by folders
    - Status bar showing connection count
    - Menu bar with file operations
    """

    def __init__(self):
        super().__init__()

        # Initialize config manager
        self.config_manager = ConfigManager()

        # Current selection
        self.selected_connection: Optional[Connection] = None
        self.selected_folder: Optional[str] = None

        # Setup UI
        self.setup_ui()
        self.setup_menu()
        self.setup_toolbar()
        self.setup_signals()

        # Initialize SSH Manager
        self.initialize_ssh_manager()

        # Load connections
        self.refresh_connections()

    def setup_ui(self):
        """Set up the user interface."""
        self.setWindowTitle("SSH Manager")
        self.setGeometry(100, 100, 400, 600)
        self.setMinimumSize(350, 400)

        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Search bar
        search_container = QWidget()
        search_layout = QHBoxLayout(search_container)
        search_layout.setContentsMargins(5, 5, 5, 5)

        search_label = QLabel("🔍")
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search connections...")
        self.search_input.textChanged.connect(self.on_search_changed)

        search_layout.addWidget(search_label)
        search_layout.addWidget(self.search_input)

        layout.addWidget(search_container)

        # Connection tree
        self.tree_view = ConnectionTreeView()
        layout.addWidget(self.tree_view)

        # Status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.update_status("Ready")

    def setup_menu(self):
        """Set up the menu bar."""
        menu_bar = self.menuBar()

        # File menu
        file_menu = menu_bar.addMenu("File")

        new_action = QAction("New Connection", self)
        new_action.setShortcut(QKeySequence.New)
        new_action.triggered.connect(self.new_connection)
        file_menu.addAction(new_action)

        file_menu.addSeparator()

        refresh_action = QAction("Refresh", self)
        refresh_action.setShortcut(QKeySequence.Refresh)
        refresh_action.triggered.connect(self.refresh_connections)
        file_menu.addAction(refresh_action)

        file_menu.addSeparator()

        exit_action = QAction("Exit", self)
        exit_action.setShortcut(QKeySequence.Quit)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)

        # Edit menu
        edit_menu = menu_bar.addMenu("Edit")

        edit_connection_action = QAction("Edit Connection", self)
        edit_connection_action.setShortcut(Qt.Key_F2)
        edit_connection_action.triggered.connect(self.edit_selected_connection)
        edit_menu.addAction(edit_connection_action)

        duplicate_action = QAction("Duplicate Connection", self)
        duplicate_action.setShortcut(QKeySequence("Ctrl+D"))
        duplicate_action.triggered.connect(self.duplicate_selected_connection)
        edit_menu.addAction(duplicate_action)

        edit_menu.addSeparator()

        delete_action = QAction("Delete", self)
        delete_action.setShortcut(QKeySequence.Delete)
        delete_action.triggered.connect(self.delete_selected)
        edit_menu.addAction(delete_action)

        # View menu
        view_menu = menu_bar.addMenu("View")

        expand_action = QAction("Expand All", self)
        expand_action.triggered.connect(self.tree_view.expandAll)
        view_menu.addAction(expand_action)

        collapse_action = QAction("Collapse All", self)
        collapse_action.triggered.connect(self.tree_view.collapseAll)
        view_menu.addAction(collapse_action)

        # Help menu
        help_menu = menu_bar.addMenu("Help")

        about_action = QAction("About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)

    def setup_toolbar(self):
        """Set up the toolbar."""
        toolbar = QToolBar("Main Toolbar")
        toolbar.setMovable(False)
        self.addToolBar(toolbar)

        # New Connection
        new_btn = QPushButton("+ New")
        new_btn.clicked.connect(self.new_connection)
        toolbar.addWidget(new_btn)

        # Edit Connection
        edit_btn = QPushButton("✏️ Edit")
        edit_btn.clicked.connect(self.edit_selected_connection)
        toolbar.addWidget(edit_btn)

        # Delete
        delete_btn = QPushButton("🗑️ Delete")
        delete_btn.clicked.connect(self.delete_selected)
        toolbar.addWidget(delete_btn)

        toolbar.addSeparator()

        # Connect
        connect_btn = QPushButton("🚀 Connect")
        connect_btn.clicked.connect(self.connect_selected)
        connect_btn.setStyleSheet("font-weight: bold;")
        toolbar.addWidget(connect_btn)

    def setup_signals(self):
        """Set up signal connections."""
        # Tree view signals
        self.tree_view.connection_selected.connect(self.on_connection_selected)
        self.tree_view.connection_double_clicked.connect(self.launch_ssh_connection)
        self.tree_view.connection_edit_requested.connect(self.edit_connection)
        self.tree_view.connection_delete_requested.connect(self.delete_connection)
        self.tree_view.connection_duplicate_requested.connect(self.duplicate_connection)
        self.tree_view.folder_create_requested.connect(self.create_folder)
        self.tree_view.folder_delete_requested.connect(self.delete_folder)

    def initialize_ssh_manager(self):
        """Initialize SSH Manager on first run."""
        try:
            result = self.config_manager.initialize()

            # Show welcome message if this is first run
            if result['created_dirs'] or result['added_include']:
                msg = "SSH Manager initialized successfully!\n\n"
                msg += result['message']

                if result['existing_connections'] > 0:
                    msg += f"\n\nNote: We detected {result['existing_connections']} existing connections in ~/.ssh/config"
                    msg += "\nYour existing config remains untouched."

                QMessageBox.information(self, "Welcome to SSH Manager", msg)

        except Exception as e:
            QMessageBox.critical(self, "Initialization Error", f"Failed to initialize SSH Manager:\n{e}")

    def refresh_connections(self):
        """Reload all connections from disk."""
        try:
            connections = self.config_manager.list_connections()
            self.tree_view.load_connections(connections)

            # Update status
            stats = self.config_manager.get_stats()
            self.update_status(f"{stats['total_connections']} connections in {stats['total_folders']} folders")

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to load connections:\n{e}")

    def new_connection(self):
        """Open dialog to create new connection."""
        folders = self.config_manager.list_folders()

        dialog = ConnectionDialog(self, connection=None, folders=folders)
        dialog.connection_saved.connect(self.save_new_connection)
        dialog.exec()

    def save_new_connection(self, connection: Connection):
        """Save new connection to disk."""
        try:
            # Check if connection already exists
            if self.config_manager.connection_exists(connection.folder, connection.name):
                QMessageBox.warning(
                    self,
                    "Connection Exists",
                    f"A connection named '{connection.name}' already exists in folder '{connection.folder}'."
                )
                return

            # Save connection
            self.config_manager.save_connection(connection)

            # Refresh tree
            self.refresh_connections()

            self.update_status(f"Created connection: {connection.name}")

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save connection:\n{e}")

    def on_connection_selected(self, connection: Connection):
        """Handle connection selection."""
        self.selected_connection = connection
        self.selected_folder = None

    def edit_selected_connection(self):
        """Edit selected connection."""
        connection = self.tree_view.get_selected_connection()

        if not connection:
            QMessageBox.information(self, "No Selection", "Please select a connection to edit.")
            return

        self.edit_connection(connection)

    def edit_connection(self, connection: Connection):
        """Open dialog to edit connection."""
        folders = self.config_manager.list_folders()

        dialog = ConnectionDialog(self, connection=connection, folders=folders)
        dialog.connection_saved.connect(lambda conn: self.save_edited_connection(connection, conn))
        dialog.exec()

    def save_edited_connection(self, old_connection: Connection, new_connection: Connection):
        """Save edited connection."""
        try:
            # Delete old connection if name or folder changed
            if old_connection.name != new_connection.name or old_connection.folder != new_connection.folder:
                self.config_manager.delete_connection(old_connection.folder, old_connection.name)

            # Save new connection
            self.config_manager.save_connection(new_connection)

            # Refresh tree
            self.refresh_connections()

            self.update_status(f"Updated connection: {new_connection.name}")

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to update connection:\n{e}")

    def duplicate_selected_connection(self):
        """Duplicate selected connection."""
        connection = self.tree_view.get_selected_connection()

        if not connection:
            QMessageBox.information(self, "No Selection", "Please select a connection to duplicate.")
            return

        self.duplicate_connection(connection)

    def duplicate_connection(self, connection: Connection):
        """Create a copy of connection."""
        # Create new connection with "-copy" suffix
        new_name = f"{connection.name}-copy"

        # Find unique name
        counter = 1
        while self.config_manager.connection_exists(connection.folder, new_name):
            new_name = f"{connection.name}-copy{counter}"
            counter += 1

        # Create copy
        new_conn = Connection(
            name=new_name,
            hostname=connection.hostname,
            user=connection.user,
            port=connection.port,
            identity_file=connection.identity_file,
            folder=connection.folder,
            proxy_jump=connection.proxy_jump,
            local_forwards=connection.local_forwards.copy(),
            remote_forwards=connection.remote_forwards.copy(),
            color_tag=connection.color_tag
        )

        try:
            self.config_manager.save_connection(new_conn)
            self.refresh_connections()
            self.update_status(f"Duplicated connection: {new_conn.name}")

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to duplicate connection:\n{e}")

    def delete_selected(self):
        """Delete selected connection or folder."""
        connection = self.tree_view.get_selected_connection()
        folder = self.tree_view.get_selected_folder()

        if connection:
            self.delete_connection(connection)
        elif folder:
            self.delete_folder(folder)
        else:
            QMessageBox.information(self, "No Selection", "Please select a connection or folder to delete.")

    def delete_connection(self, connection: Connection):
        """Delete a connection with confirmation."""
        reply = QMessageBox.question(
            self,
            "Confirm Delete",
            f"Are you sure you want to delete connection '{connection.name}'?",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            try:
                self.config_manager.delete_connection(connection.folder, connection.name)
                self.refresh_connections()
                self.update_status(f"Deleted connection: {connection.name}")

            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to delete connection:\n{e}")

    def create_folder(self, parent_folder: str):
        """Create new folder."""
        folder_name, ok = QInputDialog.getText(
            self,
            "Create Folder",
            "Enter folder name:"
        )

        if ok and folder_name:
            # Build full path
            if parent_folder:
                full_path = f"{parent_folder}/{folder_name}"
            else:
                full_path = folder_name

            try:
                self.config_manager.create_folder(full_path)
                self.refresh_connections()
                self.update_status(f"Created folder: {full_path}")

            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to create folder:\n{e}")

    def delete_folder(self, folder_path: str):
        """Delete a folder with confirmation."""
        reply = QMessageBox.question(
            self,
            "Confirm Delete",
            f"Are you sure you want to delete folder '{folder_path}'?\n\nThis will also delete all connections inside.",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            try:
                self.config_manager.delete_folder(folder_path, recursive=True)
                self.refresh_connections()
                self.update_status(f"Deleted folder: {folder_path}")

            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to delete folder:\n{e}")

    def connect_selected(self):
        """Connect to selected connection."""
        connection = self.tree_view.get_selected_connection()

        if not connection:
            QMessageBox.information(self, "No Selection", "Please select a connection to launch.")
            return

        self.launch_ssh_connection(connection)

    def launch_ssh_connection(self, connection: Connection):
        """Launch SSH connection in terminal."""
        try:
            success = TerminalLauncher.launch_ssh(connection.name)

            if success:
                self.update_status(f"Launched SSH connection: {connection.name}")
            else:
                # Show manual command if terminal not detected
                ssh_command = TerminalLauncher.get_ssh_command(connection.name)
                QMessageBox.information(
                    self,
                    "Launch SSH Manually",
                    f"Terminal emulator not detected.\n\n"
                    f"Run this command in your terminal:\n\n{ssh_command}"
                )

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to launch SSH connection:\n{e}")

    def on_search_changed(self, text: str):
        """Handle search input change."""
        if text.strip():
            self.tree_view.filter_connections(text.strip())
        else:
            self.tree_view.clear_filter()

    def update_status(self, message: str):
        """Update status bar message."""
        self.status_bar.showMessage(message)

    def show_about(self):
        """Show about dialog."""
        QMessageBox.about(
            self,
            "About SSH Manager",
            "<h3>SSH Manager</h3>"
            "<p>A clean, focused SSH session manager inspired by SecureCRT.</p>"
            "<p>Manage your SSH connections with a simple GUI instead of manually editing config files.</p>"
            "<p><b>Version:</b> 1.0.0</p>"
            "<p><b>Built with:</b> PySide6 and Python</p>"
        )
