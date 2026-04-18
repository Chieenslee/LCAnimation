# LCAnimation

![LCAnimation Banner](https://via.placeholder.com/1200x300?text=LCAnimation+-+AI+Local+Animation+Agent)

**LCAnimation** là một Web Application chuyên nghiệp đóng vai trò như một AI Agent. Ứng dụng này cho phép người dùng chuyển đổi ảnh tĩnh (hoặc mô tả văn bản) thành các đoạn animation (hoạt ảnh) mượt mà hoàn toàn **MIỄN PHÍ** và **CHẠY TRỰC TIẾP TRÊN TRÌNH DUYỆT**.

Chúng tôi không sử dụng máy chủ đám mây để xử lý AI mà tận dụng trực tiếp sức mạnh **WebGPU** trên phần cứng của người dùng (Local AI). Điều này đảm bảo quyền riêng tư tuyệt đối, loại bỏ chi phí máy chủ và có khả năng tự động thích ứng với cấu hình máy tính (hỗ trợ tối ưu từ card đồ họa như RTX 3050 4GB VRAM cho đến card cao cấp).

## 🚀 Tính năng chính

Hệ sinh thái đầu ra đa dạng, biến LCAnimation không chỉ là một trình tạo Video mà còn là một công cụ hỗ trợ phát triển mạnh mẽ:

- **Xuất Web (HTML/CSS/JS):** Tự động tạo mã nguồn nhúng kèm thư viện GSAP để tích hợp nhanh hiệu ứng vào Website.
- **Xuất Game (SpriteSheet):** Phân rã hoạt ảnh thành các khung hình (frames) trên một HTML Canvas khổng lồ và xuất ra tệp `spritesheet.png` kèm tọa độ `data.json` chuẩn cho Unity, Godot, Phaser.
- **Xuất Video (MP4/GIF):** Tích hợp FFmpeg WebAssembly để chuyển đổi dữ liệu thô thành tệp Video chuẩn nén H.264 mượt mà.
- **Tối ưu hóa VRAM:** Quản lý tài nguyên phần cứng nghiêm ngặt, tự động dọn dẹp bộ nhớ (Canvas, Web Workers, Blob URLs) ngay lập tức để chống rò rỉ RAM/VRAM.

## 📂 Cấu trúc thư mục

```text
LCAnimation/
├── src/
│   ├── core/
│   │   └── image-processing/
│   │       └── image-processor.ts  # Class tự động resize ảnh để chống tràn VRAM
│   ├── exporters/
│   │   ├── exporter.interface.ts   # Strategy Pattern interface cho các bộ xuất file
│   │   ├── game-exporter.ts        # Bộ xuất SpriteSheet & JSON cho Game Engine
│   │   ├── video-exporter.ts       # Bộ xuất video MP4 sử dụng FFmpeg WASM
│   │   └── web-exporter.ts         # Bộ xuất mã nguồn HTML/JS với GSAP
│   ├── workers/
│   │   └── ai-worker.ts            # Web Worker xử lý mô hình AI WebGPU ngầm (sắp tới)
│   ├── main.ts                     # File điều phối trung tâm (Controller)
│   └── index.html                  # Giao diện người dùng
├── package.json                    # Cấu hình dependency
├── tsconfig.json                   # Cấu hình TypeScript khắt khe (strict)
├── vite.config.ts                  # Cấu hình Vite & Cross-Origin Headers cho WASM/WebGPU
└── SYSTEM_ARCHITECTURE_LOG.md      # Nhật ký kiến trúc hệ thống
```

## ⚙️ Hướng dẫn Cài đặt & Chạy dự án

Yêu cầu môi trường: **Node.js** (Khuyến nghị phiên bản 18+).

1. **Cài đặt thư viện:**
   Mở terminal tại thư mục dự án và chạy lệnh:
   ```bash
   npm install
   ```

2. **Khởi chạy môi trường Dev:**
   ```bash
   npm run dev
   ```

3. Truy cập vào đường dẫn hiển thị trên terminal (thường là `http://localhost:5173`) trên các trình duyệt hỗ trợ WebGPU (như Chrome, Edge mới nhất) để trải nghiệm.

## 🛡️ Bản quyền & Đóng góp
Dự án được xây dựng với kiến trúc Scalable Enterprise, đảm bảo tính dễ đọc và bảo trì cao.
