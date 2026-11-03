import axiosClient from './axiosClient';

export async function getAuditLogs(params = {}) {
  const { data } = await axiosClient.get('/admin/audit-logs', {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      ...(params.action ? { action: params.action } : {}),
      ...(params.actor_id ? { actor_id: params.actor_id } : {}),
      ...(params.entity_type ? { entity_type: params.entity_type } : {}),
    },
  });

  return data;
}

export default { getAuditLogs };