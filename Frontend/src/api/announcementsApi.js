
import axiosClient from './axiosClient';
import { isMockMode } from './mode';
import { mockService } from '../mock/service';

export const capabilities = Object.freeze({
  list: true,
  publish: true,
});

export async function getAnnouncements() {
  if (isMockMode) {
    return mockService.getAnnouncements();
  }

  const { data } = await axiosClient.get('/announcements');
  return data;
}

export async function getAdminAnnouncements() {
  if (isMockMode) {
    return mockService.getAnnouncements();
  }

  const { data } = await axiosClient.get('/admin/announcements');
  return data;
}

export async function publishAnnouncement(payload) {
  if (isMockMode) {
    return mockService.publishAnnouncement(payload);
  }

  const { data } = await axiosClient.post(
    '/admin/announcements',
    payload
  );

  return data;
}

export async function updateAnnouncement(id, payload) {
  const { data } = await axiosClient.patch(
    `/admin/announcements/${id}`,
    payload
  );

  return data;
}

export async function deleteAnnouncement(id) {
  const { data } = await axiosClient.delete(
    `/admin/announcements/${id}`
  );

  return data;
}

export default {
  capabilities,
  getAnnouncements,
  getAdminAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
