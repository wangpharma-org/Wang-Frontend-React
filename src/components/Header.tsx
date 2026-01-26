// components/Header.tsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Clock from "./Clock";

const Header = () => {
  const [showInput, setShowInput] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [totalShoppingOrders, setTotalShoppingOrders] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [totalStatusPicking, setTotalStatusPicking] = useState(0);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const { userInfo, logout } = useAuth();

  // Load saved statistics from localStorage
  useEffect(() => {
    const storedTotalShoppingOrders = localStorage.getItem("totalShoppingOrders");
    const storedTotalStatusPicking = localStorage.getItem("totalStatusPicking");
    const storedTotalOrdersCount = localStorage.getItem("totalOrdersCount");

    if (storedTotalShoppingOrders !== null) {
      setTotalShoppingOrders(JSON.parse(storedTotalShoppingOrders));
    }
    if (storedTotalStatusPicking !== null) {
      setTotalStatusPicking(JSON.parse(storedTotalStatusPicking));
    }
    if (storedTotalOrdersCount !== null) {
      setTotalOrdersCount(JSON.parse(storedTotalOrdersCount));
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSearch = () => {
    setShowInput((prev) => !prev);
  };

  const togglePopupMenu = () => {
    setOpenMenu((prev) => !prev);
    setShowInput(false);
  };

  const closePopupMenu = () => {
    setOpenMenu(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Add search logic here
  };

  return (
    <header className="bg-blue-400 text-white font-medium p-2">
      <div className="flex justify-between items-center">
        <button 
          onClick={togglePopupMenu}
          className="bg-white rounded-lg px-3 py-1 text-black drop-shadow-xs hover:bg-gray-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path
              fillRule="evenodd"
              d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="flex justify-center text-xl">
          <Clock />
        </div>

        <button
          onClick={toggleSearch}
          className="bg-white rounded-lg p-2 text-black drop-shadow-xs hover:bg-gray-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center text-xs gap-2 mt-3">
        <p className="text-black">
          ทั้งหมด <span className="text-gray-800">{totalOrdersCount}</span> ร้าน{" "}
          <span className="text-white">{totalShoppingOrders}</span> รายการ
        </p>
        <p className="text-black">
          เหลือจัด{" "}
          <span className="text-red-500">
            {totalShoppingOrders - totalStatusPicking}
          </span>{" "}
          รายการ | กำลังจัด{" "}
          <span className="text-green-500">{totalStatusPicking}</span> รายการ
        </p>
      </div>

      {showInput && (
        <div className="flex justify-center mt-3">
          <input
            type="text"
            placeholder="พิมพ์รหัสลูกค้า"
            value={search}
            onChange={handleSearch}
            className="p-2 rounded-md text-black bg-white flex z-10 h-8 w-64"
            autoFocus
          />
        </div>
      )}

      {/* Side Menu */}
      {openMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closePopupMenu}
          />
          <div
            ref={popupRef}
            className="fixed top-0 left-0 h-full z-50 w-3/5 sm:w-1/2 md:w-1/4 bg-blue-900 transition-transform duration-300 ease-in-out transform translate-x-0"
          >
            <div className="p-4 relative">
              <button
                onClick={closePopupMenu}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="py-12">
                <div className="bg-gray-100 p-1 rounded-full w-20 h-20 mx-auto">
                  <img
                    className="rounded-full w-18 h-18 bg-white mx-auto"
                    src="https://ui-avatars.com/api/?name=&background=0D8ABC&color=fff"
                    alt="User Avatar"
                  />
                </div>
                <p className="flex justify-center mt-4 text-white text-lg">
                  {userInfo?.emp_code}
                </p>
                <p className="flex justify-center text-white">
                  {userInfo?.username}
                </p>
                <p className="flex justify-center text-white">
                  Floor {userInfo?.floor_picking || "-"}
                </p>
              </div>

              <div className="px-4 space-y-4">
                <button
                  onClick={() => {/* Add navigation to profile */}}
                  className="w-full bg-blue-800 hover:bg-blue-700 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Profile
                </button>

                <button
                  onClick={() => {/* Add navigation to settings */}}
                  className="w-full bg-blue-800 hover:bg-blue-700 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Settings
                </button>

                <button
                  onClick={logout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Logout.
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;