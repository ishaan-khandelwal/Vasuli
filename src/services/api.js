import { Platform } from 'react-native';

const fallbackApiUrl = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  default: 'http://localhost:5000/api',
});

export const API_URL = `${process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl}`.replace(/\/+$/, '');

const parseResponse = async (response) => {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('The backend returned an invalid response.');
  }
};

const request = async (path, { method = 'GET', body, token } = {}) => {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || 'Request failed.');
    }

    return data;
  } catch (error) {
    if (error.message === 'Network request failed') {
      throw new Error('Cannot connect to the backend. Please ensure your server is running and your device is on the same network.');
    }
    throw error;
  }
};

export const registerUser = (payload) =>
  request('/auth/register', {
    method: 'POST',
    body: payload,
  });

export const loginUser = (payload) =>
  request('/auth/login', {
    method: 'POST',
    body: payload,
  });

export const fetchAppData = (token) =>
  request('/app-data/me', {
    token,
  });

export const syncGroups = (token, groups) =>
  request('/app-data/groups', {
    method: 'PUT',
    token,
    body: { groups },
  });

export const syncPersonalLoans = (token, personalLoans) =>
  request('/app-data/personal-loans', {
    method: 'PUT',
    token,
    body: { personalLoans },
  });

export const syncProfile = (token, profile) =>
  request('/app-data/profile', {
    method: 'PUT',
    token,
    body: { profile },
  });

export const resetRemoteAppData = (token) =>
  request('/app-data/reset', {
    method: 'POST',
    token,
  });
