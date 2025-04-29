import "./App.css";
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InvoiceList from "./pages/InvoiceList";
import Login from "./pages/Login";
import RequireAuth from "./context/RequireAuth";
import InvoiceVat from "./pages/InvoiceVat";
import FormatVat from "./pages/FormatVat";
function App() {
  return (
    <>
      <Router>
      {/* แสดง Navbar ทุกหน้าที่ไม่ใช่ '/format-vat' */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/invoice-all"
          element={
            <>
              <Navbar />
              <RequireAuth>
                <InvoiceList />
              </RequireAuth>
            </>
          }
        />
        <Route
          path="/invoice-vat"
          element={
            <>
              <Navbar />
              <RequireAuth>
                <InvoiceVat />
              </RequireAuth>
            </>
          }
        />
        <Route
          path="/format-vat"
          element={
            <RequireAuth>
              <FormatVat />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
    </>
  );
}

export default App;
