#!/usr/bin/env python3

import os
import subprocess
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import paramiko
from .file_utils import FileUtils
from .templates import Templates


class SSHManager:
    """Main SSH Manager class for handling SSH connections and configurations."""
    
    def __init__(self):
        self.file_utils = FileUtils()
        self.templates = Templates()
        
    def init(self):
        """Initialize SSH Manager."""
        # Create backup of original SSH config before any modifications
        self.create_ssh_config_backup_if_needed()
        
        # Initialize file structure and templates
        self.file_utils.ensure_directory_structure()
        self.templates.init()
        
        # Update main SSH config to include our files
        self.update_main_ssh_config()
        
        print(f"SSH Manager initialized at: {self.file_utils.get_ssh_manager_path()}")
        
    def create_ssh_config_backup_if_needed(self) -> Dict[str, Any]:
        """Create backup of original SSH config if needed."""
        try:
            result = self.file_utils.create_ssh_config_backup()
            if result['created']:
                print('Original SSH config backed up successfully')
            return result
        except Exception as e:
            print(f'Warning: Could not create SSH config backup: {e}')
            return {'created': False, 'error': str(e)}
            
    def add_connection(self, options: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new SSH connection."""
        # Extract options with defaults
        name = options.get('name')
        host = options.get('host')
        user = options.get('user', os.getenv('USER', ''))
        port = options.get('port', '22')
        group = options.get('group', 'personal')
        template = options.get('template', 'basic-server')
        icon = options.get('icon', '💻')
        key_file = options.get('key_file', '~/.ssh/id_ed25519')
        jump_host = options.get('jump_host', 'bastion.example.com')
        
        # Advanced options
        server_alive_interval = options.get('server_alive_interval', '60')
        server_alive_count_max = options.get('server_alive_count_max', '3')
        connect_timeout = options.get('connect_timeout', '10')
        compression = options.get('compression', 'yes')
        strict_host_key_checking = options.get('strict_host_key_checking', 'ask')
        
        # Developer features
        control_master = options.get('control_master', 'auto')
        control_path = options.get('control_path', '~/.ssh/control-%h-%p-%r')
        control_persist = options.get('control_persist', '10m')
        forward_x11 = options.get('forward_x11', 'no')
        forward_agent = options.get('forward_agent', 'no')
        
        # Port forwards
        local_forwards = options.get('local_forwards', [])
        remote_forwards = options.get('remote_forwards', [])
        dynamic_forward = options.get('dynamic_forward', '')
        
        # Validation
        if not name or not host:
            raise ValueError("Name and host are required")
            
        # Check if connection already exists
        existing_config = self.file_utils.read_config_file(group, name)
        if existing_config:
            raise ValueError(f"Connection '{name}' already exists in group '{group}'")
            
        # Prepare template variables
        template_variables = {
            'name': name,
            'host': host,
            'user_line': f'    User {user}' if user else '',
            'port': port,
            'key_file': key_file,
            'jump_host': jump_host,
            'server_alive_interval': server_alive_interval,
            'server_alive_count_max': server_alive_count_max,
            'connect_timeout': connect_timeout,
            'compression': compression,
            'strict_host_key_checking': strict_host_key_checking,
            'control_master': control_master,
            'control_path': control_path,
            'control_persist': control_persist,
            'forward_x11': forward_x11,
            'forward_agent': forward_agent,
            'local_forwards': self.templates.format_port_forwards(local_forwards),
            'remote_forwards': self.templates.format_remote_forwards(remote_forwards),
            'dynamic_forward': f'    DynamicForward {dynamic_forward}' if dynamic_forward else ''
        }
        
        # Generate config content from template
        config_content = self.templates.create_from_template(template, template_variables)
        
        # Add icon metadata as comment
        config_with_icon = f"# SSH Manager Icon: {icon}\n{config_content}"
        
        # Write config file
        self.file_utils.write_config_file(group, name, config_with_icon)
        
        # Update main SSH config
        self.update_main_ssh_config()
        
        return {'success': True, 'name': name, 'group': group}
        
    def list_connections(self, group_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all connections, optionally filtered by group."""
        connections = []
        groups = [group_filter] if group_filter else self.file_utils.list_groups()
        
        for group in groups:
            connection_names = self.file_utils.list_connections_in_group(group)
            for name in connection_names:
                config_content = self.file_utils.read_config_file(group, name)
                
                # Extract icon from comment if present
                icon = '💻'  # default
                if config_content and config_content.startswith('# SSH Manager Icon:'):
                    first_line = config_content.split('\n')[0]
                    icon = first_line.split('# SSH Manager Icon: ')[1]
                    
                connections.append({
                    'name': name,
                    'group': group,
                    'icon': icon,
                    'config': config_content
                })
                
        return connections
        
    def remove_connection(self, name: str, group: str):
        """Remove a connection."""
        self.file_utils.delete_config_file(group, name)
        self.update_main_ssh_config()
        
    def update_connection(self, name: str, group: str, updates: Dict[str, Any]):
        """Update an existing connection."""
        # For now, we'll recreate the connection with new options
        # This is simpler than parsing and updating the existing config
        existing_config = self.file_utils.read_config_file(group, name)
        if not existing_config:
            raise ValueError(f"Connection '{name}' not found in group '{group}'")
            
        # Remove old connection and add updated one
        self.remove_connection(name, group)
        
        # Merge updates with defaults for add_connection
        connection_options = {'name': name, 'group': group}
        connection_options.update(updates)
        
        return self.add_connection(connection_options)
        
    def test_connection(self, name: str, group: str) -> Dict[str, Any]:
        """Test SSH connection."""
        config_content = self.file_utils.read_config_file(group, name)
        if not config_content:
            raise ValueError(f"Connection '{name}' not found in group '{group}'")
            
        # Parse basic connection info from config
        host = None
        username = None
        port = 22
        key_file = None
        
        for line in config_content.split('\n'):
            line = line.strip()
            if line.startswith('HostName '):
                host = line.split('HostName ')[1]
            elif line.startswith('User '):
                username = line.split('User ')[1]
            elif line.startswith('Port '):
                port = int(line.split('Port ')[1])
            elif line.startswith('IdentityFile '):
                key_file = line.split('IdentityFile ')[1]
                
        if not host:
            raise ValueError("Could not parse hostname from connection config")
            
        # Use paramiko to test connection
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Expand key file path
            if key_file and key_file.startswith('~'):
                key_file = os.path.expanduser(key_file)
                
            connect_args = {
                'hostname': host,
                'port': port,
                'timeout': 10
            }
            
            if username:
                connect_args['username'] = username
                
            if key_file and os.path.exists(key_file):
                connect_args['key_filename'] = key_file
                
            ssh.connect(**connect_args)
            ssh.close()
            
            return {'success': True, 'message': 'Connection successful'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def connect_to_server(self, name: str, group: str) -> Dict[str, Any]:
        """Launch SSH connection in terminal."""
        try:
            # Use system SSH command which will read our config
            cmd = f"ssh {name}"
            
            # Try to open in a new terminal
            terminal_commands = [
                ['gnome-terminal', '--', 'bash', '-c', f'{cmd}; exec bash'],
                ['xfce4-terminal', '-e', f'bash -c "{cmd}; exec bash"'],
                ['konsole', '-e', f'bash -c "{cmd}; exec bash"'],
                ['xterm', '-e', f'bash -c "{cmd}; exec bash"']
            ]
            
            for terminal_cmd in terminal_commands:
                try:
                    subprocess.Popen(terminal_cmd)
                    return {'success': True, 'message': f'SSH connection to {name} launched in terminal'}
                except FileNotFoundError:
                    continue
                    
            # If no GUI terminal found, just return the command
            return {
                'success': True, 
                'message': f'Run this command in your terminal: {cmd}',
                'command': cmd
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def get_templates(self) -> List[Dict[str, str]]:
        """Get available templates."""
        templates = []
        for template_name in self.templates.get_template_names():
            template_info = self.templates.get_template(template_name)
            templates.append({
                'id': template_name,
                'name': template_info['name'],
                'description': template_info['description']
            })
        return templates
        
    def get_groups(self) -> List[str]:
        """Get list of all groups."""
        return self.file_utils.list_groups()
        
    def get_groups_tree(self) -> Dict[str, Any]:
        """Get hierarchical group tree."""
        return self.file_utils.get_groups_tree()
        
    def update_main_ssh_config(self):
        """Update main SSH config to include SSH Manager configs."""
        self.file_utils.update_main_ssh_config()
        
    def create_backup(self, backup_path: Optional[str] = None) -> Dict[str, Any]:
        """Create a backup of all SSH Manager configurations."""
        if not backup_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = str(self.file_utils.ssh_manager_dir / f"backup_{timestamp}.zip")
            
        try:
            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                config_dir = self.file_utils.ssh_manager_dir / 'config'
                
                for file_path in config_dir.rglob('*.conf'):
                    arcname = file_path.relative_to(self.file_utils.ssh_manager_dir)
                    zipf.write(file_path, arcname)
                    
            return {'success': True, 'backup_path': backup_path}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def revert_to_original_config(self) -> Dict[str, Any]:
        """Revert to original SSH config."""
        try:
            self.file_utils.revert_to_original_config()
            return {'success': True, 'message': 'Reverted to original SSH config'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def get_ssh_manager_state(self) -> Dict[str, Any]:
        """Get the current state of SSH Manager integration."""
        backup_exists = self.file_utils.backup_path.exists()
        
        # Check if main config includes SSH Manager
        integrated = False
        if self.file_utils.ssh_config_path.exists():
            config_content = self.file_utils.ssh_config_path.read_text()
            integrated = str(self.file_utils.ssh_manager_dir) in config_content
            
        return {
            'integrated': integrated,
            'backup_exists': backup_exists,
            'backup_path': str(self.file_utils.backup_path) if backup_exists else None
        }