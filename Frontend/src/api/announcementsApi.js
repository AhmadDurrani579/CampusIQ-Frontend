import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export const capabilities=Object.freeze({list:isMockMode,publish:isMockMode});
export async function getAnnouncements(...args){if(isMockMode)return mockService.getAnnouncements(...args);throw new CapabilityUnavailableError('Announcements');}
export async function publishAnnouncement(...args){if(isMockMode)return mockService.publishAnnouncement(...args);throw new CapabilityUnavailableError('Announcements');}
export default {capabilities,getAnnouncements,publishAnnouncement};

