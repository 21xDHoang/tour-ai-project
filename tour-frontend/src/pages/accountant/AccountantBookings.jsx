import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  EyeOutlined,
  MoneyCollectOutlined,
  SearchOutlined,
  ShopOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingApi, payableApi, paymentApi, reportApi } from '../../api/http';
import CountdownTimer from '../../components/CountdownTimer';
import {
  TRANG_THAI_DAT_CHO,
  fmtDate,
  fmtDateTime,
  fmtVND,
} from '../../utils/format';

const TRANG_THAI_NCC = {
  ChuaTra: { label: 'Chưa trả', color: 'red' },
  TraMotPhan: { label: 'Trả một phần', color: 'gold' },
  DaTatToan: { label: 'Đã tất toán', color: 'green' },
};

const { Title, Text } = Typography;

const PHUONG_THUC = [
  { value: 'TienMat', label: 'Tiền mặt' },
  { value: 'ChuyenKhoan', label: 'Chuyển khoản' },
  { value: 'The', label: 'Thẻ' },
];

/** Tính trước mức phạt & tiền hoàn khi hủy (DR-04). */
function cancelPreview(booking) {
  const days = dayjs(booking.ngay_khoi_hanh)
    .startOf('day')
    .diff(dayjs().startOf('day'), 'day');
  let mucPhat = 1.0;
  let hoanRate = 0.0;
  let label = 'Phạt 100% cọc (hủy dưới 3 ngày)';
  if (days >= 7) {
    mucPhat = 0.0;
    hoanRate = 1.0;
    label = 'Hoàn 100% cọc (hủy ≥ 7 ngày)';
  } else if (days >= 3) {
    mucPhat = 0.5;
    hoanRate = 0.5;
    label = 'Phạt 50% cọc (hủy 3–6 ngày)';
  }
  const soTienHoan =
    Math.round(Number(booking.DaDatCoc) * hoanRate * 100) / 100;
  return { days, mucPhat, soTienHoan, label };
}

export default function AccountantBookings() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(
    location.state?.tab === 'cancel' ? 'cancel' : 'finance',
  );

  // Lọc & tìm kiếm
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [searchText, setSearchText] = useState('');

  // Chi tiết đơn
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailTxns, setDetailTxns] = useState([]);

  // Tổng tiền đã hoàn (từ giao dịch HoanTien)
  const [hoanTotal, setHoanTotal] = useState(0);

  // Công nợ nhà cung cấp
  const [payables, setPayables] = useState([]);
  const [payableLoading, setPayableLoading] = useState(false);
  const [payableOpen, setPayableOpen] = useState(false);
  const [payableSubmitting, setPayableSubmitting] = useState(false);
  const [payableForm] = Form.useForm();
  const [payItem, setPayItem] = useState(null);
  const [payForm] = Form.useForm();

  // Modal cọc
  const [depositItem, setDepositItem] = useState(null);
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositForm] = Form.useForm();

  // Modal thanh toán đủ
  const [fullItem, setFullItem] = useState(null);
  const [fullSubmitting, setFullSubmitting] = useState(false);
  const [fullForm] = Form.useForm();

  // Modal hủy tour
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await bookingApi.listAll());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
    try {
      const txns = await reportApi.transactions({ loai_giao_dich: 'HoanTien' });
      setHoanTotal(txns.reduce((s, t) => s + Number(t.SoTien), 0));
    } catch {
      setHoanTotal(0);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadPayables = useCallback(async () => {
    setPayableLoading(true);
    try {
      setPayables(await payableApi.list());
    } catch {
      setPayables([]);
    } finally {
      setPayableLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayables();
  }, [loadPayables]);

  const submitPayable = async () => {
    const v = await payableForm.validateFields();
    setPayableSubmitting(true);
    try {
      await payableApi.create({
        TenDoiTac: v.TenDoiTac,
        DichVu: v.DichVu,
        TongTien: v.TongTien,
        HanThanhToan: v.HanThanhToan ? dayjs(v.HanThanhToan).format('YYYY-MM-DD') : null,
        GhiChu: v.GhiChu || null,
      });
      message.success('Đã thêm khoản nợ nhà cung cấp');
      setPayableOpen(false);
      payableForm.resetFields();
      loadPayables();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Thêm khoản nợ thất bại');
    } finally {
      setPayableSubmitting(false);
    }
  };

  const submitPay = async () => {
    const v = await payForm.validateFields();
    try {
      await payableApi.pay(payItem.MaPhaiTra, {
        SoTien: v.SoTien,
        GhiChu: v.GhiChu || null,
      });
      message.success('Đã lập phiếu chi thanh toán');
      setPayItem(null);
      payForm.resetFields();
      loadPayables();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lập phiếu chi thất bại');
    }
  };

  const openDetail = async (r) => {
    setDetailItem(r);
    setDetailLoading(true);
    setDetailData(null);
    setDetailTxns([]);
    try {
      const [d, txns] = await Promise.all([
        bookingApi.detail(r.MaDatCho),
        reportApi.transactions({ ma_dat_cho: r.MaDatCho }),
      ]);
      setDetailData(d);
      setDetailTxns(txns);
    } catch {
      setDetailData(null);
      setDetailTxns([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const cocToiThieuOf = (r) => Math.round(Number(r.TongTien) * 0.3 * 100) / 100;
  const conThieu = (r) =>
    Math.max(0, Number(r.TongTien) - Number(r.DaDatCoc));

  const openDeposit = (r) => {
    setDepositItem(r);
    depositForm.resetFields();
    depositForm.setFieldsValue({ SoTien: cocToiThieuOf(r), PhuongThuc: 'TienMat' });
  };

  const submitDeposit = async () => {
    const v = await depositForm.validateFields();
    const min = cocToiThieuOf(depositItem);
    if (Number(v.SoTien) < min) {
      message.error(`Cọc phải ≥ 30% tổng giá trị: tối thiểu ${fmtVND(min)} (DR-03)`);
      return;
    }
    setDepositSubmitting(true);
    try {
      const res = await paymentApi.deposit({
        MaDatCho: depositItem.MaDatCho,
        SoTien: v.SoTien,
        PhuongThuc: v.PhuongThuc,
      });
      message.success(`Đơn #${res.MaDatCho} → ${TRANG_THAI_DAT_CHO[res.TrangThai]?.label}`);
      setDepositItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Xác nhận cọc thất bại');
    } finally {
      setDepositSubmitting(false);
    }
  };

  const openFull = (r) => {
    setFullItem(r);
    fullForm.resetFields();
    fullForm.setFieldsValue({ SoTien: conThieu(r), PhuongThuc: 'ChuyenKhoan' });
  };

  const submitFull = async () => {
    const v = await fullForm.validateFields();
    setFullSubmitting(true);
    try {
      const res = await paymentApi.fullPayment({
        MaDatCho: fullItem.MaDatCho,
        SoTien: v.SoTien,
        PhuongThuc: v.PhuongThuc,
      });
      message.success(`Đơn #${res.MaDatCho} đã thanh toán đủ`);
      setFullItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Thanh toán thất bại');
    } finally {
      setFullSubmitting(false);
    }
  };

  const openCancel = (r) => {
    setCancelItem(r);
    cancelForm.resetFields();
  };

  const submitCancel = async () => {
    const v = await cancelForm.validateFields();
    setCancelSubmitting(true);
    try {
      const res = await paymentApi.cancel({
        MaDatCho: cancelItem.MaDatCho,
        LyDo: v.LyDo,
      });
      message.success(
        `Đã hủy đơn #${res.MaDatCho} · hoàn ${fmtVND(res.SoTienHoan)}`,
      );
      setCancelItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Hủy tour thất bại');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const preview = cancelItem ? cancelPreview(cancelItem) : null;

  // Lọc + tìm kiếm
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatus && r.TrangThai !== filterStatus) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const hit =
          String(r.ten_khach_hang || '').toLowerCase().includes(q) ||
          String(r.ten_tour || '').toLowerCase().includes(q) ||
          String(r.MaDatCho).includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, filterStatus, searchText]);

  const tongDaThu = useMemo(
    () => rows.reduce((s, r) => s + Number(r.DaDatCoc), 0),
    [rows],
  );
  const tongCongNo = useMemo(
    () =>
      rows
        .filter((r) => r.TrangThai === 'DaCoc')
        .reduce((s, r) => s + (Number(r.TongTien) - Number(r.DaDatCoc)), 0),
    [rows],
  );

  const columns = useMemo(
    () => [
      { title: 'Mã đơn', dataIndex: 'MaDatCho', width: 80 },
      {
        title: 'Khách hàng',
        dataIndex: 'ten_khach_hang',
      },
      {
        title: 'Tour',
        dataIndex: 'ten_tour',
        render: (v, r) => (
          <div>
            <div className="font-medium">{v}</div>
            <Text type="secondary" className="text-xs">
              {r.ten_diem_den} · khởi hành {fmtDate(r.ngay_khoi_hanh)}
            </Text>
          </div>
        ),
      },
      { title: 'Số khách', dataIndex: 'SoKhach', width: 80, align: 'center' },
      {
        title: 'Tổng tiền',
        dataIndex: 'TongTien',
        render: (v) => <b>{fmtVND(v)}</b>,
      },
      {
        title: 'Đã cọc',
        dataIndex: 'DaDatCoc',
        render: (v) => fmtVND(v),
      },
      {
        title: 'Còn thiếu',
        key: 'conThieu',
        render: (_, r) => {
          const shortage = conThieu(r);
          return shortage > 0 ? (
            <Text className="font-medium text-orange-500">{fmtVND(shortage)}</Text>
          ) : (
            <Tag color="green">Đủ</Tag>
          );
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'TrangThai',
        render: (v, r) => {
          const st = TRANG_THAI_DAT_CHO[v];
          return (
            <Space direction="vertical" size={0}>
              <Tag color={st?.color}>{st?.label || v}</Tag>
              {v === 'GiuCho' && (
                <CountdownTimer hanGiuCho={r.HanGiuCho} />
              )}
            </Space>
          );
        },
      },
      {
        title: 'Thao tác',
        key: 'action',
        width: 260,
        render: (_, r) => {
          const canDeposit = ['GiuCho', 'ChoCoc'].includes(r.TrangThai);
          const canFull = r.TrangThai === 'DaCoc';
          const canCancel = !['DaHuy', 'DaThanhToan'].includes(r.TrangThai);
          return (
            <Space wrap>
              <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>
                Chi tiết
              </Button>
              {canDeposit && (
                <Button size="small" icon={<WalletOutlined />} onClick={() => openDeposit(r)}>
                  Xác nhận cọc
                </Button>
              )}
              {canFull && (
                <Button size="small" icon={<MoneyCollectOutlined />} onClick={() => openFull(r)}>
                  Thanh toán đủ
                </Button>
              )}
              {canCancel && (
                <Button size="small" danger icon={<CalendarOutlined />} onClick={() => openCancel(r)}>
                  Xử lý hủy
                </Button>
              )}
            </Space>
          );
        },
      },
    ],
    [],
  );

  const payableColumns = [
    { title: 'Đối tác', dataIndex: 'TenDoiTac' },
    { title: 'Dịch vụ', dataIndex: 'DichVu' },
    { title: 'Tổng tiền', dataIndex: 'TongTien', render: fmtVND, width: 130 },
    { title: 'Đã trả', dataIndex: 'DaThanhToan', render: fmtVND, width: 120 },
    { title: 'Còn nợ', dataIndex: 'con_no', width: 120, render: (v) => <b className="text-orange-500">{fmtVND(v)}</b> },
    { title: 'Hạn thanh toán', dataIndex: 'HanThanhToan', render: fmtDate, width: 120 },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 120,
      render: (v) => {
        const st = TRANG_THAI_NCC[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (_, r) =>
        Number(r.con_no) > 0 ? (
          <Button
            size="small"
            onClick={() => {
              payForm.resetFields();
              setPayItem(r);
            }}
          >
            Lập phiếu chi
          </Button>
        ) : null,
    },
  ];

  const items = [
    {
      key: 'finance',
      label: (
        <span>
          <WalletOutlined /> Quản lý cọc &amp; công nợ
        </span>
      ),
      children: (
        <Table
          rowKey="MaDatCho"
          columns={columns}
          dataSource={filteredRows}
          pagination={{ pageSize: 8 }}
          loading={loading}
          scroll={{ x: 1100 }}
        />
      ),
    },
    {
      key: 'cancel',
      label: (
        <span>
          <CalendarOutlined /> Xử lý hủy tour
        </span>
      ),
      children: (
        <div>
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message="Chính sách phạt (DR-04): hủy ≥ 7 ngày hoàn 100% cọc · 3–6 ngày phạt 50% cọc · dưới 3 ngày phạt 100% cọc."
          />
          <Table
            rowKey="MaDatCho"
            columns={columns}
            dataSource={filteredRows.filter((r) => !['DaHuy', 'DaThanhToan'].includes(r.TrangThai))}
            pagination={{ pageSize: 8 }}
            loading={loading}
            scroll={{ x: 1100 }}
          />
        </div>
      ),
    },
    {
      key: 'payable',
      label: (
        <span>
          <ShopOutlined /> Công nợ Nhà cung cấp
        </span>
      ),
      children: (
        <div>
          <div className="mb-3 flex justify-end">
            <Button
              type="primary"
              icon={<ShopOutlined />}
              onClick={() => {
                payableForm.resetFields();
                setPayableOpen(true);
              }}
            >
              Thêm khoản nợ
            </Button>
          </div>
          <Table
            rowKey="MaPhaiTra"
            columns={payableColumns}
            dataSource={payables}
            pagination={{ pageSize: 8 }}
            loading={payableLoading}
            scroll={{ x: 900 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card className="shadow-card" bordered={false}>
        <div className="mb-2">
          <Title level={3} className="!mb-1">
            💰 Phân hệ Kế toán
          </Title>
          <Text type="secondary">
            Xác nhận cọc ≥ 30% (DR-03), thanh toán phần còn lại và xử lý hủy
            tour theo mốc phạt (DR-04).
          </Text>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            allowClear
            placeholder="Lọc trạng thái"
            style={{ width: 180 }}
            value={filterStatus}
            onChange={setFilterStatus}
            options={Object.keys(TRANG_THAI_DAT_CHO).map((k) => ({
              value: k,
              label: TRANG_THAI_DAT_CHO[k].label,
            }))}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm khách / tour / mã đơn"
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card size="small">
            <Statistic
              title="Tổng đơn"
              value={rows.length}
              valueStyle={{ color: '#4b4ee8' }}
            />
          </Card>
          <Card size="small">
            <Statistic
              title="Chờ cọc / Giữ chỗ"
              value={rows.filter((r) => ['GiuCho', 'ChoCoc'].includes(r.TrangThai)).length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
          <Card size="small">
            <Statistic
              title="Đã cọc chưa thanh toán đủ"
              value={rows.filter((r) => r.TrangThai === 'DaCoc').length}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
          <Card size="small">
            <Statistic
              title="Đã thanh toán"
              value={rows.filter((r) => r.TrangThai === 'DaThanhToan').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card size="small">
            <Statistic title="Tổng đã thu" value={tongDaThu} formatter={fmtVND} valueStyle={{ color: '#52c41a' }} />
          </Card>
          <Card size="small">
            <Statistic title="Tổng công nợ" value={tongCongNo} formatter={fmtVND} valueStyle={{ color: '#fa8c16' }} />
          </Card>
          <Card size="small">
            <Statistic title="Tổng hoàn" value={hoanTotal} formatter={fmtVND} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </div>

        <Tabs activeKey={tab} onChange={setTab} items={items} />
      </Card>

      {/* ------------------------------ Modal cọc ------------------------------ */}
      <Modal
        open={!!depositItem}
        onCancel={() => setDepositItem(null)}
        onOk={submitDeposit}
        confirmLoading={depositSubmitting}
        okText="Xác nhận cọc"
        title={`Xác nhận cọc — đơn #${depositItem?.MaDatCho}`}
      >
        {depositItem && (
          <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Tổng tiền</span>
              <b>{fmtVND(depositItem.TongTien)}</b>
            </div>
            <div className="flex justify-between text-orange-500">
              <span>Cọc tối thiểu 30% (DR-03)</span>
              <b>{fmtVND(cocToiThieuOf(depositItem))}</b>
            </div>
          </div>
        )}
        <Form form={depositForm} layout="vertical">
          <Form.Item
            name="SoTien"
            label="Số tiền cọc"
            rules={[{ required: true, message: 'Nhập số tiền' }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              step={100000}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
          <Form.Item
            name="PhuongThuc"
            label="Phương thức"
            rules={[{ required: true, message: 'Chọn phương thức' }]}
          >
            <Select options={PHUONG_THUC} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ------------------------------ Modal thanh toán đủ ------------------------------ */}
      <Modal
        open={!!fullItem}
        onCancel={() => setFullItem(null)}
        onOk={submitFull}
        confirmLoading={fullSubmitting}
        okText="Xác nhận thanh toán"
        title={`Thanh toán đủ — đơn #${fullItem?.MaDatCho}`}
      >
        {fullItem && (
          <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Tổng tiền</span>
              <b>{fmtVND(fullItem.TongTien)}</b>
            </div>
            <div className="flex justify-between">
              <span>Đã cọc</span>
              <span>{fmtVND(fullItem.DaDatCoc)}</span>
            </div>
            <div className="flex justify-between text-indigo-600">
              <span>Còn lại</span>
              <b>{fmtVND(conThieu(fullItem))}</b>
            </div>
          </div>
        )}
        <Form form={fullForm} layout="vertical">
          <Form.Item
            name="SoTien"
            label="Số tiền thanh toán"
            rules={[{ required: true, message: 'Nhập số tiền' }]}
          >
            <InputNumber className="w-full" min={0} step={100000} />
          </Form.Item>
          <Form.Item
            name="PhuongThuc"
            label="Phương thức"
            rules={[{ required: true, message: 'Chọn phương thức' }]}
          >
            <Select options={PHUONG_THUC} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ------------------------------ Modal hủy tour ------------------------------ */}
      <Modal
        open={!!cancelItem}
        onCancel={() => setCancelItem(null)}
        onOk={submitCancel}
        confirmLoading={cancelSubmitting}
        okText="Xác nhận hủy tour"
        okButtonProps={{ danger: true }}
        title={`Xử lý hủy tour — đơn #${cancelItem?.MaDatCho}`}
      >
        {cancelItem && preview && (
          <div className="mb-3">
            <Descriptions
              bordered
              size="small"
              column={1}
              className="mb-2"
              items={[
                {
                  key: 'days',
                  label: 'Số ngày còn lại trước khởi hành',
                  children: (
                    <Text
                      className={
                        preview.days < 3
                          ? 'font-semibold text-red-500'
                          : preview.days < 7
                            ? 'font-semibold text-orange-500'
                            : 'font-semibold text-green-600'
                      }
                    >
                      {preview.days} ngày ({fmtDate(cancelItem.ngay_khoi_hanh)})
                    </Text>
                  ),
                },
                {
                  key: 'mucphat',
                  label: 'Mức phạt',
                  children: (
                    <Space>
                      <Tag
                        color={
                          preview.mucPhat === 0
                            ? 'green'
                            : preview.mucPhat === 0.5
                              ? 'orange'
                              : 'red'
                        }
                      >
                        {preview.label}
                      </Tag>
                      <Text>
                        {(preview.mucPhat * 100).toFixed(0)}%
                      </Text>
                    </Space>
                  ),
                },
                {
                  key: 'hoan',
                  label: 'Số tiền hoàn cho khách',
                  children: (
                    <b className="text-indigo-600">{fmtVND(preview.soTienHoan)}</b>
                  ),
                },
                {
                  key: 'coc',
                  label: 'Tiền cọc hiện tại',
                  children: fmtVND(cancelItem.DaDatCoc),
                },
              ]}
            />
          </div>
        )}
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            name="LyDo"
            label="Lý do hủy"
            rules={[
              { required: true, message: 'Nhập lý do hủy' },
              { min: 3, message: 'Lý do phải có ít nhất 3 ký tự' },
            ]}
          >
            <Input.TextArea rows={3} placeholder="vd: Khách thay đổi kế hoạch công việc..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer chi tiết đơn */}
      <Drawer
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        width={680}
        title={detailItem ? `Chi tiết đơn #${detailItem.MaDatCho}` : ''}
      >
        {detailLoading || !detailData ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Descriptions
              bordered
              size="small"
              column={1}
              className="mb-3"
              items={[
                { key: 'kh', label: 'Khách hàng', children: detailItem.ten_khach_hang },
                { key: 'tour', label: 'Tour', children: detailItem.ten_tour },
                { key: 'ngay', label: 'Khởi hành', children: fmtDate(detailItem.ngay_khoi_hanh) },
                { key: 'sl', label: 'Số khách', children: detailData.SoKhach },
                { key: 'tong', label: 'Tổng tiền', children: fmtVND(detailData.TongTien) },
                { key: 'coc', label: 'Đã cọc', children: fmtVND(detailData.DaDatCoc) },
                {
                  key: 'thieu',
                  label: 'Còn thiếu',
                  children: fmtVND(Math.max(0, Number(detailData.TongTien) - Number(detailData.DaDatCoc))),
                },
              ]}
            />

            <Title level={5}>Hành khách</Title>
            <Table
              rowKey={(_, i) => i}
              dataSource={detailData.ds_hanh_khach || []}
              pagination={false}
              size="small"
              className="mb-3"
              columns={[
                { title: 'Họ tên', dataIndex: 'HoTen' },
                { title: 'SĐT', dataIndex: 'SoDienThoai', render: (v) => v || '—' },
                { title: 'Ghi chú', dataIndex: 'GhiChu', render: (v) => v || '—' },
              ]}
            />

            <Title level={5}>Lịch sử giao dịch</Title>
            <Table
              rowKey="key"
              dataSource={detailTxns}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có giao dịch.' }}
              columns={[
                {
                  title: 'Loại',
                  dataIndex: 'LoaiGiaoDich',
                  render: (v) => ({ Coc: 'Cọc', ThanhToan: 'Thanh toán', HoanTien: 'Hoàn tiền' }[v] || v),
                },
                { title: 'Số tiền', dataIndex: 'SoTien', render: fmtVND },
                { title: 'Phương thức', dataIndex: 'PhuongThuc' },
                { title: 'Thời gian', dataIndex: 'NgayGiaoDich', render: fmtDateTime },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* Modal thêm khoản nợ NCC */}
      <Modal
        open={payableOpen}
        onCancel={() => setPayableOpen(false)}
        onOk={submitPayable}
        confirmLoading={payableSubmitting}
        okText="Thêm"
        title="Thêm khoản nợ nhà cung cấp"
      >
        <Form form={payableForm} layout="vertical">
          <Form.Item name="TenDoiTac" label="Tên đối tác" rules={[{ required: true, min: 2, message: 'Nhập tên đối tác' }]}>
            <Input placeholder="vd: Khách sạn Hạ Long Palace" />
          </Form.Item>
          <Form.Item name="DichVu" label="Dịch vụ cung cấp" rules={[{ required: true, message: 'Nhập dịch vụ' }]}>
            <Input placeholder="vd: Lưu trú 2 đêm cho đoàn 20 khách" />
          </Form.Item>
          <Form.Item name="TongTien" label="Tổng tiền hợp đồng (₫)" rules={[{ required: true, message: 'Nhập tổng tiền' }]}>
            <InputNumber className="w-full" min={1} step={100000} />
          </Form.Item>
          <Form.Item name="HanThanhToan" label="Hạn thanh toán">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal lập phiếu chi */}
      <Modal
        open={!!payItem}
        onCancel={() => setPayItem(null)}
        onOk={submitPay}
        okText="Lập phiếu chi"
        title={`Lập phiếu chi — ${payItem?.TenDoiTac}`}
      >
        {payItem && (
          <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span>Đối tác</span><b>{payItem.TenDoiTac}</b></div>
            <div className="flex justify-between"><span>Dịch vụ</span><span>{payItem.DichVu}</span></div>
            <div className="flex justify-between text-orange-500"><span>Còn nợ</span><b>{fmtVND(payItem.con_no)}</b></div>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="SoTien" label="Số tiền chi (₫)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber className="w-full" min={1} max={Number(payItem?.con_no) || undefined} step={100000} />
          </Form.Item>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
