import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { bookingApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, fmtVND } from '../../utils/format';
import BangDuLieu from '../../components/ui/BangDuLieu';
import SectionHeader from '../../components/ui/SectionHeader';

/** Checklist chăm sóc khách trước/sau tour (Consultant). Ghi nhớ theo đơn. */
const CHECKLIST = [
  'Gọi xác nhận thông tin khách',
  'Nhắc lịch & điểm tập trung',
  'Gửi kế hoạch hành trình',
  'Hỏi thăm sau chuyến đi',
];

/** Khoá lưu trạng thái tick. KHÔNG đổi: dữ liệu cũ trong máy nhân viên phải
 *  đọc lại được, và dạng bản ghi vẫn là { [MaDatCho]: { b0: true, b2: true } }. */
const STORAGE_KEY = 'care_checklist_v1';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function ConsultantCare() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(() => loadState());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await bookingApi.listAll();
      const mine = (all || []).filter((o) => o.NguoiTaoID === user?.MaNguoiDung);
      setRows(mine);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.MaNguoiDung]);

  useEffect(() => {
    load();
  }, [load]);

  const saveDone = (next) => {
    setDone(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage có thể bị chặn — bỏ qua
    }
  };

  const toggle = (maDatCho, step) => {
    const cur = done[maDatCho] || {};
    saveDone({ ...done, [maDatCho]: { ...cur, [step]: !cur[step] } });
  };

  const visible = useMemo(() => {
    const today = dayjs().startOf('day');
    return rows
      .filter((o) => o.ngay_khoi_hanh)
      .filter((o) => {
        const k = dayjs(o.ngay_khoi_hanh);
        const diff = k.diff(today, 'day');
        // 7 ngày trước -> 14 ngày sau khởi hành
        return diff >= -7 && diff <= 14 && o.TrangThai !== 'DaHuy';
      })
      .sort((a, b) => dayjs(a.ngay_khoi_hanh) - dayjs(b.ngay_khoi_hanh));
  }, [rows]);

  const progress = (maDatCho) => {
    const st = done[maDatCho] || {};
    return CHECKLIST.filter((_, i) => st[`b${i}`]).length;
  };

  const conLai = visible.filter((r) => progress(r.MaDatCho) < CHECKLIST.length).length;

  /** Ô tick một bước: đủ nhỏ để bốn ô nằm gọn trong chiều cao một dòng. */
  const OCham = ({ maDatCho, i }) => {
    const xong = !!(done[maDatCho] || {})[`b${i}`];
    return (
      <button
        type="button"
        onClick={() => toggle(maDatCho, `b${i}`)}
        aria-pressed={xong}
        title={CHECKLIST[i]}
        className={`tnum h-7 w-7 rounded-sign border font-display text-[12px] font-bold transition ${
          xong
            ? 'border-guide-600 bg-guide-600 text-white'
            : 'border-ink-200 bg-white text-ink-600 hover:border-guide-200'
        }`}
      >
        {i + 1}
      </button>
    );
  };

  const columns = [
    {
      title: 'Khách',
      dataIndex: 'ten_khach_hang',
      width: 190,
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="text-[12px] text-ink-600">Đơn #{r.MaDatCho}</div>
        </div>
      ),
    },
    { title: 'Tour', dataIndex: 'ten_tour', ellipsis: true },
    {
      title: 'Khởi hành',
      dataIndex: 'ngay_khoi_hanh',
      width: 200,
      render: (v) => {
        const isUpcoming = dayjs(v).diff(dayjs().startOf('day'), 'day') >= 0;
        return (
          <div className="flex items-center gap-2">
            <span className="tnum whitespace-nowrap text-ink-700">{fmtDate(v)}</span>
            <span
              className={`chip !px-2 !py-0.5 !text-[11px] ${
                isUpcoming
                  ? 'border-signal-200 bg-signal-50 text-signal-700'
                  : 'border-ink-200 bg-paper-deep text-ink-600'
              }`}
            >
              {isUpcoming ? 'Sắp khởi hành' : 'Vừa kết thúc'}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      width: 130,
      align: 'right',
      render: (v) => <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>,
    },
    {
      title: 'Checklist',
      key: 'checklist',
      width: 160,
      render: (_, r) => (
        <div className="flex items-center gap-1.5">
          {CHECKLIST.map((_, i) => (
            <OCham key={i} maDatCho={r.MaDatCho} i={i} />
          ))}
        </div>
      ),
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 100,
      render: (_, r) => {
        const n = progress(r.MaDatCho);
        const xong = n === CHECKLIST.length;
        return (
          <span
            className={`chip tnum !px-2 !py-0.5 !text-[11px] ${
              xong
                ? 'border-guide-200 bg-guide-50 text-guide-700'
                : 'border-ink-200 bg-paper-deep text-ink-600'
            }`}
          >
            {n}/{CHECKLIST.length}
          </span>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <SectionHeader
        marker={String(conLai)}
        title="Chăm sóc trước/sau tour"
        description="Checklist nội bộ cho các đơn sắp khởi hành (trước 7 ngày → sau 14 ngày). Trạng thái tick được ghi nhớ trên trình duyệt của bạn, không chia sẻ cho nhân viên khác."
      />

      {/* Bốn bước in một lần ở đây thay vì lặp lại đủ bốn nhãn trên MỌI dòng.
          Chính phần lặp đó là thứ đẩy bảng rộng quá màn hình và biến mỗi dòng
          thành một khối chữ. Số trong ô tick tra theo dòng chú giải này. */}
      <ol className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-ink-200 bg-white px-4 py-3">
        {CHECKLIST.map((c, i) => (
          <li key={i} className="flex items-center gap-2 text-body-s text-ink-700">
            <span className="tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-sign bg-ink-950 font-display text-[11px] font-bold text-white">
              {i + 1}
            </span>
            {c}
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <BangDuLieu
          rows={visible}
          columns={columns}
          rowKey="MaDatCho"
          loading={loading}
          empty={{
            title: 'Chưa có đơn nào cần chăm sóc',
            description:
              'Chỉ những đơn khởi hành trong khoảng 7 ngày trước tới 14 ngày sau hôm nay mới hiện ở đây.',
          }}
        />
      </div>
    </div>
  );
}
