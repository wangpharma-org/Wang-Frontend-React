import { useAuth } from "../context/AuthContext"
import { useState } from "react";
import logoMini from "../assets/logoMini.svg";
import { useNavigate } from "react-router";

const Login = () => {
    const { login, isAuthenticated, userInfo, logout } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login(username, password)
        if (!success) alert('Login failed')
    };

    if (isAuthenticated) {
        navigate('/')
    }


    
    return (
      <>
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 pt-35">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <img
              alt="Your Company"
              src={logoMini}
              className="mx-auto h-14 w-auto"
            />
            <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
              เข้าสู่ระบบ
            </h2>
          </div>
  
          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form action="#" method="POST" className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
                  ชื่อผู้ใช้ (Username)
                </label>
                <div className="mt-2">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
                  />
                </div>
              </div>
  
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                    รหัสผ่าน (Password)
                  </label>
                </div>
                <div className="mt-2">
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
                  />
                </div>
              </div>
  
              <div>
                <button
                  onClick={handleLogin}
                  className="flex w-full cursor-pointer justify-center rounded-md bg-blue-500 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  เข้าสู่ระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    )
  }
export default Login