import { Vn2000Vertex } from '../utils/vn2000';
import { REAL_CUSTOMERS_KHM } from './realBatchKhm';
import { buildRealCrmCustomerProfiles } from './realBatchCrmTable';

export const REAL_CRM_33_CUSTOMERS = buildRealCrmCustomerProfiles();

export type TargetListType = 1 | 2 | 3 | 4;

export interface CrmAttachedPhoto {
  id: string;
  title: string;
  fileName?: string;
  type:
    | 'DEED_COVER'
    | 'DEED_OWNER_INFO'
    | 'DEED_PAGE3_MAP_COORDS'
    | 'FIELD_FRONTAGE'
    | 'CCCD_IDENTITY'
    | 'WATER_METER_INSPECTION'
    | 'INVOICE_BILL'
    | 'OTHER';
  description: string;
  hasCoordinatesTable: boolean;
  isSurveyRelated?: boolean; // true nếu liên quan trắc địa (Sổ đất / sơ đồ / bảng tọa độ)
  imageUrl?: string;
  extractedMetadata?: {
    plotNumber?: number;
    sheetNumber?: number;
    landAddress?: string;
    hasVn2000Table: boolean;
    vertices?: Vn2000Vertex[];
  };
}

export interface CrmExecutionAuditLog {
  id: string;
  customerId: string;
  maDanhBo: string;
  customerName: string;
  timestamp: string;
  totalPhotosScanned: number;
  scannedPhotoTitles: string[];
  matchedPhotoIndex: number | null;
  matchedPhotoTitle: string | null;
  rawOcrOutput: {
    sheetNumber?: number | string | null;
    plotNumber?: number | string | null;
    landAddress?: string | null;
    ownerName?: string | null;
    certificateSerial?: string | null;
    hasVn2000Table: boolean;
    rawVertices: { id: string; x: number | null; y: number | null }[];
    notes?: string;
  };
  status: 'SUCCESS_WITH_COORDS' | 'NO_COORDS_ON_DEED' | 'UNREADABLE_OR_BLURRY' | 'NO_DEED_FOUND';
  statusMessage: string;
  actionTaken: string;
}

export interface CustomerProfile {
  id: string; // Mã khách hàng (Mã danh bộ)
  customerName: string;
  phone: string;
  address: string;
  ward: string;
  district: string; // TP. Dĩ An, TP. Thuận An, TP. Thủ Dầu Một, TP. Tân Uyên, Bến Cát...
  provinceCode: string; // "BDG" (Bình Dương)
  meterSerial: string;
  intakeOfficer: string;
  createdDate: string;
  intakeMonth: '2026-05' | '2026-06' | '2026-07' | '2026-08' | '2026-09' | '2026-10'; // Tháng hồ sơ (màu ghim theo tháng)
  isSurveyPinned: boolean; // Đã đi ghim thực địa (Màu xanh dương)

  // Tọa độ GPS lấy bằng điện thoại trong file Excel đầu vào
  phoneGps: {
    lat: number;
    lng: number;
    accuracyMeters: number;
  };

  // Thông tin nhận diện từ ảnh hồ sơ CRM
  crmPhotos: CrmAttachedPhoto[];
  matchedDeedPhotoIndex?: number; // Chỉ mục (index) bức ảnh sổ đất đã nhận diện thành công
  matchedDeedPhotoTitle?: string; // Tên ảnh sổ đất đã nhận diện thành công
  auditLog?: CrmExecutionAuditLog; // Bản ghi audit log chi tiết quá trình duyệt ảnh và OCR
  hasDeed: boolean;
  certificateSerial?: string;
  sheetNumber?: number;
  plotNumber?: number;

  // Tra cứu theo 2 phương án: Trước sáp nhập và Sau sáp nhập
  preMergerInfo?: {
    sheetNumber: number;
    plotNumber: number;
    ward: string;
  };
  postMergerInfo?: {
    sheetNumber: number;
    plotNumber: number;
    ward: string;
  };

  hasVn2000OnDeed: boolean; // Sổ mới có bảng tọa độ ở trang 3
  gisLookupStatus: 'FOUND' | 'NOT_FOUND' | 'NOT_NEEDED' | 'NO_DEED';
  gisNotes?: string;

  // Tra cứu 2 thửa đất lân cận (bên trái và bên phải) khi thửa chính chưa cập nhật quy hoạch trên GIS:
  adjacentGisLookup?: {
    leftPlotNumber?: number; // Số thửa bên trái (plot - 1)
    rightPlotNumber?: number; // Số thửa bên phải (plot + 1)
    foundAdjacentSide?: 'LEFT' | 'RIGHT' | 'BOTH' | 'NONE'; // Tìm thấy thửa giáp ranh bên nào
    foundPlotNumber?: number; // Số thửa giáp ranh tìm thấy trên GIS
    sharedMarkerSide?: 'LEFT' | 'RIGHT' | 'BOTH'; // Cạnh chung mặt tiền được lấy làm tọa độ mốc
    sharedMarkerDescription?: string; // Ghi chú chi tiết căn cứ mốc
  };

  mainRoadName: string;
  frontageEdgeIndex: number; // Cạnh tiếp cận lối vào chính
  vertices: Vn2000Vertex[]; // Bảng tọa độ VN-2000

  // Bổ sung theo chỉ đạo người dùng:
  maDanhBo?: string; // Khóa tìm kiếm chính CRM (Mã danh bộ cấp nước, ví dụ: 8002010108)
  isCornerPlot?: boolean; // Thửa đất góc 2 mặt tiền
  roadFrontages?: {
    edgeIndex: number;
    roadName: string;
    isPrimaryFromAddress: boolean;
  }[];
  appliedCorrectionMethod?: 'PHUONG_AN_A' | 'NONE'; // Phương án A: Ưu tiên tọa độ mốc ranh sổ đất khi điện thoại sai số

  targetList: TargetListType; // 1, 2, 3, hoặc 4
  notes?: string;
}

export const INITIAL_CUSTOMERS: CustomerProfile[] = [
  // ==================== 33 KHÁCH HÀNG THỰC TẾ CRM BIWASE (THEO BẢNG TEST TRỰC TIẾP TỪ NGƯỜI DÙNG) ====================
  ...REAL_CRM_33_CUSTOMERS,

  // ==================== KHÁCH HÀNG THỰC TẾ TỪ FILE KHM_KLH ====================
  ...REAL_CUSTOMERS_KHM,
];

