#!/usr/bin/env python3
"""Resize logo.png to Android launcher icon sizes and replace existing icons."""

from PIL import Image
import os

# Input logo
logo_path = "public/logo.png"
res_dir = "android/app/src/main/res"

# Android icon sizes
icon_sizes = {
    "xxxhdpi": 192,
    "xxhdpi": 144,
    "xhdpi": 96,
    "hdpi": 72,
    "mdpi": 48,
}

# Open the logo
try:
    img = Image.open(logo_path).convert("RGBA")
    print(f"✓ Loaded {logo_path} (size: {img.size})")
except Exception as e:
    print(f"✗ Failed to load {logo_path}: {e}")
    exit(1)

# Resize and save for each density
for density, size in icon_sizes.items():
    # Resize the image
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Convert to RGB for PNG export (remove alpha for square icon)
    resized_rgb = Image.new("RGB", (size, size), (255, 255, 255))
    resized_rgb.paste(resized, (0, 0), resized)
    
    # Save as launcher icon
    mipmap_dir = os.path.join(res_dir, f"mipmap-{density}")
    
    # ic_launcher.png
    launcher_path = os.path.join(mipmap_dir, "ic_launcher.png")
    resized_rgb.save(launcher_path)
    print(f"✓ Saved {launcher_path} ({size}x{size})")
    
    # ic_launcher_round.png (rounded version - same image)
    launcher_round_path = os.path.join(mipmap_dir, "ic_launcher_round.png")
    resized_rgb.save(launcher_round_path)
    print(f"✓ Saved {launcher_round_path} ({size}x{size})")

print("\n✓ All Android launcher icons updated successfully!")
