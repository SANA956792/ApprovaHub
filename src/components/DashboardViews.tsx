import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  FolderPlus,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { CategoryIcon, getCategoryTint } from './CategoryIcon.tsx';

interface DashboardViewsProps {
  user: any;
  dashboardData: any;
  categories: any[];
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const DashboardView: React.FC<DashboardViewsProps> = ({
  user,
  dashboardData,
  categories,
  onNavigate,
}) => {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const isSuperAdmin = user?.role === 'super_admin';
  const kpis = dashboardData?.kpis || {
    totalApprovals: 0,
    pendingApprovals: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalEmployees: 0,
    mySubmissions: 0,
    myPending: 0,
    myApproved: 0,
    myRejected: 0,
  };

  const todayFormatted = new Date().toISOString().slice(0, 10);
  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, 5);

  const recentRequests = dashboardData?.recentRequests || [];
  const pendingApprovalList = dashboardData?.pendingApprovalList || [];
  const recentActivities = dashboardData?.recentActivities || [];
  const employeeOverview = dashboardData?.employeeOverview || [];

  return (
    <div className="space-y-7 pb-10">
      {/* Greeting & Mandatory Top Action Strip (New Request + Groups side-by-side on mobile & desktop) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono tabular-nums text-slate-400">
            {todayFormatted}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
            Hi {user.name} <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Super Admin Workspace · Organization-wide approvals & employee overview'
              : `${user.designation} · ${user.department}`}
          </p>
        </div>

        {/* MANDATORY REQUIREMENT: New Request button and Groups button/icon visible next to each other near the top of the dashboard on mobile and desktop */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('groups')}
            className="h-11 px-4 rounded-full bg-[#111e33] hover:bg-[#172945] border border-[#223759] text-slate-100 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Groups</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('new-request')}
            className="h-11 px-5 rounded-full bg-[#00c471] hover:bg-[#00b065] active:scale-[0.98] text-[#04150d] text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/15 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New request</span>
          </button>
        </div>
      </div>

      {/* Role-Based Clickable KPI Cards */}
      {isSuperAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigate('all-requests')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">Total Approvals</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.totalApprovals}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('pending-approvals')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">
                Pending Approvals
              </p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.pendingApprovals}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('approved-requests')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">
                Approved Requests
              </p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.approvedRequests}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('rejected-requests')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">
                Rejected Requests
              </p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.rejectedRequests}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('employees')}
            className="col-span-2 lg:col-span-1 bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">Total Employees</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.totalEmployees}
              </p>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigate('my-requests')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">
                My submissions
              </p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.mySubmissions}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('pending-approvals')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">My pending</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.myPending}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('approved-requests')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">Approved</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.myApproved}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('rejected-requests')}
            className="bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">Rejected</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-0.5">
                {kpis.myRejected}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Super Admin Quick Actions Strip */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('employees', { openCreate: true })}
            className="p-3.5 rounded-2xl bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200 truncate">
              Add Employee
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('manage-categories')}
            className="p-3.5 rounded-2xl bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200 truncate">
              Manage Categories
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="p-3.5 rounded-2xl bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200 truncate">
              Excel Reports
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pending-approvals')}
            className="p-3.5 rounded-2xl bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200 truncate">
              Review Pending ({kpis.pendingApprovals})
            </span>
          </button>
        </div>
      )}

      {/* Start a Request Section (Exact match to reference UI) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Start a request</h2>
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('manage-categories')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Customize Categories</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleCategories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                onNavigate('new-request', { categoryId: cat.id })
              }
              className="w-full bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center justify-between gap-4 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 ${getCategoryTint(
                    idx
                  )}`}
                >
                  <CategoryIcon name={cat.icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {cat.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {cat.description ||
                      (Array.isArray(cat.subcategories)
                        ? cat.subcategories.slice(0, 3).join(', ')
                        : '')}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>

        {categories.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="w-full h-11 rounded-2xl bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>
              {showAllCategories
                ? 'Show Fewer Categories'
                : `View All (${categories.length} Categories)`}
            </span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${
                showAllCategories ? 'rotate-90' : ''
              }`}
            />
          </button>
        )}
      </section>

      {/* Pending Approval Queue (for Super Admin or Approvers with pending items) */}
      {pendingApprovalList.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                Awaiting Your Approval ({pendingApprovalList.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pending-approvals')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {pendingApprovalList.slice(0, 5).map((req: any) => (
              <button
                key={req.id}
                type="button"
                onClick={() =>
                  onNavigate('request-details', { requestId: req.id })
                }
                className="w-full bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {req.title}
                  </p>
                  <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5 truncate">
                    {req.requestCode} · {req.employeeName} · {req.categoryName}
                  </p>
                  <p className="text-xs text-slate-300 font-mono tabular-nums mt-1">
                    {new Date(req.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {req.amount
                      ? ` · ₹${Number(req.amount).toLocaleString('en-IN')}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-amber-400 border border-amber-500/40 bg-amber-500/10 px-3 py-1 rounded-full">
                    Review
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent Approvals Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Recent Approvals</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onNavigate(isSuperAdmin ? 'all-requests' : 'my-requests')
            }
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-slate-200">
              No approval requests submitted yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ New request" above or select any category to submit your
              first approval request.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('new-request')}
              className="mt-4 h-10 px-5 rounded-full bg-[#00c471] text-[#04150d] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Request
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((req: any) => {
              const statusStyle =
                req.status === 'Approved'
                  ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                  : req.status === 'Rejected'
                  ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                  : 'text-amber-400 border-amber-500/40 bg-amber-500/10';
              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() =>
                    onNavigate('request-details', { requestId: req.id })
                  }
                  className="w-full bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                      <CategoryIcon
                        name="FileText"
                        className="w-5 h-5 text-sky-400"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {req.title}
                      </p>
                      <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5 truncate">
                        {req.requestCode}
                        {isSuperAdmin ? ` · ${req.employeeName}` : ''}
                      </p>
                      <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {req.amount
                          ? ` • ₹${Number(req.amount).toLocaleString('en-IN')}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold border px-3 py-1 rounded-full ${statusStyle}`}
                    >
                      {req.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Super Admin Bottom Split: Recent Activities & Employee Overview */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Recent Approval Activity
              </h3>
              <span className="text-xs text-slate-400">Live Audit Log</span>
            </div>
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                No workflow actions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivities.slice(0, 6).map((act: any) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() =>
                      onNavigate('request-details', {
                        requestId: act.requestId,
                      })
                    }
                    className="w-full flex items-start justify-between gap-3 py-2 border-b border-[#1a2b45] last:border-0 text-left hover:opacity-90 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {act.actionByName} — {act.action} ({act.requestCode})
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {act.requestTitle}
                        {act.remarks ? ` · "${act.remarks}"` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                      {new Date(act.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Employee Overview */}
          <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Employee Directory Overview
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('employees')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                Manage All →
              </button>
            </div>
            <div className="space-y-2.5">
              {employeeOverview.slice(0, 6).map((emp: any) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() =>
                    onNavigate('employee-details', { employeeId: emp.id })
                  }
                  className="w-full flex items-center justify-between gap-3 py-2 border-b border-[#1a2b45] last:border-0 text-left hover:opacity-90 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {emp.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {emp.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
                        {emp.employeeId} · {emp.department} · {emp.mobile}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {emp.role === 'super_admin' ? 'Super Admin' : emp.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
