import React from 'react';
import { TargetListType } from '../data/customerDatabase';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building2,
  FolderOpen,
  HelpCircle,
  FileQuestion,
  MapPin,
} from 'lucide-react';

interface ExecutiveSummaryViewProps {
  stats: {
    totalCustomers: number;
    list1Count: number;
    list2Count: number;
    list3Count: number;
    list4Count: number;
    zoneLt10mCount: number;
    zone10to20mCount: number;
    zone20to50mCount: number;
    zoneGt50mCount: number;
    skipFieldPotentialCount: number; // Tổng số hộ < 10m có thể lấy mốc ngay mà không cần đi thực địa
  };
  onSelectTargetList: (list: TargetListType) => void;
  onExportList: (list: TargetListType) => void;
}

export const ExecutiveSummaryView: React.FC<ExecutiveSummaryViewProps> = ({
  stats,
  onSelectTargetList,
  onExportList,
}) => {
  return (
    <div className="space-y-6">
      {/* Khung tổng kết chiến lược */}
      <div className="border border-slate-200 bg-white rounded-lg p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">
            Báo cáo Toàn diện Nghiệp vụ Đo đạc & Phân loại Hồ sơ Cấp nước
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Quy trình Tích hợp Bước 1 & Bước 2: Bóc tách 4 Danh sách & Phân vùng Sai số Hình học RTK
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            Hệ thống giải quyết triệt để áp lực khảo sát 1.000 khách hàng/tháng bằng cách: Đọc file Excel đầu vào, truy cập CRM nhận diện ảnh Trang 3 sổ đất VN-2000 tại Bình Dương (L0 = 105°45'), tra cứu GIS Xây dựng trước/sau sáp nhập, phân tách thành <strong>4 danh sách chuyên biệt</strong>, và tính khoảng cách hình học đối chiếu với GPS điện thoại để miễn đi thực địa cho các điểm có độ tin cậy cao.
          </p>
        </div>

        {/* 4 Danh sách kết quả then chốt của Bước 2 */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-teal-700" />
            <span>Phân loại 4 Danh sách Hồ sơ Đầu ra (Kết quả Bước 2)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* DANH SÁCH 1 */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-800">DANH SÁCH SỐ 1</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  Sổ đất có sẵn tọa độ VN-2000
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sổ hồng mới cấp, trang 3 có đầy đủ bảng tọa độ góc ranh. Đã trích xuất 2 mốc Trái/Phải và quy đổi WGS-84.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xl font-bold font-mono text-teal-800 tabular-nums">
                  {stats.list1Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectTargetList(1)}
                    className="flex-1 py-1.5 px-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded transition-colors text-center cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportList(1)}
                    className="p-1.5 text-xs text-teal-800 bg-teal-100 hover:bg-teal-200 rounded transition-colors cursor-pointer"
                    title="Xuất CSV danh sách 1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* DANH SÁCH 2 */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-800">DANH SÁCH SỐ 2</span>
                  <Building2 className="w-4 h-4 text-blue-700" />
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  Tra GIS Xây dựng có kết quả
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sổ cũ không có tọa độ nhưng tra cứu thành công trên GIS Sở Quy hoạch (trước/sau sáp nhập) và đã tải file mốc về.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xl font-bold font-mono text-blue-800 tabular-nums">
                  {stats.list2Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectTargetList(2)}
                    className="flex-1 py-1.5 px-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors text-center cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportList(2)}
                    className="p-1.5 text-xs text-blue-800 bg-blue-100 hover:bg-blue-200 rounded transition-colors cursor-pointer"
                    title="Xuất CSV danh sách 2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* DANH SÁCH 3 */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-800">DANH SÁCH SỐ 3</span>
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  Tra GIS không ra kết quả
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Có sổ đất nhưng không có tọa độ, tra GIS tự động chưa thấy. Gửi lại danh sách để người dùng tra thủ công trên GIS Quy hoạch.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xl font-bold font-mono text-amber-800 tabular-nums">
                  {stats.list3Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectTargetList(3)}
                    className="flex-1 py-1.5 px-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors text-center cursor-pointer"
                  >
                    Tra cứu thủ công
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportList(3)}
                    className="p-1.5 text-xs text-amber-800 bg-amber-100 hover:bg-amber-200 rounded transition-colors cursor-pointer"
                    title="Xuất CSV danh sách 3"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* DANH SÁCH 4 */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-red-800">DANH SÁCH SỐ 4</span>
                  <FileQuestion className="w-4 h-4 text-red-700" />
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  Thiếu thông tin sổ đất
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Khách hàng không có sổ đất (mua bán giấy tay, vi bằng, thiếu hồ sơ). Bắt buộc phải xếp lịch đi đo RTK thực tế ngoài hiện trường.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xl font-bold font-mono text-red-800 tabular-nums">
                  {stats.list4Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectTargetList(4)}
                    className="flex-1 py-1.5 px-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded transition-colors text-center cursor-pointer"
                  >
                    Lập tuyến thực địa
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportList(4)}
                    className="p-1.5 text-xs text-red-800 bg-red-100 hover:bg-red-200 rounded transition-colors cursor-pointer"
                    title="Xuất CSV danh sách 4"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PHÂN VÙNG SAI SỐ HÌNH HỌC (<10m, 10-20m, 20-50m, >50m) */}
        <div className="border-t border-slate-200 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Phân loại Vùng Khoảng cách Hình học (Đối chiếu Mốc Ranh Lối vào vs GPS Điện thoại)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Khoảng cách càng nhỏ cho thấy độ tin cậy càng lớn. Vùng &lt; 10m cho phép <strong>hoàn toàn không cần đi ghim thực tế</strong> mà lấy trực tiếp mốc ranh tiếp cận lối vào chính!
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Đã tiết kiệm đi thực địa cho: {stats.skipFieldPotentialCount} khách hàng!</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="border border-emerald-300 bg-emerald-50/70 rounded-lg p-3 text-center space-y-1">
              <div className="font-bold text-emerald-900">Vùng &lt; 10m</div>
              <div className="text-xl font-bold font-mono text-emerald-800 tabular-nums">
                {stats.zoneLt10mCount}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                Tin cậy cao (Miễn đi)
              </div>
            </div>

            <div className="border border-blue-300 bg-blue-50/70 rounded-lg p-3 text-center space-y-1">
              <div className="font-bold text-blue-900">Vùng 10m – 20m</div>
              <div className="text-xl font-bold font-mono text-blue-800 tabular-nums">
                {stats.zone10to20mCount}
              </div>
              <div className="text-[10px] text-blue-700 font-semibold uppercase">
                Tin cậy khá
              </div>
            </div>

            <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-3 text-center space-y-1">
              <div className="font-bold text-amber-900">Vùng 20m – 50m</div>
              <div className="text-xl font-bold font-mono text-amber-800 tabular-nums">
                {stats.zone20to50mCount}
              </div>
              <div className="text-[10px] text-amber-700 font-semibold uppercase">
                Cần lưu ý / Đo RTK
              </div>
            </div>

            <div className="border border-red-300 bg-red-50/70 rounded-lg p-3 text-center space-y-1">
              <div className="font-bold text-red-900">Vùng &gt; 50m</div>
              <div className="text-xl font-bold font-mono text-red-800 tabular-nums">
                {stats.zoneGt50mCount}
              </div>
              <div className="text-[10px] text-red-700 font-semibold uppercase">
                Bất thường / Cần RTK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
