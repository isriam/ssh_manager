"""
Connection Tree View

Tree widget displaying folders and connections in hierarchical structure.
"""

from PySide6.QtWidgets import QTreeWidget, QTreeWidgetItem, QMenu
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QAction
from pathlib import Path
from typing import List, Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.connection import Connection


class ConnectionTreeItem(QTreeWidgetItem):
    """Custom tree widget item for connections."""

    def __init__(self, parent, connection: Connection):
        super().__init__(parent)
        self.connection = connection
        self.is_connection = True

        # Set display text with color emoji
        self.setText(0, connection.get_display_name())

        # Store connection data
        self.setData(0, Qt.UserRole, connection)


class FolderTreeItem(QTreeWidgetItem):
    """Custom tree widget item for folders."""

    def __init__(self, parent, folder_name: str, folder_path: str):
        super().__init__(parent)
        self.folder_name = folder_name
        self.folder_path = folder_path
        self.is_connection = False

        # Set display text with folder emoji
        self.setText(0, f"📁 {folder_name}")

        # Store folder path
        self.setData(0, Qt.UserRole, folder_path)


class ConnectionTreeView(QTreeWidget):
    """
    Tree view widget for displaying SSH connections organized in folders.

    Signals:
        connection_selected: Emitted when a connection is selected
        connection_double_clicked: Emitted when a connection is double-clicked
        connection_edit_requested: Emitted when user requests to edit connection
        connection_delete_requested: Emitted when user requests to delete connection
        folder_create_requested: Emitted when user requests to create folder
        folder_delete_requested: Emitted when user requests to delete folder
    """

    connection_selected = Signal(Connection)
    connection_double_clicked = Signal(Connection)
    connection_edit_requested = Signal(Connection)
    connection_delete_requested = Signal(Connection)
    connection_duplicate_requested = Signal(Connection)
    folder_create_requested = Signal(str)  # parent folder path
    folder_delete_requested = Signal(str)  # folder path

    def __init__(self, parent=None):
        super().__init__(parent)

        self.setup_ui()
        self.setup_signals()

    def setup_ui(self):
        """Set up the user interface."""
        self.setHeaderHidden(True)
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.setDragDropMode(QTreeWidget.InternalMove)
        self.setSelectionMode(QTreeWidget.SingleSelection)

    def setup_signals(self):
        """Set up signal connections."""
        self.itemClicked.connect(self.on_item_clicked)
        self.itemDoubleClicked.connect(self.on_item_double_clicked)
        self.customContextMenuRequested.connect(self.show_context_menu)

    def load_connections(self, connections: List[Connection]):
        """
        Load connections into tree view.

        Args:
            connections: List of Connection objects
        """
        self.clear()

        # Organize connections by folder
        folder_map = {}

        for conn in connections:
            folder_path = conn.folder

            # Parse folder path into parts
            folder_parts = folder_path.split('/') if folder_path else ['']

            # Build nested folder structure
            current_map = folder_map
            current_path = ""

            for i, part in enumerate(folder_parts):
                current_path = '/'.join(folder_parts[:i+1]) if i > 0 else part

                if part not in current_map:
                    current_map[part] = {
                        '_folders': {},
                        '_connections': [],
                        '_path': current_path
                    }

                if i < len(folder_parts) - 1:
                    current_map = current_map[part]['_folders']

            # Add connection to leaf folder
            if folder_parts:
                leaf_folder = folder_parts[-1]
                if leaf_folder in current_map:
                    current_map[leaf_folder]['_connections'].append(conn)

        # Build tree from folder map
        self._build_tree(folder_map, None)

        # Expand all folders by default
        self.expandAll()

    def _build_tree(self, folder_map: dict, parent_item: Optional[QTreeWidgetItem]):
        """
        Recursively build tree from folder map.

        Args:
            folder_map: Nested dictionary of folders and connections
            parent_item: Parent tree item (None for root)
        """
        for folder_name, folder_data in sorted(folder_map.items()):
            if not folder_name:
                continue

            folder_path = folder_data.get('_path', folder_name)

            # Create folder item
            if parent_item:
                folder_item = FolderTreeItem(parent_item, folder_name, folder_path)
            else:
                folder_item = FolderTreeItem(self, folder_name, folder_path)

            # Add connections to this folder
            for conn in sorted(folder_data.get('_connections', []), key=lambda c: c.name):
                ConnectionTreeItem(folder_item, conn)

            # Recursively add subfolders
            subfolders = folder_data.get('_folders', {})
            if subfolders:
                self._build_tree(subfolders, folder_item)

    def get_selected_connection(self) -> Optional[Connection]:
        """
        Get currently selected connection.

        Returns:
            Connection object if connection is selected, None otherwise
        """
        current = self.currentItem()

        if current and isinstance(current, ConnectionTreeItem):
            return current.connection

        return None

    def get_selected_folder(self) -> Optional[str]:
        """
        Get currently selected folder path.

        Returns:
            Folder path if folder is selected, None otherwise
        """
        current = self.currentItem()

        if current and isinstance(current, FolderTreeItem):
            return current.folder_path

        return None

    def on_item_clicked(self, item: QTreeWidgetItem, column: int):
        """Handle item click."""
        if isinstance(item, ConnectionTreeItem):
            self.connection_selected.emit(item.connection)

    def on_item_double_clicked(self, item: QTreeWidgetItem, column: int):
        """Handle item double-click (launch SSH)."""
        if isinstance(item, ConnectionTreeItem):
            self.connection_double_clicked.emit(item.connection)

    def show_context_menu(self, position):
        """Show right-click context menu."""
        item = self.itemAt(position)

        if not item:
            # Clicked on empty space
            menu = QMenu(self)
            create_action = QAction("Create Folder", self)
            create_action.triggered.connect(lambda: self.folder_create_requested.emit(""))
            menu.addAction(create_action)
            menu.exec(self.mapToGlobal(position))
            return

        menu = QMenu(self)

        if isinstance(item, ConnectionTreeItem):
            # Connection context menu
            connect_action = QAction("Connect", self)
            connect_action.triggered.connect(lambda: self.connection_double_clicked.emit(item.connection))
            menu.addAction(connect_action)

            menu.addSeparator()

            edit_action = QAction("Edit", self)
            edit_action.triggered.connect(lambda: self.connection_edit_requested.emit(item.connection))
            menu.addAction(edit_action)

            duplicate_action = QAction("Duplicate", self)
            duplicate_action.triggered.connect(lambda: self.connection_duplicate_requested.emit(item.connection))
            menu.addAction(duplicate_action)

            menu.addSeparator()

            delete_action = QAction("Delete", self)
            delete_action.triggered.connect(lambda: self.connection_delete_requested.emit(item.connection))
            menu.addAction(delete_action)

        elif isinstance(item, FolderTreeItem):
            # Folder context menu
            create_action = QAction("New Subfolder", self)
            create_action.triggered.connect(lambda: self.folder_create_requested.emit(item.folder_path))
            menu.addAction(create_action)

            menu.addSeparator()

            delete_action = QAction("Delete Folder", self)
            delete_action.triggered.connect(lambda: self.folder_delete_requested.emit(item.folder_path))
            menu.addAction(delete_action)

        menu.exec(self.mapToGlobal(position))

    def filter_connections(self, search_text: str):
        """
        Filter tree view by search text.

        Args:
            search_text: Text to search for (case-insensitive)
        """
        search_text = search_text.lower()

        # Show/hide items based on search
        iterator = QTreeWidgetItemIterator(self)
        while iterator.value():
            item = iterator.value()

            if isinstance(item, ConnectionTreeItem):
                # Check if connection matches search
                conn = item.connection
                matches = (
                    search_text in conn.name.lower() or
                    search_text in conn.hostname.lower() or
                    search_text in conn.user.lower() or
                    search_text in conn.folder.lower()
                )

                item.setHidden(not matches)

                # Show parent folders if connection matches
                if matches:
                    parent = item.parent()
                    while parent:
                        parent.setHidden(False)
                        parent = parent.parent()

            elif isinstance(item, FolderTreeItem):
                # Folder visibility will be set by child connections
                pass

            iterator += 1

        # Hide empty folders
        iterator = QTreeWidgetItemIterator(self)
        while iterator.value():
            item = iterator.value()

            if isinstance(item, FolderTreeItem):
                has_visible_children = False
                for i in range(item.childCount()):
                    if not item.child(i).isHidden():
                        has_visible_children = True
                        break

                if not has_visible_children and search_text:
                    item.setHidden(True)

            iterator += 1

    def clear_filter(self):
        """Clear search filter and show all items."""
        iterator = QTreeWidgetItemIterator(self)
        while iterator.value():
            iterator.value().setHidden(False)
            iterator += 1
