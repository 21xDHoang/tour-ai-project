import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EditOutlined, PlusOutlined, ReadOutlined } from '@ant-design/icons';
import { camNangApi } from '../../api/http';
import { DANH_MUC_CAM_NANG, TRANG_THAI_BAI_VIET, fmtDateTime } from '../../utils/format';

const { Title, Text } = Typography;

const DANH_MUC_OPTIONS = Object.keys(DANH_MUC_CAM_NANG).map((k) => ({
  value: k,
  label: DANH_MUC_CAM_NANG[k],
}));
const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_BAI_VIET).map((k) => ({
  value: k,
  label: TRANG_THAI_BAI_VIET[k].label,
}));

/** Quản lý bài viết Cẩm nang du lịch (Admin - CMS). */
export default function AdminCamNang() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await camNangApi.listAll());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    form.setFieldsValue({ DanhMuc: 'Chung', TrangThai: 'Hien' });
    setOpen(true);
  };

  const openEdit = (r) => {
    setEditItem(r);
    form.resetFields();
    form.setFieldsValue({
      TieuDe: r.TieuDe,
      MoTaNgan: r.MoTaNgan,
      NoiDung: r.NoiDung,
      HinhAnhURL: r.HinhAnhURL,
      DanhMuc: r.DanhMuc,
      TrangThai: r.TrangThai,
    });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    const payload = {
      TieuDe: v.TieuDe,
      MoTaNgan: v.MoTaNgan || null,
      NoiDung: v.NoiDung,
      HinhAnhURL: v.HinhAnhURL || null,
      DanhMuc: v.DanhMuc,
      TrangThai: v.TrangThai,
    };
    try {
      if (editItem) {
        await camNangApi.update(editItem.MaBaiViet, payload);
        message.success('Đã cập nhật bài viết');
      } else {
        await camNangApi.create(payload);
        message.success('Đã tạo bài viết');
      }
      setOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lưu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (r) => {
    try {
      await camNangApi.remove(r.MaBaiViet);
      message.success('Đã xóa bài viết');
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Xóa thất bại');
    }
  };

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'TieuDe', ellipsis: true },
    {
      title: 'Danh mục',
      dataIndex: 'DanhMuc',
      width: 180,
      render: (v) => DANH_MUC_CAM_NANG[v] || v,
    },
    {
      title: 'Hình ảnh',
      dataIndex: 'HinhAnhURL',
      width: 90,
      align: 'center',
      render: (v) =>
        v ? (
          <img src={v} alt="" className="h-10 w-14 rounded object-cover" />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 100,
      render: (v) => {
        const st = TRANG_THAI_BAI_VIET[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'NgayTao',
      width: 140,
      render: fmtDateTime,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Sửa
          </Button>
          <Popconfirm title="Xóa bài viết này?" onConfirm={() => remove(r)}>
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            <ReadOutlined /> Cẩm nang du lịch
          </Title>
          <Text type="secondary">
            Thêm/sửa bài viết; bài ở trạng thái Hiển thị sẽ xuất hiện ngay trên web khách.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm bài viết
        </Button>
      </div>

      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="MaBaiViet"
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
        okText="Lưu"
        title={editItem ? 'Sửa bài viết' : 'Thêm bài viết'}
        width={680}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="TieuDe"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Nhập tiêu đề' }]}
          >
            <Input placeholder="vd: Kinh nghiệm du lịch Đà Lạt tự túc" />
          </Form.Item>
          <Form.Item name="MoTaNgan" label="Mô tả ngắn">
            <Input placeholder="Một câu giới thiệu ngắn gọn" />
          </Form.Item>
          <div className="flex flex-wrap gap-3">
            <Form.Item name="DanhMuc" label="Danh mục" className="w-56">
              <Select options={DANH_MUC_OPTIONS} />
            </Form.Item>
            <Form.Item name="TrangThai" label="Trạng thái" className="w-40">
              <Select options={TRANG_THAI_OPTIONS} />
            </Form.Item>
          </div>
          <Form.Item name="HinhAnhURL" label="Hình ảnh (URL)">
            <Input placeholder="Dán URL ảnh minh họa (không bắt buộc)" />
          </Form.Item>
          <Form.Item
            name="NoiDung"
            label="Nội dung"
            rules={[{ required: true, message: 'Nhập nội dung' }]}
            extra="Mỗi dòng bắt đầu bằng '- ' là gạch đầu dòng; '1. ' là bước đánh số."
          >
            <Input.TextArea rows={8} placeholder={'- Ý thứ nhất\n- Ý thứ hai'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
