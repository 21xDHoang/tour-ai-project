import AccountantBookings from '../accountant/AccountantBookings';

/**
 * Toàn bộ đơn đặt chỗ cho Admin (CRM).
 * Tái dùng bảng Kế toán ở chế độ đọc/điều hành - Admin toàn quyền
 * có thể xác nhận cọc / thanh toán đủ / xử lý hủy giống Kế toán.
 */
export default function AdminBookings() {
  return <AccountantBookings />;
}
