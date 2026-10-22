import axiosClient from './axiosClient';
import { ApiContractError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export async function login({ email, password }) {
  if (isMockMode) return mockService.login({ email, password });
  const { data } = await axiosClient.post('/auth/login', { email, password }, { auth: false });
  if (!data || typeof data.access_token !== 'string' || !data.access_token.trim()) throw new ApiContractError('The server did not return a valid access token.');
  if (data.token_type && String(data.token_type).toLowerCase() !== 'bearer') throw new ApiContractError('The server returned an unsupported token type.');
  // Refresh tokens are deliberately discarded: reload requires a new sign in.
  return { access_token: data.access_token };
}
export async function signup({ full_name, email, password, requested_role }) {
  if (isMockMode) return mockService.signup({ full_name, email, password, requested_role });
  if (!['STUDENT', 'INSTRUCTOR', 'HOD'].includes(requested_role)) throw new ApiContractError('Choose a student, instructor or HOD registration role.');
  const { data } = await axiosClient.post('/auth/signup', { full_name, email, password, requested_role }, { auth: false });
  return data;
}

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
export default { login, signup, logout };
