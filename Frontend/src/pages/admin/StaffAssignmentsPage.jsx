import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, RefreshCw } from 'lucide-react';
import { Card, PageHeader, Field, Button, EmptyState } from '../../components/ui';
import usersApi from '../../api/usersApi';
import departmentsApi from '../../api/departmentsApi';
import axiosClient from '../../api/axiosClient';

const STAFF_ROLES = ['HOD', 'EXAM_STAFF', 'FINANCE_STAFF', 'IT_STAFF'];
const roleNames = { HOD: 'HOD', EXAM_STAFF: 'Exam Staff', FINANCE_STAFF: 'Finance Staff', IT_STAFF: 'IT Staff' };

function getError(error) {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : error?.message || 'Request failed.';
}

// This client-side matching is a convenience only. The backend must enforce it.
function compatible(role, department) {
  if (!department?.is_active) return false;
  if (role === 'HOD') return true;
  const text = `${department.code || ''} ${department.name || ''}`.toUpperCase();
  if (role === 'EXAM_STAFF') return /\b(EXAM|EXAMINATION|EXAMINATIONS)\b/.test(text);
  if (role === 'FINANCE_STAFF') return /\b(FINANCE|FINANCIAL)\b/.test(text);
  if (role === 'IT_STAFF') return /\bIT\b|INFORMATION TECHNOLOGY/.test(text);
  return false;
}

async function getAllStaff() {
  const pageSize = 100;
  const first = await usersApi.getAllUsers({ page: 1, page_size: pageSize });
  if (!Array.isArray(first?.users)) throw new Error('Unexpected user directory response');
  const totalPages = Math.max(1, Number(first.total_pages) || Math.ceil((Number(first.total) || first.users.length) / pageSize));
  const results = [...first.users];
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await usersApi.getAllUsers({ page, page_size: pageSize });
    if (!Array.isArray(response?.users)) throw new Error('Unexpected user directory response');
    results.push(...response.users);
  }
  return results.filter(user => STAFF_ROLES.includes(user.role) && user.is_active && user.approval_status === 'APPROVED');
}

export default function StaffAssignmentsPage() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [success, setSuccess] = useState('');

  const usersQuery = useQuery({ queryKey: ['admin-assignable-staff'], queryFn: getAllStaff, retry: false });
  const departmentsQuery = useQuery({ queryKey: ['assignment-departments'], queryFn: departmentsApi.getDepartments, retry: false });
  const users = usersQuery.data || [];
  const departments = departmentsQuery.data || [];
  const selectedUser = users.find(user => String(user.id) === userId);
  const allowedDepartments = useMemo(
    () => selectedUser ? departments.filter(dept => compatible(selectedUser.role, dept)) : [],
    [departments, selectedUser]
  );
  const departmentNames = Object.fromEntries(departments.map(dept => [dept.id, dept.name]));

  const assignment = useMutation({
    mutationFn: async () => {
      const { data } = await axiosClient.patch(`/admin/users/${Number(userId)}/department`, {
        department_id: Number(departmentId),
      });
      return data;
    },
    onSuccess: data => {
      setSuccess(data?.message || 'Staff department assigned successfully.');
      setDepartmentId('');
      queryClient.invalidateQueries({ queryKey: ['admin-assignable-staff'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => setSuccess(''),
  });

  function refresh() {
    usersQuery.refetch();
    departmentsQuery.refetch();
  }

  const loading = usersQuery.isLoading || departmentsQuery.isLoading;
  const error = usersQuery.error || departmentsQuery.error;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="ACCESS MANAGEMENT"
        title="Staff assignments"
        description="Assign approved staff to active departments."
        actions={<Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCw size={16} />Refresh</Button>}
      />
      <Card className="padded-card">
        <h2>Assign a staff member</h2>
        <p className="muted">Exam, Finance and IT staff can be assigned only to matching departments. HODs may be assigned to any active department.</p>
        {error ? <p role="alert" className="form-error">{getError(error)}</p> : null}
        {loading ? <p>Loading approved staff and departments...</p> : (
          <form className="form-stack" onSubmit={event => { event.preventDefault(); setSuccess(''); if (selectedUser && allowedDepartments.some(d => String(d.id) === departmentId)) assignment.mutate(); }}>
            <Field label="Staff member" htmlFor="assignment-member">
              <select id="assignment-member" className="input" value={userId} onChange={event => { setUserId(event.target.value); setDepartmentId(''); setSuccess(''); }}>
                <option value="">Choose approved staff</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.full_name || user.email} ({roleNames[user.role] || user.role})</option>)}
              </select>
            </Field>
            <Field label="Department" htmlFor="assignment-department">
              <select id="assignment-department" className="input" value={departmentId} disabled={!selectedUser} onChange={event => { setDepartmentId(event.target.value); setSuccess(''); }}>
                <option value="">Choose compatible active department</option>
                {allowedDepartments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </Field>
            {selectedUser && allowedDepartments.length === 0 ? <p className="muted">No compatible active departments found. Check the department name/code and active status.</p> : null}
            {selectedUser ? <p className="muted">Current department: {selectedUser.department_name || departmentNames[selectedUser.department_id] || 'Unassigned'}</p> : null}
            {assignment.isError ? <p className="form-error" role="alert">{getError(assignment.error)}</p> : null}
            {success ? <p role="status">{success}</p> : null}
            <Button type="submit" disabled={!selectedUser || !departmentId || assignment.isPending} loading={assignment.isPending}>
              Assign staff member
            </Button>
          </form>
        )}
      </Card>
      <Card className="padded-card">
        <h2>Current staff directory</h2>
        {loading ? <p>Loading staff...</p> : users.length === 0 ? (
          <EmptyState icon={Users} title="No approved staff found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-3">Staff member</th><th className="p-3">Role</th><th className="p-3">Department</th><th className="p-3">Status</th></tr></thead>
              <tbody>{users.map(user => (
                <tr key={user.id} className="border-b">
                  <td className="p-3">{user.full_name || user.email}</td>
                  <td className="p-3">{roleNames[user.role] || user.role}</td>
                  <td className="p-3">{user.department_name || departmentNames[user.department_id] || 'Unassigned'}</td>
                  <td className="p-3">{user.approval_status}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
