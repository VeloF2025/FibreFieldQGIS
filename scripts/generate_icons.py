#!/usr/bin/env python3
"""
FibreField PWA Icon Generator
Creates professional icons for the fiber optic field data collection app
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def create_fiber_icon(size):
    """Create the main FibreField icon with fiber optic theme"""
    
    # Create image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    primary_blue = (59, 130, 246)  # #3b82f6
    secondary_blue = (37, 99, 235)  # #2563eb
    light_blue = (147, 197, 253)  # #93c5fd
    white = (255, 255, 255)
    gray = (107, 114, 128)  # #6b7280
    
    # Calculate proportions based on size
    center = size // 2
    radius = int(size // 2.5)
    
    # Background circle with gradient effect
    for i in range(radius, 0, -1):
        alpha = int(255 * (1 - i / radius) * 0.1)
        color = (*primary_blue, alpha)
        draw.ellipse([center - i, center - i, center + i, center + i], 
                    fill=color, outline=None)
    
    # Main background circle
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                fill=primary_blue, outline=None)
    
    # Inner circle for depth
    inner_radius = int(radius * 0.85)
    draw.ellipse([center - inner_radius, center - inner_radius, 
                 center + inner_radius, center + inner_radius], 
                fill=secondary_blue, outline=None)
    
    # Fiber optic cable representation
    cable_width = max(2, size // 40)
    
    # Create curved fiber paths
    for angle_offset in [0, 60, 120, 180, 240, 300]:
        angle_rad = math.radians(angle_offset)
        
        # Create curved fiber line
        points = []
        for t in np.linspace(0, 1, 20):
            # Spiral curve
            spiral_angle = angle_rad + t * math.pi * 1.5
            spiral_radius = inner_radius * 0.3 + t * inner_radius * 0.4
            
            x = center + spiral_radius * math.cos(spiral_angle)
            y = center + spiral_radius * math.sin(spiral_angle)
            points.append((x, y))
        
        # Draw fiber cable with gradient effect
        for i in range(len(points) - 1):
            alpha = int(255 * (1 - i / len(points)) * 0.8)
            color = (*light_blue, alpha)
            
            if i < len(points) - 1:
                draw.line([points[i], points[i + 1]], 
                         fill=color, width=cable_width)
    
    # Central connection node
    node_radius = int(radius * 0.2)
    draw.ellipse([center - node_radius, center - node_radius, 
                 center + node_radius, center + node_radius], 
                fill=white, outline=secondary_blue, width=max(1, size // 60))
    
    # Connection points around the center
    for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
        angle_rad = math.radians(angle)
        point_radius = int(radius * 0.65)
        
        x = center + point_radius * math.cos(angle_rad)
        y = center + point_radius * math.sin(angle_rad)
        
        point_size = int(radius * 0.08)
        draw.ellipse([x - point_size, y - point_size, 
                     x + point_size, y + point_size], 
                    fill=light_blue, outline=white, width=max(1, size // 80))
    
    # Add "FF" text for smaller sizes or fiber symbol for larger
    if size >= 128:
        # Try to add fiber symbol
        try:
            font_size = max(12, size // 8)
            # Use system font as fallback
            font = ImageFont.load_default()
            
            # Draw "FF" text
            text = "FF"
            # Get text bbox
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Center the text
            text_x = center - text_width // 2
            text_y = center - text_height // 2
            
            # Draw text with shadow
            draw.text((text_x + 1, text_y + 1), text, font=font, fill=gray)
            draw.text((text_x, text_y), text, font=font, fill=white)
            
        except Exception:
            # Fallback: simple geometric pattern
            line_length = int(radius * 0.3)
            draw.line([center - line_length, center, center + line_length, center], 
                     fill=white, width=max(2, size // 30))
            draw.line([center, center - line_length, center, center + line_length], 
                     fill=white, width=max(2, size // 30))
    
    return img

def create_capture_icon(size):
    """Create camera/capture shortcut icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    primary_blue = (59, 130, 246)
    white = (255, 255, 255)
    gray = (107, 114, 128)
    
    center = size // 2
    
    # Camera body
    camera_width = int(size * 0.7)
    camera_height = int(size * 0.5)
    camera_x = center - camera_width // 2
    camera_y = center - camera_height // 2
    
    # Main camera body
    draw.rounded_rectangle([camera_x, camera_y, 
                           camera_x + camera_width, camera_y + camera_height], 
                          radius=size // 20, fill=primary_blue, outline=white, width=2)
    
    # Lens
    lens_radius = int(size * 0.15)
    draw.ellipse([center - lens_radius, center - lens_radius, 
                 center + lens_radius, center + lens_radius], 
                fill=gray, outline=white, width=2)
    
    # Inner lens
    inner_lens = int(lens_radius * 0.6)
    draw.ellipse([center - inner_lens, center - inner_lens, 
                 center + inner_lens, center + inner_lens], 
                fill=white, outline=None)
    
    # Viewfinder
    vf_width = int(size * 0.2)
    vf_height = int(size * 0.1)
    vf_x = center - vf_width // 2
    vf_y = camera_y - vf_height - int(size * 0.05)
    
    draw.rounded_rectangle([vf_x, vf_y, vf_x + vf_width, vf_y + vf_height], 
                          radius=size // 40, fill=primary_blue, outline=white, width=1)
    
    return img

def create_assignments_icon(size):
    """Create list/tasks shortcut icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    primary_blue = (59, 130, 246)
    light_blue = (147, 197, 253)
    white = (255, 255, 255)
    
    center = size // 2
    
    # Document background
    doc_width = int(size * 0.6)
    doc_height = int(size * 0.8)
    doc_x = center - doc_width // 2
    doc_y = center - doc_height // 2
    
    draw.rounded_rectangle([doc_x, doc_y, doc_x + doc_width, doc_y + doc_height], 
                          radius=size // 20, fill=white, outline=primary_blue, width=2)
    
    # List items
    item_height = doc_height // 6
    item_margin = size // 30
    
    for i in range(4):
        item_y = doc_y + item_margin + i * (item_height + item_margin)
        
        # Checkbox
        checkbox_size = size // 20
        checkbox_x = doc_x + item_margin
        checkbox_y = item_y + (item_height - checkbox_size) // 2
        
        draw.rectangle([checkbox_x, checkbox_y, 
                       checkbox_x + checkbox_size, checkbox_y + checkbox_size], 
                      fill=light_blue if i < 2 else white, 
                      outline=primary_blue, width=1)
        
        # Checkmark for completed items
        if i < 2:
            draw.line([checkbox_x + checkbox_size * 0.2, checkbox_y + checkbox_size * 0.5,
                      checkbox_x + checkbox_size * 0.5, checkbox_y + checkbox_size * 0.8], 
                     fill=primary_blue, width=max(1, size // 60))
            draw.line([checkbox_x + checkbox_size * 0.5, checkbox_y + checkbox_size * 0.8,
                      checkbox_x + checkbox_size * 0.8, checkbox_y + checkbox_size * 0.3], 
                     fill=primary_blue, width=max(1, size // 60))
        
        # Text line
        line_x = checkbox_x + checkbox_size + item_margin
        line_y = item_y + item_height // 2
        line_width = doc_width - checkbox_size - 3 * item_margin
        
        draw.rectangle([line_x, line_y - 1, line_x + line_width, line_y + 1], 
                      fill=primary_blue)
    
    return img

def create_sync_icon(size):
    """Create sync/refresh shortcut icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    primary_blue = (59, 130, 246)
    light_blue = (147, 197, 253)
    white = (255, 255, 255)
    
    center = size // 2
    radius = int(size * 0.3)
    
    # Create curved arrows for sync symbol
    arrow_width = max(3, size // 20)
    
    # Top arrow (clockwise)
    start_angle = 45
    end_angle = 315
    
    # Draw arc for top arrow
    bbox = [center - radius, center - radius, center + radius, center + radius]
    
    # Create points for curved arrow
    points_top = []
    for angle in range(start_angle, end_angle, 5):
        x = center + radius * math.cos(math.radians(angle))
        y = center + radius * math.sin(math.radians(angle))
        points_top.append((x, y))
    
    # Draw the arc
    for i in range(len(points_top) - 1):
        draw.line([points_top[i], points_top[i + 1]], 
                 fill=primary_blue, width=arrow_width)
    
    # Arrow head for top arrow
    end_x, end_y = points_top[-1]
    head_size = size // 15
    angle_rad = math.radians(end_angle)
    
    # Arrow head points
    head_x1 = end_x - head_size * math.cos(angle_rad + 0.5)
    head_y1 = end_y - head_size * math.sin(angle_rad + 0.5)
    head_x2 = end_x - head_size * math.cos(angle_rad - 0.5)
    head_y2 = end_y - head_size * math.sin(angle_rad - 0.5)
    
    draw.polygon([end_x, end_y, head_x1, head_y1, head_x2, head_y2], 
                fill=primary_blue)
    
    # Bottom arrow (counter-clockwise)
    inner_radius = int(radius * 0.6)
    points_bottom = []
    for angle in range(225, 585, 5):  # Extended range for counter-clockwise
        if angle >= 360:
            angle_norm = angle - 360
        else:
            angle_norm = angle
        x = center + inner_radius * math.cos(math.radians(angle_norm))
        y = center + inner_radius * math.sin(math.radians(angle_norm))
        points_bottom.append((x, y))
    
    # Draw the inner arc
    for i in range(len(points_bottom) - 1):
        draw.line([points_bottom[i], points_bottom[i + 1]], 
                 fill=light_blue, width=arrow_width)
    
    # Arrow head for bottom arrow
    start_x, start_y = points_bottom[0]
    head_angle = math.radians(225)
    
    head_x1 = start_x + head_size * math.cos(head_angle + 0.5)
    head_y1 = start_y + head_size * math.sin(head_angle + 0.5)
    head_x2 = start_x + head_size * math.cos(head_angle - 0.5)
    head_y2 = start_y + head_size * math.sin(head_angle - 0.5)
    
    draw.polygon([start_x, start_y, head_x1, head_y1, head_x2, head_y2], 
                fill=light_blue)
    
    return img

def generate_all_icons():
    """Generate all required PWA icons"""
    
    # Main app icon sizes
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    icons_dir = r"C:\Jarvis\AI Workspace\FibreField\public\icons"
    
    print("Generating FibreField PWA icons...")
    
    # Generate main app icons
    for size in sizes:
        print(f"Creating main icon {size}x{size}...")
        icon = create_fiber_icon(size)
        icon.save(os.path.join(icons_dir, f"icon-{size}x{size}.png"), "PNG", optimize=True)
    
    # Generate shortcut icons (96x96)
    print("Creating shortcut icons...")
    
    capture_icon = create_capture_icon(96)
    capture_icon.save(os.path.join(icons_dir, "shortcut-capture.png"), "PNG", optimize=True)
    
    assignments_icon = create_assignments_icon(96)
    assignments_icon.save(os.path.join(icons_dir, "shortcut-assignments.png"), "PNG", optimize=True)
    
    sync_icon = create_sync_icon(96)
    sync_icon.save(os.path.join(icons_dir, "shortcut-sync.png"), "PNG", optimize=True)
    
    print("All icons generated successfully!")
    print(f"Icons saved to: {icons_dir}")

if __name__ == "__main__":
    generate_all_icons()