
import axiosClient from './axiosClient';
import { validateList, resourceId } from './contracts';
import { ApiContractError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

// ========================================
// 1. Get all pending users
// GET /api/v1/admin/users/pending
// ========================================
export async function getPendingUsers() {
  if (isMockMode) {
    return mockService.getPendingUsers();
  }

  const response = await axiosClient.get(
    '/admin/users/pending'
  );

  const items = validateList(
    response.data,
    'pending users'
  );

  for (const item of items) {
    const invalidField = [
      'full_name',
      'email',
      'requested_role',
      'created_at',
      'approval_status'
    ].some(
      field =>
        item[field] != null &&
        typeof item[field] !== 'string'
    );

    const invalidId =
      item.id != null &&
      (
        typeof item.id !== 'string' &&
        (
          typeof item.id !== 'number' ||
          !Number.isFinite(item.id)
        )
      );

    if (invalidField || invalidId) {
      throw new ApiContractError(
        'The server returned an invalid pending user record. Supplied account fields must be text and identifiers must be strings or numbers.'
      );
    }
  }

  return items;
}

// ========================================
// 2. Approve pending user - REAL API
// PATCH /api/v1/admin/users/{user_id}/approve
// ========================================
export async function approveUser(id) {
  if (isMockMode) {
    return mockService.approveUser(id);
}

  const userId = resourceId(id);

  const response = await axiosClient.patch(
    `/admin/users/${userId}/approve`
  );

  return response.data;
}

// ========================================
// 3. Reject pending user
// PATCH /api/v1/admin/users/{user_id}/reject
// Verify this endpoint in Swagger
// ========================================
export async function rejectUser(id) {
  if (isMockMode) {
    return mockService.rejectUser(id);
  }

  const userId = resourceId(id);

  const response = await axiosClient.patch(
    `/admin/users/${userId}/reject`
  );

  return response.data;
}

// ========================================
// 4. Default export
// ========================================
export default {
  getPendingUsers,
  approveUser,
  rejectUser
};
