import React, { useState, useMemo } from 'react';
import {
  RtkExportCandidate,
  splitIntoDailyBatches,
  exportRtkExcelFile,
  exportRtkCsvText,
  DailyBatch,
} from '../utils/rtkBatchExporter';
import {
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Sliders,
  FileSpreadsheet,
  X,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

interface RtkBatchExportModalProps {
  isOpen: boolean;
  candidates: RtkExportCandidate[];
  onClose: () => void;
  onToggleCandidateRole: (customerId: string) => void;
}

export const RtkBatchExportModal: React.FC<RtkBatchExportModalProps> = ({
  isOpen,
  candidates,
  onClose,
  onToggleCandidateRole,
}) => {
  const [batchSize, setBatchSize] = useState<number>(35); // 30 - 40 khách hàng/ngày
  const [startDateStr, setStartDateStr] = useState<string>('2026-10-01');
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(1);

  const dailyBatches: DailyBatch[] = useMemo(() => {
    return splitIntoDailyBatches(candidates, batchSize, startDateStr);
  }, [candidates, batchSize, startDateStr]);

  const activeBatch = useMemo(() => {
    return (
      dailyBatches.find((b) => b.batchNumber === selectedBatchIndex) ||
      dailyBatches[0]
    );
  }, [dailyBatches, selectedBatchIndex]);

  if (!isOpen) return null;

  const handleExportSingleBatch = (batch: DailyBatch) => {
    exportRtkExcelFile(
      batch.items,
      `RTK_Ngay_${batch.scheduledDate}_Lo_${batch.batchNumber}_${batch.items.length}Ho.xlsx`,
      `Lo_${batch.batchNumber}`
    );
  };

  const handleExportAllBatchesTogether = () => {
    const allAssigned = dailyBatches.flatMap((b) => b.items);
    exportRtkExcelFile(
      allAssigned,
      `RTK_TongHop_CacLo_Ngay_${startDateStr}_${allAssigned.length}Ho.xlsx`,
      'Tat_Ca_Cac_Lo'
    );
  };

  const handleExportCsvController = (batch: DailyBatch) => {
    exportRtkCsvText(
      batch.items,
      `RTK_Controller_Ngay_${batch.scheduledDate}_Lo_${batch.batchNumber}.csv`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                BƯỚC 3 & BƯỚC 4
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Tổng cộng {candidates.length} hồ sơ tin cậy đã chọn
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Đề nghị Xuất File Chuẩn RTK & Chia Cắt Lô Báo Cáo Hàng Ngày (30 – 40 Hộ/Ngày)
            </h2>
            <p className="text-xs text-slate-600">
              Quy tắc chọn mốc: Ưu tiên lấy mốc có kích thước khoảng cách nhỏ hơn, bỏ mốc có kích thước lớn hơn.
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

        {/* Thanh cấu hình Chia cắt Khối lượng Hàng Ngày */}
        <div className="px-6 py-4 bg-slate-100/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-700" />
              <span>Số lượng khách hàng mỗi ngày (Lô):</span>
            </label>
            <div className="flex items-center gap-2">
              {[30, 35, 40, 50].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBatchSize(sz)}
                  className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                    batchSize === sz
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {sz} hộ
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>Ngày bắt đầu khảo sát:</span>
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={handleExportAllBatchesTogether}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Xuất toàn bộ {dailyBatches.length} Lô (File gộp theo ngày)</span>
            </button>
          </div>
        </div>

        {/* Nội dung danh sách theo Lô */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Tabs chọn từng lô ngày */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-xs">
            <span className="font-semibold text-slate-500 whitespace-nowrap">Chọn Lô theo ngày:</span>
            {dailyBatches.map((b) => (
              <button
                key={b.batchNumber}
                type="button"
                onClick={() => setSelectedBatchIndex(b.batchNumber)}
                className={`px-3 py-1.5 rounded font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedBatchIndex === b.batchNumber
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Lô {b.batchNumber} ({b.scheduledDate}: {b.items.length} hộ)
              </button>
            ))}
          </div>

          {/* Chi tiết Lô đang chọn */}
          {activeBatch && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-bold text-teal-900">
                    Lô số {activeBatch.batchNumber} — Khảo sát ngày: {activeBatch.scheduledDate} ({activeBatch.items.length} khách hàng)
                  </h3>
                  <p className="text-xs text-teal-800 mt-0.5">
                    Đã tự động chọn mốc ranh có kích thước sai số nhỏ hơn để xuất tọa độ máy RTK.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportSingleBatch(activeBatch)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất Excel Lô {activeBatch.batchNumber}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCsvController(activeBatch)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xuất CSV Máy RTK</span>
                  </button>
                </div>
              </div>

              {/* Bảng chi tiết hồ sơ trong lô */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">PointID (Mã KH)</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Khách hàng & Địa chỉ</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Mốc Ưu Tiên Đã Chọn</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Tọa độ VN-2000 (X, Y)</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Tọa độ WGS-84 (Lat, Lng)</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Sai số nhỏ hơn (chọn)</th>
                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Đổi Mốc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeBatch.items.map((item) => (
                      <tr key={item.customer.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 tabular-nums">
                          {item.customer.id}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{item.customer.customerName}</div>
                          <div className="text-slate-500 text-[11px] truncate max-w-[200px]">
                            {item.customer.address}, {item.customer.ward}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] ${
                              item.selectedMarkerRole === 'LEFT'
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {item.selectedMarkerRole === 'LEFT' ? 'Mốc Trái' : 'Mốc Phải'} (Đ.{item.selectedVertexId})
                            </span>
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-800 text-[11px]">
                          X: {item.selectedVn2000.x.toFixed(3)}
                          <br />
                          Y: {item.selectedVn2000.y.toFixed(3)}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-800 text-[11px]">
                          {item.selectedWgs84.lat.toFixed(8)},
                          <br />
                          {item.selectedWgs84.lng.toFixed(8)}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            d = {item.smallerDistanceMeters}m
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Bỏ mốc: {item.largerDistanceMeters}m
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onToggleCandidateRole(item.customer.id)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                            title="Đổi giữa Mốc Trái và Mốc Phải"
                          >
                            Đổi mốc
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-mono">
            Tổng cộng: {dailyBatches.length} Lô ngày · Phục vụ báo cáo đều đặn hàng ngày cho cơ quan cấp nước
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
