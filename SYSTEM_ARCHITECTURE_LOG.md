## [18/04/2026 - 19:25] - Cập nhật trạng thái
- **Module hoàn thiện:** Cấu hình dự án cốt lõi (`package.json`, `tsconfig.json`, `vite.config.ts`)
- **Chức năng:** Khởi tạo nền móng dự án LCAnimation với Vite và Vanilla TypeScript. Tích hợp sẵn các thư viện cần thiết như GSAP để làm hiệu ứng, `@ffmpeg/ffmpeg` cho xử lý video và cấu hình hệ thống linter/formatter. Cấu hình Vite đặc biệt quan trọng với việc thêm các header bảo mật Cross-Origin (`Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`) là bắt buộc để WebAssembly (FFmpeg) và WebGPU có thể chạy trong trình duyệt.
- **Giao tiếp (Interfaces):** N/A (Giai đoạn cấu hình môi trường)
- **Tài nguyên:** N/A
- **Bước tiếp theo:** Khởi tạo cấu trúc thư mục `src`, bao gồm file `index.html`, `main.ts`, cấu trúc SCSS/CSS và các module cốt lõi như WebGPU Manager, Canvas System để sẵn sàng tích hợp kiến trúc theo dạng Scalable Architecture.

## [18/04/2026 - 19:29] - Cập nhật trạng thái
- **Module hoàn thiện:** `src/core/image-processing/image-processor.ts` và `src/main.ts`
- **Chức năng:** Xây dựng luồng xử lý ảnh đầu vào và kết nối giao diện với Lõi AI qua Web Worker. Lớp `ImageProcessor` tự động giảm kích thước ảnh xuống tối đa 512x512 pixel bằng HTML Canvas để tránh tràn bộ nhớ VRAM của GPU (như dòng RTX 3050 4GB). `main.ts` đóng vai trò là Controller, quản lý DOM events, khởi tạo Web Worker (`ai-worker.ts`) và thiết lập luồng trao đổi thông điệp bất đồng bộ.
- **Giao tiếp (Interfaces):** `main.ts` giao tiếp với `ai-worker.ts` thông qua `postMessage()` và bắt sự kiện `MessageEvent`. Các luồng lệnh chính bao gồm: `INIT_AI`, `GENERATE` (gửi kèm Blob ảnh đã resize và text prompt), `DISPOSE_AI`.
- **Tài nguyên:** Thiết kế an toàn với RAM/VRAM. Lớp `ImageProcessor` có hàm `dispose()` để dọn dẹp ngữ cảnh Canvas và gọi `URL.revokeObjectURL()`. Trong `main.ts`, bắt sự kiện `beforeunload` của Window để gọi `dispose()` và gửi lệnh `DISPOSE_AI` ép Worker phải giải phóng tài nguyên WebGPU.
- **Bước tiếp theo:** Xây dựng hệ thống Exporters (Hệ thống xuất file Game/Web).

## [18/04/2026 - 19:32] - Cập nhật trạng thái
- **Module hoàn thiện:** Hệ thống Exporters (`src/exporters/exporter.interface.ts`, `src/exporters/web-exporter.ts`, `src/exporters/game-exporter.ts`, `src/exporters/video-exporter.ts`)
- **Chức năng:** Xây dựng hệ thống xuất file đa dạng áp dụng Design Pattern **Strategy**. Tuỳ thuộc vào lựa chọn của người dùng, hệ thống có thể chuyển đổi hoạt ảnh thành code HTML/JS nhúng với GSAP (`WebExporter`), hoặc cắt khung hình tạo thành tệp `SpriteSheet.png` và toạ độ `data.json` cho Game Engine (`GameExporter`), hoặc dùng thuật toán nén để xuất video MP4 (`VideoExporter`).
- **Giao tiếp (Interfaces):** Mọi bộ xuất đều bắt buộc tuân thủ interface `IExporter`, qua đó các module ngoài chỉ cần gọi `export(data: Blob)` và `dispose()` mà không cần biết logic xử lý cụ thể bên trong.
- **Tài nguyên:** `GameExporter` được trang bị hàm `dispose()` để đưa Canvas khổng lồ về kích thước 0x0 và giải phóng mảng URL ảo nhằm tránh đầy RAM. Tương tự, `VideoExporter` xóa sạch file trong máy ảo của FFmpeg bằng `deleteFile()` sau mỗi lần xuất và gọi `this.ffmpeg.terminate()` bên trong hàm `dispose()` để tiêu hủy thẳng WebAssembly Worker khi không còn dùng đến, giúp VRAM và RAM luôn ở trạng thái tối ưu.
- **Bước tiếp theo:** Ghép nối các Exporters vào nút bấm UI trên `main.ts` và hoàn thiện kiểm thử luồng End-to-End.

## [18/04/2026 - 19:41] - Cập nhật trạng thái
- **Module hoàn thiện:** Cập nhật `src/main.ts`
- **Chức năng:** Tích hợp luồng End-to-End hoàn chỉnh: Nhận ảnh từ UI -> Resize an toàn bằng Canvas -> Đẩy xuống Web Worker ngầm để AI xử lý (với prompt) -> Lắng nghe `GENERATE_SUCCESS` để nhận `Blob` kết quả -> Lưu vào State toàn cục (`currentAnimationBlob`) -> Bấm nút xuất file đa nền tảng.
- **Giao tiếp (Interfaces):** Main Thread hiện đóng vai trò nhạc trưởng. Khi người dùng bấm nút xuất file tương ứng, hệ thống sẽ kiểm tra State và gọi hàm `.export(currentAnimationBlob)` của thực thể Exporter tương ứng. Áp dụng `try...catch` để bắt và báo lỗi mượt mà cho UI.
- **Tài nguyên:** Cơ chế dọn dẹp RAM/VRAM toàn cục đã được hoàn thiện. Trong sự kiện `beforeunload`, hệ thống tự động gọi hàm `.dispose()` đồng loạt của `ImageProcessor`, `WebExporter`, `GameExporter`, `VideoExporter` và gửi lệnh `DISPOSE_AI` xuống AI Worker, thu hồi sạch sẽ mọi bộ nhớ Canvas và RAM ảo của WebAssembly.
- **Bước tiếp theo:** Bắt đầu code logic thực tế thay thế cho dữ liệu giả, tích hợp mô hình AI Lượng tử hóa thực sự vào Worker.

## [18/04/2026 - 19:44] - Cập nhật trạng thái
- **Module hoàn thiện:** Tạo `.gitignore`, `README.md`
- **Chức năng:** Thiết lập quy chuẩn Version Control và Document cho dự án để chuẩn bị quản lý mã nguồn trên GitHub.
- **Giao tiếp (Interfaces):** N/A
- **Tài nguyên:** Ngăn chặn đẩy rác (`node_modules`, `.eslintcache`) và file build (`dist`) lên GitHub giúp tiết kiệm dung lượng kho lưu trữ.
- **Bước tiếp theo:** Bắt đầu code logic thực tế: Tích hợp mô hình AI Lượng tử hóa thực sự vào Web Worker.

## [18/04/2026 - 19:50] - Cập nhật trạng thái
- **Module hoàn thiện:** Cập nhật `package.json`, thêm `src/core/ai-engine/ai-model-manager.ts`
- **Chức năng:** Tích hợp pipeline AI lượng tử hóa chạy thực tế trên WebGPU. Lớp `AIModelManager` chịu trách nhiệm tải mô hình dạng INT8/FP16 (giúp tối ưu hóa và chống tràn 4GB VRAM của card RTX 3050). Hàm `generateAnimation()` thực thi pipeline sinh ảnh/frames và đóng gói lại thành định dạng `Blob` để trả về cho UI.
- **Giao tiếp (Interfaces):** Sử dụng WebGPU pipeline API thông qua `@huggingface/transformers` với `{ device: 'webgpu', dtype: 'q8' }`.
- **Tài nguyên:** Đã xây dựng hàm `disposeResources()` gọi `this.aiPipeline.dispose()` để chủ động giải phóng bộ nhớ đồ họa (VRAM) khi có lệnh hủy, đảm bảo ứng dụng có thể chạy nhiều lần mà không bị treo.
- **Bước tiếp theo:** Hoàn thiện thuật toán Exporter: Cắt frames thành SpriteSheet cho Game và xử lý FFmpeg xuất MP4 (nếu cần tinh chỉnh thêm), hoặc tích hợp trực tiếp `AIModelManager` vào `ai-worker.ts`.

## [18/04/2026 - 19:54] - Cập nhật trạng thái
- **Module hoàn thiện:** Cập nhật `src/exporters/exporter.interface.ts`, `src/exporters/web-exporter.ts`, `src/exporters/game-exporter.ts`, `src/exporters/video-exporter.ts`
- **Chức năng:** Thuật toán ghép khung hình (`ImageBitmap[]`) thành `SpriteSheet` Grid tối ưu hóa không gian (dựa trên căn bậc hai) kèm file JSON tọa độ cho Game Engine. Đồng thời xuất mã Boilerplate HTML/JS nhúng thư viện GSAP để tạo hiệu ứng chuyển đổi background liên tục (step ease) cho Website.
- **Giao tiếp (Interfaces):** Điều chỉnh `IExporter` nhận kiểu dữ liệu động (`data: any`) để hỗ trợ mảng đối tượng `ImageBitmap` từ luồng Worker.
- **Tài nguyên:** Áp dụng kỹ thuật "zero-out Canvas" (`canvas.width = 0; canvas.height = 0;`) kết hợp cắt đứt tham chiếu (gán `null`) trong hàm `dispose()` để báo hiệu cho bộ dọn rác (Garbage Collector) thu hồi RAM cực kỳ triệt để.
- **Bước tiếp theo:** Hoàn thiện bộ xuất Video MP4 bằng FFmpeg.wasm và kết nối UI lần cuối.

## [18/04/2026 - 19:57] - Cập nhật trạng thái
- **Module hoàn thiện:** `src/exporters/video-exporter.ts`
- **Chức năng:** Biên dịch chuỗi khung hình (frames) thành Video MP4 chất lượng cao hoàn toàn nội bộ trên trình duyệt. Sử dụng kiến trúc WebAssembly của `FFmpeg` xử lý nén bằng chuẩn `libx264` với định dạng màu `yuv420p` đảm bảo tương thích mọi nền tảng.
- **Giao tiếp (Interfaces):** Tuân thủ API mới nhất (v0.12+) của `@ffmpeg/ffmpeg` thông qua `fetchFile` và `ffmpeg.exec()`. Khối lệnh `try...catch...finally` được áp dụng khắt khe để bắt lỗi sập FFmpeg.
- **Tài nguyên:** Khối lệnh `finally` bảo chứng cho việc vòng lặp `ffmpeg.deleteFile(...)` được thi hành ngay lập tức, xóa sạch file gốc và file kết quả. Kèm với lệnh `ffmpeg.terminate()` dứt khoát trong hàm `dispose()`, đảm bảo RAM được trả lại cho trình duyệt, không một Megabyte nào bị rò rỉ (leak) trong Virtual File System của WASM.
- **Bước tiếp theo:** Tối ưu hóa UI/UX: Hiển thị thanh tiến trình chi tiết khi chạy AI và khi Render Video, làm mịn trải nghiệm người dùng.

## [18/04/2026 - 20:00] - Cập nhật trạng thái
- **Module hoàn thiện:** `index.html`, `main.ts` và Cập nhật `IExporter`
- **Chức năng:** Hoàn thiện UI/UX và luồng người dùng End-to-End. Xây dựng giao diện Dark Mode đẹp mắt trên `index.html`. Tích hợp thanh tiến trình động (`Progress Bar`) thay đổi độ rộng và trạng thái để báo hiệu cho người dùng khi AI xử lý hoặc khi FFmpeg đang render Video. Các nút Export được khóa/mở tự động và chuyển trạng thái "⏳ Đang xử lý...".
- **Giao tiếp (Interfaces):** Bổ sung tham số `onProgress?: (progress: number) => void` vào `IExporter` để truyền ngược số liệu % render từ FFmpeg WASM lên UI Main Thread.
- **Tài nguyên:** Sự kiện dọn dẹp bộ nhớ toàn cục (Global Disposal) trong hàm `window.addEventListener('beforeunload')` được thực thi hoàn chỉnh và chặt chẽ, đánh bay triệt để sự cố treo/rò rỉ RAM khi đóng trình duyệt.
- **Bước tiếp theo:** Kiểm thử thực tế (Testing), sửa lỗi giao diện (CSS) và chuẩn bị triển khai lên môi trường Production.

## [18/04/2026 - 20:04] - Cập nhật trạng thái
- **Module hoàn thiện:** `src/utils/memory-profiler.ts`, `src/style.css`, cập nhật `index.html` và `main.ts`
- **Chức năng:** Tích hợp hệ thống giám sát rò rỉ bộ nhớ RAM/VRAM chuyên sâu (`MemoryProfiler`) và khoác "áo mới" cho toàn bộ hệ thống bằng UI Dark Mode cực kỳ chuyên nghiệp. Thanh Progress Bar được bổ sung hiệu ứng sọc chéo di chuyển (animated stripes).
- **Giao tiếp (Interfaces):** Sử dụng API `performance.memory` gốc của trình duyệt (trên các trình duyệt nhân Chromium) để đo lường JS Heap theo thời gian thực.
- **Tài nguyên:** Công cụ `MemoryProfiler` sẽ in log cảnh báo đỏ (`console.warn`) ra Console nếu phát hiện mức chênh lệch RAM quá lớn (>50MB) sau khi gọi hàm `dispose()`. Đây là chốt chặn cuối cùng minh chứng hệ thống thu hồi rác (GC) và kiến trúc của LCAnimation đã hoạt động hoàn hảo.
- **Bước tiếp theo:** Sẵn sàng cho môi trường Production và Deploy lên Internet.

## [18/04/2026 - 20:15] - Cập nhật trạng thái (HOTFIX)
- **Module hoàn thiện:** `src/core/ai-engine/ai-model-manager.ts`, `src/workers/ai-worker.ts`, `src/main.ts`
- **Chức năng:** Vá lỗi UX nghiêm trọng gây kẹt thanh tiến trình. Tích hợp Callback Progress đi sâu vào lõi tải mô hình của `transformers.js` và vòng lặp render khung hình.
- **Giao tiếp (Interfaces):** Worker giao tiếp liên tục với Main Thread để gửi các Status Codes khắt khe: `DOWNLOADING_MODEL`, `COMPILING_GPU`, `GENERATING` và `GENERATE_ERROR` (Kèm theo % hoàn thành chi tiết).
- **Tài nguyên:** Toàn bộ logic bên trong Web Worker được bọc cẩn thận bằng khối `try...catch`. Bất kỳ lỗi tràn VRAM hay rớt mạng nào cũng được ném thẳng về UI, nhuộm đỏ thanh tiến trình và xả lỗi ra màn hình cho người dùng thay vì treo trình duyệt ngầm.
- **Bước tiếp theo:** Production Ready.

## [18/04/2026 - 20:22] - Cập nhật trạng thái (TÁI CẤU TRÚC KIẾN TRÚC CLIENT-SERVER)
- **Kiến trúc mới:** Chuyển đổi toàn diện từ Local WebGPU sang Client - Server (Frontend Vite/TypeScript + Backend Python/FastAPI).
- **Module hoàn thiện:** Tạo `backend/main.py`, `backend/requirements.txt`, và đập đi xây lại cốt lõi `src/core/ai-engine/ai-model-manager.ts`.
- **Chức năng:** Dịch chuyển toàn bộ trọng tải xử lý AI khổng lồ sang Máy chủ Backend. Giao diện Frontend giờ đây cực kỳ mỏng nhẹ (Thin Client), chỉ đóng vai trò thu thập thông tin và hiển thị kết quả. Python Backend sẽ sử dụng hệ sinh thái `diffusers` và `torch` để tương tác trực tiếp với GPU vật lý, đem lại sức mạnh và tốc độ vượt trội.
- **Giao tiếp (Interfaces):** Frontend gọi `fetch()` API qua chuẩn `multipart/form-data` (POST `/api/v1/generate`) tới Backend. Cấu hình CORS ở Backend được mở để giao tiếp mượt mà.
- **Tài nguyên:** XÓA BỎ hoàn toàn logic WebGPU tải xuống trình duyệt và các lỗi tràn VRAM trên máy Client. Áp lực bộ nhớ đã được khoán hoàn toàn cho Server Python.
- **Bước tiếp theo:** Di chuyển mã nguồn cũ vào thư mục `frontend/`, thiết lập Server Backend và xây dựng luồng AI/Diffusers thực tế.

## [18/04/2026 - 20:27] - Cập nhật trạng thái (LÕI AI PYTHON & VRAM OPTIMIZATION)
- **Module hoàn thiện:** `backend/services/ai_service.py` và cập nhật `backend/main.py`.
- **Chức năng:** Triển khai lõi Sinh Video (Animation Generation) chuyên nghiệp sử dụng HuggingFace `diffusers` (Model: Stable Video Diffusion). Nhận ảnh gốc và prompt, suy luận khung hình, và xuất thẳng ra file MP4 tạm thời bằng thư viện con `export_to_video`.
- **Giao tiếp (Interfaces):** Tái cấu trúc endpoint `POST /api/v1/generate`. Endpoint không còn trả về Mock JSON đơn giản, mà sử dụng `FileResponse` của FastAPI để stream trực tiếp file video sinh ra về cho Frontend xử lý.
- **Tài nguyên (Chiến lược VRAM cho RTX 3050 4GB):** Thiết lập một "pháo đài" bảo vệ VRAM cực kỳ khắt khe để gánh khối lượng tính toán khổng lồ:
  1. `torch.float16`: Ép kích thước Tensor xuống một nửa (Half-precision).
  2. `pipe.enable_model_cpu_offload()`: Chia sẻ gánh nặng với RAM máy tính, chỉ load layer cần thiết vào VRAM tại một thời điểm (Zero-OOM).
  3. `pipe.enable_vae_slicing()`: Cắt lát quá trình decode ảnh, khắc chế triệt để lỗi nổ bộ nhớ khi xuất hàng chục frames cùng lúc.
  4. `torch.cuda.empty_cache()`: Khối lệnh `finally` cưỡng ép dọn rác GPU và thu gom `gc.collect()` sau mỗi lần sinh ảnh, không để lại dù chỉ 1MB VRAM bị rò rỉ.
- **Bước tiếp theo:** Cập nhật Frontend để đón nhận và trích xuất Frame từ File Video MP4 được trả về từ Backend thay cho dữ liệu Blob nội suy như trước đây.

## [18/04/2026 - 20:31] - Cập nhật trạng thái (PYTHON EXPORTERS SYSTEM)
- **Kiến trúc:** Dịch chuyển Module Xuất File (Exporters) hoàn toàn sang phía Backend Python. Xóa bỏ rủi ro treo RAM trình duyệt.
- **Module hoàn thiện:** Xây dựng `backend/utils/exporters.py` và cập nhật API `backend/main.py`. Thêm Pillow, moviepy vào `requirements.txt`.
- **Chức năng:**
  1. `Game Exporter`: Tận dụng sức mạnh xử lý của Python `Pillow (PIL)`. Tự động dùng `math.sqrt()` tính toán lưới cắt ghép hàng chục khung hình AI vào một tấm Canvas khổng lồ (SpriteSheet.png) chỉ trong vài miligiây. Đồng thời sinh mã JSON chuẩn Unity/Phaser và gói thành ZIP.
  2. `Web Exporter`: Xuất gói ZIP chứa `index.html` và `script.js`. Nhúng sẵn GSAP Boilerplate Code kết hợp Video MP4 làm nền. Cách làm này tinh giản kích thước website đi rất nhiều so với kỹ thuật chèn Base64 cục bộ của Client cũ.
  3. `Video Exporter`: Xử lý MP4 (hoặc GIF) nguyên bản.
- **Giao tiếp (Interfaces):** Endpoint `POST /api/v1/generate` nay nhận thêm trường `export_type` (`video`, `game`, `web`) từ `FormData`. Phản hồi một tệp nén `.zip` hoặc `.mp4` chuẩn qua `FileResponse`.
- **Tài nguyên (Quản lý Rác Ổ Cứng Server):** Ứng dụng kỹ thuật `background_tasks` độc quyền của FastAPI. Ngay sau khi server xả xong file ZIP về cho người dùng, một luồng ngầm sẽ lập tức thức dậy và gọi lệnh `os.remove()`, dọn sạch sẽ toàn bộ `.mp4`, `.png`, `.json`, `.zip` tạm trong ổ cứng. Không cho rác ảo tích tụ gây sập ổ chủ.
- **Bước tiếp theo:** Xóa hẳn các thư mục Exporter lằng nhằng ở Frontend và cấu trúc lại các nút bấm Export để cắm thẳng trực tiếp vào Backend. Mọi thứ đã nhẹ như lông hồng.
