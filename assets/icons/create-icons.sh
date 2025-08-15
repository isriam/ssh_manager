#!/bin/bash

# SSH Manager Icon Creation Script
# Creates placeholder icons for development/testing

ICON_DIR="/Users/jeremy/Documents/ssh_manager/assets/icons"
cd "$ICON_DIR"

echo "Creating placeholder icons for SSH Manager..."

# Create a simple base icon using Python (if available)
cat > create_base_icon.py << 'EOF'
#!/usr/bin/env python3
import os

# Create a simple ASCII art icon as base
def create_ascii_icon(size, filename):
    # Simple SSH Manager representation using text
    content = f'''
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            margin: 0;
            width: {size}px;
            height: {size}px;
            background: linear-gradient(135deg, #2563eb, #1e40af);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
            color: white;
            font-size: {size//8}px;
            font-weight: bold;
        }}
        .icon {{
            text-align: center;
            line-height: 1.2;
        }}
    </style>
</head>
<body>
    <div class="icon">
        SSH<br>
        MGR<br>
        🔑
    </div>
</body>
</html>
'''
    with open(f"{filename}.html", "w") as f:
        f.write(content)

# Create base HTML files for different sizes
sizes = [16, 32, 64, 128, 256, 512]
for size in sizes:
    create_ascii_icon(size, f"icon_{size}")

print("Created HTML icon templates")
EOF

python3 create_base_icon.py

echo "HTML icon templates created"
echo "For production, replace with proper graphic icons"
echo "Required files: icon.icns (macOS), icon.ico (Windows), icon.png (Linux)"