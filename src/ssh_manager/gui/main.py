#!/usr/bin/env python3

import tkinter as tk
from tkinter import ttk, messagebox
import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.ssh_manager import SSHManager
from .connection_tree import ConnectionTreeView
from .dialogs.add_connection import AddConnectionDialog
from .dialogs.edit_connection import EditConnectionDialog


class SSHManagerGUI:
    """Main SSH Manager GUI Application."""
    
    def __init__(self):
        self.root = tk.Tk()
        self.ssh_manager = SSHManager()
        
        # Initialize SSH Manager
        try:
            self.ssh_manager.init()
        except Exception as e:
            messagebox.showerror("Initialization Error", f"Failed to initialize SSH Manager: {e}")
            sys.exit(1)
            
        self.setup_window()
        self.create_menu()
        self.create_widgets()
        self.load_connections()
        
    def setup_window(self):
        """Set up the main window."""
        self.root.title("SSH Manager")
        self.root.geometry("800x600")
        self.root.minsize(600, 400)
        
        # Set icon (if available)
        icon_path = Path(__file__).parent.parent.parent.parent / "assets" / "icons" / "icon.png"
        if icon_path.exists():
            try:
                # For Linux systems
                self.root.iconphoto(True, tk.PhotoImage(file=str(icon_path)))
            except:
                pass  # Icon loading failed, continue without
                
        # Configure grid weights
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(0, weight=1)
        
    def create_menu(self):
        """Create the application menu bar."""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)
        
        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(label="Add Connection...", command=self.add_connection, accelerator="Ctrl+N")
        file_menu.add_separator()
        file_menu.add_command(label="Export Connections...", command=self.export_connections, accelerator="Ctrl+E")
        file_menu.add_command(label="Create Backup...", command=self.create_backup)
        file_menu.add_separator()
        file_menu.add_command(label="Revert to Original SSH Config", command=self.revert_ssh_config)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit, accelerator="Ctrl+Q")
        
        # View menu
        view_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="View", menu=view_menu)
        view_menu.add_command(label="Refresh", command=self.load_connections, accelerator="F5")
        view_menu.add_command(label="Expand All", command=self.expand_all)
        view_menu.add_command(label="Collapse All", command=self.collapse_all)
        
        # Help menu
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="About", command=self.show_about)
        
        # Bind keyboard shortcuts
        self.root.bind_all("<Control-n>", lambda e: self.add_connection())
        self.root.bind_all("<Control-e>", lambda e: self.export_connections())
        self.root.bind_all("<Control-q>", lambda e: self.root.quit())
        self.root.bind_all("<F5>", lambda e: self.load_connections())
        
    def create_widgets(self):
        """Create the main application widgets."""
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        main_frame.grid_rowconfigure(0, weight=1)
        main_frame.grid_columnconfigure(0, weight=1)
        
        # Create paned window for split layout
        paned_window = ttk.PanedWindow(main_frame, orient="horizontal")
        paned_window.grid(row=0, column=0, sticky="nsew")
        
        # Left panel - Connection tree
        left_frame = ttk.Frame(paned_window)
        paned_window.add(left_frame, weight=1)
        
        # Connection tree
        self.tree_view = ConnectionTreeView(left_frame, self.on_connection_selected)
        self.tree_view.grid(row=0, column=0, sticky="nsew")
        
        left_frame.grid_rowconfigure(0, weight=1)
        left_frame.grid_columnconfigure(0, weight=1)
        
        # Right panel - Connection details and actions
        right_frame = ttk.Frame(paned_window)
        paned_window.add(right_frame, weight=1)
        
        # Connection details
        details_label = ttk.Label(right_frame, text="Connection Details", font=("Arial", 12, "bold"))
        details_label.grid(row=0, column=0, sticky="w", padx=5, pady=(5, 10))
        
        # Details text area
        self.details_text = tk.Text(right_frame, height=15, width=40, wrap="word", state="disabled")
        details_scrollbar = ttk.Scrollbar(right_frame, orient="vertical", command=self.details_text.yview)
        self.details_text.config(yscrollcommand=details_scrollbar.set)
        
        self.details_text.grid(row=1, column=0, sticky="nsew", padx=(5, 0), pady=5)
        details_scrollbar.grid(row=1, column=1, sticky="ns", pady=5)
        
        # Action buttons
        button_frame = ttk.Frame(right_frame)
        button_frame.grid(row=2, column=0, columnspan=2, sticky="ew", padx=5, pady=10)
        
        self.connect_btn = ttk.Button(button_frame, text="Connect", command=self.connect_to_selected, state="disabled")
        self.connect_btn.pack(side="left", padx=(0, 5))
        
        self.test_btn = ttk.Button(button_frame, text="Test", command=self.test_selected, state="disabled")
        self.test_btn.pack(side="left", padx=(0, 5))
        
        self.edit_btn = ttk.Button(button_frame, text="Edit", command=self.edit_selected, state="disabled")
        self.edit_btn.pack(side="left", padx=(0, 5))
        
        self.delete_btn = ttk.Button(button_frame, text="Delete", command=self.delete_selected, state="disabled")
        self.delete_btn.pack(side="left")
        
        # Add connection button
        add_frame = ttk.Frame(right_frame)
        add_frame.grid(row=3, column=0, columnspan=2, sticky="ew", padx=5, pady=5)
        
        self.add_btn = ttk.Button(add_frame, text="Add New Connection", command=self.add_connection)
        self.add_btn.pack(side="left")
        
        # Configure grid weights for right panel
        right_frame.grid_rowconfigure(1, weight=1)
        right_frame.grid_columnconfigure(0, weight=1)
        
        # Store selected connection info
        self.selected_connection = None
        
    def load_connections(self):
        """Load and display all connections."""
        try:
            connections = self.ssh_manager.list_connections()
            self.tree_view.load_connections(connections)
            self.update_details("")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load connections: {e}")
            
    def on_connection_selected(self, connection_info):
        """Handle connection selection."""
        self.selected_connection = connection_info
        
        if connection_info:
            # Enable action buttons
            self.connect_btn.config(state="normal")
            self.test_btn.config(state="normal") 
            self.edit_btn.config(state="normal")
            self.delete_btn.config(state="normal")
            
            # Update details panel
            details = f"Name: {connection_info['name']}\n"
            details += f"Group: {connection_info['group']}\n"
            details += f"Icon: {connection_info['icon']}\n\n"
            details += "Configuration:\n"
            details += "-" * 40 + "\n"
            details += connection_info.get('config', 'No configuration available')
            
            self.update_details(details)
        else:
            # Disable action buttons
            self.connect_btn.config(state="disabled")
            self.test_btn.config(state="disabled")
            self.edit_btn.config(state="disabled")
            self.delete_btn.config(state="disabled")
            
            self.update_details("")
            
    def update_details(self, text):
        """Update the details text area."""
        self.details_text.config(state="normal")
        self.details_text.delete(1.0, tk.END)
        self.details_text.insert(1.0, text)
        self.details_text.config(state="disabled")
        
    def add_connection(self):
        """Open add connection dialog."""
        dialog = AddConnectionDialog(self.root, self.ssh_manager)
        if dialog.result:
            self.load_connections()  # Refresh the tree
            
    def edit_selected(self):
        """Edit the selected connection."""
        if not self.selected_connection:
            return
            
        dialog = EditConnectionDialog(self.root, self.ssh_manager, self.selected_connection)
        if dialog.result:
            self.load_connections()  # Refresh the tree
            
    def connect_to_selected(self):
        """Connect to the selected SSH server."""
        if not self.selected_connection:
            return
            
        try:
            result = self.ssh_manager.connect_to_server(
                self.selected_connection['name'], 
                self.selected_connection['group']
            )
            
            if result['success']:
                messagebox.showinfo("Success", result['message'])
                if 'command' in result:
                    # Show command to run if no terminal was found
                    messagebox.showinfo("SSH Command", f"Run this command:\n{result['command']}")
            else:
                messagebox.showerror("Connection Error", result['error'])
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to connect: {e}")
            
    def test_selected(self):
        """Test the selected SSH connection."""
        if not self.selected_connection:
            return
            
        try:
            result = self.ssh_manager.test_connection(
                self.selected_connection['name'],
                self.selected_connection['group']
            )
            
            if result['success']:
                messagebox.showinfo("Test Successful", result['message'])
            else:
                messagebox.showerror("Test Failed", result['error'])
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to test connection: {e}")
            
    def delete_selected(self):
        """Delete the selected connection."""
        if not self.selected_connection:
            return
            
        # Confirm deletion
        response = messagebox.askyesno(
            "Confirm Delete", 
            f"Are you sure you want to delete the connection '{self.selected_connection['name']}'?"
        )
        
        if response:
            try:
                self.ssh_manager.remove_connection(
                    self.selected_connection['name'],
                    self.selected_connection['group']
                )
                self.load_connections()  # Refresh the tree
                messagebox.showinfo("Success", "Connection deleted successfully")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to delete connection: {e}")
                
    def export_connections(self):
        """Export connections to a backup file."""
        from tkinter import filedialog
        
        filename = filedialog.asksaveasfilename(
            title="Export Connections",
            defaultextension=".zip",
            filetypes=[("ZIP files", "*.zip"), ("All files", "*.*")]
        )
        
        if filename:
            try:
                result = self.ssh_manager.create_backup(filename)
                if result['success']:
                    messagebox.showinfo("Success", f"Connections exported to {filename}")
                else:
                    messagebox.showerror("Export Failed", result['error'])
            except Exception as e:
                messagebox.showerror("Error", f"Failed to export connections: {e}")
                
    def create_backup(self):
        """Create a backup of SSH Manager configurations."""
        try:
            result = self.ssh_manager.create_backup()
            if result['success']:
                messagebox.showinfo("Success", f"Backup created at {result['backup_path']}")
            else:
                messagebox.showerror("Backup Failed", result['error'])
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create backup: {e}")
            
    def revert_ssh_config(self):
        """Revert to original SSH configuration."""
        response = messagebox.askyesno(
            "Confirm Revert",
            "This will restore your original SSH configuration and disable SSH Manager integration.\n\nAre you sure?"
        )
        
        if response:
            try:
                result = self.ssh_manager.revert_to_original_config()
                if result['success']:
                    messagebox.showinfo("Success", result['message'])
                    self.load_connections()  # Refresh the tree
                else:
                    messagebox.showerror("Revert Failed", result['error'])
            except Exception as e:
                messagebox.showerror("Error", f"Failed to revert SSH config: {e}")
                
    def expand_all(self):
        """Expand all tree nodes."""
        self.tree_view.expand_all()
        
    def collapse_all(self):
        """Collapse all tree nodes."""
        self.tree_view.collapse_all()
        
    def show_about(self):
        """Show about dialog."""
        about_text = """SSH Manager v0.2.0

A cross-platform GUI application for managing SSH configurations through organized folders and visual forms.

Built with Python and Tkinter for maximum compatibility and minimal dependencies.

Author: Jeremy
License: MIT"""
        messagebox.showinfo("About SSH Manager", about_text)
        
    def run(self):
        """Start the main event loop."""
        self.root.mainloop()


def main():
    """Main entry point for the GUI application."""
    try:
        app = SSHManagerGUI()
        app.run()
    except KeyboardInterrupt:
        print("\nSSH Manager GUI terminated by user")
    except Exception as e:
        print(f"SSH Manager GUI failed to start: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()