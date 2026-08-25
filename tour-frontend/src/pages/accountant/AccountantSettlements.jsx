import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, LockOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import { settlementApi } from '../../api/http';
import { exportToExcel } from '../../utils/exportExcel';
import { fmtDate, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

const TRANG_THAI_QUYET_TOAN = {
  ChuaQuyetToan: { label: 'Chưa quyết toán', color: 'default' },
  ChoQuyetToan: { label: 'Đang quyết toán', color: 'gold' },
  DaKhoaSo: { label: 'Đã khóa sổ', color: 'green' },
};

/** Quyết toán đoàn tour (Tour P&L - lãi/lỗ theo chuyến). */
export default function AccountantSettlements() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const tamUng = Form.useWatch('TamUngHDV', form) || 0;
  const hdvChi = Form.useWatch('HDVChiThucTe', form) || 0;
  const chenh = Number(tamUng) - Number(hdvChi);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await settlementApi.list());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (r) => {
    setEditItem(r);
    form.resetFields();
    form.setFieldsValue({
      DoanhThuThucTe: r.DoanhThuThucTe || 0,
      ChiPhiXe: r.ChiPhiXe || 0,
      ChiPhiKhachSan: r.ChiPhiKhachSan || 0,
      ChiPhiAnUong: r.ChiPhiAnUong || 0,
      ChiPhiVe: r.ChiPhiVe || 0,
      ThuLaoHDV: r.ThuLaoHDV || 0,
      TamUngHDV: r.TamUngHDV || 0,
      HDVChiThucTe: r.HDVChiThucTe || 0,
      GhiChu: r.GhiChu,
    });
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editItem.MaQuyetToan > 0) {
        await settlementApi.update(editItem.MaQuyetToan, v);
      } else {
        await settlementApi.upsert({ MaLich: editItem.MaLich, ...v });
      }
      message.success('Đã lưu quyết toán');
      setEditItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const lock = async () => {
    try {
      await settlementApi.lock(editItem.MaQuyetToan);
      message.success('Đã khóa sổ tour');
      setEditItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Khóa sổ thất bại');
    }
  };

  const exportData = () =>
    exportToExcel(
      'quyet-toan-doan-tour',
      [
        { header: 'Mã lịch', key: 'MaLich' },
        { header: 'Tour', key: 'ten_tour' },
        { header: 'Ngày đi', getter: (r) => fmtDate(r.ngay_khoi_hanh) },
        { header: 'Ngày về', getter: (r) => fmtDate(r.ngay_ket_thuc) },
        { header: 'HDV', key: 'ten_hdv' },
        { header: 'Doanh thu', getter: (r) => Number(r.DoanhThuThucTe) },
        { header: 'Tổng chi phí', getter: (r) => Number(r.tong_chi_phi) },
        { header: 'Lợi nhuận gộp', getter: (r) => Number(r.loi_nhuan_gop) },
        { header: 'Tỷ suất LN (%)', key: 'ty_suat_ln' },
        { header: 'Trạng thái', getter: (r) => TRANG_THAI_QUYET_TOAN[r.TrangThai]?.label },
      ],
      rows.filter((r) => r.MaQuyetToan > 0),
    );

  const locked = editItem?.TrangThai === 'DaKhoaSo';

  const columns = [
    { title: 'Mã lịch', dataIndex: 'MaLich', width: 70 },
    { title: 'Tour', dataIndex: 'ten_tour', render: (v, r) => <div><div className="font-medium">{v}</div><Text type="secondary" className="text-xs">{r.ten_diem_den}</Text></div> },
    { title: 'Ngày đi - về', key: 'ngay', width: 150, render: (_, r) => `${fmtDate(r.ngay_khoi_hanh)} → ${fmtDate(r.ngay_ket_thuc)}` },
    { title: 'HDV', dataIndex: 'ten_hdv', width: 130, render: (v) => v || '—' },
    { title: 'Doanh thu', dataIndex: 'DoanhThuThucTe', render: (v) => fmtVND(v), width: 120 },
    { title: 'Tổng chi phí', dataIndex: 'tong_chi_phi', render: (v) => fmtVND(v), width: 120 },
    { title: 'Lợi nhuận gộp', dataIndex: 'loi_nhuan_gop', width: 130, render: (v) => <b className={Number(v) >= 0 ? 'text-green-600' : 'text-red-500'}>{fmtVND(v)}</b> },
    { title: 'Tỷ suất LN', dataIndex: 'ty_suat_ln', width: 90, render: (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`) },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 130,
      render: (v) => {
        const st = TRANG_THAI_QUYET_TOAN[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, r) => (
        <Button size="small" type={r.MaQuyetToan > 0 ? 'default' : 'primary'} onClick={() => openEdit(r)}>
          {r.MaQuyetToan > 0 ? 'Chi tiết' : 'Quyết toán'}
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card className="shadow-card" bordered={false}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Title level={3} className="!mb-1">
              <MoneyCollectOutlined /> Quyết toán đoàn tour
            </Title>
            <Text type="secondary">Lãi/lỗ theo từng chuyến đã hoàn thành (Tour P&L).</Text>
          </div>
          <Button icon={<DownloadOutlined />} onClick={exportData}>
            Xuất Excel
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spin size="large" /></div>
        ) : (
          <Table rowKey="MaLich" columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
        )}
      </Card>

      {/* Drawer chi tiết / quyết toán */}
      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        width={640}
        title={editItem ? `Quyết toán — ${editItem.ten_tour} (${fmtDate(editItem.ngay_khoi_hanh)})` : ''}
        footer={
          locked ? null : (
            <div className="flex justify-between">
              {editItem?.MaQuyetToan > 0 && (
                <Popconfirm title="Khóa sổ tour này? Sau khi khóa sẽ không sửa được." onConfirm={lock}>
                  <Button danger icon={<LockOutlined />}>Khóa sổ tour</Button>
                </Popconfirm>
              )}
              <Button type="primary" loading={saving} onClick={submit}>Lưu</Button>
            </div>
          )
        }
      >
        {locked && (
          <Tag color="green" className="mb-3">Đã khóa sổ — chỉ xem</Tag>
        )}
        <Form form={form} layout="vertical" disabled={locked}>
          <Descriptions bordered size="small" column={1} className="mb-4" items={[
            { key: 'tour', label: 'Tour', children: editItem?.ten_tour },
            { key: 'hdv', label: 'HDV phụ trách', children: editItem?.ten_hdv || '—' },
            { key: 'ngay', label: 'Ngày đi - về', children: editItem ? `${fmtDate(editItem.ngay_khoi_hanh)} → ${fmtDate(editItem.ngay_ket_thuc)}` : '' },
          ]} />

          <Title level={5}>Doanh thu & chi phí giá vốn</Title>
          <Form.Item name="DoanhThuThucTe" label="Doanh thu thực thu (₫)">
            <InputNumber className="w-full" min={0} step={100000} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="ChiPhiXe" label="Xe (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ChiPhiKhachSan" label="Khách sạn (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ChiPhiAnUong" label="Ăn uống (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ChiPhiVe" label="Vé (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ThuLaoHDV" label="Thù lao HDV (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
          </div>

          <Title level={5}>Tạm ứng / hoàn ứng HDV</Title>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="TamUngHDV" label="Tạm ứng trước tour (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="HDVChiThucTe" label="HDV chi thực tế (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
          </div>
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
            {chenh > 0 ? (
              <Text>HDV phải hoàn trả công ty: <b className="text-green-600">{fmtVND(chenh)}</b></Text>
            ) : chenh < 0 ? (
              <Text>Công ty chi bù cho HDV: <b className="text-red-500">{fmtVND(-chenh)}</b></Text>
            ) : (
              <Text type="secondary">Tạm ứng khớp với chi thực tế.</Text>
            )}
          </div>
          <Form.Item name="GhiChu" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
