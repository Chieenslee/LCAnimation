import { IExporter } from './exporter.interface';

export class WebExporter implements IExporter {
    public async export(data: Blob): Promise<void> {
        // Since we are exporting to Web/GSAP, we'll generate HTML/JS/CSS code.
        // For demonstration, we'll convert the blob to base64 if it's an image/sprite
        // or just provide the structure of a GSAP animation.
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Data = reader.result as string;
                    
                    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LCAnimation - Web Export</title>
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #111; color: white; }
        .anim-container { width: 512px; height: 512px; background-image: url('${base64Data}'); background-size: cover; background-position: center; }
    </style>
    <!-- Include GSAP -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
    <div class="anim-container" id="lcanimation-target"></div>
    <script>
        // Example GSAP Animation Code
        gsap.to("#lcanimation-target", {
            rotation: 360,
            duration: 2,
            repeat: -1,
            ease: "linear"
        });
    </script>
</body>
</html>`;
                    
                    // Create a downloadable HTML file
                    const htmlBlob = new Blob([htmlCode], { type: 'text/html' });
                    const url = URL.createObjectURL(htmlBlob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'lcanimation_web_export.html';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    resolve();
                };
                reader.onerror = () => reject(new Error("Failed to read Blob data for Web Export."));
                reader.readAsDataURL(data);
            } catch (error) {
                console.error("WebExporter export failed:", error);
                reject(error);
            }
        });
    }

    public dispose(): void {
        // No heavy resources like Canvas or WASM are used here.
        console.log("WebExporter disposed.");
    }
}
