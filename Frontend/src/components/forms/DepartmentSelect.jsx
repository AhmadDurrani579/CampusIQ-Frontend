import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import departmentsApi from '../../api/departmentsApi';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { Button, Field } from '../ui';

export default function DepartmentSelect({ id, label = 'Department', preview = false, demoDepartments = [], allowAutomatic = false, inputProps = {}, value, onChange, hint }) {
  const { user } = useAuth();
  const directory = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getDepartments,
    enabled: !preview && Boolean(user),
    retry: false,
  });
  // A disabled query can still contain cached private data. Preview must use its
  // own fixtures exclusively, including when a signed-in user opens the preview.
  const source = preview ? demoDepartments : directory.data || [];
  const choices = source.filter((department) => department.is_active !== false);
  const loading = !preview && Boolean(user) && directory.isPending;
  const failure = !preview && directory.isError;
  const selectionProps = value === undefined ? inputProps : { ...inputProps, value, onChange };
  return <Field label={label} htmlFor={id} hint={hint}>
    <select {...selectionProps} id={id} disabled={loading || failure} aria-busy={loading}>
      <option value="">{loading ? 'Loading departments…' : allowAutomatic ? 'Let the system help me' : 'Choose a department'}</option>
      {choices.map((department) => <option value={String(department.id)} key={department.id}>{department.name}{preview ? ' · Demo data' : ''}</option>)}
    </select>
    {failure && <div className="field-hint" role="alert"><p>{getApiErrorMessage(directory.error)}</p><Button size="sm" variant="ghost" onClick={() => directory.refetch()}><RefreshCw size={13} />Retry department directory</Button></div>}
    {!loading && !failure && !choices.length && <p className="field-hint">{preview ? 'Live directory lookup is disabled in this read-only preview.' : 'No active departments are currently available.'}</p>}
  </Field>;
}
