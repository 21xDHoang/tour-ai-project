/**
 * Đầu mục — dấu mốc + tiêu đề + vạch kẻ chạy tới mép phải.
 *
 * Cố ý KHÔNG có dòng chữ IN HOA nhỏ nằm trên tiêu đề. Bản cũ có một eyebrow
 * như vậy ở mọi khối, lặp lại năm lần trên trang chủ mà không mang thêm
 * thông tin gì. Ở đây dấu mốc tự mang thông tin thật (số lượng tour, số cung
 * đường), còn tiêu đề tự đứng một mình.
 *
 * Căn trái toàn bộ: biển báo được đọc từ một mép cố định, không căn giữa.
 */
export default function SectionHeader({
  title,
  marker,
  description,
  action,
  as: Heading = 'h2',
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          {/* Dấu mốc: ô vuông mực nhỏ, mang số liệu thật chứ không phải số thứ tự trang trí. */}
          {marker ? (
            <span className="label-sign tnum shrink-0 rounded-sign bg-ink-950 px-2 py-1.5 text-white">
              {marker}
            </span>
          ) : null}
          <Heading className="font-display text-display-m text-ink-950">
            {title}
          </Heading>
        </div>

        {description ? (
          <p className="mt-2.5 max-w-prose text-body-s text-ink-600">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
