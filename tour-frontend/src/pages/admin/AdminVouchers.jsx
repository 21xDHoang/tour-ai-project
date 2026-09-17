import { useCallback, useEffect, useState } from 'react';
import {
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { voucherApi } from '../../api/http';
import { LOAI_GIAM, fmtVND } from '../../utils/format';
import { batTatPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

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
    {
      title: 'Mã',
      dataIndex: 'MaCode',
      width: 118,
      render: (v) => <span className="tnum font-semibold text-ink-950">{v}</span>,
    },
    { title: 'Mô tả', dataIndex: 'MoTa', width: 200, ellipsis: true },
    {
      // Hình thức giảm giá là một lựa chọn, không phải mức ưu tiên — chữ nói đủ,
      // không cần tô màu.
      title: 'Loại',
      dataIndex: 'LoaiGiam',
      width: 104,
      render: (v) => LOAI_GIAM[v]?.label || v,
    },
    {
      title: 'Giá trị',
      dataIndex: 'GiaTri',
      width: 124,
      align: 'right',
      render: (v, r) => (
        <span className="tnum font-semibold text-ink-950">
          {r.LoaiGiam === 'PhanTram' ? `${Number(v)}%` : fmtVND(v)}
        </span>
      ),
    },
    {
      title: 'Hạn dùng',
      dataIndex: 'HanSuDung',
      width: 118,
      render: (v) => <span className="tnum whitespace-nowrap">{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: 'Lượt dùng',
      key: 'usage',
      width: 104,
      align: 'right',
      render: (_, r) => (
        <span className="tnum">
          {r.SoLanDaDung}/{r.SoLanToiDa}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 112,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${batTatPill(v)}`}>
          {v === 'Active' ? 'Hiệu lực' : 'Hết hạn'}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 122,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac
          chinh={{
            nhan: r.TrangThai === 'Active' ? 'Vô hiệu' : 'Kích hoạt',
            icon: r.TrangThai === 'Active' ? <StopOutlined /> : <CheckCircleOutlined />,
            onClick: () => toggleActive(r, r.TrangThai !== 'Active'),
          }}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} mã`}
        title="Mã giảm giá & Khuyến mãi"
        description="Tạo mã coupon theo % hoặc số tiền; mã Active sẽ hiển thị trên web khách."
        action={
          <button type="button" className="btn btn-ink" onClick={() => setOpen(true)}>
            <PlusOutlined /> Tạo mã
          </button>
        }
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaGiamGia"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có mã giảm giá nào',
            description: 'Mã tạo ở đây ở trạng thái Hiệu lực sẽ hiện trên web khách.',
          }}
        />
      </div>

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
