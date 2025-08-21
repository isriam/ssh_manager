#!/usr/bin/env python3
"""
Create SSH Manager icon with LARGE text that fills the icon space
Design: Start fresh with properly sized text
"""
import os
from PIL import Image, ImageDraw, ImageFont
import sys

def create_large_text_icon(size, output_path):
    """Create SSH Manager icon with large, prominent text"""
    
    # Create new image with black background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    
    # Text content
    ssh_text = "SSH"
    manager_text = "Manager"
    
    # Start with very large font sizes and adjust down if needed
    # The goal is to make text as large as possible while fitting in the icon
    ssh_font_size = int(size * 0.6)      # Start with 60% of icon size for SSH
    manager_font_size = int(size * 0.4)   # Start with 40% of icon size for Manager
    
    # Try to load the best available font
    font_loaded = False
    ssh_font = None
    manager_font = None
    
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 
        "/System/Library/Fonts/Helvetica.ttc",
        "C:\\Windows\\Fonts\\arial.ttf",
    ]
    
    # Try to load a proper font
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                ssh_font = ImageFont.truetype(font_path, ssh_font_size)
                manager_font = ImageFont.truetype(font_path, manager_font_size)
                font_loaded = True
                break
            except:
                continue
    
    # If no TrueType font found, use default but make it very large
    if not font_loaded:
        try:
            ssh_font = ImageFont.load_default()
            manager_font = ImageFont.load_default()
        except:
            # Create a basic fallback
            ssh_font = None
            manager_font = None
    
    # Function to get text dimensions
    def get_text_size(text, font):
        if font:
            try:
                bbox = draw.textbbox((0, 0), text, font=font)
                return bbox[2] - bbox[0], bbox[3] - bbox[1]
            except:
                # Fallback calculation
                return len(text) * (font.size if hasattr(font, 'size') else 20), font.size if hasattr(font, 'size') else 20
        else:
            # Very basic fallback
            return len(text) * 10, 12
    
    # Adjust font sizes to fit properly in the icon
    max_width = size * 0.9  # Use 90% of icon width
    
    # Adjust SSH font size to fit width
    attempts = 0
    while attempts < 20:  # Prevent infinite loop
        ssh_width, ssh_height = get_text_size(ssh_text, ssh_font)
        if ssh_width <= max_width or ssh_font_size <= 8:
            break
        ssh_font_size = int(ssh_font_size * 0.9)
        if font_loaded:
            try:
                ssh_font = ImageFont.truetype(font_paths[0] if os.path.exists(font_paths[0]) else font_paths[1], ssh_font_size)
            except:
                break
        attempts += 1
    
    # Adjust Manager font size to fit width
    attempts = 0
    while attempts < 20:  # Prevent infinite loop
        manager_width, manager_height = get_text_size(manager_text, manager_font)
        if manager_width <= max_width or manager_font_size <= 6:
            break
        manager_font_size = int(manager_font_size * 0.9)
        if font_loaded:
            try:
                manager_font = ImageFont.truetype(font_paths[0] if os.path.exists(font_paths[0]) else font_paths[1], manager_font_size)
            except:
                break
        attempts += 1
    
    # Get final text dimensions
    ssh_width, ssh_height = get_text_size(ssh_text, ssh_font)
    manager_width, manager_height = get_text_size(manager_text, manager_font)
    
    # Calculate vertical spacing and positioning
    spacing = max(4, size // 32)  # Small spacing between lines
    total_height = ssh_height + spacing + manager_height
    
    # Center the text block vertically
    start_y = (size - total_height) // 2
    
    # Draw "SSH" text (centered horizontally)
    ssh_x = (size - ssh_width) // 2
    ssh_y = start_y
    
    if ssh_font:
        draw.text((ssh_x, ssh_y), ssh_text, fill=(255, 255, 255, 255), font=ssh_font)
    else:
        # Fallback without font
        draw.text((ssh_x, ssh_y), ssh_text, fill=(255, 255, 255, 255))
    
    # Draw "Manager" text (centered horizontally)
    manager_x = (size - manager_width) // 2
    manager_y = ssh_y + ssh_height + spacing
    
    if manager_font:
        draw.text((manager_x, manager_y), manager_text, fill=(255, 255, 255, 255), font=manager_font)
    else:
        # Fallback without font
        draw.text((manager_x, manager_y), manager_text, fill=(255, 255, 255, 255))
    
    # Save the image
    img.save(output_path, "PNG")
    print(f"Created {size}x{size} large text icon: {output_path}")
    print(f"  SSH font size: {ssh_font_size}px, Manager font size: {manager_font_size}px")

def main():
    """Generate all required icon sizes with large text"""
    
    sizes = [512, 256, 128, 64, 32, 16]
    icon_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("Creating SSH Manager icons with LARGE text...")
    print("=" * 50)
    
    # Generate all sizes
    for size in sizes:
        output_file = os.path.join(icon_dir, f"large_text_ssh_{size}.png")
        create_large_text_icon(size, output_file)
    
    # Create main icon.png
    main_icon = os.path.join(icon_dir, "icon.png")
    create_large_text_icon(512, main_icon)
    
    print("\n✅ Large text SSH Manager icons generated successfully!")
    print("Text now fills the icon space properly for maximum visibility!")

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