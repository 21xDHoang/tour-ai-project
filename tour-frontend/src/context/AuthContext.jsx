import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authApi } from '../api/http';

const AuthContext = createContext(null);

/** Đọc user đã lưu trong localStorage (an toàn nếu JSON hỏng). */
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /**
   * Tạo tài khoản khách hàng rồi vào thẳng, không bắt đăng nhập lại.
   *
   * `/auth/register` chỉ trả về thông tin user chứ không trả token (xem
   * app/routers/auth.py), nên phải gọi tiếp `login` để lấy token. Dùng lại
   * chính `login` thay vì tự ghi token vào localStorage: chỉ có một chỗ biết
   * cách lưu phiên đăng nhập, nên không có nguy cơ hai đường lưu lệch nhau.
   */
  const register = useCallback(
    async (data) => {
      await authApi.register(data);
      return login({ Email: data.Email, MatKhau: data.MatKhau });
    },
    [login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Nếu còn token nhưng thiếu user (refresh trang), lấy lại từ /auth/me.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !readStoredUser()) {
      authApi
        .me()
        .then((u) => {
          localStorage.setItem('user', JSON.stringify(u));
          setUser(u);
        })
        .catch(() => logout());
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, setLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
