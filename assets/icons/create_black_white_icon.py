#!/usr/bin/env python3
"""
Create simple black and white SSH Manager icon
Design: Black background with white text "SSH" and "Manager" on two lines
"""
import os
from PIL import Image, ImageDraw, ImageFont
import sys

def create_black_white_ssh_icon(size, output_path):
    """Create simple black background with white text SSH Manager icon"""
    
    # Create new image with black background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    
    # Colors
    bg_color = (0, 0, 0, 255)        # Black background
    text_color = (255, 255, 255, 255) # White text
    
    # Calculate font sizes based on icon size - much larger to fill the space
    if size >= 128:
        ssh_font_size = int(size * 0.35)     # Much larger - 35% of icon size
        manager_font_size = int(size * 0.22)  # 22% of icon size
    elif size >= 64:
        ssh_font_size = int(size * 0.4)      # Even larger for medium sizes
        manager_font_size = int(size * 0.25)
    elif size >= 32:
        ssh_font_size = int(size * 0.45)     # Larger for small sizes
        manager_font_size = int(size * 0.3)
    else:
        ssh_font_size = int(size * 0.5)      # Half the icon size for very small
        manager_font_size = int(size * 0.35)
    
    # Try to load a clean font, fallback to default
    ssh_font = None
    manager_font = None
    
    try:
        # Try common clean fonts
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",  # macOS
            "C:\\Windows\\Fonts\\arial.ttf",        # Windows
        ]
        
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    ssh_font = ImageFont.truetype(font_path, ssh_font_size)
                    manager_font = ImageFont.truetype(font_path, manager_font_size)
                    break
                except:
                    continue
        
        if ssh_font is None:
            ssh_font = ImageFont.load_default()
            manager_font = ImageFont.load_default()
            
    except Exception:
        ssh_font = ImageFont.load_default()
        manager_font = ImageFont.load_default()
    
    # Text content
    ssh_text = "SSH"
    manager_text = "Manager"
    
    # Calculate text positions for centering
    try:
        # Get text bounding boxes
        ssh_bbox = draw.textbbox((0, 0), ssh_text, font=ssh_font)
        manager_bbox = draw.textbbox((0, 0), manager_text, font=manager_font)
        
        ssh_width = ssh_bbox[2] - ssh_bbox[0]
        ssh_height = ssh_bbox[3] - ssh_bbox[1]
        manager_width = manager_bbox[2] - manager_bbox[0]
        manager_height = manager_bbox[3] - manager_bbox[1]
    except:
        # Fallback if textbbox not available
        ssh_width = len(ssh_text) * ssh_font_size // 2
        ssh_height = ssh_font_size
        manager_width = len(manager_text) * manager_font_size // 2
        manager_height = manager_font_size
    
    # Calculate vertical spacing
    total_text_height = ssh_height + manager_height
    spacing = size // 16
    total_height = total_text_height + spacing
    
    # Center vertically
    start_y = (size - total_height) // 2
    
    # Draw "SSH" text (centered horizontally)
    ssh_x = (size - ssh_width) // 2
    ssh_y = start_y
    draw.text((ssh_x, ssh_y), ssh_text, fill=text_color, font=ssh_font)
    
    # Draw "Manager" text (centered horizontally)
    manager_x = (size - manager_width) // 2
    manager_y = ssh_y + ssh_height + spacing
    draw.text((manager_x, manager_y), manager_text, fill=text_color, font=manager_font)
    
    # Save the image
    img.save(output_path, "PNG")
    print(f"Created {size}x{size} black & white icon: {output_path}")

def main():
    """Generate all required icon sizes"""
    
    # Standard icon sizes needed for cross-platform packaging
    sizes = [512, 256, 128, 64, 32, 16]
    
    # Create icons directory if it doesn't exist
    icon_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Generate all sizes
    for size in sizes:
        output_file = os.path.join(icon_dir, f"black_white_ssh_{size}.png")
        create_black_white_ssh_icon(size, output_file)
    
    # Also create the main icon.png (512x512 for Linux)
    main_icon = os.path.join(icon_dir, "icon.png")
    create_black_white_ssh_icon(512, main_icon)
    
    print("\n✅ Black & white SSH Manager icons generated successfully!")
    print("Files created:")
    for size in sizes:
        print(f"  - black_white_ssh_{size}.png")
    print("  - icon.png (512x512)")
    
    print("\nDesign: Simple black background with white text")
    print("Text: 'SSH' and 'Manager' on two centered lines")

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