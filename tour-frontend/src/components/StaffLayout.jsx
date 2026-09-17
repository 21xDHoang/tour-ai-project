import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Dropdown, Layout, Menu } from 'antd';
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
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
import { vaiTroPill } from '../utils/signs';
import Logo, { LogoIcon } from './Logo';

const { Sider, Header, Content } = Layout;

const MENU_ADMIN = [
  {
    key: 'nhom1',
    label: 'BẢNG ĐIỀU KHIỂN & BÁO CÁO',
    type: 'group',
    children: [
      { key: '/admin', label: 'Tổng quan hệ thống', icon: <DashboardOutlined /> },
      { key: '/admin/kpi', label: 'KPI nhân viên', icon: <BarChartOutlined /> },
      { key: '/report', label: 'Báo cáo AI & Dòng tiền', icon: <RobotOutlined /> },
    ],
  },
  {
    key: 'nhom2',
    label: 'QUẢN TRỊ DANH MỤC',
    type: 'group',
    children: [
      { key: '/admin/tours', label: 'Quản lý Tour', icon: <CompassOutlined /> },
      { key: '/admin/destinations', label: 'Điểm đến du lịch', icon: <EnvironmentOutlined /> },
      { key: '/admin/calendar', label: 'Lịch khởi hành', icon: <CalendarOutlined /> },
    ],
  },
  {
    key: 'nhom3',
    label: 'ĐIỀU HÀNH & HƯỚNG DẪN VIÊN',
    type: 'group',
    children: [
      { key: '/admin/schedules', label: 'Phân công HDV', icon: <ScheduleOutlined /> },
      { key: '/admin/guides', label: 'Danh sách HDV', icon: <TeamOutlined /> },
    ],
  },
  {
    key: 'nhom4',
    label: 'ĐẶT TOUR & KHÁCH HÀNG CRM',
    type: 'group',
    children: [
      { key: '/admin/bookings', label: 'Đơn đặt chỗ', icon: <ShoppingCartOutlined /> },
      { key: '/admin/leads', label: 'Lead & Yêu cầu tư vấn', icon: <CustomerServiceOutlined /> },
      { key: '/admin/custom-tours', label: 'Tour thiết kế riêng', icon: <TagsOutlined /> },
      { key: '/admin/customers', label: 'Hồ sơ khách hàng', icon: <TeamOutlined /> },
      { key: '/admin/reviews', label: 'Kiểm duyệt đánh giá', icon: <HeartOutlined /> },
    ],
  },
  {
    key: 'nhom5',
    label: 'TIẾP THỊ & NỘI DUNG',
    type: 'group',
    children: [
      { key: '/admin/vouchers', label: 'Mã giảm giá / Voucher', icon: <WalletOutlined /> },
      { key: '/admin/cam-nang', label: 'Cẩm nang du lịch', icon: <ReadOutlined /> },
    ],
  },
  {
    key: 'nhom6',
    label: 'NHÂN SỰ & HỆ THỐNG',
    type: 'group',
    children: [
      { key: '/admin/users', label: 'Tài khoản người dùng', icon: <UserOutlined /> },
      { key: '/admin/audit', label: 'Nhật ký hoạt động', icon: <AuditOutlined /> },
    ],
  },
];

const MENU_CONSULTANT = [
  { key: '/consultant', label: 'Dashboard của tôi', icon: <DashboardOutlined /> },
  { key: '/consultant/booking-desk', label: 'Bàn đặt tour tại quầy', icon: <ShoppingCartOutlined /> },
  { key: '/consultant/leads', label: 'Kanban Lead tư vấn', icon: <CustomerServiceOutlined /> },
  { key: '/consultant/custom-tours', label: 'Tour thiết kế riêng', icon: <TagsOutlined /> },
  { key: '/consultant/orders', label: 'Đơn phụ trách', icon: <CalendarOutlined /> },
  { key: '/consultant/care', label: 'Chăm sóc trước/sau tour', icon: <HeartOutlined /> },
  { key: '/consultant/ai', label: 'Trợ lý AI tư vấn', icon: <RobotOutlined /> },
];

const MENU_ACCOUNTANT = [
  { key: '/accountant/bookings', label: 'Quản lý cọc & công nợ', icon: <WalletOutlined /> },
  { key: '/accountant/transactions', label: 'Sổ quỹ & Giao dịch', icon: <AccountBookOutlined /> },
  { key: '/accountant/report', label: 'Báo cáo tài chính', icon: <BarChartOutlined /> },
  { key: '/accountant/payroll', label: 'Quản lý lương nhân sự', icon: <DollarOutlined /> },
  { key: '/accountant/settlements', label: 'Quyết toán đoàn tour', icon: <MoneyCollectOutlined /> },
];

function buildMenu(role) {
  if (role === 'Admin') return MENU_ADMIN;
  if (role === 'Consultant') return MENU_CONSULTANT;
  if (role === 'Accountant') return MENU_ACCOUNTANT;
  return [];
}

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

  return (
    <Layout className="min-h-screen bg-paper">
      {/* Sider dùng đúng màu mực của hệ thống (ink-950 = nền thanh biển báo),
          nên nó đọc ra như một tấm biển dài chứ không phải "menu admin" xanh
          đen. Bỏ shadow-rail: hệ thống này phân cách bằng viền mực, không bằng
          bóng mềm — bóng mềm là ngôn ngữ của bản cũ. */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={260}
        className="!border-r !border-ink-800 !bg-ink-950"
        theme="dark"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-ink-800">
          <Link to="/" className="flex items-center gap-2.5">
            {collapsed ? (
              <LogoIcon size={34} />
            ) : (
              <Logo theme="dark" size="sm" />
            )}
          </Link>
        </div>

        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          className="h-[calc(100vh-64px)] overflow-y-auto !bg-transparent text-xs font-medium !border-none pt-2"
        />
      </Sider>

      <Layout className="bg-paper">
        <Header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink-200 bg-paper/85 px-4 backdrop-blur-md whitespace-nowrap sm:px-6">
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="!text-ink-600 hover:!bg-paper-deep"
            />
            <div className="hidden sm:block whitespace-nowrap">
              <span className="font-display font-bold text-sm text-ink-800 whitespace-nowrap">
                Phân hệ: {VAI_TRO_LABEL[user?.VaiTro] || 'Nhân viên'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            {/* Nút thật của hệ thống (btn-quiet) chứ không phải Button viền đứt
                của AntD — viền đứt ở đây mang nghĩa "còn thiếu", trong khi việc
                này chỉ là rời sang web khách. */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-quiet shrink-0 !px-3.5 !py-2 !text-[13px]"
            >
              <HomeOutlined />
              <span className="whitespace-nowrap">Về Web Khách Hàng</span>
            </button>

            <Dropdown
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: 'info',
                    label: (
                      <div className="py-1">
                        <div className="font-semibold text-ink-800">{user?.HoTen}</div>
                        <div className="text-xs text-ink-600">{user?.Email}</div>
                      </div>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
                  {
                    key: 'site',
                    label: 'Xem web khách hàng',
                    icon: <HomeOutlined />,
                    onClick: () => navigate('/'),
                  },
                  {
                    key: 'logout',
                    label: 'Đăng xuất',
                    icon: <LogoutOutlined />,
                    danger: true,
                    onClick: () => {
                      logout();
                      navigate('/login');
                    },
                  },
                ],
              }}
            >
              <div className="flex cursor-pointer items-center gap-2 rounded-field border border-ink-200 bg-white px-2.5 py-1.5 transition hover:border-guide-200">
                {/* Nền mực đặc thay cho gradient chàm — gradient là ngôn ngữ của
                    bản cũ, và ở đây nó còn tranh màu với chính viên vai trò bên cạnh. */}
                <Avatar size="small" className="!bg-ink-950 font-bold">
                  {user?.HoTen ? user.HoTen[0].toUpperCase() : 'U'}
                </Avatar>
                <span className="hidden max-w-28 truncate text-xs font-semibold text-ink-700 sm:inline">
                  {user?.HoTen}
                </span>
                <span className={`chip !px-2 !py-0.5 !text-[10px] ${vaiTroPill(user?.VaiTro)}`}>
                  {VAI_TRO_LABEL[user?.VaiTro] || user?.VaiTro}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="p-4 sm:p-6 lg:p-8 max-w-bench w-full mx-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
