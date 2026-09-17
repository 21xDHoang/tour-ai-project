import { useCallback, useEffect, useState } from 'react';
import { Modal, Select, message } from 'antd';
import {
  LockOutlined,
  SafetyCertificateOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../api/http';
import { TRANG_THAI_TAI_KHOAN, VAI_TRO_LABEL, fmtDateTime } from '../../utils/format';
import { batTatPill, vaiTroPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

const VAI_TRO_OPTIONS = Object.keys(VAI_TRO_LABEL).map((v) => ({
  value: v,
  label: VAI_TRO_LABEL[v],
}));

/** Cấp phát tài khoản & phân quyền (Admin - Nhân sự). */
export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleTarget, setRoleTarget] = useState(null);
  const [roleValue, setRoleValue] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminApi.users());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLock = async (u) => {
    const willLock = u.TrangThai !== 'Locked';
    try {
      await adminApi.updateUser(u.MaNguoiDung, {
        TrangThai: willLock ? 'Locked' : 'Active',
      });
      message.success(willLock ? `Đã khóa tài khoản ${u.HoTen}` : `Đã mở khóa ${u.HoTen}`);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Thao tác thất bại');
    }
  };

  const changeRole = async () => {
    try {
      await adminApi.updateUser(roleTarget.MaNguoiDung, { VaiTro: roleValue });
      message.success(`Đã đổi vai trò của ${roleTarget.HoTen}`);
      setRoleTarget(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Đổi vai trò thất bại');
    }
  };

  const columns = [
    {
      title: 'Họ tên',
      dataIndex: 'HoTen',
      width: 180,
      ellipsis: true,
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    { title: 'Email', dataIndex: 'Email', width: 200, ellipsis: true },
    {
      title: 'Vai trò',
      dataIndex: 'VaiTro',
      width: 132,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${vaiTroPill(v)}`}>
          {VAI_TRO_LABEL[v] || v}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 116,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${batTatPill(v)}`}>
          {TRANG_THAI_TAI_KHOAN[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'NgayTao',
      width: 148,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDateTime(v)}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 176,
      fixed: 'right',
      render: (_, u) => (
        <HangThaoTac
          chinh={{
            nhan: 'Đổi vai trò',
            icon: <SafetyCertificateOutlined />,
            onClick: () => {
              setRoleTarget(u);
              setRoleValue(u.VaiTro);
            },
          }}
          // Khóa tài khoản là việc hiếm và nặng, nên lùi vào menu và tô đỏ —
          // nút chính là việc quản trị làm hằng ngày.
          khac={[
            {
              nhan: u.TrangThai === 'Locked' ? 'Mở khóa' : 'Khóa',
              icon: u.TrangThai === 'Locked' ? <UnlockOutlined /> : <LockOutlined />,
              danger: u.TrangThai !== 'Locked',
              onClick: () => toggleLock(u),
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
        marker={loading ? null : `${rows.length} tài khoản`}
        title="Cấp phát tài khoản"
        description="Quản lý tài khoản nhân viên: khóa/mở khóa, đổi vai trò theo quyền."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaNguoiDung"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có tài khoản nào',
            description: 'Tài khoản nhân viên được cấp ở đây kèm vai trò tương ứng.',
          }}
        />
      </div>

      <Modal
        open={!!roleTarget}
        onCancel={() => setRoleTarget(null)}
        onOk={changeRole}
        okText="Lưu"
        title={`Đổi vai trò — ${roleTarget?.HoTen}`}
      >
        <Select
          className="w-full"
          options={VAI_TRO_OPTIONS}
          value={roleValue}
          onChange={setRoleValue}
        />
      </Modal>
    </div>
  );
}
