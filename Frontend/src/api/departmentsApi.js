
import axiosClient from './axiosClient';
import {
  validateDepartment,
  validateList,
  resourceId
} from './contracts';
import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export const capabilities = Object.freeze({
  list: true,
  detail: true,
  create:
    isMockMode ||
    import.meta.env.VITE_ENABLE_DEPARTMENT_CREATE === 'true',
  update: isMockMode,
  delete: isMockMode,
  deactivate: isMockMode
});

// Existing department listing.
export async function getDepartments() {
  if (isMockMode) {
    return mockService.getDepartments();
  }

  const { data } = await axiosClient.get('/departments');

  return validateList(data, 'departments')
    .map(validateDepartment);
}

// NEW: Public department listing for Signup.
// No JWT token is required.
export async function getSignupDepartments() {
  if (isMockMode) {
    const departments = await mockService.getDepartments();

    return departments.filter(
      department => department.is_active
    );
  }

  const { data } = await axiosClient.get(
    '/departments',
    { auth: false }
  );

  return validateList(data, 'departments')
    .map(validateDepartment)
    .filter(department => department.is_active);
}

// Existing department details.
export async function getDepartment(id) {
  if (isMockMode) {
    return mockService.getDepartment(id);
  }

  const { data } = await axiosClient.get(
    `/departments/${resourceId(id)}`
  );

  return validateDepartment(data);
}

// Existing department creation.
export async function createDepartment({
  name,
  code,
  description,
  keywords
}) {
  if (isMockMode) {
    return mockService.createDepartment({
      name,
      code,
      description,
      keywords
    });
  }

  if (!capabilities.create) {
    throw new CapabilityUnavailableError(
      'Department creation'
    );
  }

  const { data } = await axiosClient.post(
    '/departments',
    { name, code, description, keywords }
  );

  return validateDepartment(data);
}

// Existing department updates.
export async function updateDepartment(id, body) {
  if (isMockMode) {
    return mockService.updateDepartment(id, body);
  }

  throw new CapabilityUnavailableError(
    'Department updates'
  );
}

// Existing department deactivation.
export async function deactivateDepartment(id) {
  if (isMockMode) {
    return mockService.deactivateDepartment(id);
  }

  throw new CapabilityUnavailableError(
    'Department deactivation'
  );
}

export default {
  getDepartments,
  getSignupDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  capabilities,
  canCreate: capabilities.create
};
