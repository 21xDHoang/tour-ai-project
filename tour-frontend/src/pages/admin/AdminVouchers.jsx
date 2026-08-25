import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { voucherApi } from '../../api/http';
import { LOAI_GIAM, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

/** Quản lý mã giảm giá / Voucher (Admin - Tiếp thị). */
export default function AdminVouchers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await voucherApi.listAll());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await voucherApi.create({
        MaCode: v.MaCode,
        MoTa: v.MoTa || null,
        LoaiGiam: v.LoaiGiam,
        GiaTri: v.GiaTri,
        HanSuDung: dayjs(v.HanSuDung).format('YYYY-MM-DD'),
        SoLanToiDa: v.SoLanToiDa,
        TrangThai: v.TrangThai || 'Active',
      });
      message.success('Đã tạo mã giảm giá');
      setOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể tạo mã');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (r, active) => {
    try {
      await voucherApi.update(r.MaGiamGia, { TrangThai: active ? 'Active' : 'Expired' });
      message.success(active ? 'Đã kích hoạt mã' : 'Đã vô hiệu mã');
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'MaCode' },
    { title: 'Mô tả', dataIndex: 'MoTa', ellipsis: true },
    {
      title: 'Loại',
      dataIndex: 'LoaiGiam',
      width: 100,
      render: (v) => {
        const l = LOAI_GIAM[v];
        return <Tag color={l?.color}>{l?.label || v}</Tag>;
      },
    },
    {
      title: 'Giá trị',
      dataIndex: 'GiaTri',
      width: 130,
      render: (v, r) =>
        r.LoaiGiam === 'PhanTram' ? `${Number(v)}%` : fmtVND(v),
    },
    {
      title: 'Hạn dùng',
      dataIndex: 'HanSuDung',
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Lượt dùng',
      key: 'usage',
      width: 100,
      render: (_, r) => `${r.SoLanDaDung}/${r.SoLanToiDa}`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 100,
      render: (v) => (
        <Tag color={v === 'Active' ? 'green' : 'red'}>
          {v === 'Active' ? 'Hiệu lực' : 'Hết hạn'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, r) => (
        <Button
          size="small"
          onClick={() => toggleActive(r, r.TrangThai !== 'Active')}
        >
          {r.TrangThai === 'Active' ? 'Vô hiệu' : 'Kích hoạt'}
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            <WalletOutlined /> Mã giảm giá & Khuyến mãi
          </Title>
          <Text type="secondary">
            Tạo mã coupon theo % hoặc số tiền; mã Active sẽ hiển thị trên web khách.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Tạo mã
        </Button>
      </div>

      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="MaGiamGia"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={submitting}
        okText="Tạo mã"
        title="Tạo mã giảm giá mới"
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ LoaiGiam: 'PhanTram', SoLanToiDa: 1, TrangThai: 'Active' }}
        >
          <Form.Item name="MaCode" label="Mã code" rules={[{ required: true, message: 'Nhập mã' }]}>
            <Input placeholder="vd: HE2026" />
          </Form.Item>
          <Form.Item name="MoTa" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="LoaiGiam" label="Loại giảm" className="mr-2 w-1/3">
              <Select
                options={[
                  { value: 'PhanTram', label: 'Theo %' },
                  { value: 'Tien', label: 'Số tiền' },
                ]}
              />
            </Form.Item>
            <Form.Item name="GiaTri" label="Giá trị" className="mr-2 flex-1" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} />
            </Form.Item>
            <Form.Item name="SoLanToiDa" label="Lượt tối đa" className="flex-1">
              <InputNumber className="w-full" min={1} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="HanSuDung" label="Hạn dùng" className="mr-2 flex-1" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="TrangThai" label="Trạng thái" className="flex-1">
              <Select
                options={[
                  { value: 'Active', label: 'Hiệu lực' },
                  { value: 'Expired', label: 'Hết hạn' },
                ]}
              />
            </Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </div>
  );
}
