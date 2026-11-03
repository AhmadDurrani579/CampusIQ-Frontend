
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowRight,
  ShieldCheck,
  Users,
  Search,
  RefreshCw
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader
} from '../../components/ui/index.jsx';

import usersApi from '../../api/usersApi';
import { isMockMode } from '../../api/mode';
import { MockUsersPage } from '../mock/MockAdminPages';

// ========================================
// Extract users from backend response
// ========================================
function extractUsers(response) {
  if (Array.isArray(response)) {
    return {
      users: response,
      total: response.length
    };
  }

  const data = response?.data ?? response;

  const users =
    data?.users ??
    data?.items ??
    data?.results;

  if (!Array.isArray(users)) {
    throw new Error(
      'Invalid users API response. Expected a list of users.'
    );
  }

  return {
    users,
    total: data.total ?? data.count ?? users.length
  };
}

// ========================================
// Format date
// ========================================
function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString();
}

// ========================================
// Main component
// ========================================
export default function UsersPage() {
  if (isMockMode) {
    return <MockUsersPage />;
  }

  return <RealUsersPage />;
}

// ========================================
// Real users directory
// ========================================
function RealUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  // ========================================
  // Get all users from FastAPI
  // ========================================
  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError('');

      try {
        const response = await usersApi.getAllUsers({
          page,
          page_size: pageSize,
          search: debouncedSearch || undefined,
          role: roleFilter === 'ALL' ? undefined : roleFilter,
          approval_status: approvalFilter === 'ALL' ? undefined : approvalFilter
        });

        const result = extractUsers(response);

        if (!cancelled) {
          setUsers(result.users);
          setTotal(Number(result.total));
        }
      } catch (err) {
        console.error('Failed to load users:', err);

        if (cancelled) return;

        setUsers([]);
        setTotal(0);

        const status = err.response?.status;
        const detail = err.response?.data?.detail;

        if (status === 401) {
          setError(
            'Your session has expired. Please sign in again.'
          );
        } else if (status === 403) {
          setError(
            'You do not have permission to view the user directory.'
          );
        } else if (status === 404 || status === 405) {
          setError(
            'The user directory GET API is not available on the backend.'
          );
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError(
            err.message || 'Unable to load users.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, roleFilter, approvalFilter, reloadKey]);

  // ========================================
  // Refresh users
  // ========================================
  const refreshUsers = () => {
    setReloadKey(previous => previous + 1);
  };

  // ========================================
  // Render
  // ========================================
  return (
    <div className="page-stack">

      {/* Page header */}
      <PageHeader
        eyebrow="Access management"
        title="Users & staff"
        description="Manage access to the university communication workspace."
        actions={
          <Button
            variant="secondary"
            onClick={refreshUsers}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      {/* User directory */}
      <Card className="p-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

          <div>
            <h2 className="font-semibold text-lg">
              User directory
            </h2>

            <p className="text-sm text-muted mt-1">
              Registered students, department staff,
              department heads and administrators.
            </p>
          </div>

          <Badge tone="blue">
            <Users size={14} />
            {loading ? 'Loading...' : `${total} users`}
          </Badge>
        </div>

        {/* Search and role filter */}
        <div className="flex flex-wrap gap-4 mb-5">

          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              className="input w-full"
              style={{ paddingLeft: 40 }}
              placeholder="Search users by name or email..."
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="input"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={event => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All roles</option>
            {['STUDENT', 'HOD', 'EXAM_STAFF', 'FINANCE_STAFF', 'IT_STAFF', 'ADMIN'].map(role => (
              <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>
            ))}
          </select>

          <select
            className="input"
            aria-label="Filter by approval status"
            value={approvalFilter}
            onChange={event => {
              setApprovalFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All approval statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-muted" role="status">
              Loading users from the university server...
            </p>
          </div>

        ) : error ? (

          /* API error */
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-5"
            role="alert"
          >
            <h3 className="font-semibold text-red-600">
              Unable to load users
            </h3>

            <p className="text-sm mt-2">
              {error}
            </p>

            <Button
              variant="secondary"
              onClick={refreshUsers}
            >
              <RefreshCw size={15} />
              Try again
            </Button>
          </div>

        ) : users.length === 0 ? (

          /* No users */
          <EmptyState
            icon={Users}
            title="No users found"
            description="No users match the selected search and filters."
          />

        ) : (

          /* Real users table */
          <div className="overflow-x-auto">

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">User ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Registered</th>
                </tr>
              </thead>

              <tbody>
                {users.map(user => (
                  <tr
                    key={user.id}
                    className="border-b hover:bg-gray-50/50"
                  >
                    <td className="p-3">
                      {user.id}
                    </td>

                    <td className="p-3 font-medium">
                      {user.full_name || 'Not supplied'}
                    </td>

                    <td className="p-3">
                      {user.email || '—'}
                    </td>

                    <td className="p-3">
                      <Badge tone="blue">
                        {user.role || 'Unknown'}
                      </Badge>
                    </td>

                    <td className="p-3">
                      {user.department_name || (user.department_id != null
                        ? `Department #${user.department_id}`
                        : 'Unassigned')}
                    </td>

                    <td className="p-3">
                      <Badge
                        tone={
                          user.approval_status === 'APPROVED'
                            ? 'green'
                            : 'warning'
                        }
                      >
                        {user.approval_status ||
                          user.status ||
                          'Unknown'}
                      </Badge>
                    </td>

                    <td className="p-3">
                      <Badge tone={user.is_active ? 'green' : 'warning'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="p-3">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between mt-5 gap-3">
            <p className="text-sm text-muted">
              Page {page} of {totalPages} · {total} matching users
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() =>
                  setPage(previous => previous - 1)
                }
              >
                Previous
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage(previous => previous + 1)
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted mt-4">
          Search, role and approval filters apply to all registered users.
        </p>

      </Card>

      {/* Pending registration shortcut */}
      <Card className="p-6">

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">

          <span className="rounded-2xl bg-blue-500/10 text-blue-500 p-4 self-start">
            <ShieldCheck size={26} />
          </span>

          <div className="flex-1">
            <h2 className="font-semibold text-lg">
              Review new account requests
            </h2>

            <p className="text-sm text-muted mt-1">
              Review pending registrations and approve
              or reject each request with confirmation.
            </p>
          </div>

          <Link
            className="button button-primary button-md"
            to="/admin/approvals"
          >
            Review pending users
            <ArrowRight size={16} />
          </Link>
        </div>
      </Card>

    </div>
  );
}
