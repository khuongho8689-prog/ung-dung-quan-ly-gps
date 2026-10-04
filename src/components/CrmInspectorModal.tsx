import React, { useState } from 'react';
import { CustomerProfile } from '../data/customerDatabase';
import {
  FileText,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Lock,
  Download,
  Image as ImageIcon,
  Building2,
  X,
} from 'lucide-react';

interface CrmInspectorModalProps {
  customer: CustomerProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCustomerCategory: (customerId: string, targetList: 1 | 2 | 3 | 4) => void;
}

export const CrmInspectorModal: React.FC<CrmInspectorModalProps> = ({
  customer,
  isOpen,
  onClose,
  onUpdateCustomerCategory,
}) => {
  const [activeTab, setActiveTab] = useState<'photos' | 'gis_lookup' | 'crm_auth'>('photos');
  const [crmUrl, setCrmUrl] = useState('https://crm.biwase.com.vn/user/home');
  const [crmAccount, setCrmAccount] = useState('khuonghv');
  const [crmPassword, setCrmPassword] = useState('klh@1234');
  const [gisMode, setGisMode] = useState<'PRE_MERGER' | 'POST_MERGER'>('PRE_MERGER');
  const [isSearchingGis, setIsSearchingGis] = useState(false);
  const [isScanningBiwase, setIsScanningBiwase] = useState(false);
  const [scanStep, setScanStep] = useState<number>(3); // Đã quét xong

  if (!isOpen) return null;

  const handleSimulateGisSearch = () => {
    setIsSearchingGis(true);
    setTimeout(() => {
      setIsSearchingGis(false);
    }, 400);
  };

  const handleTriggerBiwaseScan = () => {
    setIsScanningBiwase(true);
    setScanStep(1);
    setTimeout(() => {
      setScanStep(2);
      setTimeout(() => {
        setScanStep(3);
        setIsScanningBiwase(false);
      }, 500);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Mã số: {customer.id}
              </span>
              <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                MÃ DANH BỘ: {customer.maDanhBo || customer.meterSerial.replace('DB-', '')}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Số ĐH: {customer.meterSerial}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Kiểm tra Hồ sơ Ảnh CRM & Tra cứu GIS Quy hoạch: {customer.customerName}
            </h2>
            <p className="text-xs text-slate-600">
              {customer.address}, {customer.ward}, {customer.district}
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

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'photos'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Ảnh chụp hồ sơ CRM & Nhận diện Trang 3</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gis_lookup')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gis_lookup'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Cổng GIS Xây dựng / Sở Quy hoạch (Trước & Sau sáp nhập)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crm_auth')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'crm_auth'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Cổng BIWASE CRM (crm.biwase.com.vn)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ẢNH CHỤP CRM & NHẬN DIỆN */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Kết quả nhận diện tự động từ hồ sơ CRM */}
              <div className="border border-slate-200 bg-slate-50/70 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Kết quả nhận diện tự động hồ sơ cấp nước
                  </span>
                  <span className="text-slate-500">
                    Người lập hồ sơ: <strong>{customer.intakeOfficer}</strong> ({customer.createdDate})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block">Tình trạng Sổ đất:</span>
                    <strong className="text-slate-900">
                      {customer.hasDeed ? 'Đã có sổ đất đính kèm' : 'Chưa có sổ đất'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block">Số Tờ / Số Thửa:</span>
                    <strong className="text-slate-900 font-mono tabular-nums">
                      Tờ {customer.sheetNumber ?? '—'} / Thửa {customer.plotNumber ?? '—'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block">Bảng tọa độ VN-2000 (Trang 3):</span>
                    <strong className={customer.hasVn2000OnDeed ? 'text-emerald-700' : 'text-amber-700'}>
                      {customer.hasVn2000OnDeed ? 'Có sẵn bảng tọa độ' : 'Không có (Sổ cũ/vẽ tay)'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block">Phân loại danh sách:</span>
                    <strong className="text-teal-800">
                      Danh sách {customer.targetList}
                    </strong>
                  </div>
                </div>

                {customer.isCornerPlot && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs flex flex-wrap items-center justify-between gap-2 text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] uppercase">
                        Thửa góc 2 mặt tiền
                      </span>
                      <span>
                        Căn cứ tên đường trong hồ sơ cấp nước ({customer.address}), hệ thống đã tự động chọn:
                      </span>
                      <strong className="underline text-amber-950">{customer.mainRoadName}</strong>
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs flex items-center justify-between text-emerald-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Áp dụng Phương án A: Tọa độ mốc ranh Sổ đất VN-2000 được bảo lưu ưu tiên làm mốc xuất file RTK.</span>
                  </div>
                </div>
              </div>

              {/* Lưới các ảnh chụp trong hồ sơ */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Các ảnh chụp được tải lên lúc lập hồ sơ CRM ({customer.crmPhotos.length} ảnh)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {customer.crmPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900 text-slate-100 flex flex-col"
                    >
                      <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          Ảnh {idx + 1}: {photo.title}
                        </span>
                        {photo.hasCoordinatesTable && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700">
                            Có bảng tọa độ
                          </span>
                        )}
                      </div>

                      {/* Mockup hình ảnh tài liệu giấy tờ */}
                      <div className="h-44 bg-slate-950 p-4 flex flex-col justify-between font-mono text-[11px] text-slate-300 relative select-none">
                        <div className="space-y-1">
                          <div className="text-teal-400 font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                          <div className="text-[10px] text-slate-400">GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT</div>
                          <div className="text-[10px] text-slate-300">
                            Số phát hành: {customer.certificateSerial || 'Chưa cấp'}
                          </div>
                        </div>

                        {photo.type === 'DEED_PAGE3_MAP_COORDS' && (
                          <div className="border border-teal-500/40 rounded p-2 bg-teal-950/30 text-[10px] space-y-1">
                            <div className="text-teal-300 font-semibold">TRANG 3: SƠ ĐỒ THỬA ĐẤT</div>
                            <div className="text-slate-400">
                              {photo.hasCoordinatesTable
                                ? 'Đã nhận diện: Bảng tọa độ VN-2000 gồm 4 đỉnh ranh giới'
                                : 'Chỉ có nét vẽ ranh giới hình học, KHÔNG CÓ BẢNG TỌA ĐỘ'}
                            </div>
                            {customer.vertices.length > 0 && (
                              <div className="text-emerald-400">
                                Đỉnh 1: X={customer.vertices[0].x.toFixed(3)}, Y={customer.vertices[0].y.toFixed(3)}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 truncate">
                          Mô tả: {photo.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CỔNG GIS XÂY DỰNG / SỞ QUY HOẠCH */}
          {activeTab === 'gis_lookup' && (
            <div className="space-y-5">
              <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-teal-700" />
                    <span className="font-bold text-slate-900">
                      Cổng tra cứu GIS Quy hoạch & Địa chính Xây dựng (Sở Quy hoạch TP.HCM / Bình Dương)
                    </span>
                  </div>
                  <span className="text-slate-500">Hệ quy chiếu: VN-2000 (L0 = 105°45')</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phương án tra cứu địa chính:
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-white border border-slate-300 rounded text-xs">
                      <button
                        type="button"
                        onClick={() => setGisMode('PRE_MERGER')}
                        className={`py-1 rounded font-medium cursor-pointer ${
                          gisMode === 'PRE_MERGER' ? 'bg-teal-700 text-white' : 'text-slate-600'
                        }`}
                      >
                        Trước sáp nhập
                      </button>
                      <button
                        type="button"
                        onClick={() => setGisMode('POST_MERGER')}
                        className={`py-1 rounded font-medium cursor-pointer ${
                          gisMode === 'POST_MERGER' ? 'bg-teal-700 text-white' : 'text-slate-600'
                        }`}
                      >
                        Sau sáp nhập
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Số Tờ bản đồ:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={
                        gisMode === 'PRE_MERGER'
                          ? customer.preMergerInfo?.sheetNumber ?? customer.sheetNumber ?? '—'
                          : customer.postMergerInfo?.sheetNumber ?? customer.sheetNumber ?? '—'
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Số Thửa đất:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={
                        gisMode === 'PRE_MERGER'
                          ? customer.preMergerInfo?.plotNumber ?? customer.plotNumber ?? '—'
                          : customer.postMergerInfo?.plotNumber ?? customer.plotNumber ?? '—'
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Khu vực: <strong>{customer.ward}, {customer.district}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSimulateGisSearch}
                    disabled={isSearchingGis}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isSearchingGis ? 'Đang truy vấn GIS...' : 'Thực hiện Tra cứu GIS'}</span>
                  </button>
                </div>
              </div>

              {/* Trạng thái kết quả GIS */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Kết quả tra cứu trên cơ sở dữ liệu GIS Địa chính
                  </h4>
                  {customer.gisLookupStatus === 'FOUND' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tìm thấy thửa đất & Tải mốc thành công</span>
                    </span>
                  ) : customer.gisLookupStatus === 'NOT_FOUND' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Không tìm thấy kết quả</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      <span>Đã có tọa độ từ sổ mới (Không cần tra GIS)</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {customer.gisNotes ||
                    'Thửa đất này đã có sẵn tọa độ VN-2000 trên trang 3 GCNQSDĐ (Sổ mới). Không cần tra cứu bổ sung qua GIS.'}
                </p>

                {customer.gisLookupStatus === 'FOUND' && customer.vertices.length > 0 && (
                  <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                      <span>File tọa độ mốc ranh giới VN-2000 đã tự động tải về từ GIS:</span>
                      <span className="text-teal-800 font-mono">
                        {customer.vertices.length} đỉnh mốc
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      {customer.vertices.map((v) => (
                        <div key={v.id} className="p-1.5 bg-white rounded border border-slate-200">
                          <span className="text-slate-500">Đỉnh {v.id}:</span>
                          <div className="text-slate-900 font-bold tabular-nums">
                            X={v.x.toFixed(3)}
                          </div>
                          <div className="text-slate-600 tabular-nums">
                            Y={v.y.toFixed(3)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CỔNG BIWASE CRM */}
          {activeTab === 'crm_auth' && (
            <div className="space-y-5 text-xs">
              {/* Thanh URL Cổng CRM BIWASE */}
              <div className="p-3 bg-slate-900 text-white rounded-lg flex flex-wrap items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-2 flex-1 min-w-[320px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-400 text-[11px]">CỔNG CRM:</span>
                  <input
                    type="text"
                    value={crmUrl}
                    onChange={(e) => setCrmUrl(e.target.value)}
                    className="flex-1 bg-slate-800 text-teal-300 px-3 py-1.5 rounded border border-slate-700 text-xs font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>

                <a
                  href={crmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-900 bg-teal-300 hover:bg-teal-200 rounded transition-colors"
                >
                  <span>Mở Cổng BIWASE CRM (Tab Mới)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Thông tin xác thực & nút tra cứu nhanh */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Cổng Quản Lý Khách Hàng BIWASE (Công Ty CP Nước - Môi Trường Bình Dương)
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Hệ thống tự động sử dụng <strong>Mã Danh Bộ</strong> để tìm kiếm hồ sơ và quét ảnh giấy chứng nhận quyền sử dụng đất.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerBiwaseScan}
                    disabled={isScanningBiwase}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isScanningBiwase ? 'Đang quét crm.biwase.com.vn...' : 'Chạy Quét CRM Tự Động'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Tài khoản nhân viên BIWASE:</label>
                    <input
                      type="text"
                      value={crmAccount}
                      onChange={(e) => setCrmAccount(e.target.value)}
                      className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Mật khẩu xác thực:</label>
                    <input
                      type="password"
                      value={crmPassword}
                      onChange={(e) => setCrmPassword(e.target.value)}
                      className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Khóa tra cứu (Mã Danh Bộ):</label>
                    <div className="px-3 py-1.5 font-mono font-bold text-amber-900 bg-amber-100 rounded border border-amber-300">
                      {customer.maDanhBo || customer.meterSerial.replace('DB-', '')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mô phỏng màn hình dữ liệu BIWASE CRM */}
              <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-blue-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-blue-900 font-black text-xs">
                      B
                    </div>
                    <span className="font-bold tracking-wide">
                      BIWASE CRM — THÔNG TIN HỒ SƠ KHÁCH HÀNG
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-blue-200">
                    URL: crm.biwase.com.vn/user/home
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Họ tên thuê bao:</span>
                      <strong className="text-slate-900 text-sm">{customer.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Mã Danh Bộ BIWASE:</span>
                      <strong className="text-teal-800 text-sm font-mono">
                        {customer.maDanhBo || customer.meterSerial.replace('DB-', '')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Mã số CRM:</span>
                      <strong className="text-slate-800 text-sm font-mono">{customer.id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Cụm đồng hồ:</span>
                      <strong className="text-slate-900 text-sm font-mono">{customer.meterSerial}</strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Địa chỉ đăng ký cấp nước:</span>
                    <strong className="text-slate-900 text-xs">
                      {customer.address}, {customer.ward}, {customer.district}
                    </strong>
                  </div>

                  {/* Nhật ký tự động quét AI */}
                  <div className="p-3 bg-slate-900 text-slate-200 rounded font-mono text-xs space-y-1.5">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>1. Đăng nhập thành công vào https://crm.biwase.com.vn/user/home với tài khoản: khuonghv (KLH)</span>
                    </div>
                    <div className="text-slate-300">
                      &gt; 2. Vào mục <strong className="text-blue-400">Lắp mới</strong> $\rightarrow$ Nhập Mã Danh Bộ: <strong className="text-amber-300">{customer.maDanhBo || customer.meterSerial.replace('DB-', '')}</strong> và bấm <strong className="text-blue-300">Lọc</strong>.
                    </div>
                    <div className="text-amber-300 font-bold">
                      &gt; 3. Tại cột <strong className="underline">Hành động</strong> $\rightarrow$ Click chọn biểu tượng <strong className="text-amber-400">Cây viết ✏️</strong>.
                    </div>
                    <div className="text-teal-300">
                      &gt; 4. Click chọn vào <strong className="text-emerald-300 underline">File ảnh đăng ký</strong> $\rightarrow$ Nhận diện ảnh Giấy chứng nhận QSDĐ Trang 3 (Bảng kê tọa độ VN-2000 góc ranh {customer.vertices.length} đỉnh).
                    </div>
                    {customer.isCornerPlot && (
                      <div className="text-amber-200">
                        &gt; 5. Thửa góc 2 mặt tiền: Căn cứ hồ sơ khách hàng ({customer.address}), đã chọn đúng tên đường [<strong className="text-white">{customer.mainRoadName}</strong>] để chọn lại 2 điểm ranh mặt tiền.
                      </div>
                    )}
                    <div className="text-emerald-300 font-bold">
                      &gt; 6. Áp dụng Phương án A: Tọa độ mốc ranh Sổ đất VN-2000 được bảo lưu tuyệt đối làm mốc xuất file RTK (Miễn đi thực địa).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Điều hướng thủ công giữa 4 Danh sách */}
          <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Chuyển khách hàng này sang danh sách khác:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateCustomerCategory(customer.id, 1)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                  customer.targetList === 1
                    ? 'bg-teal-700 text-white font-bold border-teal-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Danh sách 1 (Có tọa độ)
              </button>
              <button
                type="button"
                onClick={() => onUpdateCustomerCategory(customer.id, 2)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                  customer.targetList === 2
                    ? 'bg-teal-700 text-white font-bold border-teal-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Danh sách 2 (Tra GIS có kết quả)
              </button>
              <button
                type="button"
                onClick={() => onUpdateCustomerCategory(customer.id, 3)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                  customer.targetList === 3
                    ? 'bg-amber-600 text-white font-bold border-amber-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Danh sách 3 (Tra GIS không ra)
              </button>
              <button
                type="button"
                onClick={() => onUpdateCustomerCategory(customer.id, 4)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                  customer.targetList === 4
                    ? 'bg-red-700 text-white font-bold border-red-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Danh sách 4 (Không có sổ đất)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
