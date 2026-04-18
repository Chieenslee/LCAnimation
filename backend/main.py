import os
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from services.ai_service import AIGeneratorService
from utils.exporters import ExporterSystem

app = FastAPI(title="LCAnimation AI Backend", version="1.0.0")

# Khởi tạo Service xử lý AI
ai_service = AIGeneratorService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_files(file_paths: list):
    """
    Hàm xóa rác tự động (Background Task). 
    Sẽ được kích hoạt ngầm sau khi FastAPI trả file về cho Frontend xong.
    """
    for path in file_paths:
        if path and os.path.exists(path):
            try:
                os.remove(path)
                print(f"[Cleanup] Deleted temporary file: {path}")
            except Exception as e:
                print(f"[Cleanup Error] Failed to delete {path}: {e}")

@app.post("/api/v1/generate")
async def generate_animation(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    prompt: str = Form(...),
    export_type: str = Form("video") # Loại định dạng xuất: 'video', 'game', 'web'
):
    """
    Endpoint đa năng: Nhận ảnh, sinh Video qua AI, sau đó xuất file ZIP/MP4 dựa theo `export_type`.
    """
    try:
        image_data = await image.read()
        print(f"--- NHẬN YÊU CẦU TỪ FRONTEND ---")
        print(f"Export Type: {export_type}")
        print(f"Prompt: '{prompt}'")
        
        # 1. Sinh AI Inference -> Trả về đường dẫn MP4 và danh sách PIL Images (Frames)
        video_path, frames = ai_service.generate_animation(image_data, prompt)
        
        # Danh sách các file cần xóa sau khi API đóng kết nối
        files_to_cleanup = [video_path] 
        
        # 2. Điều phối theo export_type
        if export_type == "game":
            output_zip = "game_assets.zip"
            ExporterSystem.export_game_assets(frames, output_zip)
            files_to_cleanup.append(output_zip)
            
            # Đăng ký dọn rác
            background_tasks.add_task(cleanup_files, files_to_cleanup)
            return FileResponse(
                path=output_zip,
                media_type="application/zip",
                filename="game_assets.zip"
            )
            
        elif export_type == "web":
            output_zip = "web_assets.zip"
            ExporterSystem.export_web_assets(video_path, output_zip)
            files_to_cleanup.append(output_zip)
            
            # Đăng ký dọn rác
            background_tasks.add_task(cleanup_files, files_to_cleanup)
            return FileResponse(
                path=output_zip,
                media_type="application/zip",
                filename="web_assets.zip"
            )
            
        else: 
            # Mặc định là trả về Video MP4 chuẩn
            # Đăng ký dọn rác
            background_tasks.add_task(cleanup_files, files_to_cleanup)
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
