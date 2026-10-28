import { useState } from 'react';
import { CalendarClock, Save, ShieldCheck } from 'lucide-react';
import { Card, PageHeader, Field, Button, Badge } from '../../components/ui';
import FeatureNotice from '../../components/common/FeatureNotice';
import { isMockMode } from '../../api/mode';
import { MockLeavePage } from '../mock/MockPersonalPages';

export default function LeavePage({ preview = false }) {
  if (isMockMode && !preview) return <MockLeavePage />;
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [message, setMessage] = useState('Thank you for your message. I am currently away and will respond when I return. For urgent support, please contact the department office.');
  return <><PageHeader eyebrow="YOUR AVAILABILITY" title="Leave & auto-reply" description="Set expectations clearly, even when you’re away." /><FeatureNotice>Leave management and automatic replies are not connected yet. Changes below are an unsaved draft and do not affect query routing or send messages.</FeatureNotice><div className="form-sidebar-grid"><Card className="padded-card"><div className="section-title"><span className="section-icon"><CalendarClock size={20} /></span><div><h2>Availability settings</h2><p>Prepare your leave schedule and response.</p></div><Badge tone="neutral">Unsaved draft</Badge></div><div className="switch-row"><div><strong>Leave mode</strong><p>Draft a temporary away period.</p></div><button className={`switch ${enabled ? 'switch-on' : ''}`} role="switch" aria-checked={enabled} aria-label="Leave mode" onClick={() => setEnabled(!enabled)}><span /></button></div><div className="form-two-col"><Field label="Leave starts" htmlFor="leave-start"><input id="leave-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field><Field label="Leave ends" htmlFor="leave-end" error={end && start && end < start ? 'End date must follow the start date.' : undefined}><input id="leave-end" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field></div><Field label="Auto-reply message" htmlFor="leave-message"><textarea id="leave-message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} /></Field><div className="form-footer"><span className="muted text-sm">No active leave status is available.</span><Button disabled title="Leave API not implemented"><Save size={16} />Save leave settings</Button></div></Card><Card className="padded-card"><span className="assistant-icon"><ShieldCheck size={23} /></span><h3>Clear communication while you’re away.</h3><p className="muted">The backend will control availability, query reassignment and any authorised automatic-response policy.</p><div className="reply-preview"><small>UNSAVED AUTO-REPLY PREVIEW</small><p>{message || 'Your draft message will appear here.'}</p></div></Card></div></>;
}
