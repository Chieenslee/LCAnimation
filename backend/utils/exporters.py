import os
import json
import zipfile
import math
from PIL import Image
from typing import List

class ExporterSystem:
    @staticmethod
    def export_game_assets(frames: List[Image.Image], output_zip: str) -> str:
        """
        Ghép frames thành tấm ảnh SpriteSheet (Grid) và tạo JSON tọa độ.
        Nén cả 2 vào 1 file ZIP duy nhất.
        """
        if not frames:
            raise ValueError("No frames provided for Game Export.")

        frame_count = len(frames)
        frame_w, frame_h = frames[0].size
        
        # Tính toán lưới (Grid) vuông vức nhất
        cols = math.ceil(math.sqrt(frame_count))
        rows = math.ceil(frame_count / cols)
        
        spritesheet_w = cols * frame_w
        spritesheet_h = rows * frame_h
        
        # Khởi tạo Canvas rỗng cho SpriteSheet
        spritesheet = Image.new("RGBA", (spritesheet_w, spritesheet_h), (0, 0, 0, 0))
        metadata = {"frames": {}}
        
        # Vẽ từng frame lên SpriteSheet và lưu tọa độ
        for i, frame in enumerate(frames):
            col = i % cols
            row = i // cols
            x = col * frame_w
            y = row * frame_h
            
            spritesheet.paste(frame.convert("RGBA"), (x, y))
            
            # Chuẩn JSON tương thích với Game Engine (Unity, Phaser)
            metadata["frames"][f"frame_{i}"] = {
                "frame": {"x": x, "y": y, "w": frame_w, "h": frame_h},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": frame_w, "h": frame_h},
                "sourceSize": {"w": frame_w, "h": frame_h}
            }

        # Đường dẫn file tạm
        sprite_path = "temp_spritesheet.png"
        json_path = "temp_data.json"
        
        # Lưu file vật lý
        spritesheet.save(sprite_path, "PNG")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)
            
        # Nén thành tệp ZIP
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(sprite_path, "spritesheet.png")
            zipf.write(json_path, "data.json")
            
        # Dọn dẹp rác vật lý ngay lập tức
        if os.path.exists(sprite_path): os.remove(sprite_path)
        if os.path.exists(json_path): os.remove(json_path)
            
        return output_zip

    @staticmethod
    def export_web_assets(video_path: str, output_zip: str) -> str:
        """
        Tạo mã Boilerplate HTML/JS nhúng GSAP kết hợp file Video, đóng gói vào ZIP.
        """
        # Mã HTML tích hợp GSAP và Video nền
        html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LCAnimation Web Export</title>
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #111; color: white; }
        .video-container { max-width: 800px; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        video { width: 100%; height: auto; display: block; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
    <div class="video-container" id="anim-box">
        <video id="anim-video" src="animation.mp4" autoplay loop muted playsinline></video>
    </div>
    <script src="script.js"></script>
</body>
</html>
"""
        # Mã JS điều khiển GSAP Animation Entry
        js_content = """// Khởi tạo GSAP Entrance Animation
gsap.from("#anim-box", {
    duration: 1.5,
    y: 50,
    opacity: 0,
    ease: "power3.out"
});
"""
        html_path = "temp_index.html"
        js_path = "temp_script.js"
        
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)
            
        # Zip toàn bộ tài nguyên
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(html_path, "index.html")
            zipf.write(js_path, "script.js")
            zipf.write(video_path, "animation.mp4") # Đính kèm video từ AI
            
        if os.path.exists(html_path): os.remove(html_path)
        if os.path.exists(js_path): os.remove(js_path)
            
        return output_zip
