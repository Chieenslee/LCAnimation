export class MemoryProfiler {
    private operations: Map<string, number> = new Map();

    /**
     * Lấy mức sử dụng JS Heap hiện tại (Tính bằng MB).
     * Chỉ hoạt động trên các trình duyệt hỗ trợ performance.memory (như Chrome/Edge).
     */
    private getMemoryMB(): number {
        const perf = performance as any;
        if (perf && perf.memory && perf.memory.usedJSHeapSize) {
            return Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
        }
        return 0;
    }

    public trackStart(operation: string): void {
        const currentMem = this.getMemoryMB();
        if (currentMem > 0) {
            this.operations.set(operation, currentMem);
            console.log(`[Memory Profiler] 🟢 Bắt đầu '${operation}': ${currentMem} MB đang sử dụng.`);
        } else {
            console.warn(`[Memory Profiler] Trình duyệt này không hỗ trợ API performance.memory.`);
        }
    }

    public trackEnd(operation: string): void {
        const startMem = this.operations.get(operation);
        const endMem = this.getMemoryMB();
        
        if (startMem !== undefined && endMem > 0) {
            const diff = endMem - startMem;
            console.log(`[Memory Profiler] 🔴 Kết thúc '${operation}': ${endMem} MB đang sử dụng (Chênh lệch: ${diff > 0 ? '+' : ''}${diff} MB).`);
            
            // Cảnh báo nếu chênh lệch quá lớn (ví dụ rò rỉ trên 50MB sau hàm dispose)
            if (operation.includes('Dispose') && diff > 50) {
                console.warn(`[WARNING] Phát hiện khả năng rò rỉ bộ nhớ (Memory Leak) sau khi gọi ${operation}! RAM không giảm như kỳ vọng. Diff: +${diff} MB.`);
            }
            this.operations.delete(operation);
        }
    }
}
