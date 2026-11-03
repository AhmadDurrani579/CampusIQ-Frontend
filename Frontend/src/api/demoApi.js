import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
export {demoAccounts,demoPassword} from '../mock/seed';
export const capabilities=Object.freeze({});
export async function getDemoInfo(...args){if(isMockMode)return mockService.getDemoInfo(...args);throw new CapabilityUnavailableError('Local demo');}
export async function resetDemo(...args){if(isMockMode)return mockService.resetDemo(...args);throw new CapabilityUnavailableError('Local demo');}
export async function advanceClock(...args){if(isMockMode)return mockService.advanceClock(...args);throw new CapabilityUnavailableError('Local demo');}
export default {capabilities,getDemoInfo,resetDemo,advanceClock};

