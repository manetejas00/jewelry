export const webPush = {
  enabled: false,
  reason: 'Order updates stay on the order page and in the customer account. Web Push is not enabled.'
};

export function pushSupported() {
  return webPush.enabled && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function subscribeToPush() {
  throw new Error('Push notifications are not enabled.');
}
