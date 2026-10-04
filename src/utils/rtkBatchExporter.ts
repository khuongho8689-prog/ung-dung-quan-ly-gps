import * as XLSX from 'xlsx';
import { CustomerProfile } from '../data/customerDatabase';
import { FrontageAnalysisResult, distanceWgs84Meters } from './vn2000';

export interface RtkExportCandidate {
  customer: CustomerProfile;
  frontageAnalysis: FrontageAnalysisResult;
  selectedMarkerRole: 'LEFT' | 'RIGHT';
  selectedVertexId: string;
  selectedVn2000: { x: number; y: number };
  selectedWgs84: { lat: number; lng: number; latDms: string; lngDms: string };
  smallerDistanceMeters: number;
  largerDistanceMeters: number;
  scheduledDate?: string;
  batchIndex?: number;
}

/**
 * Áp dụng quy tắc Bước 3:
 * Nếu có 2 mốc thì ưu tiên lấy mốc có kích thước nhỏ hơn (khoảng cách sai số tới GPS điện thoại nhỏ hơn), bỏ mốc có kích thước lớn!
 */
export function buildRtkCandidate(
  customer: CustomerProfile,
  frontage: FrontageAnalysisResult,
  overrideRole?: 'LEFT' | 'RIGHT'
): RtkExportCandidate {
  const dLeft = distanceWgs84Meters(customer.phoneGps, frontage.leftMarker.wgs84);
  const dRight = distanceWgs84Meters(customer.phoneGps, frontage.rightMarker.wgs84);

  // Tự động chọn mốc có kích thước khoảng cách nhỏ hơn, trừ khi người dùng ép chọn
  const chosenRole = overrideRole || (dLeft <= dRight ? 'LEFT' : 'RIGHT');
  const smallerDist = Math.min(dLeft, dRight);
  const largerDist = Math.max(dLeft, dRight);

  const marker = chosenRole === 'LEFT' ? frontage.leftMarker : frontage.rightMarker;

  return {
    customer,
    frontageAnalysis: frontage,
    selectedMarkerRole: chosenRole,
    selectedVertexId: marker.vertexId,
    selectedVn2000: marker.vn2000,
    selectedWgs84: marker.wgs84,
    smallerDistanceMeters: Number(smallerDist.toFixed(1)),
    largerDistanceMeters: Number(largerDist.toFixed(1)),
  };
}

export interface DailyBatch {
  batchNumber: number;
  scheduledDate: string;
  items: RtkExportCandidate[];
}

/**
 * Chia cắt danh sách đề nghị xuất file thành các đợt 30 - 40 khách hàng/ngày
 */
export function splitIntoDailyBatches(
  candidates: RtkExportCandidate[],
  batchSize: number = 35,
  startDateStr: string = '2026-10-01'
): DailyBatch[] {
  const batches: DailyBatch[] = [];
  const startDate = new Date(startDateStr);

  for (let i = 0; i < candidates.length; i += batchSize) {
    const chunk = candidates.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    // Tăng ngày khảo sát tương ứng (bỏ qua Chủ nhật nếu cần, hoặc cộng liên tiếp)
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + (batchNum - 1));
    const curDateStr = curDate.toISOString().split('T')[0];

    // Gán ngày cho từng hồ sơ
    const assignedChunk = chunk.map((item) => ({
      ...item,
      batchIndex: batchNum,
      scheduledDate: curDateStr,
    }));

    batches.push({
      batchNumber: batchNum,
      scheduledDate: curDateStr,
      items: assignedChunk,
    });
  }

  return batches;
}

/**
 * Xuất file Excel định dạng chuẩn máy RTK
 */
export function exportRtkExcelFile(
  items: RtkExportCandidate[],
  fileName: string = 'RTK_Xuat_Diem_Do_Dac.xlsx',
  sheetName: string = 'RTK_Points'
) {
  const rows = items.map((item, idx) => ({
    PointID: item.customer.id,
    Northing_X_VN2000: item.selectedVn2000.x,
    Easting_Y_VN2000: item.selectedVn2000.y,
    Elevation_Z: 0.0,
    Code: `${item.customer.meterSerial}_${item.customer.customerName.replace(/\s+/g, '')}`,
    Latitude_WGS84: item.selectedWgs84.lat,
    Longitude_WGS84: item.selectedWgs84.lng,
    Moc_Uu_Tien: item.selectedMarkerRole === 'LEFT' ? `Moc_Trai_Dinh_${item.selectedVertexId}` : `Moc_Phai_Dinh_${item.selectedVertexId}`,
    KhoangCach_NhoHon_m: item.smallerDistanceMeters,
    KhoangCach_LonHon_Bo_m: item.largerDistanceMeters,
    SoTo_SoThua: `To_${item.customer.sheetNumber || '0'}_Thua_${item.customer.plotNumber || '0'}`,
    DiaChi: item.customer.address,
    PhuongXa: item.customer.ward,
    QuanHuyen: item.customer.district,
    NgayKhaoSat: item.scheduledDate || '2026-10-01',
    DotKhaoSat: item.batchIndex ? `Lo_${item.batchIndex}` : 'Lo_1',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

/**
 * Xuất file định dạng CSV RTK Controller (Dấu phẩy phân cách, nạp trực tiếp máy RTK Leica/Trimble/CHCNAV/South)
 */
export function exportRtkCsvText(items: RtkExportCandidate[], fileName: string = 'RTK_Survey_Data.csv') {
  const header = 'PointID,Northing,Easting,Elevation,Code,Latitude,Longitude,Note';
  const lines = items.map((item) => {
    return [
      item.customer.id,
      item.selectedVn2000.x.toFixed(3),
      item.selectedVn2000.y.toFixed(3),
      '0.000',
      `"${item.customer.meterSerial}"`,
      item.selectedWgs84.lat.toFixed(7),
      item.selectedWgs84.lng.toFixed(7),
      `"${item.selectedMarkerRole === 'LEFT' ? 'MocTrai' : 'MocPhai'}_d=${item.smallerDistanceMeters}m"`,
    ].join(',');
  });

  const content = '\uFEFF' + [header, ...lines].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
