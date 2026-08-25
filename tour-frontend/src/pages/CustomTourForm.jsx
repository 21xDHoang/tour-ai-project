import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Result,
  Select,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SendOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { customTourApi } from '../api/http';
import { LOAI_DOAN } from '../utils/format';

const { Title, Text } = Typography;

const LOAI_OPTIONS = Object.entries(LOAI_DOAN).map(([value, label]) => ({
  value,
  label,
}));

/** Yêu cầu tour thiết kế riêng — form 1 trang, thân thiện (không chia bước). */
export default function CustomTourForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [form] = Form.useForm();

  const submit = async (v) => {
    const CacNgay = (v.CacNgay || []).map((d, i) => ({
      Ngay: `Ngay ${i + 1}`,
      DiemDen: d.DiemDen,
      NoiLuuTru: d.NoiLuuTru || null,
      BuaAn: d.BuaAn || null,
      YeuCauKhac: d.YeuCauKhac || null,
    }));
    const SoNguoiLon = v.SoNguoiLon ?? 0;
    const SoTreEm = v.SoTreEm ?? 0;
    const hasItinerary = CacNgay.length > 0 || SoNguoiLon > 0 || SoTreEm > 0;
    const payload = {
      HoTen: v.HoTen,
      SoDienThoai: v.SoDienThoai,
      Email: v.Email || null,
      LoaiDoan: v.LoaiDoan,
      SoLuongKhach: SoNguoiLon + SoTreEm > 0 ? SoNguoiLon + SoTreEm : v.SoLuongKhach,
      NgayDuKien: v.NgayDuKien ? dayjs(v.NgayDuKien).format('YYYY-MM-DD') : null,
      NganSach: v.NganSach ?? null,
      MoTa: v.MoTa || null,
      ChiTietLichTrinh: hasItinerary ? { SoNguoiLon, SoTreEm, CacNgay } : null,
    };

    setSubmitting(true);
    try {
      const res = await customTourApi.create(payload);
      setDone(res);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Gửi yêu cầu thất bại, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  // Màn hình thành công sau khi gửi
  if (done) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="shadow-card" bordered={false}>
          <Result
            status="success"
            title="Đã gửi yêu cầu thành công!"
            subTitle="Tư vấn viên sẽ liên hệ với bạn trong thời gian sớm nhất."
          />
          <Descriptions
            bordered
            size="small"
            column={1}
            className="mt-4"
            items={[
              { key: 'kh', label: 'Khách hàng', children: done.HoTen },
              { key: 'sdt', label: 'SĐT', children: done.SoDienThoai },
              { key: 'loai', label: 'Loại đoàn', children: LOAI_DOAN[done.LoaiDoan] || done.LoaiDoan },
              { key: 'sl', label: 'Số khách', children: done.SoLuongKhach },
              {
                key: 'ngay',
                label: 'Ngày dự kiến',
                children: done.NgayDuKien ? dayjs(done.NgayDuKien).format('DD/MM/YYYY') : 'Linh hoạt',
              },
            ]}
          />
          <Alert
            className="mt-4"
            type="info"
            showIcon
            message={`Mã yêu cầu #${done.MaYeuCau} — bạn có thể theo dõi qua tổng đài 1900.1234.`}
          />
          <div className="mt-6 text-center">
            <Button type="primary" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 text-center">
        <Title level={2} className="!mb-1">
          <ToolOutlined className="mr-1 text-indigo-600" /> Tour thiết kế riêng
        </Title>
        <Text type="secondary">
          Điền thông tin bên dưới — tư vấn viên sẽ báo giá riêng cho hành trình của bạn.
        </Text>
      </div>

      <Card className="shadow-card" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ LoaiDoan: 'GiaDinh', SoLuongKhach: 2, SoNguoiLon: 0, SoTreEm: 0 }}
          onFinish={submit}
          requiredMark="optional"
        >
          {/* Thông tin liên hệ */}
          <Divider orientation="left" plain>
            👤 Thông tin liên hệ
          </Divider>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="HoTen"
              label="Họ và tên"
              rules={[{ required: true, min: 2, message: 'Vui lòng nhập họ tên' }]}
            >
              <Input size="large" placeholder="vd: Nguyễn Văn A" />
            </Form.Item>
            <Form.Item
              name="SoDienThoai"
              label="Số điện thoại"
              rules={[{ required: true, min: 8, message: 'Vui lòng nhập số điện thoại' }]}
            >
              <Input size="large" placeholder="vd: 0912 345 678" />
            </Form.Item>
          </div>
          <Form.Item
            name="Email"
            label="Email"
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input size="large" placeholder="vd: ban@email.com (không bắt buộc)" />
          </Form.Item>

          {/* Yêu cầu chuyến đi */}
          <Divider orientation="left" plain>
            🧭 Yêu cầu chuyến đi
          </Divider>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="LoaiDoan" label="Loại đoàn">
              <Select size="large" options={LOAI_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="SoLuongKhach"
              label="Số lượng khách"
              rules={[{ required: true, message: 'Nhập số khách' }]}
            >
              <InputNumber className="w-full" size="large" min={1} max={500} />
            </Form.Item>
            <Form.Item name="NgayDuKien" label="Ngày dự kiến khởi hành" extra="Để trống nếu linh hoạt">
              <DatePicker
                className="w-full"
                size="large"
                disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
              />
            </Form.Item>
            <Form.Item name="NganSach" label="Ngân sách dự kiến (VNĐ)" extra="Không bắt buộc">
              <InputNumber
                className="w-full"
                size="large"
                min={0}
                step={100000}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(val) => val.replace(/\./g, '')}
              />
            </Form.Item>
          </div>
          <Form.Item name="MoTa" label="Mô tả yêu cầu">
            <Input.TextArea
              rows={3}
              placeholder="vd: đoàn 20 người, ưu tiên nghỉ dưỡng, thích điểm ít đông…"
            />
          </Form.Item>

          {/* Lịch trình dự kiến */}
          <Divider orientation="left" plain>
            🗓️ Lịch trình dự kiến <Text type="secondary" className="text-xs">(tùy chọn)</Text>
          </Divider>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="SoNguoiLon" label="Người lớn">
              <InputNumber className="w-full" size="large" min={0} max={500} />
            </Form.Item>
            <Form.Item name="SoTreEm" label="Trẻ em">
              <InputNumber className="w-full" size="large" min={0} max={500} />
            </Form.Item>
          </div>
          <Form.List name="CacNgay">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-indigo-600">Ngày {name + 1}</span>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      >
                        Xóa
                      </Button>
                    </div>
                    <Form.Item
                      {...rest}
                      name={[name, 'DiemDen']}
                      label="Điểm đến"
                      rules={[{ required: true, message: 'Nhập điểm đến' }]}
                    >
                      <Input placeholder="vd: Hà Nội - Hạ Long" />
                    </Form.Item>
                    <div className="grid gap-x-4 sm:grid-cols-2">
                      <Form.Item {...rest} name={[name, 'NoiLuuTru']} label="Nơi lưu trú">
                        <Input placeholder="Khách sạn / homestay mong muốn" />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'BuaAn']} label="Bữa ăn">
                        <Input placeholder="Tiêu chuẩn bữa ăn" />
                      </Form.Item>
                    </div>
                    <Form.Item {...rest} name={[name, 'YeuCauKhac']} label="Yêu cầu khác">
                      <Input placeholder="Ghi chú riêng cho ngày này" />
                    </Form.Item>
                  </div>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  Thêm ngày
                </Button>
              </>
            )}
          </Form.List>

          {/* Nút gửi */}
          <div className="mt-8">
            <Button
              type="primary"
              size="large"
              block
              htmlType="submit"
              loading={submitting}
              icon={<SendOutlined />}
            >
              Gửi yêu cầu báo giá
            </Button>
            <div className="mt-2 text-center text-xs text-slate-400">
              Tư vấn viên sẽ liên hệ lại với bạn trong thời gian sớm nhất.
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
}
