import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Dropdown,
  Layout,
  Menu,
  Space,
  Tag,
} from 'antd';
import {
  AccountBookOutlined,
  AuditOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  HomeOutlined,
  LogoutOutlined,
  MoneyCollectOutlined,
  ReadOutlined,
  RobotOutlined,
  ScheduleOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { VAI_TRO_LABEL } from '../utils/format';

const { Sider, Header, Content } = Layout;

const ROLE_COLOR = {
  Admin: 'volcano',
  Consultant: 'geekblue',
  Accountant: 'purple',
  Customer: 'green',
};

/** Menu cho Admin toàn quyền (nhóm theo đặc tả). */
const MENU_ADMIN = [
  {
    key: 'nhom1',
    label: 'Bảng điều khiển & Báo cáo',
    type: 'group',
    children: [
      { key: '/admin', label: 'Tổng quan', icon: <DashboardOutlined /> },
      { key: '/admin/kpi', label: 'KPI nhân viên', icon: <BarChartOutlined /> },
      { key: '/report', label: 'Báo cáo phân tích AI', icon: <RobotOutlined /> },
    ],
  },
  {
    key: 'nhom2',
    label: 'Quản trị danh mục',
    type: 'group',
    children: [
      { key: '/admin/tours', label: 'Tour', icon: <CompassOutlined /> },
      { key: '/admin/destinations', label: 'Điểm đến', icon: <EnvironmentOutlined /> },
      { key: '/admin/calendar', label: 'Lịch khởi hành', icon: <CalendarOutlined /> },
    ],
  },
  {
    key: 'nhom3',
    label: 'Điều hành & vận hành',
    type: 'group',
    children: [
      { key: '/admin/schedules', label: 'Phân công HDV', icon: <ScheduleOutlined /> },
      { key: '/admin/guides', label: 'Danh sách HDV', icon: <TeamOutlined /> },
    ],
  },
  {
    key: 'nhom4',
    label: 'Đặt tour & khách hàng (CRM)',
    type: 'group',
    children: [
      { key: '/admin/bookings', label: 'Đơn đặt chỗ', icon: <ShoppingCartOutlined /> },
      { key: '/admin/leads', label: 'Lead & tư vấn', icon: <CustomerServiceOutlined /> },
      { key: '/admin/custom-tours', label: 'Tour thiết kế riêng', icon: <TagsOutlined /> },
      { key: '/admin/customers', label: 'Hồ sơ khách hàng', icon: <TeamOutlined /> },
      { key: '/admin/reviews', label: 'Kiểm duyệt đánh giá', icon: <HeartOutlined /> },
    ],
  },
  {
    key: 'nhom5',
    label: 'Tiếp thị & nội dung',
    type: 'group',
    children: [
      { key: '/admin/vouchers', label: 'Mã giảm giá', icon: <WalletOutlined /> },
      { key: '/admin/cam-nang', label: 'Cẩm nang du lịch', icon: <ReadOutlined /> },
    ],
  },
  {
    key: 'nhom6',
    label: 'Nhân sự & phân quyền',
    type: 'group',
    children: [
      { key: '/admin/users', label: 'Tài khoản người dùng', icon: <UserOutlined /> },
    ],
  },
  {
    key: 'nhom7',
    label: 'Cài đặt hệ thống',
    type: 'group',
    children: [
      { key: '/admin/audit', label: 'Nhật ký hoạt động', icon: <AuditOutlined /> },
    ],
  },
];

/** Menu cho Tư vấn viên. */
const MENU_CONSULTANT = [
  { key: '/consultant', label: 'Dashboard của tôi', icon: <DashboardOutlined /> },
  { key: '/consultant/booking-desk', label: 'Bàn đặt tour', icon: <ShoppingCartOutlined /> },
  { key: '/consultant/leads', label: 'Lead & tư vấn', icon: <CustomerServiceOutlined /> },
  { key: '/consultant/custom-tours', label: 'Tour thiết kế riêng', icon: <TagsOutlined /> },
  { key: '/consultant/orders', label: 'Đơn phụ trách', icon: <CalendarOutlined /> },
  { key: '/consultant/care', label: 'Chăm sóc trước/sau tour', icon: <HeartOutlined /> },
  { key: '/consultant/ai', label: 'Trợ lý AI tư vấn', icon: <RobotOutlined /> },
];

/** Menu cho Kế toán. */
const MENU_ACCOUNTANT = [
  { key: '/accountant/bookings', label: 'Quản lý cọc & công nợ', icon: <WalletOutlined /> },
  { key: '/accountant/transactions', label: 'Sổ quỹ / Giao dịch', icon: <AccountBookOutlined /> },
  { key: '/accountant/report', label: 'Báo cáo tài chính', icon: <BarChartOutlined /> },
  { key: '/accountant/payroll', label: 'Quản lý nhân viên & lương', icon: <DollarOutlined /> },
  { key: '/accountant/settlements', label: 'Quyết toán đoàn tour', icon: <MoneyCollectOutlined /> },
];

function buildMenu(role) {
  if (role === 'Admin') return MENU_ADMIN;
  if (role === 'Consultant') return MENU_CONSULTANT;
  if (role === 'Accountant') return MENU_ACCOUNTANT;
  return [];
}

/** Xác định menu item được chọn từ đường dẫn hiện tại. */
function selectedKeyFor(pathname) {
  const prefix = [
    '/admin/kpi',
    '/admin/tours',
    '/admin/destinations',
    '/admin/calendar',
    '/admin/schedules',
    '/admin/guides',
    '/admin/bookings',
    '/admin/leads',
    '/admin/custom-tours',
    '/admin/customers',
    '/admin/reviews',
    '/admin/vouchers',
    '/admin/cam-nang',
    '/admin/users',
    '/admin/audit',
    '/consultant/booking-desk',
    '/consultant/leads',
    '/consultant/custom-tours',
    '/consultant/orders',
    '/consultant/care',
    '/consultant/ai',
    '/accountant/bookings',
    '/accountant/transactions',
    '/accountant/report',
    '/accountant/payroll',
    '/accountant/settlements',
    '/report',
  ];
  const found = prefix.find((p) => pathname.startsWith(p));
  if (found) return found;
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/consultant')) return '/consultant';
  if (pathname.startsWith('/accountant')) return '/accountant/bookings';
  return '';
}

/**
 * Layout dành cho vai trò nhân viên (Admin / Consultant / Accountant):
 * Sider trái chứa menu theo nhóm + Header trên giữ logo & dropdown tài khoản.
 */
export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const items = useMemo(() => buildMenu(user?.VaiTro), [user?.VaiTro]);
  const selectedKey = useMemo(
    () => selectedKeyFor(location.pathname),
    [location.pathname],
  );

  const onMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={250}
        className="bg-white shadow-md"
        theme="light"
      >
        <div className="flex h-16 items-center justify-center gap-2 px-3">
          <Link to={user?.VaiTro === 'Customer' ? '/' : '/admin'} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 text-lg text-white">
              🏖️
            </span>
            {!collapsed && (
              <span className="text-lg font-bold text-slate-800">
                Tour<span className="text-indigo-600">AI</span>
              </span>
            )}
          </Link>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={onMenuClick}
          className="h-[calc(100vh-64px)] overflow-y-auto border-none text-sm"
        />
      </Sider>

      <Layout>
        <Header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm">
          <div className="text-base font-semibold text-slate-700">
            {VAI_TRO_LABEL[user?.VaiTro] || 'Hệ thống quản lý tour'}
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'info',
                  label: `${user?.HoTen} · ${VAI_TRO_LABEL[user?.VaiTro] || user?.VaiTro}`,
                  disabled: true,
                },
                { type: 'divider' },
                { key: 'site', label: 'Về trang web khách hàng', icon: <HomeOutlined />,
                  onClick: () => navigate('/') },
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
                {user?.HoTen}
              </span>
              <Tag color={ROLE_COLOR[user?.VaiTro]} className="m-0">
                {VAI_TRO_LABEL[user?.VaiTro] || user?.VaiTro}
              </Tag>
            </Space>
          </Dropdown>
        </Header>
        <Content className="p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
