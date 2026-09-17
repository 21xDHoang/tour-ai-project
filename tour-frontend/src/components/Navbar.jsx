import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown } from 'antd';
import {
  HistoryOutlined,
  LogoutOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { VAI_TRO_LABEL } from '../utils/format';
import { ROLE_HOME } from './ProtectedRoute';
import { vaiTroPill } from '../utils/signs';
import Logo from './Logo';

// Menu khách hàng đã xóa hoàn toàn mục Liên hệ
const GUEST_MENU = [
  { key: '/', label: 'Trang chủ' },
  { key: '/tours', label: 'Danh mục tour' },
  { key: '/custom-tour', label: 'Tour riêng' },
  { key: '/vouchers', label: 'Khuyến mãi' },
  { key: '/cam-nang', label: 'Cẩm nang' },
];

/**
 * Thanh điều hướng.
 *
 * Mục đang chọn được đánh dấu bằng một vạch xanh chạy dưới chân — đọc như
 * vạch kẻ đường — thay cho kiểu pill nền indigo nhạt của bản cũ. Viền mực 1px
 * thay cho bóng đổ, để thanh này nối liền mạch với phần thân trang.
 */
export default function Navbar({ onOpenContactModal }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activePath = useMemo(() => {
    const p = location.pathname;
    const paths = ['/custom-tour', '/vouchers', '/cam-nang', '/history', '/account'];
    const found = paths.find((x) => p.startsWith(x));
    if (found) return found;
    if (p.startsWith('/tours')) return '/tours';
    return '/';
  }, [location.pathname]);

  const navItems = useMemo(() => {
    const items = [...GUEST_MENU];
    if (user?.VaiTro === 'Customer') {
      items.push(
        { key: '/history', label: 'Lịch sử đặt' },
        { key: '/account', label: 'Tài khoản' },
      );
    }
    return items;
  }, [user]);

  const isStaff = ['Admin', 'Consultant', 'Accountant'].includes(user?.VaiTro);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-paper/95 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0" aria-label="Đi Thôi Travel — về trang chủ">
          <Logo theme="light" size="md" />
        </Link>

        {/* `min-w-0` + `overflow-x-auto` là lưới an toàn: nav co lại được thay vì
            ép các mục xuống dòng, và nếu có hẹp quá thì nó cuộn ngang chứ không
            tràn ra ngoài khung. Ở các bề ngang thật thì nav vẫn thừa chỗ nên
            thanh cuộn không bao giờ hiện. */}
        <nav
          className="no-scrollbar hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex"
          aria-label="Điều hướng chính"
        >
          {navItems.map((item) => {
            const isActive = activePath === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative shrink-0 whitespace-nowrap px-2.5 py-2 font-display text-[13px] font-semibold transition-colors ${
                  isActive ? 'text-guide-500' : 'text-ink-700 hover:text-ink-950'
                }`}
              >
                {item.label}
                {/* Vạch kẻ đường: chỉ hiện ở mục đang đứng. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-2.5 bottom-0 h-[2px] origin-left rounded-full bg-guide-500 transition-transform duration-200 ease-road ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Tư vấn nhanh: khách thường muốn hỏi trước khi cọc, nên lối vào
              này nằm ngay trên thanh điều hướng chứ không chỉ ở chân trang. */}
          {onOpenContactModal ? (
            <button
              type="button"
              onClick={onOpenContactModal}
              className="btn btn-ghost hidden !font-display !text-[13px] xl:inline-flex"
            >
              Tư vấn nhanh
            </button>
          ) : null}

          {/* Số hotline từng đứng ở đây và là thứ đẩy cả thanh menu xuống dòng:
              đầu trang cần 1275px nội dung trong khung 1176px. Nó đã có mặt ở
              chân trang, ở widget nổi góc phải và trong modal "Tư vấn nhanh" —
              ba chỗ, đều nằm trên mọi trang khách. Bỏ bản thứ tư là chỗ đắt
              nhất, vì nhãn menu mới là thứ người dùng cần thấy đủ chữ. */}

          {user ? (
            <div className="flex items-center gap-2">
              {isStaff ? (
                <button
                  type="button"
                  onClick={() => navigate(ROLE_HOME[user.VaiTro] || '/')}
                  className="btn btn-quiet hidden !px-3 !py-2.5 !text-[13px] sm:inline-flex"
                >
                  <ToolOutlined />
                  Trang quản trị
                </button>
              ) : null}

              <Dropdown
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: 'info',
                      label: (
                        <div className="py-1">
                          <div className="font-semibold text-ink-950">{user.HoTen}</div>
                          <div className="text-xs text-ink-500">{user.Email}</div>
                        </div>
                      ),
                      disabled: true,
                    },
                    { type: 'divider' },
                    ...(user.VaiTro === 'Customer'
                      ? [
                          {
                            key: 'history',
                            label: 'Lịch sử đặt tour',
                            icon: <HistoryOutlined />,
                            onClick: () => navigate('/history'),
                          },
                          {
                            key: 'account',
                            label: 'Hồ sơ cá nhân',
                            icon: <UserOutlined />,
                            onClick: () => navigate('/account'),
                          },
                          { type: 'divider' },
                        ]
                      : []),
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
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-2 rounded-field border border-ink-200 bg-white px-2 py-1.5 transition-colors hover:border-ink-400"
                >
                  <Avatar
                    size="small"
                    className="!bg-guide-500 !font-display !font-bold"
                  >
                    {user.HoTen ? user.HoTen[0].toUpperCase() : 'U'}
                  </Avatar>
                  {/* Tên chỉ hiện từ `xl`: dưới ngưỡng đó chip chỉ còn ảnh đại
                      diện và vai trò, nhường chỗ cho thanh menu đủ chữ. */}
                  <span className="hidden max-w-28 truncate font-display text-[13px] font-semibold text-ink-800 xl:inline">
                    {user.HoTen}
                  </span>
                  {/* Vai trò là HẠNG MỤC, không phải mức độ cần hành động — nên
                      nó lấy giọng từ `vaiTroPill()` chứ không phải bảng màu có
                      sẵn của antd (`volcano`/`geekblue`/`purple`/`green`), vốn
                      được chọn theo cảm giác và không suy ra được gì. */}
                  <span className={`chip !px-2 !py-0.5 !text-[11px] ${vaiTroPill(user.VaiTro)}`}>
                    {VAI_TRO_LABEL[user.VaiTro] || user.VaiTro}
                  </span>
                </button>
              </Dropdown>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-guide !py-2.5 !text-[13px]"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>

      {/* Điều hướng phụ cho màn hẹp — cuộn ngang, không xuống dòng. */}
      <div className="border-t border-ink-200 lg:hidden">
        <nav
          className="no-scrollbar flex gap-1 overflow-x-auto px-5 py-2 sm:px-8"
          aria-label="Điều hướng chính (màn hẹp)"
        >
          {navItems.map((item) => {
            const isActive = activePath === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`shrink-0 whitespace-nowrap rounded-field px-3 py-2 font-display text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-ink-950 text-white'
                    : 'text-ink-700 hover:bg-paper-deep'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
