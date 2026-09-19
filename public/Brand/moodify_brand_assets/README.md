# Moodify Brand Assets & Design System

Chào mừng bạn đến với bộ tài nguyên nhận diện thương hiệu chính thức của **Moodify** (*"Music for a Brighter You"*). Toàn bộ assets trong thư mục này đã được trích xuất, tách nền trong suốt khử viền trắng, tối ưu hóa đa định dạng (PNG, WebP, SVG, ICO) và đóng gói sẵn sàng thả vào các dự án **Web (React, Vue, Next.js, HTML5)**, **Mobile App (iOS Xcode, Android Studio, Flutter, React Native)**.

---

## 📂 Cấu Trúc Thư Mục

```text
moodify_brand_assets/
├── preview.html                          # Trang web tương tác xem trực tiếp toàn bộ asset (Dark/Light mode)
├── brand_guidelines/
│   ├── master/                           # 6 bảng Brand Guidelines chính thức
│   │   ├── moodify_brand_guidelines_overview.png
│   │   ├── moodify_app_icon_exploration.png
│   │   ├── moodify_ui_showcase_mockups.png
│   │   ├── moodify_brand_elements_sheet.png
│   │   ├── moodify_design_system_master_kit.png
│   │   └── moodify_ui_and_screens_suite.png
│   └── raw_originals/                    # 23 tệp thiết kế gốc được lưu trữ và đổi tên chuẩn
│
├── logos/                                # Toàn bộ Logo tách nền hoàn toàn (RGBA)
│   ├── primary/                          # Logo chính thức (Màu tím-hồng)
│   │   ├── logo_primary_horizontal.png/.webp/.svg   # Bản ngang tiêu chuẩn
│   │   ├── logo_primary_stacked.png/.webp/.svg      # Bản dọc (Symbol trên, chữ dưới)
│   │   └── logo_primary_with_tagline.png/.webp      # Kèm khẩu hiệu "Music for a Brighter You"
│   ├── monochrome_white/                 # Bản trắng thuần (cho dark mode / nền tối)
│   │   └── logo_white_horizontal.png/.webp/.svg
│   ├── monochrome_black/                 # Bản đen thuần (cho in ấn / nền sáng)
│   │   └── logo_black_horizontal.png/.webp/.svg
│   ├── symbol_only/                      # Chỉ biểu tượng chữ 'M' sóng âm thanh
│   │   ├── symbol_gradient.png/.webp/.svg
│   │   ├── symbol_gradient_1024.png      # Căn giữa trong khung vuông 1024x1024
│   │   ├── symbol_white.png/.svg
│   │   └── symbol_black.png/.svg
│   └── wordmark_only/                    # Chỉ chữ "moodify"
│       ├── wordmark_dark.png/.webp/.svg
│       └── wordmark_white.png/.webp/.svg
│
├── app_icons/                            # Icon ứng dụng gốc 1024×1024
│   ├── icon_dark_glow_1024.png/.webp     # Biến thể chính (Dark Glow Squircle)
│   ├── icon_dark_glow_fullbleed_1024.png # Biến thể vuông đặc cho App Store & Play Store
│   ├── icon_light_1024.png/.webp         # Biến thể Light
│   ├── icon_gradient_1024.png/.webp      # Biến thể Gradient tím-hồng
│   ├── icon_monochrome_1024.png/.webp    # Biến thể đen trắng tối giản
│   ├── icon_neon_ring_1024.png/.webp     # Biến thể vòng tròn neon phát sáng
│   ├── icon_adaptive_foreground.png      # Lớp nổi (Foreground) cho Android Adaptive Icon
│   └── icon_adaptive_background.png      # Lớp nền (Background) cho Android Adaptive Icon
│
├── web/                                  # Assets tối ưu cho Website & PWA
│   ├── favicon.ico                       # Tệp ICO tích hợp đa kích thước (16, 32, 48px)
│   ├── favicon-16x16.png, favicon-32x32.png, favicon-48x48.png
│   ├── apple-touch-icon.png              # 180×180 cho iOS Safari Bookmark
│   ├── android-chrome-192x192.png        # PWA tiêu chuẩn
│   ├── android-chrome-512x512.png        # PWA độ phân giải cao
│   ├── og-image.png/.webp                # 1200×630 đại diện chia sẻ MXH (Facebook, Zalo, Twitter, LinkedIn)
│   └── site.webmanifest                  # Cấu hình PWA Web Manifest
│
├── mobile/                               # Gói tích hợp Native Mobile
│   ├── ios/
│   │   └── AppIcon.appiconset/           # Sao chép thẳng vào Xcode Assets.xcassets
│   │       ├── Contents.json             # Cấu hình JSON chuẩn cho mọi thiết bị Apple
│   │       ├── icon-20@2x.png ... icon-1024.png
│   │
│   └── android/
│       ├── playstore-icon-512x512.png    # Upload trực tiếp lên Google Play Console
│       └── res/                          # Sao chép thẳng vào android/app/src/main/res/
│           ├── mipmap-mdpi/              # 48×48 (ic_launcher & ic_launcher_round)
│           ├── mipmap-hdpi/              # 72×72
│           ├── mipmap-xhdpi/             # 96×96
│           ├── mipmap-xxhdpi/            # 144×144
│           ├── mipmap-xxxhdpi/           # 192×192
│           ├── mipmap-anydpi-v26/        # Adaptive Icon XML cho Android 13+
│           ├── drawable-nodpi/           # ic_launcher_foreground.png
│           └── values/colors.xml         # Màu nền hệ thống
│
├── banners_and_backgrounds/              # Hình nền âm thanh & Banners
│   ├── moodify_soundwave_dark_1920x1080.png/.webp  # Full HD Wallpaper (Không chữ)
│   ├── moodify_soundwave_4k_3840x2160.png/.webp    # 4K Wallpaper (Không chữ)
│   └── moodify_hero_banner_wide.png/.webp          # Banner ngang "A Kinder Soundtrack"
│
└── tokens/                               # Design Tokens cho lập trình
    ├── colors.json                       # Bảng mã màu đầy đủ
    ├── brand_tokens.css                  # CSS Variables (:root)
    ├── brand_tokens.ts                   # Hằng số TypeScript
    └── tailwind_theme.js                 # Cấu hình mở rộng cho TailwindCSS
```

---

## 🎨 Bảng Mã Màu Thương Hiệu (Brand Palette)

| Tên Màu | Mã HEX | Mã RGB | Vai Trò Thiết Kế |
|:---|:---|:---|:---|
| **Vibrant Purple** | `#7A5CFF` | `rgb(122, 92, 255)` | Màu chủ đạo nhận diện, nút bấm CTA, trạng thái active |
| **Warm Pink** | `#F557B6` | `rgb(245, 87, 182)` | Màu điểm nhấn chuyển sắc (gradient stop), highlight |
| **Soft Lavender** | `#EED9FF` | `rgb(238, 217, 255)` | Viền nhẹ, badge, ánh sáng mờ (glow) |
| **Deep Navy** | `#0D1224` | `rgb(13, 18, 36)` | Màu nền chính Dark Mode, bề mặt tương phản cao |
| **Midnight Surface**| `#161B2E` | `rgb(22, 27, 46)` | Nền thẻ (card), thanh điều hướng, modal |
| **Clean White** | `#F6F7FB` | `rgb(246, 247, 251)` | Nền Light Mode, màu chữ trên nền tối |
| **Soft Gray** | `#A7AABC` | `rgb(167, 170, 188)` | Nhãn phụ, văn bản mô tả, viền mờ |

---

## 💻 Hướng Dẫn Tích Hợp Vào Code

### 1. Web (HTML / Next.js / React)
```html
<!-- Trong thẻ <head> của trang HTML -->
<link rel="icon" type="image/x-icon" href="/web/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/web/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/web/apple-touch-icon.png">
<link rel="manifest" href="/web/site.webmanifest">

<!-- OpenGraph cho mạng xã hội -->
<meta property="og:title" content="Moodify - Music for a Brighter You">
<meta property="og:description" content="Personalized music for every you.">
<meta property="og:image" content="https://yourdomain.com/web/og-image.png">
```

### 2. React / Next.js Component
```tsx
import Image from 'next/image';

export function HeaderLogo() {
  return (
    <Image 
      src="/logos/primary/logo_primary_horizontal.svg" 
      alt="Moodify Logo" 
      width={200} 
      height={40} 
      priority 
    />
  );
}
```

### 3. Flutter (Mobile)
Thêm vào file `pubspec.yaml`:
```yaml
flutter:
  assets:
    - assets/logos/primary/logo_primary_horizontal.png
    - assets/logos/symbol_only/symbol_gradient.png
    - assets/banners_and_backgrounds/moodify_soundwave_dark_1920x1080.png
```

Sử dụng trong widget:
```dart
Image.asset('assets/logos/primary/logo_primary_horizontal.png', width: 180);
```

### 4. iOS (Xcode)
1. Mở Xcode -> Chọn thư mục `Assets.xcassets`.
2. Xóa hoặc ghi đè thư mục `AppIcon.appiconset` bằng thư mục `mobile/ios/AppIcon.appiconset/`.

### 5. Android (Android Studio)
Sao chép toàn bộ thư mục con trong `mobile/android/res/` vào thư mục `app/src/main/res/` của dự án Android. Hệ thống sẽ tự nhận diện cả icon thông thường lẫn Adaptive Icon.

---

## 🌟 Trải Nghiệm Trực Quan
Mở tệp [`preview.html`](preview.html) trực tiếp bằng trình duyệt (Chrome, Edge, Safari) để xem bản demo toàn diện với tính năng đổi màu nền (Dark/Light/Trong suốt), sao chép mã màu và lấy link tệp chỉ với 1 click!
