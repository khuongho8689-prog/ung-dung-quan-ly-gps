import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CustomerProfile } from '../data/customerDatabase';
import {
  DayRoutePlan,
  partitionAndOptimizeFieldRoutes,
  calculateAverageWgs84Coord,
} from '../utils/routeOptimizer';
import { FrontageAnalysisResult } from '../utils/vn2000';
import {
  Navigation,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Download,
  ExternalLink,
  Compass,
  CheckCircle2,
  Sliders,
  Milestone,
} from 'lucide-react';

interface RouteOptimizerViewProps {
  customers: CustomerProfile[];
  frontageMap: Map<string, FrontageAnalysisResult>;
}

export const RouteOptimizerView: React.FC<RouteOptimizerViewProps> = ({
  customers,
  frontageMap,
}) => {
  // Chỉ lấy những khách hàng cần thiết đi ra ngoài thực địa:
  // 1. Thuộc Danh sách 4 (không có sổ đất)
  // 2. Thuộc Danh sách 3 (sổ cũ tra GIS không ra)
  // 3. Khách hàng có sai số lớn > 25m - 30m
  // 4. Chưa được ghim thực tế
  const defaultFieldPool = useMemo(() => {
    return customers.filter((c) => {
      if (c.targetList === 3 || c.targetList === 4) return true;
      if (!c.isSurveyPinned) {
        const frontage = frontageMap.get(c.id);
        if (frontage) {
          // Tính sai số
          const dMid = Math.sqrt(
            Math.pow((c.phoneGps.lat - frontage.midpointWgs84.lat) * 111000, 2) +
            Math.pow((c.phoneGps.lng - frontage.midpointWgs84.lng) * 111000, 2)
          );
          if (dMid > 20) return true;
        } else {
          return true;
        }
      }
      return false;
    });
  }, [customers, frontageMap]);

  const [selectedPoolMode, setSelectedPoolMode] = useState<'FIELD_ONLY' | 'ALL_UNPINNED'>('FIELD_ONLY');
  const [stopsPerDay, setStopsPerDay] = useState<number>(25); // Mặc định 25 hộ/ngày (20 - 30 hộ)
  const [startDateStr, setStartDateStr] = useState<string>('2026-10-01');
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  const activeCandidates = useMemo(() => {
    if (selectedPoolMode === 'FIELD_ONLY') {
      return defaultFieldPool.length > 0 ? defaultFieldPool : customers.filter((c) => !c.isSurveyPinned);
    }
    return customers.filter((c) => !c.isSurveyPinned);
  }, [selectedPoolMode, defaultFieldPool, customers]);

  // Phân cụm và tối ưu hóa lộ trình
  const routePlans: DayRoutePlan[] = useMemo(() => {
    return partitionAndOptimizeFieldRoutes(
      activeCandidates,
      frontageMap,
      stopsPerDay,
      startDateStr
    );
  }, [activeCandidates, frontageMap, stopsPerDay, startDateStr]);

  const activePlan = useMemo(() => {
    return (
      routePlans.find((p) => p.dayNumber === selectedDayNumber) ||
      routePlans[0]
    );
  }, [routePlans, selectedDayNumber]);

  // Xuất file Excel lịch trình
  const handleExportRouteExcel = (plan: DayRoutePlan) => {
    const rows = plan.stops.map((s) => ({
      'Thứ tự dừng': s.stopOrder,
      'Mã khách hàng': s.customer.id,
      'Tên khách hàng': s.customer.customerName,
      'Số điện thoại': s.customer.phone,
      'Số thân đồng hồ': s.customer.meterSerial,
      'Địa chỉ': s.customer.address,
      'Phường Xã': s.customer.ward,
      'Đường lối vào chính': s.roadAccessName,
      'Vĩ độ (WGS-84 Lat)': s.effectiveLat,
      'Kinh độ (WGS-84 Lng)': s.effectiveLng,
      'Căn cứ tọa độ': s.coordSourceLabel,
      'Khoảng cách tới điểm kế tiếp (m)': s.distanceToNextStopMeters,
      'Ngày khảo sát': plan.scheduledDate,
      'Cụm khu vực': plan.clusterName,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Ngay_${plan.dayNumber}`);
    XLSX.writeFile(
      workbook,
      `Lo_Trinh_Toi_Uu_Ngay_${plan.dayNumber}_${plan.scheduledDate}_${plan.stops.length}Ho.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Khung cấu hình Tối ưu hóa Lộ trình */}
      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                TỐI ƯU HÓA LỘ TRÌNH THỰC ĐỊA
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Tổng cộng {activeCandidates.length} khách hàng cần đi đo RTK
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Phân Cụm Địa Lý & Tính Toán Lộ Trình Di Chuyển Ngắn Nhất Hàng Ngày (≤ 20 km/ngày)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Hệ thống tự động tính tọa độ trung bình WGS-84 làm tâm điều hành, gom cụm 20 – 30 khách hàng/ngày và giải thuật toán hành trình ngắn nhất.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Giới hạn: ≤ 20 km di chuyển/ngày</span>
            </span>
          </div>
        </div>

        {/* Thanh tham số điều khiển */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-700" />
              <span>Số lượng khách hàng mỗi ngày:</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[20, 25, 30].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setStopsPerDay(sz)}
                  className={`flex-1 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                    stopsPerDay === sz
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sz} hộ/ngày
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>Ngày bắt đầu tuyến đo:</span>
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-teal-700" />
              <span>Nguồn hồ sơ đưa vào lộ trình:</span>
            </label>
            <select
              value={selectedPoolMode}
              onChange={(e) => setSelectedPoolMode(e.target.value as any)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-medium"
            >
              <option value="FIELD_ONLY">Chỉ hồ sơ cần đi thực địa ({defaultFieldPool.length} hộ)</option>
              <option value="ALL_UNPINNED">Tất cả hồ sơ chưa ghim ({customers.filter((c) => !c.isSurveyPinned).length} hộ)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
              Đã chia thành <strong>{routePlans.length} ngày</strong> khảo sát liên tiếp cho các vùng lân cận.
            </div>
          </div>
        </div>

        {/* 3 Quy tắc ưu tiên tọa độ theo yêu cầu của bạn */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-bold text-slate-800">Quy tắc ưu tiên tọa độ:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
            <span>1. Lấy mốc ranh thửa đất tiếp cận đường</span>
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
            <span>2. Tọa độ điện thoại (nếu không có sổ đất)</span>
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
            <span>3. Điều hướng chính xác vào đường tiếp cận ngắn nhất</span>
          </span>
        </div>
      </div>

      {/* Tabs chọn Ngày & Cụm khu vực lân cận */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        {routePlans.map((plan) => {
          const isSelected = selectedDayNumber === plan.dayNumber;
          return (
            <button
              key={plan.dayNumber}
              type="button"
              onClick={() => setSelectedDayNumber(plan.dayNumber)}
              className={`p-3 rounded-lg border text-left transition-colors whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-teal-800 text-white border-teal-800 shadow-xs font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span>Ngày {plan.dayNumber}: {plan.scheduledDate}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-teal-900 text-teal-200' : 'bg-slate-100 text-slate-600'}`}>
                  {plan.totalDistanceKm} km
                </span>
              </div>
              <div className={`text-[11px] mt-1 ${isSelected ? 'text-teal-200' : 'text-slate-500'}`}>
                {plan.clusterName} ({plan.totalStopsCount} khách hàng)
              </div>
            </button>
          );
        })}
      </div>

      {/* Chi tiết Lộ trình của Ngày đang chọn */}
      {activePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Bản đồ lộ trình & Thẻ thông tin trung tâm (5/12) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Thẻ Tọa độ Trung bình WGS-84 & Tổng quãng đường */}
            <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-4">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-mono">LỘ TRÌNH KHẢO SÁT NGÀY {activePlan.dayNumber}</div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {activePlan.clusterName} — {activePlan.scheduledDate}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-teal-800 tabular-nums">
                    {activePlan.totalDistanceKm} <span className="text-xs font-normal text-slate-500">km</span>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700">
                    {activePlan.isWithin20KmLimit ? '✓ Đạt giới hạn ≤ 20 km/ngày' : 'Cần lưu ý: > 20 km'}
                  </div>
                </div>
              </div>

              {/* Tọa độ trung bình WGS-84 của khu vực */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-700" />
                    <span>Tọa độ Trung bình WGS-84 (Tâm Cụm Ngày {activePlan.dayNumber}):</span>
                  </span>
                  <span className="font-mono text-[10px] bg-amber-200/60 px-1.5 py-0.5 rounded text-amber-900">
                    Centroid
                  </span>
                </div>
                <div className="text-base font-mono font-bold text-slate-900 tabular-nums">
                  {activePlan.averageCoord.lat.toFixed(7)}, {activePlan.averageCoord.lng.toFixed(7)}
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Điểm trung tâm không gian dùng làm mốc tập kết xuất phát. Toàn bộ {activePlan.totalStopsCount} khách hàng nằm trong bán kính hẹp xung quanh điểm này.
                </p>
              </div>

              {/* Các nút hành động lộ trình */}
              <div className="space-y-2 pt-1">
                <a
                  href={activePlan.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Mở Dẫn Đường Google Maps (Trên Điện Thoại)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => handleExportRouteExcel(activePlan)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-teal-700" />
                  <span>Xuất File Excel Lộ Trình Ngày {activePlan.dayNumber} (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Sơ đồ trực quan nối các điểm lộ trình 1 -> 2 -> 3... */}
            <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                <span>Sơ đồ Thứ tự Lộ trình Di chuyển (TSP Ngắn nhất)</span>
                <span className="font-mono text-slate-500 font-normal">
                  {activePlan.stops.length} trạm dừng
                </span>
              </div>

              <div className="relative bg-slate-950 rounded-lg p-4 text-slate-100 overflow-hidden select-none">
                <svg
                  viewBox="0 0 460 320"
                  className="w-full h-auto block"
                  role="img"
                  aria-label="Sơ đồ nối tuyến lộ trình di chuyển"
                >
                  {/* Bounding box normalize */}
                  {(() => {
                    const lats = activePlan.stops.map((s) => s.effectiveLat);
                    const lngs = activePlan.stops.map((s) => s.effectiveLng);
                    const minLat = Math.min(...lats);
                    const maxLat = Math.max(...lats);
                    const minLng = Math.min(...lngs);
                    const maxLng = Math.max(...lngs);

                    const pad = 36;
                    const w = 460 - pad * 2;
                    const h = 320 - pad * 2;
                    const dLat = Math.max(maxLat - minLat, 0.005);
                    const dLng = Math.max(maxLng - minLng, 0.005);

                    const toSvg = (lat: number, lng: number) => {
                      const sx = pad + ((lng - minLng) / dLng) * w;
                      const sy = 320 - (pad + ((lat - minLat) / dLat) * h);
                      return { sx, sy };
                    };

                    const svgPoints = activePlan.stops.map((s) => ({
                      ...s,
                      ...toSvg(s.effectiveLat, s.effectiveLng),
                    }));

                    const avgSvg = toSvg(activePlan.averageCoord.lat, activePlan.averageCoord.lng);

                    // Polyline string
                    const pathStr = svgPoints.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ');

                    return (
                      <>
                        {/* Đường nối tuyến di chuyển */}
                        <polyline
                          points={pathStr}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeDasharray="5 3"
                        />

                        {/* Điểm tâm trung bình WGS-84 */}
                        <g>
                          <circle cx={avgSvg.sx} cy={avgSvg.sy} r="10" fill="rgba(245, 158, 11, 0.25)" />
                          <circle cx={avgSvg.sx} cy={avgSvg.sy} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                          <text x={avgSvg.sx} y={avgSvg.sy - 12} textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold">
                            TÂM TRUNG BÌNH
                          </text>
                        </g>

                        {/* Các trạm dừng 1, 2, 3... */}
                        {svgPoints.map((p, idx) => (
                          <g key={p.customer.id}>
                            <circle cx={p.sx} cy={p.sy} r="9" fill={idx === 0 ? '#10b981' : '#0284c7'} stroke="#ffffff" strokeWidth="1.5" />
                            <text x={p.sx} y={p.sy + 3.5} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                              {p.stopOrder}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>Trạm 1 (Bắt đầu)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                      <span>Các trạm kế tiếp</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      <span>Tọa độ trung bình</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Danh mục thứ tự các trạm dừng chi tiết (7/12) */}
          <div className="lg:col-span-7 border border-slate-200 bg-white rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-slate-900">
                  Danh mục Thứ tự {activePlan.stops.length} Khách hàng Cần Đi trong Ngày {activePlan.dayNumber}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đã sắp xếp theo cung đường ngắn nhất liên tục, điều hướng chính xác vào đường tiếp cận của từng nhà.
                </p>
              </div>

              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                Tổng: {activePlan.totalDistanceKm} km
              </span>
            </div>

            <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 sticky top-0 z-10">
                    <th className="py-2.5 px-3 font-semibold w-12 text-center">Thứ tự</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Khách hàng & SĐT</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Địa chỉ & Lối vào chính</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Tọa độ điều hướng WGS-84</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Khoảng cách tới trạm sau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activePlan.stops.map((stop) => (
                    <tr key={stop.customer.id} className="hover:bg-slate-50">
                      {/* Cột 1: Thứ tự dừng */}
                      <td className="py-2.5 px-3 text-center align-top">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold font-mono text-xs ${
                            stop.stopOrder === 1
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {stop.stopOrder}
                        </span>
                      </td>

                      {/* Cột 2: Khách hàng */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-bold text-slate-900">{stop.customer.customerName}</div>
                        <div className="font-mono text-[11px] text-teal-800">{stop.customer.id}</div>
                        <div className="text-slate-500 text-[11px]">SĐT: {stop.customer.phone}</div>
                      </td>

                      {/* Cột 3: Địa chỉ & Đường tiếp cận */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="text-slate-800 font-medium">{stop.customer.address}</div>
                        <div className="text-[11px] text-teal-700 flex items-center gap-1 mt-0.5">
                          <Milestone className="w-3.5 h-3.5 shrink-0" />
                          <span>Tiếp cận: {stop.roadAccessName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Tờ {stop.customer.sheetNumber || '—'} / Thửa {stop.customer.plotNumber || '—'}
                        </div>
                      </td>

                      {/* Cột 4: Tọa độ WGS-84 & Căn cứ */}
                      <td className="py-2.5 px-3 align-top font-mono tabular-nums">
                        <div className="text-slate-900 font-bold text-[11px]">
                          {stop.effectiveLat.toFixed(7)},
                          <br />
                          {stop.effectiveLng.toFixed(7)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {stop.coordSourceLabel}
                        </div>
                      </td>

                      {/* Cột 5: Khoảng cách tới điểm kế tiếp */}
                      <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums whitespace-nowrap">
                        {stop.distanceToNextStopMeters > 0 ? (
                          <div>
                            <span className="font-bold text-slate-800">
                              {stop.distanceToNextStopMeters >= 1000
                                ? `${(stop.distanceToNextStopMeters / 1000).toFixed(2)} km`
                                : `${stop.distanceToNextStopMeters} m`}
                            </span>
                            <div className="text-[10px] text-slate-400">→ Trạm {stop.stopOrder + 1}</div>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-bold">Điểm cuối ngày</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
