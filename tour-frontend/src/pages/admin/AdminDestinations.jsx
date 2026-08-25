import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { tourApi } from '../../api/http';

const { Title, Text } = Typography;

const KHU_VUC = ['Mien Bac', 'Mien Trung', 'Mien Nam', 'Tay Nguyen', 'Mien Tay'];

/** Danh mục điểm đến (Admin): thêm mới, sửa tên/khu vực/mô tả. */
export default function AdminDestinations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await tourApi.destinations());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      TenDiemDen: row.TenDiemDen,
      KhuVuc: row.KhuVuc,
      MoTa: row.MoTa,
    });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = { TenDiemDen: v.TenDiemDen, KhuVuc: v.KhuVuc || null, MoTa: v.MoTa || null };
      if (editing) {
        await tourApi.updateDestination(editing.MaDiemDen, payload);
        message.success('Đã cập nhật điểm đến');
      } else {
        await tourApi.createDestination(payload);
        message.success('Đã thêm điểm đến mới');
      }
      setOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'MaDiemDen', width: 80 },
    {
      title: 'Điểm đến',
      dataIndex: 'TenDiemDen',
      render: (v) => (
        <span>
          <EnvironmentOutlined className="mr-1 text-red-500" />
          <b>{v}</b>
        </span>
      ),
    },
    {
      title: 'Khu vực',
      dataIndex: 'KhuVuc',
      render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : '—'),
    },
    { title: 'Mô tả', dataIndex: 'MoTa', ellipsis: true },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      render: (_, row) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEdit(row)}
        >
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Title level={3} className="!mb-1">
            <EnvironmentOutlined /> Danh mục điểm đến
          </Title>
          <Text type="secondary">
            Quản lý danh mục điểm đến — các điểm đến này sẽ hiển thị trong form
            thêm tour mới.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Thêm điểm đến
        </Button>
      </div>

      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table rowKey="MaDiemDen" columns={columns} dataSource={rows} />
        )}
      </Card>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={submitting}
        okText={editing ? 'Lưu thay đổi' : 'Thêm điểm đến'}
        cancelText="Hủy"
        title={editing ? `Sửa điểm đến #${editing.MaDiemDen}` : 'Thêm điểm đến mới'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="TenDiemDen"
            label="Tên điểm đến"
            rules={[{ required: true, min: 2, message: 'Nhập tên điểm đến' }]}
          >
            <Input placeholder="vd: Da Nang, Sapa, Nha Trang..." />
          </Form.Item>
          <Form.Item name="KhuVuc" label="Khu vực">
            <Select
              placeholder="Chọn khu vực"
              allowClear
              options={KHU_VUC.map((k) => ({ value: k, label: k }))}
            />
          </Form.Item>
          <Form.Item name="MoTa" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
