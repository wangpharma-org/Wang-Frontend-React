import { createContext, useContext } from "react";

// สวิตช์ "แสดงคำอธิบายทั้งหมด" ของหน้าแผงควบคุม — แยกไฟล์ให้ fast refresh ทำงาน
export const ShowAllHelpContext = createContext(false);
export const useShowAllHelp = () => useContext(ShowAllHelpContext);

const STORAGE_KEY = "picking-control:show-help";

// localStorage อาจถูกบล็อก (private mode) — อ่าน/เขียนไม่ได้ก็ใช้ค่าเริ่มต้น
export const readShowAllHelp = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeShowAllHelp = (value: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ไม่เป็นไร แค่จำค่าไม่ได้
  }
};
