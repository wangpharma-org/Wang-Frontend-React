import React, { useRef } from "react";
import { useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";
import dayjs from "dayjs";
import { Bounce, Id, ToastContainer, toast } from 'react-toastify';

interface Invoice {
  sh_running: string;
  mem_code: string;
  mem_name: string;
  emp_code: string;
  sh_listsale: number;
  sh_listfree: number;
  sh_sumprice: number;
  sh_datetime: string;
  sh_print: number;
  qc_invoice: string;
  qc_print: number;
  qc_timePrice: string;
  members: Member;
}

interface Member {
  mem_name: string;
  emp_code: string;
}

function VerifyOrder() {
  // const [white, setWhite] = useState("");
  // const [yellow, setYellow] = useState("");
  // const [search, setSearch] = useState("");
  // const [socket, setSocket] = useState<Socket | null]


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // ป้องกัน refresh หน้า
    const white = e.currentTarget.elements.namedItem("whitePaper") as HTMLInputElement | null;
    const yellow = e.currentTarget.elements.namedItem("yellowPaper") as HTMLInputElement | null;
    const search = e.currentTarget.elements.namedItem("search") as HTMLInputElement | null;
    if (white) {
      const value = white.value;
      // setWhite(value);
      console.log('ส่งข้อมูลใบขาว:', value);
      white.value = ''
    } else if (yellow) {
      const value = yellow.value;
      // setYellow(value);
      console.log('ส่งข้อมูลใบเหลือง:', value);
      yellow.value = ''
    } else if (search) {
      const value = search.value;
      // setSearch(value);
      console.log('ส่งข้อมูลค้นหา:', value);
      search.value = ''
    }
  };


  return (
    <div className="overflow-x-auto p-6">
      {/* <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      /> */}
      <div className="flex justify-around mb-8">
        <div className=" w-full flex flex-col">
          <div className="flex justify-center mb-4">
            <p>เพิ่มข้อมูล</p>
          </div>
          <div className="flex mx-5">
            <div className="relative w-full mr-3">
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                <input
                  type="text"
                  name="whitePaper"
                  className="border border-gray-500 text-black w-full mr-1 p-2 rounded-xs bg-blue-50 text-3xl"
                  placeholder="ใบขาว"
                />

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6 absolute transform -translate-y-1/2 right-3 top-1/2 text-gray-400"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </form>
            </div>
            <div className="relative w-full ml-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input type="text" name="yellowPaper" className="border border-gray-500 text-black w-full p-2 rounded-xs bg-yellow-50 text-3xl" placeholder="ใบเหลือง" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 absolute transform -translate-y-1/2 right-3 top-1/2 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </form>
            </div>
          </div>
        </div>
        <div className=" w-full flex flex-col mx-5">
          <div className="flex justify-center mb-4">
            <p>ค้นหา</p>
          </div>
          <div className="flex w-full">
            <div className="relative w-full mr-3">
              <form onSubmit={handleSubmit} className="">
                <div className="relative w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                  <input type="text" name="search" className="border border-gray-500 text-black w-full mr-1 p-2 rounded-xs text-right text-3xl" placeholder="ค้นหาข้อมูล" />
                </div>
              </form>
            </div>
            <div>
              <button className=" text-black ">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-13 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="inline-block min-w-full overflow-hidden shadow-md bg-white">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 uppercase text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-5 py-3 text-center border">ลำดับที่</th>
              <th className="px-5 py-3 text-center border">เลขที่ใบจอง</th>
              <th className="px-5 py-3 text-center border">รหัสสมาชิก</th>
              <th className="px-5 py-3 text-center border">นามร้าน</th>
              <th className="px-5 py-3 text-center border">จำนวนที่ขาย</th>
              <th className="px-5 py-3 text-center border">มูลค่ารวม</th>
              <th className="px-5 py-3 text-center border">วันที่ใบจอง</th>
              <th className="px-5 py-3 text-center border">จำนวนครั้งที่สแกน</th>
              <th className="px-5 py-3 text-center border">เวลาที่สแกนล่าสุด</th>
              <th className="px-5 py-3 text-center border">จำนวนพิมพ์</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">เลขบิล</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">จำนวน</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">มูลค่ารวม</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">จำนวนครั้งที่สแกน</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">เวลาที่สแกนล่าสุด</th>
              <th className="px-5 py-3 text-center border">สถานะ</th>

            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">

            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1 ">1</td>
              <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">1</td>
              <td className="px-6 py-4 text-center border-x-1 border-b-1">1</td>

            </tr>

          </tbody>
        </table>
      </div>
    </div>

  );
};

export default VerifyOrder;
