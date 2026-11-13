import { useEffect, useState } from "react";
import { InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { AllowedZone, ZONE_COLOR, ZONE_KIND_LABEL } from "./api";

/**
 * ชั้นแผนที่ "จุดที่อนุญาต" (MA-374) — จุดของบริษัทและบ้านพักของคนขับรถร่วม จาก HRSoft
 * วาดเป็นวงตามรัศมีจริง กดที่วงเพื่อดูชื่อจุด
 */
export default function ZonesLayer({ zones, ownerName }: { zones: AllowedZone[]; ownerName?: (code: string) => string | null }) {
  const map = useMap();
  const [open, setOpen] = useState<AllowedZone | null>(null);

  useEffect(() => {
    if (!map) return;
    const circles = zones.map((z) => {
      const c = new google.maps.Circle({
        map,
        center: { lat: z.lat, lng: z.lng },
        radius: z.radiusMeters,
        strokeColor: ZONE_COLOR[z.kind],
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: ZONE_COLOR[z.kind],
        fillOpacity: 0.12,
        zIndex: 5,
      });
      c.addListener("click", () => setOpen(z));
      return c;
    });
    return () => circles.forEach((c) => c.setMap(null));
  }, [map, zones]);

  if (!open) return null;
  const owner = open.ownerEmployeeCode ? ownerName?.(open.ownerEmployeeCode) : null;
  return (
    <InfoWindow position={{ lat: open.lat, lng: open.lng }} onCloseClick={() => setOpen(null)}>
      <div className="text-sm">
        <div className="font-semibold text-gray-900">{open.name}</div>
        <div className="text-gray-600">
          {ZONE_KIND_LABEL[open.kind]}
          {open.ownerEmployeeCode ? ` รหัส ${open.ownerEmployeeCode}${owner ? ` (${owner})` : ""}` : ""}
        </div>
        <div className="text-gray-500">รัศมี {open.radiusMeters.toLocaleString("th-TH")} เมตร</div>
      </div>
    </InfoWindow>
  );
}
