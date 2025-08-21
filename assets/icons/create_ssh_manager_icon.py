#!/usr/bin/env python3
"""
Create SSH Manager icon with terminal design: >_ssh with key icon
Design: Option B - Terminal window with ">_ssh 🔑" and "manager" subtitle
"""
import os
from PIL import Image, ImageDraw, ImageFont
import sys

def create_ssh_manager_icon(size, output_path):
    """Create SSH Manager icon with terminal aesthetic"""
    
    # Create new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Terminal window styling
    terminal_bg = (32, 32, 32, 255)  # Dark gray/black
    terminal_border = (96, 96, 96, 255)  # Light gray border
    text_color = (0, 255, 0, 255)  # Terminal green
    prompt_color = (255, 255, 255, 255)  # White for prompt
    key_color = (255, 215, 0, 255)  # Gold for key
    
    # Calculate dimensions based on size
    border_width = max(1, size // 32)
    corner_radius = size // 16
    
    # Draw terminal window with rounded corners
    terminal_rect = [border_width, border_width, 
                    size - border_width, size - border_width]
    
    # Create rounded rectangle for terminal
    draw.rounded_rectangle(terminal_rect, radius=corner_radius, 
                          fill=terminal_bg, outline=terminal_border, width=border_width)
    
    # Calculate text sizes based on icon size
    if size >= 128:
        title_font_size = size // 8
        prompt_font_size = size // 10
        key_size = size // 12
    elif size >= 64:
        title_font_size = size // 6
        prompt_font_size = size // 8
        key_size = size // 10
    elif size >= 32:
        title_font_size = size // 4
        prompt_font_size = size // 5
        key_size = size // 8
    else:
        title_font_size = size // 3
        prompt_font_size = size // 4
        key_size = size // 6
    
    # Try to load a monospace font, fallback to default
    try:
        # Try common monospace fonts
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf", 
            "/System/Library/Fonts/Monaco.ttf",  # macOS
            "C:\\Windows\\Fonts\\consola.ttf",   # Windows
        ]
        
        title_font = None
        prompt_font = None
        
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    title_font = ImageFont.truetype(font_path, title_font_size)
                    prompt_font = ImageFont.truetype(font_path, prompt_font_size)
                    break
                except:
                    continue
        
        if title_font is None:
            title_font = ImageFont.load_default()
            prompt_font = ImageFont.load_default()
            
    except Exception:
        title_font = ImageFont.load_default()
        prompt_font = ImageFont.load_default()
    
    # Position text elements
    margin = size // 8
    
    # Draw ">_ssh" prompt
    prompt_text = ">_ssh"
    prompt_y = margin + size // 6
    
    # Get text size for centering
    try:
        prompt_bbox = draw.textbbox((0, 0), prompt_text, font=prompt_font)
        prompt_width = prompt_bbox[2] - prompt_bbox[0]
    except:
        prompt_width = len(prompt_text) * prompt_font_size // 2
    
    prompt_x = margin
    draw.text((prompt_x, prompt_y), prompt_text, fill=text_color, font=prompt_font)
    
    # Draw key symbol next to ssh
    key_x = prompt_x + prompt_width + size // 16
    key_y = prompt_y
    
    if size >= 32:
        # Draw a simple key icon
        key_width = key_size
        key_height = key_size // 2
        
        # Key shaft
        draw.rectangle([key_x, key_y + key_height//3, 
                       key_x + key_width//2, key_y + 2*key_height//3], 
                      fill=key_color)
        
        # Key head (circle)
        key_head_size = key_height
        draw.ellipse([key_x + key_width//2 - key_head_size//2, key_y,
                     key_x + key_width//2 + key_head_size//2, key_y + key_head_size],
                    fill=key_color)
        
        # Key teeth
        if size >= 64:
            teeth_x = key_x + key_width//4
            draw.rectangle([teeth_x, key_y + 2*key_height//3,
                           teeth_x + 2, key_y + key_height], fill=key_color)
            draw.rectangle([teeth_x + 4, key_y + key_height//2,
                           teeth_x + 6, key_y + key_height], fill=key_color)
    
    # Draw "manager" subtitle
    manager_text = "manager"
    manager_y = prompt_y + prompt_font_size + size // 16
    draw.text((margin, manager_y), manager_text, fill=prompt_color, font=prompt_font)
    
    # Draw cursor (blinking cursor representation)
    if size >= 32:
        cursor_x = margin
        cursor_y = manager_y + prompt_font_size + size // 32
        cursor_width = size // 32
        cursor_height = size // 16
        draw.rectangle([cursor_x, cursor_y, 
                       cursor_x + cursor_width, cursor_y + cursor_height], 
                      fill=text_color)
    
    # Save the image
    img.save(output_path, "PNG")
    print(f"Created {size}x{size} icon: {output_path}")

def main():
    """Generate all required icon sizes"""
    
    # Standard icon sizes needed for cross-platform packaging
    sizes = [512, 256, 128, 64, 32, 16]
    
    # Create icons directory if it doesn't exist
    icon_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Generate all sizes
    for size in sizes:
        output_file = os.path.join(icon_dir, f"ssh_manager_{size}.png")
        create_ssh_manager_icon(size, output_file)
    
    # Also create the main icon.png (512x512 for Linux)
    main_icon = os.path.join(icon_dir, "icon.png")
    create_ssh_manager_icon(512, main_icon)
    
    print("\n✅ SSH Manager icons generated successfully!")
    print("Files created:")
    for size in sizes:
        print(f"  - ssh_manager_{size}.png")
    print("  - icon.png (512x512)")
    
    print("\nNext steps:")
    print("1. Review the generated icons")
    print("2. Run create-icons.sh to generate .icns and .ico files")
    print("3. Update the application to use new icons")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ Error: PIL (Pillow) is required to generate icons")
        print("Install with: pip install Pillow")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error generating icons: {e}")
        sys.exit(1)