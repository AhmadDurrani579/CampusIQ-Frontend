import axiosClient from './axiosClient';
import { validateProfile } from './contracts';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
import { CapabilityUnavailableError } from '../utils/apiErrors';

export async function getMe() {
  if (isMockMode) {
    return mockService.getMe();
  }

  const { data } = await axiosClient.get('/users/me');
  return validateProfile(data);
}

export async function updateMe({ full_name }) {
  if (isMockMode) {
    return mockService.updateMe({ full_name });
  }

  const { data } = await axiosClient.patch('/users/me', { full_name });
  return validateProfile(data);
}

export async function getUsers() { if(isMockMode)return mockService.getUsers();throw new CapabilityUnavailableError('User management'); }
export async function updateUser(id, body) { if(isMockMode)return mockService.updateUser(id,body);throw new CapabilityUnavailableError('User management'); }

export const capabilities=Object.freeze({list:isMockMode,update:isMockMode});

export default { getMe, updateMe, getProfile: getMe, updateProfile: updateMe, getUsers, updateUser, capabilities };
