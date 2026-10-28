import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export const capabilities=Object.freeze({get:isMockMode,save:isMockMode});
export async function getLeave(...args){if(isMockMode)return mockService.getLeave(...args);throw new CapabilityUnavailableError('Leave settings');}
export async function saveLeave(...args){if(isMockMode)return mockService.saveLeave(...args);throw new CapabilityUnavailableError('Leave settings');}
export default {capabilities,getLeave,saveLeave};

