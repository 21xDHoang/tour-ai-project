import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, Row, Typography, message } from 'antd';
import { CustomerServiceOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { leadApi } from '../api/http';

const { Title, Text } = Typography;

/** Trang Liên hệ: thông tin công ty + form yêu cầu gọi lại (tạo Lead). */
export default function LienHe() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await leadApi.create({
        HoTen: v.HoTen,
        SoDienThoai: v.SoDienThoai,
        Email: v.Email || null,
        NoiDung: v.NoiDung || 'Yêu cầu tư vấn từ trang Liên hệ',
        Nguon: 'Web',
      });
      setDone(true);
      form.resetFields();
      message.success('Đã ghi nhận yêu cầu — chúng tôi sẽ gọi lại cho bạn!');
    } catch (err) {
      message.error(err.response?.data?.detail || 'Gửi yêu cầu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 text-center">
        <Title level={2} className="!mb-1">
          <CustomerServiceOutlined className="mr-1 text-indigo-600" /> Liên hệ
        </Title>
        <Text type="secondary">
          Cần hỗ trợ? Để lại số điện thoại, tư vấn viên sẽ gọi lại trong giờ hành chính.
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={10}>
          <Card className="h-full shadow-card" bordered={false}>
            <Title level={4}>Công ty TourAI</Title>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-center gap-2">
                <PhoneOutlined className="text-indigo-600" />
                Hotline: 1900 1234 (8:00–21:00)
              </li>
              <li className="flex items-center gap-2">
                <MailOutlined className="text-indigo-600" />
                Email: support@tour.ai
              </li>
              <li className="flex items-center gap-2">
                <CustomerServiceOutlined className="text-indigo-600" />
                Chat AI 24/7 ở góc phải màn hình
              </li>
            </ul>
            <Alert
              className="mt-4"
              type="info"
              showIcon
              message="Mọi yêu cầu từ web đều được ghi nhận thành Lead và chuyển cho tư vấn viên xử lý."
            />
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card className="shadow-card" bordered={false}>
            {done && (
              <Alert
                className="mb-4"
                type="success"
                showIcon
                message="Cảm ơn bạn! Chúng tôi đã ghi nhận yêu cầu gọi lại."
                closable
                onClose={() => setDone(false)}
              />
            )}
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
              <Form.Item name="Email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="NoiDung" label="Nội dung cần tư vấn">
                <Input.TextArea rows={3} placeholder="Bạn quan tâm tour nào?" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting} onClick={submit}>
                Yêu cầu gọi lại
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
