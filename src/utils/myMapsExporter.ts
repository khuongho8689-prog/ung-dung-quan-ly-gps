/**
 * Xuất dữ liệu nạp Google My Maps & Google Earth
 * Hỗ trợ tạo file KML chuẩn và CSV chuyên dụng cho Google My Maps
 * Quy tắc ưu tiên tọa độ theo yêu cầu nghiệp vụ:
 * 1. Ưu tiên 1: Tọa độ mốc ranh thửa đất (lấy mốc có khoảng cách gần nhất trong 2 mốc Trái/Phải).
 * 2. Ưu tiên 2: Nếu không có mốc ranh thì mới lấy tọa độ điện thoại ban đầu.
 * 3. Ký hiệu ghim:
 *    - Đã ghim thực tế: Màu XANH DƯƠNG (#2563eb)
 *    - Chưa ghim: Màu theo từng tháng quy định (Tháng 5, 6, 7, 8, 9, 10...)
 */

export interface MyMapsItem {
  id: string;
  name: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  sheetPlot: string;
  intakeMonth: string; // VD: "2026-05", "2026-08", "2026-09"
  isSurveyPinned: boolean; // Đã đi ghim thực tế hay chưa
  meterSerial: string;

  // Tọa độ áp dụng theo quy tắc ưu tiên
  coordSource: 'PARCEL_BOUNDARY_MARKER' | 'PHONE_GPS_FALLBACK';
  effectiveLat: number;
  effectiveLng: number;
  markerRole?: 'LEFT' | 'RIGHT' | 'PHONE';

  // Thông số đối chiếu
  phoneErrorMeters?: number;
  targetList: number;
  note: string;
}

export const MONTH_COLOR_MAP: Record<string, { label: string; hex: string; kmlColor: string }> = {
  '2026-05': { label: 'Tháng 5 (Xanh lục)', hex: '#16a34a', kmlColor: 'ff4aa316' },
  '2026-06': { label: 'Tháng 6 (Cam)', hex: '#ea580c', kmlColor: 'ff0c58ea' },
  '2026-07': { label: 'Tháng 7 (Tím)', hex: '#9333ea', kmlColor: 'ffea3393' },
  '2026-08': { label: 'Tháng 8 (Vàng hổ phách)', hex: '#d97706', kmlColor: 'ff0677d9' },
  '2026-09': { label: 'Tháng 9 (Đỏ hồng)', hex: '#e11d48', kmlColor: 'ff481de1' },
  '2026-10': { label: 'Tháng 10 (Xanh ngọc)', hex: '#0d9488', kmlColor: 'ff88940d' },
};

// Màu ghim xanh dương cho các hồ sơ đã đi ghim thực địa
export const PINNED_BLUE_COLOR = {
  label: 'Đã ghim thực địa (Xanh dương)',
  hex: '#2563eb',
  kmlColor: 'ffeb6325',
};

/**
 * Tạo nội dung file KML chuẩn cho Google My Maps
 */
export function generateGoogleMyMapsKml(items: MyMapsItem[], layerName: string = 'Khao_Sat_Dong_Ho_Nuoc'): string {
  const placemarks = items.map((item) => {
    const colorHex = item.isSurveyPinned
      ? PINNED_BLUE_COLOR.hex
      : MONTH_COLOR_MAP[item.intakeMonth]?.hex || '#0284c7';

    const sourceLabel =
      item.coordSource === 'PARCEL_BOUNDARY_MARKER'
        ? `Mốc ranh thửa đất (${item.markerRole === 'LEFT' ? 'Mốc Trái' : 'Mốc Phải'} - Ưu tiên số 1)`
        : 'Tọa độ GPS điện thoại ban đầu (Chưa có mốc ranh)';

    const pinStatusLabel = item.isSurveyPinned
      ? 'ĐÃ ĐI GHIM THỰC ĐỊA (Màu Xanh Dương)'
      : `CHƯA GHIM - Hồ sơ ${item.intakeMonth}`;

    const description = `
      <![CDATA[
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.5;">
          <h3 style="margin: 0 0 6px 0; color: #0f172a;">${item.name} (${item.id})</h3>
          <p style="margin: 2px 0;"><strong>Số ĐH:</strong> ${item.meterSerial} · <strong>SĐT:</strong> ${item.phone}</p>
          <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${item.address}, ${item.ward}, ${item.district}</p>
          <p style="margin: 2px 0;"><strong>Sổ đất:</strong> ${item.sheetPlot}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 8px 0;" />
          <p style="margin: 2px 0; color: ${item.isSurveyPinned ? '#2563eb' : '#0f172a'}; font-weight: bold;">
            Trạng thái ghim: ${pinStatusLabel}
          </p>
          <p style="margin: 2px 0;"><strong>Nguồn tọa độ ghim:</strong> ${sourceLabel}</p>
          <p style="margin: 2px 0;"><strong>Tọa độ WGS-84:</strong> ${item.effectiveLat.toFixed(7)}, ${item.effectiveLng.toFixed(7)}</p>
          ${item.phoneErrorMeters !== undefined ? `<p style="margin: 2px 0;"><strong>Độ lệch GPS ĐT cũ:</strong> ${item.phoneErrorMeters}m</p>` : ''}
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 11px;">Ghi chú: ${item.note}</p>
        </div>
      ]]>
    `.trim();

    return `
      <Placemark>
        <name>${item.id} - ${item.name}</name>
        <description>${description}</description>
        <Style>
          <IconStyle>
            <color>${item.isSurveyPinned ? PINNED_BLUE_COLOR.kmlColor : (MONTH_COLOR_MAP[item.intakeMonth]?.kmlColor || 'ff0284c7')}</color>
            <scale>1.2</scale>
            <Icon>
              <href>https://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png</href>
            </Icon>
          </IconStyle>
        </Style>
        <Point>
          <coordinates>${item.effectiveLng},${item.effectiveLat},0</coordinates>
        </Point>
      </Placemark>
    `;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${layerName}</name>
    <description>Danh sách ghim định vị đồng hồ nước Google My Maps</description>
    ${placemarks}
  </Document>
</kml>`.trim();
}

/**
 * Tạo file CSV chuyên dụng để Import vào Google My Maps
 */
export function generateGoogleMyMapsCsvRows(items: MyMapsItem[]): any[] {
  return items.map((item) => ({
    'Mã khách hàng': item.id,
    'Tên khách hàng': item.name,
    'Số điện thoại': item.phone,
    'Số thân đồng hồ': item.meterSerial,
    'Địa chỉ lắp đặt': item.address,
    'Phường Xã': item.ward,
    'Quận Huyện': item.district,
    'Số tờ số thửa': item.sheetPlot,
    'Vĩ độ (Latitude)': item.effectiveLat,
    'Kinh độ (Longitude)': item.effectiveLng,
    'Trạng thái ghim': item.isSurveyPinned ? 'ĐÃ GHIM (XANH DƯƠNG)' : 'CHƯA GHIM',
    'Tháng hồ sơ': item.intakeMonth,
    'Màu ghim quy định': item.isSurveyPinned ? 'Xanh dương (#2563eb)' : (MONTH_COLOR_MAP[item.intakeMonth]?.label || 'Mặc định'),
    'Nguồn tọa độ ghim':
      item.coordSource === 'PARCEL_BOUNDARY_MARKER'
        ? `Mốc ranh thửa đất (${item.markerRole === 'LEFT' ? 'Mốc Trái' : 'Mốc Phải'})`
        : 'GPS điện thoại ban đầu',
    'Độ lệch GPS ĐT (m)': item.phoneErrorMeters ?? 'Không có',
    'Phân loại danh sách': `Danh sách ${item.targetList}`,
    'Ghi chú': item.note,
  }));
}
