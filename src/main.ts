import { ImageProcessor } from './core/image-processing/image-processor';
import { WebExporter } from './exporters/web-exporter';
import { GameExporter } from './exporters/game-exporter';
import { VideoExporter } from './exporters/video-exporter';

// Types for Worker Messages
interface WorkerMessage {
    type: 'INIT_AI' | 'GENERATE' | 'DISPOSE_AI';
    payload?: any;
}

interface WorkerResponse {
    type: 'AI_INITIALIZED' | 'GENERATE_SUCCESS' | 'GENERATE_ERROR' | 'PROGRESS';
    payload?: any;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Khai báo các phần tử DOM (UI)
    const uploadInput = document.getElementById('image-upload') as HTMLInputElement | null;
    const promptInput = document.getElementById('prompt-input') as HTMLInputElement | null;
    const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement | null;
    
    const progressBarContainer = document.getElementById('progress-container') as HTMLDivElement | null;
    const progressStatus = document.getElementById('progress-status') as HTMLSpanElement | null;
    const progressPercentage = document.getElementById('progress-percentage') as HTMLSpanElement | null;
    const progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement | null;

    const btnExportWeb = document.getElementById('btn-export-web') as HTMLButtonElement | null;
    const btnExportGame = document.getElementById('btn-export-game') as HTMLButtonElement | null;
    const btnExportVideo = document.getElementById('btn-export-video') as HTMLButtonElement | null;

    if (!uploadInput || !generateBtn || !promptInput || !progressBarContainer || !progressStatus || !progressPercentage || !progressBarFill || !btnExportWeb || !btnExportGame || !btnExportVideo) {
        console.warn("Required DOM elements for LCAnimation are missing. Please check index.html.");
        return;
    }

    // 2. Khởi tạo Modules
    const imageProcessor = new ImageProcessor();
    const webExporter = new WebExporter();
    const gameExporter = new GameExporter();
    const videoExporter = new VideoExporter();

    // 3. Quản lý trạng thái State
    let currentAnimationData: any = null; // Chứa Blob hoặc mảng ImageBitmap từ AI Worker
    let currentSelectedFile: File | null = null;
    let aiWorker: Worker | null = null;

    // Helper: Hàm quản lý trạng thái thanh tiến trình siêu mượt
    const updateProgress = (status: string, percent: number) => {
        progressBarContainer.style.display = 'block';
        progressStatus.innerText = status;
        const boundedPercent = Math.min(Math.max(percent, 0), 100);
        progressPercentage.innerText = `${Math.round(boundedPercent)}%`;
        progressBarFill.style.width = `${boundedPercent}%`;
    };

    // 4. Khởi động AI Web Worker
    try {
        aiWorker = new Worker(new URL('./workers/ai-worker.ts', import.meta.url), { type: 'module' });
        aiWorker.postMessage({ type: 'INIT_AI' } as WorkerMessage);
    } catch (e) {
        console.error("Failed to initialize AI Web Worker:", e);
        updateProgress("Error: Web Worker Failed to Load.", 0);
        progressBarFill.style.backgroundColor = '#ef4444'; // Báo lỗi màu đỏ
    }

    // Bắt sự kiện người dùng chọn ảnh
    uploadInput.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            currentSelectedFile = target.files[0];
            generateBtn.disabled = false; // Mở nút Generate
        }
    });

    // 5. Luồng xử lý Worker Messaging
    if (aiWorker) {
        aiWorker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
            const { type, payload } = event.data;

            switch (type) {
                case 'AI_INITIALIZED':
                    console.log("AI Model Worker initialized successfully.");
                    break;
                case 'PROGRESS':
                    // Đồng bộ hiển thị tiến trình của WebGPU AI Model
                    updateProgress(payload?.message || 'AI is dreaming...', payload?.progress || 0);
                    break;
                case 'GENERATE_SUCCESS':
                    currentAnimationData = payload?.animationData;
                    updateProgress("Generation Completed Successfully!", 100);
                    
                    // Mở khóa bộ 3 nút xuất file
                    btnExportWeb.disabled = false;
                    btnExportGame.disabled = false;
                    btnExportVideo.disabled = false;
                    
                    alert("Hoạt ảnh đã được tạo thành công! Bạn có thể xuất file ngay bây giờ.");
                    
                    setTimeout(() => {
                        progressBarContainer.style.display = 'none'; // Tự ẩn thanh tiến trình sau 3s
                    }, 3000);
                    break;
                case 'GENERATE_ERROR':
                    updateProgress("Error generating animation.", 0);
                    progressBarFill.style.backgroundColor = '#ef4444'; // Đỏ báo lỗi
                    console.error("Generation Error:", payload?.error);
                    alert("Đã xảy ra lỗi trong quá trình tạo hoạt ảnh. Vui lòng kiểm tra Console.");
                    break;
            }
        });
    }

    // 6. Xử lý nút bấm Generate (Kích hoạt luồng E2E)
    generateBtn.addEventListener('click', async () => {
        if (!currentSelectedFile || !aiWorker) return;

        // Reset UI và khóa nút xuất file
        btnExportWeb.disabled = true;
        btnExportGame.disabled = true;
        btnExportVideo.disabled = true;
        currentAnimationData = null;
        progressBarFill.style.backgroundColor = '#10b981'; // Xanh lá mượt

        try {
            updateProgress("Resizing image for VRAM safety...", 5);
            const processedBlob = await imageProcessor.processImage(currentSelectedFile);
            
            if (!processedBlob) throw new Error("Failed to resize and prepare image.");

            updateProgress("Sending data to AI Worker...", 10);
            aiWorker.postMessage({
                type: 'GENERATE',
                payload: {
                    image: processedBlob,
                    prompt: promptInput.value
                }
            } as WorkerMessage);
        } catch (error) {
            console.error("Image Processing Error:", error);
            updateProgress("Failed to prepare image.", 0);
            progressBarFill.style.backgroundColor = '#ef4444';
        }
    });

    // 7. Giao diện tích hợp Export và Loading UX
    const handleExport = async (exporter: WebExporter | GameExporter | VideoExporter, btnText: string, targetBtn: HTMLButtonElement) => {
        if (!currentAnimationData) {
            alert("Vui lòng khởi tạo (Generate) hoạt ảnh trước khi xuất file.");
            return;
        }

        const originalText = targetBtn.innerText;
        try {
            // Thay đổi trạng thái nút bấm
            targetBtn.disabled = true;
            targetBtn.innerText = "⏳ Đang xử lý...";
            progressBarFill.style.backgroundColor = '#10b981';
            
            updateProgress(`Starting ${btnText} export...`, 0);

            // Bắt progress callback từ Exporters (Đặc biệt cho FFmpeg Video Export)
            await exporter.export(currentAnimationData, (progress: number) => {
                updateProgress(`Rendering ${btnText}...`, progress * 100);
            });

            updateProgress(`${btnText} Export Successful!`, 100);
            alert(`Tuyệt vời! Xuất file ${btnText} thành công!`);
        } catch (error) {
            console.error(`Export Error for ${btnText}:`, error);
            updateProgress(`Export Failed!`, 0);
            progressBarFill.style.backgroundColor = '#ef4444'; // Báo đỏ
            alert(`Xuất file thất bại. Vui lòng kiểm tra Console. Lỗi: ${(error as Error).message}`);
        } finally {
            // Phục hồi UI về mặc định
            targetBtn.innerText = originalText;
            targetBtn.disabled = false;
            
            setTimeout(() => {
                progressBarContainer.style.display = 'none';
            }, 3000);
        }
    };

    btnExportWeb.addEventListener('click', () => handleExport(webExporter, "Web (GSAP)", btnExportWeb));
    btnExportGame.addEventListener('click', () => handleExport(gameExporter, "Game (SpriteSheet)", btnExportGame));
    btnExportVideo.addEventListener('click', () => handleExport(videoExporter, "Video (MP4)", btnExportVideo));

    // 8. KỶ LUẬT THÉP: Dọn dẹp Toàn cục (Global Disposal)
    window.addEventListener('beforeunload', () => {
        console.log("Unloading window... Disposing ALL LCAnimation resources.");
        imageProcessor.dispose();
        webExporter.dispose();
        gameExporter.dispose();
        videoExporter.dispose();

        if (aiWorker) {
            aiWorker.postMessage({ type: 'DISPOSE_AI' } as WorkerMessage);
            aiWorker.terminate();
        }
    });
});
