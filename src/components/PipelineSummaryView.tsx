import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CustomerProfile, TargetListType } from '../data/customerDatabase';
import { PipelineSummaryStats } from '../utils/pipelineRunner';
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Eye,
  FileSpreadsheet,
  Globe,
  Database,
  Building2,
  Check,
  Compass,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  FileText,
  MapPin,
  Pencil,
  Zap,
  Layers,
  FileCode,
} from 'lucide-react';
import { convertVn2000ToWgs84, convertWgs84ToVn2000, distanceVn2000, formatWgs84Coordinate, formatVn2000Coordinate } from '../utils/vn2000';

interface PipelineSummaryViewProps {
  customers: CustomerProfile[];
  stats: PipelineSummaryStats;
  onSelectCustomer: (customerId: string) => void;
  onOpenCadView: (customerId: string) => void;
  onOpenCrmModal: (customerId: string) => void;
  onOpenGisModal: (customerId: string) => void;
  onExportRtkBatch: () => void;
  onOpenPhotoGallery?: (customerId: string, photoIndex?: number) => void;
  onOpenAuditLog?: (customerId: string) => void;
  onExportAllAuditLogs?: () => void;
}

export const PipelineSummaryView: React.FC<PipelineSummaryViewProps> = ({
  customers,
  stats,
  onSelectCustomer,
  onOpenCadView,
  onOpenCrmModal,
  onOpenGisModal,
  onExportRtkBatch,
  onOpenPhotoGallery,
  onOpenAuditLog,
  onExportAllAuditLogs,
}) => {
  const [filterStep, setFilterStep] = useState<'ALL' | 'STEP_1_CRM' | 'STEP_2_GIS' | 'STEP_3_REMAINING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string>(customers[0]?.id || '');

  // Lọc danh sách theo filterStep và từ khóa tìm kiếm
  const filteredList = useMemo(() => {
    return customers.filter((c) => {
      // Lọc theo bước quy trình
      if (filterStep === 'STEP_1_CRM' && c.targetList !== 1) return false;
      if (filterStep === 'STEP_2_GIS' && c.targetList !== 2) return false;
      if (filterStep === 'STEP_3_REMAINING' && c.targetList !== 3 && c.targetList !== 4) return false;

      // Lọc theo từ khóa
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const db = (c.maDanhBo || c.meterSerial.replace('DB-', '')).toLowerCase();
      return (
        db.includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [customers, filterStep, searchQuery]);

  const selectedCustomer = customers.find((c) => c.id === selectedRowId) || filteredList[0] || customers[0];

  // Xuất file Excel Báo Cáo Tổng Hợp Đầy Đủ 3 Nhóm
  // Xuất file Excel Báo Cáo Tổng Hợp Đầy Đủ Các Nhóm
  const handleExportSummaryExcel = () => {
    const rows = customers.map((c, i) => {
      const v = c.vertices;
      const fe = c.frontageEdgeIndex || 0;
      const p1 = v && v.length > fe ? v[fe] : null;
      const p2 = v && v.length > 0 ? v[(fe + 1) % v.length] : null;
      const wgs1 = p1 ? convertVn2000ToWgs84(p1.x, p1.y, 105.75, 0.9999) : null;
      const wgs2 = p2 ? convertVn2000ToWgs84(p2.x, p2.y, 105.75, 0.9999) : null;

      // Tính khoảng cách sai số hình học
      let distanceMeters: number | string = '—';
      let zoneLabel = 'Chưa có mốc đối chiếu';
      let canSkipField = 'Bắt buộc đo RTK';

      if (p1 && p2 && c.targetList !== 3 && c.targetList !== 4) {
        const phoneVn = convertWgs84ToVn2000(c.phoneGps.lat, c.phoneGps.lng, 105.75, 0.9999);
        const d1 = distanceVn2000(phoneVn, p1);
        const d2 = distanceVn2000(phoneVn, p2);
        const d = Math.round(Math.min(d1, d2) * 10) / 10;
        distanceMeters = d;
        if (d <= 10.0) {
          zoneLabel = 'Vùng A (≤10m)';
          canSkipField = 'Miễn đi thực tế (Lấy mốc ngay)';
        } else if (d <= 20.0) {
          zoneLabel = 'Vùng B (10-20m)';
          canSkipField = 'Miễn đi thực tế (Lấy mốc ngay)';
        } else if (d <= 50.0) {
          zoneLabel = 'Vùng C (20-50m)';
          canSkipField = 'Cần đối chiếu / Đo RTK';
        } else {
          zoneLabel = 'Vùng D (>50m)';
          canSkipField = 'Cần đối chiếu / Đo RTK';
        }
      }

      let stepResult = 'Bước 3: Còn lại (Cần đo RTK)';
      if (c.targetList === 1) stepResult = 'Bước 1: CRM Đạt (Có sẵn tọa độ Trang 3)';
      else if (c.targetList === 2) {
        stepResult = c.adjacentGisLookup?.foundAdjacentSide !== 'NONE' && c.adjacentGisLookup?.foundPlotNumber
          ? `Bước 2: GIS Đạt (Mốc cạnh chung Thửa ${c.adjacentGisLookup.foundPlotNumber})`
          : 'Bước 2: GIS Đạt (Đã tải mốc từ GIS Xây dựng)';
      }
      else if (c.targetList === 3) stepResult = 'Bước 3: Còn lại (Tra GIS & 2 thửa lân cận không ra)';
      else if (c.targetList === 4) stepResult = 'Bước 3: Còn lại (Chưa có sổ / Giấy tay vi bằng)';

      let adjacentNote = '—';
      if (c.adjacentGisLookup?.foundAdjacentSide === 'LEFT') {
        adjacentNote = `Cạnh chung với Thửa giáp ranh bên trái (Thửa ${c.adjacentGisLookup.foundPlotNumber})`;
      } else if (c.adjacentGisLookup?.foundAdjacentSide === 'RIGHT') {
        adjacentNote = `Cạnh chung với Thửa giáp ranh bên phải (Thửa ${c.adjacentGisLookup.foundPlotNumber})`;
      } else if (c.targetList === 3) {
        adjacentNote = `Tra Thửa ${c.plotNumber} & cả 2 thửa giáp ranh (${c.adjacentGisLookup?.leftPlotNumber ?? ((c.plotNumber || 300) - 1)} & ${c.adjacentGisLookup?.rightPlotNumber ?? ((c.plotNumber || 300) + 1)}) đều không ra trên GIS`;
      }

      return {
        STT: i + 1,
        'MÃ DANH BỘ': c.maDanhBo || c.meterSerial.replace('DB-', ''),
        'MÃ CRM': c.id,
        'TÊN KHÁCH HÀNG': c.customerName,
        'KẾT QUẢ QUY TRÌNH': stepResult,
        'PHÂN LOẠI DANH SÁCH': `Danh sách ${c.targetList}`,
        'ĐỊA CHỈ LẮP MỚI': c.address,
        'PHƯỜNG XÃ': c.ward,
        'QUẬN HUYỆN': c.district,
        'GPS VĨ ĐỘ (LAT)': formatWgs84Coordinate(c.phoneGps.lat, 8),
        'GPS KINH ĐỘ (LNG)': formatWgs84Coordinate(c.phoneGps.lng, 8),
        'SỐ TỜ': c.sheetNumber || '—',
        'SỐ THỬA': c.plotNumber || '—',
        'THỬA GIÁP RANH / CẠNH CHUNG': adjacentNote,
        'MẶT TIỀN TIẾP CẬN': c.mainRoadName,
        'MỐC TRÁI WGS84 (LAT)': wgs1 ? formatWgs84Coordinate(wgs1.lat, 8) : '—',
        'MỐC TRÁI WGS84 (LNG)': wgs1 ? formatWgs84Coordinate(wgs1.lng, 8) : '—',
        'MỐC TRÁI VN2000 X': p1 ? formatVn2000Coordinate(p1.x, 3) : '—',
        'MỐC TRÁI VN2000 Y': p1 ? formatVn2000Coordinate(p1.y, 3) : '—',
        'MỐC PHẢI WGS84 (LAT)': wgs2 ? formatWgs84Coordinate(wgs2.lat, 8) : '—',
        'MỐC PHẢI WGS84 (LNG)': wgs2 ? formatWgs84Coordinate(wgs2.lng, 8) : '—',
        'MỐC PHẢI VN2000 X': p2 ? formatVn2000Coordinate(p2.x, 3) : '—',
        'MỐC PHẢI VN2000 Y': p2 ? formatVn2000Coordinate(p2.y, 3) : '—',
        'SAI SỐ HÌNH HỌC d (m)': distanceMeters,
        'PHÂN VÙNG SAI SỐ': zoneLabel,
        'TIÊU CHÍ MIỄN ĐI THỰC TẾ': canSkipField,
        'GHI CHÚ QUY TRÌNH': c.notes || '—',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'BANG_TONG_HOP_CRM_GIS');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `DanhSach_TongHop_QuyTrinh_CRM_GIS_${today}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* BANNER TỔNG HỢP TIẾN ĐỘ QUY TRÌNH CRM -> GIS -> CÒN LẠI */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                BẢNG DANH SÁCH TỔNG HỢP: QUY TRÌNH TỰ ĐỘNG CRM → GIS → CÒN LẠI
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Đã tự động xóa danh sách cũ và nạp mới <strong>{stats.total} hồ sơ</strong>. Hệ thống tự động phân loại tuần tự qua 3 bước và hiển thị danh sách tổng hợp trước để bạn tra cứu nhanh.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSummaryExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Xuất Excel danh sách tổng hợp toàn bộ các hộ"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Xuất Excel Tổng Hợp</span>
            </button>

            <button
              type="button"
              onClick={onExportRtkBatch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Xuất file mốc chuẩn máy RTK cho các hộ đã có mốc"
            >
              <Download className="w-4 h-4" />
              <span>Xuất File RTK ({stats.skipFieldPotentialCount} hộ)</span>
            </button>
          </div>
        </div>

        {/* 4 THẺ THỐNG KÊ 3 BƯỚC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Card 1: Tổng hồ sơ */}
          <div
            onClick={() => setFilterStep('ALL')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStep === 'ALL'
                ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-slate-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>TỔNG TIẾP NHẬN</span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 tabular-nums">
              {stats.total} <span className="text-xs font-normal">hồ sơ</span>
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              100% hồ sơ trong đợt nạp mới
            </div>
          </div>

          {/* Card 2: Bước 1 - CRM Đạt */}
          <div
            onClick={() => setFilterStep('STEP_1_CRM')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStep === 'STEP_1_CRM'
                ? 'bg-emerald-900 text-white border-emerald-700 ring-2 ring-emerald-500 shadow-sm'
                : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>BƯỚC 1: CRM ĐẠT (DS 1)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 tabular-nums text-emerald-800">
              {stats.step1CrmCount} <span className="text-xs font-normal">hộ</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Có sẵn tọa độ Trang 3 sổ đất (Khóa RTK)
            </div>
          </div>

          {/* Card 3: Bước 2 - GIS Đạt */}
          <div
            onClick={() => setFilterStep('STEP_2_GIS')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStep === 'STEP_2_GIS'
                ? 'bg-sky-900 text-white border-sky-700 ring-2 ring-sky-500 shadow-sm'
                : 'bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>BƯỚC 2: GIS ĐẠT (DS 2)</span>
              <Globe className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 tabular-nums text-sky-800">
              {stats.step2GisCount} <span className="text-xs font-normal">hộ</span>
            </div>
            <div className="text-[11px] text-sky-700 mt-0.5">
              Đã tải tệp mốc từ GIS Xây dựng SQHKT
            </div>
          </div>

          {/* Card 4: Bước 3 - Còn lại (Cần đi thực địa) */}
          <div
            onClick={() => setFilterStep('STEP_3_REMAINING')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStep === 'STEP_3_REMAINING'
                ? 'bg-rose-900 text-white border-rose-700 ring-2 ring-rose-500 shadow-sm'
                : 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>BƯỚC 3: CÒN LẠI (DS 3 & 4)</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 tabular-nums text-rose-800">
              {stats.step3RemainingCount} <span className="text-xs font-normal">hộ</span>
            </div>
            <div className="text-[11px] text-rose-700 mt-0.5">
              Không tìm ra GIS / Giấy tay → Đo RTK thực địa
            </div>
          </div>
        </div>

        {/* DÒNG TÓM TẮT HIỆU QUẢ */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Quy trình tự động đã tiết kiệm đi thực địa cho: <strong>{stats.skipFieldPotentialCount} / {stats.total} hộ</strong> (Tỷ lệ thành công tự động: <strong>{stats.autoSuccessRate}%</strong>)
            </span>
          </div>

          <span className="text-[11px] text-slate-500">
            Chỉ còn <strong>{stats.step3RemainingCount} hộ</strong> cần kỹ thuật viên mang máy RTK ra hiện trường đo thực tế.
          </span>
        </div>
      </div>

      {/* THANH TÌM KIẾM VÀ DANH SÁCH TỔNG HỢP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT CHÍNH: BẢNG DANH SÁCH TỔNG HỢP (7 HOẶC 8 PHẦN) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
          {/* THANH TIẾN TRÌNH TỰ ĐỘNG HÓA QUY TRÌNH (PROGRESS BAR) */}
          {(() => {
            const totalCount = stats.total || customers.length || 1;
            const crmCount = stats.step1CrmCount;
            const gisCount = stats.step2GisCount;
            const remainingCount = stats.step3RemainingCount;
            const processedCount = crmCount + gisCount + remainingCount;
            const progressPercent = Math.min(100, Math.round((processedCount / totalCount) * 100));

            const crmPercent = Math.round((crmCount / totalCount) * 100);
            const gisPercent = Math.round((gisCount / totalCount) * 100);
            const remainingPercent = Math.max(0, 100 - crmPercent - gisPercent);

            return (
              <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-700/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold text-xs sm:text-sm tracking-wide text-emerald-300 uppercase">
                      Tiến Trình Tự Động Hóa CRM → GIS → RTK
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 font-semibold">
                      Hoàn thành {progressPercent}%
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-300">
                    Đã xử lý:{' '}
                    <strong className="text-white text-sm">
                      {processedCount}
                    </strong>{' '}
                    / <span className="text-slate-400">{totalCount} khách hàng</span>
                  </div>
                </div>

                {/* THANH PROGRESS BAR ĐA PHÂN ĐOẠN (MULTI-SEGMENT PROGRESS BAR) */}
                <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 overflow-hidden flex border border-slate-700/60 shadow-inner">
                  {/* Phân đoạn 1: CRM Đạt (Emerald) */}
                  <div
                    style={{ width: `${crmPercent}%` }}
                    className="bg-emerald-500 h-full rounded-l-full transition-all duration-500 relative group cursor-pointer hover:brightness-110"
                    title={`Bước 1: CRM có sẵn tọa độ: ${crmCount} hộ (${crmPercent}%)`}
                  />
                  {/* Phân đoạn 2: GIS Đạt (Sky) */}
                  <div
                    style={{ width: `${gisPercent}%` }}
                    className="bg-sky-500 h-full transition-all duration-500 relative group cursor-pointer hover:brightness-110"
                    title={`Bước 2: Cổng GIS trích xuất mốc: ${gisCount} hộ (${gisPercent}%)`}
                  />
                  {/* Phân đoạn 3: Còn lại (Rose) */}
                  <div
                    style={{ width: `${remainingPercent}%` }}
                    className="bg-rose-500 h-full rounded-r-full transition-all duration-500 relative group cursor-pointer hover:brightness-110"
                    title={`Bước 3: Còn lại cần đo RTK: ${remainingCount} hộ (${remainingPercent}%)`}
                  />
                </div>

                {/* CHÚ THÍCH PHÂN LOẠI & TỶ LỆ TỰ ĐỘNG THÀNH CÔNG */}
                <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3 text-[11px] pt-0.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-emerald-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>
                        CRM Đạt: <strong>{crmCount}</strong> ({crmPercent}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sky-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                      <span>
                        GIS Đạt: <strong>{gisCount}</strong> ({gisPercent}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                      <span>
                        Còn lại (RTK): <strong>{remainingCount}</strong> ({remainingPercent}%)
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-300 text-[11px]">
                    Miễn đi thực địa:{' '}
                    <strong className="text-emerald-300 font-bold">
                      {stats.autoSuccessRate}%
                    </strong>{' '}
                    ({stats.skipFieldPotentialCount} hộ)
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm Mã danh bộ, tên khách hàng, địa chỉ..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Lọc bước:</span>
              <button
                type="button"
                onClick={() => setFilterStep('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterStep === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Tất cả ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStep('STEP_1_CRM')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterStep === 'STEP_1_CRM' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                CRM ({stats.step1CrmCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStep('STEP_2_GIS')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterStep === 'STEP_2_GIS' ? 'bg-sky-700 text-white' : 'bg-sky-100 text-sky-800'
                }`}
              >
                GIS ({stats.step2GisCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStep('STEP_3_REMAINING')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterStep === 'STEP_3_REMAINING' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
                }`}
              >
                Còn lại ({stats.step3RemainingCount})
              </button>

              {onExportAllAuditLogs && (
                <button
                  type="button"
                  onClick={onExportAllAuditLogs}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 cursor-pointer transition-colors shadow-2xs ml-auto"
                  title="Xuất toàn bộ File Log OCR của tất cả hồ sơ (.json)"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Xuất File Log OCR (.json)</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">STT</th>
                  <th className="py-2.5 px-3">Mã Danh Bộ</th>
                  <th className="py-2.5 px-3">Khách Hàng & Địa Chỉ</th>
                  <th className="py-2.5 px-3">Phân Loại Quy Trình</th>
                  <th className="py-2.5 px-3">Sổ Đất / Giáp Ranh</th>
                  <th className="py-2.5 px-3">Mốc Trái (WGS-84)</th>
                  <th className="py-2.5 px-3">Mốc Phải (WGS-84)</th>
                  <th className="py-2.5 px-3">Sai Số Hình Học (Bước 2)</th>
                  <th className="py-2.5 px-3 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.map((c, idx) => {
                  const db = c.maDanhBo || c.meterSerial.replace('DB-', '');
                  const isSelected = selectedRowId === c.id;
                  const v = c.vertices;
                  const fe = c.frontageEdgeIndex || 0;
                  const p1 = v && v.length > fe ? v[fe] : null;
                  const p2 = v && v.length > 0 ? v[(fe + 1) % v.length] : null;
                  const wgs1 = p1 ? convertVn2000ToWgs84(p1.x, p1.y, 105.75, 0.9999) : null;
                  const wgs2 = p2 ? convertVn2000ToWgs84(p2.x, p2.y, 105.75, 0.9999) : null;

                  // Tính sai số hình học
                  let distanceVal: number | null = null;
                  let zoneLabel = '';
                  let zoneClass = '';
                  let canSkip = false;

                  if (p1 && p2 && c.targetList !== 3 && c.targetList !== 4) {
                    const phoneVn = convertWgs84ToVn2000(c.phoneGps.lat, c.phoneGps.lng, 105.75, 0.9999);
                    const d1 = distanceVn2000(phoneVn, p1);
                    const d2 = distanceVn2000(phoneVn, p2);
                    distanceVal = Math.round(Math.min(d1, d2) * 10) / 10;
                    if (distanceVal <= 10.0) {
                      zoneLabel = 'Vùng A (≤10m)';
                      zoneClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      canSkip = true;
                    } else if (distanceVal <= 20.0) {
                      zoneLabel = 'Vùng B (10-20m)';
                      zoneClass = 'bg-blue-100 text-blue-800 border-blue-300';
                      canSkip = true;
                    } else if (distanceVal <= 50.0) {
                      zoneLabel = 'Vùng C (20-50m)';
                      zoneClass = 'bg-amber-100 text-amber-800 border-amber-300';
                      canSkip = false;
                    } else {
                      zoneLabel = 'Vùng D (>50m)';
                      zoneClass = 'bg-rose-100 text-rose-800 border-rose-300';
                      canSkip = false;
                    }
                  }

                  let stepBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>1. CRM Đạt (Trang 3)</span>
                    </span>
                  );

                  if (c.targetList === 2) {
                    if (c.adjacentGisLookup && c.adjacentGisLookup.foundAdjacentSide !== 'NONE') {
                      stepBadge = (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                            <Layers className="w-3 h-3 text-teal-700" />
                            <span>DS 2: Mốc cạnh chung Thửa {c.adjacentGisLookup.foundPlotNumber}</span>
                          </span>
                          <div className="text-[9.5px] text-teal-800 font-medium">
                            ({c.adjacentGisLookup.foundAdjacentSide === 'LEFT' ? '← Giáp ranh bên trái' : 'Giáp ranh bên phải →'})
                          </div>
                        </div>
                      );
                    } else {
                      stepBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                          <Globe className="w-3 h-3 text-sky-600" />
                          <span>2. GIS Đạt (gisxaydung)</span>
                        </span>
                      );
                    }
                  } else if (c.targetList === 3) {
                    stepBadge = (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <HelpCircle className="w-3 h-3 text-amber-600" />
                          <span>3. DS 3: Tra GIS không ra</span>
                        </span>
                        <div className="text-[9.5px] text-amber-700">
                          (Kể cả 2 thửa lân cận)
                        </div>
                      </div>
                    );
                  } else if (c.targetList === 4) {
                    stepBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>3. DS 4: Chưa có sổ / Vi bằng</span>
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setSelectedRowId(c.id);
                        onSelectCustomer(c.id);
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-teal-50/80 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>

                      {/* Mã Danh Bộ */}
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-700 bg-amber-50/50">
                        {db}
                      </td>

                      {/* Khách hàng & Địa chỉ */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{c.customerName}</div>
                        <div className="text-slate-600 text-[11px] truncate max-w-[170px] mt-0.5">
                          {c.address}
                        </div>
                        <div className="text-slate-400 text-[10px] font-mono mt-0.5">
                          GPS: {formatWgs84Coordinate(c.phoneGps.lat, 6)}, {formatWgs84Coordinate(c.phoneGps.lng, 6)}
                        </div>
                      </td>

                      {/* Phân loại quy trình */}
                      <td className="py-2.5 px-3 align-top">{stepBadge}</td>

                      {/* Sổ đất / Giáp ranh */}
                      <td className="py-2.5 px-3 align-top">
                        {c.hasDeed ? (
                          <div className="space-y-1">
                            <div className="font-mono text-slate-900 font-bold text-xs flex items-center gap-1.5">
                              <span>Thửa {c.plotNumber ?? '—'}</span>
                              <span className="text-slate-400">/</span>
                              <span>Tờ {c.sheetNumber ?? '—'}</span>
                            </div>
                            <div className="text-[10.5px] text-slate-700 font-medium truncate max-w-[150px]">
                              {c.ward || 'Phường Hòa Lợi'}
                            </div>
                            {c.adjacentGisLookup?.foundPlotNumber && (
                              <div className="text-[9.5px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-1 py-0.5 rounded">
                                Cạnh chung Thửa {c.adjacentGisLookup.foundPlotNumber} ({c.adjacentGisLookup.foundAdjacentSide === 'LEFT' ? 'bên trái' : 'bên phải'})
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-1">
                              {c.hasVn2000OnDeed ? (
                                <span className="inline-block text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                                  ✓ Có Bảng Tọa Độ Trang 3
                                </span>
                              ) : (
                                <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                                  ⚠️ Không in tọa độ $\to$ Tra GIS
                                </span>
                              )}

                              {c.matchedDeedPhotoIndex !== undefined ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenPhotoGallery) {
                                      onOpenPhotoGallery(c.id, c.matchedDeedPhotoIndex);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  title="Xem lại ảnh sổ đất đã nhận diện thành công"
                                >
                                  <span>📷 Ảnh Sổ #{c.matchedDeedPhotoIndex + 1}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenPhotoGallery) {
                                      onOpenPhotoGallery(c.id, c.hasVn2000OnDeed ? 2 : 1);
                                    }
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[8.5px] text-slate-500 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-1 py-0.5 rounded cursor-pointer"
                                  title="Mở Gallery duyệt ảnh và xem sổ đỏ"
                                >
                                  <span>🔍 Duyệt ảnh</span>
                                </button>
                              )}
                            </div>
                            <div className="text-slate-500 text-[10px] truncate max-w-[140px]">
                              {c.mainRoadName}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-rose-700 font-semibold text-[11px] flex items-center gap-1">
                              <span>Chưa có sổ đỏ CRM</span>
                            </div>
                            <span className="inline-block text-[9px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              Không có GCN / Vi bằng
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Mốc Trái (WGS-84 / VN-2000) */}
                      <td className="py-2.5 px-3 align-top font-mono tabular-nums">
                        {p1 && wgs1 && c.targetList !== 3 ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="font-bold text-sky-800 font-sans text-[10px]">
                              {c.adjacentGisLookup?.sharedMarkerSide === 'LEFT'
                                ? `Đỉnh 1 (Cạnh chung Thửa ${c.adjacentGisLookup.foundPlotNumber})`
                                : `Đỉnh 1 (Trái)`}
                            </div>
                            <div className="text-slate-900 font-semibold leading-tight">
                              {formatWgs84Coordinate(wgs1.lat, 8)}
                              <br />
                              {formatWgs84Coordinate(wgs1.lng, 8)}
                            </div>
                            <div className="text-[9.5px] text-slate-500">
                              X: {p1?.x != null ? Number(p1.x).toFixed(2) : '—'} · Y: {p1?.y != null ? Number(p1.y).toFixed(2) : '—'}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50/80 border border-amber-200 rounded p-1.5 text-center space-y-0.5">
                            <div className="text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1 font-sans">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Chưa xác định mốc
                            </div>
                            <div className="text-[9px] text-amber-700 font-sans">
                              Tra GIS không ra 2 thửa lân cận
                            </div>
                            <div className="text-[9px] font-bold text-red-700 font-sans">
                              ⚡ Bắt buộc đo RTK
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Mốc Phải (WGS-84 / VN-2000) */}
                      <td className="py-2.5 px-3 align-top font-mono tabular-nums">
                        {p2 && wgs2 && c.targetList !== 3 ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="font-bold text-emerald-800 font-sans text-[10px]">
                              {c.adjacentGisLookup?.sharedMarkerSide === 'RIGHT'
                                ? `Đỉnh 2 (Cạnh chung Thửa ${c.adjacentGisLookup.foundPlotNumber})`
                                : `Đỉnh 2 (Phải)`}
                            </div>
                            <div className="text-slate-900 font-semibold leading-tight">
                              {formatWgs84Coordinate(wgs2.lat, 8)}
                              <br />
                              {formatWgs84Coordinate(wgs2.lng, 8)}
                            </div>
                            <div className="text-[9.5px] text-slate-500">
                              X: {p2?.x != null ? Number(p2.x).toFixed(2) : '—'} · Y: {p2?.y != null ? Number(p2.y).toFixed(2) : '—'}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50/80 border border-amber-200 rounded p-1.5 text-center space-y-0.5">
                            <div className="text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1 font-sans">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Chưa xác định mốc
                            </div>
                            <div className="text-[9px] text-amber-700 font-sans">
                              Không có căn cứ mốc
                            </div>
                            <div className="text-[9px] font-bold text-red-700 font-sans">
                              ⚡ Bắt buộc đo RTK
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Sai Số Hình Học (Bước 2) */}
                      <td className="py-2.5 px-3 align-top font-mono tabular-nums">
                        {distanceVal !== null && c.targetList !== 3 ? (
                          <div className="space-y-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${zoneClass}`}>
                              {zoneLabel}
                            </span>
                            <div className="text-slate-900 font-bold text-xs">
                              d = {distanceVal}m
                            </div>
                            <div className="text-[9.5px] font-sans">
                              {canSkip ? (
                                <span className="text-emerald-700 font-semibold">✓ Miễn đi thực tế</span>
                              ) : (
                                <span className="text-amber-700 font-semibold">Cần đo RTK</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50/70 border border-amber-200 rounded p-1.5 text-[10px] space-y-0.5 font-sans">
                            <div className="font-bold text-amber-900 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-amber-600" />
                              Chưa có mốc GIS
                            </div>
                            <div className="text-[9px] text-amber-800">
                              Ranh chưa cập nhật quy hoạch
                            </div>
                            <div className="text-[9px] font-bold text-red-700">
                              ⚡ Đo RTK thực địa
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Chi Tiết */}
                      <td className="py-2.5 px-3 text-right align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenAuditLog && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAuditLog(c.id);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                              title="Xem nhật ký File Log trích xuất ảnh OCR"
                            >
                              <FileCode className="w-3 h-3 text-blue-600" />
                              <span>Log OCR</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRowId(c.id);
                              onSelectCustomer(c.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
                            title="Nhấn vào để xem chi tiết hồ sơ này"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Chi tiết 🔍</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CỘT PHỤ (4 PHẦN): NGĂN XEM CHI TIẾT HỒ SƠ ĐANG CHỌN */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-teal-700" />
              <span>Chi Tiết Hồ Sơ Đang Chọn</span>
            </span>
            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {selectedCustomer?.maDanhBo || selectedCustomer?.meterSerial.replace('DB-', '')}
            </span>
          </div>

          {selectedCustomer ? (
            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {selectedCustomer.customerName}
                </h4>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Mã CRM: <strong className="font-mono text-teal-800">{selectedCustomer.id}</strong> · Số ĐH: <strong className="font-mono">{selectedCustomer.meterSerial}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                <div>• <strong>Địa chỉ</strong>: {selectedCustomer.address}, {selectedCustomer.ward}</div>
                <div>• <strong>GPS điện thoại</strong>: <span className="font-mono text-slate-800 font-medium">{formatWgs84Coordinate(selectedCustomer.phoneGps.lat, 8)}, {formatWgs84Coordinate(selectedCustomer.phoneGps.lng, 8)}</span></div>
                <div>• <strong>Số tờ / Thửa</strong>: Tờ {selectedCustomer.sheetNumber || '—'} / Thửa {selectedCustomer.plotNumber || '—'}</div>
                <div>• <strong>Mặt tiền</strong>: {selectedCustomer.mainRoadName}</div>
              </div>

              {/* HIỂN THỊ CHÍNH XÁC 2 MỐC TỌA ĐỘ MẶT TIỀN (THEO PHƯƠNG ÁN A) */}
              {selectedCustomer.vertices && selectedCustomer.vertices.length >= 2 ? (
                (() => {
                  const p1 = selectedCustomer.vertices[0];
                  const p2 = selectedCustomer.vertices[1];
                  const wgs1 = convertVn2000ToWgs84(p1.x, p1.y, 105.75, 0.9999);
                  const wgs2 = convertVn2000ToWgs84(p2.x, p2.y, 105.75, 0.9999);

                  return (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-emerald-950 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>2 MỐC MẶT TIỀN ĐÃ TỰ ĐỘNG KHÓA (RTK):</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {selectedCustomer.customerName.includes('KIM LOAN') ? 'Mặt tiền 10.00m' : 'Chuẩn RTK'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-[11px] font-mono">
                        {/* MỐC 1 (MẶT TIỀN TRÁI) */}
                        <div className="p-2.5 bg-white rounded-lg border border-emerald-300 shadow-xs space-y-1">
                          <div className="text-emerald-900 font-bold flex items-center justify-between">
                            <span>Mốc 1 (Mặt tiền Trái):</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans">
                              Bình Dương L0=105°45'
                            </span>
                          </div>
                          <div className="text-slate-900 font-semibold text-xs">
                            VN-2000: X = <strong>{formatVn2000Coordinate(p1.x, 3)}</strong> · Y = <strong>{formatVn2000Coordinate(p1.y, 3)}</strong>
                          </div>
                          <div className="text-teal-950 bg-teal-50/80 p-2 rounded border border-teal-200 text-[11px] space-y-0.5">
                            <div className="text-[10px] text-teal-800 uppercase font-sans font-bold">
                              Chuyển đổi WGS-84 (Không làm tròn):
                            </div>
                            <div>Vĩ độ (Lat): <strong className="text-slate-900 font-bold">{formatWgs84Coordinate(wgs1.lat, 8)}°</strong></div>
                            <div>Kinh độ (Lng): <strong className="text-slate-900 font-bold">{formatWgs84Coordinate(wgs1.lng, 8)}°</strong></div>
                          </div>
                        </div>

                        {/* MỐC 2 (MẶT TIỀN PHẢI) */}
                        <div className="p-2.5 bg-white rounded-lg border border-emerald-300 shadow-xs space-y-1">
                          <div className="text-emerald-900 font-bold flex items-center justify-between">
                            <span>Mốc 2 (Mặt tiền Phải):</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans">
                              Bình Dương L0=105°45'
                            </span>
                          </div>
                          <div className="text-slate-900 font-semibold text-xs">
                            VN-2000: X = <strong>{formatVn2000Coordinate(p2.x, 3)}</strong> · Y = <strong>{formatVn2000Coordinate(p2.y, 3)}</strong>
                          </div>
                          <div className="text-teal-950 bg-teal-50/80 p-2 rounded border border-teal-200 text-[11px] space-y-0.5">
                            <div className="text-[10px] text-teal-800 uppercase font-sans font-bold">
                              Chuyển đổi WGS-84 (Không làm tròn):
                            </div>
                            <div>Vĩ độ (Lat): <strong className="text-slate-900 font-bold">{formatWgs84Coordinate(wgs2.lat, 8)}°</strong></div>
                            <div>Kinh độ (Lng): <strong className="text-slate-900 font-bold">{formatWgs84Coordinate(wgs2.lng, 8)}°</strong></div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-emerald-800 font-medium bg-emerald-100/70 p-1.5 rounded border border-emerald-200">
                        🌐 Tọa độ chuyển đổi VN2000-WGS84 tại múi chiếu Bình Dương (Kinh tuyến trục L0 = 105°45', múi chiếu 3 độ, k0 = 0.9999). Giữ nguyên <strong>8 chữ số thập phân</strong>, không làm tròn.
                      </div>
                    </div>
                  );
                })()
              ) : selectedCustomer.targetList === 3 ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>DANH SÁCH 3: TRA GIS KHÔNG RA KẾT QUẢ</span>
                  </div>
                  <div className="text-[11px] text-amber-800 space-y-1">
                    <p>
                      • <strong>Lý do kỹ thuật</strong>: Đã tra cứu tự động Thửa <strong>{selectedCustomer.plotNumber || '—'}</strong> và cả 2 thửa giáp ranh bên trái (Thửa {selectedCustomer.adjacentGisLookup?.leftPlotNumber ?? ((selectedCustomer.plotNumber || 300) - 1)}) và bên phải (Thửa {selectedCustomer.adjacentGisLookup?.rightPlotNumber ?? ((selectedCustomer.plotNumber || 300) + 1)}) đều không có dữ liệu ranh trên Cổng GIS Xây dựng (do ranh địa chính chưa cập nhật kịp quy hoạch so với việc tách thửa, chuyển nhượng).
                    </p>
                    <p>
                      • <strong>Căn cứ mốc tọa độ</strong>: Hoàn toàn <strong>KHÔNG CÓ TỌA ĐỘ ĐỈNH 1 VÀ ĐỈNH 2</strong> (vertices để trống). Tuyệt đối không nội suy bừa.
                    </p>
                  </div>
                  <div className="text-[11px] font-bold text-red-700 bg-red-50 p-2 rounded border border-red-200">
                    ⚡ Hướng xử lý: Bắt buộc kỹ thuật viên lập kế hoạch đo thực địa bằng máy RTK ngoài hiện trường!
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg space-y-1.5 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>DANH SÁCH 4: CHƯA CÓ SỔ ĐỎ / GIẤY TAY</span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    Hồ sơ vi bằng giấy tay / chưa có sổ đỏ đính kèm trên CRM BIWASE. Không có đỉnh ranh hình học. Bắt buộc đo thực địa RTK.
                  </p>
                </div>
              )}

              {/* TRẠNG THÁI QUY TRÌNH CHI TIẾT */}
              <div className="p-3 rounded-lg border space-y-1 text-[11px]">
                <span className="font-bold text-slate-700 block">
                  Đánh giá quy trình:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {selectedCustomer.notes || 'Hồ sơ đã được kiểm tra qua hệ thống.'}
                </p>
              </div>

              {/* 3 NÚT THAO TÁC SÂU */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenCadView(selectedCustomer.id)}
                  className="w-full py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Mở Bản Vẽ CAD & Khoảng Cách Mốc</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCrmModal(selectedCustomer.id)}
                    className="py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-amber-300"
                    title="Mở cổng CRM BIWASE để xem File ảnh đăng ký sổ đất"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-800" />
                    <span>Xem Ảnh CRM ✏️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenGisModal(selectedCustomer.id)}
                    className="py-1.5 px-2 bg-sky-100 hover:bg-sky-200 text-sky-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-sky-300"
                    title="Mở cổng GIS Xây dựng để tải tệp tọa độ ranh thửa"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-800" />
                    <span>Tra Cứu GIS 🌐</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Chọn một khách hàng để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
