import os
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from services.ai_service import AIGeneratorService

app = FastAPI(title="LCAnimation AI Backend", version="1.0.0")

# Khởi tạo Service xử lý AI
ai_service = AIGeneratorService()

# Cấu hình CORS để cho phép Frontend Vite gọi API (Mặc định Vite chạy port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong Production nên thay bằng URL frontend thực tế
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/generate")
async def generate_animation(
    image: UploadFile = File(...),
    prompt: str = Form(...)
):
    """
    Endpoint nhận ảnh và prompt từ Frontend, xử lý bằng diffusers/torch, và trả về Video MP4.
    """
    try:
        # Đọc dữ liệu ảnh gốc
        image_data = await image.read()
        
        print(f"--- NHẬN YÊU CẦU TỪ FRONTEND ---")
        print(f"Prompt: '{prompt}'")
        print(f"Kích thước ảnh: {len(image_data)} bytes")
        
        # Đưa vào AI Service chạy Inference nặng
        video_path = ai_service.generate_animation(image_data, prompt)
        
        # Kiểm tra nếu file tồn tại
        if not os.path.exists(video_path):
            raise Exception("Video generation failed. Output file not found.")

        print(f"Returning generated video: {video_path}")
        # Trả trực tiếp file MP4 dạng Stream (FileResponse) về cho Frontend
        return FileResponse(
            path=video_path,
            media_type="video/mp4",
            filename="lcanimation_result.mp4"
        )
        
    except Exception as e:
        print(f"Error in API generate: {e}")
        return JSONResponse(status_code=500, content={
            "status": "error",
            "message": str(e)
        })

if __name__ == "__main__":
    import uvicorn
    # Khởi động server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
