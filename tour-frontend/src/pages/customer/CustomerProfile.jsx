import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  Spin,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  CameraOutlined,
  HistoryOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { customerApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

/** Trang tài khoản khách hàng: ảnh đại diện + chỉnh sửa thông tin cá nhân. */
export default function CustomerProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kh, setKh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anh, setAnh] = useState(null); // data URI ảnh vừa chọn (null = chưa đổi)
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const k = await customerApi.my();
      setKh(k);
      form.setFieldsValue({
        HoTen: k.HoTen,
        SoDienThoai: k.SoDienThoai,
        Email: k.Email,
        NgaySinh: k.NgaySinh ? dayjs(k.NgaySinh) : null,
        GhiChu: k.GhiChu,
      });
      setAnh(null);
    } catch {
      setKh(null);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    load();
  }, [load]);

  const beforeUpload = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('Vui lòng chọn file ảnh');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('Ảnh quá lớn (tối đa 2MB)');
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () => setAnh(reader.result);
    reader.readAsDataURL(file);
    return false; // không tự upload, lưu cục bộ rồi gửi khi bấm Lưu
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      HoTen: v.HoTen,
      SoDienThoai: v.SoDienThoai,
      NgaySinh: v.NgaySinh ? dayjs(v.NgaySinh).format('YYYY-MM-DD') : null,
      GhiChu: v.GhiChu || null,
    };
    if (anh !== null) payload.AnhDaiDien = anh;

    setSaving(true);
    try {
      await customerApi.update(payload);
      message.success('Đã cập nhật thông tin');
      await load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = anh || kh?.AnhDaiDien;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Card className="shadow-panel" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Thông tin tóm tắt + ảnh đại diện */}
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={beforeUpload}
              >
                <div className="group relative cursor-pointer">
                  <Avatar
                    size={104}
                    src={avatarSrc}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#4b4ee8', fontSize: 40 }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                    <CameraOutlined />
                    <span className="text-[10px]">Đổi ảnh</span>
                  </div>
                </div>
              </Upload>

              <div className="flex-1 text-center sm:text-left">
                <Title level={3} className="!mb-1">
                  {kh?.HoTen || user?.HoTen}
                </Title>
                <Text type="secondary">{kh?.Email || user?.Email}</Text>
                <div className="mt-2">
                  {/* Hạng khách là HẠNG MỤC, không phải mức độ cần hành động —
                      nên nó không được tô màu. Chữ đã nói đủ ("thân thiết" hay
                      "thường"); hai màu vàng/xanh cũ chỉ lặp lại điều đó bằng
                      một bảng màu không thuộc hệ thống. */}
                  <span className="chip !px-2 !py-0.5 !text-[11px] bg-ink-100 text-ink-600 border-ink-200">
                    {kh?.LoaiKhach === 'ThanThiet' ? 'Khách thân thiết' : 'Khách thường'}
                  </span>
                  <Text type="secondary" className="text-xs">
                    Mã khách hàng: {kh?.MaKhachHang}
                  </Text>
                </div>
              </div>

              <div className="flex gap-2">
                <Button icon={<HistoryOutlined />} onClick={() => navigate('/history')}>
                  Lịch sử đặt tour
                </Button>
              </div>
            </div>

            <Divider />

            {/* Form chỉnh sửa */}
            <Title level={4} className="!mb-4">
              Chỉnh sửa thông tin
            </Title>
            <Form form={form} layout="vertical">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item
                  name="HoTen"
                  label="Họ và tên"
                  rules={[{ required: true, min: 2, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input size="large" placeholder="Họ và tên" />
                </Form.Item>
                <Form.Item
                  name="SoDienThoai"
                  label="Số điện thoại"
                  rules={[{ required: true, min: 8, message: 'Vui lòng nhập số điện thoại' }]}
                >
                  <Input size="large" placeholder="Số điện thoại" />
                </Form.Item>
                <Form.Item name="Email" label="Email" extra="Gắn với tài khoản đăng nhập, không thể thay đổi">
                  <Input size="large" disabled />
                </Form.Item>
                <Form.Item name="NgaySinh" label="Ngày sinh">
                  <DatePicker className="w-full" size="large" />
                </Form.Item>
              </div>
              <Form.Item name="GhiChu" label="Ghi chú">
                <Input.TextArea rows={3} placeholder="Ghi chú riêng (không bắt buộc)" />
              </Form.Item>

              <div className="flex justify-end">
                <Button
                  type="primary"
                  size="large"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={save}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
