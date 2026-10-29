import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserX,
  Lock,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { ApiResponse, PagedResponse, Role, User, UserStatus } from '../types';
import { formatDate, formatRelativeDate } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Status update modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [targetStatus, setTargetStatus] = useState<UserStatus>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const { success, error: showError } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }

      const res = await api.get<ApiResponse<PagedResponse<User>>>(
        `/api/admin/users?${params.toString()}`
      );

      setUsers(res.data.data.content);
      setTotalElements(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch (err: unknown) {
      showError('Error Loading Users', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, size, searchQuery, showError]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchUsers();
    }, 250);

    return () => clearTimeout(delay);
  }, [fetchUsers]);

  const handleOpenStatusModal = (user: User) => {
    setSelectedUser(user);
    setTargetStatus(user.status);
    setStatusReason('');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmittingStatus(true);
      await api.patch(`/api/admin/users/${selectedUser.id}/status`, {
        status: targetStatus,
        reason: statusReason.trim() || undefined,
      });

      success('User Status Updated', `Updated ${selectedUser.username} to ${targetStatus}`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: unknown) {
      showError('Update Failed', getErrorMessage(err));
    } finally {
      setSubmittingStatus(false);
    }
  };

  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case 'ROLE_SYSTEM_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <ShieldAlert className="w-3 h-3 text-red-600" />
            System Admin
          </span>
        );
      case 'ROLE_VAULT_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3 text-purple-600" />
            Vault Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            User / Owner
          </span>
        );
    }
  };

  const renderStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'LOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Lock className="w-3 h-3 text-amber-600" />
            Locked
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <UserX className="w-3 h-3 text-red-600" />
            Disabled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            System User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System administration control plane. Manage account statuses, lockout policies, and access roles.
          </p>
        </div>

        <button
          onClick={() => fetchUsers()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Users
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by username, email, or full name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Retrieving system accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-900 text-base">No users found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No registered user accounts match your search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((usr) => {
                  const isCurrent = currentUser?.id === usr.id;
                  return (
                    <tr key={usr.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs">
                            {usr.fullName ? usr.fullName.charAt(0).toUpperCase() : usr.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 flex items-center gap-2">
                              <span>{usr.fullName || usr.username}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono block">
                              {usr.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderRoleBadge(usr.role)}
                      </td>

                      <td className="py-3.5 px-4">
                        {renderStatusBadge(usr.status)}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <div>{formatDate(usr.createdAt)}</div>
                        <span className="text-[11px] text-slate-400">{formatRelativeDate(usr.createdAt)}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenStatusModal(usr)}
                          disabled={isCurrent}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-brand-200 rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          title={isCurrent ? 'Cannot modify your own active account status' : 'Modify user status'}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Status</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {page * size + 1} to {Math.min((page + 1) * size, totalElements)} of {totalElements} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
              >
                Previous
              </button>
              <span className="font-medium text-slate-700">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Update User Status Modal */}
      <Modal
        isOpen={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
        title="Update Account Status"
        description={`Adjust account state for ${selectedUser?.fullName || selectedUser?.username}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Target Account Status
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label
                className={`p-3 rounded-lg border cursor-pointer text-center font-semibold transition-colors ${
                  targetStatus === 'ACTIVE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="ACTIVE"
                  checked={targetStatus === 'ACTIVE'}
                  onChange={() => setTargetStatus('ACTIVE')}
                  className="sr-only"
                />
                <span>ACTIVE</span>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer text-center font-semibold transition-colors ${
                  targetStatus === 'LOCKED'
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="LOCKED"
                  checked={targetStatus === 'LOCKED'}
                  onChange={() => setTargetStatus('LOCKED')}
                  className="sr-only"
                />
                <span>LOCKED</span>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer text-center font-semibold transition-colors ${
                  targetStatus === 'DISABLED'
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="DISABLED"
                  checked={targetStatus === 'DISABLED'}
                  onChange={() => setTargetStatus('DISABLED')}
                  className="sr-only"
                />
                <span>DISABLED</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Audit Reason <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              maxLength={255}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. Inactivity lock, security review, or reinstatement..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingStatus}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {submittingStatus ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Confirm Status Update</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
