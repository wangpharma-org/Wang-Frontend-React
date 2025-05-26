
import { useRef } from "react";
// import Clock from "./Clock";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
// import { Socket, io } from "socket.io-client";




const buttonMenu = () => {

  const popupRef = useRef<HTMLDivElement | null>(null);
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();

  const Btnlogout = () => {
    logout()
  };
  return (
    <div ref={popupRef} className="fixed top-0 left-0 h-full z-50 w-3/5 sm:w-1/2 md:w-1/4 bg-blue-900 transition-transform duration-2000 ease-in-out transform translate-x-0">
      <div id="infomation" className="p-4">
        <div className="py-5">
          <div className="bg-gray-100 p-1 rounded-full w-18 h-18 mx-auto">
            <img className="rounded-full w-16 h-16 bg-white mx-auto"
              src="https://as2.ftcdn.net/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg" />
          </div>
          <p className="flex justify-center mt-2 text-white">{userInfo?.emp_code}</p>
          <p className="flex justify-center text-white">{userInfo?.username}</p>
          <div className="flex justify-center text-white">
            <p className="flex justify-center text-white">ช้ัน&nbsp;</p>
            <p className="flex justify-center text-white"> {userInfo?.floor_picking || "-"}</p>
          </div>
        </div>
        <div className="flex justify-center px-3 text-white">
          <button onClick={() => navigate("/order-list")} className="w-full mx-auto flex py-2 active:bg-red-600 scale-95 transition cursor-pointer text-center items-center font-light rounded-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9 rounded-full mr-1 ml-1 p-1 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            รายการคำสั่งซื้อ
          </button>
        </div>
        <div className="flex justify-center px-3 text-white">
          <button onClick={() => navigate("/report")} className="w-full mx-auto flex py-2 active:bg-red-600 scale-95 transition cursor-pointer text-center items-center font-light rounded-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9 rounded-full mr-1 ml-1 p-1 text-white">
              <path strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
              />
            </svg>
            สถิติพนักงาน
          </button>
        </div>
        <div className="flex justify-center px-3 text-white">
          <button onClick={Btnlogout} className="w-full mx-auto flex py-2 hover:bg-red-600 cursor-pointer text-center items-center font-light rounded-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor"
              className="size-9 rounded-full mr-1 ml-1 p-1 text-white">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

export default buttonMenu;