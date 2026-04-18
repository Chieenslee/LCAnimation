import { AIModelManager } from '../core/ai-engine/ai-model-manager';

const aiManager = new AIModelManager();

self.addEventListener('message', async (event: MessageEvent) => {
    const { type, payload } = event.data;

    try {
        switch (type) {
            case 'INIT_AI':
                await aiManager.initializeResource((statusInfo) => {
                    self.postMessage({
                        type: 'PROGRESS',
                        payload: statusInfo
                    });
                });
                self.postMessage({ type: 'AI_INITIALIZED' });
                break;

            case 'GENERATE':
                const { image, prompt } = payload;
                if (!image) throw new Error("Image blob is missing from payload.");

                const animationBlob = await aiManager.generateAnimation(image, prompt, (statusInfo) => {
                    self.postMessage({
                        type: 'PROGRESS',
                        payload: statusInfo
                    });
                });

                // Chuyển Blob thành mảng ImageBitmap (Mô phỏng xuất nhiều frames vì model này trả 1 ảnh)
                const bitmap = await createImageBitmap(animationBlob);
                const frames = [bitmap, bitmap, bitmap, bitmap, bitmap]; // Giả lập 5 khung hình

                self.postMessage({
                    type: 'GENERATE_SUCCESS',
                    payload: { animationData: frames }
                });
                break;

            case 'DISPOSE_AI':
                aiManager.disposeResources();
                break;
                
            default:
                console.warn(`Unknown worker message type: ${type}`);
        }
    } catch (error: any) {
        // Bắt mọi lỗi sập hệ thống và báo về Main Thread
        self.postMessage({
            type: 'GENERATE_ERROR',
            payload: { error: error.message || error.toString() }
        });
    }
});
