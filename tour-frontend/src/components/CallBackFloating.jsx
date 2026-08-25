import { useState } from 'react';
import { Button, Form, Input, Modal, message } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { leadApi } from '../api/http';

/**
 * Nút nổi "Yêu cầu gọi lại" cho web khách hàng.
 * Form tạo Lead (Nguon=Web) — tư vấn viên sẽ thấy trên Kanban/Admin.
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
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
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
