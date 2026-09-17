import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Input, message } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Backpack, Briefcase, Calculator, Check, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../components/ProtectedRoute';
import { VAI_TRO_LABEL } from '../utils/format';
import { DESTINATION_IMAGES } from '../utils/tourImages';
import Logo from '../components/Logo';

/**
 * Tài khoản mẫu. `tone` chọn màu biển báo theo vai trò — cùng hệ màu với
 * ba loại tour, nên không sinh thêm bảng màu thứ hai cho riêng trang này.
 */
const QUICK_LOGIN = [
  {
    key: 'Admin',
    role: 'Admin',
    label: VAI_TRO_LABEL.Admin,
    email: 'admin@tour.vn',
    password: 'Admin@123',
    Icon: Crown,
    tone: 'bg-signal-400 text-ink-950',
    desc: 'Toàn quyền quản trị & điều hành',
  },
  {
    key: 'Consultant',
    role: 'Consultant',
    label: VAI_TRO_LABEL.Consultant,
    email: 'tuvan@tour.vn',
    password: 'Tuvan@123',
    Icon: Briefcase,
    tone: 'bg-tide-500 text-white',
    desc: 'Quản lý Lead & chăm sóc khách',
  },
  {
    key: 'Accountant',
    role: 'Accountant',
    label: VAI_TRO_LABEL.Accountant,
    email: 'ketoan@tour.vn',
    password: 'Ketoan@123',
    Icon: Calculator,
    tone: 'bg-heritage-500 text-white',
    desc: 'Quản lý cọc, công nợ & hoàn hủy',
  },
  {
    key: 'Customer',
    role: 'Customer',
    label: VAI_TRO_LABEL.Customer,
    email: 'an.nguyen@gmail.com',
    password: 'An@123',
    Icon: Backpack,
    tone: 'bg-guide-500 text-white',
    desc: 'Khách hàng đặt tour & xem vé',
  },
];

/** Nhãn + lời dẫn của hai chế độ. Hàng tab lấy nhãn từ đây. */
const CHE_DO = {
  login: {
    label: 'Đăng nhập',
    moTa: 'Vào tài khoản của bạn, hoặc chọn một vai trò mẫu ở dưới để xem hệ thống hoạt động thế nào.',
  },
  register: {
    label: 'Tạo tài khoản',
    moTa: 'Tài khoản dùng để giữ chỗ, xem lại đơn đã đặt và nhận lịch trình soạn riêng.',
  },
};

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  // Form đăng ký là một instance RIÊNG, không dùng chung với form đăng nhập.
  // Hai chế độ có tập trường khác nhau; dùng chung một instance thì trường của
  // chế độ này còn nằm lại trong store khi chuyển sang chế độ kia.
  const [regForm] = Form.useForm();
  const [cheDo, setCheDo] = useState('login');
  // Một cờ `submitting` cho cả hai chế độ: mỗi lúc chỉ một form được render,
  // nên không có xung đột, mà nút gửi của cả hai đều tự khoá khi bận.
  const [submitting, setSubmitting] = useState(false);

  const afterLogin = (user) => {
    const target = ROLE_HOME[user.VaiTro] || '/';
    const from = location.state?.from;
    if (from && user.VaiTro === 'Customer' && from !== '/login') {
      navigate(from, { replace: true });
    } else {
      navigate(target, { replace: true });
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const user = await login(values);
      message.success(`Đăng nhập thành công. Xin chào ${user.HoTen}!`);
      afterLogin(user);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (values) => {
    setSubmitting(true);
    try {
      // Chọn tay bốn trường cần gửi: `NhapLaiMatKhau` chỉ để đối chiếu tại chỗ,
      // không phải dữ liệu của tài khoản.
      const user = await register({
        HoTen: values.HoTen,
        Email: values.Email,
        MatKhau: values.MatKhau,
        SoDienThoai: values.SoDienThoai,
      });
      message.success(`Đã tạo tài khoản. Xin chào ${user.HoTen}!`);
      afterLogin(user);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Tạo tài khoản thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (acc) => {
    form.setFieldsValue({ Email: acc.email, MatKhau: acc.password });
    await onFinish({ Email: acc.email, MatKhau: acc.password });
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper lg:flex-row">
      {/* Cột trái: tấm áp phích. Ảnh được đóng khung như một tấm bưu thiếp gắn
          trên bảng, thay vì rửa mờ làm nền cho một dải gradient tím. */}
      <div className="on-ink relative hidden w-1/2 flex-col justify-between p-10 lg:flex xl:p-12">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} className="cursor-pointer">
            <Logo theme="dark" size="lg" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-onink !px-3.5 !py-2 !text-[12.5px]"
          >
            ← Trang chủ
          </button>
        </div>

        <div className="max-w-lg py-10">
          {/* Ba nhịp như ba biển báo nối tiếp trên cùng một cung đường. */}
          <h2 className="font-display text-display-l text-white">
            Chọn cung đường.
            <br />
            Giữ chỗ. Lên đường.
          </h2>

          <p className="mt-5 max-w-[46ch] text-body-s text-ink-300">
            Đặt tour trọn gói, giữ chỗ 24 giờ không cần trả trước, và nhận lịch
            trình soạn riêng theo ngân sách của bạn.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              'Giữ chỗ 24 giờ, cọc 30% khi đã chắc chắn',
              'Lịch trình cá nhân hóa theo ngân sách và sở thích',
              'Tư vấn viên đồng hành trước, trong và sau chuyến đi',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-body-s text-ink-200">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-signal-400"
                  strokeWidth={3}
                  aria-hidden="true"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tấm ảnh gắn khung — vật thể duy nhất có màu trên cột này. */}
        <div className="relative mb-6 overflow-hidden rounded-card border border-white/15">
          <img
            src={DESTINATION_IMAGES['phu-quoc']}
            alt=""
            className="h-40 w-full object-cover xl:h-48"
          />
        </div>

        <div className="road-dash mb-5 opacity-40" aria-hidden="true" />

        <p className="text-[12px] text-ink-400">
          © {new Date().getFullYear()} Đi Thôi Travel · ICTU Artificial Intelligence Project
        </p>
      </div>

      {/* Cột phải: form đăng nhập. */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          {/* Trên mobile cột trái bị ẩn nên logo phải xuất hiện lại ở đây. */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <button type="button" onClick={() => navigate('/')} className="cursor-pointer">
              <Logo theme="light" size="md" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-ghost !text-[12.5px]"
            >
              Về trang chủ
            </button>
          </div>

          <div className="mb-8">
            {/* Hàng tab CHÍNH LÀ tiêu đề trang, nên không có <h1> hiển thị nào
                lặp lại tên chế độ lần thứ hai. <h1> ẩn giữ cấu trúc đề mục cho
                trình đọc màn hình. */}
            <h1 className="sr-only">Đăng nhập hoặc tạo tài khoản khách hàng</h1>

            <div className="flex items-baseline gap-6 border-b border-ink-200">
              {Object.entries(CHE_DO).map(([key, { label }]) => {
                const active = cheDo === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCheDo(key)}
                    aria-pressed={active}
                    className={`relative pb-3 font-display text-display-m transition-colors ${
                      active ? 'text-ink-950' : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    {label}
                    {/* Cùng cử chỉ với thanh menu: vạch kẻ đường chạy dưới
                        chân mục đang đứng. */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-[2px] origin-left rounded-full bg-guide-500 transition-transform duration-200 ease-road ${
                        active ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-body-s text-ink-600">{CHE_DO[cheDo].moTa}</p>
          </div>

          {/* `key` khác nhau là BẮT BUỘC, không phải cho đẹp: hai nhánh của
              ternary đều render <Form>, nên React coi chúng là cùng một
              component ở cùng một vị trí và TÁI DÙNG instance thay vì tháo ra
              lắp lại. Khi đó `form={regForm}` chỉ đổi prop bề mặt, còn các
              Form.Item đã gắn vẫn bám vào store cũ — và hai chế độ dùng chung
              một store: mở tab "Tạo tài khoản" thấy sẵn email/mật khẩu demo,
              gõ email mới ở tab này thì tab đăng nhập cũng đổi theo. Đổi key
              buộc React tháo form cũ và lắp form mới đúng store của nó. */}
          {cheDo === 'login' ? (
            <Form
              key="dang-nhap"
              form={form}
              layout="vertical"
              size="large"
              onFinish={onFinish}
              initialValues={{ Email: 'admin@tour.vn', MatKhau: 'Admin@123' }}
            >
              <Form.Item
                name="Email"
                label={<span className="text-[12.5px] font-semibold text-ink-700">Email</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="text-ink-400" />}
                  placeholder="name@tour.vn"
                  className="!rounded-field"
                />
              </Form.Item>

              <Form.Item
                name="MatKhau"
                label={<span className="text-[12.5px] font-semibold text-ink-700">Mật khẩu</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-ink-400" />}
                  placeholder="••••••••"
                  className="!rounded-field"
                />
              </Form.Item>

              {/* Nút gửi là nút thật trong <form>, để antd Form vẫn nhận onFinish. */}
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-signal mb-1 w-full !py-3.5"
              >
                {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
            </Form>
          ) : (
            <Form
              key="tao-tai-khoan"
              form={regForm}
              layout="vertical"
              size="large"
              onFinish={onRegister}
            >
              <Form.Item
                name="HoTen"
                label={<span className="text-[12.5px] font-semibold text-ink-700">Họ và tên</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập họ tên' },
                  { min: 2, message: 'Họ tên ít nhất 2 ký tự' },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-ink-400" />}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  className="!rounded-field"
                />
              </Form.Item>

              <Form.Item
                name="SoDienThoai"
                label={<span className="text-[12.5px] font-semibold text-ink-700">Số điện thoại</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại' },
                  {
                    pattern: /^0\d{9}$/,
                    message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0',
                  },
                ]}
                extra={
                  <span className="text-[11.5px] text-ink-500">
                    Tư vấn viên sẽ gọi vào số này khi bạn để lại yêu cầu.
                  </span>
                }
              >
                <Input
                  prefix={<PhoneOutlined className="text-ink-400" />}
                  placeholder="0901234567"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="!rounded-field"
                />
              </Form.Item>

              <Form.Item
                name="Email"
                label={<span className="text-[12.5px] font-semibold text-ink-700">Email</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="text-ink-400" />}
                  placeholder="name@gmail.com"
                  autoComplete="email"
                  className="!rounded-field"
                />
              </Form.Item>

              <Form.Item
                name="MatKhau"
                label={<span className="text-[12.5px] font-semibold text-ink-700">Mật khẩu</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 6, message: 'Mật khẩu ít nhất 6 ký tự' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-ink-400" />}
                  placeholder="Ít nhất 6 ký tự"
                  autoComplete="new-password"
                  className="!rounded-field"
                />
              </Form.Item>

              <Form.Item
                name="NhapLaiMatKhau"
                dependencies={['MatKhau']}
                label={
                  <span className="text-[12.5px] font-semibold text-ink-700">
                    Nhập lại mật khẩu
                  </span>
                }
                rules={[
                  { required: true, message: 'Vui lòng nhập lại mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('MatKhau') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu nhập lại không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-ink-400" />}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  className="!rounded-field"
                />
              </Form.Item>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-signal mb-1 w-full !py-3.5"
              >
                {submitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
              </button>
            </Form>
          )}

          {/* Danh sách tài khoản demo chỉ có nghĩa khi đang đăng nhập. Ở chế độ
              tạo tài khoản nó vừa vô nghĩa vừa mời gọi bấm nhầm sang một tài
              khoản có sẵn — nên ẩn hẳn chứ không xoá. */}
          {cheDo === 'login' && (
            <div className="mt-8 border-t border-ink-200 pt-6">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="label-sign text-ink-500">Vào nhanh theo vai trò</span>
                <span className="text-[11px] text-ink-400">một chạm</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {QUICK_LOGIN.map((acc) => (
                  <button
                    key={acc.key}
                    type="button"
                    onClick={() => quickLogin(acc)}
                    disabled={submitting}
                    className="group flex items-start gap-2.5 rounded-card border border-ink-200 bg-white p-3 text-left transition-colors hover:border-ink-400 disabled:opacity-45"
                  >
                    {/* Ô màu vai trò — cùng vai trò thì cùng màu ở mọi màn hình. */}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sign ${acc.tone}`}
                    >
                      <acc.Icon className="h-4 w-4" aria-hidden="true" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="label-sign block text-ink-500">{acc.label}</span>
                      <span className="mt-1.5 block truncate text-[12.5px] font-semibold text-ink-950">
                        {acc.email}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-500">
                        {acc.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
