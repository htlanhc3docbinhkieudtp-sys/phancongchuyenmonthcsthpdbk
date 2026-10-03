import subprocess

# RENDER AT 2400 x 1260 (2x Ultra HD for maximum sharpness when downscaled to 1200x630)
W, H = 2400, 1260

# 1. Base Background with rich dark navy gradient
subprocess.run([
    'convert', '-size', f'{W}x{H}',
    'gradient:#0b172a-#050914',
    'base2x.png'
], check=True)

# 2. Outer golden accent top bar (12px) & sleek border
subprocess.run([
    'convert', 'base2x.png',
    '-fill', '#f59e0b', '-draw', f'rectangle 0,0 {W},12',
    '-fill', 'none', '-stroke', '#1e3a8a', '-strokewidth', '4',
    '-draw', f'roundrectangle 36,36 {W-36},{H-36} 32,32',
    '-fill', 'none', '-stroke', '#2563eb', '-strokewidth', '2',
    '-draw', f'roundrectangle 44,44 {W-44},{H-44} 28,28',
    'framed2x.png'
], check=True)

# 3. Logo Badge
# In 2400x1260, let logo badge be 960x960
# White circular disc with gold & deep blue border
subprocess.run([
    'convert', '-size', '960x960', 'xc:none',
    # Outer dark blue / sky blue glow ring
    '-fill', '#0f275c', '-stroke', '#38bdf8', '-strokewidth', '6',
    '-draw', 'circle 480,480 480,24',
    # Golden border ring
    '-fill', '#ffffff', '-stroke', '#f59e0b', '-strokewidth', '12',
    '-draw', 'circle 480,480 480,48',
    'badge_bg2x.png'
], check=True)

# Resize authentic logo to 780x780 with high-quality Lanczos filter
subprocess.run([
    'convert', 'logo doc binh kieu.png',
    '-filter', 'Lanczos', '-resize', '780x780',
    'logo_780.png'
], check=True)

# Composite logo on badge_bg
subprocess.run([
    'composite', '-gravity', 'center',
    'logo_780.png', 'badge_bg2x.png',
    'official_badge2x.png'
], check=True)

# Place badge on framed background: centered vertically (Y = (1260 - 960) / 2 = 150), X = 100
subprocess.run([
    'composite', '-geometry', '+100+150',
    'official_badge2x.png', 'framed2x.png',
    'step1_2x.png'
], check=True)

# 4. Big, bold, ultra-legible typography on the right (starting at X = 1130)
# No tiny cluttered text. Only large, crisp, essential information.
subprocess.run([
    'convert', 'step1_2x.png',
    '-font', 'Liberation-Sans-Bold',

    # 4.1. Department Badge:
    '-fill', '#1e293b', '-stroke', '#f59e0b', '-strokewidth', '3',
    '-draw', 'roundrectangle 1130,170 2160,250 40,40',
    '-fill', '#fde047', '-stroke', 'none', '-pointsize', '34',
    '-gravity', 'NorthWest', '-annotate', '+1180+192', 'SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH ĐỒNG THÁP',

    # 4.2. School Name (Massive, bold, clean white):
    '-fill', '#ffffff', '-pointsize', '72',
    '-annotate', '+1130+300', 'TRƯỜNG THCS & THPT',
    '-fill', '#ffffff', '-pointsize', '82',
    '-annotate', '+1130+390', 'ĐỐC BINH KIỀU',

    # 4.3. High-contrast accent divider:
    '-fill', '#f59e0b', '-draw', 'rectangle 1130,505 1550,513',
    '-fill', '#38bdf8', '-draw', 'rectangle 1550,505 2260,513',

    # 4.4. Application Name (Vivid Cyan & Sky Blue, large & bold):
    '-fill', '#38bdf8', '-pointsize', '60',
    '-annotate', '+1130+560', 'PHÂN CÔNG CHUYÊN MÔN',
    '-fill', '#60a5fa', '-pointsize', '56',
    '-annotate', '+1130+640', '& THỜI KHÓA BIỂU',

    # 4.5. Key Highlight Pills (Large, bold, high contrast):
    '-fill', '#0f172a', '-stroke', '#334155', '-strokewidth', '3',
    '-draw', 'roundrectangle 1130,750 2260,940 24,24',

    # Inside Highlight Box:
    '-fill', '#34d399', '-stroke', 'none', '-pointsize', '42',
    '-annotate', '+1180+800', '● QUẢN LÝ 53 LỚP HỌC (2 ĐIỂM TRƯỜNG)',

    '-fill', '#fbbf24', '-stroke', 'none', '-pointsize', '42',
    '-annotate', '+1180+865', '● XẾP LỊCH TỰ ĐỘNG & KIỂM TRA TRÙNG TIẾT',

    # 4.6. Footer info:
    '-fill', '#94a3b8', '-stroke', 'none', '-pointsize', '34',
    '-annotate', '+1130+1010', 'Huyện Tháp Mười, Tỉnh Đồng Tháp • Năm học 2026 - 2027',

    'card2x.png'
], check=True)

# 5. Downsample to 1200x630 with high-quality Lanczos filter & light unsharp mask
subprocess.run([
    'convert', 'card2x.png',
    '-filter', 'Lanczos',
    '-resize', '1200x630',
    '-unsharp', '0x0.75+0.75+0.008',
    'public/og-image.png'
], check=True)

# 6. Generate JPEG version
subprocess.run([
    'convert', 'public/og-image.png',
    '-quality', '95',
    'public/og-image.jpg'
], check=True)

print("Generated crisp 1200x630 og-image.png and og-image.jpg successfully")
