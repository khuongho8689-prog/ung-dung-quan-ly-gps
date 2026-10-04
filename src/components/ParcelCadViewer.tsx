import React from 'react';
import {
  Vn2000Vertex,
  FrontageAnalysisResult,
  DistanceAnalysisResult,
  distanceVn2000,
  convertWgs84ToVn2000,
} from '../utils/vn2000';
import {
  FlipHorizontal,
  MousePointerClick,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  CornerDownRight,
  GitBranch,
} from 'lucide-react';

interface ParcelCadViewerProps {
  vertices: Vn2000Vertex[];
  frontageEdgeIndex: number;
  analysis: FrontageAnalysisResult;
  distanceAnalysis: DistanceAnalysisResult;
  phoneGps: { lat: number; lng: number };
  mainRoadName: string;
  sheetNumber?: number;
  plotNumber?: number;
  viewFromRoadIntoLand: boolean;
  centralMeridianDeg: number;
  scaleFactor: number;
  maDanhBo?: string;
  customerAddress?: string;
  isCornerPlot?: boolean;
  roadFrontages?: {
    edgeIndex: number;
    roadName: string;
    isPrimaryFromAddress: boolean;
  }[];
  appliedCorrectionMethod?: 'PHUONG_AN_A' | 'NONE';
  onChangeFrontageEdge: (newEdgeIndex: number) => void;
  onToggleViewDirection: () => void;
}

export const ParcelCadViewer: React.FC<ParcelCadViewerProps> = ({
  vertices,
  frontageEdgeIndex,
  analysis,
  distanceAnalysis,
  phoneGps,
  mainRoadName,
  sheetNumber,
  plotNumber,
  viewFromRoadIntoLand,
  centralMeridianDeg,
  scaleFactor,
  maDanhBo,
  customerAddress,
  isCornerPlot,
  roadFrontages,
  appliedCorrectionMethod = 'PHUONG_AN_A',
  onChangeFrontageEdge,
  onToggleViewDirection,
}) => {
  if (!vertices || vertices.length < 3) {
    return (
      <div className="border border-slate-200 bg-slate-50 rounded-lg p-6 text-center text-sm text-slate-600">
        Hồ sơ này không có bảng tọa độ đỉnh VN-2000 (thuộc Danh sách 3 hoặc Danh sách 4).
      </div>
    );
  }

  // Chuyển đổi tọa độ GPS điện thoại sang VN-2000 để vẽ trên cùng mặt phẳng tỷ lệ CAD
  const phoneVn2000 = convertWgs84ToVn2000(phoneGps.lat, phoneGps.lng, centralMeridianDeg, scaleFactor);

  // Tính khung bao (Bounding Box) bao gồm cả các đỉnh thửa đất và điểm GPS điện thoại
  const allXs = [...vertices.map((v) => v.x), phoneVn2000.x];
  const allYs = [...vertices.map((v) => v.y), phoneVn2000.y];
  const minX = Math.min(...allXs);
  const maxX = Math.max(...allXs);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);

  const spanX = Math.max(maxX - minX, 12);
  const spanY = Math.max(maxY - minY, 12);
  const maxSpan = Math.max(spanX, spanY);

  const svgWidth = 560;
  const svgHeight = 400;
  const pad = 82;

  const usableW = svgWidth - pad * 2;
  const usableH = svgHeight - pad * 2;
  const scale = Math.min(usableW / maxSpan, usableH / maxSpan);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const toSvg = (pt: { x: number; y: number }) => {
    const sx = svgWidth / 2 + (pt.y - centerY) * scale;
    const sy = svgHeight / 2 - (pt.x - centerX) * scale;
    return { sx, sy };
  };

  const svgVertices = vertices.map((v) => ({
    ...v,
    ...toSvg(v),
  }));

  const polygonPoints = svgVertices.map((v) => `${v.sx.toFixed(1)},${v.sy.toFixed(1)}`).join(' ');

  const centroidSvg = {
    sx: svgVertices.reduce((s, v) => s + v.sx, 0) / svgVertices.length,
    sy: svgVertices.reduce((s, v) => s + v.sy, 0) / svgVertices.length,
  };

  const n = vertices.length;
  const safeEdge = ((frontageEdgeIndex % n) + n) % n;
  const vStart = svgVertices[safeEdge];
  const vEnd = svgVertices[(safeEdge + 1) % n];

  const edgeMid = {
    sx: (vStart.sx + vEnd.sx) / 2,
    sy: (vStart.sy + vEnd.sy) / 2,
  };

  const phoneSvg = toSvg(phoneVn2000);
  const leftSvg = toSvg(analysis.leftMarker.vn2000);
  const rightSvg = toSvg(analysis.rightMarker.vn2000);

  // Vector pháp tuyến hướng ra ngoài lòng đường
  let normal = {
    x: edgeMid.sx - centroidSvg.sx,
    y: edgeMid.sy - centroidSvg.sy,
  };
  const normLen = Math.sqrt(normal.x * normal.x + normal.y * normal.y) || 1;
  normal = { x: normal.x / normLen, y: normal.y / normLen };

  const roadOffset = 42;
  const roadWidth = 24;

  const r1 = { sx: vStart.sx + normal.x * (roadOffset - roadWidth), sy: vStart.sy + normal.y * (roadOffset - roadWidth) };
  const r2 = { sx: vEnd.sx + normal.x * (roadOffset - roadWidth), sy: vEnd.sy + normal.y * (roadOffset - roadWidth) };
  const r3 = { sx: vEnd.sx + normal.x * (roadOffset + roadWidth), sy: vEnd.sy + normal.y * (roadOffset + roadWidth) };
  const r4 = { sx: vStart.sx + normal.x * (roadOffset + roadWidth), sy: vStart.sy + normal.y * (roadOffset + roadWidth) };
  const roadPolygon = `${r1.sx},${r1.sy} ${r2.sx},${r2.sy} ${r3.sx},${r3.sy} ${r4.sx},${r4.sy}`;

  return (
    <div className="border border-slate-200 bg-white rounded-lg overflow-hidden shadow-xs">
      {/* Tiêu đề thanh công cụ CAD */}
      <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-bold text-teal-400 font-mono">BẢN VẼ ĐỊA CHÍNH (CAD)</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 font-medium">
            Thửa <strong>{plotNumber ?? '—'}</strong>, Tờ <strong>{sheetNumber ?? '—'}</strong>
          </span>
          {maDanhBo && (
            <span className="font-mono text-amber-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Danh bộ: {maDanhBo}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleViewDirection}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
            title="Đổi hướng nhìn từ đường vào thửa hoặc từ thửa ra đường"
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-teal-400" />
            <span>Hướng nhìn: {viewFromRoadIntoLand ? 'Đường nhìn vào nhà' : 'Từ nhà nhìn ra'}</span>
          </button>
        </div>
      </div>

      {/* THANH XỬ LÝ THỬA GÓC 2 MẶT TIỀN (Theo chỉ đạo người dùng) */}
      {isCornerPlot && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950">
              LÔ GÓC 2 MẶT TIỀN
            </span>
            <span className="text-slate-700 font-medium">
              Căn cứ địa chỉ hồ sơ: <strong className="text-slate-900">{customerAddress}</strong>
            </span>
            <span className="text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              ✓ Đã chọn mặt tiền chính: {mainRoadName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Đổi cạnh mặt tiền:</span>
            {roadFrontages && roadFrontages.length > 0 ? (
              roadFrontages.map((rf) => (
                <button
                  key={rf.edgeIndex}
                  type="button"
                  onClick={() => onChangeFrontageEdge(rf.edgeIndex)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    frontageEdgeIndex === rf.edgeIndex
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {rf.roadName.split('(')[0].trim()} {rf.isPrimaryFromAddress ? '(Khớp hồ sơ)' : '(Phụ)'}
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => onChangeFrontageEdge((frontageEdgeIndex + 1) % n)}
                className="px-2.5 py-1 rounded text-xs bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Chuyển sang cạnh tiếp theo
              </button>
            )}
          </div>
        </div>
      )}

      {/* ÁP DỤNG PHƯƠNG ÁN A (Theo chỉ đạo người dùng) */}
      <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-900">
        <div className="flex items-center gap-1.5 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>ÁP DỤNG PHƯƠNG ÁN A: Chuẩn hóa theo Tọa độ Sổ đất VN-2000 (Miễn đi thực địa)</span>
        </div>
        <span className="text-[11px] text-emerald-700 font-mono">
          Bảo lưu trọn vẹn tọa độ địa chính chính quy từ GCNQSDĐ
        </span>
      </div>

      {/* SVG Canvas Vẽ Kỹ Thuật CAD */}
      <div className="relative bg-slate-950 flex justify-center items-center overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[440px] select-none"
        >
          <defs>
            <pattern id="cadGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Lưới tọa độ CAD */}
          <rect width={svgWidth} height={svgHeight} fill="#090d16" />
          <rect width={svgWidth} height={svgHeight} fill="url(#cadGrid)" />

          {/* Hành lang lòng đường chính */}
          <polygon points={roadPolygon} fill="#1e293b" stroke="#334155" strokeWidth="1" opacity="0.8" />
          <text
            x={(r1.sx + r2.sx) / 2}
            y={(r1.sy + r2.sy) / 2}
            fill="#94a3b8"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {mainRoadName}
          </text>

          {/* Diện tích thửa đất (Đa giác VN-2000) */}
          <polygon
            points={polygonPoints}
            fill="rgba(13, 148, 136, 0.15)"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Cạnh tiếp cận đường chính được làm nổi bật */}
          <line
            x1={vStart.sx}
            y1={vStart.sy}
            x2={vEnd.sx}
            y2={vEnd.sy}
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Chiều dài các cạnh */}
          {svgVertices.map((v1, idx) => {
            const v2 = svgVertices[(idx + 1) % n];
            const mx = (v1.sx + v2.sx) / 2;
            const my = (v1.sy + v2.sy) / 2;
            const len = distanceVn2000(vertices[idx], vertices[(idx + 1) % n]);
            return (
              <g key={`len-${idx}`}>
                <rect x={mx - 18} y={my - 7} width="36" height="14" rx="2" fill="rgba(15, 23, 42, 0.8)" />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {len.toFixed(1)}m
                </text>
              </g>
            );
          })}

          {/* Các đỉnh thửa đất */}
          {svgVertices.map((v) => (
            <g key={v.id} onClick={() => onChangeFrontageEdge(parseInt(v.id) - 1)} className="cursor-pointer">
              <circle cx={v.sx} cy={v.sy} r="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <text
                x={v.sx + 8}
                y={v.sy - 8}
                fill="#f8fafc"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                Đỉnh {v.id}
              </text>
            </g>
          ))}

          {/* Đường đối chiếu sai số GPS điện thoại */}
          <line
            x1={phoneSvg.sx}
            y1={phoneSvg.sy}
            x2={edgeMid.sx}
            y2={edgeMid.sy}
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <g transform={`translate(${(phoneSvg.sx + edgeMid.sx) / 2}, ${(phoneSvg.sy + edgeMid.sy) / 2})`}>
            <rect x="-36" y="-10" width="72" height="18" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#f43f5e" strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fill="#fecdd3" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
              d = {distanceAnalysis.minFrontageDistanceMeters}m
            </text>
          </g>

          {/* Vị trí GPS Điện thoại */}
          <g>
            <circle cx={phoneSvg.sx} cy={phoneSvg.sy} r="14" fill="rgba(244, 63, 94, 0.2)" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx={phoneSvg.sx} cy={phoneSvg.sy} r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
            <text x={phoneSvg.sx} y={phoneSvg.sy + 18} textAnchor="middle" fill="#fda4af" fontSize="10" fontWeight="600" fontFamily="JetBrains Mono, monospace">
              GPS ĐT (Làm hồ sơ)
            </text>
          </g>

          {/* MỐC TRÁI (LEFT) */}
          <g>
            <circle cx={leftSvg.sx} cy={leftSvg.sy} r="11" fill="rgba(14, 165, 233, 0.22)" />
            <circle cx={leftSvg.sx} cy={leftSvg.sy} r="6.5" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2" />
            <text x={leftSvg.sx - 12} y={leftSvg.sy + 4} textAnchor="end" fill="#38bdf8" fontSize="11" fontWeight="700">
              MỐC TRÁI (Đ.{analysis.leftMarker.vertexId})
            </text>
          </g>

          {/* MỐC PHẢI (RIGHT) */}
          <g>
            <circle cx={rightSvg.sx} cy={rightSvg.sy} r="11" fill="rgba(16, 185, 129, 0.22)" />
            <circle cx={rightSvg.sx} cy={rightSvg.sy} r="6.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <text x={rightSvg.sx + 12} y={rightSvg.sy + 4} textAnchor="start" fill="#34d399" fontSize="11" fontWeight="700">
              MỐC PHẢI (Đ.{analysis.rightMarker.vertexId})
            </text>
          </g>

          {/* La bàn hướng Bắc (+X VN-2000) */}
          <g transform="translate(36, 42)">
            <circle cx="0" cy="0" r="18" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" strokeWidth="1" />
            <path d="M 0 -12 L 5 6 L 0 2 L -5 6 Z" fill="#38bdf8" />
            <text x="0" y="-22" textAnchor="middle" fill="#cbd5e1" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              BẮC (+X)
            </text>
          </g>
        </svg>

        {/* Thanh trạng thái khoảng cách hình học & kết luận thực địa dưới bản vẽ */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Phân vùng sai số:</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold ${distanceAnalysis.zoneColorClass}`}>
                {distanceAnalysis.zoneLabel}
              </span>
            </div>
            <div className="text-slate-400 font-mono tabular-nums">
              Khoảng cách tới mặt tiền: <strong className="text-white">{distanceAnalysis.minFrontageDistanceMeters}m</strong> (Tới Mốc Trái: {distanceAnalysis.distanceToLeftMarkerMeters}m · Mốc Phải: {distanceAnalysis.distanceToRightMarkerMeters}m)
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs pt-1 border-t border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-300">
              Phương án A đã kích hoạt: Tọa độ sổ đất VN-2000 có độ tin cậy tuyệt đối. Tự động đề xuất mốc ranh để xuất file máy RTK.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
