
import { ApiContractError } from '../utils/apiErrors.js';
import { ROLES } from '../utils/roles.js';

// ========================================
// 1. Validate authenticated user profile
// ========================================
export function validateProfile(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new ApiContractError(
      'The server returned an invalid account profile.'
    );
  }

  // Normalize backend role value
  const role =
    typeof data.role === 'string'
      ? data.role.trim().toUpperCase()
      : '';

  // Validate against all supported CampusIQ roles
  if (!ROLES.includes(role)) {
    throw new ApiContractError(
      'The server returned an unsupported account role. Contact your administrator.'
    );
  }

  if (
    typeof data.full_name !== 'string' ||
    typeof data.email !== 'string'
  ) {
    throw new ApiContractError(
      'The server profile is missing a valid name or email address.'
    );
  }

  return {
    ...data,
    role
  };
}

// ========================================
// 2. Validate lists
// ========================================
export function validateList(data, label) {
  const items = Array.isArray(data)
    ? data
    : data?.items;

  if (
    !Array.isArray(items) ||
    items.some(
      item =>
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item)
    )
  ) {
    throw new ApiContractError(
      `The server returned an unexpected ${label} list. Expected an array or an items collection.`
    );
  }

  return items;
}

// ========================================
// 3. Validate departments
// ========================================
export function validateDepartment(data) {
  const keywords =
    typeof data?.keywords === 'string'
      ? data.keywords
          .split(',')
          .map(keyword => keyword.trim())
          .filter(Boolean)
      : data?.keywords;

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    data.id == null ||
    typeof data.name !== 'string' ||
    typeof data.code !== 'string' ||
    typeof data.is_active !== 'boolean' ||
    !Array.isArray(keywords) ||
    keywords.some(
      keyword => typeof keyword !== 'string'
    ) ||
    (
      data.description != null &&
      typeof data.description !== 'string'
    )
  ) {
    throw new ApiContractError(
      'The server returned an invalid department. Expected id, name, code, description, is_active and text or list keywords.'
    );
  }

  return {
    ...data,
    keywords
  };
}

// ========================================
// 4. Resource ID
// ========================================
export function resourceId(id) {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ''
  ) {
    throw new ApiContractError(
      'This record is missing its server identifier.'
    );
  }

  return encodeURIComponent(String(id));
}
