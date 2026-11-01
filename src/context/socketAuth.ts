import type { Socket } from "socket.io-client";

/** AuthContext ฟัง event นี้แล้ว logout — ยิงเมื่อ backend ตัด socket เพราะถูกตัดสิทธิ์ / session หมด */
export const AUTH_REVOKED_EVENT = "auth:revoked";

/** ส่ง token ตอนต่อ socket (backend เช็คตอนต่อ) · ไม่มี token = ไม่ส่งอะไร (หน้าที่ไม่ต้อง login) */
export function socketAuth(): { auth?: { token: string } } {
  const token = sessionStorage.getItem("access_token");
  return token ? { auth: { token } } : {};
}

/** backend ส่ง session:revoked แล้วตัด socket (ถูกตัดสิทธิ์ หรือ token ออกก่อนเวลาตัด) → ให้หน้าเว็บ logout */
export function watchRevoked(socket: Socket): void {
  socket.on("session:revoked", (body?: { code?: string; message?: string }) => {
    window.dispatchEvent(new CustomEvent(AUTH_REVOKED_EVENT, { detail: body }));
  });
}
