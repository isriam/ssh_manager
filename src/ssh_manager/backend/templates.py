#!/usr/bin/env python3

import json
from typing import Dict, List
from .file_utils import FileUtils


class Templates:
    """SSH configuration template management."""
    
    def __init__(self):
        self.file_utils = FileUtils()
        self.default_templates = {
            'basic-server': {
                'name': 'Basic Server',
                'description': 'Simple SSH connection with username and host',
                'content': """# Basic SSH Connection
Host {name}
    HostName {host}
{user_line}
    Port {port}
    IdentityFile {key_file}
    
    # Essential Connection Settings
    ServerAliveInterval {server_alive_interval}
    ServerAliveCountMax {server_alive_count_max}
    ConnectTimeout {connect_timeout}
    Compression {compression}
    StrictHostKeyChecking {strict_host_key_checking}
    
    # Developer Features
    ControlMaster {control_master}
    ControlPath {control_path}
    ControlPersist {control_persist}
    ForwardX11 {forward_x11}
    ForwardAgent {forward_agent}
"""
            },
            
            'aws-ec2': {
                'name': 'AWS EC2 Instance',
                'description': 'AWS EC2 instance with key-based authentication',
                'content': """# AWS EC2 Instance
Host {name}
    HostName {host}
{user_line}
    Port {port}
    IdentityFile {key_file}
    
    # AWS EC2 Optimized Settings
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ConnectTimeout 30
    Compression yes
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    
    # Connection Multiplexing for Speed
    ControlMaster auto
    ControlPath ~/.ssh/control-%h-%p-%r
    ControlPersist 10m
"""
            },
            
            'jump-host': {
                'name': 'Jump Host (Bastion)',
                'description': 'Connection through a jump host or bastion server',
                'content': """# Jump Host Configuration
Host {name}
    HostName {host}
{user_line}
    Port {port}
    IdentityFile {key_file}
    ProxyJump {jump_host}
    
    # Jump Host Settings
    ServerAliveInterval {server_alive_interval}
    ServerAliveCountMax {server_alive_count_max}
    ConnectTimeout {connect_timeout}
    Compression {compression}
    StrictHostKeyChecking {strict_host_key_checking}
    
    # Connection Management
    ControlMaster {control_master}
    ControlPath {control_path}
    ControlPersist {control_persist}
"""
            },
            
            'developer': {
                'name': 'Developer Workstation',
                'description': 'Development server with X11 forwarding and port tunneling',
                'content': """# Developer Workstation
Host {name}
    HostName {host}
{user_line}
    Port {port}
    IdentityFile {key_file}
    
    # Developer Features
    ForwardX11 yes
    ForwardX11Trusted yes
    ForwardAgent yes
    
    # Port Forwarding
{local_forwards}
{remote_forwards}
{dynamic_forward}
    
    # Connection Settings
    ServerAliveInterval {server_alive_interval}
    ServerAliveCountMax {server_alive_count_max}
    ConnectTimeout {connect_timeout}
    Compression {compression}
    StrictHostKeyChecking {strict_host_key_checking}
    
    # Connection Multiplexing
    ControlMaster {control_master}
    ControlPath {control_path}
    ControlPersist {control_persist}
"""
            }
        }
        
    def init(self):
        """Initialize the template system."""
        self.file_utils.ensure_directory_structure()
        
    def get_template_names(self) -> List[str]:
        """Get list of available template names."""
        return list(self.default_templates.keys())
        
    def get_template(self, template_name: str) -> Dict[str, str]:
        """Get a specific template."""
        if template_name not in self.default_templates:
            raise ValueError(f"Template '{template_name}' not found")
        return self.default_templates[template_name]
        
    def create_from_template(self, template_name: str, variables: Dict[str, str]) -> str:
        """Create SSH config content from template with variable substitution."""
        template = self.get_template(template_name)
        content = template['content']
        
        # Format the template with variables
        try:
            return content.format(**variables)
        except KeyError as e:
            raise ValueError(f"Missing template variable: {e}")
            
    def format_port_forwards(self, forwards: List[Dict[str, str]]) -> str:
        """Format port forward entries for SSH config."""
        if not forwards:
            return ""
            
        lines = []
        for forward in forwards:
            if forward.get('local_port') and forward.get('remote_port'):
                local_port = forward['local_port']
                remote_host = forward.get('remote_host', 'localhost')
                remote_port = forward['remote_port']
                lines.append(f"    LocalForward {local_port} {remote_host}:{remote_port}")
                
        return "\n".join(lines) if lines else ""
        
    def format_remote_forwards(self, forwards: List[Dict[str, str]]) -> str:
        """Format remote port forward entries for SSH config."""
        if not forwards:
            return ""
            
        lines = []
        for forward in forwards:
            if forward.get('remote_port') and forward.get('local_port'):
                remote_port = forward['remote_port']
                local_host = forward.get('local_host', 'localhost')
                local_port = forward['local_port']
                lines.append(f"    RemoteForward {remote_port} {local_host}:{local_port}")
                
        return "\n".join(lines) if lines else ""