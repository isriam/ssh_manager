#!/usr/bin/env python3

import os
import json
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class FileUtils:
    """File system utilities for SSH Manager."""
    
    def __init__(self):
        self.home_dir = Path.home()
        self.ssh_manager_dir = self.home_dir / 'ssh_manager'
        self.ssh_dir = self.home_dir / '.ssh'
        self.ssh_config_path = self.ssh_dir / 'config'
        self.backup_path = self.ssh_dir / 'config.ssh-manager-backup'
        
    def get_ssh_manager_path(self) -> Path:
        """Get the SSH Manager directory path."""
        return self.ssh_manager_dir
        
    def parse_group_path(self, group_path: str) -> Dict[str, any]:
        """
        Parse a group path into its components.
        
        Args:
            group_path: Group path like 'work/company-a/dev'
            
        Returns:
            Dict with segments, depth, parent, and name
        """
        if not group_path or not isinstance(group_path, str):
            raise ValueError('Group path must be a non-empty string')
            
        # Normalize path - remove leading/trailing slashes, collapse multiple slashes
        normalized = group_path.strip('/')
        if not normalized:
            raise ValueError('Group path cannot be empty after normalization')
            
        segments = normalized.split('/')
        depth = len(segments)
        name = segments[-1]
        parent = '/'.join(segments[:-1]) if depth > 1 else None
        
        return {
            'segments': segments,
            'depth': depth,
            'parent': parent,
            'name': name
        }
        
    def get_group_config_path(self, group_path: str) -> Path:
        """Get the config directory path for a group."""
        parsed = self.parse_group_path(group_path)
        return self.ssh_manager_dir / 'config' / Path(*parsed['segments'])
        
    def get_connection_file_path(self, group_path: str, connection_name: str) -> Path:
        """Get the file path for a specific connection."""
        group_dir = self.get_group_config_path(group_path)
        return group_dir / f"{connection_name}.conf"
        
    def ensure_directory_structure(self):
        """Create the SSH Manager directory structure."""
        directories = [
            self.ssh_manager_dir,
            self.ssh_manager_dir / 'config',
            self.ssh_manager_dir / 'config' / 'personal',
            self.ssh_manager_dir / 'config' / 'work', 
            self.ssh_manager_dir / 'config' / 'projects',
            self.ssh_manager_dir / 'keys',
            self.ssh_manager_dir / 'templates',
            self.ssh_manager_dir / 'backups',
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            
        # Ensure .ssh directory exists
        self.ssh_dir.mkdir(exist_ok=True)
        
    def create_ssh_config_backup(self) -> Dict[str, any]:
        """Create a backup of the original SSH config."""
        if self.backup_path.exists():
            return {'created': False, 'message': 'Backup already exists'}
            
        if self.ssh_config_path.exists():
            shutil.copy2(self.ssh_config_path, self.backup_path)
            return {'created': True, 'path': str(self.backup_path)}
        else:
            # Create empty backup to indicate SSH Manager was initialized
            self.backup_path.touch()
            return {'created': True, 'path': str(self.backup_path), 'empty': True}
            
    def read_config_file(self, group_path: str, connection_name: str) -> Optional[str]:
        """Read a connection config file."""
        file_path = self.get_connection_file_path(group_path, connection_name)
        if file_path.exists():
            return file_path.read_text(encoding='utf-8')
        return None
        
    def write_config_file(self, group_path: str, connection_name: str, content: str):
        """Write a connection config file."""
        file_path = self.get_connection_file_path(group_path, connection_name)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding='utf-8')
        
    def delete_config_file(self, group_path: str, connection_name: str):
        """Delete a connection config file."""
        file_path = self.get_connection_file_path(group_path, connection_name)
        if file_path.exists():
            file_path.unlink()
            
    def list_groups(self) -> List[str]:
        """List all available groups."""
        config_dir = self.ssh_manager_dir / 'config'
        if not config_dir.exists():
            return []
            
        groups = []
        for item in config_dir.rglob('*'):
            if item.is_dir():
                relative_path = item.relative_to(config_dir)
                groups.append(str(relative_path))
                
        return sorted(groups)
        
    def list_connections_in_group(self, group_path: str) -> List[str]:
        """List all connections in a specific group."""
        group_dir = self.get_group_config_path(group_path)
        if not group_dir.exists():
            return []
            
        connections = []
        for file_path in group_dir.glob('*.conf'):
            connection_name = file_path.stem
            connections.append(connection_name)
            
        return sorted(connections)
        
    def get_groups_tree(self) -> Dict[str, any]:
        """Get a hierarchical tree structure of all groups and connections."""
        tree = {}
        
        # Get all groups
        groups = self.list_groups()
        
        for group_path in groups:
            connections = self.list_connections_in_group(group_path)
            parsed = self.parse_group_path(group_path)
            
            # Build nested structure
            current = tree
            for segment in parsed['segments']:
                if segment not in current:
                    current[segment] = {'connections': [], 'subgroups': {}}
                current = current[segment]['subgroups']
                
            # Add connections to the final group
            final_group = tree
            for segment in parsed['segments'][:-1]:
                final_group = final_group[segment]['subgroups']
            if parsed['segments']:
                final_group[parsed['segments'][-1]]['connections'] = connections
                
        return tree
        
    def update_main_ssh_config(self):
        """Update the main SSH config to include SSH Manager configs."""
        # Use recursive glob pattern to match all nested .conf files
        # Note: SSH config supports wildcards including ** for recursive matching in OpenSSH 7.3+
        include_line = f"Include {self.ssh_manager_dir}/config/**/*.conf\n"

        # Read existing config
        existing_config = ""
        if self.ssh_config_path.exists():
            existing_config = self.ssh_config_path.read_text(encoding='utf-8')

        # Check if already included (look for any SSH Manager include)
        if str(self.ssh_manager_dir) in existing_config:
            # Update the include pattern if it's the old single-level pattern
            old_pattern = f"Include {self.ssh_manager_dir}/config/*/*.conf"
            if old_pattern in existing_config:
                existing_config = existing_config.replace(old_pattern, include_line.strip())
                self.ssh_config_path.write_text(existing_config, encoding='utf-8')
            return  # Already included

        # Add include line at the beginning
        new_config = include_line + "\n" + existing_config
        self.ssh_config_path.write_text(new_config, encoding='utf-8')
        
    def revert_to_original_config(self):
        """Revert to the original SSH config."""
        if self.backup_path.exists():
            if self.backup_path.stat().st_size > 0:
                shutil.copy2(self.backup_path, self.ssh_config_path)
            else:
                # Empty backup means no original config existed
                if self.ssh_config_path.exists():
                    self.ssh_config_path.unlink()
        else:
            raise FileNotFoundError("No backup found to revert to")