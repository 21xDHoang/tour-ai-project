import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker, Form, Input, InputNumber, Select, message } from 'antd';
import { Plus, Send, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { customTourApi } from '../api/http';
import SignBar from '../components/ui/SignBar';
import Dong from '../components/ui/Dong';
import { LOAI_DOAN } from '../utils/format';

const LOAI_OPTIONS = Object.entries(LOAI_DOAN).map(([value, label]) => ({
  value,
  label,
}));

/** Nhãn ô nhập — cùng cỡ chữ với nhãn ở trang đăng nhập và bước đặt chỗ. */
const nhan = (chu) => (
  <span className="text-[12.5px] font-semibold text-ink-700">{chu}</span>
);

/**
 * Tiêu đề một nhóm trường trong phiếu yêu cầu.
 *
 * Cố ý KHÔNG đánh số: ba nhóm này là ba chủ đề, không phải ba bước nối tiếp
 * nhau. Đánh số ở đây vừa ngầm bịa ra một thứ tự không có, vừa tranh thiết bị
 * với dãy ba bước thật ở cột "Sau khi gửi" bên cạnh.
 */
function Nhom({ title, note, children }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-2.5 border-b border-ink-200 pb-2.5">
        <h2 className="font-display text-[15px] font-bold text-ink-950">{title}</h2>
        {note ? <span className="text-[12px] text-ink-500">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

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

  // ============================ MÀN HÌNH ĐÃ GỬI ============================
  if (done) {
    return (
      <div className="shell max-w-3xl space-y-6 pb-16 pt-8">
        <div className="panel overflow-hidden">
          <SignBar
            tone="guide"
            mark="Đã gửi yêu cầu"
            place={done.HoTen}
            meta={`#${done.MaYeuCau}`}
          />

          <div className="p-6 sm:p-7">
            <h1 className="font-display text-display-m text-ink-950">
              Tư vấn viên sẽ liên hệ lại với bạn
            </h1>
            <p className="mt-2 max-w-prose text-body-s text-ink-600">
              Yêu cầu đã vào hàng chờ của bộ phận tư vấn. Giữ máy theo số điện
              thoại bạn để lại để không lỡ cuộc gọi báo giá.
            </p>

            <dl className="mt-6">
              <Dong nhan="Mã yêu cầu">#{done.MaYeuCau}</Dong>
              <Dong nhan="Khách hàng">{done.HoTen}</Dong>
              <Dong nhan="Số điện thoại">{done.SoDienThoai}</Dong>
              <Dong nhan="Loại đoàn">
                {LOAI_DOAN[done.LoaiDoan] || done.LoaiDoan}
              </Dong>
              <Dong nhan="Số khách">{done.SoLuongKhach} khách</Dong>
              <Dong nhan="Ngày dự kiến">
                {done.NgayDuKien
                  ? dayjs(done.NgayDuKien).format('DD/MM/YYYY')
                  : 'Linh hoạt'}
              </Dong>
            </dl>

            <div className="mt-5 rounded-card border border-signal-200 bg-signal-50 p-4">
              <div className="label-sign text-signal-800">Bước tiếp theo</div>
              <p className="mt-2 text-body-s text-ink-700">
                Tư vấn viên dựng lịch trình và báo giá riêng cho đoàn của bạn, rồi
                gọi lại để chốt. Chưa cần thanh toán gì ở bước này.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/')} className="btn btn-ink">
            Về trang chủ
          </button>
          <button
            type="button"
            onClick={() => navigate('/tours')}
            className="btn btn-quiet"
          >
            Xem tour có sẵn
          </button>
        </div>
      </div>
    );
  }

  // ============================ MÀN HÌNH PHIẾU YÊU CẦU ============================
  return (
    <div className="shell space-y-6 pb-16 pt-8">
      <div>
        <h1 className="font-display text-display-m text-ink-950">
          Tour thiết kế riêng
        </h1>
        <p className="mt-1.5 max-w-prose text-body-s text-ink-600">
          Điền phiếu dưới đây — tư vấn viên dựng lịch trình và báo giá riêng cho
          hành trình của bạn. Không phải chọn từ danh sách có sẵn.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="panel p-6 sm:p-7 lg:col-span-8">
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              LoaiDoan: 'GiaDinh',
              SoLuongKhach: 2,
              SoNguoiLon: 0,
              SoTreEm: 0,
            }}
            onFinish={submit}
            requiredMark="optional"
          >
            <div className="space-y-8">
              <Nhom title="Liên hệ với ai">
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Form.Item
                    name="HoTen"
                    label={nhan('Họ và tên')}
                    rules={[{ required: true, min: 2, message: 'Vui lòng nhập họ tên' }]}
                  >
                    <Input size="large" className="!rounded-field" placeholder="vd: Nguyễn Văn A" />
                  </Form.Item>
                  <Form.Item
                    name="SoDienThoai"
                    label={nhan('Số điện thoại')}
                    rules={[{ required: true, min: 8, message: 'Vui lòng nhập số điện thoại' }]}
                  >
                    <Input size="large" className="!rounded-field" placeholder="vd: 0912 345 678" />
                  </Form.Item>
                </div>
                <Form.Item
                  name="Email"
                  label={nhan('Email')}
                  className="!mb-0"
                  rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                >
                  <Input
                    size="large"
                    className="!rounded-field"
                    placeholder="vd: ban@email.com (không bắt buộc)"
                  />
                </Form.Item>
              </Nhom>

              <Nhom title="Chuyến đi bạn muốn">
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Form.Item name="LoaiDoan" label={nhan('Loại đoàn')}>
                    <Select size="large" options={LOAI_OPTIONS} />
                  </Form.Item>
                  <Form.Item
                    name="SoLuongKhach"
                    label={nhan('Số lượng khách')}
                    rules={[{ required: true, message: 'Nhập số khách' }]}
                  >
                    <InputNumber className="w-full" size="large" min={1} max={500} />
                  </Form.Item>
                  <Form.Item
                    name="NgayDuKien"
                    label={nhan('Ngày dự kiến khởi hành')}
                    extra="Để trống nếu linh hoạt"
                  >
                    <DatePicker
                      className="w-full"
                      size="large"
                      disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="NganSach"
                    label={nhan('Ngân sách dự kiến (VNĐ)')}
                    extra="Không bắt buộc"
                  >
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
                <Form.Item name="MoTa" label={nhan('Mô tả yêu cầu')} className="!mb-0">
                  <Input.TextArea
                    rows={3}
                    className="!rounded-field"
                    placeholder="vd: đoàn 20 người, ưu tiên nghỉ dưỡng, thích điểm ít đông…"
                  />
                </Form.Item>
              </Nhom>

              <Nhom title="Lịch trình dự kiến" note="tùy chọn">
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Form.Item name="SoNguoiLon" label={nhan('Người lớn')}>
                    <InputNumber className="w-full" size="large" min={0} max={500} />
                  </Form.Item>
                  <Form.Item name="SoTreEm" label={nhan('Trẻ em')}>
                    <InputNumber className="w-full" size="large" min={0} max={500} />
                  </Form.Item>
                </div>

                <Form.List name="CacNgay">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <div
                          key={key}
                          className="mb-3 rounded-card border border-ink-200 bg-paper p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            {/* Cùng thiết bị đánh số với lịch trình tour và
                                danh sách hành khách ở bước đặt chỗ. */}
                            <div className="flex items-center gap-2.5">
                              <span className="label-sign tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-sign bg-ink-950 text-[11px] text-white">
                                {name + 1}
                              </span>
                              <span className="label-sign text-ink-500">
                                Ngày {name + 1}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(name)}
                              className="btn btn-ghost !px-2 !py-1 !text-[12px] !text-stop-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Xóa ngày
                            </button>
                          </div>

                          <Form.Item
                            {...rest}
                            name={[name, 'DiemDen']}
                            label={nhan('Điểm đến')}
                            rules={[{ required: true, message: 'Nhập điểm đến' }]}
                          >
                            <Input className="!rounded-field" placeholder="vd: Hà Nội - Hạ Long" />
                          </Form.Item>
                          <div className="grid gap-x-4 sm:grid-cols-2">
                            <Form.Item
                              {...rest}
                              name={[name, 'NoiLuuTru']}
                              label={nhan('Nơi lưu trú')}
                            >
                              <Input
                                className="!rounded-field"
                                placeholder="Khách sạn / homestay mong muốn"
                              />
                            </Form.Item>
                            <Form.Item {...rest} name={[name, 'BuaAn']} label={nhan('Bữa ăn')}>
                              <Input className="!rounded-field" placeholder="Tiêu chuẩn bữa ăn" />
                            </Form.Item>
                          </div>
                          <Form.Item
                            {...rest}
                            name={[name, 'YeuCauKhac']}
                            label={nhan('Yêu cầu khác')}
                            className="!mb-0"
                          >
                            <Input
                              className="!rounded-field"
                              placeholder="Ghi chú riêng cho ngày này"
                            />
                          </Form.Item>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => add()}
                        className="btn btn-quiet w-full !border-dashed"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Thêm ngày
                      </button>
                    </>
                  )}
                </Form.List>
              </Nhom>
            </div>

            {/* Nút gửi là nút thật trong <form> để AntD Form vẫn nhận onFinish. */}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-signal mt-8 w-full !py-3.5"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu báo giá'}
            </button>
            <p className="mt-2.5 text-center text-[12px] text-ink-500">
              Tư vấn viên sẽ liên hệ lại theo số điện thoại bạn để lại.
            </p>
          </Form>
        </div>

        {/* Cột phải: trả lời trước câu hỏi "gửi xong thì sao" — chỗ khiến người
            ta do dự nhất khi điền một phiếu dài. */}
        <aside className="panel overflow-hidden lg:col-span-4 lg:sticky lg:top-24">
          <SignBar tone="ink" mark="Sau khi gửi" meta="3 BƯỚC" />
          <ol className="divide-y divide-ink-200">
            {[
              {
                t: 'Tư vấn viên nhận phiếu',
                d: 'Phiếu vào hàng chờ của bộ phận tư vấn kèm mã yêu cầu để bạn tra cứu.',
              },
              {
                t: 'Dựng lịch trình & báo giá',
                d: 'Dựa trên ngân sách, số khách và những ngày bạn đã điền.',
              },
              {
                t: 'Gọi lại chốt phương án',
                d: 'Bạn xem giá rồi mới quyết định — chưa cần đặt cọc ở bước này.',
              },
            ].map((b, i) => (
              <li key={b.t} className="flex items-start gap-3 px-5 py-4">
                <span className="label-sign tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-sign bg-ink-950 text-[11px] text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-[14px] font-bold text-ink-950">
                    {b.t}
                  </div>
                  <div className="mt-0.5 text-body-s text-ink-600">{b.d}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-ink-200 bg-paper-deep px-5 py-4">
            <p className="text-[12px] leading-relaxed text-ink-600">
              Muốn đi ngay theo lịch có sẵn? Xem danh sách tour đang mở bán — giữ
              chỗ 24 giờ miễn phí.
            </p>
            <button
              type="button"
              onClick={() => navigate('/tours')}
              className="btn btn-quiet mt-3 w-full !py-2.5 !text-[13px]"
            >
              Xem tour có sẵn
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
