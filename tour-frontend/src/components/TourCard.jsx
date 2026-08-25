import { useNavigate } from 'react-router-dom';
import { Button, Card, Tag } from 'antd';
import { CalendarOutlined, CompassOutlined, TagsOutlined } from '@ant-design/icons';
import { fmtVND } from '../utils/format';

/** Ảnh đại diện tour: gradient theo mã tour (dữ liệu mẫu chưa có ảnh thật). */
function TourThumb({ tour }) {
  const palettes = [
    'from-sky-400 to-cyan-500',
    'from-emerald-400 to-teal-600',
    'from-violet-400 to-purple-600',
    'from-amber-400 to-orange-500',
  ];
  const cls = palettes[(tour.MaTour || 0) % palettes.length];
  return (
    <div
      className={`flex h-44 w-full items-center justify-center bg-gradient-to-br ${cls} text-6xl`}
    >
      🏝️
    </div>
  );
}

export default function TourCard({ tour }) {
  const navigate = useNavigate();
  const giaHienTai = tour.GiaKhuyenMai ?? tour.GiaCoBan;

  return (
    <Card
      hoverable
      className="overflow-hidden shadow-card"
      cover={<TourThumb tour={tour} />}
      onClick={() => navigate(`/tours/${tour.MaTour}`)}
    >
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center justify-between">
          <Tag color="blue" icon={<CompassOutlined />}>
            {tour.ten_diem_den || `Điểm đến #${tour.MaDiemDen}`}
          </Tag>
          <span className="text-xs text-slate-500">
            <CalendarOutlined /> {tour.SoNgay} ngày
          </span>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-slate-800">
          {tour.TenTour}
        </h3>

        <p className="line-clamp-2 flex-1 text-sm text-slate-500">
          {tour.MoTa || 'Chương trình tour hấp dẫn đang chờ bạn khám phá.'}
        </p>

        <div className="flex items-end justify-between border-t border-slate-100 pt-2">
          <div>
            {tour.GiaKhuyenMai != null &&
              tour.GiaKhuyenMai < tour.GiaCoBan && (
                <div className="text-xs text-slate-400 line-through">
                  {fmtVND(tour.GiaCoBan)}
                </div>
              )}
            <div className="text-lg font-bold text-indigo-600">
              {fmtVND(giaHienTai)}
            </div>
          </div>
          <Button type="primary" size="small" icon={<TagsOutlined />}>
            Xem chi tiết
          </Button>
        </div>
      </div>
    </Card>
  );
}
