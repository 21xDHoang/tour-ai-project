import { useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { customTourApi } from '../api/http';
import { LOAI_DOAN, TRANG_THAI_TOUR_RIENG } from '../utils/format';

const LOAI_OPTIONS = Object.keys(LOAI_DOAN).map((k) => ({ value: k, label: LOAI_DOAN[k] }));
const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_TOUR_RIENG).map((k) => ({
  value: k,
  label: TRANG_THAI_TOUR_RIENG[k].label,
}));

/**
 * Drawer chỉnh sửa toàn bộ thông tin yêu cầu tour thiết kế riêng.
 * Dùng chung cho Tư vấn viên (không chọn người xử lý) và Admin (chọn thêm người xử lý).
 */
export default function CustomTourEditDrawer({
  open,
  item,
  users = [],
  isAdmin = false,
  onClose,
  onSaved,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open || !item) return;
    form.resetFields();
    const lich = item.ChiTietLichTrinh || {};
    form.setFieldsValue({
      HoTen: item.HoTen,
      SoDienThoai: item.SoDienThoai,
      Email: item.Email,
      LoaiDoan: item.LoaiDoan,
      SoLuongKhach: item.SoLuongKhach,
      NgayDuKien: item.NgayDuKien ? dayjs(item.NgayDuKien) : null,
      NganSach: item.NganSach,
      MoTa: item.MoTa,
      SoNguoiLon: lich.SoNguoiLon ?? 0,
      SoTreEm: lich.SoTreEm ?? 0,
      CacNgay: (lich.CacNgay || []).map((d) => ({
        DiemDen: d.DiemDen,
        NoiLuuTru: d.NoiLuuTru,
        BuaAn: d.BuaAn,
        YeuCauKhac: d.YeuCauKhac,
      })),
      GiaChot: item.GiaChot,
      TrangThai: item.TrangThai,
      NguoiXuLyID: item.NguoiXuLyID ?? undefined,
    });
  }, [open, item, form]);

  const consultantOptions = users
    .filter((u) => ['Consultant', 'Admin'].includes(u.VaiTro))
    .map((u) => ({ value: u.MaNguoiDung, label: `${u.HoTen} (${u.VaiTro})` }));

  const submit = async () => {
    const v = await form.validateFields();
    const CacNgay = (v.CacNgay || []).map((d, i) => ({
      Ngay: `Ngay ${i + 1}`,
      DiemDen: d.DiemDen,
      NoiLuuTru: d.NoiLuuTru || null,
      BuaAn: d.BuaAn || null,
      YeuCauKhac: d.YeuCauKhac || null,
    }));
    const SoNguoiLon = v.SoNguoiLon ?? 0;
    const SoTreEm = v.SoTreEm ?? 0;
    const payload = {
      HoTen: v.HoTen,
      SoDienThoai: v.SoDienThoai,
      Email: v.Email || null,
      LoaiDoan: v.LoaiDoan,
      SoLuongKhach: SoNguoiLon + SoTreEm > 0 ? SoNguoiLon + SoTreEm : v.SoLuongKhach,
      NgayDuKien: v.NgayDuKien ? dayjs(v.NgayDuKien).format('YYYY-MM-DD') : null,
      NganSach: v.NganSach ?? null,
      MoTa: v.MoTa || null,
      ChiTietLichTrinh: { SoNguoiLon, SoTreEm, CacNgay },
      GiaChot: v.GiaChot ?? null,
      TrangThai: v.TrangThai,
    };
    if (isAdmin) payload.NguoiXuLyID = v.NguoiXuLyID ?? null;

    setSubmitting(true);
    try {
      await customTourApi.update(item.MaYeuCau, payload);
      message.success('Đã cập nhật yêu cầu tour riêng');
      onSaved?.();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={`Chỉnh sửa yêu cầu — ${item?.HoTen || ''}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={submitting} onClick={submit}>
            Lưu thay đổi
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Divider orientation="left" plain>
          Thông tin liên hệ
        </Divider>
        <div className="flex flex-wrap gap-3">
          <Form.Item
            name="HoTen"
            label="Họ tên"
            className="w-56"
            rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="SoDienThoai"
            label="SĐT"
            className="w-48"
            rules={[{ required: true, min: 8, message: 'Nhập SĐT' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="Email" label="Email" className="flex-1">
            <Input />
          </Form.Item>
        </div>

        <Divider orientation="left" plain>
          Yêu cầu chuyến đi
        </Divider>
        <div className="flex flex-wrap gap-3">
          <Form.Item name="LoaiDoan" label="Loại đoàn" className="w-44">
            <Select options={LOAI_OPTIONS} />
          </Form.Item>
          <Form.Item name="SoLuongKhach" label="Số khách" className="w-32">
            <InputNumber className="w-full" min={1} max={500} />
          </Form.Item>
          <Form.Item name="NgayDuKien" label="Ngày dự kiến" className="w-44">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="NganSach" label="Ngân sách (VNĐ)" className="w-44">
            <InputNumber
              className="w-full"
              min={0}
              step={100000}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val.replace(/\s?|(,*)/g, '')}
            />
          </Form.Item>
        </div>
        <Form.Item name="MoTa" label="Mô tả yêu cầu">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Divider orientation="left" plain>
          Lịch trình dự kiến
        </Divider>
        <div className="flex flex-wrap gap-4">
          <Form.Item name="SoNguoiLon" label="Người lớn" className="w-40">
            <InputNumber className="w-full" min={0} max={500} />
          </Form.Item>
          <Form.Item name="SoTreEm" label="Trẻ em" className="w-40">
            <InputNumber className="w-full" min={0} max={500} />
          </Form.Item>
        </div>
        <Form.List name="CacNgay">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <div key={key} className="mb-3 rounded border border-slate-200 p-3">
                  <div className="mb-2 font-medium text-indigo-600">Ngày {name + 1}</div>
                  <Form.Item
                    {...rest}
                    name={[name, 'DiemDen']}
                    label="Điểm đến"
                    rules={[{ required: true, message: 'Nhập điểm đến' }]}
                  >
                    <Input placeholder="Điểm đến trong ngày" />
                  </Form.Item>
                  <div className="flex flex-wrap gap-3">
                    <Form.Item {...rest} name={[name, 'NoiLuuTru']} label="Nơi lưu trú" className="flex-1">
                      <Input placeholder="Khách sạn / homestay" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'BuaAn']} label="Bữa ăn" className="flex-1">
                      <Input placeholder="Tiêu chuẩn bữa ăn" />
                    </Form.Item>
                  </div>
                  <Form.Item {...rest} name={[name, 'YeuCauKhac']} label="Yêu cầu khác">
                    <Input placeholder="Ghi chú riêng" />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)}>
                    Xóa ngày
                  </Button>
                </div>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                Thêm ngày
              </Button>
            </>
          )}
        </Form.List>

        <Divider orientation="left" plain>
          Báo giá & trạng thái
        </Divider>
        <div className="flex flex-wrap gap-3">
          <Form.Item name="GiaChot" label="Giá chốt (VNĐ)" className="w-48">
            <InputNumber
              className="w-full"
              min={0}
              step={100000}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val.replace(/\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" className="w-44">
            <Select options={TRANG_THAI_OPTIONS} />
          </Form.Item>
          {isAdmin && (
            <Form.Item name="NguoiXuLyID" label="Người xử lý" className="w-56">
              <Select allowClear placeholder="Chọn tư vấn viên" options={consultantOptions} />
            </Form.Item>
          )}
        </div>
        <Space className="mt-2 text-xs text-slate-500">
          Điểm đến từng ngày, nơi ở, dịch vụ ăn uống và giá chốt đều được lưu khi bạn
          nhấn "Lưu thay đổi".
        </Space>
      </Form>
    </Drawer>
  );
}
