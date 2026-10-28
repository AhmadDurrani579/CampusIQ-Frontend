import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { ErrorState, Skeleton } from '../../components/ui';

export const queryStatuses = ['SUBMITTED', 'CLASSIFYING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED', 'MANUAL_REVIEW', 'CLASSIFICATION_FAILED'];
export const formatTime = value => new Date(value).toLocaleString();
export function useDemoResource(kind, fn, args, options = {}) {
  const { user } = useAuth();
  return useQuery({ queryKey: [kind, user?.id, args], enabled: Boolean(user), queryFn: () => fn(args), retry: false, refetchInterval: 10000, ...options });
}
export function ResourceState({ resource }) {
  if (resource.isPending) return <Skeleton rows={3} />;
  if (resource.isError) return <ErrorState error={resource.error} onRetry={() => resource.refetch()} />;
  return null;
}
export function useDemoMutation(fn, onSuccess) {
  const cache = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: async result => {
    await Promise.all(['queries', 'query', 'analytics', 'reports', 'notifications', 'audit', 'audit-logs', 'draft'].map(key => cache.invalidateQueries({ queryKey: [key] })));
    onSuccess?.(result);
  } });
}
export const acceptedTypes = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/webp'];
export function validateFiles(files) {
  if (files.length > 3) throw new Error('Choose up to 3 attachments.');
  if (files.some(file => !acceptedTypes.includes(file.type))) throw new Error('Use PDF, plain text, PNG, JPEG or WebP attachments.');
  if (files.some(file => file.size > 2 * 1024 * 1024)) throw new Error('Each attachment must be 2 MB or smaller.');
  if (files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) throw new Error('Attachments must total 4 MB or less.');
}
export function readAttachment(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result }); reader.onerror = () => reject(new Error(`Could not read ${file.name}.`)); reader.readAsDataURL(file); });
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name.replace(/[\\/\x00-\x1f]/g, '_'); document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadAttachment(file) {
  if (!acceptedTypes.includes(file.type) || !file.dataUrl.startsWith(`data:${file.type};base64,`)) throw new Error('This attachment format is not supported.');
  const data = atob(file.dataUrl.split(',')[1]); const bytes = Uint8Array.from(data, character => character.charCodeAt(0));
  downloadBlob(new Blob([bytes], { type: file.type }), file.name);
}
