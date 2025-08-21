#!/usr/bin/env python3
"""
Create professional SSH Manager icon inspired by the layered terminal design
Design: Layered terminal windows with blue gradient and technical background
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import sys
import random

def create_code_texture(size, intensity=0.3):
    """Create a subtle code/technical texture background"""
    texture = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(texture)
    
    # Add random technical characters with low opacity
    chars = ['0', '1', '{', '}', '[', ']', '(', ')', '<', '>', '/', '\\', '|', '-', '_', '=', '+', '#']
    
    if size >= 64:
        char_size = max(6, size // 40)
        char_spacing = char_size + 2
        
        try:
            font = ImageFont.load_default()
        except:
            font = None
        
        for y in range(0, size, char_spacing * 2):
            for x in range(0, size, char_spacing):
                if random.random() < intensity:
                    char = random.choice(chars)
                    opacity = int(random.random() * 60 + 20)  # 20-80 opacity
                    color = (200, 200, 255, opacity)
                    if font:
                        draw.text((x, y), char, fill=color, font=font)
    
    return texture

def create_professional_ssh_icon(size, output_path):
    """Create professional layered SSH Manager icon"""
    
    # Create new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Color scheme - blue gradient like the reference
    dark_blue = (30, 50, 80, 255)
    med_blue = (50, 80, 120, 255)
    light_blue = (70, 110, 160, 255)
    accent_blue = (90, 140, 200, 255)
    
    # Text colors
    title_color = (255, 255, 255, 255)      # White for SSH
    subtitle_color = (220, 220, 220, 255)   # Light gray for Manager
    
    # Calculate dimensions
    margin = size // 16
    corner_radius = size // 20
    
    # Create gradient background (main terminal window)
    main_rect = [margin, margin, size - margin, size - margin]
    
    # Draw gradient background
    for y in range(main_rect[1], main_rect[3]):
        progress = (y - main_rect[1]) / (main_rect[3] - main_rect[1])
        r = int(dark_blue[0] + (light_blue[0] - dark_blue[0]) * progress)
        g = int(dark_blue[1] + (light_blue[1] - dark_blue[1]) * progress)
        b = int(dark_blue[2] + (light_blue[2] - dark_blue[2]) * progress)
        color = (r, g, b, 255)
        draw.line([(main_rect[0], y), (main_rect[2], y)], fill=color)
    
    # Add rounded corners by drawing rounded rectangle over gradient
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(main_rect, radius=corner_radius, fill=255)
    
    # Apply mask to create rounded corners
    rounded_bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rounded_bg.paste(img, mask=mask)
    img = rounded_bg
    draw = ImageDraw.Draw(img)
    
    # Add code texture overlay
    if size >= 32:
        texture = create_code_texture(size, intensity=0.2)
        texture_mask = Image.new('L', (size, size), 0)
        texture_mask_draw = ImageDraw.Draw(texture_mask)
        texture_mask_draw.rounded_rectangle(main_rect, radius=corner_radius, fill=255)
        img = Image.alpha_composite(img, texture)
    
    # Draw secondary terminal window (layered behind)
    if size >= 64:
        offset = size // 20
        shadow_rect = [margin + offset, margin - offset, 
                      size - margin + offset, size - margin - offset]
        
        # Create shadow effect
        shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(shadow_rect, radius=corner_radius, 
                                    fill=(0, 0, 0, 80))
        
        # Blur the shadow
        if size >= 128:
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=size//40))
        
        img = Image.alpha_composite(shadow, img)
        draw = ImageDraw.Draw(img)
    
    # Add window border/frame
    border_color = (accent_blue[0], accent_blue[1], accent_blue[2], 180)
    border_width = max(1, size // 64)
    if border_width > 0:
        draw.rounded_rectangle(main_rect, radius=corner_radius, 
                             outline=border_color, width=border_width)
    
    # Calculate font sizes
    if size >= 256:
        ssh_font_size = size // 8
        manager_font_size = size // 12
    elif size >= 128:
        ssh_font_size = size // 6
        manager_font_size = size // 9
    elif size >= 64:
        ssh_font_size = size // 4
        manager_font_size = size // 6
    elif size >= 32:
        ssh_font_size = size // 3
        manager_font_size = size // 4
    else:
        ssh_font_size = size // 2
        manager_font_size = size // 3
    
    # Try to load fonts
    ssh_font = None
    manager_font = None
    
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "C:\\Windows\\Fonts\\arial.ttf",
        ]
        
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    ssh_font = ImageFont.truetype(font_path, ssh_font_size)
                    # Try regular version for manager text
                    regular_font_path = font_path.replace('-Bold', '').replace('bold', '')
                    if os.path.exists(regular_font_path):
                        manager_font = ImageFont.truetype(regular_font_path, manager_font_size)
                    else:
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
    
    # Calculate text positions
    try:
        ssh_bbox = draw.textbbox((0, 0), ssh_text, font=ssh_font)
        manager_bbox = draw.textbbox((0, 0), manager_text, font=manager_font)
        
        ssh_width = ssh_bbox[2] - ssh_bbox[0]
        ssh_height = ssh_bbox[3] - ssh_bbox[1]
        manager_width = manager_bbox[2] - manager_bbox[0]
        manager_height = manager_bbox[3] - manager_bbox[1]
    except:
        ssh_width = len(ssh_text) * ssh_font_size // 2
        ssh_height = ssh_font_size
        manager_width = len(manager_text) * manager_font_size // 2
        manager_height = manager_font_size
    
    # Center the text block
    text_spacing = size // 20
    total_text_height = ssh_height + manager_height + text_spacing
    
    # Position text in center of main window
    window_center_x = (main_rect[0] + main_rect[2]) // 2
    window_center_y = (main_rect[1] + main_rect[3]) // 2
    
    # SSH text (centered)
    ssh_x = window_center_x - ssh_width // 2
    ssh_y = window_center_y - total_text_height // 2
    
    # Add text shadow for better visibility
    if size >= 64:
        shadow_offset = max(1, size // 128)
        draw.text((ssh_x + shadow_offset, ssh_y + shadow_offset), 
                 ssh_text, fill=(0, 0, 0, 120), font=ssh_font)
    
    draw.text((ssh_x, ssh_y), ssh_text, fill=title_color, font=ssh_font)
    
    # Manager text (centered)
    manager_x = window_center_x - manager_width // 2
    manager_y = ssh_y + ssh_height + text_spacing
    
    if size >= 64:
        shadow_offset = max(1, size // 128)
        draw.text((manager_x + shadow_offset, manager_y + shadow_offset), 
                 manager_text, fill=(0, 0, 0, 120), font=manager_font)
    
    draw.text((manager_x, manager_y), manager_text, fill=subtitle_color, font=manager_font)
    
    # Save the image
    img.save(output_path, "PNG")
    print(f"Created {size}x{size} professional icon: {output_path}")

def main():
    """Generate all required icon sizes"""
    
    # Standard icon sizes
    sizes = [512, 256, 128, 64, 32, 16]
    
    icon_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Generate all sizes
    for size in sizes:
        output_file = os.path.join(icon_dir, f"professional_ssh_{size}.png")
        create_professional_ssh_icon(size, output_file)
    
    # Create main icon.png
    main_icon = os.path.join(icon_dir, "icon.png")
    create_professional_ssh_icon(512, main_icon)
    
    print("\n✅ Professional SSH Manager icons generated successfully!")
    print("Design: Layered terminal windows with blue gradient and technical texture")
    print("Style: Similar to the reference image with professional depth")

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