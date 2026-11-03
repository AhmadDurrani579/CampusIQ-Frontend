import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export const capabilities=Object.freeze({list:isMockMode});
export async function getAuditLogs(...args){if(isMockMode)return mockService.getAuditLogs(...args);throw new CapabilityUnavailableError('Audit logs');}
export default {capabilities,getAuditLogs};

