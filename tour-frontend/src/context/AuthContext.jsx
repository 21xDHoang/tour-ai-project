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
    <AuthContext.Provider value={{ user, loading, setLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
