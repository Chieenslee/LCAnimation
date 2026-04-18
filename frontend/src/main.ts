// Frontend/src/main.ts - Kiến trúc Thin Client (REST API)
document.addEventListener('DOMContentLoaded', () => {
    // Khai báo các phần tử DOM
    const uploadInput = document.getElementById('image-upload') as HTMLInputElement | null;
    const promptInput = document.getElementById('prompt-input') as HTMLInputElement | null;
    const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement | null;
    
    const progressBarContainer = document.getElementById('progress-container') as HTMLDivElement | null;
    const progressStatus = document.getElementById('status-text') as HTMLSpanElement | null;
    const progressPercentage = document.getElementById('progress-percentage') as HTMLSpanElement | null;
    const progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement | null;

    const btnExportWeb = document.getElementById('btn-export-web') as HTMLButtonElement | null;
    const btnExportGame = document.getElementById('btn-export-game') as HTMLButtonElement | null;
    const btnExportVideo = document.getElementById('btn-export-video') as HTMLButtonElement | null;

    if (!uploadInput || !promptInput || !generateBtn || !progressBarContainer || !progressStatus || !progressPercentage || !progressBarFill || !btnExportWeb || !btnExportGame || !btnExportVideo) {
        console.warn("Lỗi: Các phần tử DOM không đầy đủ.");
        return;
    }

    let currentSelectedFile: File | null = null;
    const backendUrl = "http://localhost:8000/api/v1/generate";

    // Khởi tạo giao diện
    progressBarContainer.style.display = 'none';
    generateBtn.style.display = 'none'; // Ẩn nút Generate cũ vì giờ chúng ta xuất trực tiếp

    // Sự kiện chọn ảnh
    uploadInput.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            currentSelectedFile = target.files[0];
            // Mở khóa luôn 3 nút xuất file
            btnExportWeb.disabled = false;
            btnExportGame.disabled = false;
            btnExportVideo.disabled = false;
        }
    });

    const updateProgressUI = (status: string, show: boolean, isError: boolean = false) => {
        progressBarContainer.style.display = show ? 'block' : 'none';
        progressStatus.innerText = status;
        
        // Mô phỏng thanh chạy vô tận với CSS (Thay vì 0-100% như WebGPU cũ)
        progressBarFill.style.width = '100%'; 
        progressBarFill.style.backgroundColor = isError ? '#ef4444' : '#3b82f6'; 
        progressPercentage.innerText = isError ? "Lỗi!" : "Đang xử lý...";
    }

    // Hàm gọi API xử lý đa năng
    const handleExport = async (exportType: string, buttonElement: HTMLButtonElement) => {
        if (!currentSelectedFile) {
            alert("Vui lòng tải lên một hình ảnh trước!");
            return;
        }

        const promptText = promptInput.value.trim() || "Make it beautiful";

        // Khóa tất cả các nút để ngăn bấm đúp
        btnExportWeb.disabled = true;
        btnExportGame.disabled = true;
        btnExportVideo.disabled = true;
        
        const originalText = buttonElement.innerText;
        buttonElement.innerText = "⏳ Đang gửi...";
        
        updateProgressUI("Đang gửi dữ liệu đến AI Server...", true);

        try {
            // Đóng gói dữ liệu chuẩn multipart/form-data
            const formData = new FormData();
            formData.append('image', currentSelectedFile);
            formData.append('prompt', promptText);
            formData.append('export_type', exportType);

            updateProgressUI("AI Server đang xử lý cường độ cao (Có thể mất vài chục giây)...", true);

            // Giao tiếp qua chuẩn REST API với Backend
            const response = await fetch(backendUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                // Đọc lỗi trả về nếu có
                let errorMsg = "Lỗi không xác định từ Backend";
                try {
                    const errData = await response.json();
                    if (errData.message) errorMsg = errData.message;
                } catch (e) {}
                throw new Error(`HTTP ${response.status}: ${errorMsg}`);
            }

            // Đón kết quả nhị phân (Binary) và chuyển thành Blob
            updateProgressUI("Đang tải file kết quả về máy...", true);
            const blob = await response.blob();

            // --- BẮT ĐẦU XỬ LÝ DOWNLOAD ---
            const downloadUrl = window.URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = downloadUrl;
            
            // Định danh tên file linh hoạt theo nút bấm
            let filename = "LCAnimation_Result";
            if (exportType === 'video') filename += ".mp4";
            else if (exportType === 'game') filename += "_GameAssets.zip";
            else if (exportType === 'web') filename += "_WebAssets.zip";

            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            
            // Ép trình duyệt tự động nhấp để tải file
            downloadLink.click();
            
            // DỌN DẸP RÁC: Xóa đường link để chống rò rỉ RAM trên Frontend
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(downloadLink);

            updateProgressUI("Tải xuống thành công!", true);
            setTimeout(() => { updateProgressUI("", false); }, 3000);
            
        } catch (error) {
            console.error("Fetch API Error:", error);
            updateProgressUI(`Lỗi: ${(error as Error).message}`, true, true);
            alert("Không thể kết nối đến Máy chủ AI. Hãy đảm bảo Backend FastAPI đã chạy ở cổng 8000.");
        } finally {
            // Trả lại trạng thái các nút
            buttonElement.innerText = originalText;
            btnExportWeb.disabled = false;
            btnExportGame.disabled = false;
            btnExportVideo.disabled = false;
        }
    };

    // Gắn luồng kiện click vào nút
    btnExportWeb.addEventListener('click', () => handleExport('web', btnExportWeb));
    btnExportGame.addEventListener('click', () => handleExport('game', btnExportGame));
    btnExportVideo.addEventListener('click', () => handleExport('video', btnExportVideo));
});
