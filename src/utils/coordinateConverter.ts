import proj4 from 'proj4';

/**
 * Cấu hình hệ quy chiếu VN-2000 sang WGS-84 (EPSG:4326)
 * Theo Quyết định số 973/2001/QĐ-TCĐC của Tổng cục Địa chính.
 *
 * @param centralMeridian Kinh tuyến trục của tỉnh (Độ thập phân).
 * Ví dụ: Bình Dương: 105.75 (105°45'); TP.HCM: 105.75; Đồng Nai: 107.75.
 */
export function getVn2000ProjDef(centralMeridian: number = 105.75): string {
  return `+proj=tmerc +lat_0=0 +lon_0=${centralMeridian} +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278 +units=m +no_defs`;
}

export const WGS84_DEF = '+proj=longlat +datum=WGS84 +no_defs';

export interface PointVn2000 {
  pointName?: string;
  x: number; // Trục X (Bắc / Northing) ~ 1,220,000m
  y: number; // Trục Y (Đông / Easting) ~ 590,000m
}

export interface PointWgs84 {
  pointName?: string;
  lat: number; // Vĩ độ (~ 11.0° - 11.3° tại Bình Dương)
  lng: number; // Kinh độ (~ 106.6° tại Bình Dương)
}

/**
 * Chuyển đổi 1 điểm tọa độ VN-2000 sang WGS-84
 */
export function convertVn2000PointToWgs84(
  point: PointVn2000,
  centralMeridian: number = 105.75
): PointWgs84 {
  const vn2000Def = getVn2000ProjDef(centralMeridian);

  // Lưu ý quan trọng trắc địa Việt Nam:
  // Trên bản vẽ sổ đỏ: X là Northing (Bắc, ~1.200.000m), Y là Easting (Đông, ~600.000m).
  // Thư viện Proj4 nhận tham số theo chuẩn hình học không gian: [Easting, Northing] tức [Y, X]!
  const easting = point.y > 1000000 ? point.x : point.y;
  const northing = point.x > 1000000 ? point.x : point.y;

  try {
    const [lng, lat] = proj4(vn2000Def, WGS84_DEF, [easting, northing]);
    return {
      pointName: point.pointName,
      lat: Number(lat.toFixed(7)),
      lng: Number(lng.toFixed(7)),
    };
  } catch (err) {
    // Dự phòng thuật toán xấp xỉ địa phương nếu proj4 lỗi
    const lat = 10.9 + (northing - 1200000) / 111320;
    const lng = 106.6 + (easting - 600000) / (111320 * Math.cos((11.0 * Math.PI) / 180));
    return {
      pointName: point.pointName,
      lat: Number(lat.toFixed(7)),
      lng: Number(lng.toFixed(7)),
    };
  }
}

/**
 * Chuyển đổi toàn bộ danh sách điểm mốc từ VN-2000 sang WGS-84
 */
export function convertVn2000PolygonToWgs84(
  points: PointVn2000[],
  centralMeridian: number = 105.75
): PointWgs84[] {
  return points.map((p) => convertVn2000PointToWgs84(p, centralMeridian));
}

/**
 * Tính tâm ranh giới (centroid) của thửa đất từ danh sách tọa độ WGS-84
 */
export function calculateCentroid(points: PointWgs84[]): { lat: number; lng: number } {
  if (!points || points.length === 0) {
    return { lat: 11.096556, lng: 106.640396 };
  }
  const sumLat = points.reduce((acc, p) => acc + p.lat, 0);
  const sumLng = points.reduce((acc, p) => acc + p.lng, 0);
  return {
    lat: Number((sumLat / points.length).toFixed(7)),
    lng: Number((sumLng / points.length).toFixed(7)),
  };
}
