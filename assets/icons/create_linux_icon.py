#!/usr/bin/env python3
"""
Create a high-quality SSH Manager icon for Linux
"""

import sys
import os

def create_ssh_manager_icon(size=512, filename="icon.png"):
    """Create a professional SSH Manager icon"""
    
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("PIL/Pillow not available. Installing...")
        os.system("pip3 install --user Pillow")
        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            print("Error: Could not install/import Pillow")
            return False
    
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    bg_color = (37, 99, 235)  # Blue gradient start
    bg_color2 = (30, 64, 175)  # Blue gradient end
    terminal_bg = (31, 41, 55)  # Dark gray
    terminal_header = (55, 65, 81)  # Lighter gray
    green = (16, 185, 129)  # Success green
    yellow = (251, 191, 36)  # Key yellow
    blue = (59, 130, 246)  # Connection blue
    
    # Draw background circle with gradient effect
    margin = size // 32
    bg_radius = size // 2 - margin
    
    # Simple gradient by drawing concentric circles
    for i in range(bg_radius):
        alpha = i / bg_radius
        r = int(bg_color[0] * (1-alpha) + bg_color2[0] * alpha)
        g = int(bg_color[1] * (1-alpha) + bg_color2[1] * alpha)
        b = int(bg_color[2] * (1-alpha) + bg_color2[2] * alpha)
        
        draw.ellipse([
            size//2 - bg_radius + i,
            size//2 - bg_radius + i,
            size//2 + bg_radius - i,
            size//2 + bg_radius - i
        ], fill=(r, g, b, 255))
    
    # Terminal window
    term_width = int(size * 0.625)  # 320/512
    term_height = int(size * 0.39)   # 200/512
    term_x = (size - term_width) // 2
    term_y = int(size * 0.273)  # 140/512
    
    # Terminal background
    draw.rounded_rectangle([
        term_x, term_y,
        term_x + term_width, term_y + term_height
    ], radius=size//42, fill=terminal_bg)
    
    # Terminal header
    header_height = size // 16
    draw.rounded_rectangle([
        term_x, term_y,
        term_x + term_width, term_y + header_height
    ], radius=size//42, fill=terminal_header)
    
    # Terminal buttons
    button_size = size // 85
    button_y = term_y + header_height // 2
    
    # Red button
    draw.ellipse([
        term_x + size//21, button_y - button_size,
        term_x + size//21 + button_size*2, button_y + button_size
    ], fill=(239, 68, 68))
    
    # Yellow button  
    draw.ellipse([
        term_x + size//14, button_y - button_size,
        term_x + size//14 + button_size*2, button_y + button_size
    ], fill=(245, 158, 11))
    
    # Green button
    draw.ellipse([
        term_x + size//10, button_y - button_size,
        term_x + size//10 + button_size*2, button_y + button_size
    ], fill=(16, 185, 129))
    
    # Terminal content lines
    line_height = size // 64
    line_y_start = term_y + header_height + size//26
    line_spacing = size // 32
    
    # Green line (active command)
    draw.rounded_rectangle([
        term_x + size//26, line_y_start,
        term_x + size//26 + int(size * 0.39), line_y_start + line_height
    ], radius=line_height//2, fill=green)
    
    # Gray lines (other content)
    for i, width_ratio in enumerate([0.31, 0.47, 0.234]):
        y = line_y_start + (i+1) * line_spacing
        draw.rounded_rectangle([
            term_x + size//26, y,
            term_x + size//26 + int(size * width_ratio), y + line_height
        ], radius=line_height//2, fill=(107, 114, 128))
    
    # SSH Key icon
    key_x = term_x + int(term_width * 0.7)
    key_y = line_y_start + line_spacing
    key_width = int(size * 0.117)  # 60/512
    key_height = size // 32
    
    # Key body
    draw.rounded_rectangle([
        key_x, key_y,
        key_x + key_width, key_y + key_height
    ], radius=key_height//2, fill=yellow)
    
    # Key teeth
    tooth_size = size // 64
    draw.rectangle([
        key_x + key_width - tooth_size, key_y - tooth_size//2,
        key_x + key_width, key_y + tooth_size//2
    ], fill=yellow)
    
    draw.rectangle([
        key_x + key_width - tooth_size, key_y + key_height - tooth_size//2,
        key_x + key_width, key_y + key_height + tooth_size//2
    ], fill=yellow)
    
    # Key ring
    ring_center_x = key_x - size//64
    ring_center_y = key_y + key_height//2
    ring_radius = size // 43
    
    draw.ellipse([
        ring_center_x - ring_radius, ring_center_y - ring_radius,
        ring_center_x + ring_radius, ring_center_y + ring_radius
    ], outline=yellow, width=size//128)
    
    # Connection nodes and lines
    node_radius = size // 64
    
    # Left nodes
    left_node1_x, left_node1_y = term_x - size//18, term_y + int(term_height * 0.7)
    left_node2_x, left_node2_y = term_x - size//26, term_y + int(term_height * 0.5)
    
    # Right nodes  
    right_node1_x, right_node1_y = term_x + term_width + size//26, term_y + int(term_height * 0.5)
    right_node2_x, right_node2_y = term_x + term_width + size//18, term_y + int(term_height * 0.7)
    
    # Draw connection lines (simplified curves as lines)
    line_width = size // 128
    
    # Line 1: left_node2 to right_node1
    draw.line([
        (left_node2_x, left_node2_y),
        (right_node1_x, right_node1_y)
    ], fill=green, width=line_width)
    
    # Line 2: left_node1 to right_node2  
    draw.line([
        (left_node1_x, left_node1_y),
        (right_node2_x, right_node2_y)
    ], fill=blue, width=line_width)
    
    # Draw nodes
    draw.ellipse([
        left_node1_x - node_radius, left_node1_y - node_radius,
        left_node1_x + node_radius, left_node1_y + node_radius
    ], fill=green)
    
    draw.ellipse([
        left_node2_x - node_radius, left_node2_y - node_radius,
        left_node2_x + node_radius, left_node2_y + node_radius
    ], fill=green)
    
    draw.ellipse([
        right_node1_x - node_radius, right_node1_y - node_radius,
        right_node1_x + node_radius, right_node1_y + node_radius
    ], fill=blue)
    
    draw.ellipse([
        right_node2_x - node_radius, right_node2_y - node_radius,
        right_node2_x + node_radius, right_node2_y + node_radius
    ], fill=blue)
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")
    return True

if __name__ == "__main__":
    # Create different sizes for Linux
    sizes = [512, 256, 128, 64, 32, 16]
    
    success = True
    for size in sizes:
        filename = f"icon_{size}.png" if size != 512 else "icon.png"
        if not create_ssh_manager_icon(size, filename):
            success = False
            break
    
    if success:
        print("✅ SSH Manager icons created successfully!")
        print("Files created: icon.png, icon_256.png, icon_128.png, icon_64.png, icon_32.png, icon_16.png")
    else:
        print("❌ Failed to create icons")
        sys.exit(1)