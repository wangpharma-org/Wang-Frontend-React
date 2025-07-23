import { useNavigate } from "react-router";
const NavbarTicket = ({ activePage } : { activePage: '1' | '2' | '3'}) => {
  const navigate = useNavigate();
  return (
    <div className="fixed bottom-0 left-0 w-full bg-blue-400 px-3 pb-6">
      <div className="w-full flex justify-center items-center bg-white p-3 gap-2 rounded-xl">
        <p className={`text-xl ${activePage === '1' ? 'text-blue-400' : 'text-gray-400'}`} onClick={() => navigate('/open-ticket')}>แจ้งปัญหา</p>
        <p className={`text-xl ${activePage === '2' ? 'text-blue-400' : 'text-gray-400'}`} onClick={() => navigate('open-ticket')}>ติดตามสถานะ</p>
        <p className={`text-xl ${activePage === '3' ? 'text-blue-400' : 'text-gray-400'}`}>รับผิดชอบ</p>
      </div>
    </div>
  );
};
export default NavbarTicket;
