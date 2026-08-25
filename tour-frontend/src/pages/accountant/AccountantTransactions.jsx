import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { AccountBookOutlined, DownloadOutlined } from '@ant-design/icons';
import { reportApi } from '../../api/http';
import { exportToExcel } from '../../utils/exportExcel';
import { fmtDateTime, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

const LOAI_GD = {
  Coc: { label: 'Cọc', color: 'blue' },
  ThanhToan: { label: 'Thanh toán', color: 'green' },
  HoanTien: { label: 'Hoàn tiền', color: 'red' },
  ChiPhi: { label: 'Chi phí', color: 'orange' },
};
const PHUONG_THUC = {
  TienMat: 'Tiền mặt',
  ChuyenKhoan: 'Chuyển khoản',
  The: 'Thẻ',
};

/** Sổ quỹ: lịch sử giao dịch thu (cọc/thanh toán) + chi (phiếu chi NCC). */
export default function AccountantTransactions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loai, setLoai] = useState(undefined);
  const [phuongThuc, setPhuongThuc] = useState(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (loai) params.loai_giao_dich = loai;
      if (phuongThuc) params.phuong_thuc = phuongThuc;
      setRows(await reportApi.transactions(params));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [loai, phuongThuc]);

  useEffect(() => {
    load();
  }, [load]);

  const tongThu = useMemo(
    () => rows.filter((r) => r.nguon === 'Thu').reduce((s, r) => s + Number(r.SoTien), 0),
    [rows],
  );
  const tongChi = useMemo(
    () => rows.filter((r) => r.nguon === 'Chi').reduce((s, r) => s + Math.abs(Number(r.SoTien)), 0),
    [rows],
  );

  const exportData = () =>
    exportToExcel(
      'so-quy',
      [
        { header: 'Mã GD', key: 'key' },
        { header: 'Nguồn', key: 'nguon' },
        { header: 'Loại', key: 'LoaiGiaoDich' },
        { header: 'Số tiền', getter: (r) => Number(r.SoTien) },
        { header: 'Phương thức', key: 'PhuongThuc' },
        { header: 'Khách/Đối tác', key: 'ten_khach_hang' },
        { header: 'Mã đơn', key: 'MaDatCho' },
        { header: 'Người xử lý', key: 'ten_nguoi_xu_ly' },
        { header: 'Thời gian', getter: (r) => fmtDateTime(r.NgayGiaoDich) },
      ],
      rows,
    );

  const columns = [
    { title: 'Mã GD', dataIndex: 'key', width: 90 },
    {
      title: 'Nguồn',
      dataIndex: 'nguon',
      width: 80,
      render: (v) => (v === 'Chi' ? <Tag color="orange">Chi</Tag> : <Tag color="blue">Thu</Tag>),
    },
    {
      title: 'Loại',
      dataIndex: 'LoaiGiaoDich',
      width: 110,
      render: (v) => {
        const l = LOAI_GD[v];
        return <Tag color={l?.color}>{l?.label || v}</Tag>;
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'SoTien',
      width: 150,
      render: (v, r) => (
        <b className={r.nguon === 'Chi' ? 'text-red-500' : 'text-green-600'}>
          {r.nguon === 'Chi' ? '-' : '+'}
          {fmtVND(Math.abs(Number(v)))}
        </b>
      ),
    },
    { title: 'Phương thức', dataIndex: 'PhuongThuc', width: 120, render: (v) => (v ? PHUONG_THUC[v] || v : '—') },
    { title: 'Khách / Đối tác', dataIndex: 'ten_khach_hang', render: (v) => v || '—' },
    { title: 'Mã đơn', dataIndex: 'MaDatCho', width: 80, render: (v) => v ?? '—' },
    { title: 'Người xử lý', dataIndex: 'ten_nguoi_xu_ly', width: 130, render: (v) => v || '—' },
    { title: 'Thời gian', dataIndex: 'NgayGiaoDich', width: 140, render: fmtDateTime },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card className="shadow-card" bordered={false}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Title level={3} className="!mb-1">
              <AccountBookOutlined /> Sổ quỹ / Giao dịch
            </Title>
            <Text type="secondary">Toàn bộ giao dịch thu (cọc, thanh toán, hoàn tiền) và chi (phiếu chi NCC).</Text>
          </div>
          <Button icon={<DownloadOutlined />} onClick={exportData}>Xuất Excel</Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            allowClear
            placeholder="Loại giao dịch"
            style={{ width: 160 }}
            value={loai}
            onChange={setLoai}
            options={Object.keys(LOAI_GD).map((k) => ({ value: k, label: LOAI_GD[k].label }))}
          />
          <Select
            allowClear
            placeholder="Phương thức"
            style={{ width: 160 }}
            value={phuongThuc}
            onChange={setPhuongThuc}
            options={Object.entries(PHUONG_THUC).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Space>
            <Text>Thu: <b className="text-green-600">{fmtVND(tongThu)}</b></Text>
            <Text>Chi: <b className="text-red-500">{fmtVND(tongChi)}</b></Text>
            <Text>Ròng: <b>{fmtVND(tongThu - tongChi)}</b></Text>
          </Space>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spin size="large" /></div>
        ) : (
          <Table rowKey="key" columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        )}
      </Card>
    </div>
  );
}
