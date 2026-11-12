// Centralized Auth Token & API Client (in-memory + session persistence)
let memoryAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryAuthToken = token;
  try {
    if (token) {
      sessionStorage.setItem('approval_jwt_token', token);
    } else {
      sessionStorage.removeItem('approval_jwt_token');
    }
  } catch {
    // Ignore storage restriction in strict sandboxed frames
  }
}

export function getAuthToken(): string | null {
  if (memoryAuthToken) return memoryAuthToken;
  try {
    const saved = sessionStorage.getItem('approval_jwt_token');
    if (saved) {
      memoryAuthToken = saved;
      return saved;
    }
  } catch {
    // Ignore
  }
  return null;
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
    throw new Error(data.error || 'Session expired. Please sign in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
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
