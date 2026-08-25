import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Form, Input, message, Tag, Typography } from 'antd';
import { LockOutlined, MailOutlined, RocketOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../components/ProtectedRoute';
import { VAI_TRO_LABEL } from '../utils/format';

const { Title, Text } = Typography;

/** 4 tài khoản seed cho Quick-Login (mật khẩu phát triển). */
const QUICK_LOGIN = [
  {
    key: 'Admin',
    role: 'Admin',
    label: VAI_TRO_LABEL.Admin,
    email: 'admin@tour.vn',
    password: 'Admin@123',
    color: 'volcano',
  },
  {
    key: 'Consultant',
    role: 'Consultant',
    label: VAI_TRO_LABEL.Consultant,
    email: 'tuvan@tour.vn',
    password: 'Tuvan@123',
    color: 'geekblue',
  },
  {
    key: 'Accountant',
    role: 'Accountant',
    label: VAI_TRO_LABEL.Accountant,
    email: 'ketoan@tour.vn',
    password: 'Ketoan@123',
    color: 'purple',
  },
  {
    key: 'Customer',
    role: 'Customer',
    label: VAI_TRO_LABEL.Customer,
    email: 'an.nguyen@gmail.com',
    password: 'An@123',
    color: 'green',
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
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

  // Quick-Login: điền sẵn + tự đăng nhập luôn.
  const quickLogin = async (acc) => {
    form.setFieldsValue({ Email: acc.email, MatKhau: acc.password });
    await onFinish({ Email: acc.email, MatKhau: acc.password });
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Banner trái */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 p-12 text-white lg:flex">
        <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 flex items-center gap-2 text-xl font-bold">
          <span className="text-3xl">🏖️</span> TourAI
        </div>

        <div className="relative z-10">
          <div className="mb-4 text-6xl">🧭</div>
          <Title className="!mb-3 !text-white">
            Hệ thống Quản lý Tour Du lịch Tích hợp AI
          </Title>
          <Text className="!text-sky-100 text-lg">
            Đặt tour, giữ chỗ 24h, quản lý cọc & hủy tour thông minh — với sự
            hỗ trợ của trợ lý AI Gemini cho tư vấn, sinh nội dung, phân tích
            cảm xúc và đề xuất hướng dẫn viên.
          </Text>
        </div>

        <div className="relative z-10 flex gap-4 text-sm text-sky-100">
          <span>✓ JWT &amp; Phân quyền 4 vai trò</span>
          <span>✓ UC-10..13 AI</span>
          <span>✓ Fallback tự động</span>
        </div>
      </div>

      {/* Form phải */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center lg:text-left">
            <Title level={2} className="!mb-1">
              Đăng nhập
            </Title>
            <Text type="secondary">
              Dùng tài khoản được cấp để truy cập hệ thống TourAI
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            size="large"
            onFinish={onFinish}
            initialValues={{ Email: 'admin@tour.vn', MatKhau: 'Admin@123' }}
          >
            <Form.Item
              name="Email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="email@domain.com" />
            </Form.Item>

            <Form.Item
              name="MatKhau"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
              />
            </Form.Item>

            <Form.Item className="!mb-2">
              <Button
                type="primary"
                htmlType="submit"
                block
                icon={<RocketOutlined />}
                loading={submitting}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          {/* Quick-Login Demo */}
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quick-Login Demo (tài khoản seed)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LOGIN.map((acc) => (
                <Button
                  key={acc.key}
                  block
                  onClick={() => quickLogin(acc)}
                  className="!h-auto flex-col items-start py-2"
                >
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <Tag color={acc.color} className="m-0">
                      {acc.role}
                    </Tag>
                    {acc.label}
                  </span>
                  <span className="mt-1 w-full truncate text-left text-xs text-slate-400">
                    {acc.email}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
