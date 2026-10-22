import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';
export const capabilities=Object.freeze({overview:isMockMode,reports:isMockMode,export:isMockMode});
export async function getOverview(filters) {if(isMockMode)return mockService.getOverview(filters);throw new CapabilityUnavailableError('Analytics and exports');}
export async function getReports(filters) {if(isMockMode)return mockService.getReports(filters);throw new CapabilityUnavailableError('Analytics and exports');}
export async function exportReport(filters) {return getReports(filters);}
export default {capabilities,getOverview,getReports,exportReport};
