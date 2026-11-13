/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

/** ครอบแผนที่ Google ทุกหน้า — ไม่มี key ก็ยังใช้ส่วนอื่นของหน้าได้ */
export default function MapShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (!MAPS_KEY) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-gray-100 p-6 text-center text-sm text-gray-500 ${className}`}>
        ยังไม่ได้ตั้งค่า Google Maps key (VITE_GOOGLE_MAPS_API_KEY)
      </div>
    );
  }
  return (
    <div className={className}>
      <APIProvider apiKey={MAPS_KEY} language="th" region="TH">
        {children}
      </APIProvider>
    </div>
  );
}
