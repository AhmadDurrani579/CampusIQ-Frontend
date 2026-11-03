
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Inbox,
  Plus,
  SlidersHorizontal,
  Download
} from 'lucide-react';

import {
  Card,
  Button,
  Badge,
  PageHeader,
  EmptyState
} from '../../components/ui';

import DataTable from '../../components/tables/DataTable';

import QueryStatus, {
  PriorityBadge
} from '../../components/common/QueryStatus';

import FeatureNotice from '../../components/common/FeatureNotice';
import { pagePath } from '../../utils/navigation';
import { isMockMode } from '../../api/mode';

import {
  getQueries,
  getMyQueries
} from '../../api/queriesApi';

import MockQueriesPage from '../mock/MockQueriesPage';
import axiosClient from '../../api/axiosClient';

// --------------------------------------
// Format dates
// --------------------------------------
const formatDate = value => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
};

// --------------------------------------
// Normalise backend query object
// --------------------------------------
const normaliseQuery = query => ({
  id: query.id,

  reference:
    query.reference ||
    query.reference_number ||
    `Q-${query.id}`,

  subject:
    query.subject ||
    query.message ||
    'Untitled query',

  student:
    query.student?.name ||
    query.student_name ||
    (query.student_id != null
      ? `Student #${query.student_id}`
      : 'Current student'),

  department:
    query.department?.name ||
    query.department_name ||
    (query.department_id == null
      ? 'Unassigned'
      : `Department #${query.department_id}`),

  priority: query.priority || null,

  status: query.status || 'PENDING_CLASSIFICATION',

  date: formatDate(
    query.created_at || query.submitted_at
  ),

  updated: formatDate(query.updated_at),

  assigned_instructor:
    query.assigned_to ?? 'Unassigned'
});

// --------------------------------------
// Extract query list from API response
// --------------------------------------
const extractQueries = response => {
  if (Array.isArray(response)) {
    return {
      queries: response,
      total: response.length
    };
  }

  const source = response?.data ?? response;

  const queries =
    source?.queries ??
    source?.items ??
    source?.results;

  if (!Array.isArray(queries)) {
    throw new Error(
      'Unexpected API response. Expected an array of queries.'
    );
  }

  return {
    queries,
    total: source.total ?? source.count ?? queries.length
  };
};

// --------------------------------------
// Main component
// --------------------------------------
export default function QueriesPage(props) {
  if (isMockMode && !props.preview) {
    return (
      <MockQueriesPage
        escalations={props.escalations}
      />
    );
  }

  return <OriginalQueriesPage {...props} />;
}

// --------------------------------------
// Real API queries page
// --------------------------------------
function OriginalQueriesPage({
  role,
  preview = false,
  rows = [],
  escalations = false
}) {
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');

  const [apiQueries, setApiQueries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --------------------------------------
  // Determine current role and API mode
  // --------------------------------------
  const isLiveAdmin =
    !preview &&
    !escalations &&
    role === 'ADMIN';

  const isLiveStudent =
    !preview &&
    !escalations &&
    role === 'STUDENT';

  const isLiveStaff =
    !preview &&
    !escalations &&
    ['FINANCE_STAFF', 'EXAM_STAFF', 'IT_STAFF', 'HOD'].includes(role);

  const isLive =
    isLiveAdmin || isLiveStudent || isLiveStaff;

  // --------------------------------------
  // Fetch real queries
  // --------------------------------------
  useEffect(() => {
    if (!isLive) {
      return;
    }

    let cancelled = false;

    async function loadQueries() {
      setLoading(true);
      setError('');
      setApiQueries([]);
      setTotal(0);

      try {
        let response;

        // Administrator queries
        if (isLiveAdmin) {
          response = await getQueries({
            page: 1,
            page_size: 20
          });
        }

        // Logged-in student's queries
        if (isLiveStudent) {
          response = await getMyQueries({
            page: 1,
            page_size: 20
          });
        }

        // Shared department API scopes results by authenticated user's department.
        if (isLiveStaff) {
          const { data } = await axiosClient.get('/queries/department');
          response = data;
        }

        const result = extractQueries(response);

        if (!cancelled) {
          setApiQueries(
            result.queries.map(normaliseQuery)
          );

          setTotal(result.total);
        }
      } catch (err) {
        console.error('Failed to load queries:', err);

        if (!cancelled) {
          const apiDetail = err.response?.data?.detail;

          let message;

          if (err.response?.status === 401) {
            message =
              'Your session has expired. Please log in again.';
          } else if (err.response?.status === 403) {
            message =
              'You do not have permission to view these queries.';
          } else if (err.response?.status === 404) {
            message =
              'Query list endpoint not found. Check the FastAPI route.';
          } else if (typeof apiDetail === 'string') {
            message = apiDetail;
          } else {
            message =
              err.message || 'Unable to load queries.';
          }

          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQueries();

    return () => {
      cancelled = true;
    };
  }, [isLive, isLiveAdmin, isLiveStudent, isLiveStaff]);

  // --------------------------------------
  // Page title
  // --------------------------------------
  const title = escalations
    ? 'Escalations'
    : {
        ADMIN: 'All queries',
        STUDENT: 'My queries',
        FINANCE_STAFF: 'Department queries',
        EXAM_STAFF: 'Department queries',
        IT_STAFF: 'Department queries',
        HOD: 'Department queries'
      }[role] || 'Queries';

  // --------------------------------------
  // Choose source data
  // --------------------------------------
  const sourceRows = preview
    ? rows
    : isLive
      ? apiQueries
      : [];

  // --------------------------------------
  // Filter escalations
  // --------------------------------------
  const scopedRows = sourceRows.filter(
    r => !escalations || r.status === 'ESCALATED'
  );

  // --------------------------------------
  // Filter by status and priority
  // --------------------------------------
  const filtered = scopedRows.filter(
    r =>
      (status === 'ALL' || r.status === status) &&
      (
        priority === 'ALL' ||
        r.priority?.toUpperCase() === priority
      )
  );

  // --------------------------------------
  // Navigation
  // --------------------------------------
  const href = key =>
    preview
      ? `/preview?role=${role}&page=${key}`
      : pagePath(role, key);

  // --------------------------------------
  // Table columns
  // --------------------------------------
  const columns = [
    {
      key: 'reference',
      label: 'Reference'
    },
    {
      key: 'subject',
      label: 'Subject',
      render: r => (
        <div className="query-subject">
          {preview ? (
            <strong>{r.subject}</strong>
          ) : (
            <Link to={`${href('queries')}/${r.id}`}>{r.subject}</Link>
          )}
          <small>{r.student}</small>
        </div>
      )
    },
    {
      key: 'department',
      label: 'Department'
    },
    {
      key: 'priority',
      label: 'Priority',
      render: r =>
        r.priority
          ? <PriorityBadge priority={r.priority} />
          : '—'
    },
    {
      key: 'status',
      label: 'Status',
      render: r => (
        <QueryStatus status={r.status} />
      )
    },
    {
      key: 'date',
      label: 'Submitted'
    },
    {
      key: 'updated',
      label: 'Last update'
    }
  ];

  // --------------------------------------
  // Render page
  // --------------------------------------
  return (
    <>
      <PageHeader
        eyebrow="COMMUNICATION WORKSPACE"
        title={title}
        description="Every question has a place. Find it, follow it, and move it forward."
        actions={
          role === 'STUDENT' ? (
            <Link
              className="button button-primary"
              to={href('submit')}
            >
              <Plus size={16} />
              Submit a query
            </Link>
          ) : (
            <Button variant="secondary" disabled>
              <Download size={15} />
              Export
            </Button>
          )
        }
      />

      {/* Pending integration for other roles */}
      {!isLive && !preview && (
        <FeatureNotice>
          This query view requires its own backend integration.
        </FeatureNotice>
      )}

      <Card>
        <div className="card-heading">
          <div>
            <h2>
              {escalations
                ? 'Queries needing attention'
                : 'Query directory'}

              {preview && (
                <Badge tone="blue">
                  Demo data
                </Badge>
              )}
            </h2>

            <p>
              {isLive
                ? 'Queries loaded from the FastAPI backend when the request succeeds.'
                : preview
                  ? 'Read-only sample conversations.'
                  : 'Backend integration pending.'}
            </p>
          </div>

          <SlidersHorizontal
            size={18}
            className="muted"
          />
        </div>

        {/* Filters */}
        <div className="filter-row">
          <label>
            Status

            <select
              value={status}
              onChange={e =>
                setStatus(e.target.value)
              }
            >
              <option value="ALL">
                All statuses
              </option>

              {[
                ...new Set([
                  ...sourceRows
                    .map(r => r.status)
                    .filter(Boolean),
                  'OPEN',
                  'PENDING_CLASSIFICATION',
                  'IN_PROGRESS',
                  'RESOLVED',
                  'ESCALATED',
                  'CLOSED'
                ])
              ].map(s => (
                <option key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority

            <select
              value={priority}
              onChange={e =>
                setPriority(e.target.value)
              }
            >
              <option value="ALL">
                All priorities
              </option>

              {[
                'HIGH',
                'MEDIUM',
                'LOW'
              ].map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <span>
            {isLive
              ? `${filtered.length} shown · ${total} total`
              : `${filtered.length} queries`}
          </span>

          {(status !== 'ALL' ||
            priority !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatus('ALL');
                setPriority('ALL');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Query table */}
        {loading ? (
          <p className="p-6" role="status">
            Loading queries...
          </p>
        ) : error ? (
          <p className="p-6" role="alert">
            Error: {error}
          </p>
        ) : filtered.length > 0 ? (
          <DataTable
            rows={filtered}
            columns={columns}
            searchKeys={[
              'reference',
              'subject',
              'student',
              'department'
            ]}
            searchPlaceholder="Search loaded queries..."
          />
        ) : (
          <EmptyState
            title="No queries found"
            description={
              isLive
                ? 'No queries match your current filters, or none have been submitted yet.'
                : 'No connected queries are available.'
            }
            icon={Inbox}
          />
        )}
      </Card>
    </>
  );
}
