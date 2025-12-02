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
import FormatLogReport from "./pages/FormatLogReport";
import QCDashboard from "./pages/QC-Dashboard";
import FragilePrint from "./components/FragilePrint";
import SpecialExpressPrint from "./pages/SpecialExpress";
import OtherCourier from "./pages/OtherCourier";
import BasketSticker from "./pages/BasketSticker";
import PrintRT from "./pages/RTPrint";
import Dashboard from "./pages/ReportQcKPI";
import BoxSticker from "./pages/BoxSticker";
import BoxStickerBlock from "./pages/BoxStickerBlock";
import BoxStickerA from "./pages/BoxStickerA";
import ProductManage from "./pages/ProductManage";
import Welcome from "./pages/OpenTicket/Welcome";
import Ticket from "./pages/OpenTicket/Ticket";
import StatusTicket from "./pages/OpenTicket/StatusTicket";
import RequestProduct from "./pages/RequestProduct";
import RouteManage from "./pages/RouteManage";

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
                <Home />
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
            path="/box-sticker"
            element={
              <div>
                <BoxSticker />
              </div>
            }
          />
          <Route
            path="/box-sticker-a"
            element={
              <div>
                <BoxStickerA />
              </div>
            }
          />
          <Route
            path="/box-sticker-block"
            element={
              <div>
                <BoxStickerBlock />
              </div>
            }
          />
          <Route
            path="/dashboard-kpi"
            element={
              <div>
                <Dashboard />
              </div>
            }
          />
          <Route path="/fragileprint" element={<FragilePrint />} />
          <Route path="/othercourier" element={<OtherCourier />} />
          <Route path="/basket-sticker" element={<BasketSticker />} />
          <Route path="/print-rt" element={<PrintRT />} />
          <Route path="/print-request" element={<RequestProduct />} />
          <Route path="/dashboard-qc" element={<QCDashboard />} />
          <Route path="/special" element={<SpecialExpressPrint />} />
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
            path="/log-report"
            element={
              <div>
                <RequireAuth>
                  <FormatLogReport />
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
          <Route
            path="/product-manage"
            element={
              <div>
                <Navbar />
                <RequireAuth>
                  <ProductManage />
                </RequireAuth>
              </div>
            }
          />
          <Route
            path="/ticket-welcome"
            element={
              <div>
                <Welcome />
              </div>
            }
          />

          <Route
            path="/open-ticket"
            element={
              <div>
                <Ticket />
              </div>
            }
          />

          <Route
            path="/status-ticket"
            element={
              <div>
                <StatusTicket />
              </div>
            }
          />
          <Route
            path="/route-manage"
            element={
              <div>
                <Navbar />
                {/* <RequireAuth> */}
                  <RouteManage />
                {/* </RequireAuth> */}
              </div>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
