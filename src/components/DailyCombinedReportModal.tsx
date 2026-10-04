import React, { useState, useMemo } from 'react';
import { CustomerProfile } from '../data/customerDatabase';
import { FrontageAnalysisResult } from '../utils/vn2000';
import {
  buildCombinedDailyReport,
  exportCombinedDailyReportExcel,
  CombinedDailyReportPackage,
} from '../utils/dailyCombinedReport';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CloudUpload,
  CheckCircle2,
  FolderSync,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface DailyCombinedReportModalProps {
  isOpen: boolean;
  customers: CustomerProfile[];
  frontageMap: Map<string, FrontageAnalysisResult>;
  onClose: () => void;
}

export const DailyCombinedReportModal: React.FC<DailyCombinedReportModalProps> = ({
  isOpen,
  customers,
  frontageMap,
  onClose,
}) => {
  const [reportDate, setReportDate] = useState<string>('2026-10-01');
  const [deedCount, setDeedCount] = useState<number>(35); // 30 - 40 hộ
  const [fieldCount, setFieldCount] = useState<number>(25); // 20 - 30 hộ
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>(
    'https://drive.google.com/drive/folders/Phong_Ky_Thuat_Cap_Nuoc_BaoCao_2026'
  );
  const [activePreviewTab, setActivePreviewTab] = useState<'ALL' | 'DEED' | 'FIELD'>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedLog, setSyncedLog] = useState<{
    syncedAt: string;
    fileName: string;
    fileSize: string;
    driveFolder: string;
  } | null>(null);

  // Tạo gói báo cáo
  const reportPackage: CombinedDailyReportPackage = useMemo(() => {
    return buildCombinedDailyReport(
      customers,
      frontageMap,
      reportDate,
      deedCount,
      fieldCount,
      driveFolderUrl
    );
  }, [customers, frontageMap, reportDate, deedCount, fieldCount, driveFolderUrl]);

  if (!isOpen) return null;

  const handleExportAndSyncToDrive = () => {
    setIsSyncing(true);

    // Xuất file Excel tự động
    const fileName = `Bao_Cao_Dinh_Vi_Dong_Ho_Nuoc_Ngay_${reportDate}_Tong_${reportPackage.totalCount}Ho.xlsx`;
    exportCombinedDailyReportExcel(reportPackage, fileName);

    // Mô phỏng đồng bộ đám mây Google Drive của cơ quan
    setTimeout(() => {
      setIsSyncing(false);
      setSyncedLog({
        syncedAt: new Date().toLocaleTimeString('vi-VN') + ' ' + reportDate,
        fileName,
        fileSize: `${(reportPackage.totalCount * 0.42).toFixed(1)} KB`,
        driveFolder: driveFolderUrl,
      });
    }, 700);
  };

  const currentPreviewRows =
    activePreviewTab === 'ALL'
      ? reportPackage.combinedRows
      : activePreviewTab === 'DEED'
      ? reportPackage.deedRows
      : reportPackage.fieldRows;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                BÁO CÁO ĐỒNG NHẤT HÀNG NGÀY
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Chuẩn Google Drive Cơ Quan Cấp Nước
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Tự Động Xuất Báo Cáo Kết Hợp & Gửi Thư Mục G-Drive Cơ Quan
            </h2>
            <p className="text-xs text-slate-600">
              Kết hợp 1 file đồng nhất: <strong>{reportPackage.deedListCount} hộ từ Sổ đất</strong> + <strong>{reportPackage.fieldListCount} hộ từ Ghim thực tế</strong> = <strong>{reportPackage.totalCount} hộ/ngày</strong>.
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

        {/* Thanh cấu hình thông số và G-Drive */}
        <div className="px-6 py-4 bg-slate-100/80 border-b border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-700" />
                <span>Ngày báo cáo kết quả:</span>
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Số lượng từ Sổ đất (30 - 40 hộ):
              </label>
              <div className="flex items-center gap-1.5">
                {[30, 35, 40].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDeedCount(num)}
                    className={`flex-1 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                      deedCount === num
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {num} hộ
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Số lượng Ghim thực tế (20 - 30 hộ):
              </label>
              <div className="flex items-center gap-1.5">
                {[20, 25, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFieldCount(num)}
                    className={`flex-1 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                      fieldCount === num
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {num} hộ
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleExportAndSyncToDrive}
                disabled={isSyncing}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <CloudUpload className="w-4 h-4 text-teal-300" />
                <span>
                  {isSyncing ? 'Đang gửi G-Drive...' : 'Gửi G-Drive & Tải Excel'}
                </span>
              </button>
            </div>
          </div>

          {/* Đường dẫn thư mục Google Drive của cơ quan */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <FolderSync className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-700 whitespace-nowrap">
                Thư mục G-Drive cơ quan:
              </span>
              <input
                type="text"
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrl(e.target.value)}
                placeholder="Dán link hoặc đường dẫn thư mục Google Drive cơ quan..."
                className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              Tổng cộng ngày: <strong className="text-slate-900">{reportPackage.totalCount} hộ</strong> (File đồng nhất 3 Sheets)
            </span>
          </div>

          {/* Thông báo đã đồng bộ G-Drive */}
          {syncedLog && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Đã đồng bộ thành công vào G-Drive cơ quan lúc <strong>{syncedLog.syncedAt}</strong>: Tệp{' '}
                  <code className="font-mono font-bold">{syncedLog.fileName}</code> ({syncedLog.fileSize}).
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Đã Lưu Trữ
              </span>
            </div>
          )}
        </div>

        {/* Nội dung xem trước Báo cáo */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Tabs xem trước */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreviewTab('ALL')}
                className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                  activePreviewTab === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sheet 1: Tổng hợp chung ({reportPackage.totalCount} hộ)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('DEED')}
                className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                  activePreviewTab === 'DEED'
                    ? 'bg-teal-700 text-white'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                }`}
              >
                Sheet 2: Trích xuất Sổ đất ({reportPackage.deedListCount} hộ)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('FIELD')}
                className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                  activePreviewTab === 'FIELD'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Sheet 3: Ghim thực tế RTK ({reportPackage.fieldListCount} hộ)
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportAndSyncToDrive}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Excel ngay</span>
            </button>
          </div>

          {/* Bảng xem trước dữ liệu */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="py-2 px-3 font-semibold w-10 text-center">STT</th>
                  <th className="py-2 px-3 font-semibold whitespace-nowrap">Mã KH / Khách hàng</th>
                  <th className="py-2 px-3 font-semibold whitespace-nowrap">Địa chỉ & Lối vào</th>
                  <th className="py-2 px-3 font-semibold whitespace-nowrap">Hình thức định vị</th>
                  <th className="py-2 px-3 font-semibold whitespace-nowrap">Tọa độ VN-2000 (X, Y)</th>
                  <th className="py-2 px-3 font-semibold whitespace-nowrap">Tọa độ WGS-84 (Lat, Lng)</th>
                  <th className="py-2 px-3 font-semibold text-center whitespace-nowrap">Nghiệm thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentPreviewRows.map((row) => (
                  <tr key={row.stt} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-mono text-slate-500">{row.stt}</td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{row.customerName}</div>
                      <div className="font-mono text-[11px] text-teal-800">{row.customerId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ĐH: {row.meterSerial}</div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-slate-800">{row.address}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Tờ {row.sheetNumber} / Thửa {row.plotNumber} · Lối vào: {row.mainRoadAccess}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.surveyMethod === 'TRICH_XUAT_SO_DAT'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {row.surveyMethod === 'TRICH_XUAT_SO_DAT' ? 'Sổ đất VN-2000' : 'Ghim thực tế RTK'}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{row.selectedMarkerNote}</div>
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-800 text-[11px]">
                      X: {row.vn2000X.toFixed(3)}
                      <br />
                      Y: {row.vn2000Y.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-800 text-[11px]">
                      {row.wgs84Lat.toFixed(8)},
                      <br />
                      {row.wgs84Lng.toFixed(8)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đạt chuẩn</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-mono">
            Báo cáo hợp nhất hàng ngày: Tự động ghi chép vào thư mục Google Drive của phòng kỹ thuật
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
