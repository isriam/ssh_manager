#!/usr/bin/env python3

import tkinter as tk
from tkinter import ttk
from typing import List, Dict, Any, Callable, Optional


class ConnectionTreeView(ttk.Frame):
    """Tree view widget for displaying SSH connections organized by groups."""
    
    def __init__(self, parent, selection_callback: Callable[[Optional[Dict[str, Any]]], None]):
        super().__init__(parent)
        
        self.selection_callback = selection_callback
        self.connections_data = {}  # Store connection data by tree item ID
        
        self.create_widgets()
        
    def create_widgets(self):
        """Create the tree view widget and scrollbar."""
        # Create tree view
        self.tree = ttk.Treeview(self, columns=("type",), show="tree")
        self.tree.heading("#0", text="SSH Connections", anchor="w")
        
        # Configure column widths
        self.tree.column("#0", width=300, minwidth=200)
        self.tree.column("type", width=0, minwidth=0, stretch=False)  # Hidden column for type info
        
        # Create scrollbar
        scrollbar = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Grid layout
        self.tree.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")
        
        # Configure grid weights
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        
        # Bind selection event
        self.tree.bind("<<TreeviewSelect>>", self.on_selection_change)
        
        # Bind double-click event (could be used for quick connect)
        self.tree.bind("<Double-1>", self.on_double_click)
        
    def load_connections(self, connections: List[Dict[str, Any]]):
        """Load connections into the tree view."""
        # Clear existing items
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.connections_data.clear()
        
        # Organize connections by group hierarchy
        groups = {}
        for connection in connections:
            group_path = connection['group']
            if group_path not in groups:
                groups[group_path] = []
            groups[group_path].append(connection)
            
        # Sort groups and add to tree
        for group_path in sorted(groups.keys()):
            group_item_id = self.add_group_to_tree(group_path)
            
            # Add connections to this group
            group_connections = sorted(groups[group_path], key=lambda x: x['name'])
            for connection in group_connections:
                self.add_connection_to_tree(group_item_id, connection)
                
        # Expand all groups by default
        self.expand_all()
        
    def add_group_to_tree(self, group_path: str) -> str:
        """Add a group (and its parent groups) to the tree."""
        path_parts = group_path.split('/')
        current_path = ""
        current_parent = ""
        
        for i, part in enumerate(path_parts):
            if current_path:
                current_path += "/" + part
            else:
                current_path = part
                
            # Check if this group level already exists
            group_item_id = self.find_group_item(current_path)
            
            if not group_item_id:
                # Create new group item
                group_icon = self.get_group_icon(part)
                group_item_id = self.tree.insert(
                    current_parent, 
                    "end", 
                    text=f"{group_icon} {part}",
                    values=("group",),
                    tags=("group",)
                )
                
                # Store group info
                self.connections_data[group_item_id] = {
                    'type': 'group',
                    'name': part,
                    'path': current_path
                }
                
            current_parent = group_item_id
            
        return current_parent
        
    def find_group_item(self, group_path: str) -> Optional[str]:
        """Find an existing group item by path."""
        for item_id, data in self.connections_data.items():
            if data.get('type') == 'group' and data.get('path') == group_path:
                return item_id
        return None
        
    def add_connection_to_tree(self, parent_item: str, connection: Dict[str, Any]):
        """Add a connection to the tree under the specified parent group."""
        connection_text = f"{connection['icon']} {connection['name']}"
        
        connection_item_id = self.tree.insert(
            parent_item,
            "end",
            text=connection_text,
            values=("connection",),
            tags=("connection",)
        )
        
        # Store connection data
        self.connections_data[connection_item_id] = {
            'type': 'connection',
            **connection
        }
        
    def get_group_icon(self, group_name: str) -> str:
        """Get an appropriate icon for a group based on its name."""
        group_icons = {
            'work': '🏢',
            'personal': '🏠', 
            'projects': '📁',
            'development': '💻',
            'dev': '💻',
            'production': '🚀',
            'prod': '🚀',
            'staging': '🧪',
            'test': '🧪',
            'testing': '🧪',
            'servers': '🖥️',
            'databases': '🗃️',
            'cloud': '☁️',
            'aws': '☁️',
            'azure': '☁️',
            'gcp': '☁️'
        }
        
        return group_icons.get(group_name.lower(), '📂')
        
    def on_selection_change(self, event):
        """Handle tree selection change."""
        selected_items = self.tree.selection()
        
        if selected_items:
            item_id = selected_items[0]
            item_data = self.connections_data.get(item_id)
            
            if item_data and item_data['type'] == 'connection':
                # Connection selected
                self.selection_callback(item_data)
            else:
                # Group selected or no valid selection
                self.selection_callback(None)
        else:
            # No selection
            self.selection_callback(None)
            
    def on_double_click(self, event):
        """Handle double-click on tree item."""
        selected_items = self.tree.selection()
        
        if selected_items:
            item_id = selected_items[0]
            item_data = self.connections_data.get(item_id)
            
            if item_data and item_data['type'] == 'connection':
                # Could trigger quick connect here
                # For now, just expand/collapse groups on double-click
                pass
            elif item_data and item_data['type'] == 'group':
                # Toggle group expansion
                if self.tree.item(item_id, 'open'):
                    self.tree.item(item_id, open=False)
                else:
                    self.tree.item(item_id, open=True)
                    
    def expand_all(self):
        """Expand all tree nodes."""
        def expand_item(item_id):
            self.tree.item(item_id, open=True)
            for child in self.tree.get_children(item_id):
                expand_item(child)
                
        for item in self.tree.get_children():
            expand_item(item)
            
    def collapse_all(self):
        """Collapse all tree nodes."""
        def collapse_item(item_id):
            self.tree.item(item_id, open=False)
            for child in self.tree.get_children(item_id):
                collapse_item(child)
                
        for item in self.tree.get_children():
            collapse_item(item)
            
    def get_selected_connection(self) -> Optional[Dict[str, Any]]:
        """Get the currently selected connection data."""
        selected_items = self.tree.selection()
        
        if selected_items:
            item_id = selected_items[0]
            item_data = self.connections_data.get(item_id)
            
            if item_data and item_data['type'] == 'connection':
                return item_data
                
        return None
        
    def refresh(self):
        """Refresh the tree view (placeholder for future use)."""
        # Could be used to reload data from backend
        pass