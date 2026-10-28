import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { GraduationCap, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, Search, Bell, Moon, Sun, Menu, X, HelpCircle, LogOut, UserRound, ArrowUpRight, ShieldCheck, PlugZap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navigation, personalNavigation, pagePath } from '../utils/navigation';
import { roleLabels } from '../utils/roles';
import { Button, Badge, Modal } from '../components/ui';
import { getApiErrorMessage } from '../utils/apiErrors';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import notificationsApi from '../api/notificationsApi';
import { isMockMode } from '../api/mode';

export function DashboardShell({ children, role, user, preview = false, activePage = 'dashboard', onPreviewRoleChange }) {
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('campusiq-theme') === 'dark');
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const notifications = useQuery({ queryKey: ['notifications', auth.user?.id], queryFn: () => notificationsApi.getNotifications(), enabled: isMockMode && !preview && Boolean(auth.user), retry: false, refetchInterval: 10000 });
  const recent = [...(notifications.data || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  const unreadCount = (notifications.data || []).filter(item => !item.read).length;
  const searchRef = useRef(null);
  const location = useLocation();
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('campusiq-theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { setMobileOpen(false); setSearch(''); }, [location.pathname, location.search]);
  useEffect(() => { searchRef.current = document.querySelector('[aria-label="Search pages"]'); }, []);
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.app-main');
    const media = window.matchMedia('(max-width: 767px)');
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const sync = () => {
      const hidden = media.matches && !mobileOpen;
      sidebar.inert = hidden;
      if (hidden) sidebar.setAttribute('aria-hidden', 'true'); else sidebar.removeAttribute('aria-hidden');
      const dialogOpen = media.matches && mobileOpen;
      main.inert = dialogOpen;
      if (dialogOpen) { sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true'); sidebar.setAttribute('aria-label', 'Campus navigation'); document.body.style.overflow = 'hidden'; }
      else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); sidebar.removeAttribute('aria-label'); document.body.style.overflow = previousOverflow; }
    };
    sync();
    media.addEventListener('change', sync);
    const frame = mobileOpen && media.matches ? requestAnimationFrame(() => sidebar.querySelector('[aria-label="Close navigation"]')?.focus()) : null;
    const trap = (event) => {
      if (!mobileOpen || !media.matches || event.key !== 'Tab') return;
      const focusable = Array.from(sidebar.querySelectorAll('a[href], button:not(:disabled), input, select')).filter((element) => element.offsetParent !== null);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { if (frame !== null) cancelAnimationFrame(frame); media.removeEventListener('change', sync); document.removeEventListener('keydown', trap); main.inert = false; document.body.style.overflow = previousOverflow; if (mobileOpen && previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, [mobileOpen]);
  useEffect(() => { const handleKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); } if (e.key === 'Escape') { setSearch(''); setMobileOpen(false); } }; window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey); }, []);
  const items = navigation[role] || [];
  const allItems = [...items, ...personalNavigation];
  const href = (key) => preview ? `/preview?role=${role}&page=${key}` : pagePath(role, key);
  const active = allItems.find((item) => item.key === activePage);
  const initials = (user?.full_name || 'Campus User').split(' ').map((s) => s[0]).slice(0, 2).join('');
  const menuItems = (group) => items.filter((item) => (item.group || 'workspace') === group).map(({ key, label, icon: Icon }) => <Link key={key} to={href(key)} className={`nav-item ${key === activePage ? 'nav-item-active' : ''}`} title={collapsed ? label : undefined}><Icon size={18} /><span>{label}</span>{preview && key === 'approvals' && <b className="nav-count">8</b>}{key === activePage && <span className="nav-active-dot" />}</Link>);
  const doLogout = async () => { if (logoutLoading) return; setLogoutLoading(true); setLogoutError(''); try { await auth.logout(); } catch (error) { const message = getApiErrorMessage(error); setLogoutError(message); toast.error(message); } finally { setLogoutLoading(false); } };
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileOpen && <button className="mobile-backdrop" aria-label="Dismiss navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}><Link className="brand" to={href('dashboard')}><span className="brand-icon"><GraduationCap size={25} /></span><span className="brand-text">Campus<span className="brand-iq">IQ</span><small>COMMUNICATION HUB</small></span></Link><button className="sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button><div className="workspace-label"><span className="workspace-emblem"><GraduationCap size={17} /></span><span><strong>University workspace</strong><small>{roleLabels[role]} portal</small></span><ShieldCheck size={14} /></div><nav aria-label="Main navigation"><p className="nav-label">WORKSPACE</p>{menuItems('workspace')}{items.some((i) => i.group === 'administration') && <><p className="nav-label">ADMINISTRATION</p>{menuItems('administration')}</>}<p className="nav-label">PERSONAL</p>{personalNavigation.map(({ key, label, icon: Icon }) => <Link className={`nav-item ${key === activePage ? 'nav-item-active' : ''}`} to={href(key)} key={key}><Icon size={18} /><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-help"><span><HelpCircle size={19} /></span><strong>A little guidance?</strong><p>Everything you need to get started.</p><button onClick={() => setHelp(true)}>Help & documentation <ArrowUpRight size={13} /></button></div><button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}<span>Collapse sidebar</span></button></div></aside>
    <div className="app-main"><header className="top-header"><div className="header-left"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></Button><span className="header-page-title">{active?.label || 'Query details'}</span><span className="header-divider" /><span className="header-workspace">University workspace</span><Badge tone="blue">{role === 'HOD' ? 'HOD' : roleLabels[role]}</Badge></div><div className="header-right"><div className="global-search"><Search size={16} /><input aria-label="Search pages" placeholder="Search anything..." value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>⌘ K</kbd>{search && <div className="search-results">{allItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase())).map((item) => <Link key={item.key} to={href(item.key)}><item.icon size={16} />{item.label}<ArrowUpRight size={13} /></Link>)}{!allItems.some((i) => i.label.toLowerCase().includes(search.toLowerCase())) && <p>No matching pages</p>}</div>}</div><Button variant="ghost" size="icon" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</Button><Dropdown.Root><Dropdown.Trigger asChild><Button variant="ghost" size="icon" aria-label="Open notifications" className="notification-button"><Bell size={19} />{preview && <span className="notification-dot" />}{isMockMode && !preview && unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</Button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className="dropdown-content notification-dropdown" align="end" sideOffset={12}><strong>Notifications</strong>{isMockMode && !preview ? <><p>{unreadCount} unread | Local demo updates</p>{notifications.isError && <p role="alert">{getApiErrorMessage(notifications.error)} <button onClick={() => notifications.refetch()}>Retry</button></p>}{recent.length ? recent.map(item => <Dropdown.Item asChild key={item.id}><Link to={href('notifications')}><span>{item.title}</span>{!item.read && <Badge tone="blue">Unread</Badge>}</Link></Dropdown.Item>) : <p>No recent updates.</p>}</> : <p>{preview ? 'Read-only preview. Notification delivery is not connected.' : 'Notifications will appear here once the backend service is connected.'}</p>}<Dropdown.Item asChild><Link to={href('notifications')}>View notification center <ChevronRight size={15} /></Link></Dropdown.Item></Dropdown.Content></Dropdown.Portal></Dropdown.Root><span className="header-divider" /><Dropdown.Root><Dropdown.Trigger asChild><button className="profile-trigger" aria-label="Open profile menu"><span className="avatar avatar-blue">{initials}</span><span><strong>{user?.full_name || 'Campus user'}</strong><small>{roleLabels[role]}</small></span><ChevronDown size={14} /></button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className="dropdown-content" align="end" sideOffset={12}><Dropdown.Item asChild><Link to={href('profile')}><UserRound size={16} />My profile</Link></Dropdown.Item>{preview ? <Dropdown.Item asChild><Link to="/login"><LogOut size={16} />Go to sign in</Link></Dropdown.Item> : <Dropdown.Item onSelect={doLogout} disabled={logoutLoading}><LogOut size={16} />{logoutLoading ? 'Signing out…' : 'Sign out'}</Dropdown.Item>}</Dropdown.Content></Dropdown.Portal></Dropdown.Root></div></header>
    {isMockMode && !preview && <div className="preview-banner"><span><PlugZap size={14} /><strong>Local demo</strong><span className="preview-note">Browser-only records | Simulated AI and external delivery</span></span></div>}
    {preview && <div className="preview-banner"><span><PlugZap size={14} /><strong>Read-only preview</strong><span className="preview-note">Isolated demo data · No backend actions</span></span><div><select aria-label="Preview role" value={role} onChange={(e) => onPreviewRoleChange(e.target.value)}><option value="ADMIN">Admin workspace</option><option value="STUDENT">Student workspace</option><option value="INSTRUCTOR">Instructor workspace</option><option value="HOD">HOD workspace</option></select><Link to="/login">Connect with your account <ArrowUpRight size={13} /></Link></div></div>}
    <main className="main-content" id="main-content"><div className="breadcrumbs"><Link to={href('dashboard')}>Workspace</Link><ChevronRight size={12} /><span>{active?.label || 'Query details'}</span></div>{logoutError && <div className="inline-error" role="alert">{logoutError}</div>}{children}</main><footer className="app-footer"><span>CampusIQ <span>·</span> University Intelligent Communication Hub</span><span className="footer-status"><span />{preview ? 'Interface preview' : isMockMode ? 'Local demo | browser data' : 'Secure role-based workspace'}</span></footer></div>
    <Modal open={help} onOpenChange={setHelp} title="Welcome to CampusIQ" description="A connected workspace for university communication."><div className="help-content"><p>{isMockMode ? 'Use the sidebar for local demo query and notification workflows. Records stay in this browser until you reset them.' : 'Use the sidebar to open your role tools. Query workflows and notifications become available when their backend services are connected.'}</p><p>{isMockMode ? 'Public registrations need local Admin approval. The approved role is assigned from the registration request.' : 'Public registrations need administrator approval. Your account role is assigned by the backend and cannot be changed in the interface.'}</p><p>{isMockMode ? 'The public preview is isolated from private demo records. Sign in with an approved account to use the local demo.' : 'The read-only preview contains labelled sample data. Sign in with an approved backend account to access real profile, department and approval requests.'}</p><Link to="/preview" className="button button-secondary">Explore read-only preview <ArrowUpRight size={15} /></Link></div></Modal>
  </div>;
}

export default function DashboardLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const page = parts.includes('new') ? 'submit' : parts.length === 1 ? parts[0] : parts[1];
  return <DashboardShell role={user.role} user={user} activePage={page}><Outlet /></DashboardShell>;
}
