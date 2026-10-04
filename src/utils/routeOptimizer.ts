/**
 * Thuật toán Tối ưu hóa Lộ trình Khảo sát Thực địa RTK
 * 1. Tính toán Tọa độ Trung bình WGS-84 (Centroid) của khu vực
 * 2. Phân cụm địa lý thông minh theo ngày: 20 - 30 khách hàng/ngày, giới hạn di chuyển <= 20 km/ngày
 * 3. Tối ưu hóa hành trình ngắn nhất (TSP 2-opt Heuristic)
 * 4. Quy tắc ưu tiên tọa độ:
 *    - Ưu tiên 1: Tọa độ mốc ranh thửa đất tiếp cận đường chính
 *    - Ưu tiên 2: Tọa độ điện thoại (nếu không có sổ đất)
 *    - Ưu tiên 3: Điều hướng chính xác vào điểm ranh giáp đường tiếp cận ngắn nhất
 */

import { CustomerProfile } from '../data/customerDatabase';
import { FrontageAnalysisResult, distanceWgs84Meters } from './vn2000';

export interface RouteStopPoint {
  stopOrder: number; // Thứ tự dừng 1, 2, 3...
  customer: CustomerProfile;
  effectiveLat: number;
  effectiveLng: number;
  coordSourceLabel: string;
  roadAccessName: string;
  markerRole?: 'LEFT' | 'RIGHT' | 'PHONE';
  distanceToNextStopMeters: number;
}

export interface DayRoutePlan {
  dayNumber: number;
  scheduledDate: string;
  clusterName: string;
  stops: RouteStopPoint[];
  totalStopsCount: number;
  totalDistanceKm: number;
  averageCoord: {
    lat: number;
    lng: number;
    latDms?: string;
    lngDms?: string;
  };
  isWithin20KmLimit: boolean;
  googleMapsUrl: string;
}

/**
 * Tính toán Tọa độ Trung bình WGS-84 từ danh sách các điểm đã chọn
 */
export function calculateAverageWgs84Coord(
  points: { lat: number; lng: number }[]
): { lat: number; lng: number } {
  if (points.length === 0) {
    return { lat: 10.9084, lng: 106.7621 }; // Tọa độ trung tâm mặc định Bình Dương
  }
  const sumLat = points.reduce((acc, p) => acc + p.lat, 0);
  const sumLng = points.reduce((acc, p) => acc + p.lng, 0);
  return {
    lat: Number((sumLat / points.length).toFixed(7)),
    lng: Number((sumLng / points.length).toFixed(7)),
  };
}

/**
 * Trích xuất tọa độ hiệu dụng theo đúng 3 tiêu chí ưu tiên của người dùng:
 * 1. Lấy mốc tọa độ có trên sổ đất.
 * 2. Lấy tọa độ trên điện thoại nếu không có sổ đất.
 * 3. Điều hướng chính xác vào điểm tiếp cận ngắn nhất trên mặt tiền đường.
 */
export function getEffectiveSurveyCoordinate(
  customer: CustomerProfile,
  frontage?: FrontageAnalysisResult
): {
  lat: number;
  lng: number;
  sourceLabel: string;
  roadAccessName: string;
  markerRole?: 'LEFT' | 'RIGHT' | 'PHONE';
} {
  if (frontage) {
    // Nếu có mốc ranh thửa đất: so sánh khoảng cách tới Mốc Trái và Mốc Phải
    const dLeft = distanceWgs84Meters(customer.phoneGps, frontage.leftMarker.wgs84);
    const dRight = distanceWgs84Meters(customer.phoneGps, frontage.rightMarker.wgs84);

    // Ưu tiên mốc gần lối vào / sai số nhỏ hơn
    if (dLeft <= dRight) {
      return {
        lat: frontage.leftMarker.wgs84.lat,
        lng: frontage.leftMarker.wgs84.lng,
        sourceLabel: `Mốc Trái (Đỉnh ${frontage.leftMarker.vertexId}) trên ranh tiếp cận đường`,
        roadAccessName: customer.mainRoadName,
        markerRole: 'LEFT',
      };
    } else {
      return {
        lat: frontage.rightMarker.wgs84.lat,
        lng: frontage.rightMarker.wgs84.lng,
        sourceLabel: `Mốc Phải (Đỉnh ${frontage.rightMarker.vertexId}) trên ranh tiếp cận đường`,
        roadAccessName: customer.mainRoadName,
        markerRole: 'RIGHT',
      };
    }
  }

  // Nếu không có sổ đất: lấy tọa độ điện thoại ban đầu
  return {
    lat: customer.phoneGps.lat,
    lng: customer.phoneGps.lng,
    sourceLabel: 'Tọa độ GPS điện thoại ban đầu (Hồ sơ chưa có mốc ranh)',
    roadAccessName: customer.mainRoadName,
    markerRole: 'PHONE',
  };
}

/**
 * Thuật toán Tối ưu hóa thứ tự di chuyển ngắn nhất (Nearest Neighbor + 2-opt Heuristic TSP)
 */
function optimizeSequenceShortestPath(
  items: {
    customer: CustomerProfile;
    lat: number;
    lng: number;
    sourceLabel: string;
    roadAccessName: string;
    markerRole?: 'LEFT' | 'RIGHT' | 'PHONE';
  }[],
  startCoord: { lat: number; lng: number }
): typeof items {
  if (items.length <= 2) return items;

  // 1. Nearest Neighbor heuristic
  const unvisited = [...items];
  const ordered: typeof items = [];

  let currentPos = startCoord;

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = distanceWgs84Meters(currentPos, unvisited[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const nextNode = unvisited.splice(bestIdx, 1)[0];
    ordered.push(nextNode);
    currentPos = { lat: nextNode.lat, lng: nextNode.lng };
  }

  // 2. Cải thiện hành trình bằng 2-opt swap
  let improved = true;
  let iterations = 0;
  const maxIterations = 20;

  const calculatePathDistance = (path: typeof items): number => {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += distanceWgs84Meters(path[i], path[i + 1]);
    }
    return total;
  };

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < ordered.length - 2; i++) {
      for (let j = i + 2; j < ordered.length; j++) {
        const d1 = distanceWgs84Meters(ordered[i], ordered[i + 1]);
        const d2 = j + 1 < ordered.length ? distanceWgs84Meters(ordered[j], ordered[j + 1]) : 0;

        const d3 = distanceWgs84Meters(ordered[i], ordered[j]);
        const d4 = j + 1 < ordered.length ? distanceWgs84Meters(ordered[i + 1], ordered[j + 1]) : 0;

        if (d3 + d4 < d1 + d2 - 1.0) {
          // Thực hiện đảo ngược đoạn từ i+1 đến j
          const reversedSegment = ordered.slice(i + 1, j + 1).reverse();
          ordered.splice(i + 1, j - i, ...reversedSegment);
          improved = true;
        }
      }
    }
  }

  return ordered;
}

/**
 * Phân cụm các khách hàng cần đi thực địa thành các ngày (20 - 30 hộ/ngày, <= 20km)
 * và tối ưu hóa lộ trình ngắn nhất cho từng ngày.
 */
export function partitionAndOptimizeFieldRoutes(
  fieldCustomers: CustomerProfile[],
  frontageMap: Map<string, FrontageAnalysisResult>,
  targetStopsPerDay: number = 25, // Khuyến nghị 20 - 30 khách hàng/ngày
  startDateStr: string = '2026-10-01'
): DayRoutePlan[] {
  if (fieldCustomers.length === 0) return [];

  // Gắn tọa độ hiệu dụng theo 3 quy tắc ưu tiên
  const mappedPoints = fieldCustomers.map((customer) => {
    const frontage = frontageMap.get(customer.id);
    const eff = getEffectiveSurveyCoordinate(customer, frontage);
    return {
      customer,
      lat: eff.lat,
      lng: eff.lng,
      sourceLabel: eff.sourceLabel,
      roadAccessName: eff.roadAccessName,
      markerRole: eff.markerRole,
    };
  });

  // Tính tọa độ trung tâm ban đầu của toàn bộ khu vực
  const globalCentroid = calculateAverageWgs84Coord(mappedPoints);

  // Sắp xếp các điểm theo góc cực (Polar Angle / Hilbert-like sweep) quanh tâm để các điểm liền kề được gom cùng một ngày
  mappedPoints.sort((a, b) => {
    const angleA = Math.atan2(a.lat - globalCentroid.lat, a.lng - globalCentroid.lng);
    const angleB = Math.atan2(b.lat - globalCentroid.lat, b.lng - globalCentroid.lng);
    return angleA - angleB;
  });

  const dailyPlans: DayRoutePlan[] = [];
  const startDate = new Date(startDateStr);
  const total = mappedPoints.length;

  let currentIdx = 0;
  let dayCount = 1;

  while (currentIdx < total) {
    // Cắt một lô khoảng từ 20 đến 30 khách hàng
    const remaining = total - currentIdx;
    let currentBatchSize = Math.min(targetStopsPerDay, remaining);

    // Tránh để lại một ngày lẻ loi quá ít khách hàng (< 10 hộ) nếu có thể gộp
    if (remaining > targetStopsPerDay && remaining - targetStopsPerDay < 10) {
      currentBatchSize = Math.ceil(remaining / 2);
    }

    const rawBatch = mappedPoints.slice(currentIdx, currentIdx + currentBatchSize);
    currentIdx += currentBatchSize;

    // Tính tọa độ trung bình WGS-84 của Lô ngày này
    const dayAvgCoord = calculateAverageWgs84Coord(rawBatch);

    // Tối ưu hóa thứ tự di chuyển ngắn nhất cho ngày này (bắt đầu từ điểm gần tâm nhất)
    const optimizedBatch = optimizeSequenceShortestPath(rawBatch, dayAvgCoord);

    // Tính khoảng cách giữa các điểm kế tiếp
    let totalDistMeters = 0;
    const stops: RouteStopPoint[] = [];

    for (let i = 0; i < optimizedBatch.length; i++) {
      const cur = optimizedBatch[i];
      let distNext = 0;
      if (i < optimizedBatch.length - 1) {
        distNext = distanceWgs84Meters(cur, optimizedBatch[i + 1]);
        totalDistMeters += distNext;
      }

      stops.push({
        stopOrder: i + 1,
        customer: cur.customer,
        effectiveLat: cur.lat,
        effectiveLng: cur.lng,
        coordSourceLabel: cur.sourceLabel,
        roadAccessName: cur.roadAccessName,
        markerRole: cur.markerRole,
        distanceToNextStopMeters: Number(distNext.toFixed(1)),
      });
    }

    const totalDistKm = Number((totalDistMeters / 1000).toFixed(2));
    const isWithinLimit = totalDistKm <= 20.0;

    // Ngày khảo sát
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + (dayCount - 1));
    const curDateStr = curDate.toISOString().split('T')[0];

    // Tạo link Google Maps dẫn đường tự động nhiều điểm dừng (tối đa 10 điểm cho 1 link mở app)
    const navCoords = stops.slice(0, 10).map((s) => `${s.effectiveLat},${s.effectiveLng}`).join('/');
    const googleMapsUrl = `https://www.google.com/maps/dir/${navCoords}`;

    // Tên cụm khu vực (dựa theo phường/quận có số lượng nhiều nhất)
    const wardCounts: Record<string, number> = {};
    stops.forEach((s) => {
      wardCounts[s.customer.ward] = (wardCounts[s.customer.ward] || 0) + 1;
    });
    const mainWard = Object.entries(wardCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Khu vực';

    dailyPlans.push({
      dayNumber: dayCount,
      scheduledDate: curDateStr,
      clusterName: `Cụm ${mainWard} (Ngày ${dayCount})`,
      stops,
      totalStopsCount: stops.length,
      totalDistanceKm: totalDistKm,
      averageCoord: dayAvgCoord,
      isWithin20KmLimit: isWithinLimit,
      googleMapsUrl,
    });

    dayCount++;
  }

  return dailyPlans;
}
