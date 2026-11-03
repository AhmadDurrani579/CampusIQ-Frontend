
import axiosClient from './axiosClient';
import { ApiContractError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
import { PUBLIC_SIGNUP_ROLES } from '../utils/roles';

// ========================================
// 1. Normal Email / Password Login
// ========================================
export async function login({ email, password }) {
  if (isMockMode) {
    return mockService.login({ email, password });
  }

  const { data } = await axiosClient.post(
    '/auth/login',
    { email, password },
    { auth: false }
  );

  return validateLoginToken(data);
}

// ========================================
// 2. Google Login - REAL API
// POST /api/v1/auth/google
// ========================================
export async function googleLogin(idToken) {
  if (isMockMode) {
    throw new ApiContractError(
      'Google Sign-In is unavailable in mock mode.'
    );
  }

  if (
    typeof idToken !== 'string' ||
    !idToken.trim()
  ) {
    throw new ApiContractError(
      'A valid Google ID token is required.'
    );
  }

  const { data } = await axiosClient.post(
    '/auth/google',
    {
      id_token: idToken
    },
    {
      auth: false
    }
  );

  return validateLoginToken(data);
}

// ========================================
// 3. Validate Backend Login Response
// ========================================
function validateLoginToken(data) {
  if (
    !data ||
    typeof data.access_token !== 'string' ||
    !data.access_token.trim()
  ) {
    throw new ApiContractError(
      'The server did not return a valid access token.'
    );
  }

  if (
    data.token_type &&
    String(data.token_type).toLowerCase() !== 'bearer'
  ) {
    throw new ApiContractError(
      'The server returned an unsupported token type.'
    );
  }

  // Do not expose or log the access token.
  return {
    access_token: data.access_token
  };
}

// ========================================
// 4. Signup
// ========================================
export async function signup({
  full_name,
  email,
  password,
  requested_role
}) {
  if (isMockMode) {
    return mockService.signup({
      full_name,
      email,
      password,
      requested_role
    });
  }

  if (!PUBLIC_SIGNUP_ROLES.includes(requested_role)) {
    throw new ApiContractError(
      'Choose a supported registration role.'
    );
  }

  const { data } = await axiosClient.post(
    '/auth/signup',
    {
      full_name,
      email,
      password,
      requested_role
    },
    {
      auth: false
    }
  );

  return data;
}

// ========================================
// 5. Logout
// ========================================
export async function logout() {
  if (isMockMode) {
    return mockService.logout();
  }

  const response = await axiosClient.post('/auth/logout');

  if (response.status !== 204) {
    throw new ApiContractError(
      'The server did not confirm sign out. Your session has been retained.'
    );
  }
}

// ========================================
// 6. Default Export
// ========================================
export default {
  login,
  googleLogin,
  signup,
  logout
};
