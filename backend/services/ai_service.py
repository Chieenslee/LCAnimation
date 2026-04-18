import torch
import os
from io import BytesIO
from PIL import Image
import gc
from diffusers import StableVideoDiffusionPipeline
from diffusers.utils import export_to_video

class AIGeneratorService:
    def __init__(self):
        self.pipe = None
        self.is_loaded = False
        # Sử dụng mô hình Stable Video Diffusion (SVD) để chuyển đổi Ảnh -> Video
        self.model_id = "stabilityai/stable-video-diffusion-img2vid-xt"

    def load_model(self):
        if self.is_loaded:
            return

        print("Loading AI Model into Memory/VRAM...")
        # TỐI ƯU HÓA 1: Ép kiểu torch.float16 để giảm một nửa dung lượng VRAM
        self.pipe = StableVideoDiffusionPipeline.from_pretrained(
            self.model_id, 
            torch_dtype=torch.float16, 
            variant="fp16"
        )
        
        # TỐI ƯU HÓA 2 & 3: Chiến thuật Zero-OOM (Out Of Memory) dành cho RTX 3050 4GB
        # CPU Offload: Chia nhỏ model, chỉ load từng Sub-module vào VRAM khi tới lượt tính toán, phần còn lại cất ở RAM
        self.pipe.enable_model_cpu_offload()
        # VAE Slicing: Cắt nhỏ khối lượng decode ảnh thành các lát cắt, tránh nổ VRAM lúc xuất nhiều frames cùng lúc
        self.pipe.enable_vae_slicing()
        
        self.is_loaded = True
        print("Model loaded with Extreme VRAM optimizations applied.")

    def generate_animation(self, image_data: bytes, prompt: str):
        """
        Nhận vào ảnh (bytes) và prompt. Trả về (đường_dẫn_video, danh_sách_PIL_frames).
        """
        if not self.is_loaded:
            self.load_model()
            
        output_path = "output_temp.mp4"
        
        try:
            print("Preparing image for inference...")
            # Chuyển đổi Bytes thành PIL Image
            image = Image.open(BytesIO(image_data))
            image = image.convert("RGB")
            
            # Thay đổi kích thước an toàn cho VRAM (Ví dụ: 512x512)
            image = image.resize((512, 512))

            print(f"Starting inference with prompt: '{prompt}'...")
            # SVD sử dụng image-to-video. Prompt có thể được dùng ở các mô hình Text-to-Video khác.
            # Ta thiết lập cấu hình decode_chunk_size nhỏ để chống tràn VRAM
            frames = self.pipe(
                image, 
                decode_chunk_size=2, # Decode 2 frame một lúc thay vì toàn bộ
                generator=torch.manual_seed(42),
                num_frames=14 # Số lượng frame vừa đủ để tạo hiệu ứng mà VRAM 4GB vẫn gánh được
            ).frames[0]

            print(f"Exporting video to {output_path}...")
            # Xuất chuỗi frame thành Video MP4
            export_to_video(frames, output_path, fps=7)
            
            return output_path, frames
            
        except Exception as e:
            print(f"Inference Error: {e}")
            raise e
        finally:
            # TỐI ƯU HÓA 4: Bắt buộc dọn dẹp rác GPU sau mỗi lần chạy ngầm (Khối lệnh Finally)
            print("Cleaning up GPU Cache & Garbage Collection...")
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
