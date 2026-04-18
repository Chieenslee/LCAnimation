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
    // UI Elements - Core
    const uploadInput = document.getElementById('image-upload') as HTMLInputElement | null;
    const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement | null;
    const promptInput = document.getElementById('prompt-input') as HTMLInputElement | null;
    const progressBarContainer = document.getElementById('progress-container') as HTMLDivElement | null;
    const progressText = document.getElementById('progress-text') as HTMLSpanElement | null;

    // UI Elements - Exporters
    const btnExportWeb = document.getElementById('btn-export-web') as HTMLButtonElement | null;
    const btnExportGame = document.getElementById('btn-export-game') as HTMLButtonElement | null;
    const btnExportVideo = document.getElementById('btn-export-video') as HTMLButtonElement | null;

    if (!uploadInput || !generateBtn || !promptInput || !progressBarContainer || !progressText) {
        console.warn("Required core DOM elements for LCAnimation are missing. Please ensure index.html is fully loaded.");
    }

    // Initialize Core Processors & Exporters
    const imageProcessor = new ImageProcessor();
    const webExporter = new WebExporter();
    const gameExporter = new GameExporter();
    const videoExporter = new VideoExporter();

    // Global State
    let currentAnimationBlob: Blob | null = null;
    let currentSelectedFile: File | null = null;
    let aiWorker: Worker | null = null;

    // Initialize Web Worker
    try {
        aiWorker = new Worker(new URL('./workers/ai-worker.ts', import.meta.url), { type: 'module' });
        
        // Send INIT_AI command when page loads
        aiWorker.postMessage({ type: 'INIT_AI' } as WorkerMessage);
    } catch (e) {
        console.error("Failed to initialize AI Web Worker:", e);
    }

    // --- INPUT EVENT LISTENERS ---

    if (uploadInput && generateBtn) {
        uploadInput.addEventListener('change', (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                currentSelectedFile = target.files[0];
                generateBtn.disabled = false;
            }
        });
    }

    // --- WORKER EVENT LISTENER ---

    if (aiWorker) {
        aiWorker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
            const { type, payload } = event.data;

            switch (type) {
                case 'AI_INITIALIZED':
                    console.log("AI Model initialized successfully.");
                    break;
                case 'PROGRESS':
                    if (progressBarContainer) progressBarContainer.style.display = 'block';
                    if (progressText) progressText.innerText = payload?.message || 'Processing...';
                    break;
                case 'GENERATE_SUCCESS':
                    if (progressBarContainer) progressBarContainer.style.display = 'none';
                    if (progressText) progressText.innerText = 'Completed!';
                    
                    // Store the generated blob in global state
                    if (payload && payload.animationBlob) {
                        currentAnimationBlob = payload.animationBlob;
                        console.log("Animation Blob received and stored successfully.");
                        // Enable export buttons if they were disabled
                        if (btnExportWeb) btnExportWeb.disabled = false;
                        if (btnExportGame) btnExportGame.disabled = false;
                        if (btnExportVideo) btnExportVideo.disabled = false;
                    } else {
                        console.warn("Generation Success received, but payload is missing animationBlob.");
                    }
                    break;
                case 'GENERATE_ERROR':
                    if (progressBarContainer) progressBarContainer.style.display = 'none';
                    if (progressText) progressText.innerText = 'Error occurred!';
                    console.error("Generation Error:", payload?.error);
                    break;
            }
        });
    }

    // --- GENERATE EVENT LISTENER ---

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            if (!currentSelectedFile) {
                alert("Please upload an image first.");
                return;
            }

            if (!aiWorker) {
                alert("AI Worker is not ready.");
                return;
            }

            const promptText = promptInput ? promptInput.value : '';

            try {
                // Show progress
                if (progressBarContainer) progressBarContainer.style.display = 'block';
                if (progressText) progressText.innerText = 'Processing image...';

                // Process image to safe dimensions (max 512x512)
                const processedBlob = await imageProcessor.processImage(currentSelectedFile);
                
                if (!processedBlob) {
                    throw new Error("Failed to process image.");
                }

                if (progressText) progressText.innerText = 'Generating animation...';

                // Send GENERATE command to worker
                aiWorker.postMessage({
                    type: 'GENERATE',
                    payload: {
                        image: processedBlob,
                        prompt: promptText
                    }
                } as WorkerMessage);
            } catch (error) {
                console.error("Error during generation prep:", error);
                if (progressBarContainer) progressBarContainer.style.display = 'none';
                alert("An error occurred while preparing the image for generation.");
            }
        });
    }

    // --- EXPORTER EVENT LISTENERS ---

    const handleExport = async (exporter: WebExporter | GameExporter | VideoExporter, exportName: string) => {
        if (!currentAnimationBlob) {
            alert("No animation generated yet. Please generate an animation first before exporting.");
            return;
        }

        try {
            console.log(`Starting ${exportName} export...`);
            await exporter.export(currentAnimationBlob);
            console.log(`${exportName} export completed successfully.`);
        } catch (error) {
            console.error(`Error during ${exportName} export:`, error);
            alert(`An error occurred while exporting to ${exportName}. Please check the console for details.`);
        }
    };

    if (btnExportWeb) {
        btnExportWeb.addEventListener('click', () => handleExport(webExporter, 'Web/GSAP'));
    }

    if (btnExportGame) {
        btnExportGame.addEventListener('click', () => handleExport(gameExporter, 'Game/SpriteSheet'));
    }

    if (btnExportVideo) {
        btnExportVideo.addEventListener('click', () => handleExport(videoExporter, 'Video/MP4'));
    }

    // --- GLOBAL DISPOSAL (BEFORE UNLOAD) ---

    window.addEventListener('beforeunload', () => {
        // Dispose Image Processor
        imageProcessor.dispose();

        // Dispose Exporters
        webExporter.dispose();
        gameExporter.dispose();
        videoExporter.dispose();

        // Dispose AI Worker resources
        if (aiWorker) {
            aiWorker.postMessage({ type: 'DISPOSE_AI' } as WorkerMessage);
            aiWorker.terminate();
        }
    });
});
