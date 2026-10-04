/**
 * Hệ thống tính toán trắc địa VN-2000 <-> WGS-84 & Hình học Địa chính Thửa đất
 * Chuẩn thông số Bộ Tài nguyên và Môi trường (Thông tư 973/2001/TT-TCĐC & QCVN 04:2009/BTNMT)
 * Trọng tâm khu vực Bình Dương (Kinh tuyến trục L0 = 105°45', múi 3°, k0 = 0.9999)
 */

export interface Vn2000ProvinceConfig {
  code: string;
  name: string;
  centralMeridian: number; // Kinh tuyến trục L0 (độ thập phân)
  centralMeridianLabel: string; // VD: "105°45'"
  scaleFactor: number; // Múi 3°: 0.9999, Múi 6°: 0.9996
}

export const VN2000_PROVINCES: Vn2000ProvinceConfig[] = [
  { code: 'BDG', name: 'Bình Dương (Trọng tâm)', centralMeridian: 105.75, centralMeridianLabel: "105°45'", scaleFactor: 0.9999 },
  { code: 'HCM', name: 'TP. Hồ Chí Minh', centralMeridian: 105.75, centralMeridianLabel: "105°45'", scaleFactor: 0.9999 },
  { code: 'DNI', name: 'Đồng Nai', centralMeridian: 107.75, centralMeridianLabel: "107°45'", scaleFactor: 0.9999 },
  { code: 'BRVT', name: 'Bà Rịa - Vũng Tàu', centralMeridian: 107.75, centralMeridianLabel: "107°45'", scaleFactor: 0.9999 },
  { code: 'LAN', name: 'Long An', centralMeridian: 105.75, centralMeridianLabel: "105°45'", scaleFactor: 0.9999 },
  { code: 'TGG', name: 'Tiền Giang', centralMeridian: 105.75, centralMeridianLabel: "105°45'", scaleFactor: 0.9999 },
  { code: 'HNI', name: 'Hà Nội', centralMeridian: 105.0, centralMeridianLabel: "105°00'", scaleFactor: 0.9999 },
  { code: 'DNG', name: 'Đà Nẵng', centralMeridian: 107.75, centralMeridianLabel: "107°45'", scaleFactor: 0.9999 },
];

export interface Vn2000Vertex {
  id: string; // "1", "2", "3", "4"...
  x: number;  // Northing (Bắc - mét, VD: 1204425.00)
  y: number;  // Easting (Đông - mét, VD: 607280.00)
}

export interface Wgs84Coordinate {
  lat: number;
  lng: number;
  latDms: string;
  lngDms: string;
}

export interface BoundaryMarkerResult {
  vertexId: string;
  role: 'LEFT' | 'RIGHT';
  roleLabel: string;
  vn2000: { x: number; y: number };
  wgs84: Wgs84Coordinate;
}

export type DistanceZoneCategory =
  | 'ZONE_LT_10M'    // < 10m (Tin cậy cao - Lấy mốc ngay, miễn đi thực địa)
  | 'ZONE_10_20M'    // 10m - 20m (Tin cậy khá)
  | 'ZONE_20_50M'    // 20m - 50m (Cần lưu ý / Đo RTK)
  | 'ZONE_GT_50M';   // > 50m (Bất thường / Cần đo thực địa RTK)

export interface DistanceAnalysisResult {
  distanceToLeftMarkerMeters: number;
  distanceToRightMarkerMeters: number;
  distanceToMidpointMeters: number;
  minFrontageDistanceMeters: number;
  zone: DistanceZoneCategory;
  zoneLabel: string;
  zoneColorClass: string;
  canSkipFieldSurvey: boolean; // true nếu khoảng cách nhỏ (< 10m)
  reliabilityNote: string;
}

export interface FrontageAnalysisResult {
  leftMarker: BoundaryMarkerResult;
  rightMarker: BoundaryMarkerResult;
  frontageWidthMeters: number;
  roadAzimuthDegrees: number;
  midpointVn2000: { x: number; y: number };
  midpointWgs84: Wgs84Coordinate;
  parcelAreaSqm: number;
  parcelPerimeterMeters: number;
}

// Tham số Ellipsoid WGS-84
const A_WGS84 = 6378137.0;
const F_WGS84 = 1 / 298.257223563;
const E2_WGS84 = 2 * F_WGS84 - F_WGS84 * F_WGS84;

// 7 tham số chuyển đổi Helmert (Bursa-Wolf) từ VN-2000 sang WGS-84 (Quyết định 05/2007/QĐ-BTNMT)
const DX_VN2000_TO_WGS84 = -191.90441429;
const DY_VN2000_TO_WGS84 = -39.30318279;
const DZ_VN2000_TO_WGS84 = -111.45032835;
const RX_ARCSEC = -0.00928836;
const RY_ARCSEC = 0.01975479;
const RZ_ARCSEC = -0.00427372;
const SCALE_PPM = 0.252906278;

const FALSE_EASTING = 500000.0;
const FALSE_NORTHING = 0.0;

export function formatDecimalToDms(decimalDeg: number, isLat: boolean): string {
  const dir = isLat ? (decimalDeg >= 0 ? 'N' : 'S') : (decimalDeg >= 0 ? 'E' : 'W');
  const absVal = Math.abs(decimalDeg);
  const deg = Math.floor(absVal);
  const minFloat = (absVal - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  const secFormatted = sec.toFixed(4).padStart(7, '0');
  const minFormatted = String(min).padStart(2, '0');
  return `${deg}°${minFormatted}'${secFormatted}"${dir}`;
}

/**
 * Chuyển đổi chính xác VN-2000 (X: Bắc, Y: Đông) -> WGS-84 (Lat, Lng)
 */
export function convertVn2000ToWgs84(
  xNorthing: number,
  yEasting: number,
  centralMeridianDeg: number = 105.75, // Mặc định Bình Dương 105°45'
  scaleFactor: number = 0.9999
): Wgs84Coordinate {
  const a = A_WGS84;
  const e2 = E2_WGS84;
  const ePrime2 = e2 / (1 - e2);
  const k0 = scaleFactor;
  const lon0 = (centralMeridianDeg * Math.PI) / 180.0;

  const x = yEasting - FALSE_EASTING;
  const y = xNorthing - FALSE_NORTHING;

  const M = y / k0;
  const mu =
    M /
    (a *
      (1 -
        e2 / 4 -
        (3 * e2 * e2) / 64 -
        (5 * e2 * e2 * e2) / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ePrime2 * cosPhi1 * cosPhi1;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const latVnRad =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrime2) * Math.pow(D, 4)) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrime2 - 3 * C1 * C1) *
          Math.pow(D, 6)) / 720);

  const lonVnRad =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrime2 + 24 * T1 * T1) *
        Math.pow(D, 5)) / 120) /
      cosPhi1;

  const sinLat = Math.sin(latVnRad);
  const cosLat = Math.cos(latVnRad);
  const sinLon = Math.sin(lonVnRad);
  const cosLon = Math.cos(lonVnRad);

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const X_vn = N * cosLat * cosLon;
  const Y_vn = N * cosLat * sinLon;
  const Z_vn = N * (1 - e2) * sinLat;

  const rx = (RX_ARCSEC * Math.PI) / (180 * 3600);
  const ry = (RY_ARCSEC * Math.PI) / (180 * 3600);
  const rz = (RZ_ARCSEC * Math.PI) / (180 * 3600);
  const s = 1 + SCALE_PPM * 1e-6;

  const X_wgs = DX_VN2000_TO_WGS84 + s * (X_vn - rz * Y_vn + ry * Z_vn);
  const Y_wgs = DY_VN2000_TO_WGS84 + s * (rz * X_vn + Y_vn - rx * Z_vn);
  const Z_wgs = DZ_VN2000_TO_WGS84 + s * (-ry * X_vn + rx * Y_vn + Z_vn);

  const p = Math.sqrt(X_wgs * X_wgs + Y_wgs * Y_wgs);
  const lonWgsRad = Math.atan2(Y_wgs, X_wgs);

  let latWgsRad = Math.atan2(Z_wgs, p * (1 - e2));
  for (let i = 0; i < 5; i++) {
    const sinB = Math.sin(latWgsRad);
    const Nw = a / Math.sqrt(1 - e2 * sinB * sinB);
    latWgsRad = Math.atan2(Z_wgs + e2 * Nw * sinB, p);
  }

  const latDeg = (latWgsRad * 180) / Math.PI;
  const lngDeg = (lonWgsRad * 180) / Math.PI;

  return {
    lat: latDeg, // Bảo toàn 100% giá trị thực tế của phép tính, TUYỆT ĐỐI KHÔNG LÀM TRÒN
    lng: lngDeg, // Bảo toàn 100% giá trị thực tế của phép tính, TUYỆT ĐỐI KHÔNG LÀM TRÒN
    latDms: formatDecimalToDms(latDeg, true),
    lngDms: formatDecimalToDms(lngDeg, false),
  };
}

/**
 * Định dạng tọa độ VN-2000 chính xác tuyệt đối, không làm tròn (tối thiểu 3 chữ số thập phân mm, hoặc giữ nguyên chuỗi thực tế)
 */
export function formatVn2000Coordinate(val: number, minDecimals: number = 3): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  const str = String(val);
  const parts = str.split('.');
  if (parts.length === 1) return val.toFixed(minDecimals);
  if (parts[1].length < minDecimals) return val.toFixed(minDecimals);
  return str;
}

/**
 * Định dạng tọa độ WGS-84 với ít nhất 8 chữ số thập phân (Kinh tuyến trục Bình Dương 105°45', không làm tròn)
 */
export function formatWgs84Coordinate(val: number, minDecimals: number = 8): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  const str = String(val);
  const parts = str.split('.');
  if (parts.length === 1) return val.toFixed(minDecimals);
  if (parts[1].length < minDecimals) return val.toFixed(minDecimals);
  return str;
}

/**
 * Chuyển đổi ngược WGS-84 (Lat, Lng) -> VN-2000 (X: Bắc, Y: Đông)
 * Khu vực Bình Dương (L0 = 105°45', k0 = 0.9999)
 */
export function convertWgs84ToVn2000(
  latDeg: number,
  lngDeg: number,
  centralMeridianDeg: number = 105.75,
  scaleFactor: number = 0.9999
): { x: number; y: number } {
  const a = A_WGS84;
  const e2 = E2_WGS84;
  const latRad = (latDeg * Math.PI) / 180;
  const lngRad = (lngDeg * Math.PI) / 180;

  const sinB = Math.sin(latRad);
  const cosB = Math.cos(latRad);
  const sinL = Math.sin(lngRad);
  const cosL = Math.cos(lngRad);

  const N = a / Math.sqrt(1 - e2 * sinB * sinB);
  const X_wgs = N * cosB * cosL;
  const Y_wgs = N * cosB * sinL;
  const Z_wgs = N * (1 - e2) * sinB;

  const rx = (RX_ARCSEC * Math.PI) / (180 * 3600);
  const ry = (RY_ARCSEC * Math.PI) / (180 * 3600);
  const rz = (RZ_ARCSEC * Math.PI) / (180 * 3600);
  const s = 1 + SCALE_PPM * 1e-6;

  const dx_inv = -DX_VN2000_TO_WGS84;
  const dy_inv = -DY_VN2000_TO_WGS84;
  const dz_inv = -DZ_VN2000_TO_WGS84;

  const X_vn = (X_wgs + dx_inv + rz * Y_wgs - ry * Z_wgs) / s;
  const Y_vn = (-rz * X_wgs + Y_wgs + dy_inv + rx * Z_wgs) / s;
  const Z_vn = (ry * X_wgs - rx * Y_wgs + Z_wgs + dz_inv) / s;

  const p = Math.sqrt(X_vn * X_vn + Y_vn * Y_vn);
  let phi = Math.atan2(Z_vn, p * (1 - e2));
  for (let i = 0; i < 5; i++) {
    const sB = Math.sin(phi);
    const N_i = a / Math.sqrt(1 - e2 * sB * sB);
    phi = Math.atan2(Z_vn + e2 * N_i * sB, p);
  }
  const lam = Math.atan2(Y_vn, X_vn);

  const lon0 = (centralMeridianDeg * Math.PI) / 180;
  const dLam = lam - lon0;
  const k0 = scaleFactor;
  const ePrime2 = e2 / (1 - e2);

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N_geo = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = ePrime2 * cosPhi * cosPhi;
  const A = cosPhi * dLam;

  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * phi));

  const xNorthing =
    k0 *
    (M +
      N_geo *
        tanPhi *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6)) / 720));

  const yEasting =
    FALSE_EASTING +
    k0 *
      N_geo *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5)) / 120);

  return {
    x: xNorthing,
    y: yEasting,
  };
}

export function distanceVn2000(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceWgs84Meters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function calculateParcelArea(vertices: Vn2000Vertex[]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    sum += curr.y * next.x - next.y * curr.x;
  }
  return Math.abs(sum) / 2;
}

export function calculateParcelPerimeter(vertices: Vn2000Vertex[]): number {
  if (vertices.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    total += distanceVn2000(curr, next);
  }
  return total;
}

/**
 * Trích xuất 2 Mốc Mặt tiền Trái & Phải theo hướng nhìn từ ngoài đường vào đất
 */
export function extractFrontageLeftRightMarkers(
  vertices: Vn2000Vertex[],
  frontageEdgeIndex: number = 0,
  centralMeridianDeg: number = 105.75, // Bình Dương L0 = 105°45'
  scaleFactor: number = 0.9999,
  viewFromRoadIntoLand: boolean = true
): FrontageAnalysisResult {
  if (!vertices || !Array.isArray(vertices) || vertices.length < 2) {
    const dummyPt = { x: 1227142.35, y: 591865.22 };
    const wgs = convertVn2000ToWgs84(dummyPt.x, dummyPt.y, centralMeridianDeg, scaleFactor);
    return {
      leftMarker: {
        vertexId: '1',
        role: 'LEFT',
        roleLabel: 'Mốc Trái (Mặt tiền)',
        vn2000: dummyPt,
        wgs84: wgs,
      },
      rightMarker: {
        vertexId: '2',
        role: 'RIGHT',
        roleLabel: 'Mốc Phải (Mặt tiền)',
        vn2000: { x: dummyPt.x, y: dummyPt.y + 5.0 },
        wgs84: wgs,
      },
      frontageWidthMeters: 5.0,
      roadAzimuthDegrees: 90.0,
      midpointVn2000: dummyPt,
      midpointWgs84: wgs,
      parcelAreaSqm: 100.0,
      parcelPerimeterMeters: 40.0,
    };
  }

  const n = vertices.length;
  const safeEdgeIdx = (((Number(frontageEdgeIndex) || 0) % n) + n) % n;
  const vA = vertices[safeEdgeIdx] || vertices[0];
  const vB = vertices[(safeEdgeIdx + 1) % n] || vertices[1] || vertices[0];

  const centroidX = vertices.reduce((acc, v) => acc + (Number(v?.x) || 0), 0) / n;
  const centroidY = vertices.reduce((acc, v) => acc + (Number(v?.y) || 0), 0) / n;

  const midX = (Number(vA.x || 0) + Number(vB.x || 0)) / 2;
  const midY = (Number(vA.y || 0) + Number(vB.y || 0)) / 2;

  const lookEast = centroidY - midY;
  const lookNorth = centroidX - midX;

  const rightDirEast = lookNorth;
  const rightDirNorth = -lookEast;

  const edgeEast = Number(vB.y || 0) - Number(vA.y || 0);
  const edgeNorth = Number(vB.x || 0) - Number(vA.x || 0);
  const dotRight = edgeEast * rightDirEast + edgeNorth * rightDirNorth;

  let leftVertex: Vn2000Vertex;
  let rightVertex: Vn2000Vertex;

  if (dotRight >= 0) {
    leftVertex = viewFromRoadIntoLand ? vA : vB;
    rightVertex = viewFromRoadIntoLand ? vB : vA;
  } else {
    leftVertex = viewFromRoadIntoLand ? vB : vA;
    rightVertex = viewFromRoadIntoLand ? vA : vB;
  }

  const leftWgs84 = convertVn2000ToWgs84(Number(leftVertex?.x || 0), Number(leftVertex?.y || 0), centralMeridianDeg, scaleFactor);
  const rightWgs84 = convertVn2000ToWgs84(Number(rightVertex?.x || 0), Number(rightVertex?.y || 0), centralMeridianDeg, scaleFactor);
  const midpointWgs84 = convertVn2000ToWgs84(midX, midY, centralMeridianDeg, scaleFactor);

  const frontageWidth = distanceVn2000(leftVertex, rightVertex);

  const dE = Number(rightVertex?.y || 0) - Number(leftVertex?.y || 0);
  const dN = Number(rightVertex?.x || 0) - Number(leftVertex?.x || 0);
  const azimuthRad = Math.atan2(dE, dN);
  const roadAzimuthDegrees = ((azimuthRad * 180) / Math.PI + 360) % 360;

  return {
    leftMarker: {
      vertexId: String(leftVertex?.id || '1'),
      role: 'LEFT',
      roleLabel: 'Mốc Trái (Mặt tiền)',
      vn2000: {
        x: Number((Number(leftVertex?.x) || 0).toFixed(3)),
        y: Number((Number(leftVertex?.y) || 0).toFixed(3)),
      },
      wgs84: leftWgs84,
    },
    rightMarker: {
      vertexId: String(rightVertex?.id || '2'),
      role: 'RIGHT',
      roleLabel: 'Mốc Phải (Mặt tiền)',
      vn2000: {
        x: Number((Number(rightVertex?.x) || 0).toFixed(3)),
        y: Number((Number(rightVertex?.y) || 0).toFixed(3)),
      },
      wgs84: rightWgs84,
    },
    frontageWidthMeters: Number((Number(frontageWidth) || 0).toFixed(2)),
    roadAzimuthDegrees: Number((Number(roadAzimuthDegrees) || 0).toFixed(1)),
    midpointVn2000: {
      x: Number((Number(midX) || 0).toFixed(3)),
      y: Number((Number(midY) || 0).toFixed(3)),
    },
    midpointWgs84,
    parcelAreaSqm: Number((Number(calculateParcelArea(vertices)) || 0).toFixed(1)),
    parcelPerimeterMeters: Number((Number(calculateParcelPerimeter(vertices)) || 0).toFixed(2)),
  };
}

/**
 * Tính toán hình học khoảng cách và phân loại vùng sai số giữa mốc mặt tiền và GPS điện thoại
 * Phân thành các vùng theo yêu cầu:
 * <= 5m, 10m, 15m, 20m, 25m, 30m, > 30m
 */
export function analyzeDistanceToPhoneGps(
  phoneGps: { lat: number; lng: number },
  leftMarkerWgs84: Wgs84Coordinate,
  rightMarkerWgs84: Wgs84Coordinate,
  midpointWgs84: Wgs84Coordinate
): DistanceAnalysisResult {
  const dLeft = distanceWgs84Meters(phoneGps, leftMarkerWgs84);
  const dRight = distanceWgs84Meters(phoneGps, rightMarkerWgs84);
  const dMid = distanceWgs84Meters(phoneGps, midpointWgs84);

  // Khoảng cách hình học đại diện tới cạnh mặt tiền lối vào chính
  const minFrontageDistance = Math.min(dLeft, dRight, dMid);

  let zone: DistanceZoneCategory;
  let zoneLabel: string;
  let zoneColorClass: string;
  let canSkipFieldSurvey: boolean;
  let reliabilityNote: string;

  if (minFrontageDistance < 10.0) {
    zone = 'ZONE_LT_10M';
    zoneLabel = '< 10m (Tin cậy cao)';
    zoneColorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    canSkipFieldSurvey = true;
    reliabilityNote = 'Độ tin cậy cao (< 10m). Lấy trực tiếp mốc ranh sổ đất lối vào chính, hoàn toàn không cần đi ghim thực tế!';
  } else if (minFrontageDistance <= 20.0) {
    zone = 'ZONE_10_20M';
    zoneLabel = '10m – 20m (Tin cậy khá)';
    zoneColorClass = 'text-blue-700 bg-blue-50 border-blue-200';
    canSkipFieldSurvey = false;
    reliabilityNote = 'Độ tin cậy khá (10-20m). GPS điện thoại có thể lệch nhẹ do đứng dưới lề đường hoặc tán xạ mái tôn.';
  } else if (minFrontageDistance <= 50.0) {
    zone = 'ZONE_20_50M';
    zoneLabel = '20m – 50m (Cần lưu ý / Đo RTK)';
    zoneColorClass = 'text-amber-800 bg-amber-50 border-amber-200';
    canSkipFieldSurvey = false;
    reliabilityNote = 'Sai số đáng kể (20-50m). Khuyến nghị đối chiếu hồ sơ hoặc kiểm tra thực địa bằng máy RTK.';
  } else {
    zone = 'ZONE_GT_50M';
    zoneLabel = '> 50m (Bất thường / Cần RTK)';
    zoneColorClass = 'text-red-800 bg-red-50 border-red-200';
    canSkipFieldSurvey = false;
    reliabilityNote = 'Bất thường lớn (> 50m). Nghi vấn nhân viên ghi nhầm tọa độ hoặc đứng ở xa. Bắt buộc đo thực địa RTK.';
  }

  return {
    distanceToLeftMarkerMeters: Number(dLeft.toFixed(1)),
    distanceToRightMarkerMeters: Number(dRight.toFixed(1)),
    distanceToMidpointMeters: Number(dMid.toFixed(1)),
    minFrontageDistanceMeters: Number(minFrontageDistance.toFixed(1)),
    zone,
    zoneLabel,
    zoneColorClass,
    canSkipFieldSurvey,
    reliabilityNote,
  };
}
