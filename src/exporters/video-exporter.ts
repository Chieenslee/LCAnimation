import { IExporter } from './exporter.interface';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export class VideoExporter implements IExporter {
    private ffmpeg: FFmpeg;
    private isLoaded: boolean = false;

    constructor() {
        this.ffmpeg = new FFmpeg();
    }

    private async initFFmpeg(): Promise<void> {
        if (!this.isLoaded) {
            await this.ffmpeg.load();
            this.isLoaded = true;
        }
    }

    public async export(data: Blob): Promise<void> {
        await this.initFFmpeg();

        try {
            // Write input file to FFmpeg's virtual file system
            const inputFileName = 'input_video.webm'; // Assuming input might be webm from canvas capture
            const outputFileName = 'lcanimation_output.mp4';
            
            await this.ffmpeg.writeFile(inputFileName, await fetchFile(data));

            // Run FFmpeg command to convert to MP4
            // -c:v libx264 for H.264 encoding, -preset ultrafast for speed
            await this.ffmpeg.exec(['-i', inputFileName, '-c:v', 'libx264', '-preset', 'ultrafast', outputFileName]);

            // Read the output file
            const fileData = await this.ffmpeg.readFile(outputFileName);
            
            // Create a downloadable Blob
            const mp4Blob = new Blob([(fileData as Uint8Array).buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(mp4Blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = outputFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up downloaded URL
            URL.revokeObjectURL(url);

            // Clean up files in virtual FS to prevent WASM RAM leak
            await this.ffmpeg.deleteFile(inputFileName);
            await this.ffmpeg.deleteFile(outputFileName);
            
            console.log("Video successfully exported and WASM memory cleaned.");
        } catch (error) {
            console.error("FFmpeg Video Export failed:", error);
            throw error;
        }
    }

    public dispose(): void {
        if (this.isLoaded) {
            try {
                // Terminate the FFmpeg worker entirely to free up heavy WASM RAM.
                this.ffmpeg.terminate();
                this.isLoaded = false;
                console.log("FFmpeg WASM instance terminated and RAM freed.");
            } catch (error) {
                console.error("Error during FFmpeg termination:", error);
            }
        }
    }
}
