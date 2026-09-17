import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtVND } from '../utils/format';
import { signOf } from '../utils/signs';
import { getTourImage } from '../utils/tourImages';
import SignBar from './ui/SignBar';

/**
 * Thẻ tour.
 *
 * Thay cụm 5 badge chồng lên ảnh ở bản cũ bằng một thanh biển báo duy nhất
 * ở mép trên: chevron màu theo loại hành trình, địa danh, và số ngày.
 *
 * Toàn bộ thẻ là một <Link> thật nên bấm chuột giữa, Tab và Enter đều hoạt
 * động. Bản cũ là <div onClick> chứa một <Button> lồng bên trong — vừa mất
 * ngữ nghĩa vừa lồng hai phần tử tương tác vào nhau.
 */
export default function TourCard({ tour }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const giaHienTai = tour.GiaKhuyenMai ?? tour.GiaCoBan;
  const hasDiscount =
    tour.GiaKhuyenMai != null && tour.GiaKhuyenMai < tour.GiaCoBan;
  const discountPercent = hasDiscount
    ? Math.round(((tour.GiaCoBan - tour.GiaKhuyenMai) / tour.GiaCoBan) * 100)
    : 0;

  const sign = signOf(tour.LoaiTour);
  const diemDen = tour.ten_diem_den || `Điểm đến #${tour.MaDiemDen}`;
  const soDem = tour.SoNgay > 1 ? `${tour.SoNgay - 1} đêm` : null;

  return (
    <Link
      to={`/tours/${tour.MaTour}`}
      className="group panel flex h-full flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-200 ease-road hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-press"
    >
      {/* Thanh biển báo — dải nhận diện chạy ngang mép trên mỗi thẻ.
          Chỉ mang hai thứ: địa danh (khối màu, mắt bắt được trước) và số ngày.
          Nhãn loại tour không lọt vào đây được — thẻ chỉ rộng ~300px, nhét đủ
          bốn mẩu thì mẩu nào cũng bị cắt. Nó xuống thân thẻ, xem bên dưới. */}
      <SignBar
        tone={sign.tone}
        size="sm"
        mark={diemDen}
        meta={`${tour.SoNgay}N${soDem ? ` ${tour.SoNgay - 1}Đ` : ''}`}
      />

      {/* Ảnh */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
        {!imgLoaded ? (
          <div className="skeleton absolute inset-0" aria-hidden="true" />
        ) : null}
        <img
          src={getTourImage(tour)}
          alt={tour.TenTour}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover transition-[opacity,transform] duration-700 ease-road group-hover:scale-[1.04] ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Ưu đãi — chỉ hiện khi giá thật sự đang giảm. */}
        {hasDiscount ? (
          <span className="label-sign tnum absolute right-2.5 top-2.5 rounded-sign bg-signal-400 px-2 py-1.5 text-ink-950 shadow-press-sm">
            −{discountPercent}%
          </span>
        ) : null}
      </div>

      {/* Nội dung */}
      <div className="flex flex-1 flex-col p-4">
        {/* Loại hành trình — chấm màu kèm chữ, không dựa vào màu một mình.
            Đặt ở đây chứ không ở thanh biển báo vì thẻ không đủ bề ngang. */}
        <div className="mb-2 flex items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${sign.dotCls}`}
            aria-hidden="true"
          />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">
            {sign.label}
          </span>
        </div>

        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink-950 transition-colors group-hover:text-guide-500">
          {tour.TenTour}
        </h3>

        <p className="mt-1.5 line-clamp-2 flex-1 text-body-s text-ink-600">
          {tour.MoTa ||
            'Hành trình trọn gói gồm di chuyển, lưu trú, ăn uống và hướng dẫn viên.'}
        </p>

        {/* Chân thẻ: giá bên trái, lối vào bên phải. */}
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-ink-200 pt-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-ink-500">
              Giá trọn gói từ
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-lg font-extrabold tnum text-ink-950">
                {fmtVND(giaHienTai)}
              </span>
              {hasDiscount ? (
                <span className="text-[12px] text-ink-500 line-through tnum">
                  {fmtVND(tour.GiaCoBan)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Không phải nút — cả thẻ đã là link, đây chỉ là dấu hiệu chỉ hướng. */}
          <span
            className="flex shrink-0 items-center gap-1 pb-1 font-display text-[12px] font-bold text-guide-500"
            aria-hidden="true"
          >
            Xem
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 ease-road group-hover:translate-x-1"
            >
              <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Khung xương khi danh sách tour đang tải — giữ đúng nhịp của thẻ thật. */
export function TourCardSkeleton() {
  return (
    <div className="panel overflow-hidden">
      <div className="skeleton h-8 w-full" />
      <div className="skeleton aspect-[16/10] w-full" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-3/5 rounded" />
        <div className="flex items-center justify-between border-t border-ink-200 pt-3">
          <div className="skeleton h-5 w-28 rounded" />
          <div className="skeleton h-4 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}
