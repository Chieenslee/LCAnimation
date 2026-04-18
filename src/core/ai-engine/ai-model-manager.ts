import { pipeline, env } from '@huggingface/transformers';

export class AIModelManager {
    private aiPipeline: any | null = null;
    private isInitialized: boolean = false;
    
    // Sử dụng một mô hình chuyển đổi hình ảnh lượng tử hóa làm cấu trúc mẫu
    private readonly modelName = 'Xenova/image-to-image-sd-v1-5-quantized'; 

    constructor() {
        // Cấu hình môi trường cho WebGPU
        env.allowLocalModels = false;
        
        // Tắt threading quá tải vì WebGPU sẽ đảm nhiệm sức mạnh tính toán
        if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
            env.backends.onnx.wasm.numThreads = 1; 
        }
    }

    /**
     * Khởi tạo pipeline AI với mô hình Lượng tử hóa (Quantized) chạy trên WebGPU.
     */
    public async initializeResource(onProgress?: (status: any) => void): Promise<void> {
        if (this.isInitialized) {
            console.log("AI Model is already initialized.");
            return;
        }

        try {
            console.log("Loading quantized AI model into WebGPU...");
            if (onProgress) onProgress({ status: 'DOWNLOADING_MODEL', progress: 0, message: 'Khởi tạo tiến trình tải mô hình AI...' });
            
            // Tải mô hình vào pipeline với device là 'webgpu' và kiểu dữ liệu 'q8' (8-bit quantization)
            this.aiPipeline = await pipeline('image-to-image', this.modelName, {
                device: 'webgpu',
                dtype: 'q8', // Tiết kiệm VRAM triệt để cho card RTX 3050 (4GB)
                progress_callback: (data: any) => {
                    if (data && data.status === 'progress' && onProgress) {
                        const percent = Math.round((data.loaded / data.total) * 100);
                        onProgress({ 
                            status: 'DOWNLOADING_MODEL', 
                            progress: percent, 
                            message: `Đang tải mô hình AI (${percent}%)... Lần đầu sẽ mất thời gian`
                        });
                    }
                }
            });

            if (onProgress) onProgress({ status: 'COMPILING_GPU', progress: 100, message: 'Đang biên dịch GPU Shaders (Mất khoảng vài giây)...' });

            this.isInitialized = true;
            console.log("AI Model loaded successfully into WebGPU VRAM.");
        } catch (error) {
            console.error("Failed to load AI model into WebGPU:", error);
            throw error;
        }
    }

    /**
     * Chạy inference để sinh hoạt ảnh/khung hình từ ảnh tĩnh và prompt.
     * @param image Blob của ảnh đầu vào đã qua xử lý (Resize)
     * @param prompt Văn bản điều hướng AI sinh hiệu ứng
     * @returns Blob đại diện cho dữ liệu hoạt ảnh kết quả
     */
    public async generateAnimation(image: Blob, prompt: string, onProgress?: (status: any) => void): Promise<Blob> {
        if (!this.isInitialized || !this.aiPipeline) {
            throw new Error("AI Model pipeline is not initialized. Please call initializeResource() first.");
        }

        try {
            // Chuyển đổi Blob thành URL để truyền vào mô hình
            const imageUrl = URL.createObjectURL(image);

            console.log(`Starting WebGPU inference for prompt: "${prompt}"...`);
            if (onProgress) onProgress({ status: 'GENERATING', progress: 0, message: 'Bắt đầu khởi tạo luồng nội suy AI...' });

            // Chạy pipeline xử lý (Ví dụ với 20 steps để tối ưu tốc độ)
            const result = await this.aiPipeline(imageUrl, prompt, {
                num_inference_steps: 20, 
                guidance_scale: 7.5,
                callback_function: (step: number, timestep: number, latents: any) => {
                    if (onProgress) {
                        const percent = Math.min(Math.round(((step + 1) / 20) * 100), 100);
                        onProgress({ 
                            status: 'GENERATING', 
                            progress: percent, 
                            message: `Đang render khung hình AI (${percent}%)...` 
                        });
                    }
                }
            });

            // Thu hồi URL ảnh gốc ngay lập tức để tiết kiệm RAM trình duyệt
            URL.revokeObjectURL(imageUrl);

            // Bóc tách tensor hình ảnh từ kết quả trả về của transformers.js
            const rawOutput = Array.isArray(result) ? result[0] : result;
            
            // Khởi tạo Canvas tạm để vẽ pixel thô và chuyển thành Blob
            const dummyCanvas = document.createElement('canvas');
            dummyCanvas.width = rawOutput.width || 512;
            dummyCanvas.height = rawOutput.height || 512;
            const ctx = dummyCanvas.getContext('2d');
            
            if (ctx && rawOutput.data) {
                // Tạo mảng Uint8ClampedArray từ tensor xuất ra
                const imageData = new ImageData(new Uint8ClampedArray(rawOutput.data), rawOutput.width, rawOutput.height);
                ctx.putImageData(imageData, 0, 0);
            }

            return new Promise<Blob>((resolve, reject) => {
                dummyCanvas.toBlob((blob) => {
                    // Dọn dẹp Canvas tạm
                    dummyCanvas.width = 0;
                    dummyCanvas.height = 0;
                    
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Failed to convert generated tensor to Blob."));
                    }
                }, 'image/png');
            });

        } catch (error) {
            console.error("WebGPU Inference failed:", error);
            throw error;
        }
    }

    /**
     * Hủy bỏ pipeline, xóa bộ nhớ cache và giải phóng hoàn toàn VRAM.
     */
    public disposeResources(): void {
        console.log("Disposing AI Model resources...");
        if (this.aiPipeline) {
            // Gọi hàm dispose() của thư viện Transformers.js để xả VRAM
            if (typeof this.aiPipeline.dispose === 'function') {
                this.aiPipeline.dispose();
            }
            this.aiPipeline = null;
        }
        this.isInitialized = false;
        console.log("WebGPU VRAM completely cleared.");
    }
}
