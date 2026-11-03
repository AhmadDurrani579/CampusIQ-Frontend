
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Plus,
  Send,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

import {
  Card,
  Button,
  Badge,
  PageHeader,
  Field,
  Input,
  Modal,
  EmptyState,
} from '../../components/ui';

import announcementsApi from '../../api/announcementsApi';
import { isMockMode } from '../../api/mode';
import { MockAnnouncementsPage } from '../mock/MockPersonalPages';

const audiences = [
  { value: 'UNIVERSITY', label: 'University-wide' },
  { value: 'ALL_STUDENTS', label: 'All students' },
  { value: 'HOD', label: 'Department heads' },
  { value: 'EXAM_STAFF', label: 'Exam staff' },
  { value: 'FINANCE_STAFF', label: 'Finance staff' },
  { value: 'IT_STAFF', label: 'IT staff' },
];

function audienceLabel(value) {
  return audiences.find(item => item.value === value)?.label ?? value;
}

function formatDate(value) {
  if (!value) return 'Not published';

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string'
    ? detail
    : error?.message || 'Something went wrong.';
}

export default function AnnouncementsPage(props) {
  if (isMockMode && !props.preview) {
    return <MockAnnouncementsPage role={props.role} />;
  }

  return <RealAnnouncementsPage {...props} />;
}

function RealAnnouncementsPage({ role, preview = false }) {
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('ALL_STUDENTS');
  const [formError, setFormError] = useState('');

  const announcementsQuery = useQuery({
    queryKey: ['announcements', role],
    queryFn: () =>
      isAdmin
        ? announcementsApi.getAdminAnnouncements()
        : announcementsApi.getAnnouncements(),
    enabled: !preview,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: announcementsApi.publishAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['announcements'],
      });

      setOpen(false);
      setSubject('');
      setContent('');
      setAudience('ALL_STUDENTS');
      setFormError('');
    },
    onError: error => {
      setFormError(getErrorMessage(error));
    },
  });

  function submitAnnouncement(status) {
    if (!subject.trim() || !content.trim()) {
      setFormError('Subject and announcement content are required.');
      return;
    }

    setFormError('');

    createMutation.mutate({
      title: subject.trim(),
      content: content.trim(),
      audience,
      status,
    });
  }

  const announcements = Array.isArray(announcementsQuery.data)
    ? announcementsQuery.data
    : [];

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Important campus updates, all in one place."
        actions={
          isAdmin && !preview ? (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              Compose announcement
            </Button>
          ) : null
        }
      />

      {!preview && (
        <div style={{ marginBottom: 20 }}>
          <Button
            variant="secondary"
            disabled={announcementsQuery.isFetching}
            onClick={() => announcementsQuery.refetch()}
          >
            <RefreshCw size={15} />
            Refresh announcements
          </Button>
        </div>
      )}

      {announcementsQuery.isLoading ? (
        <Card>
          <p className="muted">Loading announcements...</p>
        </Card>
      ) : announcementsQuery.isError ? (
        <Card className="padded-card">
          <h3>Unable to load announcements</h3>
          <p className="muted">
            {getErrorMessage(announcementsQuery.error)}
          </p>
        </Card>
      ) : announcements.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Published campus updates will appear here."
          />
        </Card>
      ) : (
        <div className="announcement-grid">
          {announcements.map(item => (
            <Card className="announcement-card" key={item.id}>
              <div className="announcement-art announcement-art-blue">
                <Megaphone size={39} />
                <span>{item.title}</span>
                {isAdmin && (
                  <Badge>
                    {item.status}
                  </Badge>
                )}
              </div>

              <div className="announcement-body">
                <Badge tone="blue">
                  {audienceLabel(item.audience)}
                </Badge>

                <h2>{item.title}</h2>
                <p>{item.content}</p>

                <span>
                  <CalendarDays size={13} />
                  {formatDate(item.published_at || item.created_at)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Compose announcement"
          description="Publish an announcement or save it as a draft."
        >
          <form
            className="form-stack"
            onSubmit={event => {
              event.preventDefault();
              submitAnnouncement('PUBLISHED');
            }}
          >
            <Field label="Audience" htmlFor="announcement-audience">
              <select
                id="announcement-audience"
                value={audience}
                onChange={event => setAudience(event.target.value)}
              >
                {audiences.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Subject" htmlFor="announcement-subject">
              <Input
                id="announcement-subject"
                value={subject}
                onChange={event => setSubject(event.target.value)}
                placeholder="Give your update a clear title"
              />
            </Field>

            <Field
              label="Announcement content"
              htmlFor="announcement-content"
            >
              <textarea
                id="announcement-content"
                rows={5}
                value={content}
                onChange={event => setContent(event.target.value)}
                placeholder="Write your campus update..."
              />
            </Field>

            <fieldset className="channel-options">
              <legend>Delivery channels</legend>
              <label>
                <input type="checkbox" checked readOnly />
                In-app
              </label>
              <label>
                <input type="checkbox" disabled />
                Email
              </label>
              <label>
                <input type="checkbox" disabled />
                WhatsApp
              </label>
            </fieldset>

            {formError && (
              <p role="alert" style={{ color: '#ef4444' }}>
                {formError}
              </p>
            )}

            <div className="form-footer">
              <Button
                type="button"
                variant="secondary"
                disabled={createMutation.isPending}
                onClick={() => submitAnnouncement('DRAFT')}
              >
                Save draft
              </Button>

              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !subject.trim() ||
                  !content.trim()
                }
              >
                <Send size={16} />
                {createMutation.isPending
                  ? 'Publishing...'
                  : 'Publish announcement'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
