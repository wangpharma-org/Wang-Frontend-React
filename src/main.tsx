import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

export interface Employee {
  name: string;
  nickname: string;
  phone: string;
  floor: string;
}

export interface EmployeeStatistic {
  id: number;
  emp_code: string;
  work_date: string;
  shift_start: string;
  shift_end: string;
  total_working_time: number;
  total_orders: number;
  picked_orders: number;
  packed_orders: number;
  completed_orders: number;
  average_speed: number;
  real_time_spent: number;
  created_at: string;
  updated_at: string;
  employee: Employee;
}

export interface EmployeeStatisticsGrouped {
  [key: string]: EmployeeStatistic[];
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
