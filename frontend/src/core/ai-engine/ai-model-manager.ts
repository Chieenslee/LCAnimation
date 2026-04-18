export class AIModelManager {
    private isInitialized: boolean = false;
    private readonly backendUrl = 'http://localhost:8000/api/v1/generate';

    constructor() {
        // Frontend không còn chứa logic mô hình AI nữa, chỉ đóng vai trò gọi API
    }

    /**
     * Kiểm tra trạng thái của Máy chủ Backend Python thay vì tải WebGPU.
     */
    public async initializeResource(onProgress?: (status: any) => void): Promise<void> {
        if (this.isInitialized) {
            console.log("AI Backend connection is already active.");
            return;
        }

        try {
            console.log("Connecting to Python AI Backend...");
            if (onProgress) onProgress({ status: 'CONNECTING', progress: 50, message: 'Đang kết nối với Máy chủ AI Python...' });
            
            // Hiện tại giả lập thời gian kết nối. 
            // Thực tế có thể gọi endpoint GET /health của Backend để kiểm tra.
            await new Promise(resolve => setTimeout(resolve, 500)); 

            if (onProgress) onProgress({ status: 'READY', progress: 100, message: 'Đã kết nối thành công với Máy chủ AI!' });

            this.isInitialized = true;
            console.log("Backend connection established.");
        } catch (error) {
            console.error("Failed to connect to backend:", error);
            throw error;
        }
    }

    /**
     * Gửi ảnh và prompt tới API Backend qua HTTP POST.
     * Toàn bộ gánh nặng xử lý AI (Render, VRAM, FFmpeg) đã đẩy sang cho Máy chủ Python.
     */
    public async generateAnimation(image: Blob, prompt: string, onProgress?: (status: any) => void): Promise<Blob> {
        if (!this.isInitialized) {
            throw new Error("AI Manager is not initialized. Please call initializeResource() first.");
        }

        try {
            console.log(`Sending data to Backend for prompt: "${prompt}"...`);
            if (onProgress) onProgress({ status: 'GENERATING', progress: 10, message: 'Đang tải dữ liệu lên Máy chủ AI...' });

            const formData = new FormData();
            formData.append('image', image, 'input.png');
            formData.append('prompt', prompt);

            // Gọi API FastAPI
            const response = await fetch(this.backendUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Lỗi không xác định từ Backend Server');
            }

            const result = await response.json();
            
            if (onProgress) onProgress({ status: 'GENERATING', progress: 100, message: 'Máy chủ đã xử lý thành công!' });
            console.log("Backend response:", result);

            // TODO: Trích xuất file kết quả từ JSON result (VD: download file từ URL). 
            // Hiện tại đang mock: Trả về chính ảnh gốc
            return image; 

        } catch (error) {
            console.error("API Request failed:", error);
            throw error;
        }
    }

    /**
     * Frontend không còn phải dọn dẹp WebGPU VRAM phức tạp nữa. 
     * Mọi thứ đều do Backend quản lý (Garbage Collector của Python / PyTorch VRAM release).
     */
    public disposeResources(): void {
        console.log("Disposing frontend AI Manager API connection...");
        this.isInitialized = false;
    }
}
