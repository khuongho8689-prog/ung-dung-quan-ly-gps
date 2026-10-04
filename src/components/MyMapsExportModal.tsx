import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CustomerProfile } from '../data/customerDatabase';
import {
  MyMapsItem,
  generateGoogleMyMapsKml,
  generateGoogleMyMapsCsvRows,
  MONTH_COLOR_MAP,
  PINNED_BLUE_COLOR,
} from '../utils/myMapsExporter';
import { FrontageAnalysisResult, distanceWgs84Meters } from '../utils/vn2000';
import {
  MapPin,
  Download,
  CheckCircle2,
  Filter,
  Eye,
  X,
  FileSpreadsheet,
  Globe,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

interface MyMapsExportModalProps {
  isOpen: boolean;
  customers: CustomerProfile[];
  frontageMap: Map<string, FrontageAnalysisResult>;
  onClose: () => void;
  onToggleSurveyPinned: (customerId: string) => void;
}

export const MyMapsExportModal: React.FC<MyMapsExportModalProps> = ({
  isOpen,
  customers,
  frontageMap,
  onClose,
  onToggleSurveyPinned,
}) => {
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [selectedPinStatusFilter, setSelectedPinStatusFilter] = useState<'ALL' | 'PINNED_ONLY' | 'UNPINNED_ONLY'>('ALL');
  const [applyParcelMarkerPriority, setApplyParcelMarkerPriority] = useState<boolean>(true);

  // Xây dựng danh sách điểm xuất Google My Maps theo quy tắc ưu tiên
  const myMapsItems: MyMapsItem[] = useMemo(() => {
    return customers.map((c) => {
      const frontage = frontageMap.get(c.id);

      // Quy tắc ưu tiên Bước 4:
      // Ưu tiên 1: Tọa độ mốc ranh thửa đất (lấy mốc gần nhất trong 2 mốc Trái/Phải).
      // Ưu tiên 2: Nếu không có mốc ranh thì mới lấy tọa độ điện thoại ban đầu.
      let coordSource: 'PARCEL_BOUNDARY_MARKER' | 'PHONE_GPS_FALLBACK' = 'PHONE_GPS_FALLBACK';
      let effectiveLat = c.phoneGps.lat;
      let effectiveLng = c.phoneGps.lng;
      let markerRole: 'LEFT' | 'RIGHT' | 'PHONE' = 'PHONE';
      let phoneErrorMeters: number | undefined = undefined;

      if (frontage && applyParcelMarkerPriority) {
        const dLeft = distanceWgs84Meters(c.phoneGps, frontage.leftMarker.wgs84);
        const dRight = distanceWgs84Meters(c.phoneGps, frontage.rightMarker.wgs84);

        if (dLeft <= dRight) {
          effectiveLat = frontage.leftMarker.wgs84.lat;
          effectiveLng = frontage.leftMarker.wgs84.lng;
          markerRole = 'LEFT';
          phoneErrorMeters = Number(dLeft.toFixed(1));
        } else {
          effectiveLat = frontage.rightMarker.wgs84.lat;
          effectiveLng = frontage.rightMarker.wgs84.lng;
          markerRole = 'RIGHT';
          phoneErrorMeters = Number(dRight.toFixed(1));
        }
        coordSource = 'PARCEL_BOUNDARY_MARKER';
      }

      return {
        id: c.id,
        name: c.customerName,
        phone: c.phone,
        address: c.address,
        ward: c.ward,
        district: c.district,
        sheetPlot: `Tờ ${c.sheetNumber || '—'} / Thửa ${c.plotNumber || '—'}`,
        intakeMonth: c.intakeMonth,
        isSurveyPinned: c.isSurveyPinned,
        meterSerial: c.meterSerial,
        coordSource,
        effectiveLat,
        effectiveLng,
        markerRole,
        phoneErrorMeters,
        targetList: c.targetList,
        note: c.notes || 'Hồ sơ cấp nước',
      };
    });
  }, [customers, frontageMap, applyParcelMarkerPriority]);

  const filteredItems = useMemo(() => {
    return myMapsItems.filter((item) => {
      if (selectedMonthFilter !== 'ALL' && item.intakeMonth !== selectedMonthFilter) {
        return false;
      }
      if (selectedPinStatusFilter === 'PINNED_ONLY' && !item.isSurveyPinned) {
        return false;
      }
      if (selectedPinStatusFilter === 'UNPINNED_ONLY' && item.isSurveyPinned) {
        return false;
      }
      return true;
    });
  }, [myMapsItems, selectedMonthFilter, selectedPinStatusFilter]);

  if (!isOpen) return null;

  const handleDownloadKml = () => {
    const kmlContent = generateGoogleMyMapsKml(
      filteredItems,
      `Dong_Ho_Nuoc_MyMaps_${filteredItems.length}Diem`
    );
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Google_MyMaps_Ghim_${filteredItems.length}Ho.kml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMyMapsCsv = () => {
    const rows = generateGoogleMyMapsCsvRows(filteredItems);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MyMaps_Import');
    XLSX.writeFile(workbook, `Google_MyMaps_Import_${filteredItems.length}Ho.xlsx`);
  };

  const pinnedCount = myMapsItems.filter((i) => i.isSurveyPinned).length;
  const unpinnedCount = myMapsItems.filter((i) => !i.isSurveyPinned).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                BƯỚC 4: GOOGLE MY MAPS
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Tổng cộng {myMapsItems.length} điểm ghim
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Quản lý Ghim Thực địa Google My Maps & Xuất File KML / CSV Nhập Bản Đồ
            </h2>
            <p className="text-xs text-slate-600">
              Quy tắc ghim: Đã ghim = Ghim Xanh Dương · Chưa ghim = Màu theo tháng (T.5, T.6, T.7, T.8, T.9, T.10) · Ưu tiên mốc ranh thửa đất thay cho GPS điện thoại sai lệch.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh điều khiển & Chú thích Màu sắc Ghim */}
        <div className="px-6 py-3.5 bg-slate-100/80 border-b border-slate-200 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Chú thích màu sắc */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">Màu ghim:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span>Đã ghim ({pinnedCount})</span>
              </span>

              {Object.entries(MONTH_COLOR_MAP).map(([key, val]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200"
                >
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: val.hex }} />
                  <span>{val.label}</span>
                </span>
              ))}
            </div>

            {/* Bật tắt quy tắc ưu tiên mốc ranh */}
            <button
              type="button"
              onClick={() => setApplyParcelMarkerPriority((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold cursor-pointer transition-colors ${
                applyParcelMarkerPriority
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>
                {applyParcelMarkerPriority
                  ? '✓ Đang bật: Ưu tiên Mốc ranh thửa (Khắc phục GPS ĐT lệch >30m)'
                  : 'Đang dùng GPS Điện thoại thô'}
              </span>
            </button>
          </div>

          {/* Bộ lọc tháng & trạng thái ghim */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Lọc theo tháng:</span>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium"
              >
                <option value="ALL">Tất cả các tháng</option>
                {Object.entries(MONTH_COLOR_MAP).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>

              <span className="font-semibold text-slate-700 ml-2">Trạng thái:</span>
              <select
                value={selectedPinStatusFilter}
                onChange={(e) => setSelectedPinStatusFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium"
              >
                <option value="ALL">Tất cả ({myMapsItems.length})</option>
                <option value="UNPINNED_ONLY">Chưa ghim thực địa ({unpinnedCount})</option>
                <option value="PINNED_ONLY">Đã ghim màu xanh dương ({pinnedCount})</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadKml}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Tải File KML My Maps</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMyMapsCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel My Maps</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bảng danh sách điểm ghim */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Màu Ghim / Tháng</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Mã KH / Khách hàng</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Địa chỉ & Thửa đất</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Nguồn Tọa độ Định vị</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Tọa độ WGS-84 (Lat, Lng)</th>
                  <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Trạng Thái Ghim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => {
                  const monthColor = MONTH_COLOR_MAP[item.intakeMonth] || { hex: '#0284c7', label: item.intakeMonth };
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full inline-block border border-white shadow-xs"
                            style={{
                              backgroundColor: item.isSurveyPinned ? PINNED_BLUE_COLOR.hex : monthColor.hex,
                            }}
                          />
                          <span className="font-semibold text-slate-800">
                            {item.isSurveyPinned ? 'Đã ghim (Xanh)' : monthColor.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900 tabular-nums">{item.id}</div>
                        <div className="font-semibold text-slate-900 mt-0.5">{item.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">SĐT: {item.phone}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="text-slate-800">{item.address}, {item.ward}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">{item.sheetPlot}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        {item.coordSource === 'PARCEL_BOUNDARY_MARKER' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Mốc ranh ({item.markerRole === 'LEFT' ? 'Trái' : 'Phải'})</span>
                            </span>
                            {item.phoneErrorMeters !== undefined && item.phoneErrorMeters > 30 && (
                              <div className="text-[10px] text-rose-600 font-semibold">
                                Đã sửa lỗi GPS ĐT lệch {item.phoneErrorMeters}m
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded">
                            GPS Điện thoại (Chưa có mốc ranh)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-900 text-[11px]">
                        {item.effectiveLat.toFixed(7)},
                        <br />
                        {item.effectiveLng.toFixed(7)}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleSurveyPinned(item.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            item.isSurveyPinned
                              ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          {item.isSurveyPinned ? '✓ Đã ghim Xanh dương' : 'Đánh dấu Đã ghim'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Nạp file KML trực tiếp vào Google My Maps trên điện thoại để định vị chính xác khi đi khảo sát thực địa.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
