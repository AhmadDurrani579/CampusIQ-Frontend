import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
const operation=name=>async(...args)=>{if(isMockMode)return mockService[name](...args);throw new CapabilityUnavailableError('Notifications');};
export const capabilities=Object.freeze({list:isMockMode,markRead:isMockMode,markAllRead:isMockMode});
export const getNotifications=operation('getNotifications');
export const markRead=operation('markRead');
export const markAllRead=operation('markAllRead');
export default {capabilities,getNotifications,markRead,markAllRead};
