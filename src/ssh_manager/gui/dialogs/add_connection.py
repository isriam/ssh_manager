#!/usr/bin/env python3

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import os
from typing import Dict, Any, Optional


class AddConnectionDialog:
    """Dialog for adding new SSH connections."""
    
    def __init__(self, parent, ssh_manager):
        self.parent = parent
        self.ssh_manager = ssh_manager
        self.result = None
        
        self.dialog = tk.Toplevel(parent)
        self.setup_dialog()
        self.create_widgets()
        self.load_initial_data()
        
        # Make dialog modal
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        # Center the dialog
        self.center_dialog()
        
        # Wait for dialog to close
        self.parent.wait_window(self.dialog)
        
    def setup_dialog(self):
        """Set up the dialog window."""
        self.dialog.title("Add SSH Connection")
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
        
        # Buttons
        ttk.Button(button_frame, text="Cancel", command=self.cancel).pack(side="right", padx=(5, 0))
        ttk.Button(button_frame, text="Test Connection", command=self.test_connection).pack(side="right", padx=(5, 0))
        ttk.Button(button_frame, text="Add Connection", command=self.add_connection).pack(side="right", padx=(5, 0))
        
    def create_basic_tab(self):
        """Create the basic connection settings tab."""
        basic_frame = ttk.Frame(self.notebook)
        self.notebook.add(basic_frame, text="Basic")
        
        # Configure grid (increased range for helper text rows)
        for i in range(15):
            basic_frame.grid_rowconfigure(i, weight=0)
        basic_frame.grid_columnconfigure(1, weight=1)
        
        row = 0
        
        # Connection Name
        ttk.Label(basic_frame, text="Connection Name:").grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(basic_frame, textvariable=self.name_var, width=40).grid(row=row, column=1, sticky="ew", padx=(0, 10), pady=5)
        row += 1
        
        # Hostname
        ttk.Label(basic_frame, text="Hostname/IP:").grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)
        self.host_var = tk.StringVar()
        ttk.Entry(basic_frame, textvariable=self.host_var, width=40).grid(row=row, column=1, sticky="ew", padx=(0, 10), pady=5)
        row += 1
        
        # Username
        username_label = ttk.Label(basic_frame, text="Username (optional):")
        username_label.grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)

        self.user_var = tk.StringVar(value=os.getenv('USER', ''))
        username_entry = ttk.Entry(basic_frame, textvariable=self.user_var, width=40)
        username_entry.grid(row=row, column=1, sticky="ew", padx=(0, 10), pady=5)

        # Add helper text
        username_help = ttk.Label(basic_frame, text=f"Defaults to: {os.getenv('USER', 'current user')}",
                                 font=("Arial", 8), foreground="gray")
        username_help.grid(row=row+1, column=1, sticky="w", padx=(0, 10), pady=0)
        row += 2
        
        # Port
        ttk.Label(basic_frame, text="Port:").grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)
        self.port_var = tk.StringVar(value="22")
        ttk.Entry(basic_frame, textvariable=self.port_var, width=10).grid(row=row, column=1, sticky="w", padx=(0, 10), pady=5)
        row += 1
        
        # Group
        ttk.Label(basic_frame, text="Group/Folder:").grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)
        self.group_var = tk.StringVar(value="personal")
        group_combo = ttk.Combobox(basic_frame, textvariable=self.group_var, width=37)
        group_combo.grid(row=row, column=1, sticky="ew", padx=(0, 10), pady=5)
        self.group_combo = group_combo

        # Add helper text for group
        group_help = ttk.Label(basic_frame, text="Select existing or type new. Use 'folder/subfolder' for nested groups",
                              font=("Arial", 8), foreground="gray")
        group_help.grid(row=row+1, column=1, sticky="w", padx=(0, 10), pady=0)
        row += 2
        
        # Template
        ttk.Label(basic_frame, text="Template:").grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)
        self.template_var = tk.StringVar(value="basic-server")
        template_combo = ttk.Combobox(basic_frame, textvariable=self.template_var, width=37, state="readonly")
        template_combo.grid(row=row, column=1, sticky="ew", padx=(0, 10), pady=5)
        self.template_combo = template_combo
        row += 1
        
        # Icon
        ttk.Label(basic_frame, text="Icon:").grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)
        icon_frame = ttk.Frame(basic_frame)
        icon_frame.grid(row=row, column=1, sticky="ew", padx=(0, 10), pady=5)
        
        self.icon_var = tk.StringVar(value="💻")
        icon_entry = ttk.Entry(icon_frame, textvariable=self.icon_var, width=5)
        icon_entry.pack(side="left")
        
        # Common icons
        common_icons = ["💻", "🖥️", "🗄️", "☁️", "🚀", "🔧", "📱", "🌐"]
        for icon in common_icons:
            ttk.Button(icon_frame, text=icon, width=3, 
                      command=lambda i=icon: self.icon_var.set(i)).pack(side="left", padx=2)
        row += 1
        
        # SSH Key File
        ttk.Label(basic_frame, text="SSH Key File:").grid(row=row, column=0, sticky="w", padx=(10, 5), pady=5)
        key_frame = ttk.Frame(basic_frame)
        key_frame.grid(row=row, column=1, sticky="ew", padx=(0, 10), pady=5)
        key_frame.grid_columnconfigure(0, weight=1)
        
        self.key_file_var = tk.StringVar(value="~/.ssh/id_ed25519")
        ttk.Entry(key_frame, textvariable=self.key_file_var).grid(row=0, column=0, sticky="ew", padx=(0, 5))
        ttk.Button(key_frame, text="Browse", command=self.browse_key_file).grid(row=0, column=1)
        row += 1
        
    def create_advanced_tab(self):
        """Create the advanced connection settings tab."""
        advanced_frame = ttk.Frame(self.notebook)
        self.notebook.add(advanced_frame, text="Advanced")
        
        # Create scrollable frame
        canvas = tk.Canvas(advanced_frame)
        scrollbar = ttk.Scrollbar(advanced_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        
        canvas.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")
        
        advanced_frame.grid_rowconfigure(0, weight=1)
        advanced_frame.grid_columnconfigure(0, weight=1)
        
        # Configure scrollable frame
        scrollable_frame.grid_columnconfigure(1, weight=1)
        
        row = 0
        
        # Connection Settings
        ttk.Label(scrollable_frame, text="Connection Settings", font=("Arial", 10, "bold")).grid(row=row, column=0, columnspan=2, sticky="w", padx=10, pady=(10, 5))
        row += 1
        
        # Server Alive Interval
        ttk.Label(scrollable_frame, text="Server Alive Interval:").grid(row=row, column=0, sticky="w", padx=(20, 5), pady=2)
        self.server_alive_interval_var = tk.StringVar(value="60")
        ttk.Entry(scrollable_frame, textvariable=self.server_alive_interval_var, width=10).grid(row=row, column=1, sticky="w", padx=(0, 10), pady=2)
        row += 1
        
        # Server Alive Count Max
        ttk.Label(scrollable_frame, text="Server Alive Count Max:").grid(row=row, column=0, sticky="w", padx=(20, 5), pady=2)
        self.server_alive_count_max_var = tk.StringVar(value="3")
        ttk.Entry(scrollable_frame, textvariable=self.server_alive_count_max_var, width=10).grid(row=row, column=1, sticky="w", padx=(0, 10), pady=2)
        row += 1
        
        # Connect Timeout
        ttk.Label(scrollable_frame, text="Connect Timeout:").grid(row=row, column=0, sticky="w", padx=(20, 5), pady=2)
        self.connect_timeout_var = tk.StringVar(value="10")
        ttk.Entry(scrollable_frame, textvariable=self.connect_timeout_var, width=10).grid(row=row, column=1, sticky="w", padx=(0, 10), pady=2)
        row += 1
        
        # Compression
        ttk.Label(scrollable_frame, text="Compression:").grid(row=row, column=0, sticky="w", padx=(20, 5), pady=2)
        self.compression_var = tk.StringVar(value="yes")
        compression_combo = ttk.Combobox(scrollable_frame, textvariable=self.compression_var, values=["yes", "no"], width=10, state="readonly")
        compression_combo.grid(row=row, column=1, sticky="w", padx=(0, 10), pady=2)
        row += 1
        
        # Strict Host Key Checking
        ttk.Label(scrollable_frame, text="Strict Host Key Checking:").grid(row=row, column=0, sticky="w", padx=(20, 5), pady=2)
        self.strict_host_key_checking_var = tk.StringVar(value="ask")
        strict_combo = ttk.Combobox(scrollable_frame, textvariable=self.strict_host_key_checking_var, 
                                   values=["yes", "no", "ask"], width=10, state="readonly")
        strict_combo.grid(row=row, column=1, sticky="w", padx=(0, 10), pady=2)
        row += 1
        
        # Developer Features
        ttk.Label(scrollable_frame, text="Developer Features", font=("Arial", 10, "bold")).grid(row=row, column=0, columnspan=2, sticky="w", padx=10, pady=(15, 5))
        row += 1
        
        # Forward X11
        self.forward_x11_var = tk.BooleanVar()
        ttk.Checkbutton(scrollable_frame, text="Forward X11", variable=self.forward_x11_var).grid(row=row, column=0, columnspan=2, sticky="w", padx=(20, 5), pady=2)
        row += 1
        
        # Forward Agent
        self.forward_agent_var = tk.BooleanVar()
        ttk.Checkbutton(scrollable_frame, text="Forward Agent", variable=self.forward_agent_var).grid(row=row, column=0, columnspan=2, sticky="w", padx=(20, 5), pady=2)
        row += 1
        
        # Connection Multiplexing
        ttk.Label(scrollable_frame, text="Connection Multiplexing", font=("Arial", 10, "bold")).grid(row=row, column=0, columnspan=2, sticky="w", padx=10, pady=(15, 5))
        row += 1
        
        # Control Master
        ttk.Label(scrollable_frame, text="Control Master:").grid(row=row, column=0, sticky="w", padx=(20, 5), pady=2)
        self.control_master_var = tk.StringVar(value="auto")
        control_combo = ttk.Combobox(scrollable_frame, textvariable=self.control_master_var, 
                                    values=["auto", "yes", "no"], width=10, state="readonly")
        control_combo.grid(row=row, column=1, sticky="w", padx=(0, 10), pady=2)
        row += 1
        
        # Control Persist
        ttk.Label(scrollable_frame, text="Control Persist:").grid(row=row, column=0, sticky="w", padx=(20, 5), pady=2)
        self.control_persist_var = tk.StringVar(value="10m")
        ttk.Entry(scrollable_frame, textvariable=self.control_persist_var, width=15).grid(row=row, column=1, sticky="w", padx=(0, 10), pady=2)
        row += 1
        
        # Update scroll region when frame changes size
        scrollable_frame.update_idletasks()
        canvas.configure(scrollregion=canvas.bbox("all"))
        
    def load_initial_data(self):
        """Load initial data for dropdowns."""
        # Load existing groups
        try:
            groups = self.ssh_manager.get_groups()
            if not groups:
                groups = ["personal", "work", "projects"]
            self.group_combo['values'] = groups
        except:
            self.group_combo['values'] = ["personal", "work", "projects"]
            
        # Load templates
        try:
            templates = self.ssh_manager.get_templates()
            template_values = [t['id'] for t in templates]
            template_display = [f"{t['id']} - {t['name']}" for t in templates]
            self.template_combo['values'] = template_values
        except:
            self.template_combo['values'] = ["basic-server", "aws-ec2", "jump-host", "developer"]
            
    def browse_key_file(self):
        """Open file dialog to browse for SSH key file."""
        filename = filedialog.askopenfilename(
            title="Select SSH Key File",
            initialdir=os.path.expanduser("~/.ssh"),
            filetypes=[("SSH Key Files", "*"), ("All Files", "*.*")]
        )
        
        if filename:
            self.key_file_var.set(filename)
            
    def test_connection(self):
        """Test the SSH connection with current settings."""
        if not self.validate_basic_fields():
            return
            
        try:
            # Create a temporary connection for testing
            test_options = self.get_connection_options()
            test_options['name'] = f"temp_test_{test_options['name']}"
            
            # Add temporary connection
            self.ssh_manager.add_connection(test_options)
            
            # Test it
            result = self.ssh_manager.test_connection(test_options['name'], test_options['group'])
            
            # Remove temporary connection
            self.ssh_manager.remove_connection(test_options['name'], test_options['group'])
            
            if result['success']:
                messagebox.showinfo("Test Successful", "Connection test passed!")
            else:
                messagebox.showerror("Test Failed", f"Connection test failed:\n{result['error']}")
                
        except Exception as e:
            messagebox.showerror("Test Error", f"Failed to test connection:\n{str(e)}")
            
    def validate_basic_fields(self) -> bool:
        """Validate required fields."""
        if not self.name_var.get().strip():
            messagebox.showerror("Validation Error", "Connection name is required")
            return False
            
        if not self.host_var.get().strip():
            messagebox.showerror("Validation Error", "Hostname is required")
            return False
            
        try:
            port = int(self.port_var.get())
            if not 1 <= port <= 65535:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Validation Error", "Port must be a number between 1 and 65535")
            return False
            
        return True
        
    def get_connection_options(self) -> Dict[str, Any]:
        """Get connection options from form fields."""
        return {
            'name': self.name_var.get().strip(),
            'host': self.host_var.get().strip(),
            'user': self.user_var.get().strip(),
            'port': self.port_var.get().strip(),
            'group': self.group_var.get().strip(),
            'template': self.template_var.get().strip(),
            'icon': self.icon_var.get().strip(),
            'key_file': self.key_file_var.get().strip(),
            'server_alive_interval': self.server_alive_interval_var.get().strip(),
            'server_alive_count_max': self.server_alive_count_max_var.get().strip(),
            'connect_timeout': self.connect_timeout_var.get().strip(),
            'compression': self.compression_var.get().strip(),
            'strict_host_key_checking': self.strict_host_key_checking_var.get().strip(),
            'forward_x11': 'yes' if self.forward_x11_var.get() else 'no',
            'forward_agent': 'yes' if self.forward_agent_var.get() else 'no',
            'control_master': self.control_master_var.get().strip(),
            'control_persist': self.control_persist_var.get().strip()
        }
        
    def add_connection(self):
        """Add the SSH connection."""
        if not self.validate_basic_fields():
            return
            
        try:
            options = self.get_connection_options()
            result = self.ssh_manager.add_connection(options)
            
            self.result = result
            self.dialog.destroy()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to add connection:\n{str(e)}")
            
    def cancel(self):
        """Cancel the dialog."""
        self.result = None
        self.dialog.destroy()
        
    def center_dialog(self):
        """Center the dialog on the parent window."""
        self.dialog.update_idletasks()
        
        # Get parent window position and size
        parent_x = self.parent.winfo_rootx()
        parent_y = self.parent.winfo_rooty()
        parent_width = self.parent.winfo_width()
        parent_height = self.parent.winfo_height()
        
        # Get dialog size
        dialog_width = self.dialog.winfo_reqwidth()
        dialog_height = self.dialog.winfo_reqheight()
        
        # Calculate centered position
        x = parent_x + (parent_width // 2) - (dialog_width // 2)
        y = parent_y + (parent_height // 2) - (dialog_height // 2)
        
        self.dialog.geometry(f"{dialog_width}x{dialog_height}+{x}+{y}")