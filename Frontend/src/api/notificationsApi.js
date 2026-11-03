
import axiosClient from './axiosClient';

// GET /api/v1/notifications
export async function getNotifications(params = {}) {
  const { data } = await axiosClient.get('/notifications', {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      unread_only: params.unread_only ?? false,
    },
  });

  return data;
}

// GET /api/v1/notifications/unread-count
export async function getUnreadCount() {
  const { data } = await axiosClient.get(
    '/notifications/unread-count'
  );

  return data;
}

// PATCH /api/v1/notifications/{id}/read
export async function markNotificationRead(id) {
  const { data } = await axiosClient.patch(
    `/notifications/${id}/read`
  );

  return data;
}

// PATCH /api/v1/notifications/read-all
export async function markAllNotificationsRead() {
  const { data } = await axiosClient.patch(
    '/notifications/read-all'
  );

  return data;
}

export default {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
