import { useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
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
      {/* Mọi `Form.Item` dưới đây phải giữ nguyên là con TRỰC TIẾP của `Form`
          (hoặc của hàm render trong `Form.List`). Bọc chúng vào một component
          mới là đổi gốc đường dẫn `name` và form im lặng mất giá trị. */}
      <Form form={form} layout="vertical">
        <h3 className="mb-3 font-display text-title text-ink-950">Thông tin liên hệ</h3>
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

        <h3 className="mb-3 mt-6 font-display text-title text-ink-950">Yêu cầu chuyến đi</h3>
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

        <h3 className="mb-3 mt-6 font-display text-title text-ink-950">Lịch trình dự kiến</h3>
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
                <div key={key} className="mb-3 rounded-card border border-ink-200 bg-white p-3">
                  {/* Ô số thứ tự thay cho dòng chữ "Ngày N" — cùng ngữ pháp với
                      dải gợi ý ở màn Điều hành: con số nằm trong ô mực, chữ
                      đứng cạnh chỉ còn đúng một từ để đọc. Nút xóa dời lên
                      hàng đầu: mỗi thẻ có đúng một vị trí xóa, không phải cuộn
                      xuống đáy thẻ mới thấy. */}
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-field bg-ink-950 font-display text-[12px] font-bold text-white">
                      {name + 1}
                    </span>
                    <span className="label-sign text-ink-600">Ngày</span>
                    <button
                      type="button"
                      onClick={() => remove(name)}
                      className="btn btn-ghost !ml-auto !shrink-0 !px-2 !py-1 !text-[12.5px] !text-stop-600"
                    >
                      <DeleteOutlined /> Xóa ngày
                    </button>
                  </div>
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
                </div>
              ))}
              <button type="button" className="btn btn-quiet w-full" onClick={() => add()}>
                <PlusOutlined /> Thêm ngày
              </button>
            </>
          )}
        </Form.List>

        <h3 className="mb-3 mt-6 font-display text-title text-ink-950">Báo giá &amp; trạng thái</h3>
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
        <p className="mt-2 text-body-s text-ink-600">
          Điểm đến từng ngày, nơi ở, dịch vụ ăn uống và giá chốt đều được lưu khi bạn
          nhấn "Lưu thay đổi".
        </p>
      </Form>
    </Drawer>
  );
}
