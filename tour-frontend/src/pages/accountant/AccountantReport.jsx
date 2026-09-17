import { useCallback, useEffect, useMemo, useState } from 'react';
import { Column, Pie } from '@ant-design/plots';
import { reportApi } from '../../api/http';
import { fmtSo, fmtVND } from '../../utils/format';
import { CHART_COLORS, MAU_DONG_TIEN } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import ChiSoRail, { ChiSo, KhungChiSo } from '../../components/ui/ChiSo';
import EmptyState from '../../components/ui/EmptyState';
import Khoi, { KhungBieuDo } from '../../components/ui/Khoi';
import SectionHeader from '../../components/ui/SectionHeader';

const NGAN_XAC = (v) => `₫${(v / 1_000_000).toFixed(1)}tr`;

const PHUONG_THUC_LABEL = {
  TienMat: 'Tiền mặt',
  ChuyenKhoan: 'Chuyển khoản',
  The: 'Thẻ',
};

/** Báo cáo tài chính (Kế toán): doanh thu, công nợ, phân bổ theo phương thức. */
export default function AccountantReport() {
  const [revenue, setRevenue] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Ba lời gọi trên cùng hỏng thì cả ba mảng đều rỗng, và trang sẽ tự vẽ ra một
   * dải "0 ₫" kèm câu "Chưa có giao dịch nào" — tức là khẳng định doanh thu bằng
   * không, trong khi sự thật chỉ là không đọc được số liệu. Hai chuyện đó phải
   * nói khác nhau, nên trạng thái hỏng được ghi nhận riêng chứ không suy ra từ
   * mảng rỗng.
   */
  const [loi, setLoi] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoi(false);
    try {
      const [rev, rec, mtd] = await Promise.all([
        reportApi.revenue(),
        reportApi.receivables(),
        reportApi.paymentMethods(),
      ]);
      setRevenue(rev);
      setReceivables(rec);
      setMethods(mtd);
    } catch {
      setRevenue([]);
      setReceivables([]);
      setMethods([]);
      setLoi(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      revenue.reduce(
        (acc, r) => ({
          doanh_thu: acc.doanh_thu + Number(r.doanh_thu),
          hoan_tien: acc.hoan_tien + Number(r.hoan_tien),
          dong_tien: acc.dong_tien + Number(r.dong_tien),
        }),
        { doanh_thu: 0, hoan_tien: 0, dong_tien: 0 },
      ),
    [revenue],
  );

  const tongCongNo = useMemo(
    () => receivables.reduce((s, r) => s + Number(r.con_lai), 0),
    [receivables],
  );

  const columnData = useMemo(
    () =>
      revenue.flatMap((r) => [
        { thang: r.thang, loai: 'Doanh thu', gia_tri: Number(r.doanh_thu) },
        { thang: r.thang, loai: 'Dòng tiền ròng', gia_tri: Number(r.dong_tien) },
      ]),
    [revenue],
  );

  const pieData = useMemo(
    () =>
      methods.map((m) => ({
        type: PHUONG_THUC_LABEL[m.phuong_thuc] || m.phuong_thuc,
        value: Number(m.tong_tien),
      })),
    [methods],
  );

  const receivablesColumns = [
    {
      title: 'Mã đơn',
      dataIndex: 'MaDatCho',
      width: 74,
      render: (v) => <span className="tnum font-semibold text-ink-950">#{v}</span>,
    },
    { title: 'Khách', dataIndex: 'ten_khach_hang', width: 140, ellipsis: true },
    { title: 'Tour', dataIndex: 'ten_tour', width: 180, ellipsis: true },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      render: (v) => <span className="tnum">{fmtVND(v)}</span>,
      width: 125,
      align: 'right',
    },
    {
      title: 'Đã cọc',
      dataIndex: 'DaDatCoc',
      render: (v) => <span className="tnum">{fmtVND(v)}</span>,
      width: 125,
      align: 'right',
    },
    {
      title: 'Còn nợ',
      dataIndex: 'con_lai',
      width: 125,
      align: 'right',
      render: (v) => <span className="tnum font-semibold text-signal-700">{fmtVND(v)}</span>,
    },
  ];

  const rongBang = receivablesColumns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading || loi ? null : `${receivables.length} đơn`}
        title="Báo cáo tài chính"
        description="Doanh thu và dòng tiền theo tháng, công nợ chưa thu, phân bổ theo phương thức thanh toán."
      />

      {loi ? (
        // Một lời gọi hỏng là cả ba khối cùng mất số liệu, nên thay cả trang bằng
        // một lời báo hỏng thay vì để ba khối trống tự nói sai về việc kinh doanh.
        <EmptyState
          className="mt-6"
          title="Không tải được báo cáo"
          description="Máy chủ không trả về số liệu doanh thu, công nợ và phương thức thanh toán. Kiểm tra kết nối rồi thử lại."
          action={
            <button type="button" className="btn btn-ink" onClick={load}>
              Thử lại
            </button>
          }
        />
      ) : (
        <>
          {loading ? (
            <KhungChiSo cot={4} className="mt-6" />
          ) : (
            <ChiSoRail cot={4} className="mt-6">
              <ChiSo nhan="Doanh thu thu vào" giaTri={fmtSo(totals.doanh_thu)} donVi="₫" />
              <ChiSo nhan="Tổng hoàn tiền" giaTri={fmtSo(totals.hoan_tien)} donVi="₫" />
              <ChiSo nhan="Dòng tiền ròng" giaTri={fmtSo(totals.dong_tien)} donVi="₫" manh />
              <ChiSo
                nhan="Công nợ chưa thu"
                giaTri={fmtSo(tongCongNo)}
                donVi="₫"
                phu={`Còn lại của ${receivables.length} đơn đã cọc`}
              />
            </ChiSoRail>
          )}

          <Khoi tieuDe="Doanh thu & dòng tiền theo tháng" className="mt-6">
            {loading ? (
              <KhungBieuDo cao={300} />
            ) : columnData.length === 0 ? (
              <EmptyState
                title="Chưa có giao dịch nào"
                description="Biểu đồ hiện ra ngay khi có khoản thu đầu tiên được ghi nhận."
              />
            ) : (
              <div className="panel p-4">
                <Column
                  data={columnData}
                  xField="thang"
                  yField="gia_tri"
                  colorField="loai"
                  group
                  height={300}
                  scale={{ color: { range: MAU_DONG_TIEN } }}
                  legend={{ color: { position: 'top' } }}
                  axis={{ y: { labelFormatter: (v) => NGAN_XAC(v) } }}
                  tooltip={{ channel: 'y', valueFormatter: (v) => fmtVND(v) }}
                />
              </div>
            )}
          </Khoi>

          {/* Bảng công nợ đứng một mình một hàng, không chia cột với biểu đồ tròn.
              Chia đôi thì ở màn 1440px bảng chỉ được ~640px trong khi sáu cột cần
              ~770px, và cột "Còn nợ" — cột đúng là lý do bảng này tồn tại — bị
              đẩy ra ngoài tầm nhìn. */}
          <Khoi
            tieuDe="Công nợ chưa thu"
            dem={loading ? null : `${receivables.length} đơn`}
            className="mt-6"
          >
            <BangDuLieu
              rows={receivables}
              columns={receivablesColumns}
              rowKey="MaDatCho"
              x={rongBang}
              loading={loading}
              pageSize={8}
              empty={{
                title: 'Không có công nợ nào',
                description: 'Mọi đơn đã cọc đều đã được thanh toán đủ.',
              }}
            />
          </Khoi>

          <Khoi tieuDe="Phân bổ theo phương thức" className="mt-6">
            {loading ? (
              <KhungBieuDo cao={280} />
            ) : pieData.length === 0 ? (
              <EmptyState
                title="Chưa có giao dịch"
                description="Phân bổ theo tiền mặt, chuyển khoản và thẻ sẽ hiện ở đây."
              />
            ) : (
              // Vành khuyên có trần bề rộng riêng: kéo nó rộng hết một hàng
              // 1120px thì đường kính vẫn chỉ bằng chiều cao, phần thừa hai bên
              // thành khoảng trắng, còn nhãn phương thức thì trôi ra rất xa vành.
              <div className="panel mx-auto max-w-[560px] p-4">
                <Pie
                  data={pieData}
                  angleField="value"
                  colorField="type"
                  innerRadius={0.55}
                  height={280}
                  // Ba phương thức là ba hạng mục ngang hàng, không phải một
                  // thang mức độ — nên lấy ba màu biển báo đặc, không dùng thang
                  // đỏ-vàng-xanh vốn mang nghĩa tốt/xấu.
                  scale={{ color: { range: CHART_COLORS.slice(0, 3) } }}
                  legend={{ color: { position: 'bottom' } }}
                  label={{ text: 'type', position: 'outside' }}
                  tooltip={{ items: [{ field: 'value', valueFormatter: (v) => fmtVND(v) }] }}
                />
              </div>
            )}
          </Khoi>
        </>
      )}
    </div>
  );
}
