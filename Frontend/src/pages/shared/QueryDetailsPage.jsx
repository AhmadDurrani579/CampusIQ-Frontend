
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import {
  ArrowLeft,
  Sparkles,
  Send,
  Clock3,
  UserRound,
  Building2,
  FileText,
  ShieldCheck
} from 'lucide-react';

import {
  Card,
  Badge,
  Button,
  PageHeader,
  Field,
  EmptyState
} from '../../components/ui';

import QueryStatus, {
  PriorityBadge
} from '../../components/common/QueryStatus';

import FeatureNotice from '../../components/common/FeatureNotice';
import { pagePath } from '../../utils/navigation';
import { isMockMode } from '../../api/mode';

import {
  getQuery,
  getQueryMessages,
  sendReply,
  updateQueryStatus,
  generateReplyDraft,
  capabilities
} from '../../api/queriesApi';

import MockQueryDetailsPage from '../mock/MockQueryDetailsPage';

// ==========================================
// Format date
// ==========================================
function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

// ==========================================
// Convert real API response to UI format
// ==========================================
function normalizeQuery(response) {
  const data = response?.query ?? response?.data ?? response;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid query response from backend.');
  }

  return {
    id: data.id,

    reference:
      data.reference || `Q-${data.id}`,

    subject:
      data.subject || `Query #${data.id}`,

    description:
      data.message || data.description || '',

    student:
      data.student?.name ||
      data.student_name ||
      `Student #${data.student_id}`,

    department:
      data.department?.name ||
      data.department_name ||
      (data.department_id == null
        ? 'Unassigned'
        : `Department #${data.department_id}`),

    priority: data.priority || null,

    status:
      data.status || 'PENDING_CLASSIFICATION',

    date: formatDate(data.created_at),
    createdAt: data.created_at,
    respondedAt: data.responded_at ?? null,
    resolvedAt: data.resolved_at ?? null,
    departmentId: data.department_id,

    assignedTo: data.assigned_to ?? null,

    needsManualReview: data.needs_manual_review ?? false,

    aiReason: data.ai_reason ?? null,

    initials: 'ST'
  };
}

// ==========================================
// Main component
// ==========================================
export default function QueryDetailsPage(props) {
  if (isMockMode && !props.preview) {
    return <MockQueryDetailsPage />;
  }

  return <OriginalQueryDetailsPage {...props} />;
}

// ==========================================
// Query details component
// ==========================================
function OriginalQueryDetailsPage({
  role = 'STUDENT',
  preview = false,
  query: previewQuery
}) {
  const { id } = useParams();

  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const canManage = ['FINANCE_STAFF', 'EXAM_STAFF', 'IT_STAFF', 'HOD', 'ADMIN'].includes(role);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [studentReply, setStudentReply] = useState('');
  const [sendingStudentReply, setSendingStudentReply] = useState(false);
  const [studentReplyError, setStudentReplyError] = useState('');

  async function handleGenerateDraft() {
    setGeneratingDraft(true);
    setDraftError('');

    try {
      const result = await generateReplyDraft(id);
      setDraft(result.draft);
    } catch (error) {
      setDraftError(
        error.response?.data?.detail ||
        'Unable to generate an AI draft.'
      );
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function refreshDetails() {
    setRefreshIndex(index => index + 1);
  }

  async function handleReply() {
    if (!canManage || !currentQuery || !draft.trim()) return;
    if (!window.confirm('Send this reply to the student?')) return;
    setSubmitting(true);
    setActionError('');
    setActionSuccess('');
    try {
      await sendReply(currentQuery.id, draft.trim());
      setDraft('');
      setActionSuccess('Reply sent successfully.');
      await refreshDetails();
    } catch (err) {
      setActionError(err?.response?.data?.detail || err.message || 'Could not send reply.');
    } finally {
      setSubmitting(false);
    }
  } 

  async function handleStudentReply() {
    const message = studentReply.trim();

    if (!message || sendingStudentReply || !id) return;

    setSendingStudentReply(true);
    setStudentReplyError('');

    try {
      await sendReply(id, message);
      setStudentReply('');
      window.location.reload();
    } catch (error) {
      setStudentReplyError(
        error.response?.data?.detail ||
        error.message ||
        'Unable to send reply.'
      );
    } finally {
      setSendingStudentReply(false);
    }
  }

  async function handleStatusUpdate() {
    if (!canManage || !currentQuery) return;
    const nextStatus = currentQuery.status === 'IN_PROGRESS' ? 'RESOLVED' : 'IN_PROGRESS';
    if (!window.confirm(`Change query status to ${nextStatus}?`)) return;
    setStatusUpdating(true);
    setActionError('');
    setActionSuccess('');
    try {
      await updateQueryStatus(currentQuery.id, nextStatus);
      setActionSuccess(`Query status updated to ${nextStatus}.`);
      await refreshDetails();
    } catch (err) {
      setActionError(err?.response?.data?.detail || err.message || 'Could not update query status.');
    } finally {
      setStatusUpdating(false);
    }
  }

  const back = preview
    ? `/preview?role=${role}&page=queries`
    : pagePath(role, 'queries');

  // ========================================
  // Fetch query from FastAPI
  // ========================================
  useEffect(() => {
    if (preview) {
      setLoading(false);
      return;
    }

    if (!capabilities.detail) {
      setError('Query details API is not available.');
      setLoading(false);
      return;
    }

    if (!id) {
      setError('Query ID is missing.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchQuery() {
      setLoading(true);
      setError('');
      setQuery(null);

      try {
        const response = await getQuery(id);
        let conversation = [];
        let conversationError = '';
        try {
          const result = await getQueryMessages(id);
          conversation = Array.isArray(result) ? result : (result?.messages ?? []);
        } catch (err) {
          conversationError = err?.response?.data?.detail || err.message || 'Unable to load replies.';
        }

        console.log('Single query response:', response);

        const normalized = normalizeQuery(response);

        if (!cancelled) {
          setQuery(normalized);
          setMessages(conversation);
          setMessagesError(conversationError);
        }
      } catch (err) {
        console.error('Get query error:', err);

        if (cancelled) return;

        const status = err.response?.status;
        const detail = err.response?.data?.detail;

        if (status === 401) {
          setError('Session expired. Please log in again.');
        } else if (status === 403) {
          setError('You are not authorised to view this query.');
        } else if (status === 404) {
          setError('Query not found.');
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError(
            err.message || 'Unable to fetch query details.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchQuery();

    return () => {
      cancelled = true;
    };
  }, [id, preview, refreshIndex]);

  const currentQuery = preview ? previewQuery : query;
  const canReply = canManage && currentQuery && !['PENDING_CLASSIFICATION', 'RESOLVED', 'CLOSED'].includes(currentQuery.status);
  const nextStatus = currentQuery?.status === 'IN_PROGRESS' ? 'RESOLVED' : 'IN_PROGRESS';
  const canChangeStatus = canManage && currentQuery && ['OPEN', 'ESCALATED', 'IN_PROGRESS'].includes(currentQuery.status);
  const steps = currentQuery ? [
    { label: 'Submitted', complete: true, note: currentQuery.date },
    { label: 'AI classified / routed', complete: !['PENDING_CLASSIFICATION'].includes(currentQuery.status) && !currentQuery.needsManualReview, note: currentQuery.department },
    { label: 'In progress', complete: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(currentQuery.status), note: currentQuery.respondedAt ? formatDate(currentQuery.respondedAt) : 'Awaiting staff response' },
    { label: 'Resolved', complete: ['RESOLVED', 'CLOSED'].includes(currentQuery.status), note: currentQuery.resolvedAt ? formatDate(currentQuery.resolvedAt) : 'Not resolved' },
  ] : [];

  // ========================================
  // UI
  // ========================================
  return (
    <>
      <Link className="back-link" to={back}>
        <ArrowLeft size={15} />
        Back to queries
      </Link>

      <PageHeader
        eyebrow={
          preview
            ? `${currentQuery?.reference || 'Sample query'} · Demo data`
            : `QUERY ${currentQuery?.id ?? id ?? ''}`
        }
        title={
          currentQuery?.subject || 'Query details'
        }
        description="View query information and track its progress."
      />

      {/* Preview notice */}
      {preview && (
        <FeatureNotice>
          This is a read-only sample. No AI draft,
          response or routing action will be sent.
        </FeatureNotice>
      )}

      {/* Loading */}
      {!preview && loading && (
        <Card className="padded-card">
          <p role="status">Loading query details...</p>
        </Card>
      )}

      {/* Error */}
      {!preview && !loading && error && (
        <Card className="padded-card">
          <EmptyState
            title="Unable to load query"
            description={error}
            icon={ShieldCheck}
          />
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && !currentQuery && (
        <Card className="padded-card">
          <EmptyState
            title="No query found"
            description="No query details are available."
            icon={FileText}
          />
        </Card>
      )}

      {/* Real query details */}
      {!loading && !error && currentQuery && (
        <div className="form-sidebar-grid">

          {/* Main content */}
          <div className="sidebar-card-stack">

            {/* Query information */}
            <Card className="padded-card">
              <div className="section-title">
                <h2>Query information</h2>

                <QueryStatus
                  status={currentQuery.status}
                />
              </div>

              <p className="query-description">
                {currentQuery.description ||
                  'No query description available.'}
              </p>

              <div className="query-info-grid">
                <span>
                  <Clock3 size={15} />
                  <small>Submitted</small>
                  <strong>{currentQuery.date}</strong>
                </span>

                <span>
                  <UserRound size={15} />
                  <small>Student</small>
                  <strong>{currentQuery.student}</strong>
                </span>

                <span>
                  <Building2 size={15} />
                  <small>Department</small>
                  <strong>{currentQuery.department}</strong>
                </span>

                <span>
                  <FileText size={15} />
                  <small>Priority</small>

                  {currentQuery.priority ? (
                    <PriorityBadge
                      priority={currentQuery.priority}
                    />
                  ) : (
                    <strong>Not assigned</strong>
                  )}
                </span>
              </div>

              {!preview && currentQuery.needsManualReview && (
                <Badge tone="amber">
                  Manual review required
                </Badge>
              )}

              <p className="muted text-sm">
                Attachment details are not available.
              </p>
            </Card>

            {/* Conversation */}
            <Card className="padded-card">
              <h2>Conversation</h2>

              <div className="conversation">
                <span className="avatar avatar-blue">
                  {currentQuery.initials || 'ST'}
                </span>

                <div>
                  <strong>
                    {currentQuery.student}{' '}
                    <Badge>Student</Badge>
                  </strong>

                  <p>
                    {currentQuery.description ||
                      'No query message available.'}
                  </p>

                  <small>
                    {currentQuery.date}
                    {preview ? ' · Demo data' : ''}
                  </small>
                </div>
              </div>

              {/* Preview-only sample reply */}
              {preview && currentQuery.status === 'RESOLVED' && (
                <div className="conversation staff-conversation">
                  <span className="avatar avatar-green">
                    SK
                  </span>

                  <div>
                    <strong>
                      Dr. Sarah Khan{' '}
                      <Badge tone="green">Staff</Badge>
                    </strong>

                    <p>
                      Your request has been reviewed.
                      Please visit the relevant department
                      office with your student ID.
                    </p>

                    <small>
                      Sample response · Not sent by the system
                    </small>
                  </div>
                </div>
              )}

              {!preview && messagesError && <p className="muted text-sm" role="alert">{messagesError}</p>}
              {!preview && messages.map((item, index) => (
                <div className="conversation staff-conversation" key={item.id ?? index}>
                  <span className="avatar avatar-green"><UserRound size={17} /></span>
                  <div>
                    <strong>{item.sender_name || item.sender?.full_name || `User #${item.sender_id ?? '?'}`} <Badge>Reply</Badge></strong>
                    <p>{item.message ?? item.body ?? ''}</p>
                    <small>{formatDate(item.created_at)}</small>
                  </div>
                </div>
              ))}
            </Card>


            {/* ====================================== */}
            {/* Student Reply Workspace */}
            {/* ====================================== */}
            {!preview && role === 'STUDENT' && (
              <Card className="padded-card">
                <div className="section-title">
                  <span className="section-icon">
                    <Send size={20} />
                  </span>

                  <div>
                    <h2>Reply to Department</h2>
                    <p>
                      Continue your conversation with the department.
                    </p>
                  </div>

                  <Badge tone="green">Live reply API</Badge>
                </div>

                {['OPEN', 'IN_PROGRESS', 'ESCALATED'].includes(
                  currentQuery.status
                ) ? (
                  <>
                    <Field
                      label="Your reply"
                      htmlFor="student-reply"
                      hint="Your reply will be visible to the department handling your query."
                    >
                      <textarea
                        id="student-reply"
                        rows={5}
                        maxLength={5000}
                        value={studentReply}
                        onChange={e => setStudentReply(e.target.value)}
                        placeholder="Write your reply to the department..."
                        disabled={sendingStudentReply}
                      />
                    </Field>

                    {studentReplyError && (
                      <p role="alert" className="form-error">
                        {studentReplyError}
                      </p>
                    )}

                    <div className="button-row">
                      <Button
                        disabled={
                          sendingStudentReply ||
                          !studentReply.trim()
                        }
                        onClick={handleStudentReply}
                      >
                        <Send size={15} />
                        {sendingStudentReply
                          ? 'Sending reply...'
                          : 'Send Reply'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="muted text-sm">
                    This query is not accepting replies in its current status.
                  </p>
                )}
              </Card>
            )}

            {/* ====================================== */}
            {/* Staff Reply Workspace */}
            {/* ====================================== */}
            {role !== 'STUDENT' && (
              <Card className="padded-card">
                <div className="section-title">
                  <span className="section-icon">
                    <Sparkles size={20} />
                  </span>

                  <div>
                    <h2>Reply workspace</h2>
                    <p>
                      Keep a human in control of every response.
                    </p>
                  </div>

                  <Badge tone="green">Live reply API</Badge>
                </div>

                <Button
                  variant="secondary"
                  disabled={
                    preview ||
                    generatingDraft ||
                    !['OPEN', 'IN_PROGRESS'].includes(
                      currentQuery.status
                    )
                  }
                  onClick={handleGenerateDraft}
                >
                  <Sparkles size={15} />
                  {generatingDraft
                    ? 'Generating draft...'
                    : 'Generate AI draft'}
                </Button>

                {draftError && (
                  <p role="alert" className="form-error">
                    {draftError}
                  </p>
                )}

                <Field
                  label="Reply draft"
                  htmlFor="reply-draft"
                  hint="Generate an AI suggestion or write your own reply. Staff must approve before sending."
                >
                  <textarea
                    id="reply-draft"
                    rows={5}
                    maxLength={5000}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Write your response..."
                    disabled={submitting}
                  />
                </Field>

                {actionError && (
                  <p role="alert" className="form-error">
                    {actionError}
                  </p>
                )}

                {actionSuccess && (
                  <p role="status" className="muted text-sm">
                    {actionSuccess}
                  </p>
                )}

                <div className="button-row">
                  <Button
                    disabled={
                      preview ||
                      !canReply ||
                      !draft.trim() ||
                      submitting ||
                      statusUpdating
                    }
                    onClick={handleReply}
                  >
                    <Send size={15} />
                    {submitting
                      ? 'Sending...'
                      : 'Approve & send reply'}
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={
                      preview ||
                      !canChangeStatus ||
                      submitting ||
                      statusUpdating
                    }
                    onClick={handleStatusUpdate}
                  >
                    {statusUpdating
                      ? 'Updating...'
                      : `Change to ${nextStatus.replaceAll('_', ' ')}`}
                  </Button>

                  {role === 'HOD' && (
                    <Button variant="secondary" disabled>
                      Reassign query
                    </Button>
                  )}
                </div>
              </Card>
            )}

          </div>

          {/* Progress sidebar */}
          <Card className="padded-card progress-card">
            <h2>Query progress</h2>

            <p className="muted">
              {preview
                ? 'Proposed workflow · Demo data'
                : 'Current query status'}
            </p>

            <ol style={{ listStyle: 'none', padding: 0, margin: '24px 0' }}>
              {steps.map((step, index) => (
                <li key={step.label} style={{ display: 'flex', gap: 12, paddingBottom: 22 }}>
                  <span aria-hidden="true" style={{ color: step.complete ? '#0f9d79' : '#94a3b8', fontSize: 20 }}>
                    {step.complete ? '●' : '○'}
                  </span>
                  <div>
                    <strong style={{ color: step.complete ? 'inherit' : '#94a3b8' }}>{step.label}</strong>
                    <p className="muted text-sm">{step.note}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="resolution-note">
              <ShieldCheck size={18} />

              <p>
                {currentQuery.status === 'RESOLVED'
                  ? preview
                    ? 'Resolved in this demonstration dataset.'
                    : 'This query is marked as resolved.'
                  : 'Resolution details will come from the backend.'}
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
