# Script Tự Động Hóa CRM BIWASE Tra Cứu & Phân Loại Hồ Sơ

Bộ script tự động hóa thực hiện đầy đủ 5 bước theo đúng yêu cầu nghiệp vụ của BIWASE và Sở TN&MT:

## 1. Quy Trình 5 Bước Thực Hiện:
1. **Đăng nhập**: Truy cập `CRM_URL`, đăng nhập bằng `CRM_USERNAME` và `CRM_PASSWORD`.
2. **Điều hướng**: Click menu **"Đăng ký lắp mới"** -> Chọn mục **"Đăng ký lắp mới"**, chờ DOM ổn định.
3. **Tra cứu hồ sơ**: Nhập **"Mã danh bộ"** vào ô tìm kiếm -> Click nút **"Lọc"**.
4. **Mở chi tiết**: Tại dòng kết quả, tìm và click vào icon **"Cây bút màu xanh"** ở cột cuối cùng.
5. **Xử lý tệp đính kèm & Phân loại**:
   - Cuộn xuống khu vực **"File/ ảnh đăng ký"**.
   - Kiểm tra ảnh bìa sổ đỏ (ghi nhận số thửa, số tờ, phường/xã nghiêm ngặt).
   - Đánh giá bản thống kê tọa độ:
     * **Danh sách 1 (`co_toa_do.csv`)**: Sổ có bảng thống kê tọa độ VN-2000 (khóa mốc RTK Phương án A).
     * **Danh sách 2 (`khong_toa_do.csv`)**: Sổ không in tọa độ -> chuyển qua Cổng GIS Xây dựng để tra cứu.

## 2. Hướng Dẫn Cài Đặt & Chạy:

### Cách 1: Sử Dụng Playwright (Khuyến nghị - Nhanh & Ổn Định Nhất):
```bash
pip install -r scripts/requirements.txt
playwright install chromium

# Chạy với danh sách mẫu:
python scripts/crm_automation_playwright.py

# Hoặc truyền file chứa danh sách Mã Danh Bộ:
python scripts/crm_automation_playwright.py danh_bo_list.txt
```

### Cách 2: Sử Dụng Selenium 4:
```bash
python scripts/crm_automation_selenium.py
```

## 3. Biến Môi Trường (Tùy Chọn):
- `CRM_URL`: URL hệ thống CRM (Mặc định: `https://crm.biwase.com.vn`)
- `CRM_USERNAME`: Tên đăng nhập (Mặc định: `KhuongHV`)
- `CRM_PASSWORD`: Mật khẩu đăng nhập
- `HEADLESS`: `true` nếu muốn chạy ngầm không hiện cửa sổ trình duyệt (Mặc định: `false`)

## 4. Tệp Đầu Ra:
- `co_toa_do.csv`: Danh sách hồ sơ đã có bảng tọa độ VN-2000 tại Trang 3 sổ đất (Danh sách 1).
- `khong_toa_do.csv`: Danh sách hồ sơ không có bảng tọa độ trên sổ -> nạp tiếp vào Cổng GIS (Danh sách 2).
- `crm_automation.log`: Nhật ký chi tiết từng thao tác click, thời gian chờ và kết quả tra cứu.
