import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { Check, Copy, Ticket } from 'lucide-react';
import dayjs from 'dayjs';
import { voucherApi } from '../api/http';
import EmptyState from '../components/ui/EmptyState';
import { LOAI_GIAM, fmtVND } from '../utils/format';

/**
 * Hai kiểu giảm giá dùng hai giọng màu khác nhau — cùng cách phân biệt với
 * ba loại tour, để khách nhận ra loại ưu đãi trước khi đọc chữ.
 */
const TONE_LOAI_GIAM = {
  PhanTram: 'chip bg-signal-50 text-signal-800 border-signal-200',
  Tien: 'chip bg-tide-50 text-tide-700 border-tide-100',
};

/** Trang Khuyến mãi & Voucher trên web khách (chỉ mã Active còn hạn). */
export default function KhuyenMai() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daChep, setDaChep] = useState(null);

  useEffect(() => {
    voucherApi
      .active()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const giamText = (v) =>
    v.LoaiGiam === 'PhanTram'
      ? `${Number(v.GiaTri)}%`
      : fmtVND(v.GiaTri);

  const chepMa = async (ma) => {
    try {
      await navigator.clipboard.writeText(ma);
      setDaChep(ma);
      message.success(`Đã sao chép mã ${ma}`);
      setTimeout(() => setDaChep(null), 2000);
    } catch {
      message.error(
        'Trình duyệt không cho phép sao chép tự động — bạn hãy bôi đen mã và copy.',
      );
    }
  };

  return (
    <div className="shell space-y-6 pb-28 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-m text-ink-950">
            Khuyến mãi &amp; voucher
          </h1>
          <p className="mt-1.5 max-w-prose text-body-s text-ink-600">
            Các mã đang hiệu lực. Chép mã rồi nhập ở bước xác nhận đặt chỗ để trừ
            thẳng vào giá tour.
          </p>
        </div>
        <button type="button" onClick={() => navigate('/tours')} className="btn btn-ink">
          Chọn tour để dùng mã
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel space-y-3 p-5">
              <div className="skeleton h-8 w-2/5" />
              <div className="skeleton h-4 w-3/5" />
              <div className="skeleton h-10 w-full" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Chưa có mã nào đang hiệu lực"
          description="Đợt ưu đãi gần nhất đã kết thúc. Để lại email ở chân trang để nhận mã mới trước khi công bố."
          action={
            <button type="button" onClick={() => navigate('/tours')} className="btn btn-guide">
              Xem danh sách tour
            </button>
          }
        />
      ) : (
        /* Mỗi voucher là một phiếu ưu đãi: giá trị là phần chữ lớn nhất vì đó
           là thứ khách đang tìm, đường kẻ đứt đóng vai đường xé, và mã nằm
           dưới đường xé — đúng chỗ người ta cầm phiếu lên để đọc mã. */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((v) => {
            const loai = LOAI_GIAM[v.LoaiGiam];
            return (
              <article key={v.MaGiamGia} className="panel flex flex-col overflow-hidden">
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="label-sign text-ink-500">Giảm giá</div>
                      <div className="tnum mt-1.5 font-display text-[34px] font-extrabold leading-none tracking-tight text-ink-950">
                        {giamText(v)}
                      </div>
                    </div>
                    {loai ? (
                      <span className={`chip shrink-0 ${TONE_LOAI_GIAM[v.LoaiGiam] || ''}`}>
                        {loai.label}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-body-s text-ink-600">
                    {v.MoTa || 'Áp dụng khi đặt tour trọn gói.'}
                  </p>
                </div>

                <div className="road-dash" aria-hidden="true" />

                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Ticket
                        className="h-3.5 w-3.5 shrink-0 text-ink-400"
                        aria-hidden="true"
                      />
                      <span className="label-sign text-ink-500">Mã</span>
                    </div>
                    {/* Mã là dữ liệu ngắn, đọc theo từng ký tự — giãn chữ để
                        không đọc nhầm, và dùng chữ số thẳng cột của hệ thống. */}
                    <div className="tnum mt-1 truncate font-display text-[19px] font-extrabold tracking-[0.1em] text-ink-950">
                      {v.MaCode}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => chepMa(v.MaCode)}
                    className={`btn shrink-0 ${
                      daChep === v.MaCode ? 'btn-guide' : 'btn-quiet'
                    } !px-3.5 !py-2 !text-[13px]`}
                  >
                    {daChep === v.MaCode ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                        Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Sao chép
                      </>
                    )}
                  </button>
                </div>

                <div className="tnum border-t border-ink-200 bg-paper-deep px-4 py-2 text-[12px] text-ink-500">
                  Hết hạn {dayjs(v.HanSuDung).format('DD/MM/YYYY')}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
