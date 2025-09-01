#!/usr/bin/env python3

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Dict, Any
from .add_connection import AddConnectionDialog


class EditConnectionDialog(AddConnectionDialog):
    """Dialog for editing existing SSH connections."""
    
    def __init__(self, parent, ssh_manager, connection_info: Dict[str, Any]):
        self.connection_info = connection_info
        self.original_name = connection_info['name']
        self.original_group = connection_info['group']
        
        # Initialize parent class but override some methods
        super().__init__(parent, ssh_manager)
        
    def setup_dialog(self):
        """Set up the dialog window."""
        self.dialog.title(f"Edit SSH Connection - {self.original_name}")
        self.dialog.geometry("600x700")
        self.dialog.resizable(False, False)
        
        # Configure grid
        self.dialog.grid_rowconfigure(0, weight=1)
        self.dialog.grid_columnconfigure(0, weight=1)
        
    def create_widgets(self):
        """Create all dialog widgets."""
        # Main container with notebook for tabs
        main_frame = ttk.Frame(self.dialog)
        main_frame.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        main_frame.grid_rowconfigure(0, weight=1)
        main_frame.grid_columnconfigure(0, weight=1)
        
        # Create notebook for tabbed interface
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.grid(row=0, column=0, sticky="nsew", pady=(0, 10))
        
        # Basic tab
        self.create_basic_tab()
        
        # Advanced tab
        self.create_advanced_tab()
        
        # Button frame
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=1, column=0, sticky="ew")
        
        # Buttons (different text for edit mode)
        ttk.Button(button_frame, text="Cancel", command=self.cancel).pack(side="right", padx=(5, 0))
        ttk.Button(button_frame, text="Test Connection", command=self.test_connection).pack(side="right", padx=(5, 0))
        ttk.Button(button_frame, text="Save Changes", command=self.save_changes).pack(side="right", padx=(5, 0))
        
    def load_initial_data(self):
        """Load initial data for dropdowns and populate form with existing data."""
        # Load dropdown data first
        super().load_initial_data()
        
        # Populate form with existing connection data
        self.populate_form_with_connection_data()
        
    def populate_form_with_connection_data(self):
        """Populate form fields with existing connection data."""
        # Parse the SSH config to extract values
        config_content = self.connection_info.get('config', '')
        
        # Set basic fields
        self.name_var.set(self.connection_info['name'])
        self.group_var.set(self.connection_info['group'])
        self.icon_var.set(self.connection_info.get('icon', '💻'))
        
        # Parse SSH config content to extract values
        config_values = self.parse_ssh_config(config_content)
        
        # Set form fields from parsed config
        self.host_var.set(config_values.get('hostname', ''))
        self.user_var.set(config_values.get('user', ''))
        self.port_var.set(config_values.get('port', '22'))
        self.key_file_var.set(config_values.get('identityfile', '~/.ssh/id_ed25519'))
        
        # Advanced settings
        self.server_alive_interval_var.set(config_values.get('serveraliveinterval', '60'))
        self.server_alive_count_max_var.set(config_values.get('serveralivecountmax', '3'))
        self.connect_timeout_var.set(config_values.get('connecttimeout', '10'))
        self.compression_var.set(config_values.get('compression', 'yes'))
        self.strict_host_key_checking_var.set(config_values.get('stricthostkeychecking', 'ask'))
        
        # Developer features
        self.forward_x11_var.set(config_values.get('forwardx11', 'no').lower() == 'yes')
        self.forward_agent_var.set(config_values.get('forwardagent', 'no').lower() == 'yes')
        
        # Connection multiplexing
        self.control_master_var.set(config_values.get('controlmaster', 'auto'))
        self.control_persist_var.set(config_values.get('controlpersist', '10m'))
        
    def parse_ssh_config(self, config_content: str) -> Dict[str, str]:
        """Parse SSH config content to extract key-value pairs."""
        config_values = {}
        
        for line in config_content.split('\n'):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
                
            # Skip Host line
            if line.startswith('Host '):
                continue
                
            # Parse key-value pairs
            if ' ' in line:
                parts = line.split(' ', 1)
                if len(parts) == 2:
                    key = parts[0].lower()
                    value = parts[1].strip()
                    config_values[key] = value
                    
        return config_values
        
    def test_connection(self):
        """Test the SSH connection with current settings."""
        if not self.validate_basic_fields():
            return
            
        try:
            # Create a temporary connection for testing
            test_options = self.get_connection_options()
            test_options['name'] = f"temp_test_{test_options['name']}"
            
            # Remove original connection temporarily (in case name/group changed)
            original_config = self.ssh_manager.file_utils.read_config_file(self.original_group, self.original_name)
            if original_config:
                self.ssh_manager.remove_connection(self.original_name, self.original_group)
            
            # Add temporary connection
            self.ssh_manager.add_connection(test_options)
            
            # Test it
            result = self.ssh_manager.test_connection(test_options['name'], test_options['group'])
            
            # Remove temporary connection
            self.ssh_manager.remove_connection(test_options['name'], test_options['group'])
            
            # Restore original connection
            if original_config:
                self.ssh_manager.file_utils.write_config_file(self.original_group, self.original_name, original_config)
                self.ssh_manager.update_main_ssh_config()
            
            if result['success']:
                messagebox.showinfo("Test Successful", "Connection test passed!")
            else:
                messagebox.showerror("Test Failed", f"Connection test failed:\n{result['error']}")
                
        except Exception as e:
            messagebox.showerror("Test Error", f"Failed to test connection:\n{str(e)}")
            
    def save_changes(self):
        """Save changes to the SSH connection."""
        if not self.validate_basic_fields():
            return
            
        try:
            # Get updated options
            options = self.get_connection_options()
            
            # Remove the original connection
            self.ssh_manager.remove_connection(self.original_name, self.original_group)
            
            # Add the updated connection
            result = self.ssh_manager.add_connection(options)
            
            self.result = result
            self.dialog.destroy()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save changes:\n{str(e)}")
            
            # Try to restore original connection on error
            try:
                original_config = self.connection_info.get('config', '')
                if original_config:
                    self.ssh_manager.file_utils.write_config_file(self.original_group, self.original_name, original_config)
                    self.ssh_manager.update_main_ssh_config()
            except:
                pass  # Best effort to restore