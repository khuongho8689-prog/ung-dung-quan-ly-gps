#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Tự Động Hóa CRM BIWASE Tra Cứu & Phân Loại Hồ Sơ Khách Hàng (Selenium 4)
Phiên bản 2.0 - Trực quan (Visual Execution), Explicit Wait, Logging chi tiết & Live Save.
"""

import os
import sys
import csv
import time
import logging
import re
from typing import List, Dict, Any

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("crm_selenium.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("CRM_Selenium")

CRM_URL = os.getenv("CRM_URL", "https://crm.biwase.com.vn")
USERNAME = os.getenv("CRM_USERNAME", "KhuongHV")
PASSWORD = os.getenv("CRM_PASSWORD", "BinhDuong@2026")
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true" # Mặc định False để mở cửa sổ trực quan

OUTPUT_CO_TOA_DO = "co_toa_do.csv"
OUTPUT_KHONG_TOA_DO = "khong_toa_do.csv"

CSV_KEYS = [
    "ma_danh_bo", "ten_khach_hang", "so_thua", "so_to", "dia_chi_phuong",
    "co_so_do", "co_bang_toa_do_vn2000", "danh_sach", "ghi_chu"
]


def create_webdriver() -> webdriver.Chrome:
    """Khởi tạo Chrome WebDriver trực quan với kích thước cửa sổ chuẩn"""
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-notifications")
    
    driver = webdriver.Chrome(options=options)
    return driver


class SeleniumCrmVisualBot:
    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    def highlight(self, element):
        """Làm nổi bật phần tử để người dùng nhìn thấy thao tác của bot"""
        try:
            self.driver.execute_script(
                "arguments[0].style.outline = '3px solid #f59e0b'; "
                "arguments[0].style.backgroundColor = '#fef3c7'; "
                "setTimeout(() => { arguments[0].style.outline = ''; arguments[0].style.backgroundColor = ''; }, 600);",
                element
            )
            time.sleep(0.3)
        except Exception:
            pass

    def wait_for_spinners_hidden(self):
        """Chờ tất cả spinner ẩn đi"""
        try:
            WebDriverWait(self.driver, 10).until(
                EC.invisibility_of_element_located((By.CSS_SELECTOR, ".loading, .spinner, .loading-spinner, .k-loading-image"))
            )
        except Exception:
            pass

    def login(self) -> bool:
        """Bước 1: Đăng nhập"""
        logger.info(f"[Đăng nhập] Mở trình duyệt và truy cập: {CRM_URL}")
        try:
            self.driver.get(CRM_URL)
            self.wait_for_spinners_hidden()

            user_input = self.wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, "input[name='username'], input#username, input#txtUser, input[type='text']"))
            )
            pass_input = self.wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, "input[name='password'], input#password, input#txtPass, input[type='password']"))
            )

            self.highlight(user_input)
            user_input.clear()
            user_input.send_keys(USERNAME)

            self.highlight(pass_input)
            pass_input.clear()
            pass_input.send_keys(PASSWORD)

            login_btn = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit'], input[type='submit'], button.btn-login"))
            )
            self.highlight(login_btn)
            login_btn.click()

            # Chờ trang chủ tải hoàn tất
            self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".sidebar, .navbar, .main-menu, .content-wrapper"))
            )
            self.wait_for_spinners_hidden()
            logger.info("✓ [Đăng nhập] Đăng nhập thành công! Đã vào trang chủ hệ thống CRM.")
            return True
        except Exception as e:
            logger.error(f"❌ [Đăng nhập] Thất bại: {str(e)}")
            return False

    def navigate_to_dang_ky_lap_moi(self) -> bool:
        """Bước 2: Điều hướng vào 'Đăng ký lắp mới'"""
        logger.info("[Điều hướng] Click menu 'Đăng ký lắp mới'...")
        try:
            self.wait_for_spinners_hidden()
            menu_elem = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Đăng ký lắp mới')]"))
            )
            self.highlight(menu_elem)
            menu_elem.click()
            time.sleep(0.4)

            # Submenu nếu có
            sub_menus = self.driver.find_elements(By.XPATH, "//ul//a[contains(text(), 'Đăng ký lắp mới')]")
            if sub_menus and sub_menus[0].is_displayed():
                self.highlight(sub_menus[0])
                sub_menus[0].click()

            self.wait_for_spinners_hidden()
            self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table, input[placeholder*='danh bộ']"))
            )
            logger.info("✓ [Điều hướng] Đã vào trang 'Đăng ký lắp mới'. DOM và bảng giao diện đã sẵn sàng!")
            return True
        except Exception as e:
            logger.error(f"❌ [Điều hướng] Lỗi: {str(e)}")
            return False

    def filter_by_ma_danh_bo(self, ma_danh_bo: str) -> bool:
        """Bước 3: Nhập Mã danh bộ & Click 'Lọc'"""
        logger.info(f"-> Đã nhập mã danh bộ [{ma_danh_bo}], bấm nút 'Lọc'")
        try:
            self.wait_for_spinners_hidden()
            input_box = self.wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder*='danh bộ'], input#txtMaDanhBo, input#maDanhBo, input[name='MaDanhBo']"))
            )
            self.highlight(input_box)
            input_box.clear()
            input_box.send_keys(ma_danh_bo.strip())

            btn_loc = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Lọc')] | //input[@value='Lọc'] | //button[contains(@class, 'btn-filter')]"))
            )
            self.highlight(btn_loc)
            btn_loc.click()

            logger.info("-> Đang chờ bảng kết quả hiển thị...")
            self.wait_for_spinners_hidden()
            time.sleep(1.0)

            rows = self.driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
            if not rows or any(w in rows[0].text.lower() for w in ["không tìm thấy", "no data", "không có dữ liệu"]):
                logger.warning(f"⚠️ Không có dữ liệu cho mã danh bộ {ma_danh_bo}")
                return False
            return True
        except Exception as e:
            logger.error(f"❌ Lỗi khi lọc mã danh bộ {ma_danh_bo}: {str(e)}")
            return False

    def open_record_detail(self) -> bool:
        """Bước 4: Mở chi tiết - Click icon cây bút màu xanh ở cột cuối cùng"""
        logger.info("-> Đã tìm thấy dòng kết quả, bấm icon 'Cây bút xanh'")
        try:
            pencil_icons = self.driver.find_elements(
                By.CSS_SELECTOR,
                "table tbody tr:first-child td:last-child a:has(.fa-pencil), "
                "table tbody tr:first-child td:last-child .fa-pencil, "
                "table tbody tr:first-child td:last-child .bi-pencil, "
                "table tbody tr:first-child td:last-child a[title*='Sửa'], "
                "table tbody tr:first-child td:last-child a[title*='Chi tiết'], "
                "table tbody tr:first-child td:last-child a"
            )
            if pencil_icons:
                self.highlight(pencil_icons[0])
                pencil_icons[0].click()
                self.wait_for_spinners_hidden()
                time.sleep(1.2)
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Lỗi khi click mở icon cây bút: {str(e)}")
            return False

    def inspect_and_classify(self, ma_danh_bo: str) -> Dict[str, Any]:
        """Bước 5: Cuộn đến 'File/ ảnh đăng ký', kiểm tra ảnh bìa sổ & bản thống kê tọa độ"""
        logger.info("-> Đang cuộn đến 'File ảnh đăng ký' và duyệt ảnh...")
        result = {
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
            # Cuộn trang xuống khu vực File/ ảnh đăng ký
            file_sections = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'File/ ảnh đăng ký') or contains(text(), 'Tài liệu đính kèm')]")
            if file_sections:
                self.highlight(file_sections[0])
                self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", file_sections[0])
                time.sleep(0.6)

            images = self.driver.find_elements(By.CSS_SELECTOR, ".attachment-item img, .file-preview img, a[href*='.jpg'], a[href*='.png']")
            if not images:
                result["ghi_chu"] = "Hồ sơ không có ảnh đính kèm (hồ sơ giấy tay vi bằng)"
                result["danh_sach"] = 2
                logger.info(f"-> Kết quả: Hồ sơ giấy tay vi bằng / Chưa có sổ đỏ trên CRM.")
                return result

            result["co_so_do"] = True
            for img in images:
                self.highlight(img)
                caption = (img.get_attribute("title") or img.get_attribute("alt") or "").lower()

                # Nhận diện thông tin Số thửa, Số tờ
                m_thua = re.search(r"thửa\s*(\d+)", caption)
                m_to = re.search(r"tờ\s*(\d+)", caption)
                if m_thua:
                    result["so_thua"] = m_thua.group(1)
                if m_to:
                    result["so_to"] = m_to.group(1)

                # Kiểm tra bản thống kê tọa độ VN-2000
                if any(k in caption for k in ["tọa độ", "toa do", "vn2000", "vn-2000", "bảng kê", "trang 3"]):
                    result["co_bang_toa_do_vn2000"] = True

            # Phân loại
            if result["co_bang_toa_do_vn2000"]:
                result["danh_sach"] = 1
                result["ghi_chu"] = "Sổ đất Trang 3 CÓ Bảng kê tọa độ VN-2000 -> ĐỦ ĐIỀU KIỆN KHÓA MỐC PHƯƠNG ÁN A!"
                logger.info("-> Kết quả: Đã ghi nhận thông tin sổ đỏ / CÓ BẢNG THỐNG KÊ TỌA ĐỘ VN-2000 (DANH SÁCH 1).")
            else:
                result["danh_sach"] = 2
                result["ghi_chu"] = "Bìa sổ không có bảng tọa độ VN-2000 -> Chuyển qua GIS Xây dựng để tra cứu!"
                logger.info("-> Kết quả: Đã ghi nhận thông tin sổ đỏ / KHÔNG CÓ BẢNG THỐNG KÊ TỌA ĐỘ (DANH SÁCH 2 - Tra GIS).")

        except Exception as e:
            logger.error(f"❌ Lỗi khi đọc ảnh đính kèm: {str(e)}")
            result["ghi_chu"] = f"Lỗi đọc ảnh: {str(e)}"

        return result


def append_csv(result: Dict[str, Any]):
    target_csv = OUTPUT_CO_TOA_DO if result["danh_sach"] == 1 else OUTPUT_KHONG_TOA_DO
    file_exists = os.path.exists(target_csv)
    with open(target_csv, "a", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_KEYS, extrasaction="ignore")
        if not file_exists:
            writer.writeheader()
        writer.writerow(result)
        f.flush()


def main():
    DANH_BO_TEST = [
        "8415031782",  # NGUYỄN HỮU TÚ (Thửa 3036/Tờ 59 phường Hòa Lợi)
        "8412070692",  # TRẦN ĐỨC HỢP 1 (Thửa 158/Tờ 42 P. Tân Định)
        "8412070693",  # TRẦN ĐỨC HỢP 2 (Thửa 159/Tờ 42 P. Tân Định)
        "8412070695",  # VŨ HÙNG CƯỜNG (Thửa 89/Tờ 35 P. Tân Định - Có tọa độ)
        "8413011414",  # CÔNG TY THIÊN PHÚ
    ]

    for path in [OUTPUT_CO_TOA_DO, OUTPUT_KHONG_TOA_DO]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_KEYS)
            writer.writeheader()

    driver = create_webdriver()
    bot = SeleniumCrmVisualBot(driver)

    try:
        if not bot.login():
            return
        if not bot.navigate_to_dang_ky_lap_moi():
            return

        total = len(DANH_BO_TEST)
        for idx, db in enumerate(DANH_BO_TEST):
            logger.info(f"\n[Khách {idx + 1}/{total} - Mã {db}] Bắt đầu tra cứu...")
            for attempt in range(1, 3):
                try:
                    if bot.filter_by_ma_danh_bo(db):
                        if bot.open_record_detail():
                            res = bot.inspect_and_classify(db)
                            append_csv(res)
                            bot.navigate_to_dang_ky_lap_moi()
                            break
                        else:
                            if attempt == 1:
                                bot.navigate_to_dang_ky_lap_moi()
                                continue
                    else:
                        empty_res = {
                            "ma_danh_bo": db,
                            "danh_sach": 2,
                            "ghi_chu": "Không tìm thấy hồ sơ trên CRM"
                        }
                        append_csv(empty_res)
                        break
                except Exception as ex:
                    logger.error(f"Lỗi ở mã {db}: {ex}")
                    bot.navigate_to_dang_ky_lap_moi()

        logger.info("\n✓ [Hoàn tất] Đã hoàn thành tra cứu tuần tự!")
        time.sleep(2)

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
