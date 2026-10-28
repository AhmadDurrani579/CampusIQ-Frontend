
import axiosClient from './axiosClient';
import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

// ========================================
// 1. Get all administrator queries
// ========================================
export async function getQueries(params = {}) {
  if (isMockMode) {
    return mockService.getQueries(params);
  }

  const response = await axiosClient.get('/admin/queries', {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20
    }
  });

  return response.data;
}

// ========================================
// 2. Get logged-in student's queries
// ========================================
export async function getMyQueries(params = {}) {
  if (isMockMode) {
    return mockService.getQueries(params);
  }

  // Verify this endpoint in Swagger separately.
  const response = await axiosClient.get('/queries/my', {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20
    }
  });

  return response.data;
}

// ========================================
// 3. Get single query by ID - REAL API
// ========================================
export async function getQuery(queryId) {
  if (isMockMode) {
    return mockService.getQuery(queryId);
  }

  if (
    queryId === undefined ||
    queryId === null ||
    String(queryId).trim() === ''
  ) {
    throw new Error('Query ID is required');
  }

  const response = await axiosClient.get(
    `/queries/${encodeURIComponent(queryId)}`
  );

  return response.data;
}

// ========================================
// 4. Create a new student query
// ========================================
export async function createQuery(data) {
  if (isMockMode) {
    return mockService.createQuery(data);
  }

  const response = await axiosClient.post('/queries', {
    message: data.message
  });

  return response.data;
}

// ========================================
// 5. Other operations (mock mode only)
// ========================================
const operation = name => async (...args) => {
  if (isMockMode) {
    return mockService[name](...args);
  }

  throw new CapabilityUnavailableError(
    'Query management'
  );
};

export const updateQuery = operation('updateQuery');
export const generateDraft = operation('generateDraft');
export const getDrafts = operation('getDrafts');
export const saveDraft = operation('saveDraft');
export const sendReply = operation('sendReply');
export const escalateQuery = operation('escalateQuery');
export const reassignQuery = operation('reassignQuery');

// ========================================
// 6. Frontend capabilities
// ========================================
export const capabilities = Object.freeze({
  list: true,
  myQueries: true,
  detail: true,
  create: true,
  update: isMockMode,
  drafts: isMockMode,
  escalate: isMockMode,
  reply: isMockMode,
  reassign: isMockMode
});

// ========================================
// 7. Default export
// ========================================
export default {
  capabilities,
  getQueries,
  getMyQueries,
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
