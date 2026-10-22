import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleHome } from '../../utils/roles';

export default function AccessDeniedPage() {
  const { user } = useAuth();
  return <main className="standalone-state"><span className="standalone-icon"><ShieldAlert size={34} /></span><p className="eyebrow">ACCOUNT PERMISSIONS</p><h1>Access denied</h1><p>This workspace is available only to its authorised role. Your account permissions come from your university.</p><Link className="button button-primary" to={user ? getRoleHome(user.role) : '/login'}><ArrowLeft size={16} />Return to your workspace</Link></main>;
}
