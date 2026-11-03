import axiosClient from './axiosClient';
import { CapabilityUnavailableError } from '../utils/apiErrors';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export async function getQueries(params = {}) {
  if (isMockMode) return mockService.getQueries(params);
  const { data } = await axiosClient.get('/admin/queries', { params: { page: params.page ?? 1, page_size: params.page_size ?? 20 } });
  return data;
}

export async function getMyQueries(params = {}) {
  if (isMockMode) return mockService.getQueries(params);
  const { data } = await axiosClient.get('/queries/my', { params: { page: params.page ?? 1, page_size: params.page_size ?? 20 } });
  return data;
}

export async function getQuery(queryId) {
  if (isMockMode) return mockService.getQuery(queryId);
  if (queryId === undefined || queryId === null || String(queryId).trim() === '') throw new Error('Query ID is required');
  const { data } = await axiosClient.get(`/queries/${encodeURIComponent(queryId)}`);
  return data;
}

export async function createQuery(body) {
  if (isMockMode) return mockService.createQuery(body);
  const { data } = await axiosClient.post('/queries', { message: body.message });
  return data;
}

export async function generateReplyDraft(queryId) {
  const response = await axiosClient.post(
    `/queries/${encodeURIComponent(queryId)}/generate-draft`
  );

  return response.data;
}

export async function getQueryMessages(queryId) {
  if (isMockMode) return [];
  const { data } = await axiosClient.get(`/queries/${encodeURIComponent(queryId)}/messages`);
  return data;
}

export async function sendReply(queryId, message) {
  if (isMockMode) return mockService.sendReply(queryId, message);
  const { data } = await axiosClient.post(`/queries/${encodeURIComponent(queryId)}/reply`, { message });
  return data;
}

export async function updateQueryStatus(queryId, status) {
  if (isMockMode) return mockService.updateQuery(queryId, { status });
  const { data } = await axiosClient.patch(`/queries/${encodeURIComponent(queryId)}/status`, { status });
  return data;
}

const operation = name => async (...args) => {
  if (isMockMode) return mockService[name](...args);
  throw new CapabilityUnavailableError('Query management');
};

export const updateQuery = operation('updateQuery');
export const generateDraft = operation('generateDraft');
export const getDrafts = operation('getDrafts');
export const saveDraft = operation('saveDraft');
export const escalateQuery = operation('escalateQuery');
export const reassignQuery = operation('reassignQuery');

export const capabilities = Object.freeze({
  list: true, myQueries: true, detail: true, create: true,
  update: !isMockMode, drafts: isMockMode, escalate: isMockMode,
  reply: true, reassign: isMockMode,
});

export default {
  capabilities, getQueries, getMyQueries, getQuery, createQuery,
  getQueryMessages, sendReply, updateQueryStatus, updateQuery,
  generateDraft, getDrafts, saveDraft, escalateQuery, reassignQuery,
};