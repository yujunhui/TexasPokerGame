/**
 * Web Notification utility for browser notifications
 */

const NOTIFICATION_ENABLED_KEY = 'notificationEnabled';

/**
 * Check if Web Notification API is supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Check if notification permission is granted
 */
export function isNotificationGranted(): boolean {
  return isNotificationSupported() && window.Notification.permission === 'granted';
}

/**
 * Check if notification is enabled by user setting
 * Default is false - user must explicitly enable it
 */
export function isNotificationEnabled(): boolean {
  const setting = localStorage.getItem(NOTIFICATION_ENABLED_KEY);
  return setting === 'true';
}

/**
 * Set notification enabled/disabled by user
 */
export function setNotificationEnabled(enabled: boolean): void {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, String(enabled));
}

/**
 * Request notification permission from user
 * @returns Promise that resolves to true if permission is granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.log('Notification API is not supported');
    return false;
  }

  if (window.Notification.permission === 'granted') {
    return true;
  }

  if (window.Notification.permission === 'denied') {
    console.log('Notification permission was denied');
    return false;
  }

  try {
    const permission = await window.Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Show a notification
 * @param title - Notification title
 * @param options - Notification options (body, icon, etc.)
 * @returns The Notification instance or null if not supported/not permitted
 */
export function showNotification(title: string, options: NotificationOptions = {}): Notification | null {
  if (!isNotificationSupported()) {
    return null;
  }

  if (!isNotificationGranted()) {
    return null;
  }

  if (!isNotificationEnabled()) {
    return null;
  }

  try {
    const notification = new window.Notification(title, {
      icon: '/icon.png',
      badge: '/icon.png',
      requireInteraction: false,
      ...options,
    });

    // Auto close after 3 seconds
    setTimeout(() => {
      notification.close();
    }, 1000 * 3);

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Show a notification for player's turn
 * @param nickName - Player's nickname
 * @param pot - Current pot size
 */
export function showTurnNotification(nickName: string, pot?: number): Notification | null {
  const body = pot !== undefined ? `Pot: ${pot}` : 'It\'s your turn to act!';
  return showNotification(`${nickName}, 到你啦!`, {
    body,
    tag: 'poker-turn',
    renotify: true,
  });
}

/**
 * Show a notification for game events
 * @param title - Notification title
 * @param body - Notification body
 */
export function showGameNotification(title: string, body: string): Notification | null {
  return showNotification(title, {
    body,
    tag: 'poker-game',
  });
}
