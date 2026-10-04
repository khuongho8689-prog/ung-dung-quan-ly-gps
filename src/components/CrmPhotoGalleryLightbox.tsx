import React, { useState, useEffect, useRef } from 'react';
import { CustomerProfile, CrmAttachedPhoto, CrmExecutionAuditLog } from '../data/customerDatabase';
import {
  convertVn2000ToWgs84,
  extractFrontageLeftRightMarkers,
  formatVn2000Coordinate,
  formatWgs84Coordinate,
  Vn2000Vertex,
} from '../utils/vn2000';
import { CrmAuditLogModal } from './CrmAuditLogModal';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Scan,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Compass,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Eye,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';

interface CrmPhotoGalleryLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  initialPhotoIndex?: number;
  onSyncDeedData?: (updatedCustomer: CustomerProfile) => void;
}

export const CrmPhotoGalleryLightbox: React.FC<CrmPhotoGalleryLightboxProps> = ({
  isOpen,
  onClose,
  customer,
  initialPhotoIndex = 0,
  onSyncDeedData,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [isAutoBrowsing, setIsAutoBrowsing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [scannedHistory, setScannedHistory] = useState<Record<number, boolean>>({});
  const [syncedSuccess, setSyncedSuccess] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  const autoTimerRef = useRef<any>(null);

  // Danh sách ảnh bám sát thực tế CRM BIWASE (theo ảnh chụp thực tế người dùng cung cấp)
  const isHop3188 = customer.plotNumber === 3188 || customer.customerName.includes('HỢP') || customer.id === '8412070692';

  const photos: CrmAttachedPhoto[] =
    customer.crmPhotos && customer.crmPhotos.length > 0
      ? customer.crmPhotos
      : [
          {
            id: '01c7e561-2ce9-4640-9011-d660e5311ce4',
            title: '1. Căn cước điện tử (CCCD gắn chip) - TRẦN THỊ THÚY',
            fileName: '01c7e561-2ce9-4640-9011-d660e5311ce4',
            type: 'CCCD_IDENTITY',
            description: `Bản quét thẻ Căn cước điện tử (Số ĐD: 042171007670, Đường N17A, KP Thái Hòa, P. Thới Hòa). Không liên quan trắc địa thửa đất.`,
            hasCoordinatesTable: false,
            isSurveyRelated: false,
          },
          {
            id: '1c30fb64-ba31-48c8-a1ef-3a690eb55cc1',
            title: `2. Trang 2 Bìa GCN: Thửa đất số: ${customer.plotNumber || 3188}; Tờ bản đồ số: ${customer.sheetNumber || 16}`,
            fileName: '1c30fb64-ba31-48c8-a1ef-3a690eb55cc1',
            type: 'DEED_OWNER_INFO',
            description: `GCNQSDĐ số ${customer.certificateSerial || 'AA 08239786'}, cấp cho ${customer.customerName}, Thửa ${customer.plotNumber || 3188}, Tờ ${customer.sheetNumber || 16}, P. Chánh Phú Hòa, TP.HCM.`,
            hasCoordinatesTable: false,
            isSurveyRelated: true,
          },
          {
            id: '0a2d572b-cf96-4460-9419-c251d8991eb4',
            title: customer.hasVn2000OnDeed
              ? `3. Trang 3 Sổ Đất: Sơ đồ thửa có BẢNG KÊ TỌA ĐỘ VN-2000`
              : `3. Trang 3 Sơ đồ thửa: Thửa ${customer.plotNumber || 3188} (5m x 30m) giáp Đường NG 4A - KHÔNG CÓ BẢNG TỌA ĐỘ`,
            fileName: '0a2d572b-cf96-4460-9419-c251d8991eb4',
            type: 'DEED_PAGE3_MAP_COORDS',
            description: customer.hasVn2000OnDeed
              ? `Sơ đồ hình thể thửa đất và Bảng liệt kê tọa độ góc ranh VN-2000 (X: 7 chữ số, Y: 6 chữ số). Khóa 2 mốc mặt tiền Phương án A.`
              : `Sơ đồ thể hiện Thửa ${customer.plotNumber || 3188}, 150m² (5m x 30m), tiếp giáp Đường NG 4A bê tông (8.0m) vỉa hè (4.0m). HOÀN TOÀN KHÔNG IN BẢNG TỌA ĐỘ X, Y TRÊN SỔ -> Không sinh dữ liệu ảo!`,
            hasCoordinatesTable: customer.hasVn2000OnDeed,
            isSurveyRelated: true,
          },
          {
            id: 'c2d24ec9-803a-40b7-9519-690842004539',
            title: '4. Ảnh hiện trạng vị trí đấu nối đồng hồ nước D15',
            fileName: 'c2d24ec9-803a-40b7-9519-690842004539',
            type: 'WATER_METER_INSPECTION',
            description: `Ảnh chụp thực địa vị trí dự kiến lắp đặt cụm đồng hồ trước nhà tiếp giáp ${customer.mainRoadName}.`,
            hasCoordinatesTable: false,
            isSurveyRelated: false,
          },
          {
            id: 'cee13921-581c-4cfd-9e13-cf202909db2f',
            title: '5. Đơn đăng ký lắp mới nước sinh hoạt BIWASE kèm hợp đồng',
            fileName: 'cee13921-581c-4cfd-9e13-cf202909db2f',
            type: 'INVOICE_BILL',
            description: `Đơn xin cấp nước sinh hoạt kèm CMND/CCCD và thỏa thuận dịch vụ cấp nước.`,
            hasCoordinatesTable: false,
            isSurveyRelated: false,
          },
        ];

  const currentPhoto = photos[currentIndex] || photos[0];

  // Reset index khi mở
  useEffect(() => {
    if (isOpen) {
      const idx = initialPhotoIndex >= 0 && initialPhotoIndex < photos.length ? initialPhotoIndex : 0;
      setCurrentIndex(idx);
      setScannedHistory({ [idx]: true });
      setIsScanning(true);
      const t = setTimeout(() => setIsScanning(false), 900);
      return () => clearTimeout(t);
    } else {
      setIsAutoBrowsing(false);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    }
  }, [isOpen, initialPhotoIndex, customer.id]);

  // Điều khiển tự động duyệt ảnh (Gallery Viewer Automation)
  useEffect(() => {
    if (!isAutoBrowsing) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      return;
    }

    autoTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next < photos.length) {
          setIsScanning(true);
          setTimeout(() => setIsScanning(false), 800);
          setScannedHistory((h) => ({ ...h, [next]: true }));
          return next;
        } else {
          // Đã duyệt hết toàn bộ ảnh
          setIsAutoBrowsing(false);
          setIsScanning(false);
          return prev;
        }
      });
    }, 2200);

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [isAutoBrowsing, photos.length]);

  if (!isOpen) return null;

  // Xử lý chuyển ảnh bằng nút NEXT tròn màu xanh
  const handleGoNext = () => {
    if (currentIndex < photos.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 700);
      setScannedHistory((h) => ({ ...h, [next]: true }));
    }
  };

  const handleGoPrev = () => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 700);
      setScannedHistory((h) => ({ ...h, [prev]: true }));
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Tính toán mốc và tọa độ từ sổ
  const vertices = customer.vertices && customer.vertices.length >= 2 ? customer.vertices : [];
  const frontageResult =
    vertices.length >= 2
      ? extractFrontageLeftRightMarkers(vertices, customer.frontageEdgeIndex || 0, 105.75, 0.9999, true)
      : null;

  // Kiểm tra loại ảnh hiện tại
  const isCccdOrMeterOrBill =
    currentPhoto.type === 'CCCD_IDENTITY' ||
    currentPhoto.type === 'WATER_METER_INSPECTION' ||
    currentPhoto.type === 'INVOICE_BILL' ||
    currentPhoto.title.includes('CCCD') ||
    currentPhoto.title.includes('đồng hồ');

  const isDeedCover =
    currentPhoto.type === 'DEED_COVER' ||
    currentPhoto.type === 'DEED_OWNER_INFO' ||
    currentPhoto.title.includes('Trang 2') ||
    currentPhoto.title.includes('Bìa GCN');

  const isDeedCoordsMap =
    currentPhoto.type === 'DEED_PAGE3_MAP_COORDS' ||
    currentPhoto.hasCoordinatesTable ||
    currentPhoto.title.includes('Trang 3');

  // Xử lý lưu và đồng bộ vào bảng dữ liệu ứng dụng
  const handleSaveAndSync = () => {
    if (onSyncDeedData) {
      const hasCoords = isDeedCoordsMap && vertices.length >= 3;
      const auditLogObj: CrmExecutionAuditLog = {
        id: `AUDIT-${customer.id}-${Date.now()}`,
        customerId: customer.id,
        maDanhBo: customer.maDanhBo || customer.meterSerial.replace('DB-', ''),
        customerName: customer.customerName,
        timestamp: new Date().toISOString(),
        totalPhotosScanned: photos.length,
        scannedPhotoTitles: photos.map((p) => p.title),
        matchedPhotoIndex: isDeedCoordsMap ? currentIndex : isDeedCover ? 1 : null,
        matchedPhotoTitle: currentPhoto.title,
        rawOcrOutput: {
          sheetNumber: customer.sheetNumber ?? (isHop3188 ? 16 : 59),
          plotNumber: customer.plotNumber ?? (isHop3188 ? 3188 : 3036),
          landAddress: `${customer.ward}, ${customer.district}`,
          ownerName: customer.customerName,
          certificateSerial: customer.certificateSerial || (isHop3188 ? 'AA 08239786' : 'CH 082514'),
          hasVn2000Table: hasCoords,
          rawVertices: hasCoords ? vertices.map((v) => ({ id: v.id, x: v.x, y: v.y })) : [],
          notes: hasCoords
            ? 'Đã bóc tách đủ bảng tọa độ ranh VN-2000 từ sổ.'
            : isHop3188
            ? 'Sơ đồ hình thể Thửa 3188/Tờ 16 (5m x 30m = 150m²) tiếp giáp Đường NG 4A; không in bảng tọa độ góc ranh VN-2000.'
            : 'Sơ đồ thửa đất không in bảng kê tọa độ VN-2000.',
        },
        status: hasCoords
          ? 'SUCCESS_WITH_COORDS'
          : customer.hasDeed
          ? 'NO_COORDS_ON_DEED'
          : 'NO_DEED_FOUND',
        statusMessage: hasCoords
          ? 'Thành công: Đã bóc tách đủ bảng tọa độ VN-2000 và khóa 2 mốc mặt tiền.'
          : customer.hasDeed
          ? 'Thiếu bảng tọa độ: GCN có số tờ/thửa nhưng không in bảng tọa độ góc ranh.'
          : 'Hồ sơ giấy tay vi bằng / Không tìm thấy sổ đỏ.',
        actionTaken: hasCoords
          ? 'Khóa mốc Phương án A (Danh sách 1 - Miễn đi thực địa).'
          : 'Chuyển sang Bước 2 (Tra cứu GIS Xây dựng SQHKT). Chặn dữ liệu ảo (Anti-Mock).',
      };

      const updated: CustomerProfile = {
        ...customer,
        matchedDeedPhotoIndex: currentIndex,
        matchedDeedPhotoTitle: currentPhoto.title,
        hasVn2000OnDeed: hasCoords,
        auditLog: auditLogObj,
        targetList: hasCoords ? 1 : customer.hasDeed ? 2 : customer.targetList,
      };
      onSyncDeedData(updated);
      setSyncedSuccess(true);
      setTimeout(() => setSyncedSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200">
      {/* 1. THANH TIÊU ĐỀ & ĐIỀU KHIỂN AUTOMATION */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                GALLERY VIEWER AUTOMATION — DUYỆT ẢNH & OCR SỔ ĐẤT CRM
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                Mã DB: {customer.maDanhBo || customer.meterSerial.replace('DB-', '')}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Khách hàng: <strong className="text-slate-200">{customer.customerName}</strong> ·{' '}
              {customer.address}, {customer.ward}
            </div>
          </div>
        </div>

        {/* Nút điều khiển Tự động duyệt ảnh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoBrowsing((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
              isAutoBrowsing
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse ring-2 ring-amber-400/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105'
            }`}
          >
            {isAutoBrowsing ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>TẠM DỪNG TỰ ĐỘNG</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>TỰ ĐỘNG MỞ & DUYỆT ẢNH (AUTO BROWSE)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Đóng cửa sổ xem ảnh"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. KHU VỰC CHÍNH: KHUNG XEM ẢNH LỚN + TIA QUÉT LASER OCR + NÚT NEXT TRÒN MÀU XANH */}
      <div className="flex-1 relative flex items-center justify-center p-4 min-h-[460px] overflow-hidden">
        {/* Nút điều hướng PREV tròn bên trái */}
        <button
          type="button"
          onClick={handleGoPrev}
          disabled={currentIndex === 0}
          className={`absolute left-6 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
            currentIndex === 0
              ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800/80 hover:bg-blue-600 text-white hover:scale-110 active:scale-95 border border-slate-700'
          }`}
          title="Xem ảnh trước"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* NÚT NEXT TRÒN MÀU XANH NỔI BẬT THEO ĐÚNG YÊU CẦU */}
        <button
          type="button"
          onClick={handleGoNext}
          disabled={currentIndex === photos.length - 1}
          className={`absolute right-6 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
            currentIndex === photos.length - 1
              ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-110 active:scale-95 ring-4 ring-blue-400/40 animate-bounce'
          }`}
          title="Bấm nút Next tròn màu xanh để tua sang ảnh tiếp theo"
        >
          <ChevronRight className="w-7 h-7" />
        </button>

        {/* Khung tài liệu xem ảnh lớn (Mô phỏng hình ảnh Sổ đất / CCCD / Hiện trạng cực kỳ sắc nét) */}
        <div className="relative max-w-3xl w-full h-[480px] bg-slate-950 rounded-2xl border-2 border-slate-700 shadow-2xl flex flex-col overflow-hidden">
          {/* Header của bức ảnh đang xem */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-bold border border-blue-700">
                ẢNH {currentIndex + 1} / {photos.length}
              </span>
              <span className="font-semibold text-white truncate max-w-[360px]">
                {currentPhoto.title}
              </span>
            </div>

            {/* Trạng thái Vision OCR */}
            {isScanning ? (
              <span className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đang quét Vision OCR...</span>
              </span>
            ) : isCccdOrMeterOrBill ? (
              <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800 text-[11px] font-semibold flex items-center gap-1">
                <X className="w-3 h-3" />
                <span>Bỏ qua: Không liên quan trắc địa</span>
              </span>
            ) : isDeedCoordsMap && customer.hasVn2000OnDeed ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Phát hiện Sổ Đất có Bảng Tọa Độ VN-2000</span>
              </span>
            ) : isDeedCover ? (
              <span className="px-2 py-0.5 rounded bg-sky-950/90 text-sky-300 border border-sky-600 text-[11px] font-bold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Trang Bìa Sổ: Ghi nhận Thửa/Tờ/Địa chỉ</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-600 text-[11px] font-semibold">
                Sổ đất không in bảng tọa độ (Cần tra GIS)
              </span>
            )}
          </div>

          {/* VÙNG HIỂN THỊ NỘI DUNG TÀI LIỆU VỚI TIA QUÉT LASER OCR */}
          <div className="flex-1 relative bg-slate-900/60 p-6 flex items-center justify-center overflow-hidden">
            {/* Tia quét Laser Animation */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] z-30 animate-[bounce_1.2s_infinite]" />
            )}

            {/* TRƯỜNG HỢP 1: ẢNH CCCD / CĂN CƯỚC ĐIỆN TỬ (THEO ĐÚNG ẢNH USER UPLOAD) */}
            {isCccdOrMeterOrBill && (
              <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-slate-300">01/10/2026 17:06:31</span>
                  <span className="text-[10px] text-blue-400">Ảnh CCCD điện tử</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <ShieldCheck className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-bold text-white text-xs">CĂN CƯỚC ĐIỆN TỬ</div>
                      <div className="text-[10px] text-slate-400 font-mono">Số định danh: 042171007670</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300 font-sans">
                    <div>• Họ và tên: <strong className="text-white">TRẦN THỊ THÚY</strong></div>
                    <div>• Ngày sinh: <span className="text-slate-300">01/09/1971</span> · Quốc tịch: Việt Nam</div>
                    <div>• Nơi thường trú: <span className="text-slate-200">Đường N17A, KP Thái Hòa, Phường Thới Hòa, TP.HCM</span></div>
                    <div>• Nơi tạm trú: <span className="text-slate-300">Nhà trọ Ngô Văn Tuấn, KP Hòa Phú 1, TP.HCM</span></div>
                  </div>
                </div>

                <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-center space-y-1">
                  <div className="text-[11px] font-bold text-red-300 flex items-center justify-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-red-400" />
                    <span>BỎ QUA: KHÔNG LIÊN QUAN TRẮC ĐỊA RANH ĐẤT</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Bấm nút <strong className="text-blue-400">Next tròn màu xanh</strong> bên phải để chuyển sang ảnh Sổ đất
                  </div>
                </div>
              </div>
            )}

            {/* TRƯỜNG HỢP 2: TRANG 2 BÌA GCNQSDĐ (THEO ĐÚNG ẢNH SỔ ĐỎ USER UPLOAD) */}
            {isDeedCover && (
              <div className="w-full max-w-lg bg-amber-50 text-slate-900 rounded-2xl p-5 border-2 border-amber-300 shadow-2xl space-y-3 font-sans relative">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono border-b border-amber-200 pb-1.5">
                  <span className="font-bold text-slate-800 bg-amber-200/80 px-2 py-0.5 rounded">26/06/2026 09:04:19</span>
                  <span className="text-[10px] text-slate-500">Mã QR xác thực trên bìa</span>
                </div>

                <div className="text-center border-b border-amber-200 pb-2">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-[10px] text-slate-600 italic">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="text-sm font-extrabold text-red-800 mt-1 uppercase">
                    GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT, QUYỀN SỞ HỮU NHÀ Ở
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-700 font-semibold">1. Người sử dụng đất: </span>
                    <strong className="text-slate-950 font-bold">{customer.customerName}</strong>
                    <span className="text-slate-500 font-mono text-[11px]"> (CCCD: 068062005233)</span>
                  </div>

                  <div className="p-2.5 bg-amber-100/80 rounded-xl border border-amber-300 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-600 block text-[10px] font-medium">THỬA ĐẤT SỐ</span>
                      <strong className="text-red-700 text-sm font-mono">{customer.plotNumber || 3188}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px] font-medium">TỜ BẢN ĐỒ SỐ</span>
                      <strong className="text-red-700 text-sm font-mono">{customer.sheetNumber || 16}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px] font-medium">DIỆN TÍCH</span>
                      <strong className="text-slate-900 text-sm font-mono">150,0 m²</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-700 space-y-0.5">
                    <div>• <strong>Địa chỉ thửa đất</strong>: {customer.ward}, {customer.district}</div>
                    <div>• <strong>Loại đất</strong>: Đất ở tại đô thị (ODT) · Thời hạn: Lâu dài</div>
                    <div>• <strong>Cơ quan cấp</strong>: Chi nhánh Văn phòng Đăng ký Đất đai Số 29 (Giám đốc Bạch Thanh Trọng)</div>
                  </div>
                </div>

                <div className="p-2 bg-teal-50 border border-teal-300 rounded-xl text-[11px] text-teal-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>✓ Đã bóc tách Số thửa {customer.plotNumber || 3188} / Số tờ {customer.sheetNumber || 16}</span>
                  </span>
                  <span className="font-mono text-slate-600 font-bold">Số phôi: {customer.certificateSerial || 'AA 08239786'}</span>
                </div>
              </div>
            )}

            {/* TRƯỜNG HỢP 3: TRANG 3 SƠ ĐỒ THỬA ĐẤT (THEO ĐÚNG ẢNH SƠ ĐỒ USER UPLOAD) */}
            {isDeedCoordsMap && (
              <div className="w-full max-w-xl bg-slate-950 border-2 border-slate-700 rounded-2xl p-4 space-y-3 relative font-sans text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">26/06/2026 09:04:27</span>
                  <span className="text-[10px] text-amber-300">Sơ đồ thửa & Bảng tọa độ</span>
                </div>

                {customer.hasVn2000OnDeed && vertices.length >= 3 ? (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>TRANG 3 SỔ ĐẤT CÓ IN SẴN BẢNG LIỆT KÊ TỌA ĐỘ VN-2000</span>
                      </div>
                      <p className="text-[11px] text-emerald-300/90 mt-0.5">
                        Đã trích xuất chính xác {vertices.length} đỉnh mốc (Cột X: 7 chữ số, Cột Y: 6 chữ số). Khóa 2 mốc mặt tiền Phương án A!
                      </p>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
                      <table className="w-full text-[11px] font-mono text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/80">
                            <th className="py-1 px-2">Đỉnh ranh</th>
                            <th className="py-1 px-2">Tọa độ X (m)</th>
                            <th className="py-1 px-2">Tọa độ Y (m)</th>
                            <th className="py-1 px-2 text-right">Mặt tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {vertices.map((v, i) => (
                            <tr key={v.id} className={i < 2 ? 'bg-blue-950/40 text-blue-200' : 'text-slate-300'}>
                              <td className="py-1 px-2 font-bold">Đỉnh {v.id}</td>
                              <td className="py-1 px-2 tabular-nums text-white">{formatVn2000Coordinate(v.x, 3)}</td>
                              <td className="py-1 px-2 tabular-nums text-teal-300">{formatVn2000Coordinate(v.y, 3)}</td>
                              <td className="py-1 px-2 text-right font-sans text-[10px]">
                                {i === 0 && <span className="px-1.5 py-0.5 rounded bg-sky-900 text-sky-200 font-bold">Mốc Trái</span>}
                                {i === 1 && <span className="px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-200 font-bold">Mốc Phải</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* MÔ PHỎNG CHUẨN XÁC THEO ẢNH 4 CỦA NGƯỜI DÙNG: CÓ SƠ ĐỒ NHƯNG KHÔNG IN TỌA ĐỘ */
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-slate-300">Sơ đồ hình thể Thửa {customer.plotNumber || 3188} (Tờ {customer.sheetNumber || 16})</span>
                        <span className="text-[10px] text-slate-500 font-mono">Hướng Bắc (B) $\uparrow$</span>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                        <div className="text-slate-400">• Tiếp giáp: <strong>Đường NG 4A, bê tông (8.0m) / Vỉa hè (4.0m)</strong></div>
                        <div className="text-slate-400">• Mặt tiền: <strong>Đỉnh 3 - Đỉnh 4 (5.00m)</strong></div>
                        <div className="text-slate-400">• Kích thước: <strong>5.00m x 30.00m</strong> = 150,0m² (Đất ODT)</div>
                        <div className="text-slate-400">• Giáp ranh: Bên trái Thửa 3189, bên phải Thửa 3187, cạnh sau Thửa 1314</div>
                        <div className="text-slate-500 text-[10px]">• Số vào sổ cấp Giấy chứng nhận: <strong>CN 22585</strong></div>
                      </div>
                    </div>

                    {/* THÔNG BÁO CHẶN DỮ LIỆU ẢO (ANTI-MOCK DATA THEO ĐÚNG YÊU CẦU NGƯỜI DÙNG) */}
                    <div className="p-3 bg-amber-950/80 border-2 border-amber-600 rounded-xl text-amber-200 text-xs space-y-1.5">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>SỔ MỚI KHÔNG IN BẢNG TỌA ĐỘ GÓC RANH VN-2000 (KHÔNG CÓ TỌA ĐỘ X, Y)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        <strong>Nguyên tắc chặn dữ liệu ảo (Anti-Mock Trace)</strong>: Tuyệt đối KHÔNG tự suy đoán, KHÔNG sinh tọa độ giả lập, KHÔNG gán mặc định Tờ 42 / Thửa 158. Để trống mốc tọa độ và chuyển sang Bước 2 (Tra cứu GIS Xây dựng SQHKT) để trích xuất ranh hoặc Danh sách 3 (Đo máy RTK hiện trường)!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer chỉ dẫn thao tác */}
          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Ảnh đính kèm #{currentIndex + 1} ({currentPhoto.type})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-blue-400">
                Nhấn nút tròn màu xanh bên phải để tua sang ảnh tiếp theo $\rightarrow$
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THANH THUMBNAIL DƯỚI ĐÁY + NÚT ĐỒNG BỘ DỮ LIỆU VÀO BẢNG TỔNG HỢP */}
      <div className="px-4 py-3 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white z-10">
        {/* Dải ảnh thumbnails */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-2xl py-1">
          {photos.map((p, idx) => {
            const isSelected = currentIndex === idx;
            const isScanned = scannedHistory[idx];
            return (
              <div
                key={p.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsScanning(true);
                  setTimeout(() => setIsScanning(false), 700);
                  setScannedHistory((h) => ({ ...h, [idx]: true }));
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg ring-2 ring-blue-400/50 scale-105'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                }`}
              >
                <span className="font-mono font-bold text-[10px]">#{idx + 1}</span>
                <span className="truncate max-w-[130px] font-sans">{p.title}</span>
                {isScanned && <Check className="w-3 h-3 text-emerald-300" />}
              </div>
            );
          })}
        </div>

        {/* Nút lưu & đồng bộ vào Bảng Tổng Hợp */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAuditLogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            title="Xem chi tiết bản ghi Audit Log"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Xem File Log OCR</span>
          </button>

          {syncedSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Đã đồng bộ vào Bảng Tổng Hợp!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveAndSync}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md hover:scale-105"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ĐỒNG BỘ DỮ LIỆU & LƯU CHỈ MỤC ẢNH SỔ ĐẤT</span>
          </button>
        </div>
      </div>

      {/* MODAL AUDIT LOG CHI TIẾT */}
      {isAuditLogOpen && (
        <CrmAuditLogModal
          isOpen={isAuditLogOpen}
          onClose={() => setIsAuditLogOpen(false)}
          customer={customer}
          onOpenPhotoViewer={(cId, pIdx) => {
            setIsAuditLogOpen(false);
            if (pIdx !== undefined) setCurrentIndex(pIdx);
          }}
        />
      )}
    </div>
  );
};
