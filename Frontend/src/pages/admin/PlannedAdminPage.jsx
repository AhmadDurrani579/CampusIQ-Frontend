import { useState } from 'react';
import { Users, GitBranch, ClipboardList, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, PageHeader, Badge, Field, Button, EmptyState } from '../../components/ui';
import FeatureNotice from '../../components/common/FeatureNotice';
import DataTable from '../../components/tables/DataTable';
import DepartmentSelect from '../../components/forms/DepartmentSelect';
import { isMockMode } from '../../api/mode';
import { classifyQuery } from '../../api/aiApi';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { MockPlannedAdminPage } from '../mock/MockAdminPages';
import StaffAssignmentsPage from './StaffAssignmentsPage';
import AuditLogsPage from './AuditLogsPage';

const pageInfo = {
  routing: ['AI routing', 'A transparent view of how queries reach the right people.', GitBranch],
  'staff-assignments': ['Staff assignments', 'Bring the right expertise to every department.', Users],
  'audit-logs': ['Audit logs', 'An accountable record of your university workspace.', ClipboardList]
};

export default function PlannedAdminPage({
  module,
  preview = false,
  demoData,
}) {
  if (isMockMode && !preview) {
    return <MockPlannedAdminPage module={module} />;
  }

  if (module === 'routing' && !preview) {
    return <LiveAIRoutingPage />;
  }

  if (module === 'staff-assignments' && !preview) {
    return <StaffAssignmentsPage />;
  }

  if (module === 'audit-logs' && !preview) {
    return <AuditLogsPage />;
  }

  return (
    <OtherAdminModule
      module={module}
      preview={preview}
      demoData={demoData}
    />
  );
}
function LiveAIRoutingPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tested, setTested] = useState(false);

  async function handleClassification(event) {
    event.preventDefault();
    if (loading) return;
    if (!query.trim()) {
      setError('Please enter a student question.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setTested(false);
    try {
      const response = await classifyQuery(query);
      setResult(response);
      setTested(true);
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      setLoading(false);
    }
  }

  return <>
    <PageHeader eyebrow="ADMINISTRATION" title="AI routing" description="Test query classification using the FastAPI backend." />
    <Card className="padded-card">
      <div className="section-title">
        <span className="section-icon"><Sparkles size={21} /></span>
        <div><h2>AI Query Classification</h2><p>Enter a student question to identify its department, intent and priority.</p></div>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        {loading ? 'Sending your question to the AI API...' : tested ? 'API responded successfully.' : 'Ready to test the AI classification API.'}
        {' '}This is a classification preview; it does not create or assign a query.
      </p>
      <form onSubmit={handleClassification} className="form-stack" style={{ marginTop: 20 }}>
        <Field label="Student question" htmlFor="ai-routing-query">
          <textarea id="ai-routing-query" className="input" rows={5} style={{ width: '100%', minHeight: 120, padding: 14, resize: 'vertical' }}
            value={query} required disabled={loading}
            placeholder="Example: How can I see my fee structure?"
            onChange={e => { setQuery(e.target.value); setResult(null); setTested(false); setError(''); }} />
        </Field>
        {error && <div className="form-error" role="alert">{error}</div>}
        <Button type="submit" disabled={loading || !query.trim()} loading={loading}>
          <Sparkles size={17} />{loading ? 'Classifying...' : 'Classify with AI'}
        </Button>
      </form>
    </Card>
    <Card className="padded-card">
      <div className="card-heading">
        <div><h2>Routing results</h2><p>Fields returned by your FastAPI classification endpoint.</p></div>
        {result && <Badge tone="green">Classified</Badge>}
      </div>
      {!result ? <EmptyState title="No classification result yet" description="Enter a question and click Classify with AI." icon={GitBranch} /> :
        <div className="form-stack" style={{ marginTop: 20 }}>
          <div><strong>Suggested subject</strong><p>{result.subject || 'Not provided'}</p></div>
          <div><strong>Department</strong><p>{result.department_name || 'Not determined'}</p></div>
          <div><strong>Department ID</strong><p>{result.department_id ?? 'Not provided'}</p></div>
          <div><strong>Detected intent</strong><p>{result.intent || 'Not provided'}</p></div>
          <div><strong>Priority</strong><p>{result.priority || 'Not provided'}</p></div>
          <div><strong>AI reasoning</strong><p>{result.reason || 'Not provided'}</p></div>
          <div><strong>Manual review</strong><p><Badge tone={result.needs_manual_review ? 'amber' : 'green'}>{result.needs_manual_review ? 'Required' : 'Not required'}</Badge></p></div>
        </div>}
    </Card>
  </>;
}
