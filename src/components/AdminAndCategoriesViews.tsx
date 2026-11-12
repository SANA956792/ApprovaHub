import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Eye,
  FolderPlus,
  KeyRound,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import {
  AVAILABLE_CATEGORY_ICONS,
  CategoryIcon,
  getCategoryTint,
} from './CategoryIcon.tsx';

// ==================== 1. EMPLOYEE MANAGEMENT PAGE ====================
interface EmployeeManagementPageProps {
  initialOpenCreate?: boolean;
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const EmployeeManagementPage: React.FC<EmployeeManagementPageProps> = ({
  initialOpenCreate = false,
  onNavigate,
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showAddModal, setShowAddModal] = useState(initialOpenCreate);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [resetPasswordEmp, setResetPasswordEmp] = useState<any | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [designation, setDesignation] = useState('Executive');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('active');

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (departmentFilter !== 'All') params.set('department', departmentFilter);
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res = await apiRequest<{ employees: any[] }>(
        `/api/employees?${params.toString()}`
      );
      setEmployees(res.employees || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [departmentFilter, statusFilter]);

  const departments = Array.from(
    new Set([
      'Executive Management',
      'Operations',
      'Finance & Accounts',
      'Marketing',
      'Academic & Training',
      'IT & Engineering',
      'Human Resources',
      ...employees.map((e) => e.department),
    ])
  );

  const openCreateForm = () => {
    setError(null);
    setName('');
    setMobile('');
    setEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setDepartment('Operations');
    setDesignation('Executive');
    setPassword('');
    setStatus('active');
    setEditingEmployee(null);
    setShowAddModal(true);
  };

  const openEditForm = (emp: any) => {
    setError(null);
    setEditingEmployee(emp);
    setName(emp.name);
    setMobile(emp.mobile);
    setEmployeeId(emp.employeeId);
    setDepartment(emp.department);
    setDesignation(emp.designation);
    setStatus(emp.status);
    setShowAddModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSaving(true);

    try {
      if (editingEmployee) {
        await apiRequest(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            mobile,
            employeeId,
            department,
            designation,
            status,
          }),
        });
        setFeedback(`Updated employee record for ${name}.`);
      } else {
        await apiRequest('/api/employees', {
          method: 'POST',
          body: JSON.stringify({
            name,
            mobile,
            employeeId,
            department,
            designation,
            password,
            status,
          }),
        });
        setFeedback(
          `Employee "${name}" created and added to Assigned Approver directory.`
        );
      }
      setShowAddModal(false);
      loadEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (emp: any) => {
    const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      await apiRequest(`/api/employees/${emp.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      setFeedback(
        `${emp.name} is now ${nextStatus === 'active' ? 'Active' : 'Deactivated'}.`
      );
      loadEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordEmp) return;
    setError(null);
    setSaving(true);
    try {
      await apiRequest(`/api/employees/${resetPasswordEmp.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: newResetPassword }),
      });
      setFeedback(`Password reset successfully for ${resetPasswordEmp.name}.`);
      setResetPasswordEmp(null);
      setNewResetPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  };

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
              Employee Management
            </h1>
            <p className="text-xs text-slate-400">
              Manage employee accounts, departments, roles, and access status
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="h-10 px-4 rounded-full bg-[#00c471] text-[#04150d] font-bold text-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-200 flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && !showAddModal && !resetPasswordEmp && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
            placeholder="Search by name, mobile, Employee ID, designation..."
            className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
        >
          <option value="All">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
        >
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Employees List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                    {emp.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {emp.name}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        · {emp.role === 'super_admin' ? 'Super Admin' : 'Employee'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                      {emp.employeeId} · {emp.mobile}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {emp.designation} · {emp.department}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    emp.status === 'active'
                      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                      : 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                  }`}
                >
                  {emp.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#1a2b45] flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('employee-details', { employeeId: emp.id })
                  }
                  className="h-8 px-3 rounded-lg bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Details & History
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(emp)}
                  className="h-8 px-3 rounded-lg bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setResetPasswordEmp(emp);
                    setNewResetPassword('');
                  }}
                  className="h-8 px-3 rounded-lg bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Reset Password
                </button>
                {emp.role !== 'super_admin' && (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(emp)}
                    className="h-8 px-3 rounded-lg bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <Power className="w-3.5 h-3.5 text-rose-400" />
                    {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1726] border border-[#1a2b45] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="EMP-101"
                    className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Operations, Finance, IT..."
                    className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Senior Executive, Manager..."
                    className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Initial Password (min 6 characters, hashed with bcrypt) *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter employee login password"
                    className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 rounded-xl bg-[#111e33] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#00c471] text-[#04150d] text-xs font-bold cursor-pointer"
                >
                  {saving
                    ? 'Saving...'
                    : editingEmployee
                    ? 'Save Changes'
                    : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1726] border border-[#1a2b45] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Reset Password — {resetPasswordEmp.name}
              </h3>
              <button
                type="button"
                onClick={() => setResetPasswordEmp(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResetPasswordEmp(null)}
                  className="h-10 px-4 rounded-xl bg-[#111e33] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#00c471] text-[#04150d] text-xs font-bold cursor-pointer"
                >
                  {saving ? 'Updating...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 2. EMPLOYEE DETAILS & REQUEST HISTORY PAGE ====================
interface EmployeeDetailsPageProps {
  employeeId: number;
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const EmployeeDetailsPage: React.FC<EmployeeDetailsPageProps> = ({
  employeeId,
  onNavigate,
}) => {
  const [employee, setEmployee] = useState<any | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest<{ employee: any; requests: any[] }>(`/api/employees/${employeeId}`)
      .then((res) => {
        setEmployee(res.employee);
        setRequests(res.requests || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return (
      <div className="h-48 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse" />
    );
  }

  if (!employee) {
    return (
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-8 text-center">
        <p className="text-sm text-white">Employee record not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('employees')}
          className="w-10 h-10 rounded-xl bg-[#0d1726] border border-[#1a2b45] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{employee.name}</h1>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            {employee.employeeId} · {employee.department} · {employee.designation}
          </p>
        </div>
      </div>

      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-[11px] text-slate-400">Mobile Number</p>
          <p className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
            {employee.mobile}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Department</p>
          <p className="text-sm font-bold text-white mt-0.5">
            {employee.department}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Designation</p>
          <p className="text-sm font-bold text-white mt-0.5">
            {employee.designation}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Role & Status</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">
            {employee.role === 'super_admin' ? 'Super Admin' : 'Employee'} ({employee.status})
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-white">
          Submitted Request History ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-8 text-center text-xs text-slate-400">
            This employee has not submitted any requests yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  onNavigate('request-details', { requestId: r.id })
                }
                className="w-full bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <p className="text-sm font-bold text-white">{r.title}</p>
                  <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                    {r.requestCode} · {r.categoryName} / {r.subcategory}
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-xs font-semibold text-emerald-400">
                    {r.status}
                  </span>
                  {r.amount && (
                    <p className="text-xs text-slate-300 mt-0.5">
                      ₹{Number(r.amount).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== 3. MANAGE APPROVAL CATEGORIES PAGE (DEFAULT + CUSTOM) ====================
interface ManageCategoriesPageProps {
  onNavigate: (page: string, params?: Record<string, any>) => void;
  onRefreshCategories: () => void;
}

export const ManageCategoriesPage: React.FC<ManageCategoriesPageProps> = ({
  onNavigate,
  onRefreshCategories,
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);

  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Receipt');
  const [catDescription, setCatDescription] = useState('');
  const [requiresAmount, setRequiresAmount] = useState(true);
  const [requiresDates, setRequiresDates] = useState(false);
  const [subInputs, setSubInputs] = useState<string[]>(['']);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAllCategories = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ categories: any[] }>(
        '/api/categories?includeInactive=true'
      );
      setCategories(res.categories || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCategories();
  }, []);

  const openAddCategory = () => {
    setError(null);
    setEditingCat(null);
    setCatName('');
    setCatIcon('Briefcase');
    setCatDescription('');
    setRequiresAmount(true);
    setRequiresDates(false);
    setSubInputs(['']);
    setShowModal(true);
  };

  const openEditCategory = (cat: any) => {
    setError(null);
    setEditingCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || 'FileText');
    setCatDescription(cat.description || '');
    setRequiresAmount(Boolean(cat.requiresAmount));
    setRequiresDates(Boolean(cat.requiresDates));
    setSubInputs(
      Array.isArray(cat.subcategories) && cat.subcategories.length > 0
        ? [...cat.subcategories]
        : ['']
    );
    setShowModal(true);
  };

  const handleAddSubcategoryField = () => {
    setSubInputs([...subInputs, '']);
  };

  const handleSubInputChange = (idx: number, val: string) => {
    const next = [...subInputs];
    next[idx] = val;
    setSubInputs(next);
  };

  const handleRemoveSubInput = (idx: number) => {
    if (subInputs.length <= 1) return;
    setSubInputs(subInputs.filter((_, i) => i !== idx));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    const cleanedSubs = Array.from(
      new Set(subInputs.map((s) => s.trim()).filter(Boolean))
    );
    if (!catName.trim()) {
      setError('Category Name is required.');
      return;
    }
    if (cleanedSubs.length === 0) {
      setError('Please enter at least one Subcategory Name.');
      return;
    }

    setSaving(true);
    try {
      if (editingCat) {
        await apiRequest(`/api/categories/${editingCat.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: catName.trim(),
            icon: catIcon,
            description: catDescription.trim(),
            subcategories: cleanedSubs,
            requiresAmount,
            requiresDates,
          }),
        });
        setFeedback(`Category "${catName.trim()}" updated in PostgreSQL.`);
      } else {
        await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: catName.trim(),
            icon: catIcon,
            description: catDescription.trim(),
            subcategories: cleanedSubs,
            requiresAmount,
            requiresDates,
          }),
        });
        setFeedback(
          `New custom category "${catName.trim()}" saved permanently and immediately available in New Request.`
        );
      }
      setShowModal(false);
      await loadAllCategories();
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: any) => {
    try {
      await apiRequest(`/api/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      setFeedback(
        `Category "${cat.name}" ${!cat.isActive ? 'activated' : 'deactivated'}. Historical requests retain their category data.`
      );
      await loadAllCategories();
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle category status.');
    }
  };

  const handleDeleteCustomCategory = async (cat: any) => {
    setError(null);
    setFeedback(null);
    try {
      await apiRequest(`/api/categories/${cat.id}`, {
        method: 'DELETE',
      });
      setFeedback(
        `Custom category "${cat.name}" deleted. Existing historical requests retain their category information.`
      );
      await loadAllCategories();
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete custom category.');
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (filterStatus === 'active' && !c.isActive) return false;
    if (filterStatus === 'inactive' && c.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchSub = (c.subcategories || []).some((s: string) =>
        s.toLowerCase().includes(q)
      );
      if (!matchName && !matchSub) return false;
    }
    return true;
  });

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
              Manage Approval Categories
            </h1>
            <p className="text-xs text-slate-400">
              Configure the 12 default categories and create unlimited custom
              categories & subcategories
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddCategory}
          className="h-10 px-4 rounded-full bg-[#00c471] text-[#04150d] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          Add New Category
        </button>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-200 flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories or subcategories..."
            className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#070e1a] p-1 rounded-xl border border-[#1e2f4d]">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#00c471] text-[#04150d]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-36 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`bg-[#0d1726] border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                cat.isActive ? 'border-[#1a2b45]' : 'border-rose-500/30 opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 ${getCategoryTint(
                        idx
                      )}`}
                    >
                      <CategoryIcon name={cat.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          · {cat.isDefault ? 'Default' : 'Custom'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cat.description || 'Approval workflow category'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      cat.isActive
                        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                        : 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-1">
                    Subcategories ({cat.subcategories?.length || 0}):
                  </p>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {(cat.subcategories || []).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1a2b45]">
                <button
                  type="button"
                  onClick={() => openEditCategory(cat)}
                  className="h-8 px-3 rounded-lg bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  Edit Category & Subcategories
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(cat)}
                    className="h-8 px-3 rounded-lg bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Power
                      className={`w-3.5 h-3.5 ${
                        cat.isActive ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    />
                    {cat.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {!cat.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomCategory(cat)}
                      title="Delete custom category"
                      className="h-8 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-[#0d1726] border border-[#1a2b45] p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {editingCat ? `Edit Category: ${editingCat.name}` : 'Add Custom Category'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Vendor Contract Renewal, Event Sponsorship..."
                  className="w-full h-10 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category Icon *
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d]">
                  {AVAILABLE_CATEGORY_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCatIcon(iconName)}
                      className={`h-9 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                        catIcon === iconName
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                      title={iconName}
                    >
                      <CategoryIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Short description shown on the Start a Request card"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresAmount}
                    onChange={(e) => setRequiresAmount(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Include Amount & Vendor fields</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresDates}
                    onChange={(e) => setRequiresDates(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Include Start & End Date fields</span>
                </label>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Subcategories *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSubcategoryField}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add More Subcategories
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {subInputs.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sub}
                        onChange={(e) =>
                          handleSubInputChange(idx, e.target.value)
                        }
                        placeholder={`Subcategory ${idx + 1} Name`}
                        className="flex-1 h-9 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                      />
                      {subInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubInput(idx)}
                          className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1a2b45]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 rounded-xl bg-[#111e33] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 rounded-xl bg-[#00c471] hover:bg-[#00b065] text-[#04150d] text-xs font-bold cursor-pointer"
                >
                  {saving ? 'Saving Category...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
