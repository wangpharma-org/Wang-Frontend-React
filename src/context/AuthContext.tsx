import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";

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
  allowUsed: boolean;
}

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
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
    const token = sessionStorage.getItem("access_token");
    const refresh = sessionStorage.getItem("refresh_token");
    const user = sessionStorage.getItem("user_info");

    if (token) setAccessToken(token);
    if (refresh) setRefreshToken(refresh);
    if (user) setUserInfo(JSON.parse(user));

    setLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
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


      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
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
