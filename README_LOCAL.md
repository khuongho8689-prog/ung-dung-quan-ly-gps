# 🌊 BIWASE CRM GEO-PLANNER — HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL (AI LOCAL AUTOMATION)

Tài liệu này hướng dẫn chi tiết từng bước để bạn thiết lập và chạy toàn bộ hệ thống **Water Meter GeoPlanner** cùng **Playwright CRM Crawler & Gemini Vision OCR** trực tiếp 100% trên máy tính cá nhân (Windows, macOS hoặc Linux).

---

## 📋 Yêu cầu phần mềm trước khi cài đặt:
1. **Node.js**: Phiên bản **v18.x** trở lên (khuyên dùng **v20.x** hoặc **v22.x LTS**).
   - Tải tại: [https://nodejs.org](https://nodejs.org)
2. **Python**: Phiên bản **3.10** trở lên (3.10, 3.11, hoặc 3.12).
   - Tải tại: [https://www.python.org/downloads](https://www.python.org/downloads)
   - *Lưu ý*: Khi cài trên Windows, nhớ tích chọn ô **"Add Python to PATH"**.
3. **Google Chrome** hoặc **Chromium** (Playwright sẽ tự động tải về khi chạy lệnh).
4. **Git** (nếu dùng để pull mã nguồn từ GitHub):
   - Tải tại: [https://git-scm.com](https://git-scm.com)

---

## 🚀 BƯỚC 1: Tải mã nguồn về máy tính

### Cách 1: Tải bằng Git (Khuyên dùng)
Mở cửa sổ Terminal (hoặc PowerShell/Command Prompt) và chạy:
```bash
git clone <URL_REPO_GITHUB_CUA_BAN>
cd water-meter-geoplanner
```

### Cách 2: Tải file nén ZIP
Giải nén tệp `.zip` đã tải về từ AI Studio hoặc GitHub, sau đó mở Terminal tại thư mục gốc của dự án.

---

## 📦 BƯỚC 2: Cài đặt các thư viện cần thiết

### 2.1. Cài đặt thư viện Web App (Frontend + Backend Server)
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
npm install
```
*(Lệnh này sẽ cài đặt React, Vite, Express, TailwindCSS, Proj4, XLSX, Lucide Icons và Google GenAI SDK)*.

### 2.2. Cài đặt thư viện Python cho Bot cào dữ liệu Playwright
Chạy lệnh cài đặt các gói Python:
```bash
pip install -r scripts/requirements.txt
```
Sau đó, tải trình duyệt Chromium dành riêng cho Playwright:
```bash
playwright install chromium
```

---

## ⚙️ BƯỚC 3: Tạo và cấu hình file môi trường `.env`

1. Trong thư mục gốc của dự án, sao chép file `.env.example` thành file `.env`:
   - Trên **Windows (PowerShell)**:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Trên **macOS / Linux**:
     ```bash
     cp .env.example .env
     ```
2. Mở file `.env` bằng Notepad hoặc VS Code và điền các thông số:
```env
# 1. Khóa Google Gemini API (Dùng cho Gemini 2.0 Flash phân tích ảnh Sổ Đỏ / CCCD)
# Lấy miễn phí tại: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere..."

# 2. Cổng đăng nhập CRM BIWASE (Dành cho Playwright Bot đăng nhập thật)
CRM_BASE_URL="https://crm.biwase.com.vn"
CRM_USERNAME="KhuongHV"
CRM_PASSWORD="YourPasswordHere"

# 3. Kinh tuyến trục trắc địa (VN-2000 Proj4)
# Mặc định Bình Dương / TP. Bến Cát: 105.75 (tức 105°45')
PROJ_KINH_TUYEN_TRUC=105.75

# 4. Cổng chạy máy chủ Web Local
PORT=3000

# 5. Cấu hình hiển thị trình duyệt Playwright Bot
PLAYWRIGHT_HEADLESS=false
PLAYWRIGHT_SLOW_MO=300
```

---

## 🌐 BƯỚC 4: Khởi chạy Web App trên máy tính

Chạy lệnh:
```bash
npm run dev
```

Sau khi chạy lệnh, màn hình hiển thị:
```text
Backend Automation Server running on http://localhost:3000
VITE v6.x.x ready in ... ms
➜  Local:   http://localhost:3000/
```

Mở trình duyệt Google Chrome hoặc Cốc Cốc và truy cập:
👉 **`http://localhost:3000`**

Giao diện sẽ hiển thị đầy đủ 100% tính năng giống hệt như trên AI Studio:
- **DANH SÁCH TỔNG HỢP**: Bảng phân loại Danh sách 1, Danh sách 2, Danh sách 3, Danh sách 4.
- **SƠ ĐỒ CAD & SAI SỐ**: Kiểm tra góc ranh, chuyển đổi tọa độ VN-2000 sang WGS-84, tính bán kính $d \le 10\text{m}$.
- **XUẤT MÁY RTK**: Xuất tệp TXT/CSV/KML nạp thẳng vào sổ tay RTK (Hi-Target, CHCNAV, Trimble,...).

---

## 🤖 BƯỚC 5: Kích hoạt Bot Playwright cào dữ liệu CRM thật

Có 2 cách kích hoạt bot cào dữ liệu và phân tích ảnh sổ đỏ qua Gemini Vision:

### Cách 1: Kích hoạt 1-Click trực tiếp từ giao diện Web UI
1. Trên thanh Header đầu trang web `http://localhost:3000`, bấm vào nút màu xanh ngọc:
   👉 **`🤖 Chạy Playwright CRM Bot`**
2. Cửa sổ trình duyệt Chromium sẽ tự động mở lên (`headless: false`), tự động:
   - Đăng nhập tài khoản CRM BIWASE.
   - Chuyển vào menu **"Đăng ký lắp mới"**.
   - Lọc tuần tự từng Mã Danh Bộ.
   - Bấm vào icon **Cây bút màu xanh** để mở chi tiết hồ sơ.
   - Cuộn xuống **"File/Ảnh đăng ký"**, chụp ảnh sổ đỏ gửi sang **Gemini 2.0 Flash Vision AI**.
   - Bóc tách Số tờ, Số thửa, Bảng tọa độ VN-2000 và phân loại vào Danh sách 1 hoặc Danh sách 2.
   - Kết quả được truyền trực tiếp về giao diện web theo thời gian thực!

### Cách 2: Chạy trực tiếp từ dòng lệnh Terminal
Bạn cũng có thể chạy bot bất cứ lúc nào qua script Python:
```bash
# Chạy với danh sách mã danh bộ mặc định:
python scripts/crm_crawler.py

# Hoặc truyền danh sách mã danh bộ tùy ý phân tách bởi dấu phẩy:
python scripts/crm_crawler.py 8415031782,8412070692,8412070695
```

Kết quả cào được sẽ tự động lưu vào thư mục `output/`:
- `output/co_toa_do.csv`: Danh sách 1 (Các hộ có tọa độ VN-2000).
- `output/khong_toa_do.csv`: Danh sách 2 (Các hộ cần tra Cổng GIS SQHKT).
- `output/crawled_results.json`: Tệp JSON tổng hợp toàn diện.

---

## 🔄 BƯỚC 6: Đồng bộ mã nguồn mới nhất từ GitHub

Khi có bản cập nhật mới trên kho mã nguồn GitHub:
- Bấm vào nút màu xanh tím trên thanh Header:
  👉 **`🔄 Đồng bộ mã nguồn mới nhất`**
- Hệ thống sẽ gọi lệnh `git pull origin main` ở phía backend và tự động tải lại trang sau 2 giây để áp dụng các tính năng mới nhất mà bạn không cần mở terminal thao tác thủ công.

---

## 🛠️ Xử lý sự cố thường gặp (Troubleshooting):
1. **Lỗi `Vite: __dirname is not defined`**:
   - Đã được xử lý triệt để trong `vite.config.ts` bằng `import.meta.dirname`.
2. **Lỗi `playwright: executable does not exist`**:
   - Chạy lệnh `playwright install chromium` trong terminal để tải trình duyệt.
3. **Lỗi `Gemini API Key missing`**:
   - Kiểm tra xem file `.env` đã có dòng `GEMINI_API_KEY="..."` hay chưa và đảm bảo khóa API còn hạn sử dụng.
4. **Cổng 3000 đã bị chiếm dụng (Port 3000 in use)**:
   - Sửa dòng `PORT=3000` thành `PORT=3001` trong file `.env` và chạy lại `npm run dev`.

---
*Chúc bạn vận hành hệ thống tự động hóa trắc địa BIWASE thành công và hiệu quả!*
