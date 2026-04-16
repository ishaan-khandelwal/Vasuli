import { Platform } from 'react-native';
import Constants from 'expo-constants';

const fallbackApiUrl = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  default: 'http://localhost:5000/api',
});

const configuredApiUrl = `${process.env.EXPO_PUBLIC_API_URL || ''}`.replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15000;
let lastWorkingApiUrl = configuredApiUrl || fallbackApiUrl;

const normalizeApiUrl = (value) => `${value || ''}`.trim().replace(/\/+$/, '');

const extractHostname = (value) => {
  const normalized = `${value || ''}`.trim();

  if (!normalized) {
    return '';
  }

  const withoutProtocol = normalized.replace(/^[a-z]+:\/\//i, '');
  const [host] = withoutProtocol.split(/[/:?]/);
  return host || '';
};

const getExpoHostBasedApiUrls = () => {
  if (Platform.OS === 'web') {
    return [];
  }

  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.linkingUri,
  ]
    .map(extractHostname)
    .filter((host) => host && host !== 'localhost' && host !== '127.0.0.1');

  return [...new Set(hostCandidates)].map((host) => `http://${host}:5000/api`);
};

const getCandidateApiUrls = () => {
  const candidates = [];
  const webHostname =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : '';

  [configuredApiUrl].forEach((value) => {
    const normalized = normalizeApiUrl(value);
    if (normalized) candidates.push(normalized);
  });

  if (
    !configuredApiUrl &&
    Platform.OS === 'web' &&
    webHostname &&
    webHostname !== 'localhost' &&
    webHostname !== '127.0.0.1'
  ) {
    candidates.push(`http://${webHostname}:5000/api`);
  }

  candidates.push(...getExpoHostBasedApiUrls());
  candidates.push(fallbackApiUrl);

  return [...new Set(candidates.filter(Boolean))];
};

export const API_URL = normalizeApiUrl(lastWorkingApiUrl);

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

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const isRetryableNetworkError = (error) =>
  ['Network request failed', 'Failed to fetch', 'Request timed out.'].includes(error?.message);

const request = async (path, { method = 'GET', body, token } = {}) => {
  const candidates = [lastWorkingApiUrl, ...getCandidateApiUrls()].filter(Boolean);

  for (const baseUrl of [...new Set(candidates)]) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`, {
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

      lastWorkingApiUrl = baseUrl;
      return data;
    } catch (error) {
      if (isRetryableNetworkError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Cannot connect to the backend. Tried ${[...new Set(candidates)].join(', ')}. If you are using the deployed app, check that the hosted backend is awake and reachable. If you are testing locally, start the backend and make sure the app can reach port 5000 on the same machine.`
  );
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
