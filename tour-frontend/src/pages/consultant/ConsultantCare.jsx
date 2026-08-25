import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Empty, Spin, Table, Tag, Typography } from 'antd';
import { HeartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

/** Checklist chăm sóc khách trước/sau tour (Consultant). Ghi nhớ theo đơn. */
const CHECKLIST = [
  'Gọi xác nhận thông tin khách',
  'Nhắc lịch & điểm tập trung',
  'Gửi kế hoạch hành trình',
  'Hỏi thăm sau chuyến đi',
];

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

  const columns = [
    {
      title: 'Khách',
      dataIndex: 'ten_khach_hang',
      render: (v, r) => (
        <div>
          <div className="font-medium">{v}</div>
          <Text type="secondary" className="text-xs">
            Đơn #{r.MaDatCho}
          </Text>
        </div>
      ),
    },
    { title: 'Tour', dataIndex: 'ten_tour', ellipsis: true },
    {
      title: 'Khởi hành',
      dataIndex: 'ngay_khoi_hanh',
      render: (v) => {
        const k = dayjs(v);
        const isUpcoming = k.diff(dayjs().startOf('day'), 'day') >= 0;
        return (
          <span>
            {fmtDate(v)}
            <Tag
              className="ml-1"
              color={isUpcoming ? 'blue' : 'gold'}
            >
              {isUpcoming ? 'Sắp khởi hành' : 'Vừa kết thúc'}
            </Tag>
          </span>
        );
      },
    },
    { title: 'Tổng tiền', dataIndex: 'TongTien', render: fmtVND },
    {
      title: 'Checklist',
      key: 'checklist',
      render: (_, r) => (
        <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
          {CHECKLIST.map((c, i) => {
            const st = done[r.MaDatCho] || {};
            return (
              <Checkbox
                key={i}
                checked={!!st[`b${i}`]}
                onChange={() => toggle(r.MaDatCho, `b${i}`)}
              >
                <span className="text-xs">{c}</span>
              </Checkbox>
            );
          })}
        </div>
      ),
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 110,
      render: (_, r) => (
        <Tag color={progress(r.MaDatCho) === CHECKLIST.length ? 'green' : 'default'}>
          {progress(r.MaDatCho)}/{CHECKLIST.length}
        </Tag>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <HeartOutlined /> Chăm sóc trước/sau tour
        </Title>
        <Text type="secondary">
          Checklist nội bộ cho các đơn sắp khởi hành (trước 7 ngày → sau 14 ngày) —
          trạng thái ghi nhớ trên trình duyệt của bạn.
        </Text>
      </div>
      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : visible.length === 0 ? (
          <Empty description="Chưa có đơn nào trong khoảng thời gian chăm sóc." />
        ) : (
          <Table
            rowKey="MaDatCho"
            columns={columns}
            dataSource={visible}
            pagination={false}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>
    </div>
  );
}
