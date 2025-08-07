'use client';

import { useNotifications } from '@/hooks/use-push-notification';

export default function NotificationManager() {
  const {
    permission,
    subscription,
    isLoading,
    requestPermission,
    sendTestNotification,
  } = useNotifications();

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Push Notifications</h2>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Permission:</span>
          <span
            className={`font-semibold ${
              permission === 'granted'
                ? 'text-green-600'
                : permission === 'denied'
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}
          >
            {permission}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Subscribed:</span>
          <span
            className={`font-semibold ${
              subscription ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {subscription ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {permission !== 'granted' && (
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Enable Notifications'}
          </button>
        )}

        {permission === 'granted' && subscription && (
          <button
            onClick={sendTestNotification}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Send Test Notification
          </button>
        )}

        {permission === 'denied' && (
          <div className="text-red-600 text-sm text-center">
            Notifications are blocked. Please enable them in your browser
            settings.
          </div>
        )}
      </div>
    </div>
  );
}
