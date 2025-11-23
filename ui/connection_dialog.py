"""
Connection Dialog

Add/Edit dialog for SSH connections with form fields.
"""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLineEdit, QSpinBox, QPushButton, QComboBox,
    QGroupBox, QLabel, QFileDialog, QListWidget,
    QListWidgetItem, QMessageBox
)
from PySide6.QtCore import Qt, Signal
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.connection import Connection


class PortForwardWidget(QListWidget):
    """Widget for managing port forwards (local or remote)."""

    def __init__(self, forward_type="local", parent=None):
        super().__init__(parent)
        self.forward_type = forward_type  # "local" or "remote"

    def add_forward(self, local_port: int, remote_host: str, remote_port: int):
        """Add port forward to list."""
        if self.forward_type == "local":
            text = f"{local_port} → {remote_host}:{remote_port}"
        else:
            text = f"{local_port} ← {remote_host}:{remote_port}"

        item = QListWidgetItem(text)
        item.setData(Qt.UserRole, (local_port, remote_host, remote_port))
        self.addItem(item)

    def get_forwards(self):
        """Get all forwards as list of tuples."""
        forwards = []
        for i in range(self.count()):
            item = self.item(i)
            forwards.append(item.data(Qt.UserRole))
        return forwards

    def remove_selected(self):
        """Remove selected forward."""
        current_row = self.currentRow()
        if current_row >= 0:
            self.takeItem(current_row)


class ConnectionDialog(QDialog):
    """
    Dialog for adding or editing SSH connections.

    Provides form fields for all connection properties including
    basic settings and advanced options (port forwards, jump hosts).
    """

    connection_saved = Signal(Connection)

    def __init__(self, parent=None, connection: Connection = None, folders: list = None):
        super().__init__(parent)

        self.connection = connection
        self.folders = folders or ["work", "personal"]
        self.is_edit_mode = connection is not None

        self.setup_ui()
        self.load_connection_data()

    def setup_ui(self):
        """Set up the user interface."""
        title = "Edit Connection" if self.is_edit_mode else "New Connection"
        self.setWindowTitle(title)
        self.setMinimumWidth(500)
        self.setMinimumHeight(600)

        layout = QVBoxLayout(self)

        # Basic settings form
        basic_group = QGroupBox("Basic Settings")
        basic_layout = QFormLayout()

        # Connection Name
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("e.g., production-api")
        basic_layout.addRow("Connection Name:", self.name_input)

        # Hostname
        self.hostname_input = QLineEdit()
        self.hostname_input.setPlaceholderText("e.g., 192.168.1.50 or api.example.com")
        basic_layout.addRow("Hostname:", self.hostname_input)

        # Username and Port (side by side)
        user_port_layout = QHBoxLayout()
        self.user_input = QLineEdit()
        self.user_input.setPlaceholderText("e.g., deploy")
        self.port_input = QSpinBox()
        self.port_input.setRange(1, 65535)
        self.port_input.setValue(22)
        user_port_layout.addWidget(self.user_input, 2)
        user_port_layout.addWidget(QLabel("Port:"))
        user_port_layout.addWidget(self.port_input, 1)
        basic_layout.addRow("Username:", user_port_layout)

        # SSH Key File
        key_layout = QHBoxLayout()
        self.key_input = QLineEdit()
        self.key_input.setPlaceholderText("~/.ssh/id_ed25519")
        self.key_browse_btn = QPushButton("Browse...")
        self.key_browse_btn.clicked.connect(self.browse_key_file)
        key_layout.addWidget(self.key_input)
        key_layout.addWidget(self.key_browse_btn)
        basic_layout.addRow("SSH Key File:", key_layout)

        # Folder
        self.folder_combo = QComboBox()
        self.folder_combo.setEditable(True)
        self.folder_combo.addItems(self.folders)
        basic_layout.addRow("Folder:", self.folder_combo)

        # Color Tag
        self.color_combo = QComboBox()
        self.color_combo.addItems(["None", "🔴 Production", "🟡 Staging", "🟢 Development"])
        basic_layout.addRow("Environment:", self.color_combo)

        basic_group.setLayout(basic_layout)
        layout.addWidget(basic_group)

        # Advanced Settings
        advanced_group = QGroupBox("Advanced Settings")
        advanced_layout = QVBoxLayout()

        # Jump Host
        jump_form = QFormLayout()
        self.jump_input = QLineEdit()
        self.jump_input.setPlaceholderText("e.g., bastion.company.com")
        jump_form.addRow("Jump Host (ProxyJump):", self.jump_input)
        advanced_layout.addLayout(jump_form)

        # Local Port Forwards
        local_forward_label = QLabel("Local Port Forwards:")
        advanced_layout.addWidget(local_forward_label)

        self.local_forwards_widget = PortForwardWidget("local")
        self.local_forwards_widget.setMaximumHeight(80)
        advanced_layout.addWidget(self.local_forwards_widget)

        local_forward_btn_layout = QHBoxLayout()
        self.add_local_forward_btn = QPushButton("+ Add Local Forward")
        self.add_local_forward_btn.clicked.connect(self.add_local_forward)
        self.remove_local_forward_btn = QPushButton("Remove")
        self.remove_local_forward_btn.clicked.connect(
            lambda: self.local_forwards_widget.remove_selected()
        )
        local_forward_btn_layout.addWidget(self.add_local_forward_btn)
        local_forward_btn_layout.addWidget(self.remove_local_forward_btn)
        local_forward_btn_layout.addStretch()
        advanced_layout.addLayout(local_forward_btn_layout)

        # Remote Port Forwards
        remote_forward_label = QLabel("Remote Port Forwards:")
        advanced_layout.addWidget(remote_forward_label)

        self.remote_forwards_widget = PortForwardWidget("remote")
        self.remote_forwards_widget.setMaximumHeight(80)
        advanced_layout.addWidget(self.remote_forwards_widget)

        remote_forward_btn_layout = QHBoxLayout()
        self.add_remote_forward_btn = QPushButton("+ Add Remote Forward")
        self.add_remote_forward_btn.clicked.connect(self.add_remote_forward)
        self.remove_remote_forward_btn = QPushButton("Remove")
        self.remove_remote_forward_btn.clicked.connect(
            lambda: self.remote_forwards_widget.remove_selected()
        )
        remote_forward_btn_layout.addWidget(self.add_remote_forward_btn)
        remote_forward_btn_layout.addWidget(self.remove_remote_forward_btn)
        remote_forward_btn_layout.addStretch()
        advanced_layout.addLayout(remote_forward_btn_layout)

        advanced_group.setLayout(advanced_layout)
        layout.addWidget(advanced_group)

        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()

        self.cancel_btn = QPushButton("Cancel")
        self.cancel_btn.clicked.connect(self.reject)

        self.test_btn = QPushButton("Test")
        self.test_btn.clicked.connect(self.test_connection)

        self.save_btn = QPushButton("Save")
        self.save_btn.clicked.connect(self.save_connection)
        self.save_btn.setDefault(True)

        button_layout.addWidget(self.cancel_btn)
        button_layout.addWidget(self.test_btn)
        button_layout.addWidget(self.save_btn)

        layout.addLayout(button_layout)

    def load_connection_data(self):
        """Load existing connection data into form (edit mode)."""
        if not self.connection:
            # Default values for new connection
            self.folder_combo.setCurrentText("personal")
            return

        # Load existing connection
        self.name_input.setText(self.connection.name)
        self.hostname_input.setText(self.connection.hostname)
        self.user_input.setText(self.connection.user)
        self.port_input.setValue(self.connection.port)
        self.key_input.setText(self.connection.identity_file)
        self.folder_combo.setCurrentText(self.connection.folder)
        self.jump_input.setText(self.connection.proxy_jump)

        # Set color tag
        color_map = {
            "production": 1,
            "staging": 2,
            "development": 3
        }
        color_index = color_map.get(self.connection.color_tag, 0)
        self.color_combo.setCurrentIndex(color_index)

        # Load port forwards
        for local_port, remote_host, remote_port in self.connection.local_forwards:
            self.local_forwards_widget.add_forward(local_port, remote_host, remote_port)

        for remote_port, local_host, local_port in self.connection.remote_forwards:
            self.remote_forwards_widget.add_forward(remote_port, local_host, local_port)

    def browse_key_file(self):
        """Open file dialog to browse for SSH key."""
        ssh_dir = Path.home() / ".ssh"
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Select SSH Private Key",
            str(ssh_dir),
            "All Files (*)"
        )

        if file_path:
            self.key_input.setText(file_path)

    def add_local_forward(self):
        """Add local port forward."""
        dialog = PortForwardDialog(self, "local")
        if dialog.exec() == QDialog.Accepted:
            local_port, remote_host, remote_port = dialog.get_forward()
            self.local_forwards_widget.add_forward(local_port, remote_host, remote_port)

    def add_remote_forward(self):
        """Add remote port forward."""
        dialog = PortForwardDialog(self, "remote")
        if dialog.exec() == QDialog.Accepted:
            remote_port, local_host, local_port = dialog.get_forward()
            self.remote_forwards_widget.add_forward(remote_port, local_host, local_port)

    def test_connection(self):
        """Test connection (placeholder for now)."""
        QMessageBox.information(
            self,
            "Test Connection",
            "Connection testing not yet implemented.\nThe connection will work if SSH config is valid."
        )

    def save_connection(self):
        """Validate and save connection."""
        # Get form values
        name = self.name_input.text().strip()
        hostname = self.hostname_input.text().strip()
        user = self.user_input.text().strip()
        port = self.port_input.value()
        identity_file = self.key_input.text().strip()
        folder = self.folder_combo.currentText().strip()
        proxy_jump = self.jump_input.text().strip()

        # Get color tag
        color_index = self.color_combo.currentIndex()
        color_map = ["", "production", "staging", "development"]
        color_tag = color_map[color_index]

        # Get port forwards
        local_forwards = self.local_forwards_widget.get_forwards()
        remote_forwards = self.remote_forwards_widget.get_forwards()

        # Create connection object
        connection = Connection(
            name=name,
            hostname=hostname,
            user=user,
            port=port,
            identity_file=identity_file,
            folder=folder,
            proxy_jump=proxy_jump,
            local_forwards=local_forwards,
            remote_forwards=remote_forwards,
            color_tag=color_tag
        )

        # Validate
        errors = connection.validate()
        if errors:
            QMessageBox.critical(
                self,
                "Validation Error",
                "Please fix the following errors:\n\n" + "\n".join(f"• {error}" for error in errors)
            )
            return

        # Emit signal and close
        self.connection_saved.emit(connection)
        self.accept()


class PortForwardDialog(QDialog):
    """Dialog for adding a port forward."""

    def __init__(self, parent=None, forward_type="local"):
        super().__init__(parent)
        self.forward_type = forward_type
        self.setup_ui()

    def setup_ui(self):
        """Set up the user interface."""
        if self.forward_type == "local":
            self.setWindowTitle("Add Local Port Forward")
            label_text = "Local port → Remote host:port"
        else:
            self.setWindowTitle("Add Remote Port Forward")
            label_text = "Remote port ← Local host:port"

        layout = QVBoxLayout(self)

        # Description
        desc_label = QLabel(label_text)
        layout.addWidget(desc_label)

        # Form
        form = QFormLayout()

        if self.forward_type == "local":
            self.port1_input = QSpinBox()
            self.port1_input.setRange(1, 65535)
            self.port1_input.setValue(8080)
            form.addRow("Local Port:", self.port1_input)
        else:
            self.port1_input = QSpinBox()
            self.port1_input.setRange(1, 65535)
            self.port1_input.setValue(3000)
            form.addRow("Remote Port:", self.port1_input)

        self.host_input = QLineEdit()
        self.host_input.setText("localhost")
        form.addRow("Host:", self.host_input)

        self.port2_input = QSpinBox()
        self.port2_input.setRange(1, 65535)
        self.port2_input.setValue(80 if self.forward_type == "local" else 3000)

        if self.forward_type == "local":
            form.addRow("Remote Port:", self.port2_input)
        else:
            form.addRow("Local Port:", self.port2_input)

        layout.addLayout(form)

        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()

        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self.reject)

        add_btn = QPushButton("Add")
        add_btn.clicked.connect(self.accept)
        add_btn.setDefault(True)

        button_layout.addWidget(cancel_btn)
        button_layout.addWidget(add_btn)

        layout.addLayout(button_layout)

    def get_forward(self):
        """Get port forward tuple."""
        port1 = self.port1_input.value()
        host = self.host_input.text().strip()
        port2 = self.port2_input.value()
        return (port1, host, port2)
