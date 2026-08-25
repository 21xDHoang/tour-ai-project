import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Empty,
  List,
  Row,
  Select,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BarChartOutlined,
  LikeOutlined,
  DislikeOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import { aiApi, reportApi, tourApi } from '../../api/http';
import { fmtVND } from '../../utils/format';

const { Title, Text, Paragraph } = Typography;

const NGAN_XAC = (v) => `₫${(v / 1_000_000).toFixed(1)}tr`;

const CAM_XUC_META = {
  TichCuc: { label: 'Tích cực', color: '#52c41a' },
  TrungLap: { label: 'Trung lập', color: '#faad14' },
  TieuCuc: { label: 'Tiêu cực', color: '#f5222d' },
};

/** Báo cáo phân tích AI (UC-12) + doanh thu theo tháng. */
export default function Dashboard() {
  const [revenue, setRevenue] = useState([]);
  const [revLoading, setRevLoading] = useState(true);

  const [analyses, setAnalyses] = useState([]); // các tour đã phân tích được
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [selectedMaTour, setSelectedMaTour] = useState(null);

  // ------------------------------ Doanh thu ------------------------------
  const loadRevenue = useCallback(async () => {
    setRevLoading(true);
    try {
      setRevenue(await reportApi.revenue());
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không tải được báo cáo doanh thu');
      setRevenue([]);
    } finally {
      setRevLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  // ------------------------------ Phân tích cảm xúc (UC-12) ------------------------------
  const loadAnalyses = useCallback(async () => {
    setAnalysesLoading(true);
    try {
      const tours = await tourApi.list();
      const results = await Promise.allSettled(
        tours.map((t) => aiApi.analyzeFeedback(t.MaTour)),
      );
      const ok = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          ok.push({ ...res.value, MaTour: tours[i].MaTour, TenTour: tours[i].TenTour });
        }
        // status rejected => tour chưa có phản hồi (404), bỏ qua
      });
      setAnalyses(ok);
      if (ok.length > 0) setSelectedMaTour((prev) => prev ?? ok[0].MaTour);
    } catch {
      setAnalyses([]);
    } finally {
      setAnalysesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const selected =
    analyses.find((a) => a.MaTour === selectedMaTour) || analyses[0] || null;

  // Dữ liệu biểu đồ cột: dạng "long" cho 2 series
  const columnData = useMemo(
    () =>
      revenue.flatMap((r) => [
        { thang: r.thang, loai: 'Doanh thu', gia_tri: Number(r.doanh_thu) },
        { thang: r.thang, loai: 'Dòng tiền ròng', gia_tri: Number(r.dong_tien) },
      ]),
    [revenue],
  );

  const pieData = useMemo(() => {
    const counts = { TichCuc: 0, TrungLap: 0, TieuCuc: 0 };
    analyses.forEach((a) => {
      if (counts[a.nhan_cam_xuc] !== undefined) counts[a.nhan_cam_xuc] += 1;
    });
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([key, value]) => ({
        type: CAM_XUC_META[key].label,
        value,
        color: CAM_XUC_META[key].color,
      }));
  }, [analyses]);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          📊 Báo cáo phân tích AI &amp; Tài chính
        </Title>
        <Text type="secondary">
          Doanh thu theo tháng, phân bổ cảm xúc từ phản hồi khách hàng (UC-12) và
          ưu/nhược điểm do AI bóc tách.
        </Text>
      </div>

      {/* ------------------------------ Thẻ tổng doanh thu ------------------------------ */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Tổng doanh thu (thu vào)"
              value={totals.doanh_thu}
              formatter={(v) => fmtVND(v)}
              valueStyle={{ color: '#4b4ee8' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Tổng hoàn tiền"
              value={totals.hoan_tien}
              formatter={(v) => fmtVND(v)}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Dòng tiền ròng"
              value={totals.dong_tien}
              formatter={(v) => fmtVND(v)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ------------------------------ Biểu đồ doanh thu ------------------------------ */}
      <Card className="mb-4 shadow-card" bordered={false}>
        <div className="mb-3 flex items-center gap-2">
          <BarChartOutlined className="text-lg text-indigo-500" />
          <Title level={4} className="!mb-0">
            Doanh thu &amp; dòng tiền theo tháng
          </Title>
        </div>
        {revLoading ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : columnData.length === 0 ? (
          <Empty description="Chưa có giao dịch nào." />
        ) : (
          <Column
            data={columnData}
            xField="thang"
            yField="gia_tri"
            colorField="loai"
            group
            height={320}
            legend={{ color: { position: 'top' } }}
            axis={{
              y: { labelFormatter: (v) => NGAN_XAC(v) },
            }}
            tooltip={{ channel: 'y', valueFormatter: (v) => fmtVND(v) }}
          />
        )}
      </Card>

      {/* ------------------------------ Cảm xúc + ưu/nhược điểm ------------------------------ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card className="shadow-card" bordered={false} title="Cảm xúc khách hàng (UC-12)">
            {analysesLoading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : pieData.length === 0 ? (
              <Empty description="Chưa có phản hồi nào để phân tích." className="py-8" />
            ) : (
              <Pie
                data={pieData}
                angleField="value"
                colorField="type"
                innerRadius={0.55}
                height={280}
                legend={{ color: { position: 'bottom' } }}
                scale={{ color: { range: pieData.map((d) => d.color) } }}
                label={{ text: 'value', position: 'outside' }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            className="shadow-card"
            bordered={false}
            title={
              <span>
                <RobotOutlined /> Ưu &amp; nhược điểm do AI bóc tách
              </span>
            }
            extra={
              analyses.length > 0 && (
                <Select
                  style={{ width: 280 }}
                  value={selected?.MaTour}
                  onChange={setSelectedMaTour}
                  options={analyses.map((a) => ({
                    value: a.MaTour,
                    label: `${a.TenTour} — ${CAM_XUC_META[a.nhan_cam_xuc]?.label}`,
                  }))}
                />
              )
            }
          >
            {analysesLoading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : !selected ? (
              <Empty description="Tour chưa có phản hồi để phân tích." className="py-8" />
            ) : (
              <div>
                {selected.nguon === 'Fallback' && (
                  <Alert
                    className="mb-3"
                    type="warning"
                    showIcon
                    message="Gemini tạm không khả dụng — kết quả tính theo điểm trung bình (Fallback)."
                  />
                )}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Tag color={CAM_XUC_META[selected.nhan_cam_xuc]?.color}>
                    Cảm xúc: {CAM_XUC_META[selected.nhan_cam_xuc]?.label}
                  </Tag>
                  <Text type="secondary">({selected.TenTour})</Text>
                </div>

                <Paragraph className="rounded-xl bg-slate-50 p-3 italic text-slate-600">
                  “{selected.tong_ket}”
                </Paragraph>

                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <div className="rounded-xl border border-green-100 bg-green-50 p-3">
                      <Title level={5} className="!mb-2 text-green-700">
                        <LikeOutlined /> Ưu điểm
                      </Title>
                      <List
                        size="small"
                        dataSource={selected.uu_diem}
                        renderItem={(item) => (
                          <List.Item className="!border-0 !py-1">
                            <Text className="text-green-800">✅ {item}</Text>
                          </List.Item>
                        )}
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                      <Title level={5} className="!mb-2 text-red-700">
                        <DislikeOutlined /> Nhược điểm
                      </Title>
                      <List
                        size="small"
                        dataSource={selected.nhuoc_diem}
                        renderItem={(item) => (
                          <List.Item className="!border-0 !py-1">
                            <Text className="text-red-800">⚠️ {item}</Text>
                          </List.Item>
                        )}
                      />
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
