import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CustomerProfile } from '../data/customerDatabase';
import { REAL_CUSTOMERS_KHM, RAW_REAL_KHM_EXCEL_ROWS } from '../data/realBatchKhm';
import { REAL_CRM_33_CUSTOMERS } from '../data/customerDatabase';
import {
  buildCustomerProfileFromCrmRow,
  normalizeBinhDuongCoordinates,
  generateComprehensiveTestExcelRows,
} from '../utils/crmExcelParser';
import { runPipelineCrmGisRemaining } from '../utils/pipelineRunner';
import { PipelineExecutionModal } from './PipelineExecutionModal';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  Sparkles,
  Layers,
  Zap,
  HelpCircle,
  ClipboardPaste,
  Trash2,
  RotateCcw,
  Play,
  ArrowRight,
  FileCheck,
} from 'lucide-react';

interface ExcelImporterProps {
  onImportCustomers: (newCustomers: CustomerProfile[]) => void;
  onGenerateBatch: (count: number) => void;
  onSelectCustomer?: (customerId: string) => void;
  currentCustomers?: CustomerProfile[];
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({
  onImportCustomers,
  onGenerateBatch,
  onSelectCustomer,
  currentCustomers = REAL_CRM_33_CUSTOMERS,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Trạng thái modal xử lý kiểm tra quy trình
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [executionBatch, setExecutionBatch] = useState<CustomerProfile[]>(currentCustomers);
  const [executionFileName, setExecutionFileName] = useState<string>('33_Ho_ThucTe_BenCat.xlsx');

  // Tải file Excel mẫu đúng chuẩn KHM_KLH của người dùng
  const handleDownloadKhmTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(RAW_REAL_KHM_EXCEL_ROWS);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KHM_KLH_05060708_26');
    XLSX.writeFile(workbook, 'KHM_KLH_05060708_26_Mau_KhachHang_ThucTe.xlsx');
  };

  // Tải file Excel mẫu đầy đủ tất cả các cột thực tế (Số thửa, số tờ, phường, bìa sổ, tọa độ)
  const handleDownloadFullTemplate = () => {
    const rows = generateComprehensiveTestExcelRows();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_KiemThu_DayDuCot');
    XLSX.writeFile(workbook, 'File_Mau_KiemThu_ThucTe_SoThua_SoTo_Phuong.xlsx');
  };

  // Nạp trực tiếp 33 khách hàng thực tế từ bảng ảnh của người dùng
  const handleLoadReal33Batch = () => {
    setExecutionBatch(REAL_CRM_33_CUSTOMERS);
    setExecutionFileName('33_Ho_ThucTe_BenCat.xlsx');
    const { processedCustomers } = runPipelineCrmGisRemaining(REAL_CRM_33_CUSTOMERS);
    onImportCustomers(processedCustomers);
    if (onSelectCustomer && processedCustomers[0]) {
      onSelectCustomer(processedCustomers[0].id);
    }
    setImportStatus(
      '✓ Đã nạp 33 khách hàng thực tế Bến Cát (Nguyễn Hữu Tú Thửa 3036/Tờ 59...). Bạn có thể bấm nút "THỰC HIỆN XỬ LÝ KIỂM TRA" để xem quy trình chạy thực tế!'
    );
  };

  // Nạp trực tiếp 23 khách hàng thực tế từ ảnh KHM
  const handleLoadRealKhmBatch = () => {
    setExecutionBatch(REAL_CUSTOMERS_KHM);
    setExecutionFileName('KHM_KLH_23_KhachHang.xlsx');
    const { processedCustomers } = runPipelineCrmGisRemaining(REAL_CUSTOMERS_KHM);
    onImportCustomers(processedCustomers);
    if (onSelectCustomer) {
      onSelectCustomer('15259324');
    }
    setImportStatus(
      '✓ Đã nạp 23 khách hàng thực tế KHM (Huỳnh Thị Minh Phụng...). Bạn có thể bấm nút "THỰC HIỆN XỬ LÝ KIỂM TRA" để xem quy trình chạy thực tế!'
    );
  };

  // Xử lý nạp từ file Excel (.xlsx / .csv)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawJson || rawJson.length === 0) {
          setImportStatus('File Excel không có dữ liệu dòng nào.');
          setIsProcessing(false);
          return;
        }

        // Tự động chuẩn hóa dữ liệu với bộ parser thông minh đọc nghiêm ngặt
        const rawImported: CustomerProfile[] = rawJson.map((row, index) =>
          buildCustomerProfileFromCrmRow(row, index)
        );

        setExecutionBatch(rawImported);
        setExecutionFileName(file.name);

        // Chạy quy trình và nạp vào ứng dụng
        const { processedCustomers } = runPipelineCrmGisRemaining(rawImported);
        onImportCustomers(processedCustomers);

        if (onSelectCustomer && processedCustomers[0]) {
          onSelectCustomer(processedCustomers[0].id);
        }

        setImportStatus(
          `📁 Đã tải lên file "${file.name}" gồm ${rawImported.length} hồ sơ! Hãy click nút "THỰC HIỆN XỬ LÝ KIỂM TRA THEO QUY TRÌNH QUY ĐỊNH" để xem kiểm tra chi tiết từng bước.`
        );
        setIsProcessing(false);

        // Mở ngay modal xử lý kiểm tra để người dùng chứng kiến quá trình chạy thực tế
        setIsExecutionModalOpen(true);
      } catch (err) {
        setImportStatus('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng bảng tính.');
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Xử lý Dán trực tiếp văn bản/bảng dữ liệu bất kỳ từ Clipboard
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;

    try {
      const lines = pastedText.trim().split('\n');
      const parsed: CustomerProfile[] = [];

      lines.forEach((line, idx) => {
        const parts = line.includes('\t')
          ? line.split('\t')
          : line.includes(',')
          ? line.split(',')
          : line.split(/\s{2,}/);

        if (parts.length >= 4) {
          const rowObj = {
            'MÃ SỐ': parts[0]?.trim(),
            ToaDoY: parts[1]?.trim(),
            ToaDoX: parts[2]?.trim(),
            TenThueBao: parts[3]?.trim(),
            MaDanhBo: parts[4]?.trim(),
            SoThua: parts[5]?.trim(),
            SoTo: parts[6]?.trim(),
            Phuong: parts[7]?.trim(),
            DiaChi: parts[8]?.trim(),
          };
          parsed.push(buildCustomerProfileFromCrmRow(rowObj, idx));
        }
      });

      if (parsed.length > 0) {
        setExecutionBatch(parsed);
        setExecutionFileName('Du_Lieu_Dan_Clipboard.txt');

        const { processedCustomers } = runPipelineCrmGisRemaining(parsed);
        onImportCustomers(processedCustomers);
        if (onSelectCustomer && processedCustomers[0]) {
          onSelectCustomer(processedCustomers[0].id);
        }
        setImportStatus(
          `✓ Đã nạp thành công ${parsed.length} khách hàng từ dữ liệu dán! Hãy bấm nút kiểm tra theo quy trình bên dưới.`
        );
        setIsPasteModalOpen(false);
        setPastedText('');
        setIsExecutionModalOpen(true);
      } else {
        alert('Không nhận diện được định dạng dòng. Vui lòng kiểm tra lại văn bản.');
      }
    } catch (e) {
      alert('Lỗi khi phân tích dữ liệu dán. Vui lòng kiểm tra lại văn bản.');
    }
  };

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-5 space-y-4 shadow-xs">
      {/* Tiêu đề & Các nút thao tác */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              NẠP BẤT KỲ DANH SÁCH NÀO (EXCEL / COPY-PASTE)
            </span>
            <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tự động xóa danh sách cũ & Chạy quy trình CRM $\rightarrow$ GIS $\rightarrow$ Còn lại</span>
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <span>Nạp Danh Sách Khách Hàng & Thực Hiện Xử Lý Tác Vụ Kiểm Tra</span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Tải file Excel hoặc dán bảng mới. Sau khi nạp, hãy click vào nút <strong>"THỰC HIỆN XỬ LÝ KIỂM TRA THEO QUY TRÌNH"</strong> để hệ thống chạy thực tế, đọc số thửa/tờ nghiêm ngặt, đánh giá bảng tọa độ và phân loại 4 danh sách.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* NÚT THỬ MẪU 33 HỘ BẾN CÁT (TỪ ẢNH MỚI) */}
          <button
            type="button"
            onClick={handleLoadReal33Batch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-300 hover:bg-amber-400 border border-amber-400 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Nạp 33 khách hàng Bến Cát (Nguyễn Hữu Tú Thửa 3036/Tờ 59, Trần Đức Hợp...)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
            <span>Thử mẫu 33 Hộ Bến Cát</span>
          </button>

          {/* NÚT DÁN BẢNG TỪ CLIPBOARD */}
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-950 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Dán trực tiếp bất kỳ bảng dữ liệu nào từ Excel hoặc văn bản"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-700" />
            <span>Dán Bảng Dữ Liệu</span>
          </button>

          {/* TẢI FILE EXCEL MẪU ĐẦY ĐỦ CỘT */}
          <button
            type="button"
            onClick={handleDownloadFullTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="Tải file Excel mẫu có đầy đủ cột: Số thửa, Số tờ, Phường, Bìa sổ, Tọa độ"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>Tải File Excel Mẫu Đầy Đủ Cột (.xlsx)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Đang đọc Excel...' : 'Tải lên File Excel của bạn'}</span>
          </button>
        </div>
      </div>

      {/* KHỐI NÚT HÀNH ĐỘNG KIỂM TRA QUY TRÌNH QUY ĐỊNH (THEO YÊU CẦU NGƯỜI DÙNG) */}
      <div className="p-4 bg-linear-to-r from-teal-50 via-sky-50 to-indigo-50 border-2 border-teal-500 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-xs">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-900 uppercase">
                TÁC VỤ KIỂM TRA QUY TRÌNH QUY ĐỊNH
              </span>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded">
                CRM $\rightarrow$ GIS $\rightarrow$ Còn lại
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ({executionBatch.length} hồ sơ đang sẵn sàng)
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">
              Thực Hiện Xử Lý Kiểm Tra Hồ Sơ Thực Tế Theo Quy Định
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Đọc số thửa/tờ nghiêm ngặt, kiểm tra bìa sổ, đánh giá bảng tọa độ VN-2000, tra cứu GIS TP.HCM và phân loại 4 danh sách thực tế.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExecutionModalOpen(true)}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
          <span>CLICK VÀO ĐÂY ĐỂ THỰC HIỆN XỬ LÝ KIỂM TRA</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* THÔNG BÁO TRẠNG THÁI */}
      {importStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{importStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            className="text-xs text-emerald-700 underline cursor-pointer hover:text-emerald-900"
          >
            Ẩn
          </button>
        </div>
      )}

      {/* MODAL DÁN BẢNG DỮ LIỆU BẤT KỲ TỪ CLIPBOARD */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  Dán Bảng Dữ Liệu Bất Kỳ (Copy từ Excel / Word / Zalo)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Copy các dòng trong Excel hoặc bảng dữ liệu rồi <strong>Ctrl+V</strong> vào ô bên dưới. Thứ tự cột khuyến nghị: <code>Mã CRM</code> | <code>Vĩ độ (Lat)</code> | <code>Kinh độ (Lng)</code> | <code>Tên Khách Hàng</code> | <code>Mã Danh Bộ</code> | <code>Số Thửa</code> | <code>Số Tờ</code> | <code>Phường/Xã</code>.
              </p>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`09934969\t11.096556\t106.640396\tNGUYỄN HỮU TÚ\t8415031782\t3036\t59\tphường Hòa Lợi\n14291129\t11.138905\t106.662438\tTRẦN ĐỨC HỢP 1\t8412070692\t158\t42\tPhường Tân Định`}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleProcessPastedText}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
              >
                Nạp & Bắt Đầu Xử Lý Kiểm Tra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THỰC HIỆN XỬ LÝ KIỂM TRA QUY TRÌNH THỰC TẾ */}
      <PipelineExecutionModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        customersToProcess={executionBatch}
        fileName={executionFileName}
        onApplyResults={(processed) => {
          onImportCustomers(processed);
          if (onSelectCustomer && processed[0]) {
            onSelectCustomer(processed[0].id);
          }
          setImportStatus(
            `✓ Đã hoàn tất xử lý kiểm tra quy trình thực tế cho ${processed.length} hồ sơ và cập nhật toàn bộ vào Bảng Tổng Hợp!`
          );
        }}
      />
    </div>
  );
};
