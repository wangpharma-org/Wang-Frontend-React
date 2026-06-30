import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { CheckCircle2, Copy, Check } from "lucide-react";

interface WaitingRTItem {
  sh_running: string;
  so_running: string;
  product_code: string;
  product_name: string;
  amount_item: number;
  unit_item: string;
  status: string;
}

interface WaitingRTMember {
  mem_code: string;
  mem_name: string;
  pending_count: number;
  all_approved: boolean;
  items: WaitingRTItem[];
}

const REFRESH_INTERVAL_MS = 30000;

const STATUS_LABELS: Record<string, string> = {
  Pending: "รออนุมัติ",
  Approved: "อนุมัติแล้ว",
};

const getStatusLabel = (status: string) => STATUS_LABELS[status] ?? status;

interface WaitingRTWidgetProps {
  socket: Socket | null;
  emp_code?: string;
}

const WaitingRTWidget = ({ socket, emp_code }: WaitingRTWidgetProps) => {
  const [members, setMembers] = useState<WaitingRTMember[]>([]);
  const [hoveredMemCode, setHoveredMemCode] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyMemCode = (mem_code: string) => {
    navigator.clipboard.writeText(mem_code);
    setCopiedCode(mem_code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  useEffect(() => {
    if (!socket || !emp_code) {
      setMembers([]);
      return;
    }

    const handleWaitingRtData = (data: WaitingRTMember[]) => {
      setMembers(data);
    };

    socket.on("waiting_rt:get", handleWaitingRtData);

    const requestWaitingRt = () => {
      socket.emit("waiting_rt:get", { emp_code });
    };

    requestWaitingRt();
    const timer = setInterval(requestWaitingRt, REFRESH_INTERVAL_MS);

    return () => {
      socket.off("waiting_rt:get", handleWaitingRtData);
      clearInterval(timer);
    };
  }, [socket, emp_code]);

  if (members.length === 0) {
    return null;
  }

  const pendingMemberCount = members.filter((m) => !m.all_approved).length;
  const readyMemberCount = members.filter((m) => m.all_approved).length;

  return (
    <div className="fixed top-4 left-4 z-[100] w-80 rounded-xl border-2 border-orange-400 bg-white shadow-2xl ring-4 ring-orange-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white px-4 py-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          {pendingMemberCount > 0 && (
            <span className="relative shrink-0 inline-flex">
              <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-60" />
              <span className="relative flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-white text-orange-700 text-base font-extrabold shadow">
                {pendingMemberCount}
              </span>
            </span>
          )}
          <div className="min-w-0 text-left">
            <p className="text-base font-extrabold truncate leading-tight">รอ RT {pendingMemberCount} ร้าน</p>
            {readyMemberCount > 0 && (
              <p className="text-xs font-semibold text-white/90 truncate">พร้อมคิว {readyMemberCount} ร้าน</p>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs font-bold bg-white/20 px-2 py-1 rounded-md">
          {collapsed ? "แสดง" : "ซ่อน"}
        </span>
      </button>

      {!collapsed && (
        <ul
          className={`divide-y divide-gray-100 ${
            members.length > 5 ? "max-h-52 overflow-y-auto" : ""
          }`}
        >
          {members.map((member) => (
            <li
              key={member.mem_code}
              className="px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-default"
              onMouseEnter={() => setHoveredMemCode(member.mem_code)}
              onMouseLeave={() => setHoveredMemCode(null)}
            >
              <div className="flex justify-between items-start gap-2 text-sm">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="group flex items-center gap-1 text-xs font-medium cursor-pointer select-none"
                    onClick={(e) => { e.stopPropagation(); copyMemCode(member.mem_code); }}
                    title="คลิกเพื่อคัดลอกรหัสร้าน"
                  >
                    {copiedCode === member.mem_code ? (
                      <>
                        <Check size={11} className="text-green-500 shrink-0" />
                        <span className="text-green-600 font-semibold">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} className="text-gray-400 group-hover:text-orange-500 shrink-0 transition-colors" />
                        <span className="text-gray-500 group-hover:text-orange-600 transition-colors">{member.mem_code}</span>
                      </>
                    )}
                  </button>
                  <p className="font-bold text-gray-900 truncate">{member.mem_name}</p>
                </div>
                {member.all_approved ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-green-800 bg-green-100 px-2 py-0.5 rounded-full text-xs font-bold">
                    <CheckCircle2 size={12} />
                    อนุมัติครบแล้ว
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full text-xs font-bold">
                    รอ {member.pending_count} รายการ
                  </span>
                )}
              </div>

              {hoveredMemCode === member.mem_code && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs">
                  <ul
                    className={`space-y-1.5 ${
                      member.items.length > 5 ? "max-h-28 overflow-y-auto" : ""
                    }`}
                  >
                    {member.items.map((item, idx) => (
                      <li
                        key={`${item.sh_running}-${item.product_code}-${idx}`}
                        className="flex justify-between items-start gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-gray-500 truncate">
                            {item.product_code}
                          </p>
                          <p className="truncate text-gray-800 font-semibold">
                            {item.product_name}
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-gray-600 font-medium">
                          {item.amount_item} {item.unit_item} · {getStatusLabel(item.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WaitingRTWidget;
