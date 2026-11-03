import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import notificationsApi from '../../api/notificationsApi';
import announcementsApi from '../../api/announcementsApi';
import departmentsApi from '../../api/departmentsApi';
import leaveApi from '../../api/leaveApi';
import demoApi from '../../api/demoApi';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader } from '../../components/ui';
import { ResourceState, useDemoResource, formatTime } from './querySupport';
import { getApiErrorMessage } from '../../utils/apiErrors';

function usePersonalWrite(keys) {
  const cache = useQueryClient();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function run(action, message) {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); await Promise.all(keys.map(key => cache.invalidateQueries({ queryKey: [key] }))); setNotice(message); return true; }
    catch (failure) { setError(getApiErrorMessage(failure)); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  return { run, busy, error, notice };
}

export function MockNotificationsPage() {
  const { user } = useAuth();
  const notifications = useDemoResource('notifications', () => notificationsApi.getNotifications());
  const write = usePersonalWrite(['notifications', 'analytics']);
  const [filter, setFilter] = useState('all');
  const items = [...(notifications.data || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const visible = items.filter(n => filter === 'all' || (filter === 'unread' ? !n.read : n.read));
  const unread = items.filter(n => !n.read).length;
  return <div className="page-stack"><PageHeader title="Notifications" description="Local demo updates. External email and WhatsApp delivery is simulated; this page polls local records." actions={<Button variant="secondary" disabled={!unread || write.busy} onClick={() => write.run(() => notificationsApi.markAllRead(), 'All notifications marked read.')}>Mark all read</Button>} />
    {write.error && <div role="alert" className="error-state">{write.error}</div>}{write.notice && <p role="status">{write.notice}</p>}
    <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="font-semibold">{unread} unread</h2><Field label="Show" htmlFor="notification-filter"><select id="notification-filter" className="input" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option></select></Field></div><ResourceState resource={notifications} />{notifications.isSuccess && (visible.length ? <div className="notification-list">{visible.map(n => <div key={n.id} className={n.read ? '' : 'notification-unread'}><div className="flex-1 min-w-0"><strong>{n.title}</strong><p>{n.message}</p><small>{formatTime(n.created_at)} · {n.channel || 'In-app'} · Local demo</small>{n.query_id && <p><Link to={`/${user.role.toLowerCase()}/queries/${n.query_id}`}>Open related query</Link></p>}</div><Button variant="ghost" size="sm" disabled={write.busy} onClick={() => write.run(() => notificationsApi.markRead(n.id, !n.read), n.read ? 'Marked unread.' : 'Marked read.')}>{n.read ? 'Mark unread' : 'Mark read'}</Button></div>)}</div> : <EmptyState title="All caught up" description="No notifications match this view." />)}</Card>
  </div>;
}

export function MockAnnouncementsPage({ role }) {
  const announcements = useDemoResource('announcements', () => announcementsApi.getAnnouncements());
  const departments = useDemoResource('departments', () => departmentsApi.getDepartments());
  const write = usePersonalWrite(['announcements', 'notifications', 'audit']);
  const [open, setOpen] = useState(false), [title, setTitle] = useState(''), [content, setContent] = useState(''), [audience, setAudience] = useState('ALL'), [channels, setChannels] = useState(['In-app']);
  const [validation, setValidation] = useState('');
  const names = Object.fromEntries((departments.data || []).map(d => [d.id, d.name]));
  async function publish(event) {
    event.preventDefault(); setValidation('');
    if (!title.trim() || title.trim().length > 180) return setValidation('Use a title of 1 to 180 characters.');
    if (!content.trim() || content.trim().length > 5000) return setValidation('Use content of 1 to 5000 characters.');
    if (!channels.length) return setValidation('Choose at least one delivery channel.');
    if (await write.run(() => announcementsApi.publishAnnouncement({ title, content, audience: audience === 'ALL' ? 'ALL' : Number(audience), channels }), 'Announcement published locally. External delivery is simulated.')) { setOpen(false); setTitle(''); setContent(''); setAudience('ALL'); setChannels(['In-app']); }
  }
  return <div className="page-stack"><PageHeader title="Announcements" description={role === 'ADMIN' ? 'Publish local demo campus updates. Email and WhatsApp delivery are simulated.' : 'Campus updates for all students or your department.'} actions={role === 'ADMIN' && <Button onClick={() => setOpen(true)}>Compose announcement</Button>} />
    {write.error && <div role="alert" className="error-state">{write.error}</div>}{write.notice && <p role="status">{write.notice}</p>}
    <ResourceState resource={announcements} />{announcements.isSuccess && ((announcements.data || []).length ? <div className="announcement-grid">{announcements.data.map(a => <Card key={a.id} className="announcement-card announcement-body"><Badge tone="blue">{a.audience === 'ALL' ? 'All students' : names[a.audience] || 'Department'}</Badge><h2>{a.title}</h2><p>{a.content}</p><small>{a.author} · {formatTime(a.created_at)} · Local demo</small><p className="text-sm text-muted">{a.channels.join(', ')}{a.channels.some(c => c !== 'In-app') && ' · External delivery simulated'}</p></Card>)}</div> : <Card><EmptyState title="No announcements yet" description="Published local demo updates will appear here." /></Card>)}
    {role === 'ADMIN' && open && <Card className="p-5"><h2 className="font-semibold mb-3">Compose announcement</h2><form className="form-stack" onSubmit={publish}><Field label="Audience" htmlFor="announcement-audience"><select id="announcement-audience" className="input" value={audience} onChange={e => setAudience(e.target.value)}><option value="ALL">All students</option>{(departments.data || []).filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field><Field label="Subject" htmlFor="announcement-subject"><Input id="announcement-subject" maxLength={180} value={title} onChange={e => setTitle(e.target.value)} /></Field><Field label="Announcement content" htmlFor="announcement-content"><textarea id="announcement-content" className="input" rows={5} maxLength={5000} value={content} onChange={e => setContent(e.target.value)} /></Field><fieldset className="channel-options"><legend>Delivery channels</legend>{['In-app', 'Email', 'WhatsApp'].map(channel => <label key={channel}><input type="checkbox" checked={channels.includes(channel)} onChange={() => setChannels(current => current.includes(channel) ? current.filter(c => c !== channel) : [...current, channel])} />{channel}</label>)}</fieldset>{validation && <p role="alert">{validation}</p>}<div className="dialog-actions"><Button variant="secondary" onClick={() => setOpen(false)}>Keep draft and close</Button><Button type="submit" loading={write.busy}>Publish announcement</Button></div></form></Card>}
  </div>;
}

export function MockLeavePage() {
  const { user } = useAuth();
  const leave = useDemoResource('leave', () => leaveApi.getLeave());
  const clock = useDemoResource('demo-time', () => demoApi.getDemoInfo());
  const write = usePersonalWrite(['leave', 'audit', 'queries', 'analytics']);
  const initialized = useRef(null);
  const [enabled, setEnabled] = useState(false), [from, setFrom] = useState(''), [to, setTo] = useState(''), [message, setMessage] = useState('');
  const [validation, setValidation] = useState('');
  useEffect(() => {
    if (!leave.data || initialized.current === user.id) return;
    initialized.current = user.id; setEnabled(leave.data.enabled); setFrom(leave.data.from || ''); setTo(leave.data.to || ''); setMessage(leave.data.message || '');
  }, [leave.data, user.id]);
  const today = clock.data?.now?.slice(0, 10);
  const active = leave.data?.enabled && today && leave.data.from <= today && leave.data.to >= today;
  async function save(event) {
    event.preventDefault(); setValidation('');
    if (enabled && (!from || !to || to < from)) return setValidation('Choose a valid leave start and end date.');
    if (enabled && (!message.trim() || message.trim().length > 1000)) return setValidation('Use an auto-reply message of 1 to 1000 characters.');
    await write.run(() => leaveApi.saveLeave({ enabled, from, to, message }), 'Leave settings saved locally. Future routing and the simulated auto-reply use these settings.');
  }
  return <div className="page-stack"><PageHeader title="Leave & auto-reply" description="Local demo Instructor availability affects future query routing. Auto-replies are simulated." />
    <ResourceState resource={leave} />{leave.isSuccess && <div className="form-sidebar-grid"><Card className="p-5"><form className="form-stack" onSubmit={save}><div className="switch-row"><div><strong>Leave mode</strong><p>Use this saved schedule for routing.</p></div><button type="button" className={`switch ${enabled ? 'switch-on' : ''}`} role="switch" aria-checked={enabled} aria-label="Leave mode" onClick={() => setEnabled(!enabled)}><span /></button></div><div className="form-two-col"><Field label="Leave starts" htmlFor="leave-start"><input id="leave-start" className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field><Field label="Leave ends" htmlFor="leave-end"><input id="leave-end" className="input" type="date" min={from} value={to} onChange={e => setTo(e.target.value)} /></Field></div><Field label="Auto-reply message" htmlFor="leave-message"><textarea id="leave-message" className="input" rows={6} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} /></Field>{validation && <p role="alert">{validation}</p>}{write.error && <p role="alert">{write.error}</p>}{write.notice && <p role="status">{write.notice}</p>}<Button type="submit" loading={write.busy}>Save leave settings</Button></form></Card><Card className="p-5"><h2 className="font-semibold">Current saved status</h2><Badge tone={active ? 'warning' : 'neutral'}>{active ? 'Active leave' : leave.data.enabled ? 'Scheduled or ended' : 'Available'}</Badge><p className="text-sm text-muted mt-3">Demo date: {today || 'Loading'}.</p><p className="text-sm text-muted">Saved dates: {leave.data.from || '—'} to {leave.data.to || '—'}.</p><h3 className="font-semibold mt-4">Simulated auto-reply preview</h3><p>{message || 'Add an auto-reply message.'}</p></Card></div>}
  </div>;
}
