import { useState } from 'react';
import { Form, Input, Modal, message } from 'antd';
import { Bot, Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { leadApi } from '../api/http';

/**
 * Ba kênh liên hệ, ba giọng màu — cùng cách phân biệt với ba loại tour, để mắt
 * tách được kênh trước khi đọc chữ. Nội dung chữ vẫn là màu mực của hệ thống,
 * màu chỉ nằm ở ô biểu tượng.
 */
const KENH = [
  {
    key: 'hotline',
    href: 'tel:0399677693',
    Icon: Phone,
    nhan: 'Hotline 24/7',
    giaTri: '0399 677 693',
    oMau: 'bg-guide-500 text-white',
    vien: 'border-guide-200 bg-guide-50 hover:bg-guide-100',
    ngoai: false,
  },
  {
    key: 'zalo',
    href: 'https://zalo.me/0399677693',
    Icon: MessageCircle,
    nhan: 'Chat Zalo chuyên viên',
    giaTri: 'Nhắn Zalo ngay',
    oMau: 'bg-tide-500 text-white',
    vien: 'border-tide-200 bg-tide-50 hover:bg-tide-100',
    ngoai: true,
  },
];

const LIEN_HE = [
  { Icon: MapPin, text: 'Đường Z115, TP. Thái Nguyên' },
  { Icon: Mail, text: 'support@tourai.vn' },
  { Icon: Clock, text: '08:00 – 21:30 hằng ngày' },
];

export default function QuickContactModal({ open, onCancel, defaultNote = '', onOpenChatAi }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      setSubmitting(true);
      await leadApi.create({
        HoTen: v.HoTen,
        SoDienThoai: v.SoDienThoai,
        Email: v.Email || null,
        NoiDung: v.NoiDung || defaultNote || 'Yêu cầu tư vấn nhanh từ Quick Contact Modal',
        Nguon: 'Web',
      });
      message.success('Đã gửi yêu cầu thành công! Tư vấn viên TourAI sẽ liên hệ trong 5-10 phút.');
      form.resetFields();
      onCancel();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.detail || 'Gửi yêu cầu thất bại, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      centered
      title={
        <div>
          <div className="font-display text-lg font-extrabold text-ink-950">
            Trung tâm hỗ trợ &amp; tư vấn
          </div>
          <p className="mt-1 text-[12.5px] font-normal text-ink-500">
            Gọi, nhắn Zalo hoặc chat với trợ lý AI — hoặc để lại số để chuyên viên
            gọi lại.
          </p>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 py-1 md:grid-cols-5">
        {/* Cột trái: kênh liên hệ trực tiếp */}
        <div className="md:col-span-2 md:border-r md:border-ink-200 md:pr-5">
          <div className="label-sign mb-3 text-ink-500">Kênh trực tiếp</div>

          <div className="space-y-2.5">
            {KENH.map(({ key, href, Icon, nhan, giaTri, oMau, vien, ngoai }) => (
              <a
                key={key}
                href={href}
                {...(ngoai ? { target: '_blank', rel: 'noreferrer' } : {})}
                className={`flex items-center gap-3 rounded-card border p-3 transition-colors ${vien}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sign ${oMau}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] text-ink-600">{nhan}</span>
                  <span className="block font-display text-[14px] font-bold text-ink-950">
                    {giaTri}
                  </span>
                </span>
              </a>
            ))}

            {onOpenChatAi ? (
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  onOpenChatAi();
                }}
                className="flex w-full items-center gap-3 rounded-card border border-signal-200 bg-signal-50 p-3 text-left transition-colors hover:bg-signal-100"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sign bg-signal-400 text-ink-950">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] text-ink-600">Trợ lý ảo AI</span>
                  <span className="block font-display text-[14px] font-bold text-ink-950">
                    Chat tư vấn tour
                  </span>
                </span>
              </button>
            ) : null}
          </div>

          <ul className="mt-4 space-y-2 border-t border-ink-200 pt-4">
            {LIEN_HE.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-[12px] text-ink-600">
                <Icon className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cột phải: để lại số, chuyên viên gọi lại */}
        <div className="md:col-span-3">
          <div className="label-sign mb-2 text-ink-500">Yêu cầu gọi lại</div>
          <p className="mb-4 text-body-s text-ink-600">
            Để lại số điện thoại, chuyên viên gọi lại giải đáp lịch trình và ưu đãi
            cho bạn.
          </p>

          <Form form={form} layout="vertical" initialValues={{ NoiDung: defaultNote }}>
            <Form.Item
              name="HoTen"
              label={<span className="text-[12.5px] font-semibold text-ink-700">Họ và tên</span>}
              className="!mb-3"
              rules={[{ required: true, min: 2, message: 'Vui lòng nhập họ và tên' }]}
            >
              <Input className="!rounded-field" placeholder="Ví dụ: Nguyễn Văn A" />
            </Form.Item>

            <Form.Item
              name="SoDienThoai"
              label={<span className="text-[12.5px] font-semibold text-ink-700">Số điện thoại</span>}
              className="!mb-3"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại' },
                { pattern: /^[0-9+ ]{8,15}$/, message: 'Số điện thoại không hợp lệ' },
              ]}
            >
              <Input className="!rounded-field" placeholder="0912 345 678" />
            </Form.Item>

            <Form.Item
              name="NoiDung"
              label={
                <span className="text-[12.5px] font-semibold text-ink-700">
                  Tour bạn quan tâm / ghi chú
                </span>
              }
              className="!mb-4"
            >
              <Input.TextArea
                rows={2}
                className="!rounded-field"
                placeholder="Ví dụ: Cần tư vấn tour Phú Quốc 3N2Đ cho 4 người…"
              />
            </Form.Item>
          </Form>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn btn-signal w-full !py-3"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? 'Đang gửi…' : 'Gửi yêu cầu gọi lại'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
