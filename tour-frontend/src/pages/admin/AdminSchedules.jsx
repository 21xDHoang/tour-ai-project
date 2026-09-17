import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  message,
} from 'antd';
import { RobotOutlined, TeamOutlined } from '@ant-design/icons';
import { aiApi, guideApi, tourApi } from '../../api/http';
import { TRANG_THAI_LICH, fmtDate } from '../../utils/format';
import { lichPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLich, setSuggestLich] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestData, setSuggestData] = useState(null);
  const [guideMap, setGuideMap] = useState({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLich, setAssignLich] = useState(null);
  const [available, setAvailable] = useState([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignForm] = Form.useForm();

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const tours = await tourApi.list();
      const items = [];
      for (const t of tours) {
        const detail = await tourApi.detail(t.MaTour);
        for (const l of detail.ds_lich || []) {
          items.push({ tour: detail, lich: l });
        }
      }
      setSchedules(items);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // ------------------------------ Gợi ý AI (UC-13) ------------------------------
  const openSuggest = async (item) => {
    setSuggestLich(item);
    setSuggestOpen(true);
    setSuggestLoading(true);
    setSuggestData(null);
    try {
      const [dx, hdvs] = await Promise.all([
        aiApi.suggestGuides(item.lich.MaLich),
        guideApi.available(item.lich.MaLich),
      ]);
      const map = {};
      hdvs.forEach((h) => {
        map[h.MaHDV] = h;
      });
      setGuideMap(map);
      setSuggestData(dx);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể gợi ý HDV');
    } finally {
      setSuggestLoading(false);
    }
  };

  // ------------------------------ Phân công HDV (DR-05) ------------------------------
  const openAssign = async (item) => {
    setAssignLich(item);
    setAssignOpen(true);
    assignForm.resetFields();
    try {
      const hdvs = await guideApi.available(item.lich.MaLich);
      setAvailable(hdvs);
    } catch {
      setAvailable([]);
    }
  };

  const submitAssign = async () => {
    const values = await assignForm.validateFields();
    setAssignSubmitting(true);
    try {
      const res = await guideApi.assign({
        MaLich: assignLich.lich.MaLich,
        MaHDV: values.MaHDV,
        VaiTro: values.VaiTro || 'TruongDoan',
        GhiChu: values.GhiChu || null,
      });
      message.success(`Đã phân công HDV #${res.MaHDV} vào lịch #${res.MaLich}`);
      setAssignOpen(false);
      loadSchedules();
    } catch (err) {
      // DR-05: backend từ chối khi trùng khoảng thời gian
      message.error(err.response?.data?.detail || 'Phân công thất bại');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Tour',
      key: 'tour',
      ellipsis: true,
      render: (_, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{r.tour.TenTour}</div>
          <div className="truncate text-[11.5px] text-ink-500">{r.tour.ten_diem_den}</div>
        </div>
      ),
    },
    {
      title: 'Khởi hành',
      dataIndex: ['lich', 'NgayKhoiHanh'],
      width: 118,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDate(v)}</span>,
    },
    {
      title: 'Kết thúc',
      dataIndex: ['lich', 'NgayKetThuc'],
      width: 118,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDate(v)}</span>,
    },
    {
      // Chỗ còn là con số, nhưng "hết chỗ" mới là thông tin: 0 nằm lẫn trong
      // một cột số thì không ai nhận ra. Đổi hẳn thành chữ ở đúng dòng đó —
      // chữ mang nghĩa, màu nhắc lại.
      title: 'Chỗ còn',
      dataIndex: ['lich', 'SoChoCon'],
      width: 100,
      render: (v) =>
        v == null ? (
          <span className="text-ink-400">—</span>
        ) : v > 0 ? (
          <span className="tnum">{v}</span>
        ) : (
          <span className="chip !px-2 !py-0.5 !text-[11px] bg-stop-50 text-stop-700 border-stop-200">
            Hết chỗ
          </span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: ['lich', 'TrangThai'],
      width: 120,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${lichPill(v)}`}>
          {TRANG_THAI_LICH[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 240,
      // Hai cách làm cùng một việc, ngang hàng nhau — xem chú thích `hienHet`.
      render: (_, r) => (
        <HangThaoTac
          hienHet
          chinh={{
            nhan: 'Gợi ý AI',
            icon: <RobotOutlined />,
            onClick: () => openSuggest(r),
          }}
          khac={[
            {
              nhan: 'Phân công HDV',
              icon: <TeamOutlined />,
              onClick: () => openAssign(r),
            },
          ]}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${schedules.length} lịch`}
        title="Điều hành & Phân công HDV"
        description="Dùng AI đề xuất Top 3 HDV phù hợp (UC-13) hoặc phân công thủ công — chỉ hiển thị HDV rảnh trong khoảng thời gian lịch (DR-05)."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={schedules}
          columns={columns}
          rowKey={(r) => r.lich.MaLich}
          x={rongBang}
          loading={loading}
          pagination={false}
          empty={{
            title: 'Chưa có lịch khởi hành nào',
            description:
              'Lịch khởi hành được tạo trong màn Quản trị danh mục tour. Lịch có ở đây thì mới phân công được HDV.',
          }}
        />
      </div>

      {/* ------------------------------ Modal Gợi ý AI ------------------------------ */}
      <Modal
        open={suggestOpen}
        onCancel={() => setSuggestOpen(false)}
        footer={null}
        title={
          <Space>
            <RobotOutlined /> Gợi ý HDV cho lịch #{suggestLich?.lich.MaLich}
            {suggestData?.nguon === 'Fallback' && <span className="chip">Fallback</span>}
          </Space>
        }
      >
        {suggestLoading ? (
          <div className="space-y-3 pt-2">
            <div className="skeleton h-16 rounded-card" />
            <div className="skeleton h-16 rounded-card" />
            <div className="skeleton h-16 rounded-card" />
          </div>
        ) : !suggestData ? (
          <Alert type="warning" showIcon message="Không có dữ liệu đề xuất." />
        ) : (
          <div className="pt-2">
            {suggestData.nguon === 'Fallback' && (
              <Alert
                className="mb-3"
                type="warning"
                showIcon
                message="Gemini tạm không khả dụng — đề xuất dưới đây do hệ thống tự chấm theo tiêu chí, không phải AI."
              />
            )}
            <ol className="space-y-3">
              {suggestData.danh_sach.map((item, i) => {
                const g = guideMap[item.ma_hdv];
                return (
                  <li
                    key={item.ma_hdv ?? i}
                    className="rounded-card border border-ink-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-2">
                      {/* Thứ hạng có thật (Top 3), nên số thứ tự ở đây là thông
                          tin chứ không phải trang trí. */}
                      <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-field bg-ink-950 text-[12px] font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink-950">
                        {g?.HoTen || `HDV #${item.ma_hdv}`}
                      </span>
                      {g?.ChuyenMon && <span className="chip shrink-0">{g.ChuyenMon}</span>}
                    </div>
                    <div className="mt-2">
                      <Progress
                        percent={Number(item.diem_tuong_dong)}
                        strokeColor="#0B5D3B"
                        size="small"
                        format={(p) => `${p}% khớp`}
                      />
                      <p className="mt-1 text-body-s text-ink-600">{item.ly_do}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </Modal>

      {/* ------------------------------ Modal Phân công ------------------------------ */}
      <Modal
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={submitAssign}
        confirmLoading={assignSubmitting}
        okText="Phân công"
        cancelText="Hủy"
        title={`Phân công HDV — lịch #${assignLich?.lich.MaLich}`}
      >
        <p className="mb-3 rounded-card bg-paper p-3 text-body-s text-ink-600">
          Danh sách chỉ gồm HDV <b className="font-semibold text-ink-950">rảnh</b> (DR-05) — HDV
          đang bận lịch trùng khoảng thời gian đã bị loại.
        </p>
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="MaHDV"
            label="Hướng dẫn viên"
            rules={[{ required: true, message: 'Chọn HDV' }]}
          >
            <Select
              placeholder="Chọn HDV rảnh"
              options={available.map((h) => ({
                value: h.MaHDV,
                label: `${h.HoTen} (${h.ChuyenMon || 'chưa có chuyên môn'}, ${h.SoNamKinhNghiem} năm)`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="VaiTro"
            label="Vai trò"
            initialValue="TruongDoan"
          >
            <Select
              options={[
                { value: 'TruongDoan', label: 'Trưởng đoàn' },
                { value: 'PhuDoan', label: 'Phó đoàn' },
              ]}
            />
          </Form.Item>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
