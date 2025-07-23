import { useEffect, useState } from "react";
import NavbarTicket from "../../components/OpenTicket/NavbarTicket";
import axios from "axios";

interface EmpData {
  emp_code: string;
  emp_name: string;
  department: string;
  emp_position: string;
  line_code: string;
  position: string;
}

const StatusTicket = () => {
  const [empData, setEmpData] = useState<EmpData | null>(null);
  const [, setLoading] = useState<boolean>(true);
  const [, setDataTicket] = useState<any[]>([]);

  useEffect(() => {
    const storedEmpData = localStorage.getItem("emp_data");
    if (storedEmpData) {
      setEmpData(JSON.parse(storedEmpData));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [empData]);

  const fetchData = async () => {
    const data = await axios.post(`${import.meta.env.VITE_API_URL_OPEN_TICKET}/get-ticket`, {
        emp_code: empData?.emp_code,
    });
    if (data.data) {
        console.log(data.data);
        setDataTicket(data.data);
        setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-blue-400 flex flex-col items-center p-3">
      {/* <Modal isOpen={modalManageOpen} onClose={() => setModalManageOpen(false)}>
        <div className="flex flex-col items-center text-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-xl">กำลังรายงานปัญหา กรุณารอสักครู่</p>
            </div>
          ):
            <div className="flex flex-col items-center">
                <img src={correct} alt="success" className="w-15 h-15 mb-2" />
                <p className="text-xl">รายงานปัญหาสำเร็จ</p>
                <button 
                  className="bg-blue-500 mt-2 text-white p-2 text-xl rounded-lg active:scale-90 transition duration-200 ease-in-out select-none"
                  onClick={handleFinish}
                >เสร็จสิ้น</button>
            </div>
           }
        </div>
      </Modal> */}
      <p className="text-3xl font-bold text-white mt-5">
        ติดตามสถานะการแจ้งปัญหา
      </p>
      <div className="bg-white w-full p-3 rounded-xl mt-3">
        <p className="text-black font-bold text-xl">ยังไม่รับเรื่อง</p>
      </div>
      {/* <div className="bg-white w-full p-3 rounded-xl mt-3">
        <p className="text-black font-bold text-xl">แจ้งปัญหา</p>
      </div> */}
      <NavbarTicket activePage="2" />
    </div>
  );
};
export default StatusTicket;
