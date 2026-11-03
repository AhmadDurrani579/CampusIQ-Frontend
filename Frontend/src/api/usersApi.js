
import axiosClient from './axiosClient';
import { validateProfile } from './contracts';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
import { CapabilityUnavailableError } from '../utils/apiErrors';

// ========================================
// 1. Get current logged-in user
// GET /api/v1/users/me
// ========================================
export async function getMe() {
  if (isMockMode) {
    return mockService.getMe();
  }

  const { data } = await axiosClient.get('/users/me');

  return validateProfile(data);
}

// ========================================
// 2. Update current user's profile
// PATCH /api/v1/users/me
// ========================================
export async function updateMe({ full_name }) {
  if (isMockMode) {
    return mockService.updateMe({ full_name });
  }

  const { data } = await axiosClient.patch(
    '/users/me',
    { full_name }
  );

  return validateProfile(data);
}

// ========================================
// 3. Get all registered users
// GET /api/v1/admin/users
// ========================================

export async function getAllUsers(params = {}) {
  if (isMockMode) {
    return mockService.getUsers(params);
  }

  const response = await axiosClient.get('/admin/users', {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      ...(params.search ? { search: params.search } : {}),
      ...(params.role ? { role: params.role } : {}),
      ...(params.approval_status
        ? { approval_status: params.approval_status }
        : {}),
    },
  });

  return response.data;
}

// ========================================
// 4. Backward-compatible user list
// ========================================
export const getUsers = getAllUsers;

// ========================================
// 5. Update another user
// Not integrated in real API mode
// ========================================
export async function updateUser(...args) {
  if (isMockMode) {
    return mockService.updateUser(...args);
  }

  throw new CapabilityUnavailableError(
    'User management'
  );
}

// ========================================
// 6. Capabilities
// ========================================
export const capabilities = Object.freeze({
  list: true,
  update: isMockMode
});

// ========================================
// 7. Default export
// ========================================
export default {
  getMe,
  updateMe,
  getProfile: getMe,
  updateProfile: updateMe,
  getAllUsers,
  getUsers,
  updateUser,
  capabilities
};
