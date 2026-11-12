import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  KeyRound,
  Lock,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react';
import {
  apiRequest,
  getAuthToken,
  subscribeUserToWebPush,
} from '../lib/api.ts';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

// ==================== 1. NOTIFICATIONS & WEB PUSH PAGE ====================
interface NotificationsPageProps {
  onNavigate: (page: string, params?: Record<string, any>) => void;
  onRefreshDashboard: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onNavigate,
  onRefreshDashboard,
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ notifications: any[] }>(
        '/api/notifications'
      );
      setNotifications(res.notifications || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleOpenNotification = async (n: any) => {
    try {
      if (!n.isRead) {
        await apiRequest(`/api/notifications/${n.id}/read`, { method: 'POST' });
        onRefreshDashboard();
      }
    } catch {
      // Ignore
    }
    if (n.relatedRequestId) {
      onNavigate('request-details', { requestId: n.relatedRequestId });
    } else if (n.relatedGroupId) {
      onNavigate('group-chat', { groupId: n.relatedGroupId });
    } else {
      loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      await loadNotifications();
      onRefreshDashboard();
    } catch {
      // Ignore
    }
  };

  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushMessage(null);
    try {
      const res = await subscribeUserToWebPush();
      setPushMessage(res.message);
    } catch (err: any) {
      setPushMessage(err.message || 'Could not enable push notifications.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    setPushMessage(null);
    try {
      const res = await apiRequest<{ message: string }>('/api/push/test', {
        method: 'POST',
      });
      setPushMessage(res.message);
      await loadNotifications();
      onRefreshDashboard();
    } catch (err: any) {
      setPushMessage(err.message || 'Failed to send test notification.');
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#0d1726] border border-[#1a2b45] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            <p className="text-xs text-slate-400">
              In-app alerts and background mobile Web Push notifications
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="h-9 px-3.5 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-emerald-400 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          Mark All as Read
        </button>
      </div>

      {/* Web Push (VAPID) Permission & Test Bar */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Mobile & Desktop Push Notifications (VAPID)
              </h2>
              <p className="text-xs text-slate-400">
                Receive instant alerts when requests are assigned, approved,
                rejected, or shared in groups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={pushLoading}
              onClick={handleEnablePush}
              className="h-9 px-3.5 rounded-xl bg-[#00c471] text-[#04150d] font-bold text-xs cursor-pointer"
            >
              Enable Push
            </button>
            <button
              type="button"
              disabled={pushLoading}
              onClick={handleTestPush}
              className="h-9 px-3.5 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-slate-200 font-semibold text-xs cursor-pointer"
            >
              Test Notification
            </button>
          </div>
        </div>

        {pushMessage && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-200">
            {pushMessage}
          </div>
        )}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-10 text-center space-y-2">
          <Bell className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-white">
            No notifications yet
          </p>
          <p className="text-xs text-slate-400">
            Click "Test Notification" above to verify your notification inbox.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpenNotification(n)}
              className={`w-full rounded-2xl p-4 border text-left transition-colors flex items-start justify-between gap-4 cursor-pointer ${
                n.isRead
                  ? 'bg-[#0d1726] border-[#1a2b45] opacity-80'
                  : 'bg-[#102038] border-emerald-500/40'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white">
                  {n.title}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {n.message}
                </p>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                {new Date(n.createdAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 2. REPORTS & EXCEL EXPORT PAGE ====================
interface ReportsPageProps {
  categories: any[];
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  categories,
  onNavigate,
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('All');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [assignedApproverId, setAssignedApproverId] = useState('');

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (employeeId) params.set('employeeId', employeeId);
    if (department !== 'All') params.set('department', department);
    if (category !== 'All') params.set('category', category);
    if (status !== 'All') params.set('status', status);
    if (assignedApproverId) params.set('assignedApproverId', assignedApproverId);
    return params.toString();
  };

  const loadFilteredReport = async () => {
    setLoading(true);
    try {
      const qs = buildQueryString();
      const res = await apiRequest<{ requests: any[] }>(`/api/requests?${qs}`);
      setRequests(res.requests || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiRequest<{ employees: any[] }>('/api/employees')
      .then((res) => setEmployees(res.employees || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadFilteredReport();
  }, [
    startDate,
    endDate,
    employeeId,
    department,
    category,
    status,
    assignedApproverId,
  ]);

  const handleExportExcel = () => {
    const qs = buildQueryString();
    const token = getAuthToken();
    const downloadUrl = `/api/reports/export?${qs}${
      qs ? '&' : ''
    }token=${encodeURIComponent(token || '')}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute(
      'download',
      `APPROVAL_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = Array.from(
    new Set(['All', ...employees.map((e) => e.department)])
  );

  const totalAmount = requests.reduce(
    (sum, r) => sum + (r.amount ? Number(r.amount) : 0),
    0
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#0d1726] border border-[#1a2b45] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              Request History & Excel Reports
            </h1>
            <p className="text-xs text-slate-400">
              Filter approval records and export 14-column Excel (.xlsx)
              spreadsheets
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="h-11 px-5 rounded-full bg-[#00c471] hover:bg-[#00b065] text-[#04150d] font-bold text-xs sm:text-sm inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-lg shadow-emerald-500/15"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel (.xlsx)
        </button>
      </div>

      {/* 7 Required Report Filters */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Employee
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.employeeId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Assigned Approver
          </label>
          <select
            value={assignedApproverId}
            onChange={(e) => setAssignedApproverId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
          >
            <option value="">All Approvers</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setEmployeeId('');
              setDepartment('All');
              setCategory('All');
              setStatus('All');
              setAssignedApproverId('');
            }}
            className="w-full h-10 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
        <span className="text-slate-300">
          Matching Records:{' '}
          <strong className="text-white font-mono tabular-nums">
            {requests.length}
          </strong>
        </span>
        <span className="text-slate-300">
          Cumulative Amount:{' '}
          <strong className="text-emerald-400 font-mono tabular-nums">
            ₹{totalAmount.toLocaleString('en-IN')}
          </strong>
        </span>
      </div>

      {/* Report Table */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1a2b45] bg-[#070e1a] text-[11px] font-semibold text-slate-400">
                <th className="py-3 px-4 whitespace-nowrap">Request ID</th>
                <th className="py-3 px-4 whitespace-nowrap">Employee</th>
                <th className="py-3 px-4 whitespace-nowrap">Department</th>
                <th className="py-3 px-4 whitespace-nowrap">Category</th>
                <th className="py-3 px-4 whitespace-nowrap">Title</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">
                  Amount
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Approver</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Submission Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2b45] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading report data...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No records match the selected filters.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() =>
                      onNavigate('request-details', { requestId: r.id })
                    }
                    className="hover:bg-[#111e33] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-emerald-400 font-semibold whitespace-nowrap">
                      {r.requestCode}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold text-white">
                        {r.employeeName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {r.employeeMobile}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {r.department}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {r.categoryName} · {r.subcategory}
                    </td>
                    <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                      {r.title}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-white whitespace-nowrap">
                      {r.amount
                        ? `₹${Number(r.amount).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {r.assignedApproverName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          r.status === 'Approved'
                            ? 'text-emerald-400'
                            : r.status === 'Rejected'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==================== 3. PROFILE & CHANGE PASSWORD PAGE ====================
interface ProfilePageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onNavigate,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const res = await apiRequest<{ message: string }>(
        '/api/auth/change-password',
        {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );
      setMessage(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="w-10 h-10 rounded-xl bg-[#0d1726] border border-[#1a2b45] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">My Profile</h1>
          <p className="text-xs text-slate-400">
            Account identity, department details, and security credentials
          </p>
        </div>
      </div>

      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-[#1a2b45]">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xl flex items-center justify-center">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            <p className="text-xs text-emerald-400 font-semibold">
              {user.role === 'super_admin'
                ? 'Super Admin Account'
                : `${user.designation} · ${user.department}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-400">Employee ID</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
              {user.employeeId}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Mobile Number</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
              {user.mobile}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Department</p>
            <p className="text-sm font-bold text-white mt-0.5">
              {user.department}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Account Status</p>
            <p className="text-sm font-bold text-emerald-400 capitalize mt-0.5">
              {user.status}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Update Account Password</span>
        </h3>

        {message && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-200">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3.5">
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              New Password (min 6 characters)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-[#00c471] text-[#04150d] font-bold text-xs cursor-pointer"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== 4. SETTINGS & PWA CONFIGURATION PAGE ====================
interface SettingsPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  onNavigate,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [health, setHealth] = useState<any | null>(null);

  useEffect(() => {
    apiRequest('/api/health')
      .then((res) => setHealth(res))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="w-10 h-10 rounded-xl bg-[#0d1726] border border-[#1a2b45] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Application Settings</h1>
          <p className="text-xs text-slate-400">
            Progressive Web App installation, storage, and administrative
            configuration
          </p>
        </div>
      </div>

      {/* PWA Installation Card */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src="/assets/aistudio/Ibat_Logo__2___1__de631039.png"
            alt="APPROVAL App Icon"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-contain bg-[#070e1a] p-1 border border-[#1e2f4d]"
          />
          <div>
            <h2 className="text-sm font-bold text-white">
              APPROVAL Progressive Web App
            </h2>
            <p className="text-xs text-slate-400">
              {isInstalled
                ? 'Installed and running in standalone mode'
                : 'Install on your mobile home screen or desktop for 1-tap access'}
            </p>
          </div>
        </div>
        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={install}
            className="h-10 px-4 rounded-xl bg-[#00c471] text-[#04150d] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Install App
          </button>
        )}
        {isIOS && !isInstalled && (
          <span className="text-xs text-emerald-400">
            In Safari: Tap Share → Add to Home Screen
          </span>
        )}
      </div>

      {/* Storage & Environment Overview */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">
          Storage & Infrastructure
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d]">
            <p className="text-slate-400">Primary Database</p>
            <p className="text-white font-semibold mt-0.5">
              PostgreSQL (Parameterized Pool + Transactions)
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d]">
            <p className="text-slate-400">Attachment Storage Mode</p>
            <p className="text-emerald-400 font-semibold mt-0.5">
              {health?.storage?.mode || 'Cloudflare R2 / PostgreSQL Binary Store'}
            </p>
          </div>
        </div>
      </div>

      {user.role === 'super_admin' && (
        <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">
            Super Admin Controls
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('manage-categories')}
              className="h-10 px-4 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-white cursor-pointer"
            >
              Manage Approval Categories
            </button>
            <button
              type="button"
              onClick={() => onNavigate('employees')}
              className="h-10 px-4 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-white cursor-pointer"
            >
              Employee Management
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="h-10 px-4 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-white cursor-pointer"
            >
              Export Excel Reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 5. NOT FOUND (404) PAGE ====================
export const NotFoundPage: React.FC<{ onNavigate: (page: string) => void }> = ({
  onNavigate,
}) => (
  <div className="max-w-md mx-auto my-16 bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-8 text-center space-y-4">
    <h1 className="text-2xl font-bold text-white font-mono">404</h1>
    <p className="text-sm font-semibold text-slate-200">Page Not Found</p>
    <p className="text-xs text-slate-400">
      The requested APPROVAL page does not exist or has been moved.
    </p>
    <button
      type="button"
      onClick={() => onNavigate('dashboard')}
      className="h-10 px-5 rounded-xl bg-[#00c471] text-[#04150d] font-bold text-xs cursor-pointer"
    >
      Return to Dashboard
    </button>
  </div>
);
