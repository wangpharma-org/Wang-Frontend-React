import { useEffect, useState } from "react";
import NavbarTicket from "../../components/OpenTicket/NavbarTicket";
import { useNavigate } from "react-router";
import axios from "axios";
import Modal from "../../components/ModalQC";
import correct from "../../assets/accept.png"

interface EmpData {
  emp_code: string;
  emp_name: string;
  department: string;
  emp_position: string;
  line_code: string;
  position: string;
}

const Ticket = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(false);
  const [empData, setEmpData] = useState<EmpData | null>(null);
  const [, setErrMsg] = useState<string | null>(null);
  const [ploblemDetail, setProblemDetail] = useState<string>("");
  const [relatedPerson, setRelatedPerson] = useState<string>("");
  const [modalManageOpen, setModalManageOpen] = useState<boolean>(false);

  useEffect(() => {
    const storedEmpData = localStorage.getItem("emp_data");
    if (storedEmpData) {
      setEmpData(JSON.parse(storedEmpData));
    }
  }, []);

  const handleOpenTicket = async () => {
    setLoading(true);
    setModalManageOpen(true);
    if (!empData) {
      navigate("/ticket-welcome");
      return;
    }
    if (ploblemDetail.trim() === "") {
      setErrMsg("กรุณากรอกรายละเอียดปัญหา");
      setLoading(false);
      return;
    }

    const response = await axios.post(
      `${import.meta.env.VITE_API_URL_OPEN_TICKET}/open-ticket`,
      {
        emp_code: empData.emp_code,
        problem_detail: ploblemDetail,
        related_person: relatedPerson,
      }
    );
    if (response.data.success === true) {
        setLoading(false);
    }
    console.log(response.data);
  };

  const handleFinish = () => {
    setModalManageOpen(false);
    setProblemDetail("");
    setRelatedPerson("");
  }

  return (
    <div className="h-screen w-full bg-blue-400 flex flex-col items-center p-3">
      <Modal isOpen={modalManageOpen} onClose={() => setModalManageOpen(false)}>
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
      </Modal>
      <p className="text-3xl font-bold text-white mt-5">
        ระบบแจ้งปัญหาวังเภสัช
      </p>
      <div className="bg-white w-full p-3 rounded-xl mt-3">
        <p className="text-black font-bold text-3xl">สวัสดี</p>
        <p className="text-black font-bold text-2xl">
          {empData?.emp_code} {empData?.emp_name}
        </p>
      </div>
      <p className="text-xl font-bold text-white mt-3">รายละเอียดปัญหา</p>
      <textarea
        className="bg-white rounded-xl text-xl mt-3 px-4 py-2 text-black font-bold w-full h-1/4 text-start"
        placeholder="กรุณากรอกรายละเอียดปัญหา"
        value={ploblemDetail}
        onChange={(e) => setProblemDetail(e.target.value)}
      />
      <input
        className="bg-white rounded-xl text-xl mt-3 px-4 py-2 text-black font-bold w-full text-center"
        placeholder="ป้อนชื่อผู้ที่คิดว่าแก้ปัญหาได้"
        value={relatedPerson}
        onChange={(e) => setRelatedPerson(e.target.value)}
      />
      <button
        className="bg-white py-2 px-4 font-bold text-xl text-blue-400 rounded-lg mt-3 active:scale-90 transition duration-200 ease-in-out select-none"
        onClick={handleOpenTicket}
      >
        แจ้งปัญหา
      </button>
      {/* <div className="bg-white w-full p-3 rounded-xl mt-3">
        <p className="text-black font-bold text-xl">แจ้งปัญหา</p>
      </div> */}
      <NavbarTicket activePage="1" />
    </div>
  );
};
export default Ticket;
