import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router";

interface EmpData {
  emp_code: string;
  emp_name: string;
  department: string;
  emp_position: string;
  line_code: string;
  position: string;
}

const Welcome = () => {
  const navigate = useNavigate();
  const [emp_code, setEmp_code] = useState<string | null>(null);
  const [errMsg, setMsg] = useState<string | null>(null);
  const [empData, setEmpData] = useState<EmpData | null>(null);

  useEffect(() => {
    const storedEmpData = localStorage.getItem("emp_data");
    if (storedEmpData) {
      navigate("/open-ticket")
    }
  }, [])

  useEffect(() => {
    const storedEmpData = localStorage.getItem("emp_data");
    if (storedEmpData) {
      navigate("/open-ticket")
    }
  }, [empData])

  return (
    <div className="h-screen w-full bg-blue-400 flex flex-col justify-center items-center text-white">
      <p className="text-3xl font-bold">กรุณาป้อนรหัสพนักงาน</p>
      <input
        className="bg-white rounded-xl text-2xl mt-6 p-2 text-black font-bold w-4/5 text-center"
        placeholder="รหัสพนักงาน"
        type="number"
        inputMode="numeric"
        value={emp_code ?? ""}
        onChange={(e) => setEmp_code(e.target.value)}
        onFocus={() => setMsg(null)}
      ></input>
      {errMsg && (
        <p className="text-red-500 text-lg font-bold mt-2">{errMsg}</p>
      )}
      <button
        className="mt-6 bg-white text-blue-400 px-12 py-3 rounded-xl font-bold active:scale-90 transition duration-200 ease-in-out select-none"
        onClick={async () => {
          if (emp_code?.trim() === "" || emp_code === null) {
            setMsg("กรุณากรอกรหัสพนักงาน");
            return;
          } else {
            console.log(`${import.meta.env.VITE_API_URL_OPEN_TICKET}/emp-data`);
            const empData = await axios.post(
              `${import.meta.env.VITE_API_URL_OPEN_TICKET}/emp-data`,
              {
                emp_code: emp_code,
              }
            );
            if (!empData.data) {
              setMsg("ไม่พบข้อมูลพนักงาน");
              return;
            } else {
              setEmpData(empData.data);
              localStorage.setItem("emp_data", JSON.stringify(empData.data));
            }
            console.log(empData.data);
            // localStorage.setItem("emp_code", emp_code);
          }
        }}
      >
        เข้าใช้งาน
      </button>
    </div>
  );
};
export default Welcome;
