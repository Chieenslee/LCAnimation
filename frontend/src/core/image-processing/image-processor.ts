export class ImageProcessor {
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;
    private objectUrls: Set<string>;
    private readonly MAX_SIZE = 512;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.objectUrls = new Set<string>();
        
        if (!this.ctx) {
            console.error("Failed to initialize Canvas 2D context for ImageProcessor.");
        }
    }

    /**
     * Reads a File and resizes it to a maximum dimension of 512x512 to prevent VRAM overflow.
     * Returns a blob of the resized image or null if failed.
     */
    public async processImage(file: File): Promise<Blob | null> {
        if (!this.canvas || !this.ctx) {
            console.error("Canvas context is destroyed or not initialized.");
            return null;
        }

        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            this.objectUrls.add(objectUrl);

            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions keeping aspect ratio
                if (width > this.MAX_SIZE || height > this.MAX_SIZE) {
                    if (width > height) {
                        height = Math.round((height * this.MAX_SIZE) / width);
                        width = this.MAX_SIZE;
                    } else {
                        width = Math.round((width * this.MAX_SIZE) / height);
                        height = this.MAX_SIZE;
                    }
                }

                // Make sure canvas dimensions match the new size
                this.canvas!.width = width;
                this.canvas!.height = height;

                // Clear previous context
                this.ctx!.clearRect(0, 0, width, height);

                // Draw the resized image
                this.ctx!.drawImage(img, 0, 0, width, height);

                // Convert back to blob
                this.canvas!.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Failed to convert canvas to Blob."));
                        }
                    },
                    file.type || 'image/png',
                    0.9 // Quality
                );
                
                // Cleanup current object URL as it's no longer needed
                URL.revokeObjectURL(objectUrl);
                this.objectUrls.delete(objectUrl);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                this.objectUrls.delete(objectUrl);
                reject(new Error("Failed to load image for processing."));
            };

            img.src = objectUrl;
        });
    }

    /**
     * Cleans up all resources used by the ImageProcessor to prevent memory leaks.
     */
    public dispose(): void {
        // Clear canvas
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
        }
        
        // Revoke all remaining object URLs
        this.objectUrls.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        this.objectUrls.clear();

        // Remove references
        this.canvas = null;
        this.ctx = null;
    }
}
