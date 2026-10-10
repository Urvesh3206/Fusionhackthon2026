from PIL import Image, ImageDraw, ImageFont
import math
import os

def create_pwa_icon(size, output_path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded container with dark slate & vibrant red border
    margin = int(size * 0.04)
    radius = int(size * 0.22)
    
    # Outer subtle glow / background
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(15, 23, 42, 255), # slate-900
        outline=(225, 29, 72, 255), # rose-600
        width=max(2, int(size * 0.025))
    )
    
    # Draw Emergency Cross / Shield with glowing pulse rings
    center_x = size // 2
    center_y = size // 2
    
    # Pulse rings (radar style)
    for r_factor, alpha in [(0.42, 40), (0.34, 70), (0.26, 110)]:
        r = int(size * r_factor)
        draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            outline=(244, 63, 94, alpha),
            width=max(1, int(size * 0.015))
        )
    
    # Emergency medical cross with glowing red / rose styling
    arm_w = int(size * 0.16)
    arm_len = int(size * 0.44)
    cross_radius = max(2, int(size * 0.03))
    
    # Vertical arm
    draw.rounded_rectangle(
        [center_x - arm_w // 2, center_y - arm_len // 2, center_x + arm_w // 2, center_y + arm_len // 2],
        radius=cross_radius,
        fill=(225, 29, 72, 255) # rose-600
    )
    
    # Horizontal arm
    draw.rounded_rectangle(
        [center_x - arm_len // 2, center_y - arm_w // 2, center_x + arm_len // 2, center_y + arm_w // 2],
        radius=cross_radius,
        fill=(225, 29, 72, 255) # rose-600
    )
    
    # Inner bright core
    inner_w = int(arm_w * 0.5)
    inner_len = int(arm_len * 0.6)
    draw.rounded_rectangle(
        [center_x - inner_w // 2, center_y - inner_len // 2, center_x + inner_w // 2, center_y + inner_len // 2],
        radius=cross_radius,
        fill=(255, 255, 255, 230)
    )
    draw.rounded_rectangle(
        [center_x - inner_len // 2, center_y - inner_w // 2, center_x + inner_len // 2, center_y + inner_w // 2],
        radius=cross_radius,
        fill=(255, 255, 255, 230)
    )
    
    # Central beacon signal dot
    core_dot = int(size * 0.06)
    draw.ellipse(
        [center_x - core_dot, center_y - core_dot, center_x + core_dot, center_y + core_dot],
        fill=(6, 182, 212, 255) # cyan-500 beacon pulse
    )
    
    img.save(output_path, "PNG")
    print(f"Generated icon: {output_path} ({size}x{size})")

public_dir = r"C:\Fusion\Tidewatch\frontend\public"
os.makedirs(public_dir, exist_ok=True)

create_pwa_icon(512, os.path.join(public_dir, "icon-512.png"))
create_pwa_icon(192, os.path.join(public_dir, "icon-192.png"))
create_pwa_icon(180, os.path.join(public_dir, "apple-touch-icon.png"))
create_pwa_icon(64, os.path.join(public_dir, "favicon.png"))
