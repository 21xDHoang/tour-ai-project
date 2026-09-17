import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Col, Row } from 'antd';
import { bookingApi, dashboardApi, leadApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { TRANG_THAI_LEAD, fmtDateTime, fmtVND } from '../../utils/format';
import { donPill, leadPill } from '../../utils/signs';
import ChiSoRail, { ChiSo, KhungChiSo } from '../../components/ui/ChiSo';
import EmptyState from '../../components/ui/EmptyState';
import Khoi from '../../components/ui/Khoi';
import SectionHeader from '../../components/ui/SectionHeader';

/** Nút hành động trong đầu khối: chữ thường, gạch chân chạy khi trỏ vào. */
function LienKet({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="link-route font-display text-body-s font-bold text-guide-600"
    >
      {children}
    </button>
  );
}

/** Một dòng trong danh sách việc: thông tin bên trái, trạng thái bên phải. */
function DongViec({ tieuDe, phu, trangThai, pill }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <div className="truncate font-semibold text-ink-950">{tieuDe}</div>
        <div className="truncate text-[12px] text-ink-600">{phu}</div>
      </div>
      <span className={`chip shrink-0 !px-2 !py-0.5 !text-[11px] ${pill}`}>
        {trangThai}
      </span>
    </li>
  );
}

/** Dashboard cá nhân của Tư vấn viên: KPI của tôi + việc đang xử lý. */
export default function ConsultantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState(null);
  const [leads, setLeads] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, ls, os] = await Promise.all([
        dashboardApi.kpiMy(),
        leadApi.listMy(),
        bookingApi.listAll(),
      ]);
      setKpi(k);
      setLeads(ls || []);
      setOrders((os || []).filter((o) => o.NguoiTaoID === user?.MaNguoiDung));
    } catch {
      // im lặng — để UI rỗng
    } finally {
      setLoading(false);
    }
  }, [user?.MaNguoiDung]);

  useEffect(() => {
    load();
  }, [load]);

  const leadDangXuLy = leads.filter((l) =>
    ['Moi', 'DangLienHe', 'DaBaoGia', 'DangChot'].includes(l.TrangThai),
  );
  const donDangXuLy = orders.filter((o) => ['GiuCho', 'ChoCoc', 'DaCoc'].includes(o.TrangThai));

  // Số việc đang mở — con số duy nhất trên trang này trả lời được câu "hôm nay
  // tôi còn phải làm gì", nên nó đứng ở đầu mục chứ không nằm trong một ô chỉ số.
  const soViecDangMo = leadDangXuLy.length + donDangXuLy.length;

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : String(soViecDangMo)}
        title={`Chào ${user?.HoTen || 'bạn'}`}
        description="Lead cần xử lý và đơn đang theo dõi của bạn."
      />

      {loading ? (
        <KhungChiSo cot={4} className="mt-6" />
      ) : (
        <ChiSoRail cot={4} className="mt-6">
          <ChiSo nhan="Lead phụ trách" giaTri={kpi?.so_lead ?? 0} donVi="lead" />
          <ChiSo nhan="Lead đang chốt" giaTri={kpi?.lead_dang_chot ?? 0} donVi="lead" />
          <ChiSo nhan="Đơn đã đặt" giaTri={kpi?.so_don ?? 0} donVi="đơn" manh />
          <ChiSo nhan="Tour riêng phụ trách" giaTri={kpi?.so_tour_rieng ?? 0} donVi="tour" />
        </ChiSoRail>
      )}

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={12}>
          <Khoi
            tieuDe="Lead cần xử lý"
            dem={String(leadDangXuLy.length)}
            hanhDong={<LienKet onClick={() => navigate('/consultant/leads')}>Mở bảng lead</LienKet>}
          >
            {leadDangXuLy.length === 0 ? (
              <EmptyState
                compact
                className="panel"
                title="Không còn lead nào đang chờ"
                description="Lead mới sẽ hiện ở đây ngay khi được gán cho bạn."
              />
            ) : (
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-200 bg-white">
                {leadDangXuLy.slice(0, 5).map((l) => (
                  <DongViec
                    key={l.MaYeuCau}
                    tieuDe={l.HoTen}
                    phu={`${l.SoDienThoai} · ${l.Nguon} · ${fmtDateTime(l.NgayTao)}`}
                    trangThai={TRANG_THAI_LEAD[l.TrangThai]?.label || l.TrangThai}
                    pill={leadPill(l.TrangThai)}
                  />
                ))}
              </ul>
            )}
          </Khoi>
        </Col>

        <Col xs={24} lg={12}>
          <Khoi
            tieuDe="Đơn đang theo dõi"
            dem={String(donDangXuLy.length)}
            hanhDong={<LienKet onClick={() => navigate('/consultant/orders')}>Xem tất cả</LienKet>}
          >
            {donDangXuLy.length === 0 ? (
              <EmptyState
                compact
                className="panel"
                title="Không có đơn nào đang chờ"
                description="Đơn bạn tạo cho khách sẽ hiện ở đây kèm trạng thái cọc."
              />
            ) : (
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-200 bg-white">
                {donDangXuLy.slice(0, 5).map((o) => (
                  <DongViec
                    key={o.MaDatCho}
                    tieuDe={`Đơn #${o.MaDatCho} · ${o.ten_khach_hang}`}
                    phu={`${o.ten_tour} · ${fmtVND(o.TongTien)}`}
                    trangThai={o.TrangThai === 'DaCoc' ? 'Đã cọc' : 'Chờ cọc'}
                    pill={donPill(o.TrangThai)}
                  />
                ))}
              </ul>
            )}
          </Khoi>
        </Col>
      </Row>
    </div>
  );
}
