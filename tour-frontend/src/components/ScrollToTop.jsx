import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Đưa cửa sổ về đầu trang mỗi khi đổi route.
 *
 * React Router không tự làm việc này. Trước đây bấm sang trang mới thì trình
 * duyệt giữ nguyên vị trí cuộn của trang cũ; trang mới ngắn hơn thì vị trí đó
 * bị kẹp xuống đáy, nên người dùng rơi thẳng vào chân trang thay vì đọc từ đầu.
 *
 * `behavior: 'instant'` là bắt buộc chứ không phải cho đẹp: `index.css` đặt
 * `html { scroll-behavior: smooth }`, nên `scrollTo(0, 0)` trần sẽ chạy một cú
 * cuộn mượt từ đáy lên — đúng cái cảm giác "trang mới bị trôi" cần dẹp.
 *
 * Chỉ theo dõi `pathname`. Đổi tham số lọc (`?page=2`) hay mở modal không phải
 * chuyển trang, và không được phép kéo người dùng về đầu.
 *
 * Đặt ở gốc `App` nên áp dụng cho cả web khách hàng lẫn khu nhân viên — cả hai
 * đều cuộn ở `window`, không có vùng cuộn riêng.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
