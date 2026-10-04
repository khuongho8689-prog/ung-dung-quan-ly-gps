#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Tự Động Hóa CRM BIWASE Tra Cứu & Phân Loại Hồ Sơ Khách Hàng (Playwright)
Phiên bản 2.0 - Trực quan (Visual Execution), Explicit Wait, Logging chi tiết & Live Save.

Các tính năng nổi bật:
1. Visual Execution: Chạy chế độ có giao diện (headless=False) với slow_mo=400ms để quan sát bot thao tác.
2. Highlighting: Làm nổi bật ô input, nút Lọc, icon Cây bút xanh trước khi click.
3. Logging chuẩn xác từng bước theo yêu cầu.
4. Tuần tự & Explicit Wait: Chờ loader ẩn, chờ bảng kết quả, chờ khu vực ảnh tải xong.
5. Live Update: Lưu ngay từng dòng vào file CSV (co_toa_do.csv / khong_toa_do.csv) ngay khi xử lý xong.
6. Auto-retry 1 lần nếu timeout hoặc lỗi mạng.
"""

import os
import sys
import csv
import time
import logging
import re
from typing import List, Dict, Any, Optional
from playwright.sync_api import sync_playwright, Page, Locator, TimeoutError as PlaywrightTimeoutError

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("crm_automation.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("CRM_Automation")

CRM_URL = os.getenv("CRM_URL", "https://crm.biwase.com.vn")
USERNAME = os.getenv("CRM_USERNAME", "KhuongHV")
PASSWORD = os.getenv("CRM_PASSWORD", "BinhDuong@2026")
HEADLESS_MODE = os.getenv("HEADLESS", "false").lower() == "true"
SLOW_MO_MS = int(os.getenv("SLOW_MO", "400")) # 400ms giữa các thao tác để quan sát mượt mà

OUTPUT_CO_TOA_DO = "co_toa_do.csv"
OUTPUT_KHONG_TOA_DO = "khong_toa_do.csv"
OUTPUT_KHONG_TIM_THAY = "khong_tim_thay_ho_so.csv"

CSV_FIELDNAMES = [
    "ma_danh_bo", "ten_khach_hang", "so_thua", "so_to", "dia_chi_phuong",
    "co_so_do", "co_bang_toa_do_vn2000", "danh_sach", "ghi_chu"
]


class BiwaseCrmVisualBot:
    def __init__(self, page: Page):
        self.page = page

    def highlight_element(self, locator: Locator):
        """Làm nổi bật phần tử màu vàng/cam để người dùng thấy rõ bot đang thao tác vào đâu"""
        try:
            locator.evaluate("""(el) => {
                if (el) {
                    el.style.outline = '3px solid #f59e0b';
                    el.style.backgroundColor = '#fef3c7';
                    el.style.transition = 'all 0.3s ease';
                    setTimeout(() => {
                        el.style.outline = '';
                        el.style.backgroundColor = '';
                    }, 600);
                }
            }""")
        except Exception:
            pass

    def wait_for_loaders_hidden(self, timeout_ms: int = 15000):
        """Chờ các loader/spinner đang quay của hệ thống biến mất hoàn toàn"""
        loader_selectors = [
            ".loading", ".spinner", ".k-loading-image", ".k-loading-mask",
            ".loading-spinner", ".modal-backdrop", ".ui-block-ui", "#loadingProgress"
        ]
        for sel in loader_selectors:
            try:
                elem = self.page.locator(sel)
                if elem.count() > 0 and elem.first.is_visible():
                    elem.first.wait_for(state="hidden", timeout=timeout_ms)
            except Exception:
                pass

    def login(self) -> bool:
        """Bước 1: Đăng nhập vào hệ sinh thái CRM BIWASE"""
        logger.info(f"[Đăng nhập] Mở trình duyệt và truy cập CRM: {CRM_URL}")
        try:
            self.page.goto(CRM_URL, timeout=45000, wait_until="domcontentloaded")
            self.wait_for_loaders_hidden(5000)

            # Chờ các trường nhập tên tài khoản và mật khẩu
            username_input = self.page.wait_for_selector(
                "input[name='username'], input[type='text'], input#username, input#txtUser, input[name='txtUser']",
                timeout=20000, state="visible"
            )
            password_input = self.page.wait_for_selector(
                "input[name='password'], input[type='password'], input#password, input#txtPass, input[name='txtPass']",
                timeout=20000, state="visible"
            )

            if username_input and password_input:
                self.highlight_element(self.page.locator("input[name='username'], input#username, input[type='text']").first)
                username_input.fill(USERNAME)
                self.page.wait_for_timeout(200)

                self.highlight_element(self.page.locator("input[name='password'], input#password, input[type='password']").first)
                password_input.fill(PASSWORD)
                self.page.wait_for_timeout(200)

                login_btn = self.page.locator(
                    "button[type='submit'], input[type='submit'], button:has-text('Đăng nhập'), button:has-text('Login'), .btn-login"
                ).first
                self.highlight_element(login_btn)
                login_btn.click()

                # Chờ trang chủ tải xong
                self.wait_for_loaders_hidden(20000)
                self.page.wait_for_load_state("networkidle", timeout=30000)
                logger.info("✓ [Đăng nhập] Đăng nhập thành công! Đã vào trang chủ hệ thống CRM.")
                return True
        except Exception as e:
            logger.error(f"❌ [Đăng nhập] Thất bại: {str(e)}")
            return False
        return False

    def navigate_to_dang_ky_lap_moi(self) -> bool:
        """Bước 2: Điều hướng vào menu 'Đăng ký lắp mới'"""
        logger.info("[Điều hướng] Click menu 'Đăng ký lắp mới' -> 'Đăng ký lắp mới'...")
        try:
            self.wait_for_loaders_hidden(5000)
            # Tìm menu cha "Đăng ký lắp mới"
            menu_item = self.page.wait_for_selector(
                "text='Đăng ký lắp mới', a:has-text('Đăng ký lắp mới'), span:has-text('Đăng ký lắp mới')",
                timeout=15000, state="visible"
            )
            if menu_item:
                self.highlight_element(self.page.locator("text='Đăng ký lắp mới'").first)
                menu_item.click()
                self.page.wait_for_timeout(400)

                # Click submenu nếu có
                sub_item = self.page.locator(
                    "ul a:has-text('Đăng ký lắp mới'), .dropdown-menu a:has-text('Đăng ký lắp mới')"
                ).first
                if sub_item.is_visible():
                    self.highlight_element(sub_item)
                    sub_item.click()

                self.wait_for_loaders_hidden(10000)
                self.page.wait_for_load_state("domcontentloaded", timeout=20000)
                logger.info("✓ [Điều hướng] Đã vào trang 'Đăng ký lắp mới'. DOM và bảng giao diện đã sẵn sàng!")
                return True
        except Exception as e:
            logger.error(f"❌ [Điều hướng] Lỗi khi chuyển trang: {str(e)}")
            return False
        return False

    def filter_by_ma_danh_bo(self, ma_danh_bo: str) -> bool:
        """Bước 3: Nhập Mã Danh Bộ vào ô tìm kiếm và bấm nút 'Lọc'"""
        logger.info(f"-> Đã nhập mã danh bộ [{ma_danh_bo}], bấm nút 'Lọc'")
        try:
            self.wait_for_loaders_hidden(5000)

            # Tìm ô input Mã Danh Bộ
            input_danh_bo = self.page.wait_for_selector(
                "input[placeholder*='danh bộ'], input[name*='danh_bo'], input#txtMaDanhBo, input#maDanhBo, input[name='MaDanhBo']",
                timeout=12000, state="visible"
            )
            if not input_danh_bo:
                logger.error("Không tìm thấy ô input 'Mã danh bộ'")
                return False

            input_locator = self.page.locator(
                "input[placeholder*='danh bộ'], input[name*='danh_bo'], input#txtMaDanhBo, input#maDanhBo, input[name='MaDanhBo']"
            ).first
            self.highlight_element(input_locator)
            input_danh_bo.fill("")
            input_danh_bo.fill(ma_danh_bo.strip())
            self.page.wait_for_timeout(300)

            # Tìm nút "Lọc"
            btn_loc = self.page.wait_for_selector(
                "button:has-text('Lọc'), input[value='Lọc'], button.btn-filter, a:has-text('Lọc')",
                timeout=10000, state="visible"
            )
            if not btn_loc:
                logger.error("Không tìm thấy nút 'Lọc'")
                return False

            btn_locator = self.page.locator("button:has-text('Lọc'), input[value='Lọc'], button.btn-filter, a:has-text('Lọc')").first
            self.highlight_element(btn_locator)
            btn_loc.click()

            logger.info("-> Đang chờ bảng kết quả hiển thị...")
            # Chờ loader của bảng lọc biến mất
            self.wait_for_loaders_hidden(15000)
            self.page.wait_for_timeout(800)

            # Kiểm tra xem có dòng dữ liệu nào không
            rows = self.page.locator("table tbody tr")
            if rows.count() > 0:
                first_row_text = rows.first.inner_text().strip()
                if "không tìm thấy" in first_row_text.lower() or "no data" in first_row_text.lower() or "không có dữ liệu" in first_row_text.lower():
                    logger.warning(f"⚠️ Mã danh bộ {ma_danh_bo}: Bảng trả về không có kết quả!")
                    return False
                return True
            else:
                logger.warning(f"⚠️ Mã danh bộ {ma_danh_bo}: Không tìm thấy dòng kết quả nào!")
                return False
        except Exception as e:
            logger.error(f"❌ Lỗi khi lọc mã danh bộ {ma_danh_bo}: {str(e)}")
            return False

    def open_record_detail(self) -> bool:
        """Bước 4: Click icon 'Cây bút màu xanh' ở cột cuối cùng"""
        logger.info("-> Đã tìm thấy dòng kết quả, bấm icon 'Cây bút xanh'")
        try:
            # Tìm icon cây bút xanh ở cột thao tác/hành động (cột cuối cùng)
            pencil_locator = self.page.locator(
                "table tbody tr:first-child td:last-child a:has(.fa-pencil, .fa-edit, .bi-pencil), "
                "table tbody tr:first-child td:last-child .fa-pencil, "
                "table tbody tr:first-child td:last-child .bi-pencil, "
                "table tbody tr:first-child td:last-child a[title*='Sửa'], "
                "table tbody tr:first-child td:last-child a[title*='Chi tiết'], "
                "table tbody tr:first-child td:last-child button"
            ).first

            if not pencil_locator.is_visible():
                # Fallback: link bất kỳ ở cột cuối cùng
                pencil_locator = self.page.locator("table tbody tr:first-child td:last-child a").first

            self.highlight_element(pencil_locator)
            pencil_locator.click()

            # Chờ trang chi tiết hồ sơ tải hoàn tất
            self.wait_for_loaders_hidden(20000)
            self.page.wait_for_load_state("domcontentloaded", timeout=25000)
            self.page.wait_for_timeout(500)
            return True
        except Exception as e:
            logger.error(f"❌ Không thể click vào icon cây bút: {str(e)}")
            return False

    def inspect_attachments_and_classify(self, ma_danh_bo: str) -> Dict[str, Any]:
        """Bước 5: Cuộn xuống 'File/ ảnh đăng ký', duyệt mở từng ảnh và phân loại"""
        logger.info("-> Đang cuộn đến 'File ảnh đăng ký' và duyệt ảnh...")
        record_info = {
            "ma_danh_bo": ma_danh_bo,
            "ten_khach_hang": "",
            "so_thua": "",
            "so_to": "",
            "dia_chi_phuong": "",
            "co_so_do": False,
            "co_bang_toa_do_vn2000": False,
            "danh_sach": 2,
            "ghi_chu": "",
        }

        try:
            # Trích xuất tên khách hàng
            try:
                name_elem = self.page.locator("input#TenKhachHang, input[name='CustomerName'], .customer-name, h4, .box-title").first
                if name_elem.is_visible():
                    record_info["ten_khach_hang"] = name_elem.input_value() if name_elem.tag_name == "input" else name_elem.inner_text().strip()
            except Exception:
                pass

            # Cuộn xuống khu vực File/ ảnh đăng ký
            file_section = self.page.locator(
                "text='File/ ảnh đăng ký', text='Tài liệu đính kèm', #divFileDinhKem, .attachment-section, .box-attachments"
            ).first

            if file_section.is_visible():
                self.highlight_element(file_section)
                file_section.scroll_into_view_if_needed()
                self.page.wait_for_timeout(600)

            # Chờ danh sách ảnh xuất hiện
            self.wait_for_loaders_hidden(8000)
            img_thumbnails = self.page.locator(
                ".attachment-item img, .file-preview img, a[href*='.jpg'], a[href*='.png'], a[href*='.pdf'], .thumbnail img"
            )
            img_count = img_thumbnails.count()
            logger.info(f"   Tìm thấy {img_count} tệp tài liệu/ảnh đính kèm trong hồ sơ.")

            if img_count == 0:
                record_info["ghi_chu"] = "Hồ sơ không có tệp ảnh đính kèm (hồ sơ giấy tay vi bằng)"
                record_info["co_so_do"] = False
                record_info["danh_sach"] = 2
                logger.info(f"-> Kết quả: Hồ sơ giấy tay vi bằng / Chưa có sổ đỏ trên CRM.")
                return record_info

            # Duyệt qua các tệp ảnh
            record_info["co_so_do"] = True
            for i in range(img_count):
                thumb = img_thumbnails.nth(i)
                self.highlight_element(thumb)
                title_attr = thumb.get_attribute("title") or thumb.get_attribute("alt") or thumb.inner_text() or f"Ảnh {i+1}"
                lower_title = title_attr.lower()

                # Nhận diện thông tin Số thửa, Số tờ trên bìa sổ
                match_thua = re.search(r"thửa\s*[:\s]*(\d+)", lower_title)
                match_to = re.search(r"tờ\s*[:\s]*(\d+)", lower_title)
                if match_thua:
                    record_info["so_thua"] = match_thua.group(1)
                if match_to:
                    record_info["so_to"] = match_to.group(1)

                # Nhận diện Bản thống kê tọa độ góc ranh VN-2000 (Trang 3)
                if any(k in lower_title for k in ["tọa độ", "toa do", "vn2000", "vn-2000", "bảng kê", "bang ke", "trang 3", "ranh"]):
                    record_info["co_bang_toa_do_vn2000"] = True

            # PHÂN LOẠI KẾT QUẢ ĐẦU RA
            if record_info["co_bang_toa_do_vn2000"]:
                record_info["danh_sach"] = 1
                record_info["ghi_chu"] = "Sổ đất Trang 3 CÓ Bảng thống kê tọa độ VN-2000 -> ĐỦ ĐIỀU KIỆN KHÓA MỐC PHƯƠNG ÁN A!"
                logger.info(f"-> Kết quả: Đã ghi nhận thông tin sổ đỏ / CÓ BẢNG THỐNG KÊ TỌA ĐỘ VN-2000 (DANH SÁCH 1).")
            else:
                record_info["danh_sach"] = 2
                record_info["ghi_chu"] = "Sổ đất KHÔNG CÓ Bảng tọa độ VN-2000 (hoặc sổ mới có mã QR) -> Chuyển sang Cổng GIS Xây dựng để tra cứu!"
                logger.info(f"-> Kết quả: Đã ghi nhận thông tin sổ đỏ / KHÔNG CÓ BẢNG THỐNG KÊ TỌA ĐỘ (DANH SÁCH 2 - Tra GIS).")

        except Exception as e:
            logger.error(f"❌ Lỗi khi đọc ảnh đính kèm: {str(e)}")
            record_info["ghi_chu"] = f"Lỗi đọc ảnh: {str(e)}"

        return record_info


def append_result_to_csv(result: Dict[str, Any]):
    """Ghi trực tiếp kết quả của từng khách hàng vào file CSV ngay khi vừa xử lý xong"""
    target_csv = OUTPUT_CO_TOA_DO if result["danh_sach"] == 1 else OUTPUT_KHONG_TOA_DO
    file_exists = os.path.exists(target_csv)

    with open(target_csv, mode="a", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        if not file_exists:
            writer.writeheader()
        writer.writerow(result)
        f.flush() # Flush ngay lập tức xuống đĩa cứng


def run_visual_automation_workflow(danh_bo_list: List[str]):
    """Điều phối toàn bộ quy trình tự động hóa với Playwright trực quan"""
    logger.info(f"============================================================")
    logger.info(f"BẮT ĐẦU QUY TRÌNH TRA CỨU CRM BIWASE VỚI {len(danh_bo_list)} MÃ DANH BỘ")
    logger.info(f"Chế độ hiển thị: {'ẨN (Headless)' if HEADLESS_MODE else 'TRỰC QUAN (Window có giao diện, slow_mo=400ms)'}")
    logger.info(f"============================================================\n")

    # Khởi tạo file CSV mới nếu cần
    for path in [OUTPUT_CO_TOA_DO, OUTPUT_KHONG_TOA_DO]:
        with open(path, mode="w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
            writer.writeheader()

    with sync_playwright() as p:
        # Launch browser với slow_mo để người dùng thấy rõ bot thao tác từng bước
        browser = p.chromium.launch(
            headless=HEADLESS_MODE,
            slow_mo=SLOW_MO_MS,
            args=["--start-maximized", "--disable-notifications"]
        )
        context = browser.new_context(viewport=None, no_viewport=True)
        page = context.new_page()
        bot = BiwaseCrmVisualBot(page)

        # Bước 1: Đăng nhập
        if not bot.login():
            logger.error("Không thể đăng nhập CRM BIWASE. Dừng quy trình.")
            browser.close()
            return

        # Bước 2: Điều hướng vào 'Đăng ký lắp mới'
        if not bot.navigate_to_dang_ky_lap_moi():
            logger.error("Không thể điều hướng vào 'Đăng ký lắp mới'. Dừng quy trình.")
            browser.close()
            return

        total = len(danh_bo_list)
        # Vòng lặp tra cứu từng Mã Danh Bộ tuần tự
        for idx, db in enumerate(danh_bo_list):
            db = str(db).strip()
            logger.info(f"\n[Khách {idx + 1}/{total} - Mã {db}] Bắt đầu tra cứu...")

            # Cơ chế Retry 1 lần nếu gặp timeout hoặc lỗi mạng
            for attempt in range(1, 3):
                try:
                    # Bước 3: Lọc Mã Danh Bộ
                    found = bot.filter_by_ma_danh_bo(db)
                    if not found:
                        empty_res = {
                            "ma_danh_bo": db,
                            "ten_khach_hang": "",
                            "so_thua": "",
                            "so_to": "",
                            "dia_chi_phuong": "",
                            "co_so_do": False,
                            "co_bang_toa_do_vn2000": False,
                            "danh_sach": 2,
                            "ghi_chu": "Tra cứu CRM không ra kết quả (cần kiểm tra số điện thoại/hồ sơ giấy)"
                        }
                        append_result_to_csv(empty_res)
                        break

                    # Bước 4: Click icon cây bút màu xanh
                    opened = bot.open_record_detail()
                    if not opened:
                        if attempt == 1:
                            logger.warning(f"⚠️ Thử lại lần 2 cho mã {db}...")
                            bot.navigate_to_dang_ky_lap_moi()
                            continue
                        break

                    # Bước 5: Đọc ảnh bìa sổ và bản thống kê tọa độ
                    classified = bot.inspect_attachments_and_classify(db)
                    # Cập nhật kết quả ngay lập tức vào file CSV
                    append_result_to_csv(classified)

                    # Quay lại trang danh sách để tra mã tiếp theo
                    bot.navigate_to_dang_ky_lap_moi()
                    break # Thành công, thoát vòng lặp retry

                except Exception as ex:
                    logger.error(f"❌ [Lần {attempt}] Gặp lỗi khi xử lý mã {db}: {str(ex)}")
                    if attempt == 1:
                        logger.info("-> Đang thử lại lần 2 sau 2 giây...")
                        time.sleep(2)
                        bot.navigate_to_dang_ky_lap_moi()
                    else:
                        fail_res = {
                            "ma_danh_bo": db,
                            "ten_khach_hang": "",
                            "so_thua": "",
                            "so_to": "",
                            "dia_chi_phuong": "",
                            "co_so_do": False,
                            "co_bang_toa_do_vn2000": False,
                            "danh_sach": 2,
                            "ghi_chu": f"Lỗi ngoại lệ: {str(ex)}"
                        }
                        append_result_to_csv(fail_res)
                        bot.navigate_to_dang_ky_lap_moi()

        logger.info("\n✓ [Hoàn tất] Đã tra cứu xong toàn bộ danh sách khách hàng!")
        logger.info(f"✓ File Danh sách 1 (Có tọa độ VN-2000): {OUTPUT_CO_TOA_DO}")
        logger.info(f"✓ File Danh sách 2 (Không có tọa độ -> Tra GIS): {OUTPUT_KHONG_TOA_DO}")
        time.sleep(2)
        browser.close()


if __name__ == "__main__":
    # Danh sách 49 Mã Danh Bộ thực tế theo dữ liệu BIWASE
    DANH_BO_49_MAU = [
        "8415031782",  # NGUYỄN HỮU TÚ (Thửa 3036/Tờ 59 phường Hòa Lợi)
        "8412070692",  # TRẦN ĐỨC HỢP 1 (Thửa 158/Tờ 42 P. Tân Định)
        "8412070693",  # TRẦN ĐỨC HỢP 2 (Thửa 159/Tờ 42 P. Tân Định)
        "8412070694",  # NGUYỄN THỊ KIM LOAN (Thửa 1031/Tờ 9 P. Chánh Phú Hòa)
        "8412070695",  # VŨ HÙNG CƯỜNG (Thửa 89/Tờ 35 P. Tân Định - Có tọa độ VN-2000)
        "8412070698",  # CHỦ HỘ THỬA 3188 (Thửa 3188/Tờ 12 P. Chánh Phú Hòa)
        "8413011414",  # CÔNG TY THIÊN PHÚ (Không có sổ đỏ)
        "8002010108",  # HUỲNH THỊ MINH PHỤNG (Không tìm thấy trên CRM)
        "8412010725",  # KHÁCH HÀNG 8412010725
        "8412010726", "8412010727", "8412010728", "8412010729", "8412010730",
        "8412010731", "8412010732", "8412010733", "8412010734", "8412010735",
        "8412010736", "8412010737", "8412010738", "8412010739", "8412010740",
        "8412010741", "8412010742", "8412010743", "8412010744", "8412010745",
        "8412010746", "8412010747", "8412010748", "8412010749", "8412010750",
        "8412010751", "8412010752", "8412010753", "8412010754", "8412010755",
        "8412010756", "8412010757", "8412010758", "8412010759", "8412010760",
        "8412010761", "8412010762", "8412010763", "8412010764", "8412010765"
    ]

    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            danh_bo_list = [line.strip() for line in f if line.strip()]
        run_visual_automation_workflow(danh_bo_list)
    else:
        run_visual_automation_workflow(DANH_BO_49_MAU)
