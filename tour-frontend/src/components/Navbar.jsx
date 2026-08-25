import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Dropdown, Layout, Menu, Space, Tag } from 'antd';
import {
  CompassOutlined,
  CustomerServiceOutlined,
  GiftOutlined,
  HistoryOutlined,
  HomeOutlined,
  LogoutOutlined,
  MessageOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { VAI_TRO_LABEL } from '../utils/format';
import { ROLE_HOME } from './ProtectedRoute';

const { Header } = Layout;

const ROLE_COLOR = {
  Admin: 'volcano',
  Consultant: 'geekblue',
  Accountant: 'purple',
  Customer: 'green',
};

/** Các mục công khai của web khách hàng (header ngang). */
const GUEST_MENU = [
  { key: '/', label: 'Trang chủ', icon: <HomeOutlined /> },
  { key: '/tours', label: 'Danh mục tour', icon: <CompassOutlined /> },
  { key: '/custom-tour', label: 'Tour riêng', icon: <ToolOutlined /> },
  { key: '/vouchers', label: 'Khuyến mãi', icon: <GiftOutlined /> },
  { key: '/cam-nang', label: 'Cẩm nang', icon: <MessageOutlined /> },
  { key: '/lien-he', label: 'Liên hệ', icon: <CustomerServiceOutlined /> },
];

/**
 * Menu header ngang cho khách vãng lai & Customer.
 * Nhân viên khi duyệt web công khai vẫn thấy menu này + mục "Vào trang quản trị".
 */
function buildMenu(user) {
  const role = user?.VaiTro;
  const menu = [...GUEST_MENU];

  if (role === 'Customer') {
    menu.push(
      { key: '/history', label: 'Lịch sử đặt tour', icon: <HistoryOutlined /> },
      { key: '/account', label: 'Tài khoản', icon: <UserOutlined /> },
    );
    return menu;
  }

  if (role === 'Admin' || role === 'Consultant' || role === 'Accountant') {
    menu.push({
      key: '/staff-home',
      label: 'Vào trang quản trị',
      icon: <ToolOutlined />,
    });
  }
  return menu;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = useMemo(() => buildMenu(user), [user]);

  // Chọn key menu khớp đường dẫn hiện tại
  const selectedKey = useMemo(() => {
    const p = location.pathname;
    const paths = [
      '/custom-tour', '/vouchers', '/cam-nang', '/lien-he',
      '/history', '/account',
    ];
    const found = paths.find((x) => p.startsWith(x));
    if (found) return found;
    if (p.startsWith('/tours')) return '/tours';
    return '/';
  }, [location.pathname]);

  const onMenuClick = ({ key }) => {
    if (key === '/staff-home') {
      navigate(ROLE_HOME[user?.VaiTro] || '/');
      return;
    }
    navigate(key);
  };

  return (
    <Header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white shadow-md">
      <div className="flex items-center gap-2 px-2">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 text-lg text-white">
            🏖️
          </span>
          <span className="text-lg font-bold text-slate-800">
            Tour<span className="text-indigo-600">AI</span>
          </span>
        </Link>
      </div>

      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={items}
        onClick={onMenuClick}
        className="min-w-0 flex-1 border-none text-sm"
        style={{ justifyContent: 'center', background: 'transparent' }}
      />

      <div className="flex items-center gap-2 px-2">
        {user ? (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'info',
                  label: `${user.HoTen} · ${VAI_TRO_LABEL[user.VaiTro] || user.VaiTro}`,
                  disabled: true,
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  label: 'Đăng xuất',
                  icon: <LogoutOutlined />,
                  onClick: () => {
                    logout();
                    navigate('/login');
                  },
                },
              ],
            }}
          >
            <Space className="cursor-pointer">
              <Avatar
                size="small"
                style={{ backgroundColor: '#4b4ee8' }}
                icon={<UserOutlined />}
              />
              <span className="hidden max-w-32 truncate text-sm text-slate-700 md:inline">
                {user.HoTen}
              </span>
              <Tag color={ROLE_COLOR[user.VaiTro]} className="m-0">
                {VAI_TRO_LABEL[user.VaiTro] || user.VaiTro}
              </Tag>
            </Space>
          </Dropdown>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')}>
            Đăng nhập
          </Button>
        )}
      </div>
    </Header>
  );
}
