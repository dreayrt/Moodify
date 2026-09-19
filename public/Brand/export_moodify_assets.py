import os
import shutil
import json
import base64
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BASE_DIR = r"D:\Hai\study\DATN\Brand"
ASSETS_DIR = os.path.join(BASE_DIR, "moodify_brand_assets")
AI_MASTERS_DIR = os.path.join(BASE_DIR, "ai_generated_masters")

RAW_DIR = os.path.join(BASE_DIR, "raw_source_images")

def find_source(filename):
    p1 = os.path.join(RAW_DIR, filename)
    if os.path.exists(p1):
        return p1
    p2 = os.path.join(BASE_DIR, filename)
    if os.path.exists(p2):
        return p2
    return p1

AI_APP_ICON = os.path.join(AI_MASTERS_DIR, "moodify_app_icon_1789491053278.jpg")
AI_SYMBOL = os.path.join(AI_MASTERS_DIR, "moodify_symbol_clean_1789491118723.jpg")
AI_SOUNDWAVE = os.path.join(AI_MASTERS_DIR, "moodify_soundwave_bg_1789491158203.jpg")

def ensure_dir(d):
    os.makedirs(d, exist_ok=True)

# -------------------------------------------------------------
# 1. Directory Structure Setup
# -------------------------------------------------------------
DIRS = {
    "guidelines_master": os.path.join(ASSETS_DIR, "brand_guidelines", "master"),
    "guidelines_raw": os.path.join(ASSETS_DIR, "brand_guidelines", "raw_originals"),
    "logo_primary": os.path.join(ASSETS_DIR, "logos", "primary"),
    "logo_black": os.path.join(ASSETS_DIR, "logos", "monochrome_black"),
    "logo_white": os.path.join(ASSETS_DIR, "logos", "monochrome_white"),
    "logo_symbol": os.path.join(ASSETS_DIR, "logos", "symbol_only"),
    "logo_wordmark": os.path.join(ASSETS_DIR, "logos", "wordmark_only"),
    "app_icons": os.path.join(ASSETS_DIR, "app_icons"),
    "web": os.path.join(ASSETS_DIR, "web"),
    "ios": os.path.join(ASSETS_DIR, "mobile", "ios", "AppIcon.appiconset"),
    "android_res": os.path.join(ASSETS_DIR, "mobile", "android", "res"),
    "android_root": os.path.join(ASSETS_DIR, "mobile", "android"),
    "banners": os.path.join(ASSETS_DIR, "banners_and_backgrounds"),
    "tokens": os.path.join(ASSETS_DIR, "tokens"),
}

for d in DIRS.values():
    ensure_dir(d)

# -------------------------------------------------------------
# 2. Archive & Rename Originals
# -------------------------------------------------------------
print("--> Archiving and renaming original guideline sheets...")

MASTER_FILES = {
    "Brand1.png": "moodify_brand_guidelines_overview.png",
    "Brand2.png": "moodify_app_icon_exploration.png",
    "Brand3.png": "moodify_ui_showcase_mockups.png",
    "Brand4.png": "moodify_brand_elements_sheet.png",
    "ChatGPT Image 21_07_40 15 thg 9, 2026.png": "moodify_design_system_master_kit.png",
    "ChatGPT Image 21_29_33 15 thg 9, 2026.png": "moodify_ui_and_screens_suite.png"
}

for src_name, dst_name in MASTER_FILES.items():
    src_path = find_source(src_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, os.path.join(DIRS["guidelines_master"], dst_name))

ALL_ORIGINALS_MAP = {
    "Brand1.png": "01_master_brand_guidelines_overview.png",
    "Brand2.png": "02_master_app_icon_exploration.png",
    "Brand3.png": "03_master_ui_showcase_mockups.png",
    "Brand4.png": "04_master_brand_elements_sheet.png",
    "ChatGPT Image 21_07_40 15 thg 9, 2026.png": "05_master_design_system_kit_comprehensive.png",
    "ChatGPT Image 21_28_22 15 thg 9, 2026 (1).png": "06_logo_horizontal_color_on_white.png",
    "ChatGPT Image 21_28_23 15 thg 9, 2026 (2).png": "07_symbol_mark_color_on_white.png",
    "ChatGPT Image 21_28_28 15 thg 9, 2026 (3).png": "08_logo_horizontal_monochrome_black_on_white.png",
    "ChatGPT Image 21_28_29 15 thg 9, 2026 (4).png": "09_logo_horizontal_monochrome_white_on_navy.png",
    "ChatGPT Image 21_28_30 15 thg 9, 2026 (5).png": "10_app_icon_dark_preview.png",
    "ChatGPT Image 21_29_33 15 thg 9, 2026.png": "11_ui_and_screens_suite_6grid.png",
    "ChatGPT Image 22_11_48 15 thg 9, 2026 (1).png": "12_logo_with_tagline_and_manifesto_v1.png",
    "ChatGPT Image 22_11_48 15 thg 9, 2026 (2).png": "13_symbol_mark_with_label_transparent.png",
    "ChatGPT Image 22_11_48 15 thg 9, 2026 (3).png": "14_logo_with_tagline_16x9.png",
    "ChatGPT Image 22_11_48 15 thg 9, 2026 (4).png": "15_logo_with_centered_tagline.png",
    "ChatGPT Image 22_11_48 15 thg 9, 2026 (5).png": "16_logo_with_slogan_and_subtext_v2.png",
    "ChatGPT Image 22_11_48 15 thg 9, 2026 (6).png": "17_logo_with_brand_positioning_v3.png",
    "ChatGPT Image 22_11_48 15 thg 9, 2026 (7).png": "18_elements_cutout_sheet_transparent.png",
    "ChatGPT Image 22_39_53 15 thg 9, 2026 (1).png": "19_app_icon_01_dark_glow_square.png",
    "ChatGPT Image 22_39_54 15 thg 9, 2026 (2).png": "20_app_icon_02_light_clean_square.png",
    "ChatGPT Image 22_39_56 15 thg 9, 2026 (3).png": "21_app_icon_03_gradient_background_square.png",
    "ChatGPT Image 22_39_58 15 thg 9, 2026 (4).png": "22_app_icon_04_monochrome_minimal_square.png",
    "ChatGPT Image 22_39_58 15 thg 9, 2026 (5).png": "23_app_icon_05_neon_ring_square.png"
}

for src_name, clean_name in ALL_ORIGINALS_MAP.items():
    src_path = find_source(src_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, os.path.join(DIRS["guidelines_raw"], clean_name))

# -------------------------------------------------------------
# 3. Alpha Matte Extraction & Cleanup Utilities
# -------------------------------------------------------------
def clean_stray_artifacts(rgba_arr, min_area=80):
    alpha = rgba_arr[:, :, 3]
    binary = (alpha > 15).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if num_labels <= 1:
        return rgba_arr
    
    cleaned_alpha = alpha.copy()
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < min_area:
            cleaned_alpha[labels == i] = 0
            
    res = rgba_arr.copy()
    res[:, :, 3] = cleaned_alpha
    return res

def unmix_solid_background(img_bgr, bg_color=None, low_thresh=8.0, high_thresh=32.0, min_area=80):
    img_f = img_bgr.astype(np.float32)
    if bg_color is None:
        borders = np.concatenate([img_bgr[:15, :], img_bgr[-15:, :], img_bgr[:, :15], img_bgr[:, -15:]], axis=None).reshape(-1, 3)
        bg_color = np.median(borders, axis=0)
    else:
        bg_color = np.array(bg_color, dtype=np.float32)

    diff = np.max(np.abs(img_f - bg_color), axis=2)
    alpha = np.clip((diff - low_thresh) / (high_thresh - low_thresh), 0.0, 1.0)

    # De-pollute foreground color against fringing
    alpha_safe = np.maximum(alpha, 1e-4)[:, :, np.newaxis]
    fg = (img_f - (1.0 - alpha_safe) * bg_color) / alpha_safe
    fg = np.clip(fg, 0, 255).astype(np.uint8)

    fg_rgb = cv2.cvtColor(fg, cv2.COLOR_BGR2RGB)
    alpha_uint8 = (alpha * 255).astype(np.uint8)
    rgba = np.dstack([fg_rgb, alpha_uint8])
    rgba_cleaned = clean_stray_artifacts(rgba, min_area=min_area)
    return Image.fromarray(rgba_cleaned)

def trim_transparent(pil_img, pad=16):
    bbox = pil_img.getbbox()
    if not bbox:
        return pil_img
    w, h = pil_img.size
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(w, bbox[2] + pad)
    y1 = min(h, bbox[3] + pad)
    return pil_img.crop((x0, y0, x1, y1))

def save_image_formats(pil_img, base_path, make_svg=True):
    png_path = base_path + ".png"
    pil_img.save(png_path, "PNG", optimize=True)
    
    webp_path = base_path + ".webp"
    pil_img.save(webp_path, "WEBP", quality=95, method=6)
    
    if make_svg:
        svg_path = base_path + ".svg"
        w, h = pil_img.size
        buffered_bytes = open(png_path, "rb").read()
        b64_str = base64.b64encode(buffered_bytes).decode("ascii")
        svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <image width="{w}" height="{h}" href="data:image/png;base64,{b64_str}"/>
</svg>'''
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(svg_content)

# -------------------------------------------------------------
# 4. Extract Logos
# -------------------------------------------------------------
print("--> Extracting and generating Logo suites...")

# A. Primary Horizontal Logo
img_logo_color = cv2.imread(find_source("ChatGPT Image 21_28_22 15 thg 9, 2026 (1).png"))
logo_color_rgba = unmix_solid_background(img_logo_color, low_thresh=8.0, high_thresh=32.0)
logo_color_trimmed = trim_transparent(logo_color_rgba, pad=20)
save_image_formats(logo_color_trimmed, os.path.join(DIRS["logo_primary"], "logo_primary_horizontal"))

# B. Primary Symbol Only (from AI Master)
img_symbol_color = cv2.imread(AI_SYMBOL)
diff_sym = np.max(np.abs(img_symbol_color.astype(float) - [255, 255, 255]), axis=2)
alpha_sym = np.clip((diff_sym - 12.0) / 24.0, 0.0, 1.0)
alpha_safe = np.maximum(alpha_sym, 1e-4)[:, :, np.newaxis]
fg_sym = (img_symbol_color.astype(float) - (1.0 - alpha_safe) * [255, 255, 255]) / alpha_safe
fg_sym = np.clip(fg_sym, 0, 255).astype(np.uint8)
rgba_sym = np.dstack([cv2.cvtColor(fg_sym, cv2.COLOR_BGR2RGB), (alpha_sym * 255).astype(np.uint8)])
symbol_color_trimmed = trim_transparent(Image.fromarray(rgba_sym), pad=16)
save_image_formats(symbol_color_trimmed, os.path.join(DIRS["logo_symbol"], "symbol_gradient"))

# Centered 1024x1024 symbol for avatars/general use
canvas_sym_1024 = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
sw, sh = symbol_color_trimmed.size
scale = 720.0 / max(sw, sh)
target_sw, target_sh = int(sw * scale), int(sh * scale)
symbol_resized = symbol_color_trimmed.resize((target_sw, target_sh), Image.Resampling.LANCZOS)
canvas_sym_1024.paste(symbol_resized, ((1024 - target_sw) // 2, (1024 - target_sh) // 2), symbol_resized)
save_image_formats(canvas_sym_1024, os.path.join(DIRS["logo_symbol"], "symbol_gradient_1024"))

# C. Monochrome Black Logo & Black Symbol
img_logo_black = cv2.imread(find_source("ChatGPT Image 21_28_28 15 thg 9, 2026 (3).png"))
logo_black_rgba = unmix_solid_background(img_logo_black, low_thresh=8.0, high_thresh=32.0)
logo_black_trimmed = trim_transparent(logo_black_rgba, pad=20)
save_image_formats(logo_black_trimmed, os.path.join(DIRS["logo_black"], "logo_black_horizontal"))

sym_black_bbox = (0, 0, int(logo_black_trimmed.width * 0.42), logo_black_trimmed.height)
symbol_black_trimmed = trim_transparent(logo_black_trimmed.crop(sym_black_bbox), pad=16)
save_image_formats(symbol_black_trimmed, os.path.join(DIRS["logo_symbol"], "symbol_black"))

# D. Monochrome White Logo & White Symbol
img_logo_white = cv2.imread(find_source("ChatGPT Image 21_28_29 15 thg 9, 2026 (4).png"))
bg_navy = np.median(img_logo_white[:15, :15], axis=(0, 1))
logo_white_rgba = unmix_solid_background(img_logo_white, bg_color=bg_navy, low_thresh=10.0, high_thresh=60.0)
logo_white_trimmed = trim_transparent(logo_white_rgba, pad=20)
save_image_formats(logo_white_trimmed, os.path.join(DIRS["logo_white"], "logo_white_horizontal"))

sym_white_bbox = (0, 0, int(logo_white_trimmed.width * 0.42), logo_white_trimmed.height)
symbol_white_trimmed = trim_transparent(logo_white_trimmed.crop(sym_white_bbox), pad=16)
save_image_formats(symbol_white_trimmed, os.path.join(DIRS["logo_symbol"], "symbol_white"))

# E. Wordmark Only (Dark & White) - Cleanly extracted
# From logo_color_trimmed, take letters area
wordmark_dark_bbox = (int(logo_color_trimmed.width * 0.40), 0, logo_color_trimmed.width, logo_color_trimmed.height)
wordmark_dark_crop = logo_color_trimmed.crop(wordmark_dark_bbox)
# Apply stray artifact cleaning
wm_arr = np.array(wordmark_dark_crop)
wm_cleaned_arr = clean_stray_artifacts(wm_arr, min_area=120)
wordmark_dark_trimmed = trim_transparent(Image.fromarray(wm_cleaned_arr), pad=12)
save_image_formats(wordmark_dark_trimmed, os.path.join(DIRS["logo_wordmark"], "wordmark_dark"))

wordmark_white_bbox = (int(logo_white_trimmed.width * 0.40), 0, logo_white_trimmed.width, logo_white_trimmed.height)
wordmark_white_crop = logo_white_trimmed.crop(wordmark_white_bbox)
wm_white_arr = np.array(wordmark_white_crop)
wm_white_cleaned = clean_stray_artifacts(wm_white_arr, min_area=120)
wordmark_white_trimmed = trim_transparent(Image.fromarray(wm_white_cleaned), pad=12)
save_image_formats(wordmark_white_trimmed, os.path.join(DIRS["logo_wordmark"], "wordmark_white"))

# F. Logo with Tagline ("MUSIC FOR A BRIGHTER YOU")
img_logo_tagline = cv2.imread(find_source("ChatGPT Image 22_11_48 15 thg 9, 2026 (4).png"))
logo_tagline_rgba = unmix_solid_background(img_logo_tagline, low_thresh=8.0, high_thresh=32.0)
logo_tagline_trimmed = trim_transparent(logo_tagline_rgba, pad=20)
save_image_formats(logo_tagline_trimmed, os.path.join(DIRS["logo_primary"], "logo_primary_with_tagline"))

# G. Stacked Logo (Symbol above wordmark)
stacked_w, stacked_h = 800, 700
canvas_stacked = Image.new("RGBA", (stacked_w, stacked_h), (0, 0, 0, 0))
s_scale = 440.0 / symbol_color_trimmed.width
s_w, s_h = int(symbol_color_trimmed.width * s_scale), int(symbol_color_trimmed.height * s_scale)
s_res = symbol_color_trimmed.resize((s_w, s_h), Image.Resampling.LANCZOS)

w_scale = 480.0 / wordmark_dark_trimmed.width
w_w, w_h = int(wordmark_dark_trimmed.width * w_scale), int(wordmark_dark_trimmed.height * w_scale)
w_res = wordmark_dark_trimmed.resize((w_w, w_h), Image.Resampling.LANCZOS)

spacing = 40
total_content_h = s_h + spacing + w_h
s_y = (stacked_h - total_content_h) // 2
w_y = s_y + s_h + spacing

canvas_stacked.paste(s_res, ((stacked_w - s_w) // 2, s_y), s_res)
canvas_stacked.paste(w_res, ((stacked_w - w_w) // 2, w_y), w_res)
# Ensure clean alpha
st_arr = clean_stray_artifacts(np.array(canvas_stacked), min_area=120)
stacked_trimmed = trim_transparent(Image.fromarray(st_arr), pad=24)
save_image_formats(stacked_trimmed, os.path.join(DIRS["logo_primary"], "logo_primary_stacked"))

# -------------------------------------------------------------
# 5. Extract & Process App Icons (1024x1024) - Zero Halo / Clean Contour
# -------------------------------------------------------------
print("--> Processing App Icon variations with precision squircle masking...")

def extract_clean_squircle(img_path, output_name, is_ai_master=False, target_size=1024, icon_scale=0.86):
    img = cv2.imread(img_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    if is_ai_master:
        thresh = (gray < 140).astype(np.uint8) * 255
        cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        c = max(cnts, key=cv2.contourArea)
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [c], -1, 255, thickness=cv2.FILLED)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        clean_mask = cv2.erode(mask, kernel, iterations=1)
    else:
        edges = cv2.Canny(gray, 30, 90)
        cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        large_cnts = [c for c in cnts if cv2.contourArea(cv2.convexHull(c)) > 200000]
        c = max(large_cnts, key=lambda c: cv2.contourArea(cv2.convexHull(c)))
        hull = cv2.convexHull(c)
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [hull], -1, 255, thickness=cv2.FILLED)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        clean_mask = cv2.erode(mask, kernel, iterations=1)
        
    y_idx, x_idx = np.where(clean_mask > 0)
    x0, y0, x1, y1 = x_idx.min(), y_idx.min(), x_idx.max(), y_idx.max()
    
    crop_bgr = img[y0:y1+1, x0:x1+1].copy()
    crop_alpha = clean_mask[y0:y1+1, x0:x1+1].copy()
    
    # 1px smooth antialiasing along squircle boundary
    crop_alpha_f = cv2.GaussianBlur(crop_alpha.astype(float), (3, 3), 0.7)
    
    crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
    crop_rgba = np.dstack([crop_rgb, crop_alpha_f.astype(np.uint8)])
    pil_crop = Image.fromarray(crop_rgba)
    
    # Center on target 1024x1024 canvas with balanced margin
    cw, ch = pil_crop.size
    fit_dim = int(target_size * icon_scale)
    scale = min(fit_dim / cw, fit_dim / ch)
    new_w, new_h = int(cw * scale), int(ch * scale)
    resized = pil_crop.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    paste_x = (target_size - new_w) // 2
    paste_y = (target_size - new_h) // 2
    canvas.paste(resized, (paste_x, paste_y), resized)
    
    canvas.save(os.path.join(DIRS["app_icons"], f"{output_name}.png"), "PNG")
    canvas.save(os.path.join(DIRS["app_icons"], f"{output_name}.webp"), "WEBP", quality=95)
    return canvas

# 1. Generate all 5 clean squircle icons (Zero White Halo, 100% Alpha=0 outside)
icon_dark = extract_clean_squircle(AI_APP_ICON, "icon_dark_glow_1024", is_ai_master=True)
icon_light = extract_clean_squircle(find_source("ChatGPT Image 22_39_54 15 thg 9, 2026 (2).png"), "icon_light_1024")
icon_gradient = extract_clean_squircle(find_source("ChatGPT Image 22_39_56 15 thg 9, 2026 (3).png"), "icon_gradient_1024")
icon_monochrome = extract_clean_squircle(find_source("ChatGPT Image 22_39_58 15 thg 9, 2026 (4).png"), "icon_monochrome_1024")
icon_neon_ring = extract_clean_squircle(find_source("ChatGPT Image 22_39_58 15 thg 9, 2026 (5).png"), "icon_neon_ring_1024")

# 2. Full-Bleed Store Icon (1024x1024 square, solid background, official App Store & Play Store spec)
def make_vertical_gradient(width, height, top_rgb, bottom_rgb):
    top = np.array(top_rgb, dtype=float)
    bot = np.array(bottom_rgb, dtype=float)
    arr = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        t = y / (height - 1)
        c = (1.0 - t) * top + t * bot
        arr[y, :] = c.astype(np.uint8)
    return Image.fromarray(arr)

app_store_icon = make_vertical_gradient(1024, 1024, (24, 26, 48), (11, 13, 28))
# Place glowing symbol centered at safe zone 580px
scale_store = 580.0 / max(symbol_color_trimmed.width, symbol_color_trimmed.height)
store_sym_w = int(symbol_color_trimmed.width * scale_store)
store_sym_h = int(symbol_color_trimmed.height * scale_store)
store_sym_res = symbol_color_trimmed.resize((store_sym_w, store_sym_h), Image.Resampling.LANCZOS)
app_store_icon.paste(store_sym_res, ((1024 - store_sym_w) // 2, (1024 - store_sym_h) // 2), store_sym_res)
app_store_icon.save(os.path.join(DIRS["app_icons"], "icon_dark_glow_fullbleed_1024.png"), "PNG")
app_store_icon.save(os.path.join(DIRS["app_icons"], "icon_dark_glow_fullbleed_1024.webp"), "WEBP", quality=98)

# 3. Android Adaptive Icon Foreground & Background (1024x1024 with 432dp spec)
adaptive_bg = Image.new("RGB", (1024, 1024), (13, 18, 36))
adaptive_bg.save(os.path.join(DIRS["app_icons"], "icon_adaptive_background.png"), "PNG")

adaptive_fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
scale_fg = 560.0 / max(symbol_color_trimmed.width, symbol_color_trimmed.height)
sym_w = int(symbol_color_trimmed.width * scale_fg)
sym_h = int(symbol_color_trimmed.height * scale_fg)
sym_resized = symbol_color_trimmed.resize((sym_w, sym_h), Image.Resampling.LANCZOS)
adaptive_fg.paste(sym_resized, ((1024 - sym_w) // 2, (1024 - sym_h) // 2), sym_resized)
adaptive_fg.save(os.path.join(DIRS["app_icons"], "icon_adaptive_foreground.png"), "PNG")

# -------------------------------------------------------------
# 6. Banners and Soundwave Backgrounds
# -------------------------------------------------------------
print("--> Generating soundwave backgrounds and banners...")

# Use pristine 16:9 AI Soundwave Master (no text, smooth gradients)
ai_sw = Image.open(AI_SOUNDWAVE)
wave_1080p = ai_sw.resize((1920, 1080), Image.Resampling.LANCZOS)
wave_1080p.save(os.path.join(DIRS["banners"], "moodify_soundwave_dark_1920x1080.png"), "PNG")
wave_1080p.save(os.path.join(DIRS["banners"], "moodify_soundwave_dark_1920x1080.webp"), "WEBP", quality=95)

wave_4k = ai_sw.resize((3840, 2160), Image.Resampling.LANCZOS)
wave_4k.save(os.path.join(DIRS["banners"], "moodify_soundwave_4k_3840x2160.png"), "PNG")
wave_4k.save(os.path.join(DIRS["banners"], "moodify_soundwave_4k_3840x2160.webp"), "WEBP", quality=95)

clean_wave_img = wave_1080p

im_brand1 = Image.open(find_source("Brand1.png"))
banner_crop = im_brand1.crop((34, 784, 1413, 1051))
banner_crop.save(os.path.join(DIRS["banners"], "moodify_hero_banner_wide.png"), "PNG")
banner_crop.save(os.path.join(DIRS["banners"], "moodify_hero_banner_wide.webp"), "WEBP", quality=92)

# -------------------------------------------------------------
# 7. Web & PWA Assets
# -------------------------------------------------------------
print("--> Generating Web, Favicon, and PWA assets...")

fav_src = icon_dark

for sz in [16, 32, 48]:
    fav_sz = fav_src.resize((sz, sz), Image.Resampling.LANCZOS)
    fav_sz.save(os.path.join(DIRS["web"], f"favicon-{sz}x{sz}.png"), "PNG")

fav_16 = fav_src.resize((16, 16), Image.Resampling.LANCZOS)
fav_32 = fav_src.resize((32, 32), Image.Resampling.LANCZOS)
fav_48 = fav_src.resize((48, 48), Image.Resampling.LANCZOS)
fav_16.save(
    os.path.join(DIRS["web"], "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
    append_images=[fav_32, fav_48]
)

apple_touch = app_store_icon.resize((180, 180), Image.Resampling.LANCZOS)
apple_touch.save(os.path.join(DIRS["web"], "apple-touch-icon.png"), "PNG")

chrome_192 = app_store_icon.resize((192, 192), Image.Resampling.LANCZOS)
chrome_192.save(os.path.join(DIRS["web"], "android-chrome-192x192.png"), "PNG")

chrome_512 = app_store_icon.resize((512, 512), Image.Resampling.LANCZOS)
chrome_512.save(os.path.join(DIRS["web"], "android-chrome-512x512.png"), "PNG")

manifest_data = {
    "name": "Moodify - Music for a Brighter You",
    "short_name": "Moodify",
    "description": "Personalized music and soundscapes that adapt to your mood for a brighter tomorrow.",
    "icons": [
        {
            "src": "android-chrome-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "android-chrome-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ],
    "theme_color": "#0D1224",
    "background_color": "#0D1224",
    "display": "standalone",
    "start_url": "/"
}
with open(os.path.join(DIRS["web"], "site.webmanifest"), "w", encoding="utf-8") as f:
    json.dump(manifest_data, f, indent=2)

# OpenGraph Social Share Image (1200x630) using clean soundwave background
og_bg = clean_wave_img.resize((1200, 675), Image.Resampling.LANCZOS).crop((0, 22, 1200, 652))
og_img = og_bg.convert("RGBA")

# Overlay dark semi-transparent vignette on left to give contrast to logo
overlay = Image.new("RGBA", (1200, 630), (0, 0, 0, 0))
draw_ol = ImageDraw.Draw(overlay)
for x in range(750):
    alpha_grad = int(140 * (1.0 - x / 750.0))
    draw_ol.line([(x, 0), (x, 630)], fill=(13, 18, 36, alpha_grad))
og_img = Image.alpha_composite(og_img, overlay)

# Paste white horizontal logo on left
og_logo_scale = 580.0 / logo_white_trimmed.width
og_logo_w = int(logo_white_trimmed.width * og_logo_scale)
og_logo_h = int(logo_white_trimmed.height * og_logo_scale)
og_logo_res = logo_white_trimmed.resize((og_logo_w, og_logo_h), Image.Resampling.LANCZOS)
og_img.paste(og_logo_res, (80, (630 - og_logo_h) // 2), og_logo_res)

# Paste dark squircle app icon on right
og_icon_sz = 340
og_icon_res = icon_dark.resize((og_icon_sz, og_icon_sz), Image.Resampling.LANCZOS)
og_img.paste(og_icon_res, (780, (630 - og_icon_sz) // 2), og_icon_res)

og_img.convert("RGB").save(os.path.join(DIRS["web"], "og-image.png"), "PNG")
og_img.convert("RGB").save(os.path.join(DIRS["web"], "og-image.webp"), "WEBP", quality=92)

# -------------------------------------------------------------
# 8. Mobile Platform Assets (iOS & Android)
# -------------------------------------------------------------
print("--> Generating iOS & Android native asset catalogs...")

ios_sizes = [
    ("icon-20@2x.png", 40),
    ("icon-20@3x.png", 60),
    ("icon-29@2x.png", 58),
    ("icon-29@3x.png", 87),
    ("icon-40@2x.png", 80),
    ("icon-40@3x.png", 120),
    ("icon-60@2x.png", 120),
    ("icon-60@3x.png", 180),
    ("icon-76@2x.png", 152),
    ("icon-83.5@2x.png", 167),
    ("icon-1024.png", 1024)
]

for filename, sz in ios_sizes:
    img_sz = app_store_icon.resize((sz, sz), Image.Resampling.LANCZOS)
    img_sz.save(os.path.join(DIRS["ios"], filename), "PNG")

contents_json = {
    "images": [
        {"idiom": "iphone", "size": "20x20", "scale": "2x", "filename": "icon-20@2x.png"},
        {"idiom": "iphone", "size": "20x20", "scale": "3x", "filename": "icon-20@3x.png"},
        {"idiom": "iphone", "size": "29x29", "scale": "2x", "filename": "icon-29@2x.png"},
        {"idiom": "iphone", "size": "29x29", "scale": "3x", "filename": "icon-29@3x.png"},
        {"idiom": "iphone", "size": "40x40", "scale": "2x", "filename": "icon-40@2x.png"},
        {"idiom": "iphone", "size": "40x40", "scale": "3x", "filename": "icon-40@3x.png"},
        {"idiom": "iphone", "size": "60x60", "scale": "2x", "filename": "icon-60@2x.png"},
        {"idiom": "iphone", "size": "60x60", "scale": "3x", "filename": "icon-60@3x.png"},
        {"idiom": "ipad", "size": "20x20", "scale": "2x", "filename": "icon-20@2x.png"},
        {"idiom": "ipad", "size": "29x29", "scale": "2x", "filename": "icon-29@2x.png"},
        {"idiom": "ipad", "size": "40x40", "scale": "2x", "filename": "icon-40@2x.png"},
        {"idiom": "ipad", "size": "76x76", "scale": "2x", "filename": "icon-76@2x.png"},
        {"idiom": "ipad", "size": "83.5x83.5", "scale": "2x", "filename": "icon-83.5@2x.png"},
        {"idiom": "ios-marketing", "size": "1024x1024", "scale": "1x", "filename": "icon-1024.png"}
    ],
    "info": {
        "version": 1,
        "author": "xcode"
    }
}
with open(os.path.join(DIRS["ios"], "Contents.json"), "w", encoding="utf-8") as f:
    json.dump(contents_json, f, indent=2)

android_densities = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
}

for folder, sz in android_densities.items():
    density_dir = os.path.join(DIRS["android_res"], folder)
    ensure_dir(density_dir)
    launcher_sq = app_store_icon.resize((sz, sz), Image.Resampling.LANCZOS)
    launcher_sq.save(os.path.join(density_dir, "ic_launcher.png"), "PNG")
    
    mask = Image.new('L', (sz, sz), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.ellipse((0, 0, sz, sz), fill=255)
    round_icon = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    round_icon.paste(launcher_sq, (0, 0))
    round_icon.putalpha(mask)
    round_icon.save(os.path.join(density_dir, "ic_launcher_round.png"), "PNG")

playstore_icon = app_store_icon.resize((512, 512), Image.Resampling.LANCZOS)
playstore_icon.save(os.path.join(DIRS["android_root"], "playstore-icon-512x512.png"), "PNG")

drawable_nodpi = os.path.join(DIRS["android_res"], "drawable-nodpi")
ensure_dir(drawable_nodpi)
adaptive_fg.resize((432, 432), Image.Resampling.LANCZOS).save(os.path.join(drawable_nodpi, "ic_launcher_foreground.png"), "PNG")

values_dir = os.path.join(DIRS["android_res"], "values")
ensure_dir(values_dir)
colors_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0D1224</color>
    <color name="moodify_primary">#7A5CFF</color>
    <color name="moodify_accent">#F557B6</color>
</resources>'''
with open(os.path.join(values_dir, "colors.xml"), "w", encoding="utf-8") as f:
    f.write(colors_xml)

anydpi_dir = os.path.join(DIRS["android_res"], "mipmap-anydpi-v26")
ensure_dir(anydpi_dir)
adaptive_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>'''
with open(os.path.join(anydpi_dir, "ic_launcher.xml"), "w", encoding="utf-8") as f:
    f.write(adaptive_xml)
with open(os.path.join(anydpi_dir, "ic_launcher_round.xml"), "w", encoding="utf-8") as f:
    f.write(adaptive_xml)

# -------------------------------------------------------------
# 9. Design Tokens (JSON, CSS, TS, Tailwind)
# -------------------------------------------------------------
print("--> Generating design tokens...")

tokens_data = {
    "brand": {
        "name": "Moodify",
        "slogan": "Music for a Brighter You",
        "tagline": "Personalized music for every you."
    },
    "colors": {
        "primary": {
            "hex": "#7A5CFF",
            "rgb": "rgb(122, 92, 255)",
            "name": "Vibrant Purple",
            "role": "Brand identity, primary CTA, active states"
        },
        "accent": {
            "hex": "#F557B6",
            "rgb": "rgb(245, 87, 182)",
            "name": "Warm Pink",
            "role": "Gradient stop, highlights, energetic accents"
        },
        "soft": {
            "hex": "#EED9FF",
            "rgb": "rgb(238, 217, 255)",
            "name": "Soft Lavender",
            "role": "Subtle borders, light badges, soft glows"
        },
        "dark": {
            "hex": "#0D1224",
            "rgb": "rgb(13, 18, 36)",
            "name": "Deep Navy",
            "role": "Dark mode background, contrast surface"
        },
        "surface": {
            "hex": "#161B2E",
            "rgb": "rgb(22, 27, 46)",
            "name": "Midnight Surface",
            "role": "Cards, navigation bars, modals"
        },
        "light": {
            "hex": "#F6F7FB",
            "rgb": "rgb(246, 247, 251)",
            "name": "Clean White",
            "role": "Light mode background, text on dark"
        },
        "gray": {
            "hex": "#A7AABC",
            "rgb": "rgb(167, 170, 188)",
            "name": "Soft Gray",
            "role": "Muted text, secondary labels, borders"
        }
    },
    "gradients": {
        "primary": "linear-gradient(135deg, #7A5CFF 0%, #F557B6 100%)",
        "glow": "radial-gradient(circle at center, rgba(122, 92, 255, 0.4) 0%, rgba(13, 18, 36, 0) 70%)",
        "surface": "linear-gradient(180deg, #161B2E 0%, #0D1224 100%)"
    },
    "typography": {
        "fontFamily": "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        "weights": {
            "light": 300,
            "regular": 400,
            "medium": 500,
            "semiBold": 600,
            "bold": 700
        }
    }
}

with open(os.path.join(DIRS["tokens"], "colors.json"), "w", encoding="utf-8") as f:
    json.dump(tokens_data, f, indent=2)

css_tokens = ''':root {
  /* Moodify Brand Color Tokens */
  --moodify-color-primary: #7A5CFF;
  --moodify-color-primary-rgb: 122, 92, 255;
  --moodify-color-accent: #F557B6;
  --moodify-color-accent-rgb: 245, 87, 182;
  --moodify-color-soft: #EED9FF;
  --moodify-color-dark: #0D1224;
  --moodify-color-surface: #161B2E;
  --moodify-color-light: #F6F7FB;
  --moodify-color-gray: #A7AABC;

  /* Gradients */
  --moodify-gradient-primary: linear-gradient(135deg, #7A5CFF 0%, #F557B6 100%);
  --moodify-gradient-glow: radial-gradient(circle, rgba(122, 92, 255, 0.35) 0%, rgba(13, 18, 36, 0) 70%);

  /* Typography */
  --moodify-font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Radii */
  --moodify-radius-sm: 8px;
  --moodify-radius-md: 14px;
  --moodify-radius-lg: 22px;
  --moodify-radius-full: 9999px;
}
'''
with open(os.path.join(DIRS["tokens"], "brand_tokens.css"), "w", encoding="utf-8") as f:
    f.write(css_tokens)

ts_tokens = '''export const MoodifyTheme = {
  colors: {
    primary: '#7A5CFF',
    accent: '#F557B6',
    soft: '#EED9FF',
    dark: '#0D1224',
    surface: '#161B2E',
    light: '#F6F7FB',
    gray: '#A7AABC',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #7A5CFF 0%, #F557B6 100%)',
    darkSurface: 'linear-gradient(180deg, #161B2E 0%, #0D1224 100%)',
  },
  fonts: {
    main: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
} as const;

export type MoodifyThemeType = typeof MoodifyTheme;
'''
with open(os.path.join(DIRS["tokens"], "brand_tokens.ts"), "w", encoding="utf-8") as f:
    f.write(ts_tokens)

tailwind_js = '''/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        moodify: {
          primary: '#7A5CFF',
          accent: '#F557B6',
          soft: '#EED9FF',
          dark: '#0D1224',
          surface: '#161B2E',
          light: '#F6F7FB',
          gray: '#A7AABC',
        }
      },
      backgroundImage: {
        'moodify-gradient': 'linear-gradient(135deg, #7A5CFF 0%, #F557B6 100%)',
        'moodify-dark-card': 'linear-gradient(180deg, #161B2E 0%, #0D1224 100%)',
      },
      fontFamily: {
        moodify: ['Poppins', 'sans-serif'],
      }
    }
  }
};
'''
with open(os.path.join(DIRS["tokens"], "tailwind_theme.js"), "w", encoding="utf-8") as f:
    f.write(tailwind_js)

print("--> Asset build process completed successfully!")
