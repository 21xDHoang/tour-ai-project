import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Row, Spin, Statistic, Table, Typography } from 'antd';
import { BarChartOutlined, DollarOutlined } from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import { reportApi } from '../../api/http';
import { fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

const NGAN_XAC = (v) => `₫${(v / 1_000_000).toFixed(1)}tr`;

const PHUONG_THUC_LABEL = {
  TienMat: 'Tiền mặt',
  ChuyenKhoan: 'Chuyển khoản',
  The: 'Thẻ',
};

/** Báo cáo tài chính (Kế toán): doanh thu, công nợ, phân bổ theo phương thức. */
export default function AccountantReport() {
  const [revenue, setRevenue] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, rec, mtd] = await Promise.all([
        reportApi.revenue(),
        reportApi.receivables(),
        reportApi.paymentMethods(),
      ]);
      setRevenue(rev);
      setReceivables(rec);
      setMethods(mtd);
    } catch {
      setRevenue([]);
      setReceivables([]);
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      revenue.reduce(
        (acc, r) => ({
          doanh_thu: acc.doanh_thu + Number(r.doanh_thu),
          hoan_tien: acc.hoan_tien + Number(r.hoan_tien),
          dong_tien: acc.dong_tien + Number(r.dong_tien),
        }),
        { doanh_thu: 0, hoan_tien: 0, dong_tien: 0 },
      ),
    [revenue],
  );

  const tongCongNo = useMemo(
    () => receivables.reduce((s, r) => s + Number(r.con_lai), 0),
    [receivables],
  );

  const columnData = useMemo(
    () =>
      revenue.flatMap((r) => [
        { thang: r.thang, loai: 'Doanh thu', gia_tri: Number(r.doanh_thu) },
        { thang: r.thang, loai: 'Dòng tiền ròng', gia_tri: Number(r.dong_tien) },
      ]),
    [revenue],
  );

  const pieData = useMemo(
    () =>
      methods.map((m) => ({
        type: PHUONG_THUC_LABEL[m.phuong_thuc] || m.phuong_thuc,
        value: Number(m.tong_tien),
      })),
    [methods],
  );

  const receivablesColumns = [
    { title: 'Mã đơn', dataIndex: 'MaDatCho', width: 80 },
    { title: 'Khách', dataIndex: 'ten_khach_hang' },
    { title: 'Tour', dataIndex: 'ten_tour' },
    { title: 'Tổng tiền', dataIndex: 'TongTien', render: fmtVND, width: 130 },
    { title: 'Đã cọc', dataIndex: 'DaDatCoc', render: fmtVND, width: 130 },
    {
      title: 'Còn nợ',
      dataIndex: 'con_lai',
      width: 130,
      render: (v) => <b className="text-orange-500">{fmtVND(v)}</b>,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <BarChartOutlined /> Báo cáo tài chính
        </Title>
        <Text type="secondary">
          Doanh thu, dòng tiền, công nợ và phân bổ theo phương thức thanh toán.
        </Text>
      </div>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Tổng doanh thu (thu vào)" value={totals.doanh_thu} formatter={fmtVND} valueStyle={{ color: '#4b4ee8' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Tổng hoàn tiền" value={totals.hoan_tien} formatter={fmtVND} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Dòng tiền ròng" value={totals.dong_tien} formatter={fmtVND} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Công nợ (chưa thu)" value={tongCongNo} formatter={fmtVND} valueStyle={{ color: '#fa8c16' }} prefix={<DollarOutlined />} />
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Card className="mb-4 shadow-card" bordered={false}>
            <Title level={4}>Doanh thu &amp; dòng tiền theo tháng</Title>
            {columnData.length === 0 ? (
              <Empty description="Chưa có giao dịch nào." />
            ) : (
              <Column
                data={columnData}
                xField="thang"
                yField="gia_tri"
                colorField="loai"
                group
                height={300}
                legend={{ color: { position: 'top' } }}
                axis={{ y: { labelFormatter: (v) => NGAN_XAC(v) } }}
                tooltip={{ channel: 'y', valueFormatter: (v) => fmtVND(v) }}
              />
            )}
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card className="shadow-card" bordered={false} title="Phân bổ theo phương thức">
                {pieData.length === 0 ? (
                  <Empty description="Chưa có giao dịch." className="py-8" />
                ) : (
                  <Pie
                    data={pieData}
                    angleField="value"
                    colorField="type"
                    innerRadius={0.55}
                    height={280}
                    legend={{ color: { position: 'bottom' } }}
                    label={{ text: 'type', position: 'outside' }}
                    tooltip={{ items: [{ field: 'value', valueFormatter: (v) => fmtVND(v) }] }}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card className="shadow-card" bordered={false} title="Công nợ (đơn đã cọc chưa thanh toán đủ)">
                <Table
                  rowKey="MaDatCho"
                  columns={receivablesColumns}
                  dataSource={receivables}
                  pagination={{ pageSize: 8 }}
                  size="small"
                  locale={{ emptyText: 'Không có công nợ nào.' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
