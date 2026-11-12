import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  ReactNode,
} from "react";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Swal from "sweetalert2";

const AUTH_URL = `${import.meta.env.VITE_API_URL_AUTH}/api/auth`;

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

// NNRB-1776 — access token อายุ 15 นาที · หลาย request ได้ 401 พร้อมกันต้อง refresh ครั้งเดียว (refresh token ถูก rotate ใช้ซ้ำไม่ได้)
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  refreshPromise ??= (async () => {
    const refreshToken = sessionStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("No refresh token");
    const res = await axios.post<TokenPair>(`${AUTH_URL}/refresh`, {
      refreshToken,
    });
    sessionStorage.setItem("access_token", res.data.access_token);
    sessionStorage.setItem("refresh_token", res.data.refresh_token);
    return res.data.access_token;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function tokenExpiresAt(token: string): number | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload: unknown = JSON.parse(atob(base64));
    const exp = (payload as { exp?: unknown } | null)?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

interface UserInfo {
  user_id: number;
  username: string;
  emp_code: string;
  floor_picking?: number;
  firstname?: string;
  lastname?: string;
  nickname?: string;
  manage_qc?: string;
  manage_product?: string;
  manage_route?: string;
  user_role?: string;
  allowUsed: boolean;
}

/** OPHMBC-325 — login ไม่ผ่านพร้อมเหตุผลจาก auth (รหัสผิด / ยังไม่ลงเวลา / ถูกระงับ / HRSoft ล่ม ฯลฯ) */
export type LoginResult =
  | { ok: true }
  | { ok: false; code?: string; message?: string };

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      let token = sessionStorage.getItem("access_token");
      const user = sessionStorage.getItem("user_info");

      // เปิดหน้าใหม่ตอน access หมดอายุ — refresh ก่อน ไม่งั้น socket ที่ต่อตอน mount จะใช้ token เก่าแล้วต่อไม่ติด
      const expiresAt = token ? tokenExpiresAt(token) : null;
      if (token && expiresAt !== null && expiresAt <= Date.now()) {
        token = await refreshAccessToken().catch(() => null);
        if (!token) {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          sessionStorage.removeItem("user_info");
        }
      }

      if (token) {
        setAccessToken(token);
        setRefreshToken(sessionStorage.getItem("refresh_token"));
        if (user) setUserInfo(JSON.parse(user));
      }
      setLoading(false);
    };
    void restore();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL_AUTH}/api/auth/login`,
        {
          username,
          password,
        }
      );

      const { access_token, refresh_token } = res.data;

      const base64Url = access_token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(base64);
      const bytes = new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
      const jsonPayload = new TextDecoder().decode(bytes);
      const payload = JSON.parse(jsonPayload);

      const user: UserInfo = {
        user_id: payload.user_id,
        username: payload.username,
        emp_code: payload.emp_code,
        floor_picking: payload.floor_picking,
        firstname: payload.firstname,
        lastname: payload.lastname,
        nickname: payload.nickname,
        manage_qc: payload.manage_qc,
        manage_product: payload.manage_product,
        manage_route: payload.manage_route,
        user_role: payload.user_role,
        allowUsed: payload.allowUsed,
      };

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUserInfo(user);

      sessionStorage.setItem("access_token", access_token);
      sessionStorage.setItem("refresh_token", refresh_token);
      sessionStorage.setItem("user_info", JSON.stringify(user));


      const users = sessionStorage.getItem("user_info");
      console.log("User info on Home page:", users);
      if (users && JSON.parse(users)) {
        if (JSON.parse(users).allowUsed === false) {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: `รหัสนี้ ${user.emp_code} ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ กรุณาติดต่อฝ่าย HR`,
          });
          setAccessToken(null);
          setRefreshToken(null);
          setUserInfo(null);
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          sessionStorage.removeItem("user_info");
        }
      }


      return { ok: true };
    } catch (error) {
      console.error("Login failed:", error);
      // auth ตอบ { code, message } (OPHMBC-325) — ส่งต่อให้หน้า login แสดงเหตุผลจริง
      const data = axios.isAxiosError(error) ? error.response?.data : undefined;
      return {
        ok: false,
        code: typeof data?.code === "string" ? data.code : undefined,
        message: typeof data?.message === "string" ? data.message : undefined,
      };
    }
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUserInfo(null);

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user_info");
  };

  // OPHMBC-325 — backend ตัด session ที่ login ก่อนเปลี่ยนไปใช้รหัส HRSoft (401 SESSION_REVOKED)
  // → logout แล้ว RequireAuth พากลับหน้า login · หลาย request พังพร้อมกันให้เตือนครั้งเดียว
  const revokedRef = useRef(false);
  useEffect(() => {
    const id = axios.interceptors.response.use(undefined, (error) => {
      if (
        error?.response?.status === 401 &&
        error.response.data?.code === "SESSION_REVOKED" &&
        !revokedRef.current
      ) {
        revokedRef.current = true;
        logout();
        Swal.fire({
          icon: "info",
          title: "กรุณาเข้าสู่ระบบใหม่",
          text:
            error.response.data?.message ||
            "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่าน HRSoft",
        }).finally(() => {
          revokedRef.current = false;
        });
      }
      return Promise.reject(error);
    });
    return () => axios.interceptors.response.eject(id);
  }, []);

  // NNRB-1776 — request ที่แนบ Bearer แล้วได้ 401 → refresh แล้วยิงซ้ำ 1 ครั้ง · refresh ไม่ผ่าน (เกิน 12 ชม. / login ที่อื่น) = logout
  useEffect(() => {
    const id = axios.interceptors.response.use(undefined, async (error: AxiosError<{ code?: string }>) => {
      const config = error.config as RetryableConfig | undefined;
      const hadBearer = String(config?.headers?.Authorization ?? "").startsWith("Bearer ");
      if (
        error.response?.status !== 401 ||
        !config ||
        config._retry ||
        !hadBearer ||
        error.response.data?.code === "SESSION_REVOKED" ||
        config.url?.startsWith(AUTH_URL)
      ) {
        return Promise.reject(error);
      }
      config._retry = true;
      try {
        const token = await refreshAccessToken();
        setAccessToken(token);
        setRefreshToken(sessionStorage.getItem("refresh_token"));
        config.headers.Authorization = `Bearer ${token}`;
        return axios(config);
      } catch (refreshError: unknown) {
        // เน็ตหลุด (ไม่มี response) ไม่ logout ให้ลองใหม่ได้
        if (!axios.isAxiosError(refreshError) || refreshError.response) {
          logout();
        }
        return Promise.reject(error);
      }
    });
    return () => axios.interceptors.response.eject(id);
  }, []);

  // refresh ก่อนหมดอายุ 1 นาที — หน้าที่เพิ่งเปิดแล้วต่อ socket ด้วย token จาก sessionStorage จะได้ตัวที่ยังใช้ได้
  useEffect(() => {
    if (!accessToken) return;
    const expiresAt = tokenExpiresAt(accessToken);
    if (expiresAt === null) return;
    const timer = window.setTimeout(() => {
      refreshAccessToken()
        .then((token) => {
          setAccessToken(token);
          setRefreshToken(sessionStorage.getItem("refresh_token"));
        })
        .catch((refreshError: unknown) => {
          if (!axios.isAxiosError(refreshError) || refreshError.response) {
            logout();
          }
        });
    }, Math.max(expiresAt - Date.now() - 60_000, 0));
    return () => window.clearTimeout(timer);
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        userInfo,
        isAuthenticated: !!accessToken,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
