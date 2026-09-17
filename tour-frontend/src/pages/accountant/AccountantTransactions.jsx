import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { reportApi } from '../../api/http';
import { exportToExcel } from '../../utils/exportExcel';
import { fmtDateTime, fmtVND } from '../../utils/format';
import BangDuLieu from '../../components/ui/BangDuLieu';
import ChiSoRail, { ChiSo, KhungChiSo } from '../../components/ui/ChiSo';
import SectionHeader from '../../components/ui/SectionHeader';
import ThanhLoc, { OLoc } from '../../components/ui/ThanhLoc';

/** Nhãn loại giao dịch. Bảng màu AntD cũ đã bỏ — xem quy tắc màu ở utils/signs.js. */
const LOAI_GD = {
  Coc: 'Cọc',
  ThanhToan: 'Thanh toán',
  HoanTien: 'Hoàn tiền',
  ChiPhi: 'Chi phí',
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
  /**
   * Ba con số tổng tính từ chính `rows`, nên chúng cũng sai theo khi lời gọi
   * hỏng: mảng rỗng cho ra "Thu 0 ₫ · Chi 0 ₫ · Ròng 0 ₫" — một câu khẳng định
   * về sổ sách, trong khi sự thật chỉ là không đọc được số liệu.
   */
  const [loi, setLoi] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoi(false);
    try {
      const params = {};
      if (loai) params.loai_giao_dich = loai;
      if (phuongThuc) params.phuong_thuc = phuongThuc;
      setRows(await reportApi.transactions(params));
    } catch {
      setRows([]);
      setLoi(true);
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
    {
      title: 'Mã GD',
      dataIndex: 'key',
      width: 96,
      render: (v) => <span className="tnum text-ink-600">{v}</span>,
    },
    // Nguồn để nguyên chữ, không tô màu: dấu +/− ở cột Số tiền đã là chỗ duy
    // nhất nói chiều dòng tiền, tô thêm ở đây là cùng một thông tin hai lần.
    { title: 'Nguồn', dataIndex: 'nguon', width: 88, render: (v) => v || '—' },
    {
      // Loại giao dịch là phân loại, không phải mức ưu tiên — chữ nói đủ.
      title: 'Loại',
      dataIndex: 'LoaiGiaoDich',
      width: 120,
      render: (v) => LOAI_GD[v] || v,
    },
    {
      title: 'Số tiền',
      dataIndex: 'SoTien',
      width: 150,
      align: 'right',
      // Màu chỉ nhắc lại dấu +/− đã in ngay trước số.
      render: (v, r) => (
        <span
          className={`tnum font-semibold ${r.nguon === 'Chi' ? 'text-stop-600' : 'text-guide-600'}`}
        >
          {r.nguon === 'Chi' ? '−' : '+'}
          {fmtVND(Math.abs(Number(v)))}
        </span>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'PhuongThuc',
      width: 130,
      render: (v) => (v ? PHUONG_THUC[v] || v : <span className="text-ink-400">—</span>),
    },
    {
      title: 'Khách / Đối tác',
      dataIndex: 'ten_khach_hang',
      ellipsis: true,
      render: (v) => v || <span className="text-ink-400">—</span>,
    },
    {
      title: 'Mã đơn',
      dataIndex: 'MaDatCho',
      width: 96,
      render: (v) => (v == null ? <span className="text-ink-400">—</span> : <span className="tnum">#{v}</span>),
    },
    {
      title: 'Người xử lý',
      dataIndex: 'ten_nguoi_xu_ly',
      width: 130,
      ellipsis: true,
      render: (v) => v || <span className="text-ink-400">—</span>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'NgayGiaoDich',
      width: 148,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDateTime(v)}</span>,
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading || loi ? null : `${rows.length} giao dịch`}
        title="Sổ quỹ / Giao dịch"
        description="Toàn bộ giao dịch thu (cọc, thanh toán, hoàn tiền) và chi (phiếu chi NCC)."
        action={
          <button type="button" className="btn btn-ghost" onClick={exportData}>
            <DownloadOutlined /> Xuất Excel
          </button>
        }
      />

      <div className="mt-6">
        {loading || loi ? (
          // Chưa đọc được số liệu thì không được bày ra một dải số 0 — xem chú
          // thích ở cờ `loi`.
          loi ? (
            <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="text-body-s text-ink-600">
                Không đọc được sổ quỹ. Kiểm tra kết nối rồi thử lại.
              </span>
              <button type="button" className="btn btn-ink" onClick={load}>
                Thử lại
              </button>
            </div>
          ) : (
            <KhungChiSo cot={3} />
          )
        ) : (
          <ChiSoRail cot={3}>
            <ChiSo nhan="Tổng thu" giaTri={fmtVND(tongThu)} donVi="₫" />
            <ChiSo nhan="Tổng chi" giaTri={fmtVND(tongChi)} donVi="₫" />
            <ChiSo nhan="Ròng" giaTri={fmtVND(tongThu - tongChi)} donVi="₫" manh />
          </ChiSoRail>
        )}
      </div>

      <ThanhLoc className="mt-4">
        <OLoc nhan="Loại giao dịch" width={200}>
          <Select
            allowClear
            placeholder="Tất cả loại"
            style={{ width: '100%' }}
            value={loai}
            onChange={setLoai}
            options={Object.entries(LOAI_GD).map(([v, l]) => ({ value: v, label: l }))}
          />
        </OLoc>
        <OLoc nhan="Phương thức" width={200}>
          <Select
            allowClear
            placeholder="Tất cả phương thức"
            style={{ width: '100%' }}
            value={phuongThuc}
            onChange={setPhuongThuc}
            options={Object.entries(PHUONG_THUC).map(([v, l]) => ({ value: v, label: l }))}
          />
        </OLoc>
      </ThanhLoc>

      <div className="mt-4">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="key"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={
            loi
              ? {
                  title: 'Không tải được sổ quỹ',
                  description:
                    'Máy chủ không trả về danh sách giao dịch. Kiểm tra kết nối rồi thử lại.',
                  action: (
                    <button type="button" className="btn btn-ink" onClick={load}>
                      Thử lại
                    </button>
                  ),
                }
              : {
                  title: 'Chưa có giao dịch nào',
                  description:
                    'Mọi khoản thu từ đơn đặt chỗ và mọi phiếu chi cho nhà cung cấp sẽ được ghi vào đây.',
                }
          }
        />
      </div>
    </div>
  );
}
