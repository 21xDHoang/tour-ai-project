import { Table } from 'antd';
import EmptyState from './EmptyState';

/**
 * Bảng dữ liệu của phần nhân viên.
 *
 * 27 trang nhân viên đều dựng bảng theo cùng một công thức nhưng mỗi nơi một
 * kiểu: chỗ thì `scroll={{x:1100}}`, chỗ `x:900`, chỗ không cuộn ngang; chỗ
 * phân trang, chỗ `pagination={false}` để bảng dài vô tận; 25 nơi copy nguyên
 * khối `flex justify-center py-16` + `<Spin size="large"/>` khi đang tải.
 *
 * Gộp lại một chỗ để những quyết định về mật độ, cuộn và trạng thái chờ chỉ
 * phải sửa một lần.
 *
 * QUAN TRỌNG — mọi prop lạ đều được chuyển tiếp xuống AntD Table qua `{...rest}`
 * đặt CUỐI CÙNG. Các trang đang dựa vào những prop khác nhau: `expandable`
 * (Chăm sóc khách), `onRow`, `rowClassName`, `rowKey` dạng hàm
 * (`(r) => r.lich.MaLich`), `pagination={false}`, `footer`. Một component bọc
 * nuốt mất prop là cách hỏng êm ái nhất của đợt refactor này, nên thứ tự spread
 * ở đây là ràng buộc kỹ thuật chứ không phải phong cách.
 *
 * BỀ RỘNG CỘT — bảng chạy `table-layout: fixed` và mỗi cột khai báo `width`
 * đúng bằng bề ngang của nó, không phải bề ngang tối thiểu. Con số đã đo được,
 * dùng lại thay vì ước lượng:
 *   cột "DD/MM/YYYY HH:mm"  148   (hẹp hơn là mất giờ, chỉ còn "28/08/2026 18:0")
 *   cột "DD/MM/YYYY"        118
 *   cột tiền VND            126   ("120.000.000 ₫" là chuỗi dài nhất)
 *   cột chip trạng thái     120   — bề ngang do CHUỖI DÀI NHẤT trong cột quyết
 *                                 định, không phải con số cố định: "Đang báo
 *                                 giá" vừa 120, nhưng "Chưa quyết toán" (16
 *                                 ký tự có dấu, màn Quyết toán) cần 140
 *   cột số 1–2 chữ số       100   — bề ngang do TIÊU ĐỀ quyết định, không phải
 *                                 nội dung: "Số khách" ở 76px là tiêu đề xuống
 *                                 hai dòng và cả hàng tiêu đề cao gấp đôi.
 *                                 Tiêu đề dài hơn thì phải rộng hơn: "Kinh
 *                                 nghiệm" cần 120 dù nội dung chỉ "10 năm"
 * Tổng các cột nên để dưới bề ngang vùng nội dung (~1110px ở màn 1440px): khai
 * báo thừa thì AntD kéo giãn cột không khai báo bề rộng, còn khai báo thiếu thì
 * hiện thanh cuộn ngang và cột ghim phải đè lên cột cuối.
 */
export default function BangDuLieu({
  rows = [],
  columns,
  rowKey,
  loading = false,
  empty = {},
  pageSize = 15,
  x = 'max-content',
  dense = false,
  sticky = false,
  className = '',
  pagination,
  ...rest
}) {
  const bang = {
    pageSize,
    showSizeChanger: true,
    showTotal: (tong, [tu, den]) => `${tu}–${den} / ${tong}`,
    size: 'small',
  };

  // Trộn thay vì ghi đè: trang nào tự chỉnh pageSize vẫn giữ được phần hiển thị
  // tổng số dòng. `pagination={false}` vẫn tắt được hẳn như cũ.
  const phanTrang =
    pagination === false ? false : { ...bang, ...(pagination || {}) };

  // Chỉ hiện khung xương ở lần tải ĐẦU. Những lần tải lại sau (đổi bộ lọc) giữ
  // nguyên bảng và để AntD phủ vòng xoay mờ lên trên — thay hẳn bảng bằng khung
  // xương ở mỗi thao tác lọc sẽ làm trang nhấp nháy liên tục.
  if (loading && rows.length === 0) {
    return <KhungXuongBang soCot={columns?.length || 5} />;
  }

  return (
    <Table
      size="small"
      rowKey={rowKey}
      dataSource={rows}
      columns={columns}
      loading={loading}
      scroll={{ x }}
      pagination={phanTrang}
      className={`bang-day ${dense ? 'day-chat' : ''} ${className}`}
      locale={{
        emptyText: (
          <EmptyState
            compact
            title={empty.title || 'Chưa có dữ liệu'}
            description={empty.description}
            action={empty.action}
          />
        ),
      }}
      {...(sticky ? { sticky: { offsetHeader: 64 } } : {})}
      {...rest}
    />
  );
}

/** Khung xương hình bảng — giữ đúng chiều cao để trang không nhảy khi dữ liệu về. */
function KhungXuongBang({ soCot }) {
  return (
    <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
      <div className="skeleton h-10 border-b border-ink-200" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-ink-100 px-3 py-3 last:border-b-0">
          {Array.from({ length: soCot }).map((_, c) => (
            <div
              key={c}
              className="skeleton h-3.5"
              style={{ width: c === 0 ? 64 : `${14 + ((i + c) % 3) * 6}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
