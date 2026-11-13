import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyShopLocations,
  errorMessage,
  fetchShopLocations,
  LocationAdvice,
  ShopLocation,
  ShopLocations,
} from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";

/**
 * พิกัดร้านค้า (MA-374)
 * เสนอพิกัดร้านจากตำแหน่งที่คนขับกดส่งสำเร็จครั้งก่อน ๆ ผู้จัดการเลือกร้านแล้วกดยืนยันก่อนบันทึก
 * ค่าเดิมทุกครั้งถูกเก็บไว้ในประวัติ (ย้อนกลับได้)
 */
const ADVICE_ORDER: LocationAdvice[] = ["fill", "fill_low_confidence", "review", "ok"];
const ADVICE_TAB: Record<LocationAdvice, string> = {
  fill: "แนะนำให้เพิ่มพิกัด",
  fill_low_confidence: "ยังไม่มีพิกัด ควรตรวจสอบก่อนบันทึก",
  review: "พิกัดเดิมอยู่ห่างจากตำแหน่งที่ส่งสินค้าจริง",
  ok: "พิกัดเดิมตรงกับตำแหน่งที่ส่งสินค้าจริง",
};
const ADVICE_STYLE: Record<LocationAdvice, string> = {
  fill: "bg-green-50 text-green-700",
  fill_low_confidence: "bg-amber-50 text-amber-800",
  review: "bg-red-50 text-red-700",
  ok: "bg-gray-100 text-gray-600",
};
const keyOf = (s: Pick<ShopLocation, "memCode" | "addressId">) => `${s.memCode}|${s.addressId ?? ""}`;
const mapUrl = (p: { lat: number; lng: number }) => `https://www.google.com/maps?q=${p.lat},${p.lng}`;
const meters = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} กม.` : `${m.toLocaleString("th-TH")} เมตร`);

export default function FleetShopLocations() {
  const [data, setData] = useState<ShopLocations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<LocationAdvice>("fill");
  const [route, setRoute] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchShopLocations());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const routes = useMemo(() => {
    const m = new Map<string, string>();
    (data?.shops ?? []).forEach((s) => s.route && m.set(s.route.code, s.route.name));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.shops ?? []).filter(
      (s) =>
        s.advice === advice &&
        (route === "all" || s.route?.code === route) &&
        (!q || [s.name, s.branch, s.memCode, s.route?.name].some((x) => (x ?? "").toLowerCase().includes(q))),
    );
  }, [data, advice, route, query]);

  const picked = (data?.shops ?? []).filter((s) => selected.has(keyOf(s)));
  const overwriteCount = picked.filter((s) => s.current).length;
  const editable = advice !== "ok";

  const toggle = (s: ShopLocation) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(keyOf(s))) next.delete(keyOf(s));
      else next.add(keyOf(s));
      return next;
    });
  const allShown = rows.length > 0 && rows.every((s) => selected.has(keyOf(s)));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((s) => (allShown ? next.delete(keyOf(s)) : next.add(keyOf(s))));
      return next;
    });

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const r = await applyShopLocations(
        picked.map((s) => ({ memCode: s.memCode, addressId: s.addressId })),
        overwriteCount > 0,
      );
      setNotice({
        ok: true,
        text: `บันทึกพิกัดร้านเรียบร้อยแล้ว ${r.applied.toLocaleString("th-TH")} ร้าน${r.skipped.length ? ` ไม่ได้บันทึก ${r.skipped.length} ร้าน (${[...new Set(r.skipped.map((x) => x.reason))].join(", ")})` : ""}`,
      });
      setSelected(new Set());
      setConfirming(false);
      await load();
    } catch (e) {
      setNotice({ ok: false, text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <FleetLayout title="พิกัดร้านค้า"><LoadState loading={!error} error={error} onRetry={load} /></FleetLayout>;

  return (
    <FleetLayout title="พิกัดร้านค้า">
      <Card>
        <p className="text-sm text-gray-600">
          ระบบเสนอพิกัดร้านจากตำแหน่งที่คนขับยืนยันการส่งสินค้าสำเร็จ 5 ครั้งล่าสุด โดยเลือกจุดที่อยู่ใกล้จุดอื่นมากที่สุด
          เพื่อไม่ให้การยืนยันการส่งผิดตำแหน่งเพียงครั้งเดียวทำให้พิกัดคลาดเคลื่อน ร้านที่มีประวัติตั้งแต่ 3 ครั้งขึ้นไป
          และตำแหน่งอยู่ห่างกันไม่เกิน 150 เมตร ระบบจะแนะนำให้เพิ่มพิกัด พิกัดจะถูกบันทึกเมื่อผู้จัดการยืนยันเท่านั้น
          และระบบเก็บพิกัดเดิมไว้ทุกครั้ง
        </p>
        <div className="mt-3 flex gap-1 overflow-x-auto border-b border-gray-200">
          {ADVICE_ORDER.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAdvice(a);
                setSelected(new Set());
                setConfirming(false);
              }}
              className={`flex-none border-b-2 px-3 py-2 text-sm ${advice === a ? "border-orange-500 font-semibold text-orange-600" : "border-transparent text-gray-600"}`}
            >
              {ADVICE_TAB[a]} ({data.summary[a].toLocaleString("th-TH")})
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อร้านหรือรหัสร้าน"
            className="w-60 max-w-full rounded-lg border border-gray-300 px-3 py-1"
          />
          <select value={route} onChange={(e) => setRoute(e.target.value)} className="max-w-full rounded-lg border border-gray-300 px-2 py-1" aria-label="เส้นทาง">
            <option value="all">ทุกเส้นทาง</option>
            {routes.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          {editable && (
            <button
              disabled={!picked.length || picked.length > 500 || saving}
              title={picked.length > 500 ? "บันทึกได้ครั้งละไม่เกิน 500 ร้าน" : undefined}
              onClick={() => setConfirming(true)}
              className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white disabled:opacity-50"
            >
              บันทึกพิกัดร้านที่เลือก ({picked.length.toLocaleString("th-TH")})
            </button>
          )}
        </div>
        {confirming && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p>
              ยืนยันการบันทึกพิกัดร้าน {picked.length.toLocaleString("th-TH")} ร้าน
              {overwriteCount > 0 && ` ในจำนวนนี้มี ${overwriteCount.toLocaleString("th-TH")} ร้านที่มีพิกัดอยู่แล้ว ระบบจะแทนที่ด้วยพิกัดใหม่`}
              {" "}พิกัดเดิมจะถูกเก็บไว้ในประวัติ
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-1 font-semibold text-white disabled:opacity-50">
                {saving ? "กำลังบันทึก" : "ยืนยันการบันทึก"}
              </button>
              <button onClick={() => setConfirming(false)} disabled={saving} className="rounded-lg border border-gray-300 bg-white px-4 py-1">
                ยกเลิก
              </button>
            </div>
          </div>
        )}
        {notice && (
          <p className={`mt-3 rounded-lg p-2 text-sm ${notice.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{notice.text}</p>
        )}
      </Card>

      <Card title={`${ADVICE_TAB[advice]} ${rows.length.toLocaleString("th-TH")} ร้าน`}>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-left text-gray-500">
                {editable && (
                  <th className="w-8 py-2">
                    <input type="checkbox" checked={allShown} onChange={toggleAll} aria-label="เลือกทั้งหมดที่แสดง" />
                  </th>
                )}
                <th className="py-2 pr-3 font-medium">ร้าน</th>
                <th className="py-2 pr-3 font-medium">เส้นทาง</th>
                <th className="py-2 pr-3 font-medium">พิกัดเดิม</th>
                <th className="py-2 pr-3 font-medium">พิกัดจากการส่งจริง</th>
                <th className="py-2 font-medium">ส่งสินค้าล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 1000).map((s) => (
                <tr key={keyOf(s)} className="border-b align-top last:border-0">
                  {editable && (
                    <td className="py-2">
                      <input type="checkbox" checked={selected.has(keyOf(s))} onChange={() => toggle(s)} aria-label={`เลือก ${s.name}`} />
                    </td>
                  )}
                  <td className="py-2 pr-3">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500">
                      รหัส {s.memCode}
                      {s.branch ? ` สาขา ${s.branch}` : ""}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{s.route?.name ?? "-"}</td>
                  <td className="py-2 pr-3">
                    {s.current ? (
                      <a href={mapUrl(s.current)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        เปิดแผนที่
                      </a>
                    ) : (
                      <span className="text-gray-400">ไม่มีข้อมูล</span>
                    )}
                    {s.diffM !== null && <div className="text-xs text-gray-500">ห่างจากตำแหน่งที่ส่งจริง {meters(s.diffM)}</div>}
                  </td>
                  <td className="py-2 pr-3">
                    <a href={mapUrl(s.proposal)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      เปิดแผนที่
                    </a>
                    <div className="text-xs text-gray-500">
                      คำนวณจากการส่ง {s.proposal.samples} ครั้ง ตำแหน่งห่างกันไม่เกิน {meters(s.proposal.spreadM)}
                    </div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${ADVICE_STYLE[s.advice]}`}>{s.adviceLabel}</span>
                  </td>
                  <td className="py-2 text-gray-600">
                    {s.lastDeliveredAt ? new Date(s.lastDeliveredAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-4 text-center text-sm text-gray-500">ไม่พบร้านในกลุ่มนี้</p>}
          {rows.length > 1000 && <p className="p-2 text-center text-xs text-gray-500">แสดงเฉพาะ 1,000 ร้านแรก กรุณาค้นหาหรือเลือกเส้นทางเพื่อดูร้านที่เหลือ</p>}
        </div>
      </Card>
    </FleetLayout>
  );
}
