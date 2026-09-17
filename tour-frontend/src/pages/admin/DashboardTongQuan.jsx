import { useCallback, useEffect, useMemo, useState } from 'react';
import { bookingApi, dashboardApi, leadApi } from '../../api/http';
import { TRANG_THAI_DAT_CHO, TRANG_THAI_LEAD, fmtDate, fmtSo, fmtVND } from '../../utils/format';
import { donPill, leadPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import ChiSoRail, { ChiSo, KhungChiSo } from '../../components/ui/ChiSo';
import Khoi from '../../components/ui/Khoi';
import SectionHeader from '../../components/ui/SectionHeader';

/** Ba trạng thái nghĩa là "khách chưa chốt xong" — việc của Admin hôm nay. */
const DANG_CHO_XU_LY = ['GiuCho', 'ChoCoc', 'ChoXacNhanCoc'];

/** Dashboard Tổng quan Admin (Bảng điều khiển & Báo cáo). */
export default function DashboardTongQuan() {
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, bs, ls] = await Promise.all([
        dashboardApi.summary(),
        bookingApi.listAll(),
        leadApi.list(),
      ]);
      setSummary(s);
      setBookings(bs);
      setLeads(ls);
    } catch {
      // để nguyên state mặc định
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // `loading` giữ nguyên nghĩa cũ; `dangTai` rộng hơn một nhịp vì `summary` chỉ
  // có sau khi API trả về. Nhờ vậy dải chỉ số không kịp hiện một hàng số 0 —
  // số 0 trong lúc chờ là một khẳng định sai, không phải một trạng thái chờ.
  const dangTai = loading || !summary;

  const choXuLy = useMemo(
    () => bookings.filter((r) => DANG_CHO_XU_LY.includes(r.TrangThai)).length,
    [bookings],
  );

  const bookingColumns = [
    {
      title: 'Mã',
      dataIndex: 'MaDatCho',
      width: 74,
      render: (v) => <span className="tnum font-semibold text-ink-950">#{v}</span>,
    },
    { title: 'Khách hàng', dataIndex: 'ten_khach_hang', width: 150, ellipsis: true },
    { title: 'Tour', dataIndex: 'ten_tour', width: 190, ellipsis: true },
    {
      title: 'Khởi hành',
      dataIndex: 'ngay_khoi_hanh',
      width: 106,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDate(v)}</span>,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      width: 118,
      align: 'right',
      render: (v) => (
        <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 132,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${donPill(v)}`}>
          {TRANG_THAI_DAT_CHO[v]?.label || v}
        </span>
      ),
    },
  ];

  const leadColumns = [
    { title: 'Khách', dataIndex: 'HoTen', width: 122, ellipsis: true },
    {
      title: 'SĐT',
      dataIndex: 'SoDienThoai',
      width: 108,
      render: (v) => <span className="tnum whitespace-nowrap">{v}</span>,
    },
    { title: 'Quan tâm', dataIndex: 'TourQuanTam', width: 120, ellipsis: true },
    { title: 'Nguồn', dataIndex: 'Nguon', width: 84, ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 116,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${leadPill(v)}`}>
          {TRANG_THAI_LEAD[v]?.label || v}
        </span>
      ),
    },
  ];

  // Bề rộng tối thiểu = tổng bề rộng các cột đã khai báo, để AntD dùng
  // `table-layout: fixed`. Để mặc định `max-content` thì cột "Tour" tự nới theo
  // tên tour dài và bảng tràn khỏi khối.
  const rongBangDon = bookingColumns.reduce((s, c) => s + (c.width || 0), 0);
  const rongBangLead = leadColumns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={dangTai ? null : String(choXuLy)}
        title="Bảng điều khiển tổng quan"
        description="Doanh thu, đơn hàng, khách đang đi tour và lead mới — cùng số đơn còn chờ xử lý."
      />

      {dangTai ? (
        <KhungChiSo cot={5} className="mt-6" />
      ) : (
        <ChiSoRail cot={5} className="mt-6">
          <ChiSo
            nhan="Doanh thu hôm nay"
            giaTri={fmtSo(summary.doanh_thu_hom_nay)}
            donVi="₫"
            manh
          />
          <ChiSo nhan="Doanh thu tháng" giaTri={fmtSo(summary.doanh_thu_thang)} donVi="₫" />
          <ChiSo nhan="Đơn mới 7 ngày" giaTri={summary.don_moi_7_ngay ?? 0} donVi="đơn" />
          <ChiSo
            nhan="Khách đang đi tour"
            giaTri={summary.khach_dang_di_tour ?? 0}
            donVi="khách"
          />
          <ChiSo nhan="Lead mới 7 ngày" giaTri={summary.lead_moi_7_ngay ?? 0} donVi="lead" />
        </ChiSoRail>
      )}

      {/* Hai bảng này xếp DỌC chứ không chia đôi màn hình.
          Bản cũ để chúng cạnh nhau theo tỉ lệ 14/10, và ở bề rộng làm việc thật
          (màn 1440px, trừ sidebar 255px và đệm 64px, còn ~1120px) thì cột 10
          chỉ được ~450px — không đủ cho bảng 5 cột, nên cột "Trạng thái" bị đẩy
          ra ngoài và phải cuộn ngang mới thấy. Một bảng mà cột cuối khuất thì
          bảng đó mất luôn phần cho biết đơn đang ở bước nào. */}
      <Khoi tieuDe="Đơn đặt chỗ gần đây" dem={`${bookings.length} đơn`} className="mt-6">
        <BangDuLieu
          rows={bookings.slice(0, 6)}
          columns={bookingColumns}
          rowKey="MaDatCho"
          x={rongBangDon}
          loading={dangTai}
          pagination={false}
          empty={{ title: 'Chưa có đơn đặt chỗ nào' }}
        />
      </Khoi>

      <Khoi tieuDe="Lead mới nhất" dem={`${leads.length} lead`} className="mt-6">
        <BangDuLieu
          rows={leads.slice(0, 6)}
          columns={leadColumns}
          rowKey="MaYeuCau"
          x={rongBangLead}
          loading={dangTai}
          pagination={false}
          empty={{ title: 'Chưa có lead nào' }}
        />
      </Khoi>
    </div>
  );
}
