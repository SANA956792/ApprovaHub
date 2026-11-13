/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FolderPlus,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Send,
  Settings,
  User,
  Users,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { apiRequest, getAuthToken, setAuthToken } from './lib/api.ts';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall.ts';
import { LoginPage } from './components/LoginPage.tsx';
import { DashboardView } from './components/DashboardViews.tsx';
import {
  NewRequestPage,
  RequestDetailsPage,
  RequestsListPage,
} from './components/RequestViews.tsx';
import {
  EmployeeDetailsPage,
  EmployeeManagementPage,
  ManageCategoriesPage,
} from './components/AdminAndCategoriesViews.tsx';
import { GroupChatPage, GroupsPage } from './components/GroupsAndChatViews.tsx';
import {
  NotFoundPage,
  NotificationsPage,
  ProfilePage,
  ReportsPage,
  SettingsPage,
} from './components/ReportsNotificationsProfileViews.tsx';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [wsLastEvent, setWsLastEvent] = useState<any | null>(null);

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const navigate = useCallback(
    (page: string, params: Record<string, any> = {}) => {
      setActivePage(page);
      setPageParams(params);
      setMobileDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiRequest<{ categories: any[] }>('/api/categories');
      setCategories(res.categories || []);
    } catch {
      // Ignore
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiRequest('/api/dashboard');
      setDashboardData(res);
    } catch {
      // Ignore
    }
  }, []);

  const refreshAllData = useCallback(() => {
    fetchDashboard();
    fetchCategories();
  }, [fetchDashboard, fetchCategories]);

  // A 401 means the authentication credential is no longer valid. Do not clear
  // the session on 403: that indicates an authorization/permission denial.
  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthToken(null);
      setUser(null);
      setDashboardData(null);
      setActivePage('dashboard');
    };
    window.addEventListener('approval:auth-expired', handleAuthExpired);
    return () =>
      window.removeEventListener('approval:auth-expired', handleAuthExpired);
  }, []);

  // Restore session on mount & handle push notification URL parameters
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }

    apiRequest<{ user: any }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');
        const idParam = urlParams.get('id');
        if (pageParam === 'request-details' && idParam) {
          setActivePage('request-details');
          setPageParams({ requestId: Number(idParam) });
        } else if (pageParam === 'group-chat' && idParam) {
          setActivePage('group-chat');
          setPageParams({ groupId: Number(idParam) });
        } else if (pageParam) {
          setActivePage(pageParam);
        }
      })
      .catch(() => {
        // apiRequest clears credentials on 401 only. Permission errors (403)
        // and transient network failures must not erase a valid stored session.
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  // Load initial dashboard & categories when logged in
  useEffect(() => {
    if (user) {
      refreshAllData();
    }
  }, [user, refreshAllData]);

  // Real-time WebSocket Connection with Auto-Reconnect
  useEffect(() => {
    if (!user) return;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    const connectWs = () => {
      if (unmounted) return;
      const token = getAuthToken();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(
        token || ''
      )}`;

      ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setWsLastEvent({ ...parsed, ts: Date.now() });
          if (
            parsed.event === 'notification:new' ||
            parsed.event === 'request:created' ||
            parsed.event === 'request:updated'
          ) {
            fetchDashboard();
          }
          if (parsed.event === 'categories:updated') {
            fetchCategories();
          }
        } catch {
          // Ignore
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          reconnectTimer = setTimeout(connectWs, 3500);
        }
      };
    };

    connectWs();

    // Listen for push service worker clicks
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const d = event.data.data;
        if (d?.relatedRequestId) {
          navigate('request-details', { requestId: Number(d.relatedRequestId) });
        } else if (d?.relatedGroupId) {
          navigate('group-chat', { groupId: Number(d.relatedGroupId) });
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
    };
  }, [user, fetchDashboard, fetchCategories, navigate]);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setDashboardData(null);
    setActivePage('dashboard');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070e1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/aistudio/Ibat_Logo__2___1__de631039.png"
            alt="APPROVAL Logo"
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-2xl object-contain animate-pulse"
          />
          <p className="text-xs font-semibold text-slate-400">
            Loading APPROVAL Workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setActivePage('dashboard');
        }}
      />
    );
  }

  const isSuperAdmin = user.role === 'super_admin';
  const unreadCount = dashboardData?.unreadNotifications || 0;

  return (
    <div className="min-h-screen bg-[#070e1a] text-slate-100 flex flex-col">
      {/* Top App Bar matching the uploaded reference UI */}
      <header className="sticky top-0 z-30 bg-[#070e1a]/95 backdrop-blur-md border-b border-[#16243b]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Official Uploaded Logo + Brand Title */}
          <button
            type="button"
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
          >
            <img
              src="/assets/aistudio/Ibat_Logo__2___1__de631039.png"
              alt="Official APPROVAL Logo"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl object-contain bg-[#0d1726] border border-[#1e2f4d] p-0.5 shrink-0"
            />
            <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
              APPROVAL
            </span>
          </button>

          {/* Right: Notifications, User Avatar, Menu */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('notifications')}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full hover:bg-[#111e33] flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('profile')}
              title={user.name}
              className="w-9 h-9 rounded-full bg-[#0d3328] border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center justify-center cursor-pointer"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </button>

            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="w-10 h-10 rounded-xl hover:bg-[#111e33] flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secondary Navigation Bar matching the exact reference screenshot */}
        <div className="border-t border-[#122036] bg-[#08111f]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className={`h-9 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activePage === 'dashboard'
                    ? 'bg-[#1a2942] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(isSuperAdmin ? 'all-requests' : 'my-requests')
                }
                className={`h-9 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  [
                    'all-requests',
                    'my-requests',
                    'pending-approvals',
                    'approved-requests',
                    'rejected-requests',
                    'request-details',
                  ].includes(activePage)
                    ? 'bg-[#1a2942] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Requests
              </button>
              <button
                type="button"
                onClick={() => navigate('groups')}
                className={`h-9 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activePage === 'groups' || activePage === 'group-chat'
                    ? 'bg-[#1a2942] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Groups
              </button>
              <button
                type="button"
                onClick={() => navigate('reports')}
                className={`h-9 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activePage === 'reports'
                    ? 'bg-[#1a2942] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Excel Sheet
              </button>
              {isSuperAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('employees')}
                    className={`hidden md:inline-flex items-center h-9 px-3.5 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activePage === 'employees' ||
                      activePage === 'employee-details'
                        ? 'bg-[#1a2942] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Employees
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('manage-categories')}
                    className={`hidden md:inline-flex items-center h-9 px-3.5 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activePage === 'manage-categories'
                        ? 'bg-[#1a2942] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Categories
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('new-request')}
              className="h-9 px-4 rounded-full bg-[#00c471] hover:bg-[#00b065] text-[#04150d] font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New request</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activePage === 'dashboard' && (
          <DashboardView
            user={user}
            dashboardData={dashboardData}
            categories={categories}
            onNavigate={navigate}
          />
        )}

        {activePage === 'new-request' && (
          <NewRequestPage
            user={user}
            categories={categories}
            initialCategoryId={pageParams.categoryId}
            onNavigate={navigate}
            onRefreshData={refreshAllData}
          />
        )}

        {activePage === 'all-requests' && (
          <RequestsListPage
            title="All Approval Requests"
            subtitle="Complete organization-wide request log with search and filters"
            defaultStatus="All"
            scope="all"
            categories={categories}
            onNavigate={navigate}
          />
        )}

        {activePage === 'pending-approvals' && (
          <RequestsListPage
            title="Pending Approvals"
            subtitle="Requests awaiting review and decision"
            defaultStatus="Pending"
            scope={isSuperAdmin ? 'all' : 'all'}
            categories={categories}
            onNavigate={navigate}
          />
        )}

        {activePage === 'approved-requests' && (
          <RequestsListPage
            title="Approved Requests"
            subtitle="All approved requests and verification records"
            defaultStatus="Approved"
            scope="all"
            categories={categories}
            onNavigate={navigate}
          />
        )}

        {activePage === 'rejected-requests' && (
          <RequestsListPage
            title="Rejected Requests"
            subtitle="Rejected requests and approver remarks"
            defaultStatus="Rejected"
            scope="all"
            categories={categories}
            onNavigate={navigate}
          />
        )}

        {activePage === 'my-requests' && (
          <RequestsListPage
            title="My Submitted Requests"
            subtitle="All approval requests created by your account"
            defaultStatus="All"
            scope="my"
            categories={categories}
            onNavigate={navigate}
          />
        )}

        {activePage === 'request-details' && (
          <RequestDetailsPage
            user={user}
            requestId={Number(pageParams.requestId)}
            onNavigate={navigate}
            onRefreshData={refreshAllData}
          />
        )}

        {activePage === 'employees' && (
          <EmployeeManagementPage
            initialOpenCreate={Boolean(pageParams.openCreate)}
            onNavigate={navigate}
          />
        )}

        {activePage === 'employee-details' && (
          <EmployeeDetailsPage
            employeeId={Number(pageParams.employeeId)}
            onNavigate={navigate}
          />
        )}

        {activePage === 'manage-categories' && (
          <ManageCategoriesPage
            onNavigate={navigate}
            onRefreshCategories={fetchCategories}
          />
        )}

        {activePage === 'groups' && (
          <GroupsPage user={user} onNavigate={navigate} />
        )}

        {activePage === 'group-chat' && (
          <GroupChatPage
            user={user}
            groupId={Number(pageParams.groupId)}
            wsLastEvent={wsLastEvent}
            onNavigate={navigate}
          />
        )}

        {activePage === 'notifications' && (
          <NotificationsPage
            onNavigate={navigate}
            onRefreshDashboard={fetchDashboard}
          />
        )}

        {activePage === 'reports' && (
          <ReportsPage categories={categories} onNavigate={navigate} />
        )}

        {activePage === 'profile' && (
          <ProfilePage user={user} onNavigate={navigate} />
        )}

        {activePage === 'settings' && (
          <SettingsPage user={user} onNavigate={navigate} />
        )}

        {![
          'dashboard',
          'new-request',
          'all-requests',
          'pending-approvals',
          'approved-requests',
          'rejected-requests',
          'my-requests',
          'request-details',
          'employees',
          'employee-details',
          'manage-categories',
          'groups',
          'group-chat',
          'notifications',
          'reports',
          'profile',
          'settings',
        ].includes(activePage) && <NotFoundPage onNavigate={navigate} />}
      </main>

      {/* Slide-Over Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
          <div className="w-72 bg-[#0d1726] border-l border-[#1a2b45] h-full flex flex-col justify-between p-5 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#1a2b45]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/Ibat_Logo__2___1__de631039.png"
                    alt="Official APPROVAL Logo"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-contain bg-[#070e1a] p-0.5"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">APPROVAL</p>
                    <p className="text-[11px] text-emerald-400">
                      {isSuperAdmin ? 'Super Admin' : 'Employee'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => navigate('dashboard')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Home className="w-4 h-4 text-emerald-400" />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate('new-request')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  New Request
                </button>
                <button
                  type="button"
                  onClick={() => navigate('my-requests')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-sky-400" />
                  My Requests
                </button>
                <button
                  type="button"
                  onClick={() => navigate('pending-approvals')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  Pending Approvals
                </button>
                <button
                  type="button"
                  onClick={() => navigate('approved-requests')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Approved Requests
                </button>
                <button
                  type="button"
                  onClick={() => navigate('rejected-requests')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  Rejected Requests
                </button>
                <button
                  type="button"
                  onClick={() => navigate('groups')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Groups & Chat
                </button>
                <button
                  type="button"
                  onClick={() => navigate('reports')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Reports & Excel Export
                </button>

                {isSuperAdmin && (
                  <>
                    <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-slate-500 uppercase">
                      Super Admin
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('all-requests')}
                      className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-emerald-400" />
                      All Requests
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('employees')}
                      className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-violet-400" />
                      Employee Management
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('manage-categories')}
                      className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4 text-sky-400" />
                      Manage Categories
                    </button>
                  </>
                )}

                <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-slate-500 uppercase">
                  Account
                </div>
                <button
                  type="button"
                  onClick={() => navigate('notifications')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-emerald-400" />
                  Notifications ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={() => navigate('profile')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-300" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate('settings')}
                  className="w-full h-10 px-3 rounded-xl hover:bg-[#122036] flex items-center gap-3 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-300" />
                  Settings & PWA
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-[#1a2b45] space-y-2">
              {!isInstalled && (isInstallable || isIOS) && (
                <button
                  type="button"
                  onClick={install}
                  className="w-full h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Install APPROVAL App
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Mode Indicator Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xl">
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode — Cached PWA interface active</span>
        </div>
      )}
    </div>
  );
}
