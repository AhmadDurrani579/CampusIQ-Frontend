import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui/index.jsx';
import { isMockMode } from '../../api/mode';
import { MockUsersPage } from '../mock/MockAdminPages';

export default function UsersPage() {
  if (isMockMode) return <MockUsersPage />;
  return <div className="page-stack">
    <PageHeader eyebrow="Access management" title="Users & staff" description="Manage access to the university communication workspace." actions={<Badge tone="warning">Directory integration pending</Badge>} />
    <Card className="p-6"><EmptyState icon={Users} title="The user directory is being connected" description="The complete user directory is awaiting its backend integration. Existing account roles and status cannot be changed from this view." /></Card>
    <Card className="p-6"><div className="flex flex-col sm:flex-row sm:items-center gap-5"><span className="rounded-2xl bg-blue-500/10 text-blue-500 p-4 self-start"><ShieldCheck size={26} /></span><div className="flex-1"><h2 className="font-semibold text-lg">Review new account requests</h2><p className="text-sm text-muted mt-1">Pending registrations are connected to the university server. Review requested roles, then approve or reject each request with confirmation.</p></div><Link className="button button-primary button-md" to="/admin/approvals">Review pending users<ArrowRight size={16} /></Link></div></Card>
  </div>;
}
