"""
SSH Connection Data Model

Represents a single SSH connection with all configuration options.
Handles conversion to/from SSH config file format.
"""

import json
import re
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any


@dataclass
class Connection:
    """
    Represents a single SSH connection configuration.

    Attributes:
        name: Host alias for SSH (e.g., "production-api")
        hostname: IP address or domain (e.g., "192.168.1.50")
        user: SSH username (e.g., "deploy")
        port: SSH port (default: 22)
        identity_file: Path to private key (e.g., "~/.ssh/id_ed25519")
        folder: Nested folder path (e.g., "work/clients/acme")
        proxy_jump: Jump host for bastion (e.g., "bastion.company.com")
        local_forwards: List of (local_port, remote_host, remote_port) tuples
        remote_forwards: List of (remote_port, local_host, local_port) tuples
        color_tag: Environment tag ("production", "staging", "development", or "")
    """

    name: str
    hostname: str
    user: str
    port: int = 22
    identity_file: str = ""
    folder: str = "personal"
    proxy_jump: str = ""
    local_forwards: List[Tuple[int, str, int]] = field(default_factory=list)
    remote_forwards: List[Tuple[int, str, int]] = field(default_factory=list)
    color_tag: str = ""  # "production", "staging", "development", or ""

    def to_ssh_config(self) -> str:
        """
        Generate SSH config file content.

        Returns:
            SSH config file content as string
        """
        lines = []

        # Add metadata as comment (for color tag)
        if self.color_tag:
            metadata = {"color": self.color_tag}
            lines.append(f"# SSH Manager Metadata: {json.dumps(metadata)}")
            lines.append("")

        # Host definition
        lines.append(f"Host {self.name}")
        lines.append(f"    HostName {self.hostname}")
        lines.append(f"    User {self.user}")
        lines.append(f"    Port {self.port}")

        # Identity file (SSH key)
        if self.identity_file:
            lines.append(f"    IdentityFile {self.identity_file}")

        # Jump host (bastion)
        if self.proxy_jump:
            lines.append(f"    ProxyJump {self.proxy_jump}")

        # Local port forwards
        for local_port, remote_host, remote_port in self.local_forwards:
            lines.append(f"    LocalForward {local_port} {remote_host}:{remote_port}")

        # Remote port forwards
        for remote_port, local_host, local_port in self.remote_forwards:
            lines.append(f"    RemoteForward {remote_port} {local_host}:{local_port}")

        # Add standard best practices
        lines.append("    ServerAliveInterval 60")
        lines.append("    ServerAliveCountMax 3")
        lines.append("    ConnectTimeout 10")

        return "\n".join(lines) + "\n"

    @staticmethod
    def from_ssh_config(content: str, name: str = "", folder: str = "personal") -> 'Connection':
        """
        Parse SSH config file content and create Connection object.

        Args:
            content: SSH config file content
            name: Connection name (optional, extracted from Host line if not provided)
            folder: Folder path (defaults to "personal")

        Returns:
            Connection object
        """
        # Extract metadata from comment
        color_tag = ""
        metadata_match = re.search(r'# SSH Manager Metadata: ({.*})', content)
        if metadata_match:
            try:
                metadata = json.loads(metadata_match.group(1))
                color_tag = metadata.get("color", "")
            except json.JSONDecodeError:
                pass

        # Parse SSH config directives
        hostname = ""
        user = ""
        port = 22
        identity_file = ""
        proxy_jump = ""
        local_forwards = []
        remote_forwards = []

        for line in content.split('\n'):
            line = line.strip()

            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue

            # Extract Host name if not provided
            if line.startswith('Host ') and not name:
                name = line.split('Host ')[1].strip()
                continue

            # Parse directives
            if line.startswith('HostName '):
                hostname = line.split('HostName ')[1].strip()
            elif line.startswith('User '):
                user = line.split('User ')[1].strip()
            elif line.startswith('Port '):
                port = int(line.split('Port ')[1].strip())
            elif line.startswith('IdentityFile '):
                identity_file = line.split('IdentityFile ')[1].strip()
            elif line.startswith('ProxyJump '):
                proxy_jump = line.split('ProxyJump ')[1].strip()
            elif line.startswith('LocalForward '):
                # Parse: LocalForward 8080 localhost:80
                forward_str = line.split('LocalForward ')[1].strip()
                parts = forward_str.split()
                if len(parts) == 2:
                    local_port = int(parts[0])
                    remote_parts = parts[1].split(':')
                    if len(remote_parts) == 2:
                        remote_host = remote_parts[0]
                        remote_port = int(remote_parts[1])
                        local_forwards.append((local_port, remote_host, remote_port))
            elif line.startswith('RemoteForward '):
                # Parse: RemoteForward 3000 localhost:3000
                forward_str = line.split('RemoteForward ')[1].strip()
                parts = forward_str.split()
                if len(parts) == 2:
                    remote_port = int(parts[0])
                    local_parts = parts[1].split(':')
                    if len(local_parts) == 2:
                        local_host = local_parts[0]
                        local_port = int(local_parts[1])
                        remote_forwards.append((remote_port, local_host, local_port))

        return Connection(
            name=name or "unnamed",
            hostname=hostname,
            user=user,
            port=port,
            identity_file=identity_file,
            folder=folder,
            proxy_jump=proxy_jump,
            local_forwards=local_forwards,
            remote_forwards=remote_forwards,
            color_tag=color_tag
        )

    def validate(self) -> List[str]:
        """
        Validate connection fields.

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        # Name validation
        if not self.name:
            errors.append("Connection name is required")
        elif not re.match(r'^[a-zA-Z0-9_-]+$', self.name):
            errors.append("Connection name can only contain letters, numbers, dashes, and underscores")

        # Hostname validation
        if not self.hostname:
            errors.append("Hostname is required")

        # Username validation
        if not self.user:
            errors.append("Username is required")

        # Port validation
        if not (1 <= self.port <= 65535):
            errors.append("Port must be between 1 and 65535")

        # Folder validation (no path traversal)
        if '..' in self.folder or self.folder.startswith('/'):
            errors.append("Invalid folder path")

        return errors

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'name': self.name,
            'hostname': self.hostname,
            'user': self.user,
            'port': self.port,
            'identity_file': self.identity_file,
            'folder': self.folder,
            'proxy_jump': self.proxy_jump,
            'local_forwards': self.local_forwards,
            'remote_forwards': self.remote_forwards,
            'color_tag': self.color_tag
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'Connection':
        """Create Connection from dictionary."""
        return Connection(
            name=data.get('name', ''),
            hostname=data.get('hostname', ''),
            user=data.get('user', ''),
            port=data.get('port', 22),
            identity_file=data.get('identity_file', ''),
            folder=data.get('folder', 'personal'),
            proxy_jump=data.get('proxy_jump', ''),
            local_forwards=data.get('local_forwards', []),
            remote_forwards=data.get('remote_forwards', []),
            color_tag=data.get('color_tag', '')
        )

    def get_display_name(self) -> str:
        """Get display name with color indicator."""
        color_emoji = {
            'production': '🔴',
            'staging': '🟡',
            'development': '🟢'
        }
        emoji = color_emoji.get(self.color_tag, '💻')
        return f"{emoji} {self.name}"

    def __str__(self) -> str:
        """String representation."""
        return f"Connection(name='{self.name}', hostname='{self.hostname}', user='{self.user}')"
