import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ShieldCheck, UserRound } from 'lucide-react';
import { Badge, Button, Card, Field, Input, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { roleLabels } from '../../utils/roles';
import { getApiErrorMessage } from '../../utils/apiErrors';

const schema = z.object({ full_name: z.string().trim().min(2, 'Enter your full name.').max(150, 'Your name is too long.') });

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { full_name: user?.full_name || '' } });
  useEffect(() => { reset({ full_name: user?.full_name || '' }); }, [user?.full_name, reset]);
  async function submit(values) {
    setError(''); setSaved(false);
    try { await updateProfile({ full_name: values.full_name }); setSaved(true); }
    catch (failure) { setError(getApiErrorMessage(failure)); }
  }
  const initials = user?.full_name?.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('') || 'U';
  return <div className="page-content"><PageHeader eyebrow="YOUR ACCOUNT" title="My profile" description="Keep your personal details up to date." /><div className="profile-grid"><Card className="profile-summary"><span className="avatar avatar-large avatar-blue">{initials}</span><h2>{user?.full_name}</h2><p>{user?.email}</p><Badge tone="blue">{roleLabels[user?.role]}</Badge><div className="profile-security"><ShieldCheck size={20} /><p>Your university manages your account role and permissions.</p></div></Card><Card><div className="section-heading"><span><UserRound size={20} /> Personal information</span></div><form onSubmit={handleSubmit(submit)} className="profile-form" noValidate>{error && <div className="form-error" role="alert">{error}</div>}{saved && <div className="form-success" role="status"><CheckCircle2 size={18} /> Profile updated.</div>}<Field label="Full name" htmlFor="profile-name" error={errors.full_name?.message}><Input id="profile-name" autoComplete="name" aria-invalid={Boolean(errors.full_name)} {...register('full_name')} /></Field><Field label="Email address" htmlFor="profile-email" hint="Contact your administrator to change your university email."><Input id="profile-email" value={user?.email || ''} disabled /></Field><Field label="Account role" htmlFor="profile-role" hint="Assigned by your university administrator."><Input id="profile-role" value={roleLabels[user?.role] || user?.role || ''} disabled /></Field>{user?.id != null && <div className="account-detail"><span>Account ID</span><strong>{String(user.id)}</strong></div>}{typeof user?.status === 'string' && <div className="account-detail"><span>Account status</span><strong>{user.status}</strong></div>}<div className="form-actions"><Button type="submit" loading={isSubmitting}>Save changes</Button><Button variant="secondary" disabled={isSubmitting} onClick={() => { reset({ full_name: user?.full_name || '' }); setError(''); setSaved(false); }}>Reset</Button></div></form></Card></div></div>;
}
