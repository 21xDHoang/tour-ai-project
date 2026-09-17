import { useCallback, useEffect, useState } from 'react';
import { dashboardApi } from '../../api/http';
import { VAI_TRO_LABEL } from '../../utils/format';
import { vaiTroPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import SectionHeader from '../../components/ui/SectionHeader';

/** Một cột số của bảng KPI: canh phải để các chữ số thẳng hàng dọc. */
const cotSo = (title, dataIndex, width = 110) => ({
  title,
  dataIndex,
  width,
  align: 'right',
  render: (v) => <span className="tnum">{v ?? 0}</span>,
});

/** Bảng KPI nhân viên (Admin). */
export default function Kpi() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  /**
   * Bảng rỗng vì máy chủ không trả lời khác với bảng rỗng vì chưa ai phát sinh
   * lead hay đơn — câu "chưa có dữ liệu KPI" chỉ đúng ở trường hợp thứ hai.
   */
  const [loi, setLoi] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoi(false);
    try {
      setRows(await dashboardApi.kpiConsultants());
    } catch {
      setRows([]);
      setLoi(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Sáu cột số gộp thành ba nhóm có tiêu đề.
   *
   * Bản cũ để sáu tiêu đề phẳng cạnh nhau, và bốn trong số đó mở đầu bằng cùng
   * một danh từ ("Lead phụ trách", "Lead đang chốt", "Đơn đã tạo", "Đơn thanh
   * toán đủ"). Người đọc phải quét hết cả dòng tiêu đề mới biết cột nào thuộc
   * về cái gì. Gom lại thì mỗi danh từ chỉ còn in một lần, và mắt đọc theo
   * nhóm: người này mạnh ở lead hay ở đơn.
   *
   * Không cột nào mất `dataIndex` — chỉ tiêu đề đổi cách trình bày.
   */
  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'HoTen',
      width: 200,
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    {
      title: 'Vai trò',
      dataIndex: 'VaiTro',
      width: 140,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${vaiTroPill(v)}`}>
          {VAI_TRO_LABEL[v] || v}
        </span>
      ),
    },
    {
      title: 'Lead',
      children: [
        cotSo('Phụ trách', 'so_lead'),
        cotSo('Đang chốt', 'lead_dang_chot'),
      ],
    },
    {
      title: 'Đơn đặt chỗ',
      children: [
        cotSo('Đã tạo', 'so_don'),
        cotSo('Thanh toán đủ', 'so_don_da_thanh_toan', 130),
      ],
    },
    {
      title: 'Tour thiết kế riêng',
      children: [
        cotSo('Đang xử lý', 'so_tour_rieng'),
        cotSo('Đã chốt', 'tour_rieng_da_chot'),
      ],
    },
  ];

  // Bề rộng tối thiểu = tổng bề rộng các cột lá, để AntD dùng `table-layout:
  // fixed`. Cột nhóm chỉ có tiêu đề nên không tính vào tổng.
  const rongBang = columns.reduce(
    (s, c) => s + (c.children ? c.children.reduce((t, x) => t + (x.width || 0), 0) : c.width || 0),
    0,
  );

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading || loi ? null : String(rows.length)}
        title="KPI nhân viên"
        description="Tổng hợp năng suất của từng tư vấn viên: lead, đơn đặt chỗ và tour thiết kế riêng."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaNguoiDung"
          x={rongBang}
          loading={loading}
          empty={
            loi
              ? {
                  title: 'Không tải được bảng KPI',
                  description: 'Máy chủ không trả về số liệu tổng hợp. Kiểm tra kết nối rồi thử lại.',
                  action: (
                    <button type="button" className="btn btn-ink" onClick={load}>
                      Thử lại
                    </button>
                  ),
                }
              : {
                  title: 'Chưa có dữ liệu KPI',
                  description: 'Bảng tổng hợp xuất hiện khi có nhân viên phát sinh lead hoặc đơn.',
                }
          }
        />
      </div>
    </div>
  );
}
