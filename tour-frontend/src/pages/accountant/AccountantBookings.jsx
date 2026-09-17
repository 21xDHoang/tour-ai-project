import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tabs,
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
import BangDuLieu from '../../components/ui/BangDuLieu';
import ChiSoRail, { ChiSo } from '../../components/ui/ChiSo';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';
import ThanhLoc, { OLoc } from '../../components/ui/ThanhLoc';
import { donPill, nccPill } from '../../utils/signs';
import {
  TRANG_THAI_DAT_CHO,
  fmtDate,
  fmtDateTime,
  fmtSo,
  fmtVND,
} from '../../utils/format';

const TRANG_THAI_NCC_LABEL = {
  ChuaTra: 'Chưa trả',
  TraMotPhan: 'Trả một phần',
  DaTatToan: 'Đã tất toán',
};

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

  /** P2: kế toán từ chối xác nhận cọc -> đơn quay lại Giữ chỗ, nối lại đếm ngược. */
  const rejectDeposit = async () => {
    if (!depositItem) return;
    setDepositSubmitting(true);
    try {
      const res = await bookingApi.huyXacNhanCoc(depositItem.MaDatCho);
      message.success(`Đơn #${res.MaDatCho} quay lại trạng thái giữ chỗ`);
      setDepositItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Từ chối xác nhận cọc thất bại');
    } finally {
      setDepositSubmitting(false);
    }
  };

  const confirmRejectDeposit = () => {
    Modal.confirm({
      title: 'Từ chối xác nhận cọc?',
      content:
        'Đơn sẽ quay lại trạng thái Giữ chỗ 24h và tiếp tục đếm ngược từ thời điểm khách báo đã chuyển khoản.',
      okText: 'Từ chối',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: rejectDeposit,
    });
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
      { title: 'Mã đơn', dataIndex: 'MaDatCho', width: 76 },
      {
        title: 'Khách hàng',
        dataIndex: 'ten_khach_hang',
        width: 140,
        render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
      },
      {
        title: 'Tour',
        dataIndex: 'ten_tour',
        width: 250,
        render: (v, r) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-ink-950">{v}</div>
            <div className="truncate text-[12px] text-ink-600">
              {r.ten_diem_den} · khởi hành {fmtDate(r.ngay_khoi_hanh)}
            </div>
          </div>
        ),
      },
      { title: 'Số khách', dataIndex: 'SoKhach', width: 64, align: 'center' },
      {
        // Tổng tiền và đã cọc là hai nửa của cùng một câu hỏi ("hợp đồng này
        // đã thu được bao nhiêu") nên đứng chung một ô: đọc dọc là thấy ngay
        // đơn nào chưa đạt mốc 30% mà không phải quét sang cột khác.
        title: 'Tổng tiền / Đã cọc',
        key: 'tien',
        width: 125,
        align: 'right',
        render: (_, r) => (
          <div className="tnum">
            <div className="font-semibold text-ink-950">{fmtVND(r.TongTien)}</div>
            <div className="text-[12px] text-ink-600">cọc {fmtVND(r.DaDatCoc)}</div>
          </div>
        ),
      },
      {
        title: 'Còn thiếu',
        key: 'conThieu',
        width: 122,
        align: 'right',
        render: (_, r) => {
          const shortage = conThieu(r);
          return shortage > 0 ? (
            <span className="tnum font-semibold text-signal-700">{fmtVND(shortage)}</span>
          ) : (
            <span className="chip !px-2 !py-0.5 !text-[11px] border-guide-200 bg-guide-50 text-guide-700">
              Đủ
            </span>
          );
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'TrangThai',
        width: 168,
        render: (v, r) => (
          <div className="flex flex-col items-start gap-1">
            <span className={`chip !px-2 !py-0.5 !text-[11px] ${donPill(v)}`}>
              {TRANG_THAI_DAT_CHO[v]?.label || v}
            </span>
            {v === 'GiuCho' && <CountdownTimer hanGiuCho={r.HanGiuCho} />}
          </div>
        ),
      },
      {
        // Ghim phải: đây là cột ra tiền, không được để nó bị đẩy khỏi mép
        // phải khi cửa sổ hẹp — cuộn ngang tìm nút là thao tác tốn thời gian
        // nhất trên màn này.
        title: 'Thao tác',
        key: 'action',
        width: 132,
        fixed: 'right',
        render: (_, r) => {
          // P2: đơn khách báo đã chuyển khoản vẫn xác nhận cọc được (bỏ qua hết hạn)
          const canDeposit = ['GiuCho', 'ChoCoc', 'ChoXacNhanCoc'].includes(r.TrangThai);
          const canFull = r.TrangThai === 'DaCoc';
          // P3: cho phép hủy cả đơn DaThanhToan; loại DangDiTour/HoanThanh/HetHan/DaHuy
          const canCancel = ['GiuCho', 'ChoCoc', 'DaCoc', 'DaThanhToan'].includes(r.TrangThai);

          const chiTiet = {
            nhan: 'Chi tiết',
            icon: <EyeOutlined />,
            onClick: () => openDetail(r),
          };
          const khac = [];
          if (canFull) {
            khac.push({
              nhan: 'Thanh toán đủ',
              icon: <MoneyCollectOutlined />,
              onClick: () => openFull(r),
            });
          }
          if (canCancel) {
            khac.push({
              nhan: 'Xử lý hủy',
              icon: <CalendarOutlined />,
              danger: true,
              onClick: () => openCancel(r),
            });
          }

          // Việc ra tiền đứng thẳng trên dòng; "Chi tiết" chỉ là thao tác đọc nên
          // lùi vào menu khi đã có việc gấp hơn. Không bỏ mất thao tác nào.
          return (
            <HangThaoTac
              chinh={
                canDeposit
                  ? {
                      nhan: 'Xác nhận cọc',
                      icon: <WalletOutlined />,
                      onClick: () => openDeposit(r),
                    }
                  : chiTiet
              }
              khac={canDeposit ? [chiTiet, ...khac] : khac}
            />
          );
        },
      },
    ],
    [],
  );

  // Bề rộng tối thiểu của bảng = tổng bề rộng các cột đã khai báo. Phải là một
  // con số cụ thể để AntD dùng `table-layout: fixed`; ở chế độ `max-content`
  // nó nới cột theo nội dung, nên tên tour dài sẽ đẩy cột "Trạng thái" chui
  // xuống dưới cột "Thao tác" đã ghim bên phải. Tính từ chính mảng cột nên
  // thêm bớt cột là con số tự đúng theo.
  const beRongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  const payableColumns = [
    {
      title: 'Đối tác',
      dataIndex: 'TenDoiTac',
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    { title: 'Dịch vụ', dataIndex: 'DichVu', ellipsis: true },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      render: (v) => <span className="tnum text-ink-700">{fmtVND(v)}</span>,
      width: 130,
      align: 'right',
    },
    {
      title: 'Đã trả',
      dataIndex: 'DaThanhToan',
      render: (v) => <span className="tnum text-ink-700">{fmtVND(v)}</span>,
      width: 125,
      align: 'right',
    },
    {
      title: 'Còn nợ',
      dataIndex: 'con_no',
      width: 130,
      align: 'right',
      render: (v) => <span className="tnum font-semibold text-signal-700">{fmtVND(v)}</span>,
    },
    { title: 'Hạn thanh toán', dataIndex: 'HanThanhToan', render: fmtDate, width: 135 },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 130,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${nccPill(v)}`}>
          {TRANG_THAI_NCC_LABEL[v] || v}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_, r) =>
        Number(r.con_no) > 0 ? (
          <HangThaoTac
            chinh={{
              nhan: 'Lập phiếu chi',
              onClick: () => {
                payForm.resetFields();
                setPayItem(r);
              },
            }}
          />
        ) : (
          <span className="text-ink-400">—</span>
        ),
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
        <BangDuLieu
          rowKey="MaDatCho"
          columns={columns}
          rows={filteredRows}
          x={beRongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Không có đơn nào khớp bộ lọc',
            description: 'Xoá bộ lọc trạng thái hoặc từ khoá tìm kiếm để xem toàn bộ danh sách.',
          }}
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
        <div className="space-y-3">
          <Alert
            type="info"
            showIcon
            message="Chính sách phạt (DR-04): hủy ≥ 7 ngày hoàn 100% cọc · 3–6 ngày phạt 50% cọc · dưới 3 ngày phạt 100% cọc."
          />
          <BangDuLieu
            rowKey="MaDatCho"
            columns={columns}
            rows={filteredRows.filter((r) => ['GiuCho', 'ChoCoc', 'DaCoc', 'DaThanhToan'].includes(r.TrangThai))}
            loading={loading}
            pageSize={10}
            empty={{ title: 'Không có đơn nào có thể hủy ở thời điểm này' }}
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
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-ink"
              onClick={() => {
                payableForm.resetFields();
                setPayableOpen(true);
              }}
            >
              <ShopOutlined /> Thêm khoản nợ
            </button>
          </div>
          <BangDuLieu
            rowKey="MaPhaiTra"
            columns={payableColumns}
            rows={payables}
            loading={payableLoading}
            pageSize={10}
            empty={{
              title: 'Chưa ghi khoản nợ nhà cung cấp nào',
              description: 'Thêm khoản nợ để theo dõi hạn thanh toán và lập phiếu chi.',
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} đơn`}
        title="Phân hệ Kế toán"
        description="Xác nhận cọc ≥ 30% (DR-03), thanh toán phần còn lại và xử lý hủy tour theo mốc phạt (DR-04)."
      />

      <div className="mt-6 space-y-4">
        {/* Ba con số tiền là việc của kế toán; bốn số đếm trạng thái chỉ để
            định vị nên xếp thành dải riêng bên dưới. */}
        <ChiSoRail cot={3}>
          <ChiSo
            nhan="Tổng đã thu"
            giaTri={fmtSo(tongDaThu)}
            donVi="₫"
            phu={`Cộng dồn tiền cọc của ${rows.length} đơn`}
          />
          <ChiSo
            nhan="Tổng công nợ"
            giaTri={fmtSo(tongCongNo)}
            donVi="₫"
            phu="Đơn đã cọc nhưng chưa thanh toán đủ"
            manh
          />
          <ChiSo
            nhan="Tổng đã hoàn"
            giaTri={fmtSo(hoanTotal)}
            donVi="₫"
            phu="Từ các giao dịch hoàn tiền"
          />
        </ChiSoRail>

        <ChiSoRail cot={4}>
          <ChiSo nhan="Tổng đơn" giaTri={rows.length} />
          <ChiSo
            nhan="Chờ cọc / Giữ chỗ"
            giaTri={
              rows.filter((r) => ['GiuCho', 'ChoCoc', 'ChoXacNhanCoc'].includes(r.TrangThai)).length
            }
          />
          <ChiSo
            nhan="Đã cọc, chưa trả đủ"
            giaTri={rows.filter((r) => r.TrangThai === 'DaCoc').length}
          />
          <ChiSo
            nhan="Đã thanh toán"
            giaTri={
              rows.filter((r) => ['DaThanhToan', 'DangDiTour', 'HoanThanh'].includes(r.TrangThai)).length
            }
          />
        </ChiSoRail>

        <ThanhLoc
          right={
            <span className="tnum text-body-s text-ink-600">
              {filteredRows.length}/{rows.length} đơn
            </span>
          }
        >
          <OLoc nhan="Trạng thái" width={200}>
            <Select
              allowClear
              placeholder="Tất cả trạng thái"
              className="w-full"
              value={filterStatus}
              onChange={setFilterStatus}
              options={Object.keys(TRANG_THAI_DAT_CHO).map((k) => ({
                value: k,
                label: TRANG_THAI_DAT_CHO[k].label,
              }))}
            />
          </OLoc>
          <OLoc nhan="Tìm kiếm" width={280}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tên khách, tour hoặc mã đơn"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </OLoc>
        </ThanhLoc>

        <Tabs activeKey={tab} onChange={setTab} items={items} />
      </div>

      {/* ------------------------------ Modal cọc ------------------------------ */}
      <Modal
        open={!!depositItem}
        onCancel={() => setDepositItem(null)}
        onOk={submitDeposit}
        confirmLoading={depositSubmitting}
        okText="Xác nhận cọc"
        title={`Xác nhận cọc — đơn #${depositItem?.MaDatCho}`}
        footer={
          depositItem?.TrangThai === 'ChoXacNhanCoc' ? (
            <div className="flex items-center justify-between">
              <Button danger onClick={confirmRejectDeposit}>
                Từ chối xác nhận
              </Button>
              <Space>
                <Button onClick={() => setDepositItem(null)}>Đóng</Button>
                <Button
                  type="primary"
                  loading={depositSubmitting}
                  onClick={submitDeposit}
                >
                  Xác nhận cọc
                </Button>
              </Space>
            </div>
          ) : undefined
        }
      >
        {depositItem && (
          <div className="mb-3 rounded-card bg-paper p-3 text-sm">
            <div className="flex justify-between">
              <span>Tổng tiền</span>
              <b className="tnum">{fmtVND(depositItem.TongTien)}</b>
            </div>
            <div className="flex justify-between text-signal-700">
              <span>Cọc tối thiểu 30% (DR-03)</span>
              <b className="tnum">{fmtVND(cocToiThieuOf(depositItem))}</b>
            </div>
          </div>
        )}
        {depositItem?.TrangThai === 'ChoXacNhanCoc' && (
          <Alert
            className="mb-3"
            type="warning"
            showIcon
            message="Khách đã báo đã chuyển khoản cọc — đối soát với ngân hàng trước khi xác nhận."
          />
        )}
        {depositItem?.TrangThai === 'ChoXacNhanCoc' &&
          depositItem?.HinhAnhChuyenKhoan && (
            <div className="mb-3">
              <div className="label-sign mb-1 text-ink-600">Ảnh bill khách tải lên</div>
              <img
                src={depositItem.HinhAnhChuyenKhoan}
                alt="Bill chuyển khoản"
                className="mt-1 max-h-48 w-full rounded-card border border-ink-200 object-contain"
              />
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
          <div className="mb-3 rounded-card bg-paper p-3 text-sm">
            <div className="flex justify-between">
              <span>Tổng tiền</span>
              <b className="tnum">{fmtVND(fullItem.TongTien)}</b>
            </div>
            <div className="flex justify-between">
              <span>Đã cọc</span>
              <span className="tnum">{fmtVND(fullItem.DaDatCoc)}</span>
            </div>
            <div className="flex justify-between text-guide-700">
              <span>Còn lại</span>
              <b className="tnum">{fmtVND(conThieu(fullItem))}</b>
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
                    <span
                      className={`tnum font-semibold ${
                        preview.days < 3
                          ? 'text-stop-600'
                          : preview.days < 7
                            ? 'text-signal-700'
                            : 'text-guide-700'
                      }`}
                    >
                      {preview.days} ngày ({fmtDate(cancelItem.ngay_khoi_hanh)})
                    </span>
                  ),
                },
                {
                  key: 'mucphat',
                  label: 'Mức phạt',
                  children: (
                    <Space>
                      <span
                        className={`chip !px-2 !py-0.5 !text-[11px] ${
                          preview.mucPhat === 0
                            ? 'border-guide-200 bg-guide-50 text-guide-700'
                            : preview.mucPhat === 0.5
                              ? 'border-signal-200 bg-signal-50 text-signal-700'
                              : 'border-stop-200 bg-stop-50 text-stop-700'
                        }`}
                      >
                        {preview.label}
                      </span>
                      <span className="tnum">{(preview.mucPhat * 100).toFixed(0)}%</span>
                    </Space>
                  ),
                },
                {
                  key: 'hoan',
                  label: 'Số tiền hoàn cho khách',
                  children: (
                    <b className="tnum text-guide-700">{fmtVND(preview.soTienHoan)}</b>
                  ),
                },
                {
                  key: 'coc',
                  label: 'Tiền cọc hiện tại',
                  children: <span className="tnum">{fmtVND(cancelItem.DaDatCoc)}</span>,
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
        width={720}
        title={detailItem ? `Chi tiết đơn #${detailItem.MaDatCho}` : ''}
      >
        {detailLoading || !detailData ? (
          <div className="space-y-3">
            <div className="skeleton h-44 rounded-card" />
            <div className="skeleton h-28 rounded-card" />
            <div className="skeleton h-28 rounded-card" />
          </div>
        ) : (
          <>
            <Descriptions
              bordered
              size="small"
              column={1}
              className="mb-4"
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

            <h3 className="mb-2 font-display text-[15px] font-bold text-ink-950">Hành khách</h3>
            <div className="mb-4">
              <BangDuLieu
                rowKey={(_, i) => i}
                rows={detailData.ds_hanh_khach || []}
                pagination={false}
                empty={{ title: 'Chưa khai hành khách' }}
                columns={[
                  { title: 'Họ tên', dataIndex: 'HoTen' },
                  { title: 'SĐT', dataIndex: 'SoDienThoai', render: (v) => v || '—' },
                  { title: 'Ghi chú', dataIndex: 'GhiChu', render: (v) => v || '—' },
                ]}
              />
            </div>

            <h3 className="mb-2 font-display text-[15px] font-bold text-ink-950">Lịch sử giao dịch</h3>
            <BangDuLieu
              rowKey="key"
              rows={detailTxns}
              pagination={false}
              empty={{ title: 'Chưa có giao dịch' }}
              columns={[
                {
                  title: 'Loại',
                  dataIndex: 'LoaiGiaoDich',
                  render: (v) => ({ Coc: 'Cọc', ThanhToan: 'Thanh toán', HoanTien: 'Hoàn tiền' }[v] || v),
                },
                {
                  title: 'Số tiền',
                  dataIndex: 'SoTien',
                  align: 'right',
                  render: (v) => <span className="tnum">{fmtVND(v)}</span>,
                },
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
          <div className="mb-3 rounded-card bg-paper p-3 text-sm">
            <div className="flex justify-between"><span>Đối tác</span><b>{payItem.TenDoiTac}</b></div>
            <div className="flex justify-between"><span>Dịch vụ</span><span>{payItem.DichVu}</span></div>
            <div className="flex justify-between text-signal-700"><span>Còn nợ</span><b className="tnum">{fmtVND(payItem.con_no)}</b></div>
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
