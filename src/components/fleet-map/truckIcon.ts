/**
 * ไอคอนรถกระบะแคปมองจากด้านบน (MA-374) — หัวรถชี้ขึ้นเหนือที่ทิศ 0° แล้วหมุนตามทิศที่รถวิ่ง
 * วาดเป็น SVG แล้วใช้เป็นรูปของหมุด (google.maps.Icon) · เก็บไว้ใช้ซ้ำตามสี/ทิศ/ขนาด
 */
const cache = new Map<string, google.maps.Icon>();

function svg(color: string, bearing: number, dim: boolean) {
  // พื้นที่ 80×80 ให้หมุนได้ไม่ถูกตัดขอบ · ตัวรถกว้าง 26 ยาว 64 อยู่กลางภาพ
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <g transform="rotate(${bearing} 40 40)" opacity="${dim ? 0.55 : 1}">
    <ellipse cx="40" cy="42" rx="15" ry="33" fill="rgba(0,0,0,0.18)"/>
    <rect x="24" y="12" width="4" height="7" rx="1.5" fill="${color}" stroke="#fff" stroke-width="1"/>
    <rect x="52" y="12" width="4" height="7" rx="1.5" fill="${color}" stroke="#fff" stroke-width="1"/>
    <rect x="27" y="7" width="26" height="66" rx="7" fill="${color}" stroke="#fff" stroke-width="2.5"/>
    <rect x="29.5" y="8.5" width="5" height="2.6" rx="1" fill="#fff7c2"/>
    <rect x="45.5" y="8.5" width="5" height="2.6" rx="1" fill="#fff7c2"/>
    <path d="M30 21 L50 21 L48 28 L32 28 Z" fill="#1f2937" opacity="0.85"/>
    <rect x="31" y="28" width="18" height="12" rx="2" fill="rgba(0,0,0,0.14)"/>
    <rect x="31" y="40" width="18" height="6" rx="1.5" fill="rgba(0,0,0,0.22)"/>
    <rect x="32" y="46.5" width="16" height="2.4" rx="1" fill="#1f2937" opacity="0.8"/>
    <rect x="30.5" y="51" width="19" height="19" rx="2" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>
  </g>
</svg>`;
}

/** size = ความกว้างของหมุดบนแผนที่ (px) */
export function truckIcon(color: string, bearing: number | null | undefined, opts: { dim?: boolean; size?: number } = {}): google.maps.Icon {
  const b = Math.round(((bearing ?? 0) % 360) / 5) * 5;
  const size = opts.size ?? 40;
  const key = `${color}|${b}|${opts.dim ? 1 : 0}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const icon: google.maps.Icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg(color, b, !!opts.dim))}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
  cache.set(key, icon);
  return icon;
}
