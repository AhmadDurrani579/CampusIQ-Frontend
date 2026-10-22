
import axiosClient from './axiosClient';
import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

// Get all queries for an administrator
export async function getQueries(params = {}) {
  if (isMockMode) {
    return mockService.getQueries(params);
  }

  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 20;

  const response = await axiosClient.get('/admin/queries', {
    params: {
      page: page,
      page_size: pageSize
    }
  });

  return response.data;
}

// Other query operations remain unavailable in API mode
// until their real backend endpoints are integrated.
const operation = name => async (...args) => {
  if (isMockMode) {
    return mockService[name](...args);
  }

  throw new CapabilityUnavailableError('Query management');
};

export const capabilities = Object.freeze({
  list: true,
  detail: isMockMode,
  create: isMockMode,
  update: isMockMode,
  drafts: isMockMode,
  escalate: isMockMode,
  reply: isMockMode,
  reassign: isMockMode
});

export const getQuery = operation('getQuery');
export const createQuery = operation('createQuery');
export const updateQuery = operation('updateQuery');
export const generateDraft = operation('generateDraft');
export const getDrafts = operation('getDrafts');
export const saveDraft = operation('saveDraft');
export const sendReply = operation('sendReply');
export const escalateQuery = operation('escalateQuery');
export const reassignQuery = operation('reassignQuery');

export default {
  capabilities,
  getQueries,
  getQuery,
  createQuery,
  updateQuery,
  generateDraft,
  getDrafts,
  saveDraft,
  sendReply,
  escalateQuery,
  reassignQuery
};
