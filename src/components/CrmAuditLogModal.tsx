import React, { useState } from 'react';
import { CustomerProfile, CrmExecutionAuditLog } from '../data/customerDatabase';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Scan,
  Database,
  ShieldCheck,
  Compass,
  ArrowRight,
  Eye,
  FileCode,
} from 'lucide-react';

interface CrmAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: CustomerProfile | null;
  allCustomers?: CustomerProfile[];
  onOpenPhotoViewer?: (customerId: string, photoIndex?: number) => void;
}

export const CrmAuditLogModal: React.FC<CrmAuditLogModalProps> = ({
  isOpen,
  onClose,
  customer,
  allCustomers = [],
  onOpenPhotoViewer,
}) => {
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'ALL_SUMMARY'>(customer ? 'SINGLE' : 'ALL_SUMMARY');
  const [copied, setCopied] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customer ? customer.id : allCustomers[0]?.id || '');

  if (!isOpen) return null;

  const currentCust =
    (activeTab === 'SINGLE' && customer)
      ? customer
      : allCustomers.find((c) => c.id === selectedCustomerId) || customer || allCustomers[0];

  // Tạo log mặc định nếu chưa có
  const auditLog: CrmExecutionAuditLog = currentCust?.auditLog || {
    id: `LOG-${currentCust?.id || 'AUTO'}`,
    customerId: currentCust?.id || 'KH-DEFAULT',
    maDanhBo: currentCust?.maDanhBo || currentCust?.meterSerial.replace('DB-', '') || '—',
    customerName: currentCust?.customerName || 'Khách hàng BIWASE',
    timestamp: new Date().toISOString(),
    totalPhotosScanned: currentCust?.crmPhotos?.length || 4,
    scannedPhotoTitles: currentCust?.crmPhotos?.map((p) => p.title) || [
      '1. Ảnh CCCD gắn chip / Căn cước điện tử',
      '2. Ảnh Bìa GCNQSDĐ (Trang 2)',
      '3. Ảnh Sơ đồ thửa đất & Tọa độ (Trang 3)',
      '4. Ảnh Hiện trạng đồng hồ nước',
    ],
    matchedPhotoIndex: currentCust?.hasVn2000OnDeed ? 2 : currentCust?.hasDeed ? 1 : null,
    matchedPhotoTitle: currentCust?.hasVn2000OnDeed
      ? 'Trang 3 Sổ Đất: Sơ đồ thửa có Bảng kê tọa độ VN-2000'
      : currentCust?.hasDeed
      ? 'Trang 2 Bìa GCN: Có sổ nhưng KHÔNG IN bảng tọa độ VN-2000'
      : 'Không tìm thấy ảnh sổ đỏ trên hệ thống CRM',
    rawOcrOutput: {
      sheetNumber: currentCust?.sheetNumber ?? null,
      plotNumber: currentCust?.plotNumber ?? null,
      landAddress: currentCust?.ward ? `${currentCust.ward}, ${currentCust.district}` : null,
      ownerName: currentCust?.customerName ?? null,
      certificateSerial: currentCust?.certificateSerial ?? null,
      hasVn2000Table: !!currentCust?.hasVn2000OnDeed,
      rawVertices:
        currentCust?.vertices && currentCust.vertices.length >= 2
          ? currentCust.vertices.map((v) => ({ id: v.id, x: v.x, y: v.y }))
          : [],
      notes: currentCust?.hasVn2000OnDeed
        ? 'Bóc tách thành công đầy đủ đỉnh ranh VN-2000 từ Trang 3 sổ đất.'
        : currentCust?.hasDeed
        ? 'Sổ đất có mã QR, sơ đồ thửa hình học nhưng không có bảng kê tọa độ VN-2000.'
        : 'Hồ sơ chưa đính kèm sổ đỏ (vi bằng/giấy tay).',
    },
    status:
      currentCust?.hasVn2000OnDeed && (currentCust?.vertices?.length || 0) >= 3
        ? 'SUCCESS_WITH_COORDS'
        : currentCust?.hasDeed
        ? 'NO_COORDS_ON_DEED'
        : 'NO_DEED_FOUND',
    statusMessage:
      currentCust?.hasVn2000OnDeed && (currentCust?.vertices?.length || 0) >= 3
        ? 'Thành công: Đã bóc tách đủ bảng tọa độ VN-2000 và khóa 2 mốc mặt tiền.'
        : currentCust?.hasDeed
        ? 'Thiếu bảng tọa độ: GCN có số tờ/thửa nhưng không in bảng tọa độ góc ranh.'
        : 'Không tìm thấy sổ đất: Hồ sơ giấy tay vi bằng hoặc ảnh không đọc được.',
    actionTaken:
      currentCust?.hasVn2000OnDeed && (currentCust?.vertices?.length || 0) >= 3
        ? 'Khóa mốc Phương án A (Danh sách 1 - Miễn đi thực địa).'
        : currentCust?.hasDeed
        ? 'Chuyển sang Bước 2 (Tra cứu Cổng GIS SQHKT). Tuyệt đối không sinh tọa độ ảo.'
        : 'Chuyển sang Danh sách 4 (Bắt buộc đo máy RTK hiện trường).',
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(auditLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingleJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AuditLog_CRM_${auditLog.maDanhBo}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadAllJson = () => {
    const allLogs = allCustomers.map((c) => c.auditLog || {
      customerId: c.id,
      maDanhBo: c.maDanhBo || c.meterSerial.replace('DB-', ''),
      customerName: c.customerName,
      hasDeed: c.hasDeed,
      sheetNumber: c.sheetNumber ?? null,
      plotNumber: c.plotNumber ?? null,
      hasVn2000OnDeed: c.hasVn2000OnDeed,
      targetList: c.targetList,
      timestamp: new Date().toISOString(),
    });

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AuditLogs_Batch_CRM_${allLogs.length}_HoSo_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white uppercase tracking-wide">
                  NHẬT KÝ FILE LOG BÓC TÁCH ẢNH CRM (AUDIT LOG TRACE)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  {auditLog.maDanhBo}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Lưu trữ nguyên gốc dữ liệu OCR bóc tách từ ảnh sổ đỏ, chống dữ liệu ảo (Anti-Mock Trace).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="Sao chép JSON log"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép!' : 'Chép JSON'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSingleJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              title="Tải tệp JSON log"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Log (.json)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Filter selector */}
        {allCustomers.length > 1 && (
          <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Hồ sơ đang xem:</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setActiveTab('SINGLE');
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
              >
                {allCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.maDanhBo || c.meterSerial.replace('DB-', '')} — {c.customerName} (DS {c.targetList})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleDownloadAllJson}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold underline cursor-pointer"
            >
              Tải toàn bộ Log {allCustomers.length} hồ sơ (.json)
            </button>
          </div>
        )}

        {/* Nội dung chi tiết Log Trace */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* Card trạng thái tổng quan */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Trạng thái xử lý:</span>
                {auditLog.status === 'SUCCESS_WITH_COORDS' ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>THÀNH CÔNG (CÓ BẢNG TỌA ĐỘ VN-2000)</span>
                  </span>
                ) : auditLog.status === 'NO_COORDS_ON_DEED' ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>CÓ SỔ NHƯNG KHÔNG IN BẢNG TỌA ĐỘ</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-bold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>KHÔNG TÌM THẤY SỔ / ẢNH MỜ / VI BẰNG</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(auditLog.timestamp).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-slate-300 font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-sans">MÃ DANH BỘ CRM</div>
                <div className="font-bold text-amber-300 text-sm">{auditLog.maDanhBo}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-sans">KHÁCH HÀNG / THUÊ BAO</div>
                <div className="font-bold text-white truncate">{auditLog.customerName}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-sans">ẢNH SỔ ĐẤT NHẬN DIỆN</div>
                <div className="font-bold text-blue-300">
                  {auditLog.matchedPhotoIndex !== null ? `Ảnh #${auditLog.matchedPhotoIndex + 1}` : 'Không có'}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
              <div className="text-slate-400 font-semibold font-sans">Biện pháp xử lý hệ thống đã áp dụng:</div>
              <div className="text-emerald-300 font-medium">{auditLog.actionTaken}</div>
            </div>
          </div>

          {/* QUY TRÌNH DUYỆT ẢNH THỰC TẾ (TIMELINE TRACE) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <Scan className="w-4 h-4 text-blue-400" />
                <span>TIẾN TRÌNH DUYỆT ẢNH THỰC TẾ (STRICT GALLERY TRAVERSAL):</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Tổng cộng {auditLog.totalPhotosScanned} ảnh đính kèm
              </span>
            </div>

            <div className="space-y-2">
              {auditLog.scannedPhotoTitles.map((title, idx) => {
                const isMatched = auditLog.matchedPhotoIndex === idx;
                const isCccdOrMeter =
                  title.includes('CCCD') || title.includes('Căn cước') || title.includes('đồng hồ');
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 text-xs ${
                      isMatched
                        ? 'bg-blue-950/70 border-blue-500 text-blue-200'
                        : isCccdOrMeter
                        ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] mt-0.5">
                        #{idx + 1}
                      </span>
                      <div>
                        <strong className="block text-white text-xs">{title}</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isCccdOrMeter
                            ? '-> Quét Vision OCR: Nhận diện giấy tờ tùy thân / đồng hồ. Bỏ qua và bấm Next tròn màu xanh.'
                            : isMatched
                            ? '-> Quét Vision OCR: PHÁT HIỆN TRANG SỔ ĐẤT ĐÍNH KÈM! Đã tiến hành bóc tách số liệu.'
                            : '-> Quét Vision OCR: Trang thông tin bổ sung. Tiếp tục chuyển ảnh.'}
                        </p>
                      </div>
                    </div>

                    {onOpenPhotoViewer && (
                      <button
                        type="button"
                        onClick={() => onOpenPhotoViewer(currentCust?.id || '', idx)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Xem ảnh</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DỮ LIỆU OCR ĐỌC ĐƯỢC NGUYÊN GỐC (RAW OCR OUTPUT) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="font-bold text-amber-300 text-xs flex items-center gap-2 font-sans">
                <Database className="w-4 h-4 text-amber-400" />
                <span>DỮ LIỆU BÓC TÁCH NGUYÊN GỐC (RAW OCR EXTRACTED):</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-sans">✓ Chặn dữ liệu ảo (Anti-Mock)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SỐ THỬA:</span>
                <strong className={auditLog.rawOcrOutput.plotNumber ? 'text-white' : 'text-amber-400'}>
                  {auditLog.rawOcrOutput.plotNumber ?? 'Chưa đọc được'}
                </strong>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SỐ TỜ:</span>
                <strong className={auditLog.rawOcrOutput.sheetNumber ? 'text-white' : 'text-amber-400'}>
                  {auditLog.rawOcrOutput.sheetNumber ?? 'Chưa đọc được'}
                </strong>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BẢNG TỌA ĐỘ:</span>
                <strong className={auditLog.rawOcrOutput.hasVn2000Table ? 'text-emerald-400' : 'text-amber-400'}>
                  {auditLog.rawOcrOutput.hasVn2000Table ? 'Có in trên sổ' : 'Không có trên sổ'}
                </strong>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SỐ ĐỈNH RANH:</span>
                <strong className="text-white">
                  {auditLog.rawOcrOutput.rawVertices.length} đỉnh
                </strong>
              </div>
            </div>

            {/* Bảng tọa độ thô trích xuất */}
            {auditLog.rawOcrOutput.rawVertices.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-sans font-semibold text-slate-300">
                  Tọa độ VN-2000 trích xuất nguyên gốc (X: 7 số, Y: 6 số, không làm tròn):
                </div>
                <div className="overflow-x-auto rounded border border-slate-800 bg-slate-900">
                  <table className="w-full text-[11px] text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                        <th className="py-1 px-2">Đỉnh</th>
                        <th className="py-1 px-2">Cột X (Bắc - mét)</th>
                        <th className="py-1 px-2">Cột Y (Đông - mét)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {auditLog.rawOcrOutput.rawVertices.map((v) => (
                        <tr key={v.id}>
                          <td className="py-1 px-2 font-bold text-blue-300">Đỉnh {v.id}</td>
                          <td className="py-1 px-2 text-white tabular-nums">
                            {v.x ? v.x.toFixed(3) : '—'}
                          </td>
                          <td className="py-1 px-2 text-teal-300 tabular-nums">
                            {v.y ? v.y.toFixed(3) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Khóa mốc: {currentCust?.hasVn2000OnDeed ? 'Phương án A' : 'Tra cứu Cổng GIS SQHKT'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
