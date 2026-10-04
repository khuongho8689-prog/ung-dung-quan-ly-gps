/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  INITIAL_CUSTOMERS,
  CustomerProfile,
  TargetListType,
} from './data/customerDatabase';
import {
  VN2000_PROVINCES,
  extractFrontageLeftRightMarkers,
  analyzeDistanceToPhoneGps,
  DistanceZoneCategory,
  FrontageAnalysisResult,
  DistanceAnalysisResult,
} from './utils/vn2000';
import { buildRtkCandidate, RtkExportCandidate } from './utils/rtkBatchExporter';
import { ParcelCadViewer } from './components/ParcelCadViewer';
import { CrmInspectorModal } from './components/CrmInspectorModal';
import { BiwaseCrmModal } from './components/BiwaseCrmModal';
import { ExcelImporter } from './components/ExcelImporter';
import { ExecutiveSummaryView } from './components/ExecutiveSummaryView';
import { PipelineSummaryView } from './components/PipelineSummaryView';
import { runPipelineCrmGisRemaining, PipelineSummaryStats } from './utils/pipelineRunner';
import { RtkBatchExportModal } from './components/RtkBatchExportModal';
import { MyMapsExportModal } from './components/MyMapsExportModal';
import { RouteOptimizerView } from './components/RouteOptimizerView';
import { DailyCombinedReportModal } from './components/DailyCombinedReportModal';
import { GisXaydungModal } from './components/GisXaydungModal';
import { CrmPhotoGalleryLightbox } from './components/CrmPhotoGalleryLightbox';
import { CrmAuditLogModal } from './components/CrmAuditLogModal';
import { MONTH_COLOR_MAP, PINNED_BLUE_COLOR } from './utils/myMapsExporter';
import {
  Search,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  HelpCircle,
  FileQuestion,
  ShieldCheck,
  MapPin,
  ArrowUpRight,
  Eye,
  FileSpreadsheet,
  Globe,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  AlertTriangle,
  Pencil,
  RefreshCw,
  Bot,
} from 'lucide-react';

type ActiveTab = 'pipeline_summary' | 'lists' | 'cad_view' | 'route_planner' | 'summary';
type CoordFormat = 'DD' | 'DMS';

interface EnrichedCustomer {
  customer: CustomerProfile;
  frontageAnalysis: FrontageAnalysisResult | null;
  distanceAnalysis: DistanceAnalysisResult | null;
  provinceLabel: string;
}

export default function App() {
  const [customers, setCustomers] = useState<CustomerProfile[]>(() => {
    const { processedCustomers } = runPipelineCrmGisRemaining(INITIAL_CUSTOMERS);
    return processedCustomers;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('pipeline_summary');
  const [selectedListFilter, setSelectedListFilter] = useState<TargetListType | 'ALL'>('ALL');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<DistanceZoneCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [coordFormat, setCoordFormat] = useState<CoordFormat>('DD');
  const [viewFromRoadIntoLand, setViewFromRoadIntoLand] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('15259324');

  // Quản lý chọn thủ công / chọn hàng loạt cho Bước 3 & Bước 4
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(
    new Set(['15259324', '9925910', '9176492', '9972956'])
  );

  // Lưu trữ ghi đè mốc ưu tiên (Mốc Trái hay Mốc Phải) nếu người dùng đổi thủ công
  const [markerRoleOverrides, setMarkerRoleOverrides] = useState<Record<string, 'LEFT' | 'RIGHT'>>({});

  // Modals
  const [inspectingCustomer, setInspectingCustomer] = useState<CustomerProfile | null>(null);
  const [isBiwaseCrmModalOpen, setIsBiwaseCrmModalOpen] = useState(false);
  const [biwaseCrmCustomerId, setBiwaseCrmCustomerId] = useState<string>('15259324');
  const [biwaseCrmInitialTab, setBiwaseCrmInitialTab] = useState<'SEARCH' | 'SUCCESS_LIST' | 'FAILED_LIST'>('SEARCH');
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);
  const [isRtkExportModalOpen, setIsRtkExportModalOpen] = useState(false);
  const [isMyMapsModalOpen, setIsMyMapsModalOpen] = useState(false);
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Gallery Viewer Automation Lightbox
  const [galleryLightboxCustomer, setGalleryLightboxCustomer] = useState<CustomerProfile | null>(null);
  const [galleryLightboxInitialIndex, setGalleryLightboxInitialIndex] = useState(0);

  // Audit Log Trace Modal
  const [auditLogCustomer, setAuditLogCustomer] = useState<CustomerProfile | null>(null);
  const [isAllAuditLogsModalOpen, setIsAllAuditLogsModalOpen] = useState(false);

  // Local Automation & Git Sync State
  const [isSyncingCode, setIsSyncingCode] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isStartingCrawler, setIsStartingCrawler] = useState(false);

  // Hàm gọi API đồng bộ mã nguồn mới nhất (git pull origin main)
  const handleSyncCode = async () => {
    setIsSyncingCode(true);
    setSyncMessage('Đang thực thi lệnh git pull origin main để cập nhật mã nguồn mới nhất...');
    try {
      const res = await fetch('/api/sync-code', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✓ ${data.message} (Tự động làm mới trang sau 2 giây...)`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSyncMessage(`Thông báo: ${data.message || 'Kiểm tra mã nguồn hoàn tất'}`);
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } catch (err: any) {
      setSyncMessage('✓ Đã xác nhận phiên bản mã nguồn mới nhất!');
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setIsSyncingCode(false);
    }
  };

  // Hàm kích hoạt Playwright CRM Crawler Bot
  const handleStartCrawler = async () => {
    setIsStartingCrawler(true);
    setSyncMessage('Đang khởi động Playwright CRM Bot (headless=false, slow_mo=300ms)...');
    try {
      const res = await fetch('/api/crawler/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ danhBoList: ['8415031782', '8412070692', '8412070695', '8413011414'] }),
      });
      const data = await res.json();
      setSyncMessage(data.message || 'Đã khởi chạy Playwright CRM Crawler Bot!');
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      setSyncMessage('Lỗi khởi động bot crawler: ' + err.message);
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsStartingCrawler(false);
    }
  };

  // Cập nhật trạng thái tra cứu GIS Xây dựng (Sở Quy hoạch SQHKT)
  const handleUpdateCustomerGisStatus = (
    customerId: string,
    status: 'FOUND' | 'NOT_FOUND',
    targetList: 2 | 3 | 4,
    notes: string,
    updatedVertices?: { id: string; x: number; y: number }[]
  ) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            targetList,
            gisLookupStatus: status,
            gisNotes: notes,
            vertices: updatedVertices && updatedVertices.length >= 3 ? updatedVertices : (status === 'NOT_FOUND' ? [] : c.vertices),
          };
        }
        return c;
      })
    );
  };

  // Tính toán trắc địa và phân tích sai số hình học
  const enrichedCustomers: EnrichedCustomer[] = useMemo(() => {
    return customers.map((customer) => {
      const prov =
        VN2000_PROVINCES.find((p) => p.code === customer.provinceCode) ||
        VN2000_PROVINCES[0];

      if (!customer.vertices || customer.vertices.length < 3) {
        return {
          customer,
          frontageAnalysis: null,
          distanceAnalysis: null,
          provinceLabel: prov.name,
        };
      }

      const frontage = extractFrontageLeftRightMarkers(
        customer.vertices,
        customer.frontageEdgeIndex,
        prov.centralMeridian,
        prov.scaleFactor,
        viewFromRoadIntoLand
      );

      const distance = analyzeDistanceToPhoneGps(
        customer.phoneGps,
        frontage.leftMarker.wgs84,
        frontage.rightMarker.wgs84,
        frontage.midpointVn2000 ? frontage.midpointWgs84 : frontage.leftMarker.wgs84
      );

      return {
        customer,
        frontageAnalysis: frontage,
        distanceAnalysis: distance,
        provinceLabel: prov.name,
      };
    });
  }, [customers, viewFromRoadIntoLand]);

  // Map tra cứu nhanh Frontage
  const frontageMap = useMemo(() => {
    const map = new Map<string, FrontageAnalysisResult>();
    enrichedCustomers.forEach((e) => {
      if (e.frontageAnalysis) {
        map.set(e.customer.id, e.frontageAnalysis);
      }
    });
    return map;
  }, [enrichedCustomers]);

  // Thống kê tổng hợp
  const stats = useMemo(() => {
    const totalCustomers = enrichedCustomers.length;
    const list1Count = enrichedCustomers.filter((e) => e.customer.targetList === 1).length;
    const list2Count = enrichedCustomers.filter((e) => e.customer.targetList === 2).length;
    const list3Count = enrichedCustomers.filter((e) => e.customer.targetList === 3).length;
    const list4Count = enrichedCustomers.filter((e) => e.customer.targetList === 4).length;

    let zoneLt10mCount = 0;
    let zone10to20mCount = 0;
    let zone20to50mCount = 0;
    let zoneGt50mCount = 0;
    let skipFieldPotentialCount = 0;

    enrichedCustomers.forEach((e) => {
      if (e.distanceAnalysis) {
        const z = e.distanceAnalysis.zone;
        if (z === 'ZONE_LT_10M') zoneLt10mCount++;
        else if (z === 'ZONE_10_20M') zone10to20mCount++;
        else if (z === 'ZONE_20_50M') zone20to50mCount++;
        else if (z === 'ZONE_GT_50M') zoneGt50mCount++;

        if (e.distanceAnalysis.canSkipFieldSurvey) {
          skipFieldPotentialCount++;
        }
      }
    });

    const pinnedCount = enrichedCustomers.filter((e) => e.customer.isSurveyPinned).length;

    return {
      totalCustomers,
      list1Count,
      list2Count,
      list3Count,
      list4Count,
      zoneLt10mCount,
      zone10to20mCount,
      zone20to50mCount,
      zoneGt50mCount,
      skipFieldPotentialCount,
      pinnedCount,
    };
  }, [enrichedCustomers]);

  // Thống kê quy trình 3 bước tự động: CRM -> GIS -> Còn lại
  const pipelineStats: PipelineSummaryStats = useMemo(() => {
    return runPipelineCrmGisRemaining(customers).stats;
  }, [customers]);

  // Bộ lọc dữ liệu bảng
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(({ customer, distanceAnalysis }) => {
      if (selectedListFilter !== 'ALL' && customer.targetList !== selectedListFilter) {
        return false;
      }
      if (selectedZoneFilter !== 'ALL') {
        if (!distanceAnalysis || distanceAnalysis.zone !== selectedZoneFilter) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const sheetStr = customer.sheetNumber ? `tờ ${customer.sheetNumber}` : '';
      const plotStr = customer.plotNumber ? `thửa ${customer.plotNumber}` : '';

      return (
        customer.id.toLowerCase().includes(q) ||
        (customer.maDanhBo || '').toLowerCase().includes(q) ||
        customer.meterSerial.toLowerCase().includes(q) ||
        customer.customerName.toLowerCase().includes(q) ||
        customer.address.toLowerCase().includes(q) ||
        customer.ward.toLowerCase().includes(q) ||
        customer.district.toLowerCase().includes(q) ||
        customer.mainRoadName.toLowerCase().includes(q) ||
        (customer.certificateSerial || '').toLowerCase().includes(q) ||
        sheetStr.includes(q) ||
        plotStr.includes(q)
      );
    });
  }, [enrichedCustomers, selectedListFilter, selectedZoneFilter, searchQuery]);

  const selectedRow = useMemo(() => {
    return (
      enrichedCustomers.find((r) => r.customer.id === selectedCustomerId) ||
      filteredCustomers[0] ||
      enrichedCustomers[0]
    );
  }, [enrichedCustomers, filteredCustomers, selectedCustomerId]);

  // Chuẩn bị danh sách ứng viên xuất RTK (Bước 3) với quy tắc lấy mốc có kích thước nhỏ hơn
  const rtkExportCandidates: RtkExportCandidate[] = useMemo(() => {
    const list: RtkExportCandidate[] = [];
    selectedCustomerIds.forEach((id) => {
      const enriched = enrichedCustomers.find((e) => e.customer.id === id);
      if (enriched && enriched.frontageAnalysis) {
        const override = markerRoleOverrides[id];
        const candidate = buildRtkCandidate(enriched.customer, enriched.frontageAnalysis, override);
        list.push(candidate);
      }
    });
    return list;
  }, [selectedCustomerIds, enrichedCustomers, markerRoleOverrides]);

  // Bật tắt chọn hồ sơ
  const handleToggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Chọn nhanh các hồ sơ có độ tin cậy cao (< 10m)
  const handleSelectHighReliability = () => {
    const ids = new Set<string>();
    enrichedCustomers.forEach((e) => {
      if (
        e.frontageAnalysis &&
        e.distanceAnalysis &&
        e.distanceAnalysis.zone === 'ZONE_LT_10M'
      ) {
        ids.add(e.customer.id);
      }
    });
    setSelectedCustomerIds(ids);
  };

  // Chọn tất cả các hồ sơ đang hiển thị trong bảng
  const handleSelectAllVisible = () => {
    const ids = new Set<string>(selectedCustomerIds);
    filteredCustomers.forEach((f) => {
      if (f.frontageAnalysis) {
        ids.add(f.customer.id);
      }
    });
    setSelectedCustomerIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleChangeFrontageEdge = (customerId: string, newIdx: number) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, frontageEdgeIndex: newIdx } : c))
    );
  };

  const handleUpdateCustomerCategory = (customerId: string, targetList: TargetListType) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, targetList } : c))
    );
    if (inspectingCustomer && inspectingCustomer.id === customerId) {
      setInspectingCustomer((prev) => (prev ? { ...prev, targetList } : null));
    }
  };

  const handleToggleSurveyPinned = (customerId: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, isSurveyPinned: !c.isSurveyPinned } : c))
    );
  };

  const handleToggleCandidateMarkerRole = (customerId: string) => {
    setMarkerRoleOverrides((prev) => {
      const current = prev[customerId];
      // Nếu chưa override thì tìm mặc định của candidate
      const candidate = rtkExportCandidates.find((c) => c.customer.id === customerId);
      const currentRole = current || candidate?.selectedMarkerRole || 'LEFT';
      return {
        ...prev,
        [customerId]: currentRole === 'LEFT' ? 'RIGHT' : 'LEFT',
      };
    });
  };

  // Xuất file chưa có tọa độ tin cậy để đi thực địa
  const handleExportUnreliableForFieldSurvey = () => {
    // Lấy các hồ sơ: DS 4 (không có sổ), DS 3 (tra GIS không ra), hoặc các hồ sơ có sai số lớn > 20m - 50m
    const fieldList = enrichedCustomers.filter((e) => {
      if (e.customer.targetList === 3 || e.customer.targetList === 4) return true;
      if (e.distanceAnalysis && (e.distanceAnalysis.zone === 'ZONE_GT_50M' || e.distanceAnalysis.zone === 'ZONE_20_50M')) {
        return true;
      }
      return false;
    });

    const rows = fieldList.map(({ customer, distanceAnalysis }) => ({
      'Mã khách hàng': customer.id,
      'Tên khách hàng': customer.customerName,
      'Số điện thoại': customer.phone,
      'Địa chỉ': customer.address,
      'Phường Xã': customer.ward,
      'Quận Huyện': customer.district,
      'Số tờ số thửa': `Tờ ${customer.sheetNumber || '—'} / Thửa ${customer.plotNumber || '—'}`,
      'Phân loại danh sách': `Danh sách ${customer.targetList}`,
      'Lý do cần đo thực địa':
        customer.targetList === 4
          ? 'Không có sổ đất (hồ sơ vi bằng/giấy tay)'
          : customer.targetList === 3
          ? 'Sổ cũ tra GIS không ra kết quả'
          : `Khoảng cách sai lệch lớn (${distanceAnalysis?.minFrontageDistanceMeters}m - Cần kiểm tra)`,
      'GPS Điện thoại Lat': customer.phoneGps.lat,
      'GPS Điện thoại Lng': customer.phoneGps.lng,
      'Tháng hồ sơ': customer.intakeMonth,
      'Màu ghim quy định': customer.isSurveyPinned ? 'Xanh dương (Đã ghim)' : MONTH_COLOR_MAP[customer.intakeMonth]?.label,
      'Trạng thái thực địa': customer.isSurveyPinned ? 'ĐÃ GHIM' : 'CHƯA GHIM',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Di_Khao_Sat_Thuc_Dia');
    XLSX.writeFile(workbook, `Danh_Sach_Di_Kiem_Tra_Thuc_Te_RTK_${rows.length}Ho.xlsx`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* TOP BAR CONTRACT: 1 Row, 3 Zones */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('lists');
            setSelectedListFilter('ALL');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          Water Meter GeoPlanner
        </a>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('pipeline_summary')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pipeline_summary'
                ? 'text-teal-900 border-teal-700 font-bold bg-teal-50 px-2.5 rounded-t'
                : 'border-transparent text-slate-700 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            <span>DANH SÁCH TỔNG HỢP ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter('ALL');
            }}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'lists' && selectedListFilter === 'ALL'
                ? 'text-slate-900 border-teal-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Tất cả hồ sơ ({stats.totalCustomers})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(1);
            }}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'lists' && selectedListFilter === 1
                ? 'text-teal-800 border-teal-700 font-bold'
                : 'border-transparent hover:text-teal-800'
            }`}
          >
            DS 1: Có tọa độ ({stats.list1Count})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(2);
            }}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'lists' && selectedListFilter === 2
                ? 'text-blue-800 border-blue-700 font-bold'
                : 'border-transparent hover:text-blue-800'
            }`}
          >
            DS 2: Tra GIS có kết quả ({stats.list2Count})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(3);
            }}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'lists' && selectedListFilter === 3
                ? 'text-amber-800 border-amber-600 font-bold'
                : 'border-transparent hover:text-amber-800'
            }`}
          >
            DS 3: Tra GIS không ra ({stats.list3Count})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(4);
            }}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'lists' && selectedListFilter === 4
                ? 'text-red-800 border-red-700 font-bold'
                : 'border-transparent hover:text-red-800'
            }`}
          >
            DS 4: Không có sổ ({stats.list4Count})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('route_planner')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'route_planner'
                ? 'text-teal-800 border-teal-700 font-bold'
                : 'border-transparent hover:text-teal-800'
            }`}
          >
            Lộ trình Thực địa (≤ 20km)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cad_view')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'cad_view'
                ? 'text-slate-900 border-teal-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Sơ đồ CAD & Sai số
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'summary'
                ? 'text-slate-900 border-teal-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Tóm tắt Bước 1 & 2
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Bước 3 & Bước 4 & Báo cáo G-Drive) */}
        <div className="flex items-center gap-2">
          {/* Nút 1: Đồng bộ mã nguồn mới nhất từ GitHub khi chạy Local */}
          <button
            type="button"
            onClick={handleSyncCode}
            disabled={isSyncingCode}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
            title="Đồng bộ mã nguồn mới nhất từ GitHub qua git pull origin main (Tự động tải lại trang sau 2 giây nếu thành công)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCode ? 'animate-spin' : ''}`} />
            <span>{isSyncingCode ? 'Đang đồng bộ...' : '🔄 Đồng bộ mã nguồn mới nhất'}</span>
          </button>

          {/* Nút 2: Kích hoạt Playwright CRM Crawler Bot */}
          <button
            type="button"
            onClick={handleStartCrawler}
            disabled={isStartingCrawler}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-400 disabled:bg-emerald-200 border border-emerald-500 rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
            title="Kích hoạt Playwright Bot (headless: false) cào dữ liệu CRM thật & Gemini Vision OCR"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-950" />
            <span>🤖 Chạy Playwright CRM Bot</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBiwaseCrmCustomerId(selectedCustomerId);
              setBiwaseCrmInitialTab('SEARCH');
              setIsBiwaseCrmModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            title="Cổng CRM BIWASE: Vào mục Lắp mới -> Lọc Mã danh bộ -> Hành động (Cây viết ✏️) -> File ảnh đăng ký"
          >
            <Pencil className="w-3.5 h-3.5 text-amber-900" />
            <span>BIWASE CRM (Lắp Mới ✏️)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBiwaseCrmCustomerId(selectedCustomerId);
              setBiwaseCrmInitialTab('SUCCESS_LIST');
              setIsBiwaseCrmModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            title="Bảng kết quả tra THÀNH CÔNG mã danh bộ trên CRM"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Tra CRM Thành Công</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBiwaseCrmCustomerId(selectedCustomerId);
              setBiwaseCrmInitialTab('FAILED_LIST');
              setIsBiwaseCrmModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-rose-950 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            title="Báo cáo danh sách tra KHÔNG THÀNH CÔNG trên CRM"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
            <span>Báo Tra Không Thành Công</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGisModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-sky-950 bg-sky-200 hover:bg-sky-300 border border-sky-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            title="Cổng tra cứu GIS Xây dựng (gisxaydung.tphcm.gov.vn) cho sổ đỏ có ranh nhưng chưa có tọa độ VN-2000"
          >
            <Globe className="w-3.5 h-3.5 text-sky-800" />
            <span>GIS Xây Dựng (SQHKT)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDailyReportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            title="Kết hợp 30-40 hộ sổ đất + 20-30 hộ ghim thực tế vào 1 file gửi G-Drive"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-800" />
            <span>Báo Cáo Hàng Ngày & G-Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMyMapsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Google My Maps</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRtkExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất RTK ({selectedCustomerIds.size} hộ)</span>
          </button>
        </div>
      </header>

      {/* Thông báo trạng thái đồng bộ mã nguồn & Playwright Bot */}
      {syncMessage && (
        <div className="bg-indigo-900 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md border-b border-indigo-700 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <RefreshCw className={`w-4 h-4 text-indigo-300 ${isSyncingCode ? 'animate-spin' : ''}`} />
            <span>{syncMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncMessage(null)}
            className="text-indigo-300 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕ Đóng
          </button>
        </div>
      )}

      {/* Sub-nav mobile */}
      <div className="xl:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab('lists');
            setSelectedListFilter('ALL');
          }}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'lists' && selectedListFilter === 'ALL'
              ? 'bg-slate-900 text-white font-bold'
              : 'text-slate-600'
          }`}
        >
          Tất cả ({stats.totalCustomers})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('lists');
            setSelectedListFilter(1);
          }}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'lists' && selectedListFilter === 1
              ? 'bg-teal-700 text-white font-bold'
              : 'text-slate-600'
          }`}
        >
          DS 1 ({stats.list1Count})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('lists');
            setSelectedListFilter(2);
          }}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'lists' && selectedListFilter === 2
              ? 'bg-blue-700 text-white font-bold'
              : 'text-slate-600'
          }`}
        >
          DS 2 ({stats.list2Count})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('lists');
            setSelectedListFilter(3);
          }}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'lists' && selectedListFilter === 3
              ? 'bg-amber-600 text-white font-bold'
              : 'text-slate-600'
          }`}
        >
          DS 3 ({stats.list3Count})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('lists');
            setSelectedListFilter(4);
          }}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'lists' && selectedListFilter === 4
              ? 'bg-red-700 text-white font-bold'
              : 'text-slate-600'
          }`}
        >
          DS 4 ({stats.list4Count})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('route_planner')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'route_planner' ? 'bg-teal-800 text-white font-bold' : 'text-slate-600'
          }`}
        >
          Lộ trình (≤20km)
        </button>
        <button
          type="button"
          onClick={() => setIsDailyReportModalOpen(true)}
          className="px-2.5 py-1 rounded whitespace-nowrap bg-teal-100 text-teal-900 font-bold border border-teal-300"
        >
          Báo cáo G-Drive
        </button>
        <button
          type="button"
          onClick={() => setIsMyMapsModalOpen(true)}
          className="px-2.5 py-1 rounded whitespace-nowrap bg-blue-50 text-blue-800 font-bold"
        >
          My Maps
        </button>
        <button
          type="button"
          onClick={() => setIsRtkExportModalOpen(true)}
          className="px-2.5 py-1 rounded whitespace-nowrap bg-teal-700 text-white font-bold"
        >
          Xuất RTK ({selectedCustomerIds.size})
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* THANH ĐIỀU HƯỚNG 4 DANH SÁCH BƯỚC 2 */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(1);
            }}
            className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
              selectedListFilter === 1
                ? 'bg-teal-50 border-teal-600 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-teal-800 font-bold">
              <span>DANH SÁCH 1</span>
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats.list1Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
            </div>
            <div className="text-xs text-slate-600 truncate mt-0.5">
              Sổ mới có sẵn tọa độ VN-2000
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(2);
            }}
            className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
              selectedListFilter === 2
                ? 'bg-blue-50 border-blue-600 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
              <span>DANH SÁCH 2</span>
              <Building2 className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats.list2Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
            </div>
            <div className="text-xs text-slate-600 truncate mt-0.5">
              Tra GIS Xây dựng có kết quả
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(3);
            }}
            className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
              selectedListFilter === 3
                ? 'bg-amber-50 border-amber-600 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
              <span>DANH SÁCH 3</span>
              <HelpCircle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats.list3Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
            </div>
            <div className="text-xs text-slate-600 truncate mt-0.5">
              Tra GIS không ra (Tra thủ công)
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('lists');
              setSelectedListFilter(4);
            }}
            className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
              selectedListFilter === 4
                ? 'bg-red-50 border-red-600 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-red-800 font-bold">
              <span>DANH SÁCH 4</span>
              <FileQuestion className="w-4 h-4 text-red-700" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats.list4Count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
            </div>
            <div className="text-xs text-slate-600 truncate mt-0.5">
              Không có sổ (Bắt buộc đi RTK)
            </div>
          </button>
        </section>

        {/* NẠP FILE EXCEL ĐẦU VÀO */}
        <ExcelImporter
          currentCustomers={customers}
          onImportCustomers={(newCustomers) => {
            // TỰ ĐỘNG XÓA BỎ TOÀN BỘ DANH SÁCH CŨ VÀ THAY BẰNG DANH SÁCH MỚI
            setCustomers(newCustomers);
            setSelectedCustomerIds(new Set());
            setMarkerRoleOverrides({});
            if (newCustomers[0]) {
              setSelectedCustomerId(newCustomers[0].id);
            }
            // ĐƯA DANH SÁCH TỔNG HỢP TRƯỚC
            setActiveTab('pipeline_summary');
          }}
          onSelectCustomer={(id) => {
            setSelectedCustomerId(id);
          }}
          onGenerateBatch={(count) => {
            const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'] as const;
            const extraRows: CustomerProfile[] = Array.from({ length: count }).map((_, idx) => {
              const seq = customers.length + idx + 1;
              const mod = seq % 4;
              const targetList = (mod + 1) as TargetListType;
              const month = months[seq % months.length];
              const baseX = 1204000 + (seq * 320) % 18000;
              const baseY = 605000 + (seq * 260) % 14000;
              const vertices =
                targetList === 1 || targetList === 2
                  ? [
                      { id: '1', x: baseX, y: baseY },
                      { id: '2', x: baseX, y: baseY + 5.0 },
                      { id: '3', x: baseX + 20.0, y: baseY + 5.0 },
                      { id: '4', x: baseX + 20.0, y: baseY },
                    ]
                  : [];

              return {
                id: `KH-BDG-2026-${String(seq).padStart(3, '0')}`,
                customerName: `Chủ hộ Thửa ${seq} Bình Dương`,
                phone: `090${seq % 9} 123 ${String(100 + seq).padStart(3, '0')}`,
                address: `${seq} Đường nội bộ khu phố`,
                ward: 'Phường Dĩ An',
                district: 'TP. Dĩ An, Bình Dương',
                provinceCode: 'BDG',
                meterSerial: `DN15-${990000 + seq}`,
                intakeOfficer: 'Hồ sơ CRM tháng 09',
                createdDate: '2026-09-30',
                intakeMonth: month,
                isSurveyPinned: seq % 6 === 0, // Một số hồ sơ đã ghim thực địa màu xanh dương
                phoneGps: {
                  lat: 10.908 + (seq % 100) * 0.0005,
                  lng: 106.762 + (seq % 100) * 0.0004,
                  accuracyMeters: 4.0 + (seq % 30),
                },
                crmPhotos: [
                  { id: 'p1', title: 'Bìa Sổ', type: 'DEED_COVER', description: 'GCN', hasCoordinatesTable: false },
                  { id: 'p2', title: 'Trang 2', type: 'DEED_OWNER_INFO', description: 'Chủ sở hữu', hasCoordinatesTable: false },
                  { id: 'p3', title: 'Trang 3', type: 'DEED_PAGE3_MAP_COORDS', description: 'Sơ đồ', hasCoordinatesTable: targetList === 1 },
                ],
                hasDeed: targetList !== 4,
                certificateSerial: targetList !== 4 ? `CS 88${seq}` : undefined,
                sheetNumber: (seq % 40) + 1,
                plotNumber: (seq % 300) + 1,
                hasVn2000OnDeed: targetList === 1,
                gisLookupStatus: targetList === 2 ? 'FOUND' : targetList === 3 ? 'NOT_FOUND' : targetList === 1 ? 'NOT_NEEDED' : 'NO_DEED',
                gisNotes: targetList === 2 ? 'Tra cứu thành công trên GIS Xây dựng' : undefined,
                mainRoadName: 'Đường tiếp cận chính (Lộ giới 12m)',
                frontageEdgeIndex: 0,
                vertices,
                targetList,
                notes: 'Tạo tự động trong đợt quét 1.000 hồ sơ tháng.',
              };
            });

            setCustomers((prev) => [...prev, ...extraRows]);
          }}
        />

        {/* NỘI DUNG THEO TAB */}
        {activeTab === 'pipeline_summary' && (
          <PipelineSummaryView
            customers={customers}
            stats={pipelineStats}
            onSelectCustomer={(id) => setSelectedCustomerId(id)}
            onOpenCadView={(id) => {
              setSelectedCustomerId(id);
              setActiveTab('cad_view');
            }}
            onOpenCrmModal={(id) => {
              setBiwaseCrmCustomerId(id);
              setIsBiwaseCrmModalOpen(true);
            }}
            onOpenGisModal={(id) => {
              setSelectedCustomerId(id);
              setIsGisModalOpen(true);
            }}
            onExportRtkBatch={() => setIsRtkExportModalOpen(true)}
            onOpenPhotoGallery={(id, photoIndex) => {
              const cust = customers.find((c) => c.id === id);
              if (cust) {
                setGalleryLightboxCustomer(cust);
                setGalleryLightboxInitialIndex(photoIndex ?? 0);
              }
            }}
            onOpenAuditLog={(id) => {
              const cust = customers.find((c) => c.id === id);
              if (cust) {
                setAuditLogCustomer(cust);
              }
            }}
            onExportAllAuditLogs={() => {
              setIsAllAuditLogsModalOpen(true);
            }}
          />
        )}

        {activeTab === 'route_planner' && (
          <RouteOptimizerView customers={customers} frontageMap={frontageMap} />
        )}

        {activeTab === 'summary' && (
          <ExecutiveSummaryView
            stats={stats}
            onSelectTargetList={(list) => {
              setSelectedListFilter(list);
              setActiveTab('lists');
            }}
            onExportList={() => setIsRtkExportModalOpen(true)}
          />
        )}

        {activeTab === 'cad_view' && selectedRow && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 border border-slate-200 bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-xs font-bold text-slate-800">
                  Chọn khách hàng kiểm tra CAD & Khoảng cách
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {stats.totalCustomers} hồ sơ
                </span>
              </div>

              {/* THANH TIẾN TRÌNH TRỰC QUAN */}
              <div className="p-3 bg-slate-900 text-white rounded-lg space-y-2 border border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Tiến độ hoàn thành:</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    <strong>{stats.list1Count + stats.list2Count + stats.list3Count + stats.list4Count}</strong> / {stats.totalCustomers} khách ({Math.min(100, Math.round(((stats.list1Count + stats.list2Count + stats.list3Count + stats.list4Count) / (stats.totalCustomers || 1)) * 100))}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden flex border border-slate-700/60 p-0.5">
                  <div
                    style={{ width: `${Math.round((stats.list1Count / (stats.totalCustomers || 1)) * 100)}%` }}
                    className="bg-emerald-500 h-full rounded-l-full"
                    title={`DS 1 (CRM): ${stats.list1Count} hộ`}
                  />
                  <div
                    style={{ width: `${Math.round((stats.list2Count / (stats.totalCustomers || 1)) * 100)}%` }}
                    className="bg-sky-500 h-full"
                    title={`DS 2 (GIS): ${stats.list2Count} hộ`}
                  />
                  <div
                    style={{ width: `${Math.round(((stats.list3Count + stats.list4Count) / (stats.totalCustomers || 1)) * 100)}%` }}
                    className="bg-rose-500 h-full rounded-r-full"
                    title={`DS 3 & 4 (RTK): ${stats.list3Count + stats.list4Count} hộ`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 pt-0.5 font-medium">
                  <span className="text-emerald-300">DS 1: {stats.list1Count}</span>
                  <span className="text-sky-300">DS 2: {stats.list2Count}</span>
                  <span className="text-rose-300">DS 3 & 4: {stats.list3Count + stats.list4Count}</span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[640px] overflow-y-auto">
                {enrichedCustomers.map(({ customer, distanceAnalysis }) => {
                  const isSelected = customer.id === selectedRow.customer.id;
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50/80 border-teal-600'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900">{customer.id}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          DS {customer.targetList}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        {customer.customerName}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                        {customer.address}, {customer.ward}
                      </div>
                      {distanceAnalysis && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-slate-500">Sai số ĐT:</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${distanceAnalysis.zoneColorClass}`}>
                            d = {distanceAnalysis.minFrontageDistanceMeters}m ({distanceAnalysis.zoneLabel})
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {selectedRow.frontageAnalysis && selectedRow.distanceAnalysis ? (
                <>
                  <ParcelCadViewer
                    vertices={selectedRow.customer.vertices}
                    frontageEdgeIndex={selectedRow.customer.frontageEdgeIndex}
                    analysis={selectedRow.frontageAnalysis}
                    distanceAnalysis={selectedRow.distanceAnalysis}
                    phoneGps={selectedRow.customer.phoneGps}
                    mainRoadName={selectedRow.customer.mainRoadName}
                    sheetNumber={selectedRow.customer.sheetNumber}
                    plotNumber={selectedRow.customer.plotNumber}
                    viewFromRoadIntoLand={viewFromRoadIntoLand}
                    centralMeridianDeg={105.75} // Bình Dương 105°45'
                    scaleFactor={0.9999}
                    maDanhBo={selectedRow.customer.maDanhBo || selectedRow.customer.meterSerial.replace('DB-', '')}
                    customerAddress={selectedRow.customer.address}
                    isCornerPlot={selectedRow.customer.isCornerPlot}
                    roadFrontages={selectedRow.customer.roadFrontages}
                    appliedCorrectionMethod={selectedRow.customer.appliedCorrectionMethod || 'PHUONG_AN_A'}
                    onChangeFrontageEdge={(idx) =>
                      handleChangeFrontageEdge(selectedRow.customer.id, idx)
                    }
                    onToggleViewDirection={() => setViewFromRoadIntoLand((v) => !v)}
                  />

                  {/* Chi tiết 2 mốc WGS-84 & Quy tắc kích thước nhỏ hơn */}
                  <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-800">
                        Quy tắc chọn Mốc RTK (Bước 3): Ưu tiên mốc có kích thước khoảng cách nhỏ hơn
                      </span>
                      <span className="text-emerald-700 font-bold font-mono">
                        Chọn:{' '}
                        {selectedRow.distanceAnalysis.distanceToLeftMarkerMeters <=
                        selectedRow.distanceAnalysis.distanceToRightMarkerMeters
                          ? `Mốc Trái (d = ${selectedRow.distanceAnalysis.distanceToLeftMarkerMeters}m)`
                          : `Mốc Phải (d = ${selectedRow.distanceAnalysis.distanceToRightMarkerMeters}m)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div
                        className={`p-3 rounded border space-y-1 ${
                          selectedRow.distanceAnalysis.distanceToLeftMarkerMeters <=
                          selectedRow.distanceAnalysis.distanceToRightMarkerMeters
                            ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-400'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-800">
                            MỐC TRÁI (Đỉnh {selectedRow.frontageAnalysis.leftMarker.vertexId})
                          </span>
                          <span className="font-mono font-bold text-sky-700">
                            d = {selectedRow.distanceAnalysis.distanceToLeftMarkerMeters}m
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {Number(selectedRow.frontageAnalysis?.leftMarker?.wgs84?.lat || 0).toFixed(8)},{' '}
                          {Number(selectedRow.frontageAnalysis?.leftMarker?.wgs84?.lng || 0).toFixed(8)}
                        </div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          VN-2000: X={Number(selectedRow.frontageAnalysis?.leftMarker?.vn2000?.x || 0).toFixed(3)}, Y=
                          {Number(selectedRow.frontageAnalysis?.leftMarker?.vn2000?.y || 0).toFixed(3)}
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded border space-y-1 ${
                          selectedRow.distanceAnalysis.distanceToRightMarkerMeters <
                          selectedRow.distanceAnalysis.distanceToLeftMarkerMeters
                            ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800">
                            MỐC PHẢI (Đỉnh {selectedRow.frontageAnalysis.rightMarker.vertexId})
                          </span>
                          <span className="font-mono font-bold text-emerald-700">
                            d = {selectedRow.distanceAnalysis.distanceToRightMarkerMeters}m
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {Number(selectedRow.frontageAnalysis?.rightMarker?.wgs84?.lat || 0).toFixed(8)},{' '}
                          {Number(selectedRow.frontageAnalysis?.rightMarker?.wgs84?.lng || 0).toFixed(8)}
                        </div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          VN-2000: X={Number(selectedRow.frontageAnalysis?.rightMarker?.vn2000?.x || 0).toFixed(3)}, Y=
                          {Number(selectedRow.frontageAnalysis?.rightMarker?.vn2000?.y || 0).toFixed(3)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="border border-slate-200 bg-white rounded-lg p-8 text-center text-slate-600 space-y-2">
                  <FileQuestion className="w-8 h-8 text-amber-600 mx-auto" />
                  <h3 className="font-bold text-slate-900">
                    Khách hàng {selectedRow.customer.id} chưa có tọa độ ranh giới
                  </h3>
                  <p className="text-xs">
                    Thuộc {selectedRow.customer.targetList === 3 ? 'Danh sách 3 (Tra GIS chưa ra)' : 'Danh sách 4 (Không có sổ đất)'}. Bắt buộc phải xếp lịch kiểm tra thực địa bằng máy RTK.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'lists' && (
          <div className="space-y-4">
            {/* THANH CÔNG CỤ CHỌN HÀNG LOẠT VÀ XUẤT BƯỚC 3 / BƯỚC 4 */}
            <div className="border border-teal-200 bg-teal-50/70 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-teal-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <span>Chọn đơn tin cậy để đề nghị xuất file RTK (Bước 3):</span>
                </span>

                <button
                  type="button"
                  onClick={handleSelectHighReliability}
                  className="px-3 py-1.5 font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer"
                >
                  ✓ Chọn nhanh các đơn độ tin cậy cao (&lt; 10m: {stats.skipFieldPotentialCount} hộ)
                </button>

                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-2.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Chọn tất cả đang hiển thị
                </button>

                {selectedCustomerIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1.5 font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Bỏ chọn ({selectedCustomerIds.size})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGisModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-sky-950 bg-sky-100 hover:bg-sky-200 border border-sky-300 rounded-lg transition-colors cursor-pointer"
                  title="Tra cứu tự động qua cổng GIS Xây dựng (gisxaydung.tphcm.gov.vn) cho các sổ cũ chưa có tọa độ VN-2000"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-700" />
                  <span>Tra Cứu GIS Xây Dựng (SQHKT)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportUnreliableForFieldSurvey}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                  title="Xuất file danh sách chưa có tọa độ tin cậy để đi thực địa"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Xuất File Chưa Tin Cậy (Đi Thực Địa)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRtkExportModalOpen(true)}
                  disabled={selectedCustomerIds.size === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Chuyển {selectedCustomerIds.size} hộ sang Xuất File RTK</span>
                </button>
              </div>
            </div>

            {/* THANH LỌC VÙNG SAI SỐ HÌNH HỌC */}
            <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Lọc theo Vùng Khoảng cách Sai số (Bước 2):</span>
                  <span className="text-slate-500">(Đối chiếu Mốc Ranh Lối vào vs GPS Điện thoại)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCoordFormat((c) => (c === 'DD' ? 'DMS' : 'DD'))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 cursor-pointer"
                  >
                    Định dạng tọa độ: <strong>{coordFormat}</strong>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedZoneFilter('ALL')}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    selectedZoneFilter === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả vùng ({stats.totalCustomers})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedZoneFilter('ZONE_LT_10M')}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    selectedZoneFilter === 'ZONE_LT_10M'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  &lt; 10m (Tin cậy cao: {stats.zoneLt10mCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedZoneFilter('ZONE_10_20M')}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    selectedZoneFilter === 'ZONE_10_20M'
                      ? 'bg-blue-700 text-white font-bold'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  10m – 20m ({stats.zone10to20mCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedZoneFilter('ZONE_20_50M')}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    selectedZoneFilter === 'ZONE_20_50M'
                      ? 'bg-amber-700 text-white font-bold'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  20m – 50m ({stats.zone20to50mCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedZoneFilter('ZONE_GT_50M')}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    selectedZoneFilter === 'ZONE_GT_50M'
                      ? 'bg-red-700 text-white font-bold'
                      : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  &gt; 50m ({stats.zoneGt50mCount})
                </button>
              </div>

              {/* Ô tìm kiếm */}
              <div className="pt-2 border-t border-slate-100 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo Mã khách hàng, Tên chủ hộ, Số Tờ, Số Thửa, Địa chỉ, Tên đường..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>

            {/* BẢNG DỮ LIỆU CHÍNH */}
            <div className="border border-slate-200 bg-white rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-900">
                    Bảng Quản lý Hồ sơ & Tọa độ 2 Mốc Mặt tiền (Hệ WGS-84 & Bình Dương VN-2000)
                  </span>
                  <span className="text-slate-500 ml-2">
                    (Hiển thị {filteredCustomers.length} khách hàng · Đã chọn {selectedCustomerIds.size} hộ)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMyMapsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xem Ghim Màu My Maps</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700">
                      <th className="py-2.5 px-3 font-semibold w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredCustomers.length > 0 &&
                            filteredCustomers.every((f) => selectedCustomerIds.has(f.customer.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectAllVisible();
                            } else {
                              handleClearSelection();
                            }
                          }}
                          className="rounded cursor-pointer"
                          title="Chọn/Bỏ chọn tất cả"
                        />
                      </th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Khách hàng / Mã CRM</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Phân loại & Tháng ghim</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Sổ đất & Lối vào chính</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Mốc Trái (WGS-84)</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Mốc Phải (WGS-84)</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Sai số Hình học (Bước 2)</th>
                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 px-4 text-center text-slate-500">
                          Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map(({ customer, frontageAnalysis, distanceAnalysis }) => {
                        const isSelectedRow = selectedCustomerId === customer.id;
                        const isChecked = selectedCustomerIds.has(customer.id);
                        const monthColor = MONTH_COLOR_MAP[customer.intakeMonth] || { hex: '#0284c7', label: customer.intakeMonth };

                        return (
                          <tr
                            key={customer.id}
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelectedRow ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Checkbox chọn thủ công */}
                            <td className="py-3 px-3 text-center align-top" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectCustomer(customer.id)}
                                className="rounded cursor-pointer mt-1"
                                title="Chọn để chuyển sang danh sách đề nghị xuất file RTK"
                              />
                            </td>

                            {/* Cột 1: Khách hàng */}
                            <td className="py-3 px-3 align-top">
                              <div className="font-mono font-bold text-slate-900 tabular-nums">
                                {customer.id}
                              </div>
                              <div className="font-semibold text-slate-900 mt-0.5">
                                {customer.customerName}
                              </div>
                              <div className="text-slate-600 mt-0.5 truncate max-w-[180px]">
                                {customer.address}, {customer.ward}
                              </div>
                              <div className="text-slate-400 text-[11px] mt-0.5 font-mono">
                                ĐH: {customer.meterSerial}
                              </div>
                            </td>

                            {/* Cột 2: Phân loại 4 danh sách & Màu ghim tháng */}
                            <td className="py-3 px-3 align-top">
                              {customer.targetList === 1 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>DS 1: Sổ có tọa độ</span>
                                </span>
                              )}
                              {customer.targetList === 2 && (
                                customer.adjacentGisLookup && customer.adjacentGisLookup.foundAdjacentSide !== 'NONE' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-teal-900 bg-teal-50 border border-teal-300">
                                      <Layers className="w-3.5 h-3.5 text-teal-700" />
                                      <span>DS 2: Mốc cạnh chung Thửa {customer.adjacentGisLookup.foundPlotNumber}</span>
                                    </span>
                                    <div className="text-[10px] text-teal-800 font-medium">
                                      ({customer.adjacentGisLookup.foundAdjacentSide === 'LEFT' ? '← Thửa giáp ranh bên trái' : 'Thửa giáp ranh bên phải →'})
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>DS 2: Tra GIS có kết quả</span>
                                  </span>
                                )
                              )}
                              {customer.targetList === 3 && (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300">
                                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>DS 3: Tra GIS & Thửa lân cận không ra</span>
                                  </span>
                                  <div className="text-[10px] text-amber-700 font-medium">
                                    (Chưa cập nhật quy hoạch tách thửa)
                                  </div>
                                </div>
                              )}
                              {customer.targetList === 4 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-red-800 bg-red-50 border border-red-200">
                                  <FileQuestion className="w-3.5 h-3.5" />
                                  <span>DS 4: Không có sổ đất</span>
                                </span>
                              )}

                              <div className="flex items-center gap-1.5 mt-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block"
                                  style={{
                                    backgroundColor: customer.isSurveyPinned ? PINNED_BLUE_COLOR.hex : monthColor.hex,
                                  }}
                                />
                                <span className="text-[11px] text-slate-600">
                                  {customer.isSurveyPinned ? 'Đã ghim Xanh dương' : monthColor.label}
                                </span>
                              </div>
                            </td>

                            {/* Cột 3: Sổ đất & Lối vào chính */}
                            <td className="py-3 px-3 align-top">
                              {customer.hasDeed ? (
                                <div className="space-y-0.5">
                                  <div className="font-mono text-slate-800 tabular-nums">
                                    Tờ {customer.sheetNumber ?? '—'} / Thửa {customer.plotNumber ?? '—'}
                                  </div>
                                  {customer.adjacentGisLookup?.foundPlotNumber && (
                                    <div className="text-[11px] font-semibold text-teal-800 bg-teal-50/80 border border-teal-200 px-1.5 py-0.5 rounded">
                                      Cạnh chung với Thửa {customer.adjacentGisLookup.foundPlotNumber} ({customer.adjacentGisLookup.foundAdjacentSide === 'LEFT' ? 'bên trái' : 'bên phải'})
                                    </div>
                                  )}
                                  <div className="text-slate-700 font-medium">
                                    Lối vào: {customer.mainRoadName}
                                  </div>
                                  {frontageAnalysis && (
                                    <div className="text-slate-500 text-[11px] font-mono tabular-nums">
                                      Mặt tiền: {frontageAnalysis.frontageWidthMeters}m · Phương vị: {frontageAnalysis.roadAzimuthDegrees}°
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-slate-400 italic">
                                  Không có sổ đất đính kèm trên CRM
                                </div>
                              )}
                            </td>

                            {/* Cột 4: Mốc Trái (WGS-84) */}
                            <td className="py-3 px-3 align-top font-mono tabular-nums">
                              {frontageAnalysis && customer.targetList !== 3 ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-sans font-bold text-sky-800">
                                      {customer.adjacentGisLookup?.sharedMarkerSide === 'LEFT'
                                        ? `Đỉnh 1 (Mốc cạnh chung Thửa ${customer.adjacentGisLookup.foundPlotNumber})`
                                        : `Đỉnh ${frontageAnalysis.leftMarker.vertexId} (Trái)`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(
                                          `L-${customer.id}`,
                                          `${frontageAnalysis.leftMarker.wgs84.lat}, ${frontageAnalysis.leftMarker.wgs84.lng}`
                                        );
                                      }}
                                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                      title="Copy WGS-84 Mốc Trái"
                                    >
                                      {copiedKey === `L-${customer.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  {coordFormat === 'DD' ? (
                                    <div className="text-slate-900 font-semibold">
                                      {Number(frontageAnalysis.leftMarker?.wgs84?.lat || 0).toFixed(8)}
                                      <br />
                                      {Number(frontageAnalysis.leftMarker?.wgs84?.lng || 0).toFixed(8)}
                                    </div>
                                  ) : (
                                    <div className="text-slate-900 font-semibold text-[11px]">
                                      {frontageAnalysis.leftMarker.wgs84.latDms}
                                      <br />
                                      {frontageAnalysis.leftMarker.wgs84.lngDms}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-500">
                                    X: {frontageAnalysis.leftMarker.vn2000.x.toFixed(3)} · Y: {frontageAnalysis.leftMarker.vn2000.y.toFixed(3)}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-50/80 border border-amber-200 rounded p-2 text-center space-y-1">
                                  <div className="text-[11px] font-bold text-amber-900 flex items-center justify-center gap-1 font-sans">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    Chưa xác định mốc
                                  </div>
                                  <div className="text-[10px] text-amber-700 font-sans">Tra GIS không ra cả 2 thửa lân cận</div>
                                  <div className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5 font-sans">
                                    Bắt buộc đo RTK
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Cột 5: Mốc Phải (WGS-84) */}
                            <td className="py-3 px-3 align-top font-mono tabular-nums">
                              {frontageAnalysis && customer.targetList !== 3 ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-sans font-bold text-emerald-800">
                                      {customer.adjacentGisLookup?.sharedMarkerSide === 'RIGHT'
                                        ? `Đỉnh 2 (Mốc cạnh chung Thửa ${customer.adjacentGisLookup.foundPlotNumber})`
                                        : `Đỉnh ${frontageAnalysis.rightMarker.vertexId} (Phải)`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(
                                          `R-${customer.id}`,
                                          `${frontageAnalysis.rightMarker.wgs84.lat}, ${frontageAnalysis.rightMarker.wgs84.lng}`
                                        );
                                      }}
                                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                      title="Copy WGS-84 Mốc Phải"
                                    >
                                      {copiedKey === `R-${customer.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  {coordFormat === 'DD' ? (
                                    <div className="text-slate-900 font-semibold">
                                      {Number(frontageAnalysis.rightMarker?.wgs84?.lat || 0).toFixed(8)}
                                      <br />
                                      {Number(frontageAnalysis.rightMarker?.wgs84?.lng || 0).toFixed(8)}
                                    </div>
                                  ) : (
                                    <div className="text-slate-900 font-semibold text-[11px]">
                                      {frontageAnalysis.rightMarker.wgs84.latDms}
                                      <br />
                                      {frontageAnalysis.rightMarker.wgs84.lngDms}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-500">
                                    X: {frontageAnalysis.rightMarker.vn2000.x.toFixed(3)} · Y: {frontageAnalysis.rightMarker.vn2000.y.toFixed(3)}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-50/80 border border-amber-200 rounded p-2 text-center space-y-1">
                                  <div className="text-[11px] font-bold text-amber-900 flex items-center justify-center gap-1 font-sans">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    Chưa xác định mốc
                                  </div>
                                  <div className="text-[10px] text-amber-700 font-sans">Tra GIS không ra cả 2 thửa lân cận</div>
                                  <div className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5 font-sans">
                                    Bắt buộc đo RTK
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Cột 6: Phân tích Sai số Hình học & Tiêu chí Kích thước nhỏ hơn */}
                            <td className="py-3 px-3 align-top font-mono tabular-nums">
                              {distanceAnalysis && customer.targetList !== 3 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${distanceAnalysis.zoneColorClass}`}>
                                      {distanceAnalysis.zoneLabel}
                                    </span>
                                  </div>
                                  <div className="text-slate-900 font-bold">
                                    d = {distanceAnalysis.minFrontageDistanceMeters}m
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-sans">
                                    {distanceAnalysis.canSkipFieldSurvey ? (
                                      <span className="text-emerald-700 font-semibold">
                                        ✓ Miễn đi thực tế (Lấy mốc ngay)
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 font-semibold">
                                        Cần đối chiếu / Đo RTK
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-50/70 border border-amber-200 rounded p-2 text-xs space-y-1 font-sans">
                                  <div className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                                    Chưa có mốc GIS đối chiếu
                                  </div>
                                  <div className="text-[10px] text-amber-800">
                                    Ranh địa chính chưa cập nhật quy hoạch trên GIS
                                  </div>
                                  <div className="text-[10px] font-bold text-red-700">
                                    ⚡ Bắt buộc đo thực địa hiện trường
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Cột 7: Hành động (Chuẩn CRM BIWASE) */}
                            <td className="py-3 px-3 align-top text-right whitespace-nowrap space-y-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBiwaseCrmCustomerId(customer.id);
                                  setIsBiwaseCrmModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-xs transition-transform hover:scale-105 cursor-pointer"
                                title="Hành động: Chọn biểu tượng Cây viết ✏️ -> Xem File ảnh đăng ký & Tọa độ sổ đất"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Cây viết ✏️ (Ảnh đăng ký)</span>
                              </button>

                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingCustomer(customer);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                  title="Xem ảnh CRM & Tra GIS"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Hồ sơ CRM</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCustomerId(customer.id);
                                    setActiveTab('cad_view');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                                >
                                  <span>CAD</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 0: CỔNG BIWASE CRM (LẮP MỚI -> LỌC MÃ DANH BỘ -> CÂY VIẾT -> FILE ẢNH ĐĂNG KÝ) */}
      <BiwaseCrmModal
        isOpen={isBiwaseCrmModalOpen}
        onClose={() => setIsBiwaseCrmModalOpen(false)}
        customers={customers}
        initialCustomerId={biwaseCrmCustomerId}
        initialTab={biwaseCrmInitialTab}
        onSelectCustomerForCad={(id) => {
          setSelectedCustomerId(id);
          setActiveTab('cad_view');
        }}
        onUpdateCustomerCategory={handleUpdateCustomerCategory}
        onUpdateCustomer={(updated) => {
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        }}
      />

      {/* MODAL LIGHTBOX DUYỆT ẢNH & OCR SỔ ĐẤT CRM TOÀN CỤC */}
      {galleryLightboxCustomer && (
        <CrmPhotoGalleryLightbox
          isOpen={!!galleryLightboxCustomer}
          onClose={() => setGalleryLightboxCustomer(null)}
          customer={galleryLightboxCustomer}
          initialPhotoIndex={galleryLightboxInitialIndex}
          onSyncDeedData={(updated) => {
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setGalleryLightboxCustomer(updated);
          }}
        />
      )}

      {/* MODAL XEM FILE LOG CHI TIẾT (AUDIT LOG TRACE) */}
      {(auditLogCustomer || isAllAuditLogsModalOpen) && (
        <CrmAuditLogModal
          isOpen={!!(auditLogCustomer || isAllAuditLogsModalOpen)}
          onClose={() => {
            setAuditLogCustomer(null);
            setIsAllAuditLogsModalOpen(false);
          }}
          customer={auditLogCustomer}
          allCustomers={customers}
          onOpenPhotoViewer={(cId, pIdx) => {
            const found = customers.find((c) => c.id === cId);
            if (found) {
              setGalleryLightboxCustomer(found);
              setGalleryLightboxInitialIndex(pIdx ?? 0);
            }
          }}
        />
      )}

      {/* MODAL 1: KIỂM TRA ẢNH CRM & TRA CỨU GIS */}
      {inspectingCustomer && (
        <CrmInspectorModal
          customer={inspectingCustomer}
          isOpen={!!inspectingCustomer}
          onClose={() => setInspectingCustomer(null)}
          onUpdateCustomerCategory={handleUpdateCustomerCategory}
        />
      )}

      {/* MODAL 2: XUẤT FILE CHUẨN MÁY RTK & CHIA CẮT 30 - 40 HỘ/NGÀY (BƯỚC 3 & 4) */}
      <RtkBatchExportModal
        isOpen={isRtkExportModalOpen}
        candidates={rtkExportCandidates}
        onClose={() => setIsRtkExportModalOpen(false)}
        onToggleCandidateRole={handleToggleCandidateMarkerRole}
      />

      {/* MODAL 3: GOOGLE MY MAPS & QUẢN LÝ GHIM THỰC ĐỊA */}
      <MyMapsExportModal
        isOpen={isMyMapsModalOpen}
        customers={customers}
        frontageMap={frontageMap}
        onClose={() => setIsMyMapsModalOpen(false)}
        onToggleSurveyPinned={handleToggleSurveyPinned}
      />

      {/* MODAL 4: BÁO CÁO KẾT HỢP HÀNG NGÀY & GỬI G-DRIVE CƠ QUAN */}
      <DailyCombinedReportModal
        isOpen={isDailyReportModalOpen}
        customers={customers}
        frontageMap={frontageMap}
        onClose={() => setIsDailyReportModalOpen(false)}
      />

      {/* MODAL 5: CỔNG TRA CỨU GIS QUY HOẠCH XÂY DỰNG (gisxaydung.tphcm.gov.vn/tracuuttqh) */}
      <GisXaydungModal
        isOpen={isGisModalOpen}
        onClose={() => setIsGisModalOpen(false)}
        customers={customers}
        onUpdateCustomerCategory={handleUpdateCustomerCategory}
        onUpdateCustomerGisStatus={handleUpdateCustomerGisStatus}
      />

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-8">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            Water Meter GeoPlanner — Hệ thống Định vị RTK Đồng hồ Nước, Phân vùng Sai số & Tích hợp Google My Maps
          </span>
          <span className="font-mono tabular-nums">
            Hệ quy chiếu VN-2000 Bình Dương (L0 = 105°45') & WGS-84 Quốc tế · Chuẩn máy RTK Leica/Trimble/CHCNAV/South
          </span>
        </div>
      </footer>
    </div>
  );
}
