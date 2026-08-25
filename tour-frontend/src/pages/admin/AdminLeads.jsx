import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { CustomerServiceOutlined, EditOutlined } from '@ant-design/icons';
import { adminApi, leadApi } from '../../api/http';
import { TRANG_THAI_LEAD, fmtDateTime } from '../../utils/format';

const { Title, Text } = Typography;

const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_LEAD).map((k) => ({
  value: k,
  label: TRANG_THAI_LEAD[k].label,
}));

/** Quản lý Lead & yêu cầu tư vấn (Admin - CRM). */
export default function AdminLeads() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ls, us] = await Promise.all([leadApi.list(), adminApi.users()]);
      setRows(ls);
      setUsers(us);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const consultantOptions = users
    .filter((u) => ['Consultant', 'Admin'].includes(u.VaiTro))
    .map((u) => ({ value: u.MaNguoiDung, label: `${u.HoTen} (${u.VaiTro})` }));

  const data = useMemo(
    () => (filter ? rows.filter((r) => r.TrangThai === filter) : rows),
    [rows, filter],
  );

  const openEdit = (r) => {
    form.resetFields();
    form.setFieldsValue({
      TrangThai: r.TrangThai,
      NguoiPhuTrachID: r.NguoiPhuTrachID ?? undefined,
    });
    setEditItem(r);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await leadApi.update(editItem.MaYeuCau, {
        TrangThai: v.TrangThai,
        NguoiPhuTrachID: v.NguoiPhuTrachID ?? null,
      });
      message.success(`Đã cập nhật lead của ${editItem.HoTen}`);
      setEditItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Khách', dataIndex: 'HoTen' },
    { title: 'SĐT', dataIndex: 'SoDienThoai' },
    { title: 'Email', dataIndex: 'Email', render: (v) => v || '—' },
    {
      title: 'Quan tâm',
      dataIndex: 'TourQuanTam',
      render: (v) => v || '—',
    },
    { title: 'Nguồn', dataIndex: 'Nguon', width: 90 },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_LEAD[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Phụ trách',
      dataIndex: 'ten_nguoi_phu_trach',
      render: (v) => v || <Text type="secondary">Chưa gán</Text>,
    },
    { title: 'Ngày tạo', dataIndex: 'NgayTao', render: fmtDateTime, width: 140 },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      render: (_, r) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            <CustomerServiceOutlined /> Lead & yêu cầu tư vấn
          </Title>
          <Text type="secondary">
            Theo dõi phễu chuyển đổi từ Web, Chatbot, Fanpage, Zalo, Hotline.
          </Text>
        </div>
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          style={{ width: 180 }}
          options={TRANG_THAI_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="MaYeuCau"
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      <Modal
        open={!!editItem}
        onCancel={() => setEditItem(null)}
        onOk={submit}
        confirmLoading={submitting}
        okText="Lưu"
        title={`Cập nhật lead — ${editItem?.HoTen}`}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="TrangThai" label="Trạng thái">
            <Select options={TRANG_THAI_OPTIONS} />
          </Form.Item>
          <Form.Item name="NguoiPhuTrachID" label="Người phụ trách">
            <Select
              allowClear
              placeholder="Chọn tư vấn viên"
              options={consultantOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
