
import axiosClient from './axiosClient';
import { ApiContractError } from '../utils/apiErrors';

export async function classifyQuery(query) {
  if (typeof query !== 'string' || !query.trim()) {
    throw new ApiContractError(
      'Please enter a student question.'
    );
  }

  const { data } = await axiosClient.post(
    '/ai/classify',
    {
      query: query.trim()
    }
  );

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiContractError(
      'The AI classification response is invalid.'
    );
  }

  return {
    subject: data.subject ?? '',
    department_id: data.department_id ?? null,
    department_name: data.department_name ?? '',
    intent: data.intent ?? '',
    priority: data.priority ?? '',
    reason: data.reason ?? '',
    needs_manual_review: data.needs_manual_review ?? false
  };
}

export default { classifyQuery };
