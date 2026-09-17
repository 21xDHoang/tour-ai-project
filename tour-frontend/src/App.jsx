import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import StaffLayout from './components/StaffLayout';
import CallBackFloating from './components/CallBackFloating';
import ChatBox from './components/ChatBox';
import QuickContactModal from './components/QuickContactModal';

// ---------- Public ----------
import Login from './pages/Login';
import Home from './pages/Home';
import TourCatalog from './pages/TourCatalog';
import TourDetail from './pages/TourDetail';
import Booking from './pages/Booking';
import BookingHistory from './pages/BookingHistory';
import CustomTourForm from './pages/CustomTourForm';
import CamNang from './pages/CamNang';
import KhuyenMai from './pages/KhuyenMai';
import CustomerProfile from './pages/customer/CustomerProfile';

// ---------- Consultant ----------
import ConsultantTours from './pages/consultant/ConsultantTours';
import ConsultantDashboard from './pages/consultant/ConsultantDashboard';
import ConsultantBookingDesk from './pages/consultant/ConsultantBookingDesk';
import ConsultantLeads from './pages/consultant/ConsultantLeads';
import ConsultantCustomTours from './pages/consultant/ConsultantCustomTours';
import ConsultantOrders from './pages/consultant/ConsultantOrders';
import ConsultantCare from './pages/consultant/ConsultantCare';

// ---------- Admin ----------
import AdminSchedules from './pages/admin/AdminSchedules';
import AdminGuides from './pages/admin/AdminGuides';
import AdminTours from './pages/admin/AdminTours';
import DashboardTongQuan from './pages/admin/DashboardTongQuan';
import Kpi from './pages/admin/Kpi';
import AdminDestinations from './pages/admin/AdminDestinations';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminBookings from './pages/admin/AdminBookings';
import AdminLeads from './pages/admin/AdminLeads';
import AdminCustomTours from './pages/admin/AdminCustomTours';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminReviews from './pages/admin/AdminReviews';
import AdminVouchers from './pages/admin/AdminVouchers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAudit from './pages/admin/AdminAudit';
import AdminCamNang from './pages/admin/AdminCamNang';

// ---------- Accountant & Report ----------
import AccountantBookings from './pages/accountant/AccountantBookings';
import AccountantTransactions from './pages/accountant/AccountantTransactions';
import AccountantReport from './pages/accountant/AccountantReport';
import AccountantPayroll from './pages/accountant/AccountantPayroll';
import AccountantSettlements from './pages/accountant/AccountantSettlements';
import Dashboard from './pages/report/Dashboard';

/** Các nhóm vai trò dùng chung cho ProtectedRoute. */
const ROLES = {
  CUSTOMER: ['Customer'],
  CONSULTANT: ['Consultant', 'Admin'],
  ACCOUNTANT: ['Accountant', 'Admin'],
  FINANCE: ['Accountant', 'Admin'],
  AI_REPORT: ['Admin'],
  ADMIN: ['Admin'],
};

/**
 * Layout web khách hàng: header ngang + nội dung + footer + widget hỗ trợ nổi.
 *
 * Nền là `bg-paper` (giấy ấm #F7F7F4) chứ không phải `bg-slate-50` — lớp xám
 * lạnh còn sót lại từ bản cũ vốn đè lên nền giấy của hệ thống trên toàn bộ web
 * khách hàng, làm mọi màu biển báo lệch tông.
 */
function PublicLayout() {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar onOpenContactModal={() => setContactModalOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer onOpenContactModal={() => setContactModalOpen(true)} />

      {/* Floating Multi-Support Widget (Hotline + Zalo + Lead Form) */}
      <CallBackFloating />

      {/* AI Assistant ChatBot */}
      <ChatBox />

      {/* Quick Contact Modal (Shared via Header/Footer triggers) */}
      <QuickContactModal
        open={contactModalOpen}
        onCancel={() => setContactModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ---------------- Web khách hàng ---------------- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/tours" element={<TourCatalog />} />
          <Route path="/tours/:id" element={<TourDetail />} />
          <Route path="/custom-tour" element={<CustomTourForm />} />
          <Route path="/cam-nang" element={<CamNang />} />
          <Route path="/vouchers" element={<KhuyenMai />} />
          {/* Redirect /lien-he cũ về trang chủ */}
          <Route path="/lien-he" element={<Navigate to="/" replace />} />
          <Route
            path="/book/:maLich"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={ROLES.CUSTOMER}>
                <BookingHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute allowedRoles={ROLES.CUSTOMER}>
                <CustomerProfile />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ---------------- Cổng Admin toàn quyền ---------------- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN}>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardTongQuan />} />
          <Route path="kpi" element={<Kpi />} />
          <Route path="tours" element={<AdminTours />} />
          <Route path="destinations" element={<AdminDestinations />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="schedules" element={<AdminSchedules />} />
          <Route path="guides" element={<AdminGuides />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="custom-tours" element={<AdminCustomTours />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="cam-nang" element={<AdminCamNang />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>

        {/* ---------------- Cổng Tư vấn viên ---------------- */}
        <Route
          path="/consultant"
          element={
            <ProtectedRoute allowedRoles={ROLES.CONSULTANT}>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ConsultantDashboard />} />
          <Route path="booking-desk" element={<ConsultantBookingDesk />} />
          <Route path="leads" element={<ConsultantLeads />} />
          <Route path="custom-tours" element={<ConsultantCustomTours />} />
          <Route path="orders" element={<ConsultantOrders />} />
          <Route path="care" element={<ConsultantCare />} />
          <Route path="ai" element={<ConsultantTours />} />
        </Route>

        {/* ---------------- Cổng Kế toán ---------------- */}
        <Route
          path="/accountant"
          element={
            <ProtectedRoute allowedRoles={ROLES.ACCOUNTANT}>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route path="bookings" element={<AccountantBookings />} />
          <Route path="transactions" element={<AccountantTransactions />} />
          <Route path="report" element={<AccountantReport />} />
          <Route path="payroll" element={<AccountantPayroll />} />
          <Route path="settlements" element={<AccountantSettlements />} />
        </Route>

        {/* ---------------- Báo cáo chung (Admin/Kế toán) ---------------- */}
        <Route
          path="/report"
          element={
            <ProtectedRoute allowedRoles={ROLES.AI_REPORT}>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
