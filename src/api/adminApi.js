import axiosClient from './axiosClient';
import { validateList, resourceId } from './contracts';
import { ApiContractError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
export async function getPendingUsers() {
  if (isMockMode) return mockService.getPendingUsers();
  const items = validateList((await axiosClient.get('/admin/users/pending')).data, 'pending users');
  for (const item of items) {
    const invalidField = ['full_name', 'email', 'requested_role', 'created_at', 'approval_status'].some(field => item[field] != null && typeof item[field] !== 'string');
    const invalidId = item.id != null && (typeof item.id !== 'string' && (typeof item.id !== 'number' || !Number.isFinite(item.id)));
    if (invalidField || invalidId) throw new ApiContractError('The server returned an invalid pending user record. Supplied account fields must be text and identifiers must be strings or numbers.');
  }
  return items;
}
export async function approveUser(id) { if(isMockMode) return mockService.approveUser(id); return (await axiosClient.patch(`/admin/users/${resourceId(id)}/approve`)).data; }
export async function rejectUser(id) { if(isMockMode) return mockService.rejectUser(id); return (await axiosClient.patch(`/admin/users/${resourceId(id)}/reject`)).data; }
export default { getPendingUsers, approveUser, rejectUser };
