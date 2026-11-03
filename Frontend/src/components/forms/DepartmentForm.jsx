import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input } from '../ui/index.jsx';

const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required'),
  code: z.string().trim().min(1, 'Department code is required'),
  description: z.string().trim(),
  keywords: z.string().transform((value) => value.split(',').map((keyword) => keyword.trim()).filter(Boolean).join(', ')),
});

export default function DepartmentForm({ onSubmit, onCancel, loading = false, error = '', initialValues, submitLabel = 'Create department' }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(departmentSchema), defaultValues: { name: initialValues?.name || '', code: initialValues?.code || '', description: initialValues?.description || '', keywords: Array.isArray(initialValues?.keywords) ? initialValues.keywords.join(', ') : initialValues?.keywords || '' } });
  return <form onSubmit={handleSubmit(onSubmit)} noValidate className="page-stack">
    {error && <div className="error-state" role="alert">{error}</div>}
    <fieldset disabled={loading} className="grid gap-4 border-0 p-0 m-0 min-w-0">
      <Field label="Department name" htmlFor="department-name" error={errors.name?.message}><Input id="department-name" autoFocus aria-invalid={Boolean(errors.name)} {...register('name')} placeholder="e.g. Computer Science" /></Field>
      <Field label="Department code" htmlFor="department-code" error={errors.code?.message}><Input id="department-code" aria-invalid={Boolean(errors.code)} {...register('code')} placeholder="e.g. CS" /></Field>
      <Field label="Description" htmlFor="department-description" error={errors.description?.message}><textarea id="department-description" className="input min-h-28" rows={3} {...register('description')} placeholder="Describe this department’s focus" /></Field>
      <Field label="Keywords" htmlFor="department-keywords" hint="Separate keywords with commas." error={errors.keywords?.message}><Input id="department-keywords" {...register('keywords')} placeholder="computing, software, technology" /></Field>
    </fieldset>
    <div className="dialog-actions"><Button variant="secondary" disabled={loading} onClick={onCancel}>Cancel</Button><Button type="submit" loading={loading}>{submitLabel}</Button></div>
  </form>;
}
