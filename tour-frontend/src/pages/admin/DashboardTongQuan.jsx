import { useCallback, useEffect, useState } from 'react';
import { Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import {
  AuditOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { bookingApi, dashboardApi, leadApi } from '../../api/http';
import { TRANG_THAI_LEAD, TRANG_THAI_DAT_CHO, fmtDate, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

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

  if (loading || !summary) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  const cards = [
    { title: 'Doanh thu hôm nay', value: summary.doanh_thu_hom_nay,
      icon: <DollarOutlined />, color: '#52c41a', isMoney: true },
    { title: 'Doanh thu tháng', value: summary.doanh_thu_thang,
      icon: <AuditOutlined />, color: '#4b4ee8', isMoney: true },
    { title: 'Đơn mới 7 ngày', value: summary.don_moi_7_ngay,
      icon: <ShoppingCartOutlined />, color: '#fa8c16' },
    { title: 'Khách đang đi tour', value: summary.khach_dang_di_tour,
      icon: <TeamOutlined />, color: '#13c2c2' },
    { title: 'Lead mới 7 ngày', value: summary.lead_moi_7_ngay,
      icon: <UserAddOutlined />, color: '#eb2f96' },
  ];

  const bookingColumns = [
    { title: 'Mã', dataIndex: 'MaDatCho', width: 70 },
    { title: 'Khách hàng', dataIndex: 'ten_khach_hang' },
    { title: 'Tour', dataIndex: 'ten_tour' },
    { title: 'Khởi hành', dataIndex: 'ngay_khoi_hanh', render: fmtDate },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      render: (v) => <b>{fmtVND(v)}</b>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_DAT_CHO[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
  ];

  const leadColumns = [
    { title: 'Khách', dataIndex: 'HoTen' },
    { title: 'SĐT', dataIndex: 'SoDienThoai' },
    { title: 'Quan tâm', dataIndex: 'TourQuanTam' },
    { title: 'Nguồn', dataIndex: 'Nguon' },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_LEAD[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">📊 Bảng điều khiển tổng quan</Title>
        <Text type="secondary">
          Doanh thu, đơn hàng và lead mới để nắm nhanh tình hình kinh doanh.
        </Text>
      </div>

      <Row gutter={[16, 16]} className="mb-4">
        {cards.map((c) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={c.title}>
            <Card size="small">
              <Statistic
                title={c.title}
                value={c.isMoney ? fmtVND(c.value) : c.value}
                valueStyle={{ color: c.color }}
                prefix={c.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span className="text-slate-700">Đơn đặt chỗ gần đây</span>}
            className="shadow-card"
            bordered={false}
          >
            <Table
              rowKey="MaDatCho"
              columns={bookingColumns}
              dataSource={bookings.slice(0, 6)}
              pagination={false}
              size="small"
              scroll={{ x: 720 }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            title={<span className="text-slate-700">Lead mới nhất</span>}
            className="shadow-card"
            bordered={false}
          >
            <Table
              rowKey="MaYeuCau"
              columns={leadColumns}
              dataSource={leads.slice(0, 6)}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
