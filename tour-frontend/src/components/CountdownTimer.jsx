import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Đồng hồ đếm ngược thời hạn giữ chỗ 24h (DR-02).
 *
 * Props:
 *  - hanGiuCho: chuỗi ISO datetime của HanGiuCho
 *  - onExpire : gọi khi đếm về 0
 *
 * - Còn dưới 2 giờ: chuyển màu đỏ nhấp nháy.
 * - Về 0: hiển thị "Hết hạn giữ chỗ".
 */
export default function CountdownTimer({ hanGiuCho, onExpire }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, dayjs(hanGiuCho).diff(dayjs(), 'second')),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const secs = Math.max(0, dayjs(hanGiuCho).diff(dayjs(), 'second'));
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(id);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [hanGiuCho, onExpire]);

  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center rounded-sign bg-stop-50 px-2 py-1 font-display text-[12px] font-bold text-stop-700">
        Hết hạn giữ chỗ
      </span>
    );
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const danger = remaining < 2 * 3600; // < 2 giờ

  return (
    <span
      className={`tnum font-display text-lg font-extrabold ${
        danger ? 'pulse-mark text-stop-500' : 'text-guide-500'
      }`}
      title={`Còn lại ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
    >
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
