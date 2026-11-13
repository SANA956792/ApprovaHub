// Centralized Auth Token & API Client (in-memory + persistent browser storage)
const AUTH_TOKEN_STORAGE_KEY = 'approval_jwt_token';
let memoryAuthToken: string | null = null;

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const claims = JSON.parse(decoded) as { exp?: unknown };
    return typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now();
  } catch {
    // Let the API validate tokens that are not JWTs (or cannot be decoded here).
    return false;
  }
}

function removeStoredAuthToken() {
  memoryAuthToken = null;
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions in strict sandboxed frames.
  }
  try {
    // Remove tokens written by older versions, which used sessionStorage.
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions in strict sandboxed frames.
  }
}

export function setAuthToken(token: string | null) {
  if (!token || isTokenExpired(token)) {
    removeStoredAuthToken();
    return;
  }

  memoryAuthToken = token;
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    try {
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage restrictions in strict sandboxed frames.
    }
  } catch {
    // Fall back to the old session-only storage if persistent storage is unavailable.
    try {
      sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      // Keep the token in memory for this page session.
    }
  }
}

export function getAuthToken(): string | null {
  let savedToken = memoryAuthToken;
  if (!savedToken) {
    try {
      savedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore and try the legacy session storage below.
    }
  }
  if (!savedToken) {
    try {
      savedToken = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (savedToken) {
        // Migrate existing sessions to persistent storage where available.
        try {
          localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, savedToken);
          sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        } catch {
          // Continue using the session token when persistent storage is unavailable.
        }
      }
    } catch {
      // Ignore storage restrictions.
    }
  }

  if (!savedToken) return null;
  if (isTokenExpired(savedToken)) {
    removeStoredAuthToken();
    return null;
  }

  memoryAuthToken = savedToken;
  return savedToken;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('approval:auth-expired'));
    }
    const error = new Error(data.error || 'Session expired. Please sign in again.') as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToWebPush(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      success: false,
      message: 'Web Push notifications are not supported by this browser.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      message: 'Notification permission was not granted.',
    };
  }

  const { publicKey } = await apiRequest<{ publicKey: string }>(
    '/api/push/vapid-public-key'
  );

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const subJson = subscription.toJSON();
  await apiRequest('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    }),
  });

  return {
    success: true,
    message: 'Device successfully subscribed to APPROVAL Web Push notifications.',
  };
}
