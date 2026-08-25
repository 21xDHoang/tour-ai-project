import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Modal,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  LockOutlined,
  SafetyCertificateOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../api/http';
import { TRANG_THAI_TAI_KHOAN, VAI_TRO_LABEL, fmtDateTime } from '../../utils/format';

const { Title, Text } = Typography;

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
    { title: 'Họ tên', dataIndex: 'HoTen' },
    { title: 'Email', dataIndex: 'Email' },
    {
      title: 'Vai trò',
      dataIndex: 'VaiTro',
      render: (v) => <Tag color={v === 'Admin' ? 'volcano' : v === 'Consultant' ? 'blue' : v === 'Accountant' ? 'purple' : 'default'}>{VAI_TRO_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_TAI_KHOAN[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    { title: 'Ngày tạo', dataIndex: 'NgayTao', render: fmtDateTime, width: 140 },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, u) => (
        <span className="space-x-2">
          <Button
            size="small"
            danger={u.TrangThai !== 'Locked'}
            icon={u.TrangThai === 'Locked' ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => toggleLock(u)}
          >
            {u.TrangThai === 'Locked' ? 'Mở khóa' : 'Khóa'}
          </Button>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => {
              setRoleTarget(u);
              setRoleValue(u.VaiTro);
            }}
          >
            Đổi vai trò
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <SafetyCertificateOutlined /> Cấp phát tài khoản
        </Title>
        <Text type="secondary">
          Quản lý tài khoản nhân viên: khóa/mở khóa, đổi vai trò theo quyền.
        </Text>
      </div>
      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table rowKey="MaNguoiDung" columns={columns} dataSource={rows} />
        )}
      </Card>

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
