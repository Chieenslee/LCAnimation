import { ImageProcessor } from './core/image-processing/image-processor';
import { WebExporter } from './exporters/web-exporter';
import { GameExporter } from './exporters/game-exporter';
import { VideoExporter } from './exporters/video-exporter';
import { MemoryProfiler } from './utils/memory-profiler';

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
    const progressStatus = document.getElementById('status-text') as HTMLSpanElement | null;
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
    const memoryProfiler = new MemoryProfiler(); // Công cụ đo RAM

    // 3. Quản lý trạng thái State
    let currentAnimationData: any = null; 
    let currentSelectedFile: File | null = null;
    let aiWorker: Worker | null = null;

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
        progressBarFill.style.backgroundColor = '#ef4444'; 
    }

    uploadInput.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            currentSelectedFile = target.files[0];
            generateBtn.disabled = false; 
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
                    updateProgress(payload?.message || 'AI is dreaming...', payload?.progress || 0);
                    break;
                case 'GENERATE_SUCCESS':
                    currentAnimationData = payload?.animationData;
                    updateProgress("Generation Completed Successfully!", 100);
                    
                    btnExportWeb.disabled = false;
                    btnExportGame.disabled = false;
                    btnExportVideo.disabled = false;
                    
                    memoryProfiler.trackEnd('AI_Inference'); // Dừng đo RAM cho luồng AI
                    
                    alert("Hoạt ảnh đã được tạo thành công! Bạn có thể xuất file ngay bây giờ.");
                    setTimeout(() => { progressBarContainer.style.display = 'none'; }, 3000);
                    break;
                case 'GENERATE_ERROR':
                    updateProgress(`Lỗi: ${payload?.error || 'Unknown error'}`, 0);
                    progressBarFill.style.backgroundColor = '#ef4444'; 
                    console.error("Generation Error:", payload?.error);
                    memoryProfiler.trackEnd('AI_Inference'); // Dừng đo RAM 
                    alert(`Đã xảy ra lỗi trong quá trình xử lý AI. Lỗi: ${payload?.error}`);
                    break;
            }
        });
    }

    // 6. Xử lý nút bấm Generate (Kích hoạt luồng E2E)
    generateBtn.addEventListener('click', async () => {
        if (!currentSelectedFile || !aiWorker) return;

        btnExportWeb.disabled = true;
        btnExportGame.disabled = true;
        btnExportVideo.disabled = true;
        currentAnimationData = null;
        progressBarFill.style.backgroundColor = '#10b981'; 

        try {
            memoryProfiler.trackStart('AI_Inference'); // Bắt đầu đo RAM lúc khởi chạy AI
            
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
            memoryProfiler.trackEnd('AI_Inference');
        }
    });

    // 7. Giao diện tích hợp Export và Profiling
    const handleExport = async (exporter: WebExporter | GameExporter | VideoExporter, btnText: string, targetBtn: HTMLButtonElement) => {
        if (!currentAnimationData) {
            alert("Vui lòng khởi tạo (Generate) hoạt ảnh trước khi xuất file.");
            return;
        }

        const originalText = targetBtn.innerText;
        const profileOp = `Export_${btnText.replace(/ /g, '_')}`;
        
        try {
            targetBtn.disabled = true;
            targetBtn.innerText = "⏳ Đang xử lý...";
            progressBarFill.style.backgroundColor = '#10b981';
            
            updateProgress(`Starting ${btnText} export...`, 0);

            memoryProfiler.trackStart(profileOp); // Bắt đầu đo RAM cho Exporter

            await exporter.export(currentAnimationData, (progress: number) => {
                updateProgress(`Rendering ${btnText}...`, progress * 100);
            });

            updateProgress(`${btnText} Export Successful!`, 100);
            alert(`Tuyệt vời! Xuất file ${btnText} thành công!`);
        } catch (error) {
            console.error(`Export Error for ${btnText}:`, error);
            updateProgress(`Export Failed!`, 0);
            progressBarFill.style.backgroundColor = '#ef4444'; 
            alert(`Xuất file thất bại. Vui lòng kiểm tra Console. Lỗi: ${(error as Error).message}`);
        } finally {
            memoryProfiler.trackEnd(profileOp); // Chốt sổ lượng RAM tiêu thụ
            
            targetBtn.innerText = originalText;
            targetBtn.disabled = false;
            setTimeout(() => { progressBarContainer.style.display = 'none'; }, 3000);
        }
    };

    btnExportWeb.addEventListener('click', () => handleExport(webExporter, "Web (GSAP)", btnExportWeb));
    btnExportGame.addEventListener('click', () => handleExport(gameExporter, "Game (SpriteSheet)", btnExportGame));
    btnExportVideo.addEventListener('click', () => handleExport(videoExporter, "Video (MP4)", btnExportVideo));

    // 8. KỶ LUẬT THÉP: Dọn dẹp Toàn cục và Kiểm toán RAM
    window.addEventListener('beforeunload', () => {
        console.log("Unloading window... Disposing ALL LCAnimation resources.");
        
        memoryProfiler.trackStart('Global_Dispose');
        
        imageProcessor.dispose();
        webExporter.dispose();
        gameExporter.dispose();
        videoExporter.dispose();

        if (aiWorker) {
            aiWorker.postMessage({ type: 'DISPOSE_AI' } as WorkerMessage);
            aiWorker.terminate();
        }
        
        // Gọi trackEnd để cảnh báo nếu RAM không chịu giảm
        memoryProfiler.trackEnd('Global_Dispose');
    });
});
