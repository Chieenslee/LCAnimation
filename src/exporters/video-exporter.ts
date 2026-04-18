import { IExporter } from './exporter.interface';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export class VideoExporter implements IExporter {
    private ffmpeg: FFmpeg;
    private isLoaded: boolean = false;
    private readonly OUTPUT_NAME = 'lcanimation_output.mp4';
    private generatedFiles: string[] = [];
    private progressCallback: ((params: { progress: number, time: number }) => void) | null = null;

    constructor() {
        this.ffmpeg = new FFmpeg();
    }

    private async initFFmpeg(): Promise<void> {
        if (!this.isLoaded) {
            console.log("Loading FFmpeg Core WASM...");
            await this.ffmpeg.load();
            this.isLoaded = true;
            console.log("FFmpeg Core loaded successfully.");
        }
    }

    public async export(data: any, onProgress?: (progress: number) => void): Promise<void> {
        const frames = data as ImageBitmap[];

        if (!frames || frames.length === 0) {
            throw new Error("No frames provided for Video Export.");
        }

        try {
            await this.initFFmpeg();

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            
            if (!tempCtx) {
                throw new Error("Failed to create temporary canvas for frame extraction.");
            }

            tempCanvas.width = frames[0].width;
            tempCanvas.height = frames[0].height;

            console.log("Writing frames to FFmpeg Virtual File System...");
            this.generatedFiles = [];

            // Ghi file vào VFS
            for (let i = 0; i < frames.length; i++) {
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(frames[i], 0, 0);

                const blob = await new Promise<Blob>((resolve, reject) => {
                    tempCanvas.toBlob((b) => {
                        if (b) resolve(b);
                        else reject(new Error(`Failed to convert frame ${i} to blob.`));
                    }, 'image/png');
                });

                const fileName = `frame_${String(i).padStart(3, '0')}.png`;
                await this.ffmpeg.writeFile(fileName, await fetchFile(blob));
                this.generatedFiles.push(fileName);
            }

            tempCanvas.width = 0;
            tempCanvas.height = 0;

            console.log("Executing FFmpeg command to compile MP4...");
            
            // Đăng ký Callback theo dõi tiến trình Render (cập nhật UI)
            if (onProgress) {
                this.progressCallback = ({ progress }) => {
                    onProgress(progress);
                };
                this.ffmpeg.on('progress', this.progressCallback);
            }

            await this.ffmpeg.exec([
                '-framerate', '10',
                '-i', 'frame_%03d.png',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                this.OUTPUT_NAME
            ]);

            // Gỡ bỏ Callback an toàn
            if (onProgress && this.progressCallback) {
                this.ffmpeg.off('progress', this.progressCallback);
                this.progressCallback = null;
                onProgress(1); // Ép cứng 100% khi xong
            }

            console.log("Reading output video file...");
            const fileData = await this.ffmpeg.readFile(this.OUTPUT_NAME);
            
            const mp4Blob = new Blob([(fileData as Uint8Array).buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(mp4Blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = this.OUTPUT_NAME;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("FFmpeg Video Export failed:", error);
            throw error;
        } finally {
            this.cleanVirtualFileSystem();
        }
    }

    private cleanVirtualFileSystem(): void {
        console.log("Cleaning up FFmpeg Virtual File System...");
        
        for (const fileName of this.generatedFiles) {
            try {
                this.ffmpeg.deleteFile(fileName);
            } catch (e) {
                console.warn(`Could not delete file ${fileName} from VFS:`, e);
            }
        }
        this.generatedFiles = [];

        try {
            this.ffmpeg.deleteFile(this.OUTPUT_NAME);
        } catch (e) {
            console.warn(`Could not delete output file from VFS:`, e);
        }
    }

    public dispose(): void {
        if (this.isLoaded) {
            try {
                this.cleanVirtualFileSystem();
                this.ffmpeg.terminate();
                this.isLoaded = false;
                console.log("FFmpeg WASM instance terminated and RAM freed completely.");
            } catch (error) {
                console.error("Error during FFmpeg termination:", error);
            }
        }
    }
}
