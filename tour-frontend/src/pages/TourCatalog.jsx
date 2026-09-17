import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Col, Input, Row, Select } from 'antd';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';
import { tourApi } from '../api/http';
import TourCard, { TourCardSkeleton } from '../components/TourCard';
import SignBar from '../components/ui/SignBar';
import EmptyState from '../components/ui/EmptyState';
import { khuVucLabel, LOAI_TOUR } from '../utils/format';
import { signOf } from '../utils/signs';

const GIA_OPTIONS = [
  { value: 2000000, label: 'Dưới 2.000.000đ' },
  { value: 3000000, label: 'Dưới 3.000.000đ' },
  { value: 5000000, label: 'Dưới 5.000.000đ' },
  { value: 10000000, label: 'Dưới 10.000.000đ' },
];

const SO_NGAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  value: n,
  label: `${n} ngày`,
}));

export default function TourCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState(searchParams.get('tu_khoa') || '');
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
    const newParams = new URLSearchParams(searchParams);
    if (v) {
      newParams.set('loai', v);
    } else {
      newParams.delete('loai');
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setTuKhoa('');
    setKhuVuc(undefined);
    setGiaToiDa(undefined);
    setSoNgay(undefined);
    setLoai(undefined);
    setSearchParams({});
  };

  const khuVucOptions = useMemo(() => {
    const seen = new Set();
    return destinations
      .filter((d) => {
        if (!d.KhuVuc || seen.has(d.KhuVuc)) return false;
        seen.add(d.KhuVuc);
        return true;
      })
      .map((d) => ({
        value: d.KhuVuc,
        label: `Khu vực: ${khuVucLabel(d.KhuVuc)}`,
      }));
  }, [destinations]);

  const hasFilters = tuKhoa || khuVuc || giaToiDa || soNgay || loaiTour;

  return (
    <div className="space-y-8 pb-16">
      {/* Đầu trang — nền giấy, mở bằng một thanh biển báo xanh chỉ hướng.
          Bản cũ là một dải gradient xanh đen, thứ ai cũng dùng cho mọi ngành. */}
      <section className="border-b border-ink-200 bg-paper pb-8 pt-6">
        <div className="shell">
          <SignBar
            tone="guide"
            mark="DANH MỤC"
            place="Toàn quốc · mọi cung đường"
            meta={`${tours.length} TOUR`}
          />

          <h1 className="mt-5 font-display text-display-m font-extrabold text-ink-950">
            Khám phá toàn bộ tour
          </h1>
          <p className="mt-2 max-w-prose text-body-s text-ink-600">
            Lọc theo sở thích, khu vực và ngân sách. Giữ chỗ 24 giờ miễn phí, nhận
            tư vấn lịch trình tức thì.
          </p>
        </div>
      </section>

      <div className="shell space-y-6">
        {/* Lọc theo loại hành trình. `aria-pressed` vừa là trạng thái cho trình
            đọc màn hình, vừa là móc để CSS tô nền mực cho nút đang chọn. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="chip-filter"
            aria-pressed={!loaiTour}
            onClick={() => setLoai(undefined)}
          >
            Tất cả tour
          </button>
          {Object.entries(LOAI_TOUR).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className="chip-filter"
              aria-pressed={loaiTour === value}
              onClick={() => setLoai(value)}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${signOf(value).dotCls}`}
                aria-hidden="true"
              />
              {label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="panel p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined className="text-ink-400" />}
              placeholder="Từ khóa (Hạ Long, Đà Nẵng...)"
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              className="!rounded-field"
            />
            <Select
              allowClear
              size="large"
              placeholder="Khu vực điểm đến"
              value={khuVuc}
              onChange={setKhuVuc}
              options={khuVucOptions}
              className="w-full !rounded-field"
            />
            <Select
              allowClear
              size="large"
              placeholder="Mức giá tối đa"
              value={giaToiDa}
              onChange={setGiaToiDa}
              options={GIA_OPTIONS}
              className="w-full !rounded-field"
            />
            <Select
              allowClear
              size="large"
              placeholder="Số ngày tour"
              value={soNgay}
              onChange={setSoNgay}
              options={SO_NGAY_OPTIONS}
              className="w-full !rounded-field"
            />
          </div>

          {hasFilters && (
            <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3 text-xs">
              <span className="text-ink-500">
                Đang lọc kết quả theo tiêu chí đã chọn
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 font-semibold text-stop-500 hover:text-stop-600"
              >
                <ClearOutlined /> Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Danh sách tour */}
        <div>
          <h3 className="mb-4 font-display text-lg font-bold text-ink-950">
            {tours.length} tour phù hợp
          </h3>

          {loading ? (
            <Row gutter={[24, 24]}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Col key={i} xs={24} sm={12} lg={8} xl={6}>
                  <TourCardSkeleton />
                </Col>
              ))}
            </Row>
          ) : tours.length === 0 ? (
            <EmptyState
              title="Không tìm thấy tour phù hợp"
              description="Thử đổi từ khóa tìm kiếm, hoặc xóa bộ lọc để xem lại toàn bộ danh sách."
              action={
                <button type="button" onClick={handleResetFilters} className="btn btn-guide">
                  Xem tất cả tour
                </button>
              }
            />
          ) : (
            <Row gutter={[24, 24]}>
              {tours.map((t) => (
                <Col key={t.MaTour} xs={24} sm={12} lg={8} xl={6}>
                  <TourCard tour={t} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>
    </div>
  );
}
