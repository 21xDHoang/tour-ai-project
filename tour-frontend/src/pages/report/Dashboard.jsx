import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, message } from 'antd';
import { DislikeOutlined, LikeOutlined } from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import { aiApi, reportApi, tourApi } from '../../api/http';
import { fmtSo, fmtVND } from '../../utils/format';
import { CAM_XUC_META, MAU_DONG_TIEN } from '../../utils/signs';
import ChiSoRail, { ChiSo, KhungChiSo } from '../../components/ui/ChiSo';
import EmptyState from '../../components/ui/EmptyState';
import Khoi, { KhungBieuDo } from '../../components/ui/Khoi';
import SectionHeader from '../../components/ui/SectionHeader';

const NGAN_XAC = (v) => `₫${(v / 1_000_000).toFixed(1)}tr`;

/** Một danh sách ghi nhận (ưu điểm hoặc nhược điểm) do AI bóc tách. */
function DanhSach({ tieuDe, icon, items = [], lopChu, lopDau }) {
  return (
    <div className={`rounded-card border p-4 ${lopChu}`}>
      <h3 className="mb-2.5 flex items-center gap-2 font-display text-title">
        {icon}
        {tieuDe}
      </h3>
      {items.length === 0 ? (
        <p className="text-body-s opacity-80">Không có ghi nhận nào.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-body-s">
              {/* Ô vuông nhỏ thay cho emoji: cùng hình với dấu mốc đầu mục nên
                  đọc ra là cùng một hệ, và không chen vào dòng chữ tiếng Việt
                  một ký tự lạ cỡ khác. */}
              <span
                aria-hidden="true"
                className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[1px] ${lopDau}`}
              />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Báo cáo phân tích AI (UC-12) + doanh thu theo tháng. */
export default function Dashboard() {
  const [revenue, setRevenue] = useState([]);
  const [revLoading, setRevLoading] = useState(true);

  const [analyses, setAnalyses] = useState([]); // các tour đã phân tích được
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [selectedMaTour, setSelectedMaTour] = useState(null);

  /**
   * Hai nguồn dữ liệu của trang này hỏng độc lập nhau, nên trạng thái hỏng cũng
   * phải tách đôi. Không có cờ này thì một lần gọi hỏng sẽ hiện ra dải "0 ₫" và
   * câu "Chưa có giao dịch nào" — một khẳng định về việc kinh doanh, trong khi
   * thực tế chỉ là không đọc được số liệu.
   */
  const [revLoi, setRevLoi] = useState(false);
  const [analysesLoi, setAnalysesLoi] = useState(false);

  // ------------------------------ Doanh thu ------------------------------
  const loadRevenue = useCallback(async () => {
    setRevLoading(true);
    setRevLoi(false);
    try {
      setRevenue(await reportApi.revenue());
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không tải được báo cáo doanh thu');
      setRevenue([]);
      setRevLoi(true);
    } finally {
      setRevLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  // ------------------------------ Phân tích cảm xúc (UC-12) ------------------------------
  const loadAnalyses = useCallback(async () => {
    setAnalysesLoading(true);
    setAnalysesLoi(false);
    try {
      const tours = await tourApi.list();
      const results = await Promise.allSettled(
        tours.map((t) => aiApi.analyzeFeedback(t.MaTour)),
      );
      const ok = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          ok.push({ ...res.value, MaTour: tours[i].MaTour, TenTour: tours[i].TenTour });
        }
        // status rejected => tour chưa có phản hồi (404), bỏ qua
      });
      setAnalyses(ok);
      if (ok.length > 0) setSelectedMaTour((prev) => prev ?? ok[0].MaTour);
    } catch {
      // Chỉ tới đây khi chính `tourApi.list()` hỏng. Từng tour không có phản hồi
      // thì rơi vào `allSettled` ở trên và KHÔNG phải lỗi — danh sách rỗng lúc đó
      // là sự thật ("chưa tour nào có phản hồi"), không phải một lần tải hỏng.
      setAnalyses([]);
      setAnalysesLoi(true);
    } finally {
      setAnalysesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const selected =
    analyses.find((a) => a.MaTour === selectedMaTour) || analyses[0] || null;

  // Dữ liệu biểu đồ cột: dạng "long" cho 2 series
  const columnData = useMemo(
    () =>
      revenue.flatMap((r) => [
        { thang: r.thang, loai: 'Doanh thu', gia_tri: Number(r.doanh_thu) },
        { thang: r.thang, loai: 'Dòng tiền ròng', gia_tri: Number(r.dong_tien) },
      ]),
    [revenue],
  );

  const pieData = useMemo(() => {
    const counts = { TichCuc: 0, TrungLap: 0, TieuCuc: 0 };
    analyses.forEach((a) => {
      if (counts[a.nhan_cam_xuc] !== undefined) counts[a.nhan_cam_xuc] += 1;
    });
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([key, value]) => ({
        type: CAM_XUC_META[key].label,
        value,
        color: CAM_XUC_META[key].hex,
      }));
  }, [analyses]);

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

  const camXucCuaTour = selected ? CAM_XUC_META[selected.nhan_cam_xuc] : null;

  return (
    <div className="w-full">
      <SectionHeader
        marker={analysesLoading || analysesLoi ? null : `${analyses.length} tour`}
        title="Báo cáo phân tích AI & tài chính"
        description="Doanh thu theo tháng, cảm xúc từ phản hồi khách hàng (UC-12) và ưu/nhược điểm do AI bóc tách."
      />

      {revLoi ? (
        <EmptyState
          className="mt-6"
          title="Không tải được doanh thu"
          description="Máy chủ không trả về số liệu doanh thu theo tháng. Kiểm tra kết nối rồi mở lại trang."
        />
      ) : revLoading ? (
        <KhungChiSo cot={3} className="mt-6" />
      ) : (
        <ChiSoRail cot={3} className="mt-6">
          <ChiSo nhan="Doanh thu thu vào" giaTri={fmtSo(totals.doanh_thu)} donVi="₫" />
          <ChiSo nhan="Tổng hoàn tiền" giaTri={fmtSo(totals.hoan_tien)} donVi="₫" />
          <ChiSo nhan="Dòng tiền ròng" giaTri={fmtSo(totals.dong_tien)} donVi="₫" manh />
        </ChiSoRail>
      )}

      <Khoi tieuDe="Doanh thu & dòng tiền theo tháng" className="mt-6">
        {revLoi ? (
          <EmptyState
            title="Không tải được doanh thu"
            description="Biểu đồ cần số liệu doanh thu theo tháng từ máy chủ."
          />
        ) : revLoading ? (
          <KhungBieuDo cao={320} />
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
              height={320}
              scale={{ color: { range: MAU_DONG_TIEN } }}
              legend={{ color: { position: 'top' } }}
              axis={{
                y: { labelFormatter: (v) => NGAN_XAC(v) },
              }}
              tooltip={{ channel: 'y', valueFormatter: (v) => fmtVND(v) }}
            />
          </div>
        )}
      </Khoi>

      {/* Hai khối này xếp dọc, không chia đôi màn hình: bản cũ để chúng cạnh
          nhau theo tỉ lệ 10/14, và ở bề rộng làm việc thật thì cột 14 chỉ được
          ~640px — không đủ cho bảng công nợ sáu cột. */}
      <Khoi tieuDe="Cảm xúc khách hàng (UC-12)" className="mt-6">
        {analysesLoi ? (
          <EmptyState
            title="Không tải được dữ liệu phân tích"
            description="Máy chủ không trả về danh sách tour để tổng hợp cảm xúc."
          />
        ) : analysesLoading ? (
          // Khung xương bọc cùng trần bề rộng với vành khuyên thật, để lúc dữ
          // liệu về cái khung không co lại một nửa.
          <div className="mx-auto max-w-[560px]">
            <KhungBieuDo cao={280} />
          </div>
        ) : pieData.length === 0 ? (
          <EmptyState
            title="Chưa có phản hồi nào để phân tích"
            description="Cảm xúc được tổng hợp từ phản hồi khách gửi sau chuyến đi."
          />
        ) : (
          // Vành khuyên có trần bề rộng riêng: kéo rộng hết một hàng 1120px thì
          // đường kính vẫn chỉ bằng chiều cao, phần thừa hai bên thành khoảng
          // trắng, còn nhãn thì trôi ra rất xa vành.
          <div className="panel mx-auto max-w-[560px] p-4">
            <Pie
              data={pieData}
              angleField="value"
              colorField="type"
              innerRadius={0.55}
              height={280}
              legend={{ color: { position: 'bottom' } }}
              scale={{ color: { range: pieData.map((d) => d.color) } }}
              label={{ text: 'value', position: 'outside' }}
            />
          </div>
        )}
      </Khoi>

      <Khoi
        tieuDe="Ưu & nhược điểm do AI bóc tách"
        className="mt-6"
        hanhDong={
          analyses.length > 0 && (
            <Select
              style={{ width: 280 }}
              value={selected?.MaTour}
              onChange={setSelectedMaTour}
              options={analyses.map((a) => ({
                value: a.MaTour,
                label: `${a.TenTour} — ${CAM_XUC_META[a.nhan_cam_xuc]?.label}`,
              }))}
            />
          )
        }
      >
        {analysesLoi ? (
          <EmptyState
            title="Không tải được dữ liệu phân tích"
            description="Ưu và nhược điểm do AI bóc tách cần danh sách tour từ máy chủ."
          />
        ) : analysesLoading ? (
          <KhungBieuDo cao={260} />
        ) : !selected ? (
          <EmptyState
            title="Tour chưa có phản hồi để phân tích"
            description="Chọn một tour khác ở ô phía trên, hoặc chờ phản hồi mới từ khách."
          />
        ) : (
          <div className="panel p-4">
            {selected.nguon === 'Fallback' && (
              <Alert
                className="mb-3"
                type="warning"
                showIcon
                message="Gemini tạm không khả dụng — kết quả tính theo điểm trung bình (Fallback)."
              />
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`chip !px-2 !py-0.5 !text-[11px] ${camXucCuaTour?.chipCls || ''}`}
              >
                Cảm xúc: {camXucCuaTour?.label || selected.nhan_cam_xuc}
              </span>
              <span className="text-body-s text-ink-600">{selected.TenTour}</span>
            </div>

            {/* Trích nguyên văn kết luận của AI: kẻ dọc bên trái là cách đánh
                dấu trích dẫn của hệ thống, đọc ra ngay là lời của người khác
                chứ không phải câu mô tả của giao diện. Bỏ chữ nghiêng — một
                đoạn tiếng Việt dài in nghiêng thì dấu bị dính vào chữ và tốc
                độ đọc tụt hẳn. */}
            <blockquote className="border-l-2 border-ink-300 pl-4 text-body-l text-ink-800">
              {selected.tong_ket}
            </blockquote>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DanhSach
                tieuDe="Ưu điểm"
                icon={<LikeOutlined />}
                items={selected.uu_diem || []}
                lopChu="border-guide-200 bg-guide-50 text-guide-700"
                lopDau="bg-guide-500"
              />
              <DanhSach
                tieuDe="Nhược điểm"
                icon={<DislikeOutlined />}
                items={selected.nhuoc_diem || []}
                lopChu="border-stop-200 bg-stop-50 text-stop-700"
                lopDau="bg-stop-500"
              />
            </div>
          </div>
        )}
      </Khoi>
    </div>
  );
}
