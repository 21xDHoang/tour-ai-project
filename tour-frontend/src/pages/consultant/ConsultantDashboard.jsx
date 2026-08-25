import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import {
  CustomerServiceOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { bookingApi, dashboardApi, leadApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { TRANG_THAI_LEAD, fmtDateTime, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

/** Dashboard cá nhân của Tư vấn viên: KPI của tôi + việc đang xử lý. */
export default function ConsultantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState(null);
  const [leads, setLeads] = useState([]);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
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
    }
  }, [user?.MaNguoiDung]);

  useEffect(() => {
    load();
  }, [load]);

  const leadDangXuLy = leads.filter((l) => ['Moi', 'DangLienHe', 'DaBaoGia', 'DangChot'].includes(l.TrangThai));
  const donDangXuLy = orders.filter((o) => ['GiuCho', 'ChoCoc', 'DaCoc'].includes(o.TrangThai));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          👋 Chào {user?.HoTen}!
        </Title>
        <Text type="secondary">
          Tổng quan công việc hôm nay: lead đang xử lý và đơn đang theo dõi.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card className="shadow-card" bordered={false}>
            <Statistic
              title="Lead phụ trách"
              value={kpi?.so_lead ?? 0}
              prefix={<CustomerServiceOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card className="shadow-card" bordered={false}>
            <Statistic
              title="Lead đang chốt"
              value={kpi?.lead_dang_chot ?? 0}
              prefix={<RiseOutlined className="text-purple-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card className="shadow-card" bordered={false}>
            <Statistic
              title="Đơn đã đặt"
              value={kpi?.so_don ?? 0}
              prefix={<ShoppingCartOutlined className="text-indigo-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card className="shadow-card" bordered={false}>
            <Statistic
              title="Tour riêng phụ trách"
              value={kpi?.so_tour_rieng ?? 0}
              prefix={<TagsOutlined className="text-cyan-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <Card
            title={`Lead cần xử lý (${leadDangXuLy.length})`}
            className="shadow-card"
            bordered={false}
            extra={
              <Button type="link" onClick={() => navigate('/consultant/leads')}>
                Mở Kanban →
              </Button>
            }
          >
            {leadDangXuLy.length === 0 ? (
              <Text type="secondary">Chưa có lead nào đang xử lý.</Text>
            ) : (
              <ul className="divide-y">
                {leadDangXuLy.slice(0, 5).map((l) => (
                  <li key={l.MaYeuCau} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{l.HoTen}</div>
                      <Text type="secondary" className="text-xs">
                        {l.SoDienThoai} · {l.Nguon} · {fmtDateTime(l.NgayTao)}
                      </Text>
                    </div>
                    <Tag color={TRANG_THAI_LEAD[l.TrangThai]?.color}>
                      {TRANG_THAI_LEAD[l.TrangThai]?.label}
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={`Đơn đang theo dõi (${donDangXuLy.length})`}
            className="shadow-card"
            bordered={false}
            extra={
              <Button type="link" onClick={() => navigate('/consultant/orders')}>
                Xem tất cả →
              </Button>
            }
          >
            {donDangXuLy.length === 0 ? (
              <Text type="secondary">Chưa có đơn nào đang chờ xử lý.</Text>
            ) : (
              <ul className="divide-y">
                {donDangXuLy.slice(0, 5).map((o) => (
                  <li key={o.MaDatCho} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">
                        Đơn #{o.MaDatCho} · {o.ten_khach_hang}
                      </div>
                      <Text type="secondary" className="text-xs">
                        {o.ten_tour} · {fmtVND(o.TongTien)}
                      </Text>
                    </div>
                    <Tag color={o.TrangThai === 'DaCoc' ? 'cyan' : 'gold'}>
                      {o.TrangThai === 'DaCoc' ? 'Đã cọc' : 'Chờ cọc'}
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
