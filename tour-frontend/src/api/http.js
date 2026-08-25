import axios from 'axios';

/**
 * Axios client dùng chung cho toàn bộ ứng dụng.
 *
 * - baseURL trỏ thẳng vào backend FastAPI (prefix /api/v1).
 * - Request interceptor: tự gắn `Authorization: Bearer <token>` từ localStorage.
 * - Response interceptor: gặp 401 -> xóa token và đưa về /login.
 */

const http = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 120000, // AI có thể mất tới 60s + thời gian xử lý
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------- Auth
export const authApi = {
  login: (data) => http.post('/auth/login', data).then((r) => r.data),
  register: (data) => http.post('/auth/register', data).then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),
};

// ---------------------------------------------------------------- Tours
export const tourApi = {
  list: (params) => http.get('/tours', { params }).then((r) => r.data),
  detail: (id) => http.get(`/tours/${id}`).then((r) => r.data),
  destinations: () =>
    http.get('/tours/destinations/all').then((r) => r.data),
  create: (data) => http.post('/tours', data).then((r) => r.data),
  update: (id, data) => http.patch(`/tours/${id}`, data).then((r) => r.data),
  createDestination: (data) =>
    http.post('/tours/destinations', data).then((r) => r.data),
  updateDestination: (id, data) =>
    http.patch(`/tours/destinations/${id}`, data).then((r) => r.data),
};

// ---------------------------------------------------------------- Bookings
export const bookingApi = {
  create: (data) => http.post('/bookings', data).then((r) => r.data),
  manual: (data) => http.post('/bookings/manual', data).then((r) => r.data),
  detail: (id) => http.get(`/bookings/${id}`).then((r) => r.data),
  listAll: () => http.get('/bookings').then((r) => r.data),
  scanExpired: () =>
    http.post('/bookings/scan-expired').then((r) => r.data),
};

// ---------------------------------------------------------------- Customers
export const customerApi = {
  my: () => http.get('/customers/my').then((r) => r.data),
  myBookings: () => http.get('/customers/my/bookings').then((r) => r.data),
  update: (data) => http.patch('/customers/my', data).then((r) => r.data),
};

// ---------------------------------------------------------------- Payments
export const paymentApi = {
  deposit: (data) => http.post('/payments/deposit', data).then((r) => r.data),
  fullPayment: (data) =>
    http.post('/payments/full-payment', data).then((r) => r.data),
  cancel: (data) => http.post('/payments/cancel', data).then((r) => r.data),
};

// ---------------------------------------------------------------- Guides
export const guideApi = {
  list: () => http.get('/guides').then((r) => r.data),
  detail: (id) => http.get(`/guides/${id}`).then((r) => r.data),
  create: (data) => http.post('/guides', data).then((r) => r.data),
  update: (id, data) => http.patch(`/guides/${id}`, data).then((r) => r.data),
  analyzeFeedback: (id) =>
    http.post(`/guides/${id}/analyze-feedback`).then((r) => r.data),
  available: (maLich) =>
    http.get(`/guides/available/${maLich}`).then((r) => r.data),
  assign: (data) => http.post('/guides/assign', data).then((r) => r.data),
};

// ---------------------------------------------------------------- AI (UC-10..13)
export const aiApi = {
  advise: (data) => http.post('/ai/advise', data).then((r) => r.data),
  generateContent: (maTour) =>
    http.post('/ai/generate-content', { MaTour: maTour }).then((r) => r.data),
  generateTourDraft: (data) =>
    http.post('/ai/generate-tour-draft', data).then((r) => r.data),
  analyzeFeedback: (maTour) =>
    http.post('/ai/analyze-feedback', { MaTour: maTour }).then((r) => r.data),
  suggestGuides: (maLich) =>
    http.post('/ai/suggest-guides', { MaLich: maLich }).then((r) => r.data),
};

// ---------------------------------------------------------------- Reports
export const reportApi = {
  revenue: () => http.get('/reports/revenue').then((r) => r.data),
  transactions: (params) =>
    http.get('/reports/transactions', { params }).then((r) => r.data),
  receivables: () => http.get('/reports/receivables').then((r) => r.data),
  paymentMethods: () =>
    http.get('/reports/payment-methods').then((r) => r.data),
};

// ---------------------------------------------------------------- Payroll
export const payrollApi = {
  employees: () => http.get('/payroll/employees').then((r) => r.data),
  sheet: (params) => http.get('/payroll/sheet', { params }).then((r) => r.data),
  upsertSheet: (data) => http.post('/payroll/sheet', data).then((r) => r.data),
  updateSheet: (id, data) =>
    http.patch(`/payroll/sheet/${id}`, data).then((r) => r.data),
};

// ---------------------------------------------------------------- Settlements (P&L)
export const settlementApi = {
  list: () => http.get('/settlements').then((r) => r.data),
  upsert: (data) => http.post('/settlements', data).then((r) => r.data),
  update: (id, data) =>
    http.patch(`/settlements/${id}`, data).then((r) => r.data),
  lock: (id) => http.post(`/settlements/${id}/lock`).then((r) => r.data),
};

// ---------------------------------------------------------------- Payables (công nợ NCC)
export const payableApi = {
  list: () => http.get('/payables').then((r) => r.data),
  create: (data) => http.post('/payables', data).then((r) => r.data),
  update: (id, data) => http.patch(`/payables/${id}`, data).then((r) => r.data),
  pay: (id, data) => http.post(`/payables/${id}/pay`, data).then((r) => r.data),
};

// ---------------------------------------------------------------- Leads
export const leadApi = {
  create: (data) => http.post('/leads', data).then((r) => r.data),
  list: () => http.get('/leads').then((r) => r.data),
  listMy: () => http.get('/leads/my').then((r) => r.data),
  update: (id, data) => http.patch(`/leads/${id}`, data).then((r) => r.data),
};

// ---------------------------------------------------------------- Custom tours
export const customTourApi = {
  create: (data) => http.post('/custom-tour-requests', data).then((r) => r.data),
  list: () => http.get('/custom-tour-requests').then((r) => r.data),
  listMy: () => http.get('/custom-tour-requests/my').then((r) => r.data),
  update: (id, data) =>
    http.patch(`/custom-tour-requests/${id}`, data).then((r) => r.data),
};

// ---------------------------------------------------------------- Vouchers
export const voucherApi = {
  active: () => http.get('/vouchers/active').then((r) => r.data),
  listAll: () => http.get('/vouchers').then((r) => r.data),
  create: (data) => http.post('/vouchers', data).then((r) => r.data),
  update: (id, data) => http.patch(`/vouchers/${id}`, data).then((r) => r.data),
};

// ---------------------------------------------------------------- Reviews
export const reviewApi = {
  list: () => http.get('/reviews').then((r) => r.data),
  create: (data) => http.post('/reviews', data).then((r) => r.data),
  update: (id, data) => http.patch(`/reviews/${id}`, data).then((r) => r.data),
};

// ---------------------------------------------------------------- Dashboard & KPI
export const dashboardApi = {
  summary: () => http.get('/dashboard/summary').then((r) => r.data),
  kpiConsultants: () =>
    http.get('/dashboard/kpi/consultants').then((r) => r.data),
  kpiMy: () => http.get('/dashboard/kpi/my').then((r) => r.data),
};

// ---------------------------------------------------------------- Admin ops
export const adminApi = {
  customers: () => http.get('/admin/customers').then((r) => r.data),
  users: () => http.get('/admin/users').then((r) => r.data),
  updateUser: (id, data) =>
    http.patch(`/admin/users/${id}`, data).then((r) => r.data),
  schedules: () => http.get('/admin/schedules').then((r) => r.data),
  updateSchedule: (id, data) =>
    http.patch(`/admin/schedules/${id}`, data).then((r) => r.data),
  scheduleBookings: (id) =>
    http.get(`/admin/schedules/${id}/bookings`).then((r) => r.data),
};

// ---------------------------------------------------------------- Cẩm nang (CMS)
export const camNangApi = {
  active: () => http.get('/cam-nang/active').then((r) => r.data),
  listAll: () => http.get('/cam-nang').then((r) => r.data),
  create: (data) => http.post('/cam-nang', data).then((r) => r.data),
  update: (id, data) =>
    http.patch(`/cam-nang/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/cam-nang/${id}`).then((r) => r.data),
};

export default http;
