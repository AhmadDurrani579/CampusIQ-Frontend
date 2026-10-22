import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getRoleHome } from '../../utils/roles';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { isMockMode } from '../../api/mode';
import { isDepartmentStaff, roleLabels } from '../../utils/roles';
import { demoAccounts, demoPassword, resetDemo } from '../../api/demoApi';

const schema = z.object({ email: z.string().trim().email('Enter a valid university email address.'), password: z.string().min(1, 'Enter your password.') });

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const busy = useRef(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  async function submit(values) {
    if (busy.current) return;
    busy.current = true;
    setError('');
    try { 
      const user = await login(values); 
      if (user.approval_status !== "APPROVED") {
        message.warning("Your account is pending admin approval.");
        return;
      }

      navigate(getRoleHome(user.role), { replace: true }); 
    }
    catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { busy.current = false; }
  }
  async function recover() {
    if (!window.confirm('Delete local demo accounts and queries?')) return;
    setResetting(true); setError('');
    try { await resetDemo(); window.location.reload(); }
    catch (failure) { setError(getApiErrorMessage(failure)); setResetting(false); }
  }
  return <div className="auth-form-content"><span className="auth-form-icon"><LockKeyhole size={23} /></span><p className="eyebrow">YOUR CAMPUS, CONNECTED</p><h2>Welcome back</h2><p className="auth-description">Sign in to your university workspace.</p>
    <form onSubmit={handleSubmit(submit)} className="auth-form" noValidate>
      {error && <div className="form-error" role="alert">{error}</div>}
      <Field label="Email address" htmlFor="login-email" error={errors.email?.message}><Input id="login-email" type="email" autoComplete="username" placeholder="you@university.edu" aria-invalid={Boolean(errors.email)} {...register('email')} /></Field>
      <Field label="Password" htmlFor="login-password" error={errors.password?.message}><div className="password-field"><Input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} {...register('password')} /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
      <p className="field-hint">Forgot your password? Contact your university administrator.</p>
      <Button type="submit" loading={isSubmitting} className="auth-submit">Sign in <ArrowRight size={17} /></Button>
    </form>
    <p className="auth-switch">New to CampusIQ? <Link to="/signup">Create an account</Link></p><div className="auth-note">Access is assigned after account approval. Google sign-in: Coming Soon.</div>
    {isMockMode && <div className="auth-note"><p>If local demo records are damaged, reset the demo to recover. This deletes local demo accounts and queries.</p><Button variant="danger" size="sm" disabled={resetting} onClick={recover}>Reset local demo</Button></div>}
  </div>;
}
