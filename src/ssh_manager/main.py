#!/usr/bin/env python3

"""
SSH Manager - Main Entry Point

This module provides both CLI and GUI entry points for the SSH Manager application.
"""

import sys
import argparse
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from backend.ssh_manager import SSHManager


def cli_main():
    """Command-line interface main function."""
    parser = argparse.ArgumentParser(description='SSH Manager - Manage SSH connections through organized folders')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Init command
    init_parser = subparsers.add_parser('init', help='Initialize SSH Manager')
    
    # Add command
    add_parser = subparsers.add_parser('add', help='Add new SSH connection')
    add_parser.add_argument('-n', '--name', required=True, help='Connection name')
    add_parser.add_argument('--host', required=True, help='Hostname or IP address')
    add_parser.add_argument('-u', '--user', help='Username')
    add_parser.add_argument('-p', '--port', default='22', help='Port (default: 22)')
    add_parser.add_argument('-g', '--group', default='personal', help='Group (default: personal)')
    add_parser.add_argument('-t', '--template', default='basic-server', help='Template (default: basic-server)')
    add_parser.add_argument('-k', '--key-file', default='~/.ssh/id_ed25519', help='SSH key file')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List SSH connections')
    list_parser.add_argument('-g', '--group', help='Filter by group')
    
    # Remove command
    remove_parser = subparsers.add_parser('remove', help='Remove SSH connection')
    remove_parser.add_argument('name', help='Connection name')
    remove_parser.add_argument('-g', '--group', default='personal', help='Group (default: personal)')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test SSH connection')
    test_parser.add_argument('name', help='Connection name')
    test_parser.add_argument('-g', '--group', default='personal', help='Group (default: personal)')
    
    # Connect command
    connect_parser = subparsers.add_parser('connect', help='Connect to SSH server')
    connect_parser.add_argument('name', help='Connection name')
    connect_parser.add_argument('-g', '--group', default='personal', help='Group (default: personal)')
    
    # Groups command
    groups_parser = subparsers.add_parser('groups', help='List all groups')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Create backup of configurations')
    backup_parser.add_argument('-o', '--output', help='Output file path')
    
    # GUI command
    gui_parser = subparsers.add_parser('gui', help='Launch GUI interface')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
        
    # Initialize SSH Manager
    ssh_manager = SSHManager()
    
    try:
        if args.command == 'init':
            ssh_manager.init()
            print("✅ SSH Manager initialized successfully")
            
        elif args.command == 'add':
            ssh_manager.init()  # Ensure initialized
            options = {
                'name': args.name,
                'host': args.host,
                'user': args.user,
                'port': args.port,
                'group': args.group,
                'template': args.template,
                'key_file': args.key_file
            }
            result = ssh_manager.add_connection(options)
            print(f"✅ Connection '{args.name}' added to group '{args.group}'")
            
        elif args.command == 'list':
            ssh_manager.init()
            connections = ssh_manager.list_connections(args.group)
            
            if not connections:
                print("No connections found")
                return
                
            print(f"\n📋 SSH Connections ({len(connections)} found):")
            print("-" * 60)
            
            current_group = None
            for conn in sorted(connections, key=lambda x: (x['group'], x['name'])):
                if conn['group'] != current_group:
                    current_group = conn['group']
                    print(f"\n📁 Group: {current_group}")
                    
                print(f"  {conn['icon']} {conn['name']}")
                
        elif args.command == 'remove':
            ssh_manager.init()
            ssh_manager.remove_connection(args.name, args.group)
            print(f"✅ Connection '{args.name}' removed from group '{args.group}'")
            
        elif args.command == 'test':
            ssh_manager.init()
            result = ssh_manager.test_connection(args.name, args.group)
            
            if result['success']:
                print(f"✅ Connection test successful: {result['message']}")
            else:
                print(f"❌ Connection test failed: {result['error']}")
                sys.exit(1)
                
        elif args.command == 'connect':
            ssh_manager.init()
            result = ssh_manager.connect_to_server(args.name, args.group)
            
            if result['success']:
                print(f"🔗 {result['message']}")
                if 'command' in result:
                    print(f"Command: {result['command']}")
            else:
                print(f"❌ Connection failed: {result['error']}")
                sys.exit(1)
                
        elif args.command == 'groups':
            ssh_manager.init()
            groups = ssh_manager.get_groups()
            
            if not groups:
                print("No groups found")
                return
                
            print(f"\n📁 Groups ({len(groups)} found):")
            for group in sorted(groups):
                connections = ssh_manager.list_connections(group)
                print(f"  📂 {group} ({len(connections)} connections)")
                
        elif args.command == 'backup':
            ssh_manager.init()
            result = ssh_manager.create_backup(args.output)
            
            if result['success']:
                print(f"✅ Backup created: {result['backup_path']}")
            else:
                print(f"❌ Backup failed: {result['error']}")
                sys.exit(1)
                
        elif args.command == 'gui':
            launch_gui()
            
    except KeyboardInterrupt:
        print("\n\n⏹️  SSH Manager terminated by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def launch_gui():
    """Launch the GUI interface."""
    try:
        from gui.main import SSHManagerGUI
        
        print("🚀 Launching SSH Manager GUI...")
        app = SSHManagerGUI()
        app.run()
        
    except ImportError as e:
        print(f"❌ GUI not available: {e}")
        print("💡 Try: pip install tkinter")
        sys.exit(1)
    except Exception as e:
        print(f"❌ GUI failed to start: {e}")
        sys.exit(1)


def gui_main():
    """GUI entry point (used by setup.py)."""
    launch_gui()


def main():
    """Main entry point - defaults to GUI if no arguments provided."""
    if len(sys.argv) == 1:
        # No arguments provided, launch GUI
        launch_gui()
    else:
        # Arguments provided, use CLI
        cli_main()


if __name__ == "__main__":
    main()