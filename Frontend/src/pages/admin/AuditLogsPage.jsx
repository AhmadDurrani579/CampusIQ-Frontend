
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, RefreshCw } from 'lucide-react';

import {
  Card,
  PageHeader,
  Button,
  Badge,
  EmptyState,
} from '../../components/ui';

import auditLogsApi from '../../api/auditLogsApi';

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString('en-GB');
}

function formatValues(values) {
  if (!values) return '—';
  return JSON.stringify(values, null, 2);
}

function getErrorMessage(error) {
  return error?.response?.data?.detail ||
    error?.message ||
    'Unable to load audit logs.';
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const logsQuery = useQuery({
    queryKey: ['admin-audit-logs', page, action, entityType],
    queryFn: () =>
      auditLogsApi.getAuditLogs({
        page,
        page_size: PAGE_SIZE,
        action: action || undefined,
        entity_type: entityType || undefined,
      }),
    retry: false,
  });

  const data = logsQuery.data;
  const logs = data?.logs ?? [];
  const totalPages = data?.total_pages ?? 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Audit logs"
        description="Track important actions performed across CampusIQ."
        actions={
          <Button
            variant="secondary"
            onClick={() => logsQuery.refetch()}
            disabled={logsQuery.isFetching}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      <Card className="padded-card">
        <div className="card-heading">
          <div>
            <h2>Activity history</h2>
            <p>Recorded actions from the backend.</p>
          </div>
          <Badge tone="blue">
            {data?.total ?? 0} events
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 mb-5">
          <select
            className="input"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            <option value="USER_APPROVED">User approved</option>
            <option value="USER_REJECTED">User rejected</option>
            <option value="STAFF_DEPARTMENT_ASSIGNED">
              Staff department assigned
            </option>
            <option value="ANNOUNCEMENT_PUBLISHED">
              Announcement published
            </option>
            <option value="ANNOUNCEMENT_UPDATED">
              Announcement updated
            </option>
            <option value="ANNOUNCEMENT_DELETED">
              Announcement deleted
            </option>
          </select>

          <select
            className="input"
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All entity types</option>
            <option value="USER">Users</option>
            <option value="ANNOUNCEMENT">Announcements</option>
            <option value="QUERY">Queries</option>
          </select>
        </div>

        {logsQuery.isLoading ? (
          <p className="muted">Loading audit logs...</p>
        ) : logsQuery.isError ? (
          <div role="alert" className="form-error">
            {getErrorMessage(logsQuery.error)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit events found"
            description="Events will appear when tracked actions are completed."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">ID</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor ID</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Previous values</th>
                  <th className="p-3">New values</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="p-3">{log.id}</td>
                    <td className="p-3">
                      <Badge tone="blue">
                        {log.action.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {log.actor_id ?? 'System'}
                    </td>
                    <td className="p-3">
                      {log.entity_type} #{log.entity_id ?? '—'}
                    </td>
                    <td className="p-3">
                      <pre className="text-xs whitespace-pre-wrap">
                        {formatValues(log.old_values)}
                      </pre>
                    </td>
                    <td className="p-3">
                      <pre className="text-xs whitespace-pre-wrap">
                        {formatValues(log.new_values)}
                      </pre>
                    </td>
                    <td className="p-3">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <span className="text-sm text-muted">
              Page {page} of {totalPages}
            </span>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>

              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
