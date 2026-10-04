import { CustomerProfile } from './customerDatabase';
import { buildCustomerProfileFromCrmRow } from '../utils/crmExcelParser';

/**
 * Danh sách 23 khách hàng thực tế trích xuất trực tiếp từ ảnh tệp Excel:
 * KHM_KLH_05060708_26 của người dùng
 */
export const RAW_REAL_KHM_EXCEL_ROWS = [
  {
    'MÃ SỐ': '15259324',
    ToaDoY: '109.676.883,00',
    ToaDoX: '1.066.636.375,00',
    TenThueBao: 'HUỲNH THỊ MINH PHỤNG',
    MaDanhBo: '8002010108',
  },
  {
    'MÃ SỐ': '9973191',
    ToaDoY: '109.774.104,00',
    ToaDoX: '1.066.648.687,00',
    TenThueBao: 'HỘ KINH DOANH CÂY CỘT',
    MaDanhBo: '8004030680',
  },
  {
    'MÃ SỐ': '9925910',
    ToaDoY: '109.765.514,00',
    ToaDoX: '1.066.584.173,00',
    TenThueBao: 'LÊ THỊ PHƯƠNG THÙY',
    MaDanhBo: '8004010561',
  },
  {
    'MÃ SỐ': '9176492',
    ToaDoY: '109.745.024,00',
    ToaDoX: '1.066.589.377,00',
    TenThueBao: 'BÙI THỊ KIM HIỀN',
    MaDanhBo: '8004010562',
  },
  {
    'MÃ SỐ': '9926356',
    ToaDoY: '109.851.593,00',
    ToaDoX: '1.066.492.354,00',
    TenThueBao: 'NGUYỄN NGỌC LỢI',
    MaDanhBo: '8004170306',
  },
  {
    'MÃ SỐ': '13119616',
    ToaDoY: '109.671.259,00',
    ToaDoX: '1.066.501.725,00',
    TenThueBao: 'NGUYỄN VĂN HOÀNG',
    MaDanhBo: '8002061390',
  },
  {
    'MÃ SỐ': '9968048',
    ToaDoY: '109.933.159,00',
    ToaDoX: '106.663.731,00',
    TenThueBao: 'HUỲNH MINH TUẤN',
    MaDanhBo: '8002010977',
  },
  {
    'MÃ SỐ': '9975458',
    ToaDoY: '109.680.745,00',
    ToaDoX: '1.066.604.159,00',
    TenThueBao: 'NGUYỄN TRẦN THANH SƠN',
    MaDanhBo: '8002010978',
  },
  {
    'MÃ SỐ': '9947290',
    ToaDoY: '109.747.797,00',
    ToaDoX: '1.066.675.074,00',
    TenThueBao: 'VŨ XUÂN LẬP',
    MaDanhBo: '8002090192',
  },
  {
    'MÃ SỐ': '9974848',
    ToaDoY: '109.549.381,00',
    ToaDoX: '1.066.605.346,00',
    TenThueBao: 'NGUYỄN LÝ SANG',
    MaDanhBo: '8002061389',
  },
  {
    'MÃ SỐ': '10996445',
    ToaDoY: '109.685.386,00',
    ToaDoX: '1.066.500.669,00',
    TenThueBao: 'HUỲNH VĂN MINH',
    MaDanhBo: '8002061391',
  },
  {
    'MÃ SỐ': '9972956',
    ToaDoY: '109.779.979,00',
    ToaDoX: '1.066.614.636,00',
    TenThueBao: 'HÀ THỊ HỒNG LIÊN',
    MaDanhBo: '8002030208',
  },
  {
    'MÃ SỐ': '9927606',
    ToaDoY: '109.768.025,00',
    ToaDoX: '1.066.669.005,00',
    TenThueBao: 'LÊ KHÁNH TOÀN',
    MaDanhBo: '8002030209',
  },
  {
    'MÃ SỐ': '9338478',
    ToaDoY: '109.702.105,00',
    ToaDoX: '1.066.648.911,00',
    TenThueBao: 'LÊ HỒNG PHONG',
    MaDanhBo: '8002110476',
  },
  {
    'MÃ SỐ': '9995907',
    ToaDoY: '109.695.063,00',
    ToaDoX: '1.066.655.724,00',
    TenThueBao: 'NGUYỄN DOÃN QUẾ',
    MaDanhBo: '8002190192',
  },
  {
    'MÃ SỐ': '10992470',
    ToaDoY: '109.688.052,00',
    ToaDoX: '1.066.662.916,00',
    TenThueBao: 'TRẦN THOẠI TRANG',
    MaDanhBo: '8002190193',
  },
  {
    'MÃ SỐ': '10947624',
    ToaDoY: '109.955.383,00',
    ToaDoX: '1.066.511.871,00',
    TenThueBao: 'TRẦN SIẾU HIÊN',
    MaDanhBo: '8003020523',
  },
  {
    'MÃ SỐ': '10895068',
    ToaDoY: '10.985.259,00',
    ToaDoX: '1.066.653.294,00',
    TenThueBao: 'LÊ BÁ PHƯỚC',
    MaDanhBo: '8003020524',
  },
  {
    'MÃ SỐ': '10932515',
    ToaDoY: '109.851.869,00',
    ToaDoX: '1.066.652.154,00',
    TenThueBao: 'LÊ BÁ PHƯỚC (2)',
    MaDanhBo: '8003020525',
  },
  {
    'MÃ SỐ': '10670303',
    ToaDoY: '109.852.301,00',
    ToaDoX: '1.066.653.052,00',
    TenThueBao: 'LÊ BÁ PHƯỚC (1)',
    MaDanhBo: '8003020526',
  },
  {
    'MÃ SỐ': '10871761',
    ToaDoY: '110.165.681,00',
    ToaDoX: '1.066.397.353,00',
    TenThueBao: 'TRẦN THỊ ÁNH TUYẾT',
    MaDanhBo: '8001100030',
  },
  {
    'MÃ SỐ': '10674169',
    ToaDoY: '109.951.616,00',
    ToaDoX: '1.066.462.799,00',
    TenThueBao: 'LÊ THỊ NGỌC PHƯỢNG',
    MaDanhBo: '8001060368',
  },
  {
    'MÃ SỐ': '9950053',
    ToaDoY: '109.936.189,00',
    ToaDoX: '1.066.474.258,00',
    TenThueBao: 'PHẠM THỊ PHƯƠNG',
    MaDanhBo: '8001060369',
  },
];

/**
 * Danh sách đối tượng khách hàng hoàn chỉnh đã chuẩn hóa từ danh sách thực tế KHM
 */
export const REAL_CUSTOMERS_KHM: CustomerProfile[] = RAW_REAL_KHM_EXCEL_ROWS.map(
  (row, index) => buildCustomerProfileFromCrmRow(row, index)
);
