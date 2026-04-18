export interface IExporter {
    /**
     * Exports the given animation data to the specific format.
     * @param data The raw animation data (Blob or array of ImageBitmap frames).
     */
    export(data: any): Promise<void>;

    /**
     * Cleans up any resources (Canvas, Object URLs, WebAssembly instances) to prevent memory leaks.
     */
    dispose(): void;
}
