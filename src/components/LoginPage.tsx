import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  KeyRound,
  Lock,
  Phone,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiRequest, setAuthToken } from '../lib/api.ts';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface SuperAdminStatusItem {
  id: number;
  name: string;
  mobile: string;
  employeeId: string;
  status: string;
  hasPasswordConfigured: boolean;
}

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminsStatus, setAdminsStatus] = useState<SuperAdminStatusItem[]>([]);
  const [salwaNotice, setSalwaNotice] = useState<string | null>(null);
  const [salwaMobile, setSalwaMobile] = useState('');
  const [salwaPassword, setSalwaPassword] = useState('');
  const [configuringSalwa, setConfiguringSalwa] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const loadAdminsStatus = async () => {
    try {
      const data = await apiRequest<{
        admins: SuperAdminStatusItem[];
        salwaAccountNotice: string | null;
      }>('/api/auth/super-admins-status');
      setAdminsStatus(data.admins || []);
      setSalwaNotice(data.salwaAccountNotice || null);
    } catch {
      // Ignore initial status error
    }
  };

  useEffect(() => {
    loadAdminsStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await apiRequest<{
        token: string;
        user: any;
        firstTimeConfigured?: boolean;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ mobile: mobile.trim(), password }),
      });

      setAuthToken(res.token);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Invalid mobile number or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setAuthToken(idToken);
      const me = await apiRequest<{ user: any }>('/api/auth/me');
      onLoginSuccess(me.user, idToken);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureSalwa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfiguringSalwa(true);
    try {
      const res = await apiRequest<{ token: string; user: any }>(
        '/api/auth/configure-salwa',
        {
          method: 'POST',
          body: JSON.stringify({
            mobile: salwaMobile.trim(),
            password: salwaPassword,
          }),
        }
      );
      setAuthToken(res.token);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Failed to configure Salwa account.');
    } finally {
      setConfiguringSalwa(false);
    }
  };

  const selectAdminQuickFill = (admin: SuperAdminStatusItem) => {
    setMobile(admin.mobile);
    if (!admin.hasPasswordConfigured) {
      setInfoMessage(
        `${admin.name} (${admin.mobile}) is ready for initial password setup. Enter your desired password (min 6 characters) below and click Sign In to hash and save it permanently.`
      );
    } else {
      setInfoMessage(
        `Selected ${admin.name} (${admin.mobile}). Enter your configured password to sign in.`
      );
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070e1a] text-slate-100 flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand Header with Official Uploaded Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 rounded-2xl overflow-hidden border border-[#1e2f4d] shadow-xl bg-[#0d1726] p-1.5">
            <img
              src="/assets/aistudio/Ibat_Logo__2___1__de631039.png"
              alt="IBAT OP Logo"
              referrerPolicy="no-referrer"
              className="w-20 h-20 object-contain rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              IBAT OP
            </h1>
            <span className="text-xs font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              PWA
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5">
            Enterprise Approval & Workflow Management System
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-6 sm:p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              Sign in to your account
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your registered mobile number and password
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#00c471] hover:bg-[#00b065] active:scale-[0.99] text-[#04150d] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#1a2b45]" />
            <span className="text-[11px] text-slate-500">OR</span>
            <div className="h-px flex-1 bg-[#1a2b45]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#111e33] hover:bg-[#162640] border border-[#1e2f4d] text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Sign in with Authorized Google Account
          </button>

          {/* Install App Button on Login Screen */}
          {!isInstalled && (isInstallable || isIOS) && (
            <button
              type="button"
              onClick={() => (isIOS ? setShowIOSModal(true) : install())}
              className="mt-3 w-full h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Install IBAT OP
            </button>
          )}
        </div>

        {/* Designated Super Admins Directory & First-Time Password Configuration */}
        <div className="mt-4 bg-[#0d1726] border border-[#1a2b45] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#111e33] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Designated Super Admin Accounts (4)
                </p>
                <p className="text-[11px] text-slate-400">
                  Click any account to fill mobile or configure initial password
                </p>
              </div>
            </div>
            {showAdminPanel ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdminPanel && (
            <div className="px-5 pb-5 pt-2 border-t border-[#1a2b45] space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {adminsStatus.map((adm) => (
                  <button
                    key={adm.id}
                    type="button"
                    onClick={() => selectAdminQuickFill(adm)}
                    className="w-full p-3 rounded-xl bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {adm.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                        Mobile: {adm.mobile} · {adm.employeeId}
                      </p>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {adm.hasPasswordConfigured
                        ? 'Password Active →'
                        : 'Set Password on Login →'}
                    </span>
                  </button>
                ))}
              </div>

              {salwaNotice && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="text-xs text-amber-200 leading-relaxed">
                    <strong className="block text-amber-300 mb-0.5">
                      Account 4 (Salwa) Verification Notice:
                    </strong>
                    {salwaNotice}
                  </div>
                  <form onSubmit={handleConfigureSalwa} className="space-y-2.5">
                    <input
                      type="tel"
                      required
                      value={salwaMobile}
                      onChange={(e) => setSalwaMobile(e.target.value)}
                      placeholder="Salwa's existing 10-digit mobile number"
                      className="w-full h-9 px-3 rounded-lg bg-[#070e1a] border border-[#1e2f4d] text-xs text-white placeholder:text-slate-500 tabular-nums"
                    />
                    <input
                      type="password"
                      required
                      value={salwaPassword}
                      onChange={(e) => setSalwaPassword(e.target.value)}
                      placeholder="Salwa's password (min 6 chars)"
                      className="w-full h-9 px-3 rounded-lg bg-[#070e1a] border border-[#1e2f4d] text-xs text-white placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={configuringSalwa}
                      className="w-full h-9 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#04150d] font-semibold text-xs transition-colors cursor-pointer"
                    >
                      {configuringSalwa
                        ? 'Verifying...'
                        : 'Verify & Activate Salwa Super Admin'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* iOS PWA Install Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1726] border border-[#1a2b45] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">
              Install IBAT OP on iOS
            </h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              1. Tap the <strong>Share</strong> icon in your Safari toolbar.
              <br />
              2. Scroll down and select <strong>Add to Home Screen</strong>.
              <br />
              3. Open IBAT OP from your home screen for full-screen standalone
              mode and push notifications.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full h-10 rounded-xl bg-[#00c471] text-[#04150d] font-semibold text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
