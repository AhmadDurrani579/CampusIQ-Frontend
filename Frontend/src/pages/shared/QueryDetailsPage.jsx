
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
  PriorityBadge,
  QueryTimeline
} from '../../components/common/QueryStatus';

import FeatureNotice from '../../components/common/FeatureNotice';
import { pagePath } from '../../utils/navigation';
import { isMockMode } from '../../api/mode';

import {
  getQuery,
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

        console.log('Single query response:', response);

        const normalized = normalizeQuery(response);

        if (!cancelled) {
          setQuery(normalized);
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
  }, [id, preview]);

  const currentQuery = preview ? previewQuery : query;

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

              {!preview && (
                <p className="muted text-sm">
                  Additional conversation messages are not
                  yet connected to the backend.
                </p>
              )}
            </Card>

            {/* Reply workspace for staff */}
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

                  <Badge tone="amber">API pending</Badge>
                </div>

                <Button variant="secondary" disabled>
                  <Sparkles size={15} />
                  Generate AI draft
                </Button>

                <Field
                  label="Reply draft"
                  htmlFor="reply-draft"
                  hint="Sending and AI generation are not connected."
                >
                  <textarea
                    id="reply-draft"
                    rows={5}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Write your response..."
                  />
                </Field>

                <div className="button-row">
                  <Button disabled>
                    <Send size={15} />
                    Approve & send reply
                  </Button>

                  <Button variant="secondary" disabled>
                    Update status
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

            <QueryTimeline
              status={currentQuery.status}
            />

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
