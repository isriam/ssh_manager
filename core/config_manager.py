"""
SSH Config Manager

Manages SSH configuration files and folder structure.
Handles Include statement integration with ~/.ssh/config.
"""

import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from .connection import Connection


class ConfigManager:
    """
    Manages SSH configuration files and folder structure.

    Handles:
    - Directory structure creation
    - SSH config file operations (CRUD)
    - Include statement management
    - Folder hierarchy scanning
    - Backup of existing SSH config
    """

    def __init__(self, base_path: Optional[Path] = None):
        """
        Initialize ConfigManager.

        Args:
            base_path: Base directory for SSH Manager (defaults to ~/ssh_manager/groups)
        """
        if base_path:
            self.base_path = Path(base_path)
        else:
            self.base_path = Path.home() / "ssh_manager" / "groups"

        self.ssh_dir = Path.home() / ".ssh"
        self.ssh_config = self.ssh_dir / "config"
        self.backup_path = self.ssh_dir / "config.backup"

    def initialize(self) -> Dict[str, Any]:
        """
        Initialize SSH Manager.

        Creates:
        - ~/ssh_manager/groups/ directory structure
        - Default folders (work, personal)
        - Backup of existing ~/.ssh/config
        - Include statement in ~/.ssh/config

        Returns:
            Dict with initialization results
        """
        result = {
            'created_dirs': False,
            'created_backup': False,
            'added_include': False,
            'existing_connections': 0,
            'message': ''
        }

        # Create base directory structure
        if not self.base_path.exists():
            self.base_path.mkdir(parents=True, exist_ok=True)
            result['created_dirs'] = True

        # Create default folders
        default_folders = ['work', 'personal']
        for folder in default_folders:
            folder_path = self.base_path / folder
            folder_path.mkdir(exist_ok=True)

        # Ensure .ssh directory exists
        self.ssh_dir.mkdir(exist_ok=True, mode=0o700)

        # Check existing SSH config
        existing_info = self.check_existing_ssh_config()
        result['existing_connections'] = existing_info['connection_count']

        # Backup existing SSH config if it exists and hasn't been backed up
        if self.ssh_config.exists() and not self.backup_path.exists():
            shutil.copy2(self.ssh_config, self.backup_path)
            result['created_backup'] = True

        # Add Include statement if not present
        include_added = self.add_include_statement()
        result['added_include'] = include_added

        # Build result message
        messages = []
        if result['created_dirs']:
            messages.append(f"Created directory structure at {self.base_path}")
        if result['created_backup']:
            messages.append(f"Backed up existing SSH config to {self.backup_path}")
        if result['added_include']:
            messages.append("Added SSH Manager Include statement to ~/.ssh/config")
        if result['existing_connections'] > 0:
            messages.append(f"Detected {result['existing_connections']} existing SSH connections")

        result['message'] = '\n'.join(messages) if messages else 'SSH Manager already initialized'

        return result

    def check_existing_ssh_config(self) -> Dict[str, Any]:
        """
        Check existing ~/.ssh/config for connections.

        Returns:
            Dict with existing config info
        """
        result = {
            'exists': False,
            'has_include': False,
            'connection_count': 0,
            'connections': []
        }

        if not self.ssh_config.exists():
            return result

        result['exists'] = True
        content = self.ssh_config.read_text()

        # Check if Include statement already exists
        include_pattern = f"Include {self.base_path}"
        result['has_include'] = include_pattern in content

        # Count Host entries (rough estimate of connections)
        host_lines = [line for line in content.split('\n') if line.strip().startswith('Host ')]
        result['connection_count'] = len(host_lines)
        result['connections'] = [line.strip().split('Host ')[1] for line in host_lines]

        return result

    def add_include_statement(self) -> bool:
        """
        Add Include statement to ~/.ssh/config.

        Returns:
            True if statement was added, False if already present
        """
        include_line = f"Include {self.base_path}/**/*.conf"

        # Create empty config if it doesn't exist
        if not self.ssh_config.exists():
            self.ssh_config.write_text(f"# SSH Manager - Auto-generated connections\n{include_line}\n")
            return True

        # Check if Include statement already exists
        content = self.ssh_config.read_text()
        if include_line in content:
            return False

        # Add Include statement at the END of the file
        # This ensures user's existing configs take precedence
        if not content.endswith('\n'):
            content += '\n'

        content += f"\n# SSH Manager - Auto-generated connections\n{include_line}\n"
        self.ssh_config.write_text(content)
        return True

    def save_connection(self, conn: Connection) -> None:
        """
        Save connection to .conf file.

        Args:
            conn: Connection object to save

        Raises:
            ValueError: If connection validation fails
        """
        # Validate connection
        errors = conn.validate()
        if errors:
            raise ValueError(f"Connection validation failed: {', '.join(errors)}")

        # Create folder path if it doesn't exist
        folder_path = self.base_path / conn.folder
        folder_path.mkdir(parents=True, exist_ok=True)

        # Write config file
        config_file = folder_path / f"{conn.name}.conf"
        config_content = conn.to_ssh_config()
        config_file.write_text(config_content)

    def load_connection(self, folder: str, name: str) -> Connection:
        """
        Load connection from .conf file.

        Args:
            folder: Folder path (e.g., "work/clients/acme")
            name: Connection name

        Returns:
            Connection object

        Raises:
            FileNotFoundError: If connection file doesn't exist
        """
        config_file = self.base_path / folder / f"{name}.conf"

        if not config_file.exists():
            raise FileNotFoundError(f"Connection '{name}' not found in folder '{folder}'")

        content = config_file.read_text()
        return Connection.from_ssh_config(content, name=name, folder=folder)

    def delete_connection(self, folder: str, name: str) -> None:
        """
        Delete connection .conf file.

        Args:
            folder: Folder path
            name: Connection name

        Raises:
            FileNotFoundError: If connection file doesn't exist
        """
        config_file = self.base_path / folder / f"{name}.conf"

        if not config_file.exists():
            raise FileNotFoundError(f"Connection '{name}' not found in folder '{folder}'")

        config_file.unlink()

    def connection_exists(self, folder: str, name: str) -> bool:
        """
        Check if connection exists.

        Args:
            folder: Folder path
            name: Connection name

        Returns:
            True if connection exists
        """
        config_file = self.base_path / folder / f"{name}.conf"
        return config_file.exists()

    def list_connections(self, folder: Optional[str] = None) -> List[Connection]:
        """
        List all connections, optionally filtered by folder.

        Args:
            folder: Optional folder filter

        Returns:
            List of Connection objects
        """
        connections = []

        if folder:
            # List connections in specific folder
            folder_path = self.base_path / folder
            if folder_path.exists():
                for config_file in folder_path.glob("*.conf"):
                    try:
                        conn = self.load_connection(folder, config_file.stem)
                        connections.append(conn)
                    except Exception as e:
                        print(f"Warning: Failed to load {config_file}: {e}")
        else:
            # List all connections recursively
            for config_file in self.base_path.rglob("*.conf"):
                try:
                    # Calculate relative folder path
                    relative_path = config_file.parent.relative_to(self.base_path)
                    folder_str = str(relative_path)
                    conn = self.load_connection(folder_str, config_file.stem)
                    connections.append(conn)
                except Exception as e:
                    print(f"Warning: Failed to load {config_file}: {e}")

        return connections

    def move_connection(self, conn: Connection, new_folder: str) -> None:
        """
        Move connection to different folder.

        Args:
            conn: Connection object
            new_folder: New folder path

        Raises:
            FileNotFoundError: If source connection doesn't exist
            ValueError: If destination already exists
        """
        old_file = self.base_path / conn.folder / f"{conn.name}.conf"
        new_folder_path = self.base_path / new_folder
        new_file = new_folder_path / f"{conn.name}.conf"

        if not old_file.exists():
            raise FileNotFoundError(f"Source connection not found: {old_file}")

        if new_file.exists():
            raise ValueError(f"Connection '{conn.name}' already exists in folder '{new_folder}'")

        # Create destination folder
        new_folder_path.mkdir(parents=True, exist_ok=True)

        # Move file
        shutil.move(str(old_file), str(new_file))

        # Update connection object
        conn.folder = new_folder

    def create_folder(self, folder_path: str) -> None:
        """
        Create new folder.

        Args:
            folder_path: Folder path (e.g., "work/clients/acme")
        """
        folder = self.base_path / folder_path
        folder.mkdir(parents=True, exist_ok=True)

    def delete_folder(self, folder_path: str, recursive: bool = False) -> None:
        """
        Delete folder.

        Args:
            folder_path: Folder path
            recursive: If True, delete even if not empty

        Raises:
            ValueError: If folder not empty and recursive=False
        """
        folder = self.base_path / folder_path

        if not folder.exists():
            raise FileNotFoundError(f"Folder not found: {folder_path}")

        if not recursive and any(folder.iterdir()):
            raise ValueError(f"Folder '{folder_path}' is not empty. Use recursive=True to force delete.")

        if recursive:
            shutil.rmtree(folder)
        else:
            folder.rmdir()

    def list_folders(self) -> List[str]:
        """
        List all folders.

        Returns:
            List of folder paths (relative to base_path)
        """
        folders = []

        for item in self.base_path.rglob("*"):
            if item.is_dir():
                relative_path = item.relative_to(self.base_path)
                folders.append(str(relative_path))

        return sorted(folders)

    def get_folder_tree(self) -> Dict[str, Any]:
        """
        Build hierarchical folder tree with connections.

        Returns:
            Nested dict representing folder structure
        """
        tree = {}

        # Scan all connections
        for config_file in self.base_path.rglob("*.conf"):
            # Get relative folder path
            folder_parts = config_file.parent.relative_to(self.base_path).parts

            # Build nested structure
            current = tree
            for part in folder_parts:
                if part not in current:
                    current[part] = {'_folders': {}, '_connections': []}
                current = current[part]['_folders']

            # Add connection to leaf folder
            parent = tree
            for part in folder_parts[:-1]:
                parent = parent[part]['_folders']

            leaf_folder = folder_parts[-1] if folder_parts else ''
            if leaf_folder:
                if leaf_folder not in parent:
                    parent[leaf_folder] = {'_folders': {}, '_connections': []}
                parent[leaf_folder]['_connections'].append(config_file.stem)
            else:
                # Root level connection
                if '_connections' not in tree:
                    tree['_connections'] = []
                tree['_connections'].append(config_file.stem)

        return tree

    def export_connections(self, output_path: Path) -> None:
        """
        Export all connections to a directory.

        Args:
            output_path: Destination directory
        """
        output_path.mkdir(parents=True, exist_ok=True)

        for config_file in self.base_path.rglob("*.conf"):
            relative_path = config_file.relative_to(self.base_path)
            dest_file = output_path / relative_path
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(config_file, dest_file)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about connections and folders.

        Returns:
            Dict with stats
        """
        all_connections = self.list_connections()
        folders = self.list_folders()

        return {
            'total_connections': len(all_connections),
            'total_folders': len(folders),
            'connections_by_folder': self._count_connections_by_folder(),
            'base_path': str(self.base_path),
            'ssh_config': str(self.ssh_config)
        }

    def _count_connections_by_folder(self) -> Dict[str, int]:
        """Count connections per folder."""
        counts = {}

        for config_file in self.base_path.rglob("*.conf"):
            folder = str(config_file.parent.relative_to(self.base_path))
            counts[folder] = counts.get(folder, 0) + 1

        return counts
