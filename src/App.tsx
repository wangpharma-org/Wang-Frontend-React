import "./App.css";
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InvoiceList from "./pages/InvoiceList";
import Login from "./pages/Login";
import RequireAuth from "./context/RequireAuth";
import InvoiceVat from "./pages/InvoiceVat";
import FormatVat from "./pages/FormatVat";
import Home from "./pages/Home";
import InvoicePart from "./pages/InvoicePart";
import FormatPart from "./pages/FormatPart";
import OrderList from "./pages/OrderList";
import ProductList from "./pages/ProductList";
import StickerPrint from "./pages/StickerPrint";
import FormatSticker from "./pages/FormatSticker";
import EmployeeStatisticsPage from "./pages/EmployeeStatisticsPage";
import VerifyOrder from "./pages/VerifyOrder";
import ReportEmployee from "./pages/ReportEmployee";
import QCDashboard from "./pages/QC-Dashboard";
import FragilePrint from "./components/FragilePrint";
import SpecialExpressPrint from "./pages/SpecialExpress";
import OtherCourier from "./pages/OtherCourier";
import BasketSticker from "./pages/BasketSticker";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <Navbar />
                <RequireAuth>
                  <Home />
                </RequireAuth>
              </div>
            }
          />
          <Route
            path="/login"
            element={
              <div>
                <Navbar />
                <Login />
              </div>
            }
          />
          <Route
            path="/fragileprint"
            element={
              <FragilePrint />
            }
          />
          <Route
            path="/othercourier"
            element={
              <OtherCourier />
            }
          />
          <Route
            path="/basket-sticker"
            element={
              <BasketSticker />
            }
          />
          <Route
            path="/special"
            element={
              <SpecialExpressPrint />
            }
          />
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
            path="/invoice-part"
            element={
              <>
                <Navbar />
                <RequireAuth>
                  <InvoicePart />
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
          <Route
            path="/format-part"
            element={
              <RequireAuth>
                <FormatPart />
              </RequireAuth>
            }
          />
          <Route
            path="/order-list"
            element={
              <RequireAuth>
              <OrderList />
              </RequireAuth>
            }
          />
          <Route
            path="/product-list"
            element={
              <RequireAuth>
              <ProductList />
              </RequireAuth>
            }
          />
          <Route
            path="/print-sticker"
            element={
              <div>
                <Navbar />
                {/* <RequireAuth> */}
                  <StickerPrint />
                {/* </RequireAuth> */}
              </div>
            }
          />
          <Route
            path="/format-sticker"
            element={
              <div>
                {/* <RequireAuth> */}
                  <FormatSticker />
                {/* </RequireAuth> */}
              </div>
            }
          />
          <Route
            path="/report"
            element={
              <div>
                <RequireAuth>
                  <ReportEmployee />
                  </RequireAuth>
              </div>
            }
          />
          <Route
            path="/employee-statistics"
            element={<EmployeeStatisticsPage />}
            />
          <Route
            path="/verify-order"
            element={
              <div>
                <Navbar />
                <RequireAuth>
                  <VerifyOrder />
                </RequireAuth>
              </div>
            }
          />
          <Route
            path="/qc-dashboard"
            element={
              <div>
                <RequireAuth>
                  <QCDashboard />
                  </RequireAuth>
              </div>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
