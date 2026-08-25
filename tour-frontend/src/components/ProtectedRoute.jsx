import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Trang mặc định mỗi vai trò khi đăng nhập / bị chặn quyền. */
export const ROLE_HOME = {
  Admin: '/admin',
  Consultant: '/consultant',
  Accountant: '/accountant/bookings',
  Customer: '/',
};

/**
 * Bảo vệ route theo vai trò (RBAC phía frontend).
 * - Chưa đăng nhập   -> đưa về /login.
 * - Thiếu quyền      -> đưa về trang mặc định của vai trò hiện tại.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.VaiTro)) {
    return <Navigate to={ROLE_HOME[user.VaiTro] || '/'} replace />;
  }

  return children;
}
