from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="LCAnimation AI Backend", version="1.0.0")

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
    Endpoint nhận ảnh và prompt từ Frontend.
    Hiện tại đang trả về mock response. 
    Mọi logic AI phức tạp (Diffusers/Torch/FFmpeg) sẽ được gọi tại đây để tận dụng VRAM của máy chủ.
    """
    try:
        # Đọc dữ liệu ảnh gốc
        image_data = await image.read()
        
        print(f"--- NHẬN YÊU CẦU TỪ FRONTEND ---")
        print(f"Prompt: '{prompt}'")
        print(f"Kích thước ảnh: {len(image_data)} bytes")
        
        # TODO: Đưa dữ liệu ảnh vào pipeline AI (Ví dụ: Stable Video Diffusion) tại đây
        
        # Trả về kết quả (Mock)
        return JSONResponse(content={
            "status": "success",
            "message": "AI Processing completed (Mocked).",
            "data": None # Sẽ chứa URL ảnh hoặc video kết quả
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "status": "error",
            "message": str(e)
        })

if __name__ == "__main__":
    import uvicorn
    # Khởi động server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
