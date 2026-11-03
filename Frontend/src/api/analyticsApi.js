
import axiosClient from './axiosClient';
import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export const capabilities = Object.freeze({
  overview: isMockMode,
  reports: true,
  export: isMockMode,
});

export async function getOverview(filters) {
  if (isMockMode) {
    return mockService.getOverview(filters);
  }

  throw new CapabilityUnavailableError('Overview analytics');
}

export async function getReports(filters = {}) {
  if (isMockMode) {
    return mockService.getReports(filters);
  }

  const response = await axiosClient.get('/admin/reports', {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
    },
  });

  return response.data;
}

export async function exportReport(filters) {
  if (isMockMode) {
    return getReports(filters);
  }

  throw new CapabilityUnavailableError(
    'PDF and Excel exports are not available yet'
  );
}

export default {
  capabilities,
  getOverview,
  getReports,
  exportReport,
};
