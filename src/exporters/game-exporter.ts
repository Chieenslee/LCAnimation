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

    public async export(data: Blob): Promise<void> {
        if (!this.canvas || !this.ctx) {
            throw new Error("Canvas context is not initialized.");
        }

        return new Promise((resolve, reject) => {
            const videoUrl = URL.createObjectURL(data);
            this.objectUrls.add(videoUrl);

            const video = document.createElement('video');
            video.src = videoUrl;
            video.crossOrigin = "anonymous";
            video.muted = true;
            
            video.onloadeddata = async () => {
                const width = video.videoWidth || 512;
                const height = video.videoHeight || 512;
                const metadata: any = { frames: {} };

                // Define arbitrary frame count or FPS for extraction
                const frameCount = 10; 
                const duration = video.duration || 1;
                const step = duration / frameCount;

                // Create a giant canvas for spritesheet (Horizontal strip for simplicity)
                this.canvas!.width = width * frameCount;
                this.canvas!.height = height;
                this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);

                for (let i = 0; i < frameCount; i++) {
                    video.currentTime = i * step;
                    
                    // Wait for the video to seek
                    await new Promise<void>((seekResolve) => {
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked);
                            seekResolve();
                        };
                        video.addEventListener('seeked', onSeeked);
                    });

                    // Draw frame onto spritesheet canvas
                    const xOffset = i * width;
                    this.ctx!.drawImage(video, xOffset, 0, width, height);
                    
                    // Store coordinates in JSON metadata
                    metadata.frames[`frame_${i}`] = {
                        frame: { x: xOffset, y: 0, w: width, h: height },
                        rotated: false,
                        trimmed: false,
                        spriteSourceSize: { x: 0, y: 0, w: width, h: height },
                        sourceSize: { w: width, h: height }
                    };
                }

                // Download SpriteSheet PNG
                this.canvas!.toBlob((blob) => {
                    if (blob) {
                        const spriteUrl = URL.createObjectURL(blob);
                        this.objectUrls.add(spriteUrl);
                        this.downloadFile(spriteUrl, 'spritesheet.png');
                        
                        // Download JSON Metadata
                        const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
                        const jsonUrl = URL.createObjectURL(jsonBlob);
                        this.objectUrls.add(jsonUrl);
                        this.downloadFile(jsonUrl, 'spritesheet.json');
                        
                        resolve();
                    } else {
                        reject(new Error("Failed to generate SpriteSheet blob."));
                    }
                }, 'image/png');
            };

            video.onerror = () => {
                reject(new Error("Failed to load video data for Game Export."));
            };
            
            // Trigger load
            video.load();
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
        // Clean up giant canvas
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
        }
        
        // Clear references
        this.canvas = null;
        this.ctx = null;

        // Revoke all created URLs to avoid memory leaks
        this.objectUrls.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        this.objectUrls.clear();
        
        console.log("GameExporter disposed, Canvas and URLs cleared.");
    }
}
