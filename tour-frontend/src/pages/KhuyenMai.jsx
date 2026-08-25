import { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Row, Spin, Tag, Typography } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { voucherApi } from '../api/http';
import { LOAI_GIAM, fmtVND } from '../utils/format';

const { Title, Text } = Typography;

/** Trang Khuyến mãi & Voucher trên web khách (chỉ mã Active còn hạn). */
export default function KhuyenMai() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voucherApi
      .active()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const giamText = (v) => {
    const l = LOAI_GIAM[v.LoaiGiam];
    return v.LoaiGiam === 'PhanTram' ? `Giảm ${Number(v.GiaTri)}%` : `Giảm ${fmtVND(v.GiaTri)}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 text-center">
        <Title level={2} className="!mb-1">
          <GiftOutlined className="mr-1 text-indigo-600" /> Khuyến mãi &amp; Voucher
        </Title>
        <Text type="secondary">
          Cập nhật các mã giảm giá đang hiệu lực. Nhập mã khi thanh toán đơn hàng.
        </Text>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : rows.length === 0 ? (
        <Empty description="Hiện chưa có khuyến mãi nào đang hiệu lực." />
      ) : (
        <Row gutter={[16, 16]}>
          {rows.map((v) => (
            <Col xs={24} sm={12} lg={8} key={v.MaGiamGia}>
              <Card className="shadow-card" bordered={false}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-1 font-mono text-lg font-bold tracking-wider text-white">
                    {v.MaCode}
                  </span>
                  <Tag color={LOAI_GIAM[v.LoaiGiam]?.color}>
                    {LOAI_GIAM[v.LoaiGiam]?.label}
                  </Tag>
                </div>
                <Title level={4} className="!mb-1 !text-indigo-600">
                  {giamText(v)}
                </Title>
                <Text type="secondary" className="text-sm">
                  {v.MoTa || 'Mã giảm giá áp dụng khi đặt tour.'}
                </Text>
                <div className="mt-3 flex items-center justify-between">
                  <Text type="secondary" className="text-xs">
                    HSD: {dayjs(v.HanSuDung).format('DD/MM/YYYY')}
                  </Text>
                  <Button size="small" type="primary" ghost>
                    Sao chép mã
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
