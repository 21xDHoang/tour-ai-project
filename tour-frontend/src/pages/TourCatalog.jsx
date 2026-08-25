import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Col, Empty, Input, Row, Select, Spin, Typography } from 'antd';
import { CompassOutlined, SearchOutlined } from '@ant-design/icons';
import { tourApi } from '../api/http';
import TourCard from '../components/TourCard';
import { LOAI_TOUR } from '../utils/format';

const { Title, Text } = Typography;

const GIA_OPTIONS = [
  { value: 2000000, label: 'Dưới 2 triệu' },
  { value: 3000000, label: 'Dưới 3 triệu' },
  { value: 5000000, label: 'Dưới 5 triệu' },
  { value: 10000000, label: 'Dưới 10 triệu' },
];

const SO_NGAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  value: n,
  label: `${n} ngày`,
}));

/** Danh mục tour — lọc theo loại hình + tìm kiếm, hiển thị toàn bộ tour. */
export default function TourCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState('');
  const [khuVuc, setKhuVuc] = useState(undefined);
  const [giaToiDa, setGiaToiDa] = useState(undefined);
  const [soNgay, setSoNgay] = useState(undefined);
  const [loaiTour, setLoaiTour] = useState(searchParams.get('loai') || undefined);

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (tuKhoa) params.tu_khoa = tuKhoa;
      if (khuVuc) params.khu_vuc = khuVuc;
      if (giaToiDa) params.gia_toi_da = giaToiDa;
      if (soNgay) params.so_ngay = soNgay;
      if (loaiTour) params.loai_tour = loaiTour;
      const data = await tourApi.list(params);
      setTours(data);
    } catch {
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, [tuKhoa, khuVuc, giaToiDa, soNgay, loaiTour]);

  useEffect(() => {
    tourApi
      .destinations()
      .then((rows) => setDestinations(rows))
      .catch(() => {});
    fetchTours();
  }, [fetchTours]);

  const setLoai = (v) => {
    setLoaiTour(v);
    setSearchParams(v ? { loai: v } : {});
  };

  const khuVucOptions = useMemo(() => {
    const seen = new Set();
    return destinations
      .filter((d) => {
        if (seen.has(d.KhuVuc)) return false;
        seen.add(d.KhuVuc);
        return true;
      })
      .map((d) => ({ value: d.KhuVuc, label: d.KhuVuc }));
  }, [destinations]);

  const chipCls = (active) =>
    `rounded-full border px-4 py-1.5 text-sm transition ${
      active
        ? 'border-indigo-500 bg-indigo-600 text-white'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4">
        <Title level={2} className="!mb-1">
          <CompassOutlined className="mr-1 text-indigo-600" /> Danh mục tour
        </Title>
        <Text type="secondary">
          Lọc tour theo loại hình, khu vực, ngân sách và số ngày phù hợp.
        </Text>
      </div>

      {/* Loại hình du lịch */}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chipCls(!loaiTour)} onClick={() => setLoai(undefined)}>
          Tất cả
        </button>
        {Object.entries(LOAI_TOUR).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={chipCls(loaiTour === value)}
            onClick={() => setLoai(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bộ lọc tìm kiếm */}
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Input
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          placeholder="Từ khóa (vd: Ha Long, Đà Lạt...)"
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
        />
        <Select
          allowClear
          size="large"
          placeholder="Khu vực / Điểm đến"
          value={khuVuc}
          onChange={setKhuVuc}
          options={khuVucOptions}
        />
        <Select
          allowClear
          size="large"
          placeholder="Mức giá tối đa"
          value={giaToiDa}
          onChange={setGiaToiDa}
          options={GIA_OPTIONS}
        />
        <Select
          allowClear
          size="large"
          placeholder="Số ngày"
          value={soNgay}
          onChange={setSoNgay}
          options={SO_NGAY_OPTIONS}
        />
      </div>

      {/* Danh sách tour */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <Title level={3} className="!mb-0">
            Tour du lịch
          </Title>
          <Text type="secondary">{tours.length} tour</Text>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : tours.length === 0 ? (
          <Empty description="Không tìm thấy tour phù hợp" className="py-16" />
        ) : (
          <Row gutter={[16, 16]}>
            {tours.map((t) => (
              <Col key={t.MaTour} xs={24} sm={12} lg={8} xl={6}>
                <TourCard tour={t} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
