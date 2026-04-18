import { IExporter } from './exporter.interface';

export class WebExporter implements IExporter {
    public async export(data: any): Promise<void> {
        // Ép kiểu dữ liệu đầu vào thành mảng ImageBitmap
        const frames = data as ImageBitmap[];
        
        if (!frames || frames.length === 0) {
            throw new Error("No frames provided for Web Export.");
        }

        // Tạo mảng base64 cho các khung hình
        const base64Frames: string[] = [];
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) {
            throw new Error("Failed to create 2d context for Web Export.");
        }

        for (const frame of frames) {
            tempCanvas.width = frame.width;
            tempCanvas.height = frame.height;
            tempCtx.clearRect(0, 0, frame.width, frame.height);
            tempCtx.drawImage(frame, 0, 0);
            base64Frames.push(tempCanvas.toDataURL('image/jpeg', 0.8)); // Nén JPEG để giảm dung lượng file HTML
        }
        
        // Zero-out Canvas để giải phóng bộ nhớ
        tempCanvas.width = 0;
        tempCanvas.height = 0;

        // Sinh mã HTML/CSS/JS nhúng GSAP
        const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LCAnimation - Web Export</title>
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #111; color: white; }
        .anim-container { 
            width: ${frames[0].width}px; 
            height: ${frames[0].height}px; 
            background-size: cover; 
            background-position: center; 
            background-image: url('${base64Frames[0]}');
        }
    </style>
    <!-- Include GSAP -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
    <div class="anim-container" id="lcanimation-target"></div>
    <script>
        const frames = ${JSON.stringify(base64Frames)};
        const target = document.getElementById('lcanimation-target');
        let currentFrame = 0;

        // GSAP Animation tạo hiệu ứng chuyển khung hình mượt mà
        gsap.to({}, {
            duration: ${frames.length * 0.1}, // Mặc định 10fps (0.1s mỗi khung hình)
            repeat: -1,
            ease: "steps(" + (frames.length - 1) + ")",
            onUpdate: function() {
                const progress = this.progress();
                const index = Math.floor(progress * (frames.length - 1));
                if (index !== currentFrame) {
                    currentFrame = index;
                    target.style.backgroundImage = 'url(' + frames[currentFrame] + ')';
                }
            }
        });
    </script>
</body>
</html>`;

        // Tạo file văn bản .html và tự động tải xuống
        const htmlBlob = new Blob([htmlCode], { type: 'text/html' });
        const url = URL.createObjectURL(htmlBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lcanimation_web_export.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    public dispose(): void {
        console.log("WebExporter disposed.");
    }
}
