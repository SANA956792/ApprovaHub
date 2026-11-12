import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Edit3,
  MessageSquare,
  Plus,
  Send,
  Share2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';

// ==================== 1. GROUPS LIST & CREATE GROUP PAGE ====================
interface GroupsPageProps {
  user: any;
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const GroupsPage: React.FC<GroupsPageProps> = ({ onNavigate }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const [grpRes, empRes] = await Promise.all([
        apiRequest<{ groups: any[] }>('/api/groups'),
        apiRequest<{ employees: any[] }>('/api/employees?status=active'),
      ]);
      setGroups(grpRes.groups || []);
      setEmployees(empRes.employees || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const toggleMemberSelection = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!groupName.trim()) {
      setError('Group Name is required.');
      return;
    }
    setCreating(true);
    try {
      const res = await apiRequest<{ group: any }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim(),
          memberIds: selectedMemberIds,
        }),
      });
      setShowCreateModal(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedMemberIds([]);
      onNavigate('group-chat', { groupId: res.group.id });
    } catch (err: any) {
      setError(err.message || 'Failed to create group.');
    } finally {
      setCreating(false);
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
              Approval Groups & Live Chat
            </h1>
            <p className="text-xs text-slate-400">
              Collaborate with registered employees and review shared approval
              cards in real time
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 rounded-full bg-[#00c471] text-[#04150d] font-bold text-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-24 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-10 text-center space-y-3">
          <MessageSquare className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            No groups created yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create a department or project group to chat in real time and share
            approval request cards with your team.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-10 px-5 rounded-full bg-[#00c471] text-[#04150d] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onNavigate('group-chat', { groupId: g.id })}
              className="w-full bg-[#0d1726] hover:bg-[#122036] border border-[#1a2b45] rounded-2xl p-5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {g.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      · {g.memberCount} members
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {g.description || 'Department approval & collaboration group'}
                  </p>
                  {g.lastMessage && (
                    <p className="text-xs text-emerald-300 truncate mt-1.5">
                      <strong>{g.lastMessage.senderName}:</strong>{' '}
                      {g.lastMessage.messageText}
                    </p>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1726] border border-[#1a2b45] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                Create New Approval Group
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Finance & Purchase Approvals"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Purpose of this group"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Registered Employees ({selectedMemberIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl bg-[#070e1a] border border-[#1e2f4d] divide-y divide-[#1a2b45]">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#111e33] cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-white">{emp.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {emp.employeeId} · {emp.department} · {emp.mobile}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(emp.id)}
                        onChange={() => toggleMemberSelection(emp.id)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 px-4 rounded-xl bg-[#111e33] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 px-5 rounded-xl bg-[#00c471] text-[#04150d] text-xs font-bold cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 2. GROUP CHAT, SHARED CARDS & MEMBER MANAGEMENT ====================
interface GroupChatPageProps {
  user: any;
  groupId: number;
  wsLastEvent: any;
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const GroupChatPage: React.FC<GroupChatPageProps> = ({
  user,
  groupId,
  wsLastEvent,
  onNavigate,
}) => {
  const [group, setGroup] = useState<any | null>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [addUserId, setAddUserId] = useState<number | ''>('');
  const [showShareModal, setShowShareModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const loadGroupDetails = async () => {
    try {
      const res = await apiRequest<{ group: any }>(`/api/groups/${groupId}`);
      setGroup(res.group);
      setEditName(res.group.name);
      setEditDesc(res.group.description || '');
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadGroupDetails();
    apiRequest<{ employees: any[] }>('/api/employees?status=active')
      .then((res) => setAllEmployees(res.employees || []))
      .catch(() => {});
    apiRequest<{ requests: any[] }>('/api/requests')
      .then((res) => setMyRequests(res.requests || []))
      .catch(() => {});
  }, [groupId]);

  // Real-time WebSocket message sync
  useEffect(() => {
    if (!wsLastEvent) return;
    if (
      (wsLastEvent.event === 'group:message' ||
        wsLastEvent.event === 'group:updated') &&
      Number(wsLastEvent.data?.groupId) === Number(groupId)
    ) {
      loadGroupDetails();
    }
  }, [wsLastEvent, groupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [group?.messages?.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      await apiRequest(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ messageText: text }),
      });
      await loadGroupDetails();
    } catch {
      // Ignore
    } finally {
      setSending(false);
    }
  };

  const handleShareRequestCard = async (req: any) => {
    setShowShareModal(false);
    try {
      await apiRequest(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messageText: `Shared approval request ${req.requestCode}: ${req.title}`,
          sharedRequestId: req.id,
        }),
      });
      await loadGroupDetails();
    } catch {
      // Ignore
    }
  };

  const handleUpdateGroupInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/api/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      setEditingInfo(false);
      await loadGroupDetails();
    } catch {
      // Ignore
    }
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    try {
      await apiRequest(`/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: Number(addUserId) }),
      });
      setAddUserId('');
      await loadGroupDetails();
    } catch {
      // Ignore
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    try {
      await apiRequest(`/api/groups/${groupId}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      await loadGroupDetails();
    } catch {
      // Ignore
    }
  };

  if (loading || !group) {
    return (
      <div className="h-96 rounded-2xl bg-[#0d1726] border border-[#1a2b45] animate-pulse" />
    );
  }

  const existingMemberIds = new Set((group.members || []).map((m: any) => m.id));
  const availableToAdd = allEmployees.filter(
    (e) => !existingMemberIds.has(e.id)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      {/* Group Top Header */}
      <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('groups')}
            className="w-10 h-10 rounded-xl bg-[#070e1a] border border-[#1e2f4d] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white">
              {group.name}
            </h1>
            <p className="text-xs text-slate-400">
              {group.members?.length || 0} members ·{' '}
              {group.description || 'Real-time group chat'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#00c471] text-[#04150d]'
                : 'bg-[#070e1a] border border-[#1e2f4d] text-slate-300'
            }`}
          >
            Live Chat ({group.messages?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'members'
                ? 'bg-[#00c471] text-[#04150d]'
                : 'bg-[#070e1a] border border-[#1e2f4d] text-slate-300'
            }`}
          >
            Group Details & Members ({group.members?.length || 0})
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        /* WhatsApp-Style Chat Window */
        <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl flex flex-col h-[68vh]">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {(group.messages || []).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-500 mb-2" />
                <p>No messages in this group yet. Say hello or share a request card!</p>
              </div>
            ) : (
              group.messages.map((msg: any) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 border ${
                        isMe
                          ? 'bg-[#083828] border-emerald-500/30 text-slate-100 rounded-br-none'
                          : 'bg-[#070e1a] border-[#1e2f4d] text-slate-100 rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-[11px] font-bold text-emerald-400">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        <span className="text-[10px] font-mono tabular-nums text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-white leading-relaxed break-words">
                        {msg.messageText}
                      </p>

                      {/* Clickable Shared Approval Request Card */}
                      {msg.sharedRequest && (
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate('request-details', {
                              requestId: msg.sharedRequest.id,
                            })
                          }
                          className="mt-2.5 w-full rounded-xl bg-[#0d1726] hover:bg-[#122036] border border-[#223759] p-3 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono tabular-nums text-emerald-400 font-bold">
                              {msg.sharedRequest.requestCode}
                            </span>
                            <span className="text-[10px] font-semibold text-amber-300">
                              {msg.sharedRequest.status} →
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-0.5 truncate">
                            {msg.sharedRequest.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {msg.sharedRequest.categoryName} /{' '}
                            {msg.sharedRequest.subcategory}
                            {msg.sharedRequest.amount
                              ? ` · ₹${Number(
                                  msg.sharedRequest.amount
                                ).toLocaleString('en-IN')}`
                              : ''}
                          </p>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 border-t border-[#1a2b45] bg-[#070e1a] rounded-b-2xl flex items-center gap-2.5"
          >
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              title="Share Request Card"
              className="w-10 h-10 rounded-xl bg-[#0d1726] hover:bg-[#122036] border border-[#1e2f4d] flex items-center justify-center text-emerald-400 shrink-0 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message to the group..."
              className="flex-1 h-10 px-4 rounded-xl bg-[#0d1726] border border-[#1e2f4d] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="h-10 px-4 rounded-xl bg-[#00c471] hover:bg-[#00b065] text-[#04150d] font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      ) : (
        /* Group Details & Members Management View */
        <div className="bg-[#0d1726] border border-[#1a2b45] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1a2b45] pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Group Information
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit group name, description, and manage registered members
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingInfo(!editingInfo)}
              className="h-8 px-3 rounded-lg bg-[#070e1a] border border-[#1e2f4d] text-xs text-emerald-400 flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {editingInfo ? 'Cancel Edit' : 'Edit Group'}
            </button>
          </div>

          {editingInfo && (
            <form
              onSubmit={handleUpdateGroupInfo}
              className="p-4 rounded-xl bg-[#070e1a] border border-[#1e2f4d] space-y-3"
            >
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#0d1726] border border-[#1e2f4d] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#0d1726] border border-[#1e2f4d] text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[#00c471] text-[#04150d] font-bold text-xs cursor-pointer"
              >
                Save Group Info
              </button>
            </form>
          )}

          {/* Add Registered Employee to Group */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Add Registered Employee to Group
            </label>
            <div className="flex items-center gap-2.5">
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(Number(e.target.value))}
                className="flex-1 h-10 px-3 rounded-xl bg-[#070e1a] border border-[#1e2f4d] text-xs text-white"
              >
                <option value="">Select Employee to Add...</option>
                {availableToAdd.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId} · {emp.department})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!addUserId}
                className="h-10 px-4 rounded-xl bg-[#00c471] text-[#04150d] font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-300">
              Group Members ({group.members?.length || 0})
            </h3>
            <div className="divide-y divide-[#1a2b45] rounded-xl bg-[#070e1a] border border-[#1e2f4d]">
              {(group.members || []).map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-bold text-white">
                      {m.name}{' '}
                      <span className="text-emerald-400 font-normal">
                        ({m.groupRole})
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {m.employeeId} · {m.department} · {m.mobile}
                    </p>
                  </div>
                  {m.id !== user.id && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="h-8 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Approval Request Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1726] border border-[#1a2b45] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Share Approval Request Card to Chat
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {myRequests.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No requests available to share.
                </p>
              ) : (
                myRequests.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleShareRequestCard(r)}
                    className="w-full p-3 rounded-xl bg-[#070e1a] hover:bg-[#111e33] border border-[#1e2f4d] text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {r.requestCode}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white mt-0.5 truncate">
                      {r.title}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
