import { useState } from 'react';
import { Form, Input, Modal, message } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { leadApi } from '../api/http';

/**
 * Nút nổi "Yêu cầu gọi lại" cho web khách hàng.
 * Form tạo Lead (Nguon=Web) — tư vấn viên sẽ thấy trên Kanban/Admin.
 *
 * Đây là lối vào phụ, nằm ngay trên nút tư vấn AI. Cố tình để kiểu nhẹ
 * (nền giấy, viền mực) thay vì gradient đậm như bản cũ: hai nút nổi cạnh nhau
 * cùng hét lên thì không nút nào còn là điểm nhấn.
 */
export default function CallBackFloating() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await leadApi.create({
        HoTen: v.HoTen,
        SoDienThoai: v.SoDienThoai,
        NoiDung: v.NoiDung || 'Yêu cầu gọi lại từ widget',
        Nguon: 'Web',
      });
      message.success('Đã ghi nhận — chúng tôi sẽ gọi lại cho bạn!');
      setOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Gửi yêu cầu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-quiet fixed bottom-24 right-6 z-40 !px-3.5 !py-2.5 !text-[12.5px]"
      >
        <PhoneOutlined /> Yêu cầu gọi lại
      </button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={submitting}
        okText="Gửi yêu cầu"
        title="Yêu cầu tư vấn gọi lại"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="HoTen"
            label="Họ và tên"
            rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="SoDienThoai"
            label="Số điện thoại"
            rules={[{ required: true, min: 8, message: 'Nhập SĐT' }]}
          >
            <Input placeholder="0912345678" />
          </Form.Item>
          <Form.Item name="NoiDung" label="Bạn quan tâm tour nào?">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
