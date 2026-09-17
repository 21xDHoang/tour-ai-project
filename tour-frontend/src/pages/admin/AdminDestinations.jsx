import { useCallback, useEffect, useState } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { tourApi } from '../../api/http';
import { KHU_VUC_OPTIONS, khuVucLabel } from '../../utils/format';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

/** Danh mục điểm đến (Admin): thêm mới, sửa, xóa có ràng buộc. */
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
      const d = err.response?.data?.detail;
      message.error(Array.isArray(d) ? 'Dữ liệu không hợp lệ' : (d || 'Thao tác thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      await tourApi.deleteDestination(row.MaDiemDen);
      message.success('Đã xóa điểm đến');
      load();
    } catch (err) {
      const d = err.response?.data?.detail;
      message.error(Array.isArray(d) ? 'Không thể xóa điểm đến' : (d || 'Xóa điểm đến thất bại'));
    }
  };

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'MaDiemDen',
      width: 70,
      render: (v) => <span className="tnum text-ink-600">#{v}</span>,
    },
    {
      // Bỏ chiếc ghim đỏ cũ: một điểm đến không phải là cảnh báo, và đỏ trong
      // bảng màu này để dành cho việc đã hỏng.
      title: 'Điểm đến',
      dataIndex: 'TenDiemDen',
      width: 180,
      ellipsis: true,
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    {
      title: 'Khu vực',
      dataIndex: 'KhuVuc',
      width: 122,
      render: (v) => (v ? khuVucLabel(v) : '—'),
    },
    {
      title: 'Số tour',
      dataIndex: 'SoLuongTour',
      width: 88,
      align: 'right',
      render: (v) => <span className="tnum">{v ?? 0}</span>,
    },
    { title: 'Mô tả', dataIndex: 'MoTa', width: 220, ellipsis: true },
    {
      title: 'Thao tác',
      key: 'action',
      width: 178,
      fixed: 'right',
      render: (_, row) => (
        <HangThaoTac
          chinh={{ nhan: 'Sửa', icon: <EditOutlined />, onClick: () => openEdit(row) }}
          khac={[
            {
              nhan: 'Xóa',
              icon: <DeleteOutlined />,
              // Điểm đến đang có tour dùng thì nút Xóa bị vô hiệu — và nút vô
              // hiệu im lặng là ngõ cụt, nên lý do đi kèm ngay trong tooltip.
              disabled: row.SoLuongTour > 0,
              disabledReason: `Có ${row.SoLuongTour} tour đang dùng điểm đến này — không xóa được.`,
              xacNhan: 'Xóa điểm đến này? Thao tác không thể hoàn tác.',
              onClick: () => handleDelete(row),
            },
          ]}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader
        marker={loading ? null : `${rows.length} điểm đến`}
        title="Danh mục điểm đến"
        description="Quản lý danh mục điểm đến — các điểm đến này sẽ hiển thị trong form thêm tour mới."
        action={
          <button type="button" className="btn btn-ink" onClick={openAdd}>
            <PlusOutlined /> Thêm điểm đến
          </button>
        }
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaDiemDen"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có điểm đến nào',
            description: 'Thêm điểm đến trước, rồi chọn nó khi tạo tour mới.',
          }}
        />
      </div>

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
              options={KHU_VUC_OPTIONS}
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
