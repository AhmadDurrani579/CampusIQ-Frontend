
import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  Bell,
  CheckCheck,
  Mail,
  Settings2,
  RefreshCw,
} from 'lucide-react';

import {
  Card,
  Button,
  Badge,
  PageHeader,
  EmptyState,
} from '../../components/ui';

import notificationsApi from '../../api/notificationsApi';
import { isMockMode } from '../../api/mode';
import { MockNotificationsPage } from '../mock/MockPersonalPages';

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  return error?.message || 'Unable to load notifications.';
}

export default function NotificationsPage(props) {
  if (isMockMode && !props.preview) {
    return <MockNotificationsPage />;
  }

  if (props.preview) {
    return <PreviewNotificationsPage sample={props.sample ?? []} />;
  }

  return <LiveNotificationsPage />;
}

function LiveNotificationsPage() {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const unreadOnly = filter === 'unread';

  const notificationsQuery = useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () =>
      notificationsApi.getNotifications({
        page,
        page_size: PAGE_SIZE,
        unread_only: unreadOnly,
      }),
    retry: false,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    retry: false,
  });

  function refreshNotifications() {
    queryClient.invalidateQueries({
      queryKey: ['notifications'],
    });

    queryClient.invalidateQueries({
      queryKey: ['notifications-unread-count'],
    });
  }

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markNotificationRead,
    onSuccess: refreshNotifications,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: refreshNotifications,
  });

  const response = notificationsQuery.data;

  const notifications = Array.isArray(response?.notifications)
    ? response.notifications
    : [];

  const total = response?.total ?? 0;
  const totalPages = response?.total_pages ?? 0;
  const unreadCount = unreadQuery.data?.unread_count ?? 0;

  const isUpdating =
    markReadMutation.isPending ||
    markAllMutation.isPending;

  const actionError =
    markReadMutation.error || markAllMutation.error;

  function changeFilter(value) {
    setFilter(value);
    setPage(1);
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Notifications"
        description="The updates that keep your campus day moving."
        actions={
          <Button
            variant="secondary"
            disabled={unreadCount === 0 || isUpdating}
            onClick={() => markAllMutation.mutate()}
          >
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        }
      />

      <Card>
        <div className="card-heading">
          <div>
            <h2>Your notification center</h2>
            <p>
              Query submissions, replies, resolutions
              and campus updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge tone="blue">
              {unreadCount} unread
            </Badge>

            <Button
              variant="secondary"
              size="sm"
              disabled={notificationsQuery.isFetching}
              onClick={refreshNotifications}
            >
              <RefreshCw size={15} />
              Refresh
            </Button>
          </div>
        </div>

        <div
          className="segmented-control"
          style={{ marginBottom: 20 }}
        >
          <button
            type="button"
            className={filter === 'all' ? 'selected' : ''}
            onClick={() => changeFilter('all')}
          >
            All
          </button>

          <button
            type="button"
            className={filter === 'unread' ? 'selected' : ''}
            onClick={() => changeFilter('unread')}
          >
            Unread
          </button>
        </div>

        {actionError && (
          <div className="form-error" role="alert">
            {getErrorMessage(actionError)}
          </div>
        )}

        {notificationsQuery.isLoading ? (
          <p className="muted" role="status">
            Loading your notifications...
          </p>

        ) : notificationsQuery.isError ? (
          <div className="form-error" role="alert">
            <strong>Unable to load notifications</strong>
            <p>{getErrorMessage(notificationsQuery.error)}</p>
          </div>

        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={
              unreadOnly
                ? 'All caught up'
                : 'No notifications yet'
            }
            description={
              unreadOnly
                ? 'You have no unread notifications.'
                : 'New notifications will appear here when activity occurs.'
            }
          />

        ) : (
          <div className="notification-list">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={
                  !notification.is_read
                    ? 'notification-unread'
                    : ''
                }
              >
                <span className="section-icon">
                  <Bell size={18} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{notification.title}</strong>

                  <p>{notification.message}</p>

                  <small>
                    {formatDate(notification.created_at)}
                    {' · '}
                    {notification.notification_type
                      ?.replaceAll('_', ' ')}
                  </small>
                </div>

                {!notification.is_read ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() =>
                      markReadMutation.mutate(notification.id)
                    }
                  >
                    Mark as read
                  </Button>
                ) : (
                  <Badge tone="green">Read</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 gap-3">
            <p className="text-sm text-muted">
              Page {page} of {totalPages}
              {' · '}
              {total} notifications
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="padded-card">
        <div className="section-title">
          <span className="section-icon">
            <Settings2 size={20} />
          </span>

          <div>
            <h2>Delivery channels</h2>
            <p>
              Available notification delivery methods.
            </p>
          </div>
        </div>

        <div className="channel-settings">
          <div>
            <Bell size={19} />
            <span>In-app updates</span>
            <Badge tone="green">Connected</Badge>
          </div>

          <div>
            <Mail size={19} />
            <span>Email notifications</span>
            <Badge tone="amber">Separate delivery service</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Preserve the existing preview experience without
// contacting the production Notifications API.
function PreviewNotificationsPage({ sample }) {
  const [filter, setFilter] = useState('all');

  const [readState, setReadState] = useState(() =>
    Object.fromEntries(
      sample.map(item => [item.id, !item.unread])
    )
  );

  function isUnread(item) {
    return !(readState[item.id] ?? !item.unread);
  }

  const visible = sample.filter(
    item => filter !== 'unread' || isUnread(item)
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="Notifications"
        description="Preview campus notifications."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              setReadState(
                Object.fromEntries(
                  sample.map(item => [item.id, true])
                )
              )
            }
          >
            <CheckCheck size={16} />
            Mark preview as read
          </Button>
        }
      />

      <Card>
        <div className="card-heading">
          <div>
            <h2>Your notification center</h2>
            <p>Demonstration notifications.</p>
          </div>

          <Badge>Demo data</Badge>
        </div>

        <div className="segmented-control">
          <button
            type="button"
            className={filter === 'all' ? 'selected' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>

          <button
            type="button"
            className={filter === 'unread' ? 'selected' : ''}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>

        {visible.length ? (
          <div className="notification-list">
            {visible.map(item => (
              <div
                key={item.id}
                className={
                  isUnread(item) ? 'notification-unread' : ''
                }
              >
                <span className="section-icon">
                  <Bell size={18} />
                </span>

                <div style={{ flex: 1 }}>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <small>{item.time} · Demo data</small>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setReadState(current => ({
                      ...current,
                      [item.id]: isUnread(item),
                    }))
                  }
                >
                  {isUnread(item)
                    ? 'Mark preview read'
                    : 'Mark preview unread'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="All caught up"
            description="No sample notifications match this view."
          />
        )}
      </Card>
    </div>
  );
}
