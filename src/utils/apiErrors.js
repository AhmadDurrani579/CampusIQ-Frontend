export class ApiContractError extends Error {
  constructor(message) { super(message); this.name = 'ApiContractError'; }
}

export class CapabilityUnavailableError extends Error {
  constructor(feature) {
    super(`${feature} is not available yet. This feature needs a confirmed backend integration.`);
    this.name = 'CapabilityUnavailableError';
    this.code = 'CAPABILITY_UNAVAILABLE';
  }
}

function detailMessage(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(entry => {
    if (typeof entry === 'string') return entry;
    const field = Array.isArray(entry?.loc) ? entry.loc.filter(part => !['body', 'query', 'path'].includes(part)).join('.') : '';
    return typeof entry?.msg === 'string' ? `${field ? `${field}: ` : ''}${entry.msg}` : '';
  }).filter(Boolean).join(' · ');
  if (detail && typeof detail === 'object') return detailMessage(detail.message || detail.msg || detail.detail);
  return '';
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const status = error?.response?.status;
  const fromServer = detailMessage(error?.response?.data?.detail) || detailMessage(error?.response?.data?.message);
  if (fromServer) return fromServer;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (error?.name === 'ApiContractError' || error?.name === 'CapabilityUnavailableError') return error.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (error?.code === 'ERR_NETWORK' || (error?.isAxiosError && !error.response)) return 'Unable to connect to the university server. Check your connection and try again.';
  return error instanceof Error && !error?.isAxiosError ? error.message : fallback;
}

export default getApiErrorMessage;
