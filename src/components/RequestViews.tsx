import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  IndianRupee,
  Paperclip,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { apiRequest, getAuthToken } from '../lib/api.ts';
import { CategoryIcon, getCategoryTint } from './CategoryIcon.tsx';

// ==================== 1. NEW REQUEST PAGE ====================
interface NewRequestPageProps {
  user: any;
  categories: any[];
  initialCategoryId?: number;
  onNavigate: (page: string, params?: Record<string, any>) => void;
  onRefreshData: () => void;
}

export const NewRequestPage: React.FC<NewRequestPageProps> = ({
  categories,
  initialCategoryId,
  onNavigate,
  onRefreshData,
}) => {
  const activeCategories = categories.filter((c) => c.isActive !== false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(
    initialCategoryId || (activeCategories[0]?.id ?? 1)
  );
  const selectedCategory =
    activeCategories.find((c) => c.id === selectedCategoryId) ||
    activeCategories[0];

  const [subcategory, setSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numDays, setNumDays] = useState('');
  const [assignedApproverId, setAssignedApproverId] = useState<number | ''>('');
  const [visibility, setVisibility] = useState<'private' | 'group'>('private');
  const [groupId, setGroupId] = useState<number | ''>('');
  const [files, setFiles] = useState<File[]>([]);

  const [approvers, setApprovers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategoryId(initialCategoryId);
    }
  }, [initialCategoryId]);

  useEffect(() => {
    if (
      selectedCategory &&
      Array.isArray(selectedCategory.subcategories) &&
      selectedCategory.subcategories.length > 0
    ) {
      setSubcategory(selectedCategory.subcategories[0]);
    } else {
      setSubcategory('');
    }
  }, [selectedCategoryId, selectedCategory]);

  // Auto-calculate number of days when startDate & endDate change
  useEffect(() => {
    if (startDate && endDate && endDate >= startDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      setNumDays(String(diff));
    }
  }, [startDate, endDate]);

  useEffect(() => {
    apiRequest<{ approvers: any[] }>('/api/approvers')
      .then((res) => {
        setApprovers(res.approvers || []);
        const firstSuperAdmin = (res.approvers || []).find(
          (a) => a.role === 'super_admin'
        );
        if (firstSuperAdmin) {
          setAssignedApproverId(firstSuperAdmin.id);
        } else if (res.approvers?.[0]) {
          setAssignedApproverId(res.approvers[0].id);
        }
      })
      .catch(() => {});

    apiRequest<{ groups: any[] }>('/api/groups')
      .then((res) => {
        setGroups(res.groups || []);
        if (res.groups?.[0]) {
          setGroupId(res.groups[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const showAmountFields = Boolean(
    selectedCategory?.requiresAmount ||
      [
        'Expense Reimbursement',
        'Equipment Purchase',
        'Software Subscription',
        'Stationery Purchase',
        'Meta Ads Budget',
        'Office Maintenance',
        'Travel Request',
        'Salary Increment Request',
      ].includes(selectedCategory?.name || '')
  );

  const showDateRangeFields = Boolean(
    selectedCategory?.requiresDates ||
      [
        'Casual Leave',
        'Sick Leave',
        'Permission Request',
        'Travel Request',
        'Early Leaving Office Request',
        'Software Subscription',
        'Meta Ads Budget',
      ].includes(selectedCategory?.name || '')
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (selected.length > 5) {
      setError('Maximum 5 files can be attached per request.');
      return;
    }
    setFiles(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCategory || !subcategory) {
      setError('Please select a request category and subcategory.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError('Request Title and Description are required.');
      return;
    }
    if (showAmountFields && amount.trim() !== '') {
      if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
        setError('Please enter a valid positive numeric amount.');
        return;
      }
    }
    if (startDate && endDate && endDate < startDate) {
      setError('End Date cannot be earlier than Start Date.');
      return;
    }
    if (!assignedApproverId) {
      setError('Please select an Assigned Approver.');
      return;
    }
    if (visibility === 'group' && !groupId) {
      setError('Please select a group for Group Visibility.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('categoryId', String(selectedCategory.id));
      formData.append('categoryName', selectedCategory.name);
      formData.append('subcategory', subcategory);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (amount.trim()) formData.append('amount', amount.trim());
      if (vendor.trim()) formData.append('vendor', vendor.trim());
      if (paymentDate) formData.append('paymentDate', paymentDate);
      if (startDate) formData.append('startDate', startDate);
      if (endDate) formData.append('endDate', endDate);
      if (numDays) formData.append('numDays', numDays);
      formData.append('assignedApproverId', String(assignedApproverId));
      formData.append('visibility', visibility);
      if (visibility === 'group' && groupId) {
        formData.append('groupId', String(groupId));
      }
      for (const f of files) {
        formData.append('attachments', f);
      }

      const res = await apiRequest<{ request: any }>('/api/requests', {
        method: 'POST',
        body: formData,
      });

      setSubmittedRequest(res.request);
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRequest) {
    return (
      <div className="max-w-lg mx-auto bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-7 text-center space-y-5 my-8">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-mono tabular-nums text-emerald-400">
            {submittedRequest.request_code}
          </p>
          <h2 className="text-xl font-bold text-white mt-1">
            Request Submitted Successfully
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Your request <strong>"{submittedRequest.title}"</strong> has been
            permanently recorded in PostgreSQL with status{' '}
            <strong>Pending</strong> and assigned for approval.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() =>
              onNavigate('request-details', { requestId: submittedRequest.id })
            }
            className="flex-1 h-11 rounded-xl bg-[#00c471] text-[#04150d] font-bold text-xs cursor-pointer"
          >
            View Request Details
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex-1 h-11 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-slate-200 font-semibold text-xs cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-white">Create New Request</h1>
          <p className="text-xs text-slate-400">
            Select a category and complete the required approval details
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 sm:p-7 space-y-6"
      >
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Category Selection Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2.5">
            1. Request Category *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {activeCategories.map((cat, idx) => {
              const active = cat.id === selectedCategory?.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-[#070e1a] border-[#1e2f4d] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${getCategoryTint(
                      idx
                    )}`}
                  >
                    <CategoryIcon name={cat.icon} className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold truncate">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategory & Assigned Approver */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              2. Subcategory *
            </label>
            <select
              required
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {(selectedCategory?.subcategories || []).map((sub: string) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              3. Assigned Approver *
            </label>
            <select
              required
              value={assignedApproverId}
              onChange={(e) => setAssignedApproverId(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select Approver</option>
              {approvers.map((ap) => (
                <option key={ap.id} value={ap.id}>
                  {ap.name} ({ap.role === 'super_admin' ? 'Super Admin' : ap.designation} · {ap.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Request Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${subcategory || 'Request'} for ${selectedCategory?.name || 'Operations'}`}
              className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Detailed Description & Justification *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete context, purpose, invoice reference, or reason..."
              className="w-full p-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Dynamic Financial Fields */}
        {showAmountFields && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1a2b45]">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Amount (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required={showAmountFields}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vendor / Recipient
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Vendor or beneficiary name"
                className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment / Bill Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Dynamic Date / Duration Fields */}
        {showDateRangeFields && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1a2b45]">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required={showDateRangeFields}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                required={showDateRangeFields}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Number of Days
              </label>
              <input
                type="number"
                min="1"
                value={numDays}
                onChange={(e) => setNumDays(e.target.value)}
                placeholder="1"
                className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Visibility & Group Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1a2b45]">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Request Visibility
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`h-11 rounded-xl border text-xs font-semibold cursor-pointer ${
                  visibility === 'private'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-[#070e1a] border-[#1e2f4d] text-slate-400'
                }`}
              >
                Private (Approver Only)
              </button>
              <button
                type="button"
                onClick={() => setVisibility('group')}
                className={`h-11 rounded-xl border text-xs font-semibold cursor-pointer ${
                  visibility === 'group'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-[#070e1a] border-[#1e2f4d] text-slate-400'
                }`}
              >
                Share in Group
              </button>
            </div>
          </div>

          {visibility === 'group' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Target Group *
              </label>
              {groups.length === 0 ? (
                <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                  No groups created yet.{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('groups')}
                    className="underline font-semibold"
                  >
                    Create a group first
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.memberCount} members)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* File Attachments (Supabase Storage / PostgreSQL Binary Store) */}
        <div className="pt-2 border-t border-[#1a2b45]">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Supporting Bills / Documents (Max 5 files, 10MB each)
          </label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#1e2f4d] hover:border-emerald-500/50 rounded-2xl p-5 bg-[#070e1a] cursor-pointer transition-colors">
            <Upload className="w-6 h-6 text-emerald-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-200">
              Click to attach bills, invoices, receipts, or PDFs
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Stored permanently in Supabase Storage / PostgreSQL storage
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-[#070e1a] border border-[#1e2f4d] rounded-xl px-3.5 py-2"
                >
                  <span className="truncate text-slate-200">{f.name}</span>
                  <span className="text-slate-400 font-mono tabular-nums shrink-0 ml-2">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="h-11 px-5 rounded-xl bg-[#111e33] border border-[#1e2f4d] text-xs font-semibold text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-6 rounded-xl bg-[#00c471] hover:bg-[#00b065] text-[#04150d] text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting Request...' : 'Submit Approval Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ==================== 2. REQUESTS LIST VIEW ====================
interface RequestsListPageProps {
  title: string;
  subtitle: string;
  defaultStatus?: string;
  scope?: 'all' | 'my' | 'assigned';
  categories: any[];
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const RequestsListPage: React.FC<RequestsListPageProps> = ({
  title,
  subtitle,
  defaultStatus = 'All',
  scope = 'all',
  categories,
  onNavigate,
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    setStatusFilter(defaultStatus);
  }, [defaultStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'All') {
        params.set('status', statusFilter);
      }
      if (categoryFilter && categoryFilter !== 'All') {
        params.set('category', categoryFilter);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (scope) {
        params.set('scope', scope);
      }
      const res = await apiRequest<{ requests: any[] }>(
        `/api/requests?${params.toString()}`
      );
      setRequests(res.requests || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, categoryFilter, scope]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#0d1726] border border-[#1a2b45] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('new-request')}
          className="h-10 px-4 rounded-full bg-[#00c471] text-[#04150d] font-bold text-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRequests()}
            placeholder="Search by Request ID, title, employee, department..."
            className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-10 text-center space-y-2">
          <Filter className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-white">
            No matching approval requests found
          </p>
          <p className="text-xs text-slate-400">
            Adjust your filters or submit a new request.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
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
                className="w-full bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition-colors cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                      {req.requestCode}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-300 font-medium">
                      {req.categoryName} / {req.subcategory}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Submitted by{' '}
                    <span className="text-slate-200 font-medium">
                      {req.employeeName}
                    </span>{' '}
                    ({req.department}) · Assigned to{' '}
                    <span className="text-slate-200 font-medium">
                      {req.assignedApproverName}
                    </span>
                  </p>
                  {req.remarks && (
                    <p className="text-xs text-slate-300 italic pt-0.5">
                      Remarks: "{req.remarks}"
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <span
                    className={`text-xs font-semibold border px-3 py-1 rounded-full ${statusStyle}`}
                  >
                    {req.status}
                  </span>
                  <div className="text-right font-mono tabular-nums">
                    {req.amount && (
                      <p className="text-sm font-bold text-white">
                        ₹{Number(req.amount).toLocaleString('en-IN')}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==================== 3. REQUEST DETAILS & APPROVAL DECISION PAGE ====================
interface RequestDetailsPageProps {
  user: any;
  requestId: number;
  onNavigate: (page: string, params?: Record<string, any>) => void;
  onRefreshData: () => void;
}

export const RequestDetailsPage: React.FC<RequestDetailsPageProps> = ({
  user,
  requestId,
  onNavigate,
  onRefreshData,
}) => {
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [groups, setGroups] = useState<any[]>([]);
  const [shareGroupId, setShareGroupId] = useState<number | ''>('');
  const [sharingToGroup, setSharingToGroup] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ request: any }>(
        `/api/requests/${requestId}`
      );
      setRequest(res.request);
    } catch (err: any) {
      setError(err.message || 'Unable to load request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    apiRequest<{ groups: any[] }>('/api/groups')
      .then((res) => {
        setGroups(res.groups || []);
        if (res.groups?.[0]) setShareGroupId(res.groups[0].id);
      })
      .catch(() => {});
  }, [requestId]);

  const canMakeDecision =
    request &&
    request.status === 'Pending' &&
    (user.role === 'super_admin' || request.assignedApproverId === user.id);

  const handleDecision = async (decision: 'Approved' | 'Rejected') => {
    setError(null);
    setActionMessage(null);
    if (decision === 'Rejected' && !remarks.trim()) {
      setError('Please enter remarks explaining why this request is rejected.');
      return;
    }
    setDeciding(true);
    try {
      const res = await apiRequest<{ request: any }>(
        `/api/requests/${requestId}/decision`,
        {
          method: 'POST',
          body: JSON.stringify({ decision, remarks: remarks.trim() }),
        }
      );
      setRequest(res.request);
      setActionMessage(`Request has been ${decision.toLowerCase()} successfully.`);
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to record decision.');
    } finally {
      setDeciding(false);
    }
  };

  const handleShareToGroup = async () => {
    if (!shareGroupId || !request) return;
    setSharingToGroup(true);
    try {
      await apiRequest(`/api/groups/${shareGroupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messageText: `Shared request ${request.requestCode}: ${request.title}`,
          sharedRequestId: request.id,
        }),
      });
      setActionMessage('Request card shared to group chat.');
    } catch (err: any) {
      setError(err.message || 'Failed to share request to group.');
    } finally {
      setSharingToGroup(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-40 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse" />
        <div className="h-64 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-xl mx-auto bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-8 text-center space-y-3">
        <p className="text-base font-bold text-white">
          {error || 'Request not found'}
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
  }

  const statusBadge =
    request.status === 'Approved'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : request.status === 'Rejected'
      ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
      : 'text-amber-400 border-amber-500/40 bg-amber-500/10';

  const token = getAuthToken();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('all-requests')}
            className="w-10 h-10 rounded-xl bg-[#0d1726] border border-[#1a2b45] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono tabular-nums text-emerald-400 font-bold">
                {request.requestCode}
              </span>
              <span
                className={`text-xs font-semibold border px-3 py-0.5 rounded-full ${statusBadge}`}
              >
                {request.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {request.title}
            </h1>
          </div>
        </div>

        {/* Share to Group Quick Control */}
        {groups.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={shareGroupId}
              onChange={(e) => setShareGroupId(Number(e.target.value))}
              className="h-9 px-3 rounded-xl bg-[#0d1726] border border-[#1a2b45] text-xs text-slate-200"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleShareToGroup}
              disabled={sharingToGroup}
              className="h-9 px-3.5 rounded-xl bg-[#111e33] hover:bg-[#172945] border border-[#223759] text-xs font-semibold text-emerald-400 flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share to Group
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs text-emerald-200">
          {actionMessage}
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-[#1a2b45]">
          <div>
            <p className="text-[11px] text-slate-400">Category</p>
            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {request.categoryName}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Subcategory</p>
            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {request.subcategory}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Submitted By</p>
            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {request.employeeName} ({request.employeeCode})
            </p>
            <p className="text-[11px] text-slate-400">{request.department}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Assigned Approver</p>
            <p className="text-xs sm:text-sm font-semibold text-emerald-400 mt-0.5">
              {request.assignedApproverName}
            </p>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
              {new Date(request.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Amount / Vendor / Date Metadata */}
        {(request.amount ||
          request.vendor ||
          request.paymentDate ||
          request.startDate ||
          request.endDate) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-[#1a2b45]">
            {request.amount && (
              <div>
                <p className="text-[11px] text-slate-400">Requested Amount</p>
                <p className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                  ₹{Number(request.amount).toLocaleString('en-IN')}
                </p>
              </div>
            )}
            {request.vendor && (
              <div>
                <p className="text-[11px] text-slate-400">Vendor / Recipient</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                  {request.vendor}
                </p>
              </div>
            )}
            {request.paymentDate && (
              <div>
                <p className="text-[11px] text-slate-400">Payment / Bill Date</p>
                <p className="text-xs sm:text-sm font-mono tabular-nums text-white mt-0.5">
                  {request.paymentDate}
                </p>
              </div>
            )}
            {request.startDate && (
              <div>
                <p className="text-[11px] text-slate-400">Duration / Dates</p>
                <p className="text-xs sm:text-sm font-mono tabular-nums text-white mt-0.5">
                  {request.startDate}
                  {request.endDate ? ` → ${request.endDate}` : ''}
                  {request.numDays ? ` (${request.numDays} days)` : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">
            Description & Justification
          </p>
          <div className="bg-[#070e1a] border border-[#1e2f4d] rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {request.description}
          </div>
        </div>

        {/* Attachments */}
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Paperclip className="w-4 h-4 text-emerald-400" />
            <span>
              Attached Documents & Bills ({request.attachments?.length || 0})
            </span>
          </p>
          {(!request.attachments || request.attachments.length === 0) ? (
            <p className="text-xs text-slate-500">
              No files were attached to this request.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {request.attachments.map((att: any) => (
                <a
                  key={att.id}
                  href={`/api/attachments/${att.id}/download?token=${encodeURIComponent(
                    token || ''
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {att.fileName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {(att.fileSize / 1024).toFixed(1)} KB ·{' '}
                        {att.storageProvider === 'supabase'
                          ? 'Supabase Storage'
                          : att.storageProvider === 'r2'
                          ? 'Cloudflare R2'
                          : 'Secured DB Store'}
                      </p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-300 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Decision Summary if already decided */}
        {request.status !== 'Pending' && (
          <div className="p-4 rounded-xl bg-[#070e1a] border border-[#1e2f4d] space-y-1">
            <p className="text-xs font-semibold text-white">
              Decision Recorded: {request.status} by{' '}
              {request.decidedByName || request.assignedApproverName}
            </p>
            {request.decisionDate && (
              <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                Decided on {new Date(request.decisionDate).toLocaleString('en-IN')}
              </p>
            )}
            {request.remarks && (
              <p className="text-xs text-slate-200 pt-1">
                <strong>Approver Remarks:</strong> {request.remarks}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Approver Action Panel (Visible ONLY when Pending and currentUser is Assigned Approver or Super Admin) */}
      {canMakeDecision && (
        <div className="bg-[#0d1726] border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Approver Decision Panel
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            You are authorized to approve or reject this request. Decisions are
            final and permanently logged in the approval history.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Approver Remarks / Reason (Required for Rejection)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter approval notes, payment release instructions, or rejection reason..."
              className="w-full p-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={deciding}
              onClick={() => handleDecision('Approved')}
              className="flex-1 h-11 rounded-xl bg-[#00c471] hover:bg-[#00b065] text-[#04150d] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Request
            </button>
            <button
              type="button"
              disabled={deciding}
              onClick={() => handleDecision('Rejected')}
              className="flex-1 h-11 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Reject Request
            </button>
          </div>
        </div>
      )}

      {/* Complete Approval History Timeline */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-white">
          Complete Approval History
        </h2>
        <div className="space-y-4">
          {(request.history || []).map((h: any) => (
            <div
              key={h.id}
              className="flex items-start justify-between gap-4 pb-3 border-b border-[#1a2b45] last:border-0"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">
                  {h.action} — <span className="text-emerald-400">{h.actionByName}</span>
                </p>
                <p className="text-xs text-slate-300">
                  Status: {h.previousStatus ? `${h.previousStatus} → ` : ''}
                  <strong>{h.newStatus}</strong>
                </p>
                {h.remarks && (
                  <p className="text-xs text-slate-400 italic mt-1">
                    "{h.remarks}"
                  </p>
                )}
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                {new Date(h.createdAt).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
