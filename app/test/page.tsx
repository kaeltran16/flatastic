'use client';
import { AlertCircle, Bell, CheckCircle, Send, Trash2, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

// Types
interface NotificationForm {
  title: string;
  body: string;
  url: string;
  icon: string;
}

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: string;
}

interface SubscriptionResponse {
  success: boolean;
  total?: number;
  error?: string;
  subscriptions?: number;
  endpoints?: string[];
}

interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface QuickNotificationPreset {
  title: string;
  body: string;
  url: string;
  icon: string;
}

interface QuickNotificationPresets {
  welcome: QuickNotificationPreset;
  reminder: QuickNotificationPreset;
  urgent: QuickNotificationPreset;
}

export default function PushNotificationTestUI() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [subscriptionCount, setSubscriptionCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Notification form state
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    title: 'Test Notification',
    body: 'This is a test push notification',
    url: '/',
    icon: '/web-app-manifest-192x192.png'
  });

  // Get VAPID public key from environment
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  // Convert VAPID key
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Add log entry
  const addLog = (message: string, type: LogEntry['type'] = 'info'): void => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), { message, type, timestamp }]);
  };

  // Check if push notifications are supported
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      addLog('Push notifications are supported!', 'success');
      checkSubscriptionStatus();
    } else {
      setIsSupported(false);
      addLog('Push notifications are not supported in this browser', 'error');
    }
  }, []);

  // Check current subscription status
  const checkSubscriptionStatus = async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      setIsSubscribed(!!sub);
      if (sub) {
        addLog('Already subscribed to push notifications', 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error checking subscription: ${errorMessage}`, 'error');
    }
  };

  // Use existing service worker (next-pwa with custom push handlers)
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    // Wait for the existing service worker to be ready
    // Your sw-custom.js handlers are already merged with the main service worker
    return await navigator.serviceWorker.ready;
  };

  // Subscribe to push notifications
  const subscribeToPush = async (): Promise<void> => {
    setLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        addLog('Notification permission denied', 'error');
        return;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      addLog('Service worker registered', 'success');

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // @ts-ignore
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      setSubscription(sub);
      setIsSubscribed(true);
      addLog('Successfully subscribed to push notifications!', 'success');

      // Send subscription to your API
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sub.toJSON()),
      });

      const result: SubscriptionResponse = await response.json();
      if (result.success) {
        addLog(`Subscription saved to server. Total: ${result.total}`, 'success');
        fetchSubscriptionCount();
      } else {
        addLog(`Failed to save subscription: ${result.error}`, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error subscribing: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async (): Promise<void> => {
    setLoading(true);
    try {
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setSubscription(null);
        setIsSubscribed(false);
        addLog('Successfully unsubscribed from push notifications', 'success');
        fetchSubscriptionCount();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error unsubscribing: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subscription count
  const fetchSubscriptionCount = async (): Promise<void> => {
    try {
      const response = await fetch('/api/push/subscribe');
      const result: SubscriptionResponse = await response.json();
      setSubscriptionCount(result.subscriptions || 0);
      setNotifications(result.endpoints || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error fetching subscriptions: ${errorMessage}`, 'error');
    }
  };

  // Send test notification
  const sendTestNotification = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationForm),
      });

      const result: NotificationResponse = await response.json();
      if (result.success) {
        addLog(`Notification sent successfully! ${result.message}`, 'success');
      } else {
        addLog(`Failed to send notification: ${result.error}`, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error sending notification: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick notification presets
  const sendQuickNotification = async (preset: keyof QuickNotificationPresets): Promise<void> => {
    const presets: QuickNotificationPresets = {
      welcome: {
        title: '🎉 Welcome!',
        body: 'Thanks for subscribing to our notifications!',
        url: '/',
        icon: '/web-app-manifest-192x192.png'
      },
      reminder: {
        title: '⏰ Reminder',
        body: 'Don\'t forget to check your dashboard',
        url: '/dashboard',
        icon: '/web-app-manifest-192x192.png'
      },
      urgent: {
        title: '🚨 Urgent Alert',
        body: 'This is an urgent notification that requires your attention',
        url: '/alerts',
        icon: '/web-app-manifest-192x192.png'
      }
    };

    setNotificationForm(presets[preset]);
    setTimeout(() => sendTestNotification(), 100);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Bell className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Push Notification Test Center
          </h1>
          <p className="text-gray-600">
            Test your push notification system with real browser subscriptions
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              {isSupported ? <CheckCircle className="h-8 w-8 mr-3" /> : <XCircle className="h-8 w-8 mr-3" />}
              <div>
                <p className="text-sm opacity-90">Browser Support</p>
                <p className="text-lg font-semibold">
                  {isSupported ? 'Supported' : 'Not Supported'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <Bell className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Subscription Status</p>
                <p className="text-lg font-semibold">
                  {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <Users className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Subscriptions</p>
                <p className="text-lg font-semibold">{subscriptionCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Controls */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Subscription Management
          </h2>
          
          <div className="flex flex-wrap gap-4">
            {!isSubscribed ? (
              <button
                onClick={subscribeToPush}
                disabled={!isSupported || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Subscribing...' : 'Subscribe to Notifications'}
              </button>
            ) : (
              <button
                onClick={unsubscribeFromPush}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Unsubscribing...' : 'Unsubscribe'}
              </button>
            )}
            
            <button
              onClick={fetchSubscriptionCount}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh Count
            </button>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Quick Tests
          </h2>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => sendQuickNotification('welcome')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🎉 Welcome
            </button>
            <button
              onClick={() => sendQuickNotification('reminder')}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ⏰ Reminder
            </button>
            <button
              onClick={() => sendQuickNotification('urgent')}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🚨 Urgent
            </button>
          </div>
        </div>

        {/* Custom Notification Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Custom Notification</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notification title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL (optional)
              </label>
              <input
                type="text"
                value={notificationForm.url}
                onChange={(e) => setNotificationForm({...notificationForm, url: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="/dashboard"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body
            </label>
            <textarea
              value={notificationForm.body}
              onChange={(e) => setNotificationForm({...notificationForm, body: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Notification message"
            />
          </div>
          
          <button
            onClick={sendTestNotification}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Sending...' : 'Send Custom Notification'}
          </button>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Activity Log
          </h2>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No activity yet...</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-sm flex items-start ${
                    log.type === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : log.type === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <span className="font-medium mr-2">{log.timestamp}</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
          
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="mt-4 text-sm text-gray-600 hover:text-gray-800 flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Log
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>First, subscribe to notifications by clicking "Subscribe to Notifications"</li>
            <li>Grant permission when your browser asks</li>
            <li>Use the quick test buttons or create a custom notification</li>
            <li>Check your browser for the notification popup</li>
            <li>Monitor the activity log for any errors or success messages</li>
          </ol>
        </div>
      </div>
    </div>
  );
}