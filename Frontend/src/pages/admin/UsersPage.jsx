
import { useEffect, useMemo, useState } from 'react';
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

  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const pageSize = 20;

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
          page_size: pageSize
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
  }, [page, reloadKey]);

  // ========================================
  // Search and filter loaded users
  // ========================================
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter(user => {
      const name = String(user.full_name ?? '');
      const email = String(user.email ?? '');
      const role = String(user.role ?? '');

      const matchesSearch =
        !keyword ||
        name.toLowerCase().includes(keyword) ||
        email.toLowerCase().includes(keyword);

      const matchesRole =
        roleFilter === 'ALL' ||
        role.toUpperCase() === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const availableRoles = useMemo(() => {
    return [
      ...new Set(
        users
          .map(user => user.role)
          .filter(Boolean)
          .map(role => String(role).toUpperCase())
      )
    ].sort();
  }, [users]);

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
              Registered students, instructors,
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
              onChange={event =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className="input"
            value={roleFilter}
            onChange={event =>
              setRoleFilter(event.target.value)
            }
          >
            <option value="ALL">All roles</option>

            {availableRoles.map(role => (
              <option key={role} value={role}>
                {role.replaceAll('_', ' ')}
              </option>
            ))}
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

        ) : filteredUsers.length === 0 ? (

          /* No users */
          <EmptyState
            icon={Users}
            title="No users found"
            description="No users match your search or filters on this page."
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
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(user => (
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
              Page {page} · {total} total users
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
                disabled={page * pageSize >= total}
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
          Search and role filters apply to the currently
          loaded page.
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
