"""
Terminal Launcher

Auto-detects terminal emulators and launches SSH connections.
"""

import shutil
import subprocess
from typing import Optional, List


class TerminalLauncher:
    """
    Handles terminal detection and SSH session launching.

    Detects common Linux terminal emulators and launches SSH
    connections in new terminal windows.
    """

    # Terminal emulators in priority order
    TERMINALS = [
        {
            'name': 'gnome-terminal',
            'command': lambda conn: ['gnome-terminal', '--', 'ssh', conn]
        },
        {
            'name': 'konsole',
            'command': lambda conn: ['konsole', '-e', 'ssh', conn]
        },
        {
            'name': 'xfce4-terminal',
            'command': lambda conn: ['xfce4-terminal', '-e', f'ssh {conn}']
        },
        {
            'name': 'alacritty',
            'command': lambda conn: ['alacritty', '-e', 'ssh', conn]
        },
        {
            'name': 'kitty',
            'command': lambda conn: ['kitty', 'ssh', conn]
        },
        {
            'name': 'tilix',
            'command': lambda conn: ['tilix', '-e', f'ssh {conn}']
        },
        {
            'name': 'xterm',
            'command': lambda conn: ['xterm', '-e', f'ssh {conn}']
        }
    ]

    @classmethod
    def detect_terminal(cls) -> Optional[str]:
        """
        Detect available terminal emulator.

        Returns:
            Terminal name if found, None otherwise
        """
        for terminal in cls.TERMINALS:
            if shutil.which(terminal['name']):
                return terminal['name']
        return None

    @classmethod
    def get_terminal_command(cls, terminal_name: str, connection_name: str) -> List[str]:
        """
        Get command to launch SSH in specified terminal.

        Args:
            terminal_name: Name of terminal emulator
            connection_name: SSH connection name

        Returns:
            Command as list of strings
        """
        for terminal in cls.TERMINALS:
            if terminal['name'] == terminal_name:
                return terminal['command'](connection_name)
        return []

    @classmethod
    def launch_ssh(cls, connection_name: str, terminal_name: Optional[str] = None) -> bool:
        """
        Launch SSH connection in new terminal window.

        Args:
            connection_name: SSH connection name (Host alias)
            terminal_name: Optional specific terminal to use

        Returns:
            True if launched successfully, False otherwise
        """
        # Auto-detect terminal if not specified
        if not terminal_name:
            terminal_name = cls.detect_terminal()

        if not terminal_name:
            print("No supported terminal emulator found")
            print("Please install one of: gnome-terminal, konsole, xfce4-terminal, alacritty, kitty, tilix, xterm")
            return False

        # Get command for terminal
        command = cls.get_terminal_command(terminal_name, connection_name)

        if not command:
            print(f"Unknown terminal: {terminal_name}")
            return False

        try:
            # Launch terminal in background
            subprocess.Popen(
                command,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            return True
        except Exception as e:
            print(f"Failed to launch terminal: {e}")
            return False

    @classmethod
    def get_ssh_command(cls, connection_name: str) -> str:
        """
        Get SSH command string for manual execution.

        Args:
            connection_name: SSH connection name

        Returns:
            SSH command string
        """
        return f"ssh {connection_name}"

    @classmethod
    def test_terminal(cls, terminal_name: str) -> bool:
        """
        Test if terminal emulator is available.

        Args:
            terminal_name: Name of terminal to test

        Returns:
            True if terminal is available
        """
        return shutil.which(terminal_name) is not None

    @classmethod
    def list_available_terminals(cls) -> List[str]:
        """
        List all available terminal emulators on the system.

        Returns:
            List of available terminal names
        """
        available = []
        for terminal in cls.TERMINALS:
            if cls.test_terminal(terminal['name']):
                available.append(terminal['name'])
        return available
