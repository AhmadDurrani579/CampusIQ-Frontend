
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
import { getQueries } from '../../api/queriesApi';
import MockQueriesPage from '../mock/MockQueriesPage';

const formatDate = value =>
  value ? new Date(value).toLocaleString() : '—';

const normaliseQuery = query => ({
  id: query.id,
  reference: `Q-${query.id}`,
  subject: query.subject || query.message || 'Untitled query',
  student: `Student #${query.student_id}`,
  department: query.department_id == null
    ? 'Unassigned'
    : `Department #${query.department_id}`,
  priority: query.priority || null,
  status: query.status,
  date: formatDate(query.created_at),
  updated: formatDate(query.updated_at),
  assigned_instructor: query.assigned_to ?? 'Unassigned'
});

export default function QueriesPage(props) {
  if (isMockMode && !props.preview) {
    return <MockQueriesPage escalations={props.escalations} />;
  }

  return <OriginalQueriesPage {...props} />;
}

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

  const isLiveAdmin = !preview && !escalations && role === 'ADMIN';

  useEffect(() => {
    if (!isLiveAdmin) return;

    let cancelled = false;

    async function loadQueries() {
      setLoading(true);
      setError('');

      try {
        const response = await getQueries({
          page: 1,
          page_size: 20
        });

        if (!Array.isArray(response?.queries)) {
          throw new Error('Invalid queries API response');
        }

        if (!cancelled) {
          setApiQueries(response.queries.map(normaliseQuery));
          setTotal(response.total ?? response.queries.length);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
            err.message ||
            'Unable to load queries'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQueries();

    return () => {
      cancelled = true;
    };
  }, [isLiveAdmin]);

  const title = escalations
    ? 'Escalations'
    : {
        ADMIN: 'All queries',
        STUDENT: 'My queries',
        INSTRUCTOR: 'Assigned queries',
        HOD: 'Department queries'
      }[role] || 'Queries';

  const sourceRows = isLiveAdmin ? apiQueries : preview ? rows : [];

  const scopedRows = sourceRows.filter(
    r => !escalations || r.status === 'ESCALATED'
  );

  const filtered = scopedRows.filter(
    r =>
      (status === 'ALL' || r.status === status) &&
      (priority === 'ALL' || r.priority?.toUpperCase() === priority)
  );

  const href = key =>
    preview
      ? `/preview?role=${role}&page=${key}`
      : pagePath(role, key);

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
          <strong>{r.subject}</strong>
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
      render: r => <QueryStatus status={r.status} />
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

      {!isLiveAdmin && !preview && (
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
              {preview && <Badge tone="blue">Demo data</Badge>}
            </h2>

            <p>
              {isLiveAdmin
                ? 'Queries retrieved from the FastAPI backend.'
                : preview
                  ? 'Read-only sample conversations.'
                  : 'Backend integration pending.'}
            </p>
          </div>
          <SlidersHorizontal size={18} className="muted" />
        </div>

        <div className="filter-row">
          <label>
            Status
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              {[
                ...new Set([
                  ...sourceRows.map(r => r.status).filter(Boolean),
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
              onChange={e => setPriority(e.target.value)}
            >
              <option value="ALL">All priorities</option>
              {['HIGH', 'MEDIUM', 'LOW'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <span>
            {isLiveAdmin
              ? `${filtered.length} shown · ${total} total`
              : `${filtered.length} queries`}
          </span>

          {(status !== 'ALL' || priority !== 'ALL') && (
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

        {loading ? (
          <p className="p-6">Loading queries...</p>
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
              isLiveAdmin
                ? 'No queries match your current filters.'
                : 'No connected queries are available.'
            }
            icon={Inbox}
          />
        )}
      </Card>
    </>
  );
}
