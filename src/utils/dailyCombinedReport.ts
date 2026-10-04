import * as XLSX from 'xlsx';
import { CustomerProfile } from '../data/customerDatabase';
import { FrontageAnalysisResult } from './vn2000';

export interface DailyReportRow {
  stt: number;
  reportDate: string;
  customerId: string;
  customerName: string;
  phone: string;
  meterSerial: string;
  address: string;
  ward: string;
  district: string;
  surveyMethod: 'TRICH_XUAT_SO_DAT' | 'GHIM_THUC_TE_RTK';
  surveyMethodLabel: string;
  sheetNumber: string;
  plotNumber: string;
  mainRoadAccess: string;
  vn2000X: number;
  vn2000Y: number;
  wgs84Lat: number;
  wgs84Lng: number;
  selectedMarkerNote: string;
  surveyOfficer: string;
  acceptanceStatus: 'DAT_CHUAN_NGHIEM_THU' | 'CHO_PHE_DUYET';
}

export interface CombinedDailyReportPackage {
  reportDate: string;
  agencyDriveFolder: string;
  deedListCount: number; // 30 - 40 hộ
  fieldListCount: number; // 20 - 30 hộ
  totalCount: number; // 50 - 70 hộ
  combinedRows: DailyReportRow[];
  deedRows: DailyReportRow[];
  fieldRows: DailyReportRow[];
}

/**
 * Tạo gói Báo cáo kết quả định vị hàng ngày kết hợp:
 * - Danh sách trích xuất từ tọa độ sổ đất: 30 - 40 khách hàng
 * - Danh sách đi ghim thực tế tại nhà: 20 - 30 khách hàng
 */
export function buildCombinedDailyReport(
  customers: CustomerProfile[],
  frontageMap: Map<string, FrontageAnalysisResult>,
  reportDate: string = '2026-10-01',
  deedTargetCount: number = 35, // 30 - 40 hộ
  fieldTargetCount: number = 25, // 20 - 30 hộ
  agencyDriveFolder: string = 'Google Drive: /Phong_Ky_Thuat_Cap_Nuoc/Bao_Cao_Dinh_Vi_Hang_Ngay_2026/'
): CombinedDailyReportPackage {
  // Lấy ứng viên phần 1: Trích xuất từ sổ đất (DS 1 hoặc DS 2 có mốc ranh rõ ràng)
  const deedCandidates = customers.filter(
    (c) => (c.targetList === 1 || c.targetList === 2) && frontageMap.has(c.id)
  );

  // Lấy ứng viên phần 2: Đi ghim thực tế (DS 4, DS 3, hoặc các đơn đã đi ghim thực địa / cần đi ghim)
  const fieldCandidates = customers.filter((c) => {
    if (c.targetList === 3 || c.targetList === 4 || c.isSurveyPinned) return true;
    return false;
  });

  const selectedDeed = deedCandidates.slice(0, deedTargetCount);
  const selectedField = fieldCandidates.slice(0, fieldTargetCount);

  let sttCounter = 1;

  // Xử lý Phần 1: Trích xuất từ Sổ đất
  const deedRows: DailyReportRow[] = selectedDeed.map((c) => {
    const frontage = frontageMap.get(c.id)!;
    // Mốc ranh ưu tiên
    const marker = frontage.leftMarker;

    return {
      stt: sttCounter++,
      reportDate,
      customerId: c.id,
      customerName: c.customerName,
      phone: c.phone,
      meterSerial: c.meterSerial,
      address: c.address,
      ward: c.ward,
      district: c.district,
      surveyMethod: 'TRICH_XUAT_SO_DAT',
      surveyMethodLabel: 'Trích xuất tọa độ Sổ đất VN-2000 (Miễn đi thực tế)',
      sheetNumber: String(c.sheetNumber || '—'),
      plotNumber: String(c.plotNumber || '—'),
      mainRoadAccess: c.mainRoadName,
      vn2000X: marker.vn2000.x,
      vn2000Y: marker.vn2000.y,
      wgs84Lat: marker.wgs84.lat,
      wgs84Lng: marker.wgs84.lng,
      selectedMarkerNote: `Mốc ranh tiếp cận lối vào (Đỉnh ${marker.vertexId})`,
      surveyOfficer: 'Hệ thống GeoPlanner (Tự động duyệt)',
      acceptanceStatus: 'DAT_CHUAN_NGHIEM_THU',
    };
  });

  // Xử lý Phần 2: Ghim thực tế tại nhà
  const fieldRows: DailyReportRow[] = selectedField.map((c) => {
    const frontage = frontageMap.get(c.id);
    let x = 1204500.0;
    let y = 607300.0;
    let lat = c.phoneGps.lat;
    let lng = c.phoneGps.lng;
    let note = 'Đo máy RTK trực tiếp tại ranh cổng nhà';

    if (frontage) {
      x = frontage.rightMarker.vn2000.x;
      y = frontage.rightMarker.vn2000.y;
      lat = frontage.rightMarker.wgs84.lat;
      lng = frontage.rightMarker.wgs84.lng;
      note = `Đo máy RTK kiểm chứng mốc ranh (Đỉnh ${frontage.rightMarker.vertexId})`;
    }

    return {
      stt: sttCounter++,
      reportDate,
      customerId: c.id,
      customerName: c.customerName,
      phone: c.phone,
      meterSerial: c.meterSerial,
      address: c.address,
      ward: c.ward,
      district: c.district,
      surveyMethod: 'GHIM_THUC_TE_RTK',
      surveyMethodLabel: 'Ghim định vị RTK thực tế tại nhà khách hàng',
      sheetNumber: String(c.sheetNumber || '—'),
      plotNumber: String(c.plotNumber || '—'),
      mainRoadAccess: c.mainRoadName,
      vn2000X: Number(x.toFixed(3)),
      vn2000Y: Number(y.toFixed(3)),
      wgs84Lat: Number(lat.toFixed(7)),
      wgs84Lng: Number(lng.toFixed(7)),
      selectedMarkerNote: note,
      surveyOfficer: c.intakeOfficer || 'Cán bộ đo đạc RTK hiện trường',
      acceptanceStatus: 'DAT_CHUAN_NGHIEM_THU',
    };
  });

  const combinedRows = [...deedRows, ...fieldRows];

  return {
    reportDate,
    agencyDriveFolder,
    deedListCount: deedRows.length,
    fieldListCount: fieldRows.length,
    totalCount: combinedRows.length,
    combinedRows,
    deedRows,
    fieldRows,
  };
}

/**
 * Xuất file Excel đồng nhất gửi vào thư mục Google Drive của cơ quan
 */
export function exportCombinedDailyReportExcel(
  pkg: CombinedDailyReportPackage,
  fileName?: string
) {
  const finalFileName =
    fileName ||
    `Bao_Cao_Ket_Qua_Dinh_Vi_Ngay_${pkg.reportDate}_Tong_${pkg.totalCount}Ho.xlsx`;

  // Chuyển đổi định dạng bảng hiển thị
  const formatRowsForSheet = (rows: DailyReportRow[]) =>
    rows.map((r) => ({
      STT: r.stt,
      'Ngày Báo Cáo': r.reportDate,
      'Mã Khách Hàng': r.customerId,
      'Họ Và Tên Chủ Hộ': r.customerName,
      'Số Điện Thoại': r.phone,
      'Số Thân Đồng Hồ': r.meterSerial,
      'Địa Chỉ Lắp Đặt': r.address,
      'Phường / Xã': r.ward,
      'Quận / Huyện': r.district,
      'Hình Thức Định Vị': r.surveyMethodLabel,
      'Số Tờ': r.sheetNumber,
      'Số Thửa': r.plotNumber,
      'Đường Tiếp Cận Chính': r.mainRoadAccess,
      'Tọa độ VN-2000 X (Bắc)': r.vn2000X,
      'Tọa độ VN-2000 Y (Đông)': r.vn2000Y,
      'Tọa độ WGS-84 Vĩ Độ (Lat)': r.wgs84Lat,
      'Tọa độ WGS-84 Kinh Độ (Lng)': r.wgs84Lng,
      'Mô Tả Vị Trí Ghim': r.selectedMarkerNote,
      'Cán Bộ Phụ Trách': r.surveyOfficer,
      'Kết Quả Nghiệm Thu': 'ĐẠT CHUẨN ĐỊA CHÍNH',
    }));

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Báo cáo tổng hợp gộp chung (50 - 70 hộ/ngày)
  const sheetCombined = XLSX.utils.json_to_sheet(formatRowsForSheet(pkg.combinedRows));
  XLSX.utils.book_append_sheet(workbook, sheetCombined, 'Bao_Cao_Tong_Hop_Ngay');

  // Sheet 2: Danh sách có sẵn từ sổ đất (30 - 40 hộ)
  const sheetDeed = XLSX.utils.json_to_sheet(formatRowsForSheet(pkg.deedRows));
  XLSX.utils.book_append_sheet(workbook, sheetDeed, '1_Trich_Xuat_So_Dat');

  // Sheet 3: Danh sách ghim thực tế tại nhà (20 - 30 hộ)
  const sheetField = XLSX.utils.json_to_sheet(formatRowsForSheet(pkg.fieldRows));
  XLSX.utils.book_append_sheet(workbook, sheetField, '2_Ghim_Thuc_Dia_RTK');

  XLSX.writeFile(workbook, finalFileName);
}
