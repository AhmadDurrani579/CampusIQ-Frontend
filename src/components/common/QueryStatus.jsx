import { Check, Circle, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui';

const statuses = {
  SUBMITTED: ['Submitted', 'neutral'], CLASSIFYING: ['Classifying', 'blue'], ASSIGNED: ['Assigned', 'blue'],
  IN_PROGRESS: ['In progress', 'amber'], RESOLVED: ['Resolved', 'green'], ESCALATED: ['Escalated', 'red'],
  CLOSED: ['Closed', 'neutral'], MANUAL_REVIEW: ['Manual review', 'amber'], CLASSIFICATION_FAILED: ['Classification failed', 'red'],
};
export default function QueryStatus({ status = 'SUBMITTED' }) {
  const [label, tone] = statuses[status] || [String(status).replaceAll('_', ' '), 'neutral'];
  return <Badge tone={tone}><span className="status-dot" />{label}</Badge>;
}
export function PriorityBadge({ priority }) { return <Badge tone={priority === 'High' || priority === 'HIGH' ? 'red' : priority === 'Medium' || priority === 'MEDIUM' ? 'amber' : 'neutral'}>{priority || 'Not assigned'}</Badge>; }
export function QueryTimeline({ status = 'SUBMITTED', available = true }) {
  const steps = ['SUBMITTED', 'CLASSIFYING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
  const current = steps.indexOf(status);
  return <ol className="query-timeline" aria-label="Query progress">{steps.map((step, index) => <li key={step} className={available && current >= index ? 'timeline-complete' : ''}><span>{available && current >= index ? <Check size={15} /> : <Circle size={13} />}</span><div><strong>{statuses[step][0]}</strong><small>{available && current >= index ? 'Completed stage' : 'Awaiting update'}</small></div></li>)}{['ESCALATED', 'MANUAL_REVIEW', 'CLASSIFICATION_FAILED', 'CLOSED'].includes(status) && <li><span><AlertTriangle size={15} /></span><QueryStatus status={status} /></li>}</ol>;
}
