import { IExporter } from './exporter.interface';

export class GameExporter implements IExporter {
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;
    private objectUrls: Set<string>;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.objectUrls = new Set<string>();
        
        if (!this.ctx) {
            console.error("Failed to initialize Canvas 2D context for GameExporter.");
        }
    }

    public async export(data: any): Promise<void> {
        const frames = data as ImageBitmap[];
        
        if (!frames || frames.length === 0) {
            throw new Error("No frames provided for Game Export.");
        }

        if (!this.canvas || !this.ctx) {
            throw new Error("Canvas context is not initialized.");
        }

        return new Promise((resolve, reject) => {
            const frameCount = frames.length;
            const frameWidth = frames[0].width;
            const frameHeight = frames[0].height;

            // Tính toán Grid (Lưới) vuông vức nhất có thể để tối ưu Texture Size trong Game Engine
            const cols = Math.ceil(Math.sqrt(frameCount));
            const rows = Math.ceil(frameCount / cols);

            // Gán kích thước cho Canvas khổng lồ
            this.canvas!.width = cols * frameWidth;
            this.canvas!.height = rows * frameHeight;
            this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);

            const metadata: any = { frames: {} };

            // Vẽ từng khung hình vào đúng vị trí lưới
            for (let i = 0; i < frameCount; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);

                const xOffset = col * frameWidth;
                const yOffset = row * frameHeight;

                this.ctx!.drawImage(frames[i], xOffset, yOffset, frameWidth, frameHeight);

                // Lưu tọa độ vào định dạng chuẩn SpriteSheet
                metadata.frames[`frame_${i}`] = {
                    frame: { x: xOffset, y: yOffset, w: frameWidth, h: frameHeight },
                    rotated: false,
                    trimmed: false,
                    spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
                    sourceSize: { w: frameWidth, h: frameHeight }
                };
            }

            // Xuất Canvas thành file SpriteSheet PNG
            this.canvas!.toBlob((blob) => {
                if (blob) {
                    const spriteUrl = URL.createObjectURL(blob);
                    this.objectUrls.add(spriteUrl);
                    this.downloadFile(spriteUrl, 'spritesheet.png');
                    
                    // Xuất toạ độ thành file JSON
                    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
                    const jsonUrl = URL.createObjectURL(jsonBlob);
                    this.objectUrls.add(jsonUrl);
                    this.downloadFile(jsonUrl, 'spritesheet.json');
                    
                    resolve();
                } else {
                    reject(new Error("Failed to generate SpriteSheet blob."));
                }
            }, 'image/png');
        });
    }

    private downloadFile(url: string, filename: string): void {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    public dispose(): void {
        // Kỹ thuật Zero-out Canvas: Ép kích thước về 0 để GC thu hồi bộ nhớ ngay lập tức
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
        }
        
        // Xóa tham chiếu
        this.canvas = null;
        this.ctx = null;

        // Dọn dẹp URL tĩnh
        this.objectUrls.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        this.objectUrls.clear();
        
        console.log("GameExporter disposed, Canvas zeroed out and URLs cleared.");
    }
}
