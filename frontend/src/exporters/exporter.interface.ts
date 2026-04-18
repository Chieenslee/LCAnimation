export interface IExporter {
    /**
     * Exports the given animation data to the specific format.
     * @param data The raw animation data (Blob or array of ImageBitmap frames).
     * @param onProgress Optional callback to report export progress (0 to 1).
     */
    export(data: any, onProgress?: (progress: number) => void): Promise<void>;

    /**
     * Cleans up any resources (Canvas, Object URLs, WebAssembly instances) to prevent memory leaks.
     */
    dispose(): void;
}
