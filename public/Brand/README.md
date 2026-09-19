# Moodify Brand Identity System & Production Assets

Hệ thống tài nguyên nhận diện thương hiệu số hoàn chỉnh cho dự án **Moodify** ("Music for a Brighter You").

---

## 📂 Cấu Trúc Thư Mục Dự Án Đã Chuẩn Hóa

```text
D:\Hai\study\DATN\Brand\
├── moodify_brand_assets/          # 📦 GÓI TÀI NGUYÊN TRIỂN KHAI CHÍNH THỨC (120+ Assets)
│   ├── preview.html               # 🌐 Trang Showcase Gallery tương tác (Dark/Light/Checkerboard)
│   ├── logos/                     # Logo chính, ngang, dọc, có slogan, trắng/đen (PNG, WebP, SVG)
│   ├── app_icons/                 # App Icons 1024px (Squircle trong suốt & Full-Bleed Store)
│   ├── web/                       # Favicon đa tầng (.ico 16/32/48), Apple Touch, Manifest, OG-Image
│   ├── mobile/                    # Cấu hình kéo-thả cho Xcode (iOS) & Android Studio (Res/Mipmap)
│   ├── banners_and_backgrounds/   # Wallpaper 4K & 1080p sóng âm không chữ
│   ├── tokens/                    # Design tokens (CSS, TS, Tailwind, JSON)
│   └── brand_guidelines/          # Bản đồ nhận diện và 23 file gốc đã đánh số thứ tự
│
├── ai_generated_masters/          # 🎨 Ảnh gốc Master chất lượng cao tạo bằng AI
│   ├── moodify_app_icon_*.jpg     # Master App Icon độ nét cao 1024×1024
│   ├── moodify_symbol_clean_*.jpg # Master Biểu tượng chữ 'M' rực rỡ cách ly hoàn toàn
│   └── moodify_soundwave_bg_*.jpg # Master Sóng âm thanh 8K không chữ
│
├── raw_source_images/             # 🗄️ Lưu trữ 23 file thiết kế gốc ban đầu (Brand1..4, ChatGPT)
│
├── export_moodify_assets.py       # ⚡ Script Python tự động hóa trích xuất và xử lý asset
└── README.md                      # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh

### 1. Xem Thử Toàn Bộ Asset Trực Quan (Interactive Showcase)
Mở file [moodify_brand_assets/preview.html](file:///D:/Hai/study/DATN/Brand/moodify_brand_assets/preview.html) trực tiếp trên trình duyệt Chrome, Edge hoặc Firefox để:
* Xem toàn bộ logo, app icon, banner với nút chuyển nền: **Tối (#0D1224)**, **Sáng (Trắng)**, **Caro trong suốt**.
* Sao chép đường dẫn file hoặc mã màu chỉ với 1 click.
* Xem code mẫu tích hợp nhanh cho Web (HTML/React), iOS (SwiftUI) và Android (Kotlin/Jetpack Compose).

### 2. Tái Tạo Hoặc Build Lại Assets Khi Cần
Nếu bạn có thêm hình ảnh mới hoặc muốn cập nhật kích thước, chỉ cần chạy lại script:
```bash
python export_moodify_assets.py
```
Script sẽ tự động:
1. Đọc ảnh từ `ai_generated_masters/` và `raw_source_images/`.
2. Áp dụng thuật toán **Squircle Contour Masking** và **Defringing** để đảm bảo mép ảnh sạch 100%, không viền trắng.
3. Xuất ra đầy đủ định dạng PNG, WebP, SVG, ICO, xcassets cho iOS và mipmap cho Android.
