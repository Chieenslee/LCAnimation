export interface IExporter {
    /**
     * Exports the given animation data (Blob) to the specific format.
     * @param data The raw animation data or video blob.
     */
    export(data: Blob): Promise<void>;

    /**
     * Cleans up any resources (Canvas, Object URLs, WebAssembly instances) to prevent memory leaks.
     */
    dispose(): void;
}
