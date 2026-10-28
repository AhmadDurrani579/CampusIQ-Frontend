import { forwardRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, ArrowRight, Check, Inbox, LoaderCircle, X } from 'lucide-react';

export const Button = forwardRef(function Button({ children, variant = 'primary', size = 'md', loading, className = '', disabled, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={`button button-${variant} button-${size} ${className}`} disabled={disabled || loading} {...props}>{loading && <LoaderCircle size={16} className="animate-spin" />}{children}</button>;
});
export function Card({ children, className = '', ...props }) { return <section className={`card ${className}`} {...props}>{children}</section>; }
export function Badge({ children, tone = 'neutral', className = '', ...props }) { return <span className={`badge badge-${tone} ${className}`} {...props}>{children}</span>; }
export const Input = forwardRef(function Input({ className = '', ...props }, ref) { return <input ref={ref} className={`input ${className}`} {...props} />; });
export function Field({ label, error, htmlFor, hint, children, className = '' }) {
  return <div className={`field ${className}`}><label htmlFor={htmlFor}>{label}</label>{children}{hint && <p className="field-hint">{hint}</p>}{error && <p className="field-error" role="alert">{error}</p>}</div>;
}
export function PageHeader({ eyebrow, title, description, actions }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>;
}
export function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = Inbox, children }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={25} /></span><h3>{title}</h3>{description && <p>{description}</p>}{children}{action}</div>;
}
export function ErrorState({ error, message, onRetry, title = 'We couldn’t load this information' }) {
  const detail = message || (typeof error === 'string' ? error : error?.message) || 'Check your connection and try again.';
  return <div className="error-state" role="alert"><AlertCircle size={21} /><div><h3>{title}</h3><p>{detail}</p>{onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again <ArrowRight size={14} /></Button>}</div></div>;
}
export function Skeleton({ className = '', rows = 1 }) { return <div className={`skeleton-stack ${className}`} aria-label="Loading" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div className="skeleton" key={i} />)}</div>; }
export function Modal({ open, onOpenChange, title, description, children, className = '' }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className={`dialog-content ${className}`}><div className="dialog-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description || 'Review the information below.'}</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close dialog"><X size={20} /></Button></Dialog.Close></div>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, confirmLabel = 'Confirm', loading, variant = 'primary', children }) {
  return <Modal open={open} onOpenChange={(value) => !loading && onOpenChange?.(value)} title={title} description={description}>{children}<div className="dialog-actions"><Button variant="secondary" disabled={loading} onClick={() => onOpenChange?.(false)}>Cancel</Button><Button variant={variant} loading={loading} onClick={onConfirm}><Check size={15} />{confirmLabel}</Button></div></Modal>;
}
