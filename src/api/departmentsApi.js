import axiosClient from './axiosClient';
import { validateDepartment, validateList, resourceId } from './contracts';
import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
export const capabilities = Object.freeze({ list: true, detail: true, create: isMockMode || import.meta.env.VITE_ENABLE_DEPARTMENT_CREATE === 'true', update: isMockMode, delete: isMockMode, deactivate:isMockMode });
export async function getDepartments() { if(isMockMode)return mockService.getDepartments(); return validateList((await axiosClient.get('/departments')).data, 'departments').map(validateDepartment); }
export async function getDepartment(id) { if(isMockMode)return mockService.getDepartment(id); return validateDepartment((await axiosClient.get(`/departments/${resourceId(id)}`)).data); }
export async function createDepartment({ name, code, description, keywords }) {
  if(isMockMode)return mockService.createDepartment({name,code,description,keywords});
  if (!capabilities.create) throw new CapabilityUnavailableError('Department creation');
  return validateDepartment((await axiosClient.post('/departments', { name, code, description, keywords })).data);
}
export async function updateDepartment(id,body) { if(isMockMode)return mockService.updateDepartment(id,body);throw new CapabilityUnavailableError('Department updates'); }
export async function deactivateDepartment(id) { if(isMockMode)return mockService.deactivateDepartment(id);throw new CapabilityUnavailableError('Department deactivation'); }
export default { getDepartments, getDepartment, createDepartment, updateDepartment, deactivateDepartment, capabilities, canCreate: capabilities.create };
