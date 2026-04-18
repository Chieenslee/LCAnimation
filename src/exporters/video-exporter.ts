import { IExporter } from './exporter.interface';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export class VideoExporter implements IExporter {
    private ffmpeg: FFmpeg;
    private isLoaded: boolean = false;
    private readonly OUTPUT_NAME = 'lcanimation_output.mp4';
    private generatedFiles: string[] = [];

    constructor() {
        this.ffmpeg = new FFmpeg();
    }

    private async initFFmpeg(): Promise<void> {
        if (!this.isLoaded) {
            console.log("Loading FFmpeg Core WASM...");
            await this.ffmpeg.load({
                // Mặc định sử dụng core từ CDN, có thể tùy chỉnh nếu self-host
            });
            this.isLoaded = true;
            console.log("FFmpeg Core loaded successfully.");
        }
    }

    public async export(data: any): Promise<void> {
        const frames = data as ImageBitmap[];

        if (!frames || frames.length === 0) {
            throw new Error("No frames provided for Video Export.");
        }

        try {
            await this.initFFmpeg();

            // Khởi tạo Canvas tạm để vẽ ImageBitmap thành Blob (yêu cầu của fetchFile)
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            
            if (!tempCtx) {
                throw new Error("Failed to create temporary canvas for frame extraction.");
            }

            tempCanvas.width = frames[0].width;
            tempCanvas.height = frames[0].height;

            console.log("Writing frames to FFmpeg Virtual File System...");
            this.generatedFiles = [];

            // Vòng lặp chuyển đổi và ghi từng khung hình vào File System Ảo của FFmpeg
            for (let i = 0; i < frames.length; i++) {
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(frames[i], 0, 0);

                const blob = await new Promise<Blob>((resolve, reject) => {
                    tempCanvas.toBlob((b) => {
                        if (b) resolve(b);
                        else reject(new Error(`Failed to convert frame ${i} to blob.`));
                    }, 'image/png');
                });

                // Đặt tên theo pattern frame_001.png, frame_002.png...
                const fileName = `frame_${String(i).padStart(3, '0')}.png`;
                await this.ffmpeg.writeFile(fileName, await fetchFile(blob));
                this.generatedFiles.push(fileName);
            }

            // Zero-out canvas để tiết kiệm RAM
            tempCanvas.width = 0;
            tempCanvas.height = 0;

            console.log("Executing FFmpeg command to compile MP4...");
            
            // Chạy lệnh FFmpeg: 
            // -framerate 10 (10 fps)
            // -i frame_%03d.png (đầu vào pattern)
            // -c:v libx264 (Nén H.264)
            // -pix_fmt yuv420p (Pixel format tương thích mọi trình duyệt web/điện thoại)
            await this.ffmpeg.exec([
                '-framerate', '10',
                '-i', 'frame_%03d.png',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                this.OUTPUT_NAME
            ]);

            console.log("Reading output video file...");
            const fileData = await this.ffmpeg.readFile(this.OUTPUT_NAME);
            
            // Tạo Blob MP4 và tải xuống
            const mp4Blob = new Blob([(fileData as Uint8Array).buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(mp4Blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = this.OUTPUT_NAME;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Hủy Object URL
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("FFmpeg Video Export failed:", error);
            throw error;
        } finally {
            // BẮT BUỘC: Luôn luôn dọn dẹp hệ thống tệp ảo dù thành công hay sập lỗi
            this.cleanVirtualFileSystem();
        }
    }

    /**
     * Thuật toán xóa sạch rác trong hệ thống tệp ảo (VFS)
     */
    private cleanVirtualFileSystem(): void {
        console.log("Cleaning up FFmpeg Virtual File System...");
        
        // Dùng vòng lặp xóa từng file frame tạm
        for (const fileName of this.generatedFiles) {
            try {
                this.ffmpeg.deleteFile(fileName);
            } catch (e) {
                console.warn(`Could not delete file ${fileName} from VFS:`, e);
            }
        }
        this.generatedFiles = []; // Reset mảng

        // Xóa file output
        try {
            this.ffmpeg.deleteFile(this.OUTPUT_NAME);
            console.log(`Deleted ${this.OUTPUT_NAME} from VFS.`);
        } catch (e) {
            console.warn(`Could not delete output file from VFS:`, e);
        }
    }

    public dispose(): void {
        if (this.isLoaded) {
            try {
                // Đề phòng trường hợp hủy giữa chừng, gọi clean VFS trước
                this.cleanVirtualFileSystem();

                // Lệnh then chốt: Chặt đứt hoàn toàn luồng Web Worker của FFmpeg, ép RAM phải xả
                this.ffmpeg.terminate();
                this.isLoaded = false;
                console.log("FFmpeg WASM instance terminated and RAM freed completely.");
            } catch (error) {
                console.error("Error during FFmpeg termination:", error);
            }
        }
    }
}
