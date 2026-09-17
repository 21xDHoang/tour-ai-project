import { useCallback, useEffect, useState } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { camNangApi } from '../../api/http';
import { DANH_MUC_CAM_NANG, TRANG_THAI_BAI_VIET, fmtDateTime } from '../../utils/format';
import { baiVietPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

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
    {
      title: 'Tiêu đề',
      dataIndex: 'TieuDe',
      width: 300,
      ellipsis: true,
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    {
      title: 'Danh mục',
      dataIndex: 'DanhMuc',
      width: 170,
      render: (v) => DANH_MUC_CAM_NANG[v] || v,
    },
    {
      title: 'Ảnh',
      dataIndex: 'HinhAnhURL',
      width: 74,
      align: 'center',
      render: (v) =>
        v ? (
          <img src={v} alt="" className="h-9 w-12 rounded-sign object-cover" />
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 108,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${baiVietPill(v)}`}>
          {TRANG_THAI_BAI_VIET[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'NgayTao',
      width: 148,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDateTime(v)}</span>,
    },
    {
      // Ghim phải: cột thao tác là cột duy nhất phải luôn nhìn thấy khi bảng
      // cuộn ngang, vì nó chứa việc người dùng vào đây để làm.
      title: 'Thao tác',
      key: 'action',
      width: 176,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac
          chinh={{ nhan: 'Sửa', icon: <EditOutlined />, onClick: () => openEdit(r) }}
          khac={[
            {
              nhan: 'Xóa',
              icon: <DeleteOutlined />,
              xacNhan: 'Xóa bài viết này?',
              onClick: () => remove(r),
            },
          ]}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} bài`}
        title="Cẩm nang du lịch"
        description="Thêm/sửa bài viết; bài ở trạng thái Hiển thị sẽ xuất hiện ngay trên web khách."
        action={
          <button type="button" className="btn btn-ink" onClick={openCreate}>
            <PlusOutlined /> Thêm bài viết
          </button>
        }
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaBaiViet"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có bài viết nào',
            description: 'Bài đầu tiên sẽ hiện trên web khách ngay khi được đặt ở trạng thái Hiển thị.',
          }}
        />
      </div>

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
