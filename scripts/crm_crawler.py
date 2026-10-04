#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
BOT TỰ ĐỘNG CÀO DỮ LIỆU CRM BIWASE & GEMINI VISION AI OCR (PLAYWRIGHT)
==============================================================================
Chức năng chính:
1. Chạy Playwright (headless: False, slow_mo: 300ms) để quan sát thao tác trực tiếp.
2. Tự động đăng nhập vào cổng CRM BIWASE (CRM_BASE_URL, CRM_USERNAME, CRM_PASSWORD).
3. Điều hướng vào menu 'Đăng ký lắp mới' -> Nhập từng 'Mã danh bộ' -> Bấm nút 'Lọc'.
4. Bấm icon 'Cây bút màu xanh' để mở chi tiết hồ sơ đơn khách hàng.
5. Cuộn xuống vùng 'File/Ảnh đăng ký', tải/chụp ảnh tài liệu sổ đỏ.
6. Gọi Google Gemini Vision API (gemini-2.0-flash) bóc tách:
   - Số tờ bản đồ
   - Số thửa đất
   - Diện tích & Địa chỉ thửa đất
   - Bảng liệt kê tọa độ góc ranh VN-2000 (X: 7 số, Y: 6 số)
7. Phân loại tự động:
   - Danh sách 1: Sổ có bảng tọa độ VN-2000 -> Đủ điều kiện khóa mốc Phương án A
   - Danh sách 2: Sổ không in tọa độ -> Chuyển sang Cổng GIS SQHKT tra cứu
8. Gửi kết quả cập nhật thời gian thực về Web Server (http://localhost:3000/api/crawler/live-update)
   và lưu trữ ra tệp co_toa_do.csv, khong_toa_do.csv, crawled_results.json.
==============================================================================
"""

import os
import sys
import json
import time
import base64
import re
import csv
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

# Nạp biến môi trường từ .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

import requests
from playwright.sync_api import sync_playwright, Page, Locator, TimeoutError as PlaywrightTimeoutError

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("crm_crawler.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("CRM_Crawler")

# Cấu hình tham số
CRM_BASE_URL = os.getenv("CRM_BASE_URL", "https://crm.biwase.com.vn")
CRM_USERNAME = os.getenv("CRM_USERNAME", "")
CRM_PASSWORD = os.getenv("CRM_PASSWORD", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LOCAL_SERVER_URL = os.getenv("LOCAL_SERVER_URL", f"http://localhost:{os.getenv('PORT', '3000')}")
HEADLESS_MODE = os.getenv("PLAYWRIGHT_HEADLESS", "false").lower() == "true"
SLOW_MO_MS = int(os.getenv("PLAYWRIGHT_SLOW_MO", "300"))
KINH_TUYEN_TRUC = float(os.getenv("PROJ_KINH_TUYEN_TRUC", "105.75"))

OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_JSON = OUTPUT_DIR / "crawled_results.json"
OUTPUT_CO_TOA_DO = OUTPUT_DIR / "co_toa_do.csv"
OUTPUT_KHONG_TOA_DO = OUTPUT_DIR / "khong_toa_do.csv"

CSV_HEADERS = [
    "ma_danh_bo", "ten_khach_hang", "so_thua", "so_to", "dien_tich_m2",
    "dia_chi_thua_dat", "co_bang_toa_do", "so_dinh_ranh", "danh_sach", "ghi_chu"
]


def call_gemini_vision_ocr(image_base64: str, mime_type: str = "image/jpeg") -> Dict[str, Any]:
    """
    Gọi Gemini Vision API (gemini-2.0-flash) để bóc tách thông tin sổ đỏ.
    Nếu có cài google-genai SDK thì dùng SDK, hoặc gọi trực tiếp Google REST API / Local API.
    """
    prompt = """Bạn là chuyên gia trắc địa & thẩm định hồ sơ kỹ thuật của Công ty Cấp nước BIWASE.
Hãy phân tích hình ảnh đính kèm (Giấy chứng nhận QSDĐ / Sổ đỏ / Sơ đồ bản vẽ thửa đất):
1. Nhận diện chính xác và trung thực:
   - "so_to": Số tờ bản đồ (VD: "16", "59", "42",...). Để null nếu không có.
   - "so_thua": Số thửa đất (VD: "3188", "3036", "158",...). Để null nếu không có.
   - "dien_tich_m2": Diện tích đất (số thập phân m2). Để null nếu không có.
   - "dia_chi_thua_dat": Địa chỉ thửa đất ghi trên sổ. Để null nếu không có.
2. Kiểm tra xem có "BẢNG LIỆT KÊ TỌA ĐỘ GÓC RANH VN-2000" (X, Y) hay không?
   - "co_bang_toa_do": true nếu có bảng tọa độ; false nếu chỉ có sơ đồ kích thước hoặc không in tọa độ.
3. Nếu "co_bang_toa_do" == true:
   - "danh_sach_toa_do": mảng danh sách điểm [{ "diem_moc": "1", "toa_do_x": 1227142.35, "toa_do_y": 591865.22 }, ...]
     Giữ nguyên 7 chữ số cột X và 6 chữ số cột Y, không làm tròn số.
4. Trả về định dạng JSON thuần túy:
{
  "so_to": "16",
  "so_thua": "3188",
  "dien_tich_m2": 150.0,
  "dia_chi_thua_dat": "Phường Chánh Phú Hòa, Thành phố Bến Cát",
  "co_bang_toa_do": false,
  "danh_sach_toa_do": []
}"""

    # Cách 1: Thử dùng google-genai SDK mới
    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=GEMINI_API_KEY)
            
            clean_b64 = re.sub(r"^data:image/\w+;base64,", "", image_base64)
            img_bytes = base64.b64decode(clean_b64)
            
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    prompt,
                    types.Part.from_bytes(data=img_bytes, mime_type=mime_type)
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            parsed = json.loads(response.text)
            return parsed
        except Exception as e:
            logger.warning(f"Gọi google-genai SDK không thành công, thử cách 2: {str(e)}")

    # Cách 2: Gọi endpoint backend server local nếu đang chạy
    try:
        res = requests.post(
            f"{LOCAL_SERVER_URL}/api/gemini/analyze-deed",
            json={"imageBase64": image_base64, "mimeType": mime_type},
            timeout=25
        )
        if res.status_code == 200:
            return res.json()
    except Exception as ex:
        logger.warning(f"Không thể kết nối local server Gemini API: {str(ex)}")

    # Trả về kết quả mặc định an toàn nếu không gọi được API
    return {
        "so_to": None,
        "so_thua": None,
        "dien_tich_m2": None,
        "dia_chi_thua_dat": "Chưa đọc được qua OCR",
        "co_bang_toa_do": False,
        "danh_sach_toa_do": []
    }


def send_live_update_to_server(record: Dict[str, Any]):
    """Gửi cập nhật thời gian thực về Web Server để giao diện tự refresh"""
    try:
        requests.post(
            f"{LOCAL_SERVER_URL}/api/crawler/live-update",
            json=record,
            timeout=3
        )
    except Exception:
        pass


class PlaywrightCrmCrawler:
    def __init__(self, page: Page):
        self.page = page

    def highlight(self, locator: Locator):
        """Làm nổi bật phần tử màu vàng/cam để quan sát rõ thao tác"""
        try:
            locator.evaluate("""(el) => {
                if (el) {
                    el.style.outline = '3px solid #0284c7';
                    el.style.backgroundColor = '#e0f2fe';
                    setTimeout(() => {
                        el.style.outline = '';
                        el.style.backgroundColor = '';
                    }, 500);
                }
            }""")
        except Exception:
            pass

    def wait_for_spinners(self, timeout_ms: int = 10000):
        """Chờ các loader ẩn"""
        for sel in [".loading", ".spinner", ".k-loading-image", ".k-loading-mask", ".modal-backdrop"]:
            try:
                el = self.page.locator(sel)
                if el.count() > 0 and el.first.is_visible():
                    el.first.wait_for(state="hidden", timeout=timeout_ms)
            except Exception:
                pass

    def login(self) -> bool:
        """Đăng nhập vào CRM BIWASE"""
        logger.info(f"[ĐĂNG NHẬP] Đang mở trình duyệt đến: {CRM_BASE_URL}")
        try:
            self.page.goto(CRM_BASE_URL, timeout=45000, wait_until="domcontentloaded")
            self.wait_for_spinners(5000)

            # Nếu đã đăng nhập sẵn
            if "dashboard" in self.page.url or "order" in self.page.url:
                logger.info("✓ [ĐĂNG NHẬP] Đã có phiên đăng nhập sẵn.")
                return True

            # Tìm ô đăng nhập
            user_input = self.page.wait_for_selector(
                "input[name='username'], input[type='text'], input#username, input#txtUser",
                timeout=15000, state="visible"
            )
            pass_input = self.page.wait_for_selector(
                "input[name='password'], input[type='password'], input#password, input#txtPass",
                timeout=15000, state="visible"
            )

            if user_input and pass_input:
                self.highlight(self.page.locator("input[name='username'], input#username").first)
                user_input.fill(CRM_USERNAME)
                self.page.wait_for_timeout(200)

                self.highlight(self.page.locator("input[name='password'], input#password").first)
                pass_input.fill(CRM_PASSWORD)
                self.page.wait_for_timeout(200)

                btn = self.page.locator("button[type='submit'], input[type='submit'], button:has-text('Đăng nhập')").first
                self.highlight(btn)
                btn.click()

                self.wait_for_spinners(15000)
                self.page.wait_for_load_state("networkidle", timeout=20000)
                logger.info("✓ [ĐĂNG NHẬP] Đăng nhập CRM BIWASE thành công!")
                return True
        except Exception as e:
            logger.error(f"❌ [ĐĂNG NHẬP] Thất bại: {str(e)}")
            return False
        return False

    def navigate_to_registration(self) -> bool:
        """Điều hướng vào 'Đăng ký lắp mới'"""
        logger.info("[ĐIỀU HƯỚNG] Vào menu 'Đăng ký lắp mới'...")
        try:
            self.wait_for_spinners(5000)
            menu = self.page.wait_for_selector(
                "text='Đăng ký lắp mới', a:has-text('Đăng ký lắp mới')",
                timeout=15000, state="visible"
            )
            if menu:
                self.highlight(self.page.locator("text='Đăng ký lắp mới'").first)
                menu.click()
                self.page.wait_for_timeout(400)

                sub = self.page.locator("ul a:has-text('Đăng ký lắp mới'), .dropdown-menu a:has-text('Đăng ký lắp mới')").first
                if sub.is_visible():
                    sub.click()

                self.wait_for_spinners(10000)
                self.page.wait_for_load_state("domcontentloaded", timeout=20000)
                logger.info("✓ [ĐIỀU HƯỚNG] Đã mở danh sách 'Đăng ký lắp mới'.")
                return True
        except Exception as e:
            logger.error(f"❌ [ĐIỀU HƯỚNG] Lỗi: {str(e)}")
            return False
        return False

    def filter_and_open_pencil(self, ma_danh_bo: str) -> bool:
        """Nhập mã danh bộ, bấm Lọc và bấm icon Cây bút xanh"""
        logger.info(f"-> [LỌC] Nhập Mã Danh Bộ [{ma_danh_bo}], bấm nút 'Lọc'...")
        try:
            self.wait_for_spinners(5000)
            inp = self.page.wait_for_selector(
                "input[placeholder*='danh bộ'], input[name*='danh_bo'], input#txtMaDanhBo, input#maDanhBo",
                timeout=10000, state="visible"
            )
            if not inp:
                return False

            self.highlight(self.page.locator("input[placeholder*='danh bộ'], input#txtMaDanhBo").first)
            inp.fill("")
            inp.fill(ma_danh_bo.strip())
            self.page.wait_for_timeout(300)

            btn_filter = self.page.locator("button:has-text('Lọc'), input[value='Lọc'], .btn-filter").first
            self.highlight(btn_filter)
            btn_filter.click()

            # Chờ bảng tải xong thật
            self.wait_for_spinners(12000)
            self.page.wait_for_timeout(800)

            # Kiểm tra dòng dữ liệu
            rows = self.page.locator("table tbody tr")
            if rows.count() == 0 or "không có dữ liệu" in rows.first.inner_text().lower():
                logger.warning(f"⚠️ Mã [{ma_danh_bo}]: Không tìm thấy hồ sơ trên CRM.")
                return False

            # Bấm Cây bút màu xanh ở dòng đầu tiên
            pencil = self.page.locator(
                "table tbody tr:first-child td:last-child a:has(.fa-pencil, .bi-pencil), "
                "table tbody tr:first-child td:last-child a[title*='Sửa'], "
                "table tbody tr:first-child td:last-child a"
            ).first

            self.highlight(pencil)
            pencil.click()

            self.wait_for_spinners(15000)
            self.page.wait_for_load_state("domcontentloaded", timeout=20000)
            logger.info(f"-> [CHI TIẾT] Đã click Cây bút xanh, mở hồ sơ mã [{ma_danh_bo}].")
            return True
        except Exception as e:
            logger.error(f"❌ Lỗi lọc và mở chi tiết [{ma_danh_bo}]: {str(e)}")
            return False

    def extract_and_analyze_deed_photos(self, ma_danh_bo: str) -> Dict[str, Any]:
        """Cuộn xuống File ảnh đăng ký, tải/chụp ảnh sổ đỏ và gọi Gemini Vision OCR"""
        logger.info("-> [FILE ẢNH] Cuộn xuống 'File/Ảnh đăng ký'...")
        result = {
            "ma_danh_bo": ma_danh_bo,
            "ten_khach_hang": "",
            "so_thua": "",
            "so_to": "",
            "dien_tich_m2": None,
            "dia_chi_thua_dat": "",
            "co_bang_toa_do": False,
            "danh_sach_toa_do": [],
            "so_dinh_ranh": 0,
            "danh_sach": 2,
            "ghi_chu": "",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        try:
            # Lấy tên khách hàng
            name_el = self.page.locator("input#TenKhachHang, input[name='CustomerName'], .customer-name, h4").first
            if name_el.is_visible():
                result["ten_khach_hang"] = name_el.input_value() if name_el.tag_name == "input" else name_el.inner_text().strip()

            # Cuộn xuống khu vực File ảnh
            file_sec = self.page.locator("text='File/Ảnh đăng ký', text='Tài liệu đính kèm', #divFileDinhKem, .attachment-section").first
            if file_sec.is_visible():
                self.highlight(file_sec)
                file_sec.scroll_into_view_if_needed()
                self.page.wait_for_timeout(500)

            # Danh sách thumbnails ảnh
            thumbs = self.page.locator(".attachment-item img, .file-preview img, a[href*='.jpg'], a[href*='.png'], .thumbnail img")
            count = thumbs.count()
            logger.info(f"   Tìm thấy {count} ảnh đính kèm trong hồ sơ.")

            if count == 0:
                result["ghi_chu"] = "Hồ sơ không có ảnh đính kèm (giấy tay/chưa có sổ)"
                return result

            # Ưu tiên tìm ảnh sổ đỏ (bìa hoặc trang 3 sơ đồ tọa độ)
            for i in range(count):
                t = thumbs.nth(i)
                self.highlight(t)
                title = (t.get_attribute("title") or t.get_attribute("alt") or "").lower()
                
                # Bỏ qua CCCD hoặc ảnh đồng hồ
                if any(k in title for k in ["cccd", "căn cước", "cmnd", "dong ho", "đồng hồ", "hoa don", "hóa đơn"]):
                    continue

                # Chụp screenshot hoặc lấy ảnh
                screenshot_bytes = t.screenshot()
                img_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")

                # Gọi Gemini Vision OCR
                logger.info(f"   Đang gửi ảnh #{i+1} qua Gemini Vision AI OCR...")
                ocr_data = call_gemini_vision_ocr(img_b64)

                if ocr_data.get("so_thua"):
                    result["so_thua"] = str(ocr_data["so_thua"])
                if ocr_data.get("so_to"):
                    result["so_to"] = str(ocr_data["so_to"])
                if ocr_data.get("dien_tich_m2"):
                    result["dien_tich_m2"] = ocr_data["dien_tich_m2"]
                if ocr_data.get("dia_chi_thua_dat"):
                    result["dia_chi_thua_dat"] = ocr_data["dia_chi_thua_dat"]

                if ocr_data.get("co_bang_toa_do") and len(ocr_data.get("danh_sach_toa_do", [])) >= 3:
                    result["co_bang_toa_do"] = True
                    result["danh_sach_toa_do"] = ocr_data["danh_sach_toa_do"]
                    result["so_dinh_ranh"] = len(ocr_data["danh_sach_toa_do"])
                    result["danh_sach"] = 1
                    result["ghi_chu"] = "Sổ đất Trang 3 CÓ BẢNG TỌA ĐỘ VN-2000 -> ĐỦ ĐIỀU KIỆN KHÓA MỐC PHƯƠNG ÁN A!"
                    break

            if not result["co_bang_toa_do"]:
                result["danh_sach"] = 2
                result["ghi_chu"] = "Sổ đất KHÔNG CÓ BẢNG TỌA ĐỘ VN-2000 -> Chuyển sang Danh sách 2 để tra cứu Cổng GIS SQHKT."

        except Exception as e:
            logger.error(f"❌ Lỗi đọc ảnh sổ: {str(e)}")
            result["ghi_chu"] = f"Lỗi đọc ảnh: {str(e)}"

        return result


def append_to_csv(record: Dict[str, Any]):
    """Ghi trực tiếp ra file CSV"""
    target = OUTPUT_CO_TOA_DO if record["danh_sach"] == 1 else OUTPUT_KHONG_TOA_DO
    exists = target.exists()
    with open(target, "a", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS, extrasaction="ignore")
        if not exists:
            writer.writeheader()
        writer.writerow(record)


def run_crawler(danh_bo_list: List[str]):
    """Điều phối toàn bộ quy trình cào dữ liệu"""
    logger.info(f"============================================================")
    logger.info(f"KHỞI ĐỘNG PLAYWRIGHT BOT CÀO CRM VỚI {len(danh_bo_list)} MÃ DANH BỘ")
    logger.info(f"Chế độ trình duyệt: {'ẨN (Headless)' if HEADLESS_MODE else 'HIỆN GIAO DIỆN THẬT (headless=False, slow_mo=300ms)'}")
    logger.info(f"Cổng Web Server Local: {LOCAL_SERVER_URL}")
    logger.info(f"============================================================\n")

    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=HEADLESS_MODE,
            slow_mo=SLOW_MO_MS,
            args=["--start-maximized", "--disable-notifications"]
        )
        context = browser.new_context(viewport=None, no_viewport=True)
        page = context.new_page()
        crawler = PlaywrightCrmCrawler(page)

        if not crawler.login():
            logger.error("Dừng bot do không đăng nhập được CRM.")
            browser.close()
            return

        if not crawler.navigate_to_registration():
            logger.error("Dừng bot do không mở được 'Đăng ký lắp mới'.")
            browser.close()
            return

        for idx, db in enumerate(danh_bo_list):
            db = str(db).strip()
            logger.info(f"\n[KHÁCH {idx + 1}/{len(danh_bo_list)}] Xử lý Mã Danh Bộ: {db}")

            found = crawler.filter_and_open_pencil(db)
            if not found:
                record = {
                    "ma_danh_bo": db,
                    "ten_khach_hang": "Không tìm thấy",
                    "so_thua": "",
                    "so_to": "",
                    "dien_tich_m2": None,
                    "dia_chi_thua_dat": "",
                    "co_bang_toa_do": False,
                    "danh_sach_toa_do": [],
                    "so_dinh_ranh": 0,
                    "danh_sach": 2,
                    "ghi_chu": "Tra cứu CRM không ra kết quả.",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            else:
                record = crawler.extract_and_analyze_deed_photos(db)
                crawler.navigate_to_registration()

            append_to_csv(record)
            send_live_update_to_server(record)
            all_results.append(record)

            with open(OUTPUT_JSON, "w", encoding="utf-8") as jf:
                json.dump(all_results, jf, ensure_ascii=False, indent=2)

        browser.close()
        logger.info(f"\n✓ [HOÀN TẤT] Đã cào và phân tích xong {len(danh_bo_list)} hồ sơ.")
        logger.info(f"✓ Kết quả Danh sách 1: {OUTPUT_CO_TOA_DO}")
        logger.info(f"✓ Kết quả Danh sách 2: {OUTPUT_KHONG_TOA_DO}")
        logger.info(f"✓ Tệp JSON tổng hợp: {OUTPUT_JSON}")


if __name__ == "__main__":
    default_danh_bo = [
        "8415031782",  # NGUYỄN HỮU TÚ (Thửa 3036/Tờ 59 Hòa Lợi)
        "8412070692",  # TRẦN ĐỨC HỢP (Thửa 3188/Tờ 16 Chánh Phú Hòa)
        "8412070695",  # VŨ HÙNG CƯỜNG (Thửa 89/Tờ 35 Tân Định - Có tọa độ)
        "8413011414",  # CÔNG TY THIÊN PHÚ
    ]

    if len(sys.argv) > 1:
        if os.path.exists(sys.argv[1]):
            with open(sys.argv[1], "r", encoding="utf-8") as f:
                danh_bo_list = [l.strip() for l in f if l.strip()]
        else:
            danh_bo_list = [x.strip() for x in sys.argv[1].split(",") if x.strip()]
        run_crawler(danh_bo_list)
    else:
        run_crawler(default_danh_bo)
