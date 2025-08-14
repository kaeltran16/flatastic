// @ts-nocheck
'use client';

import * as Sentry from '@sentry/nextjs'; // Make sure to install and configure Sentry
import { useEffect, useState } from 'react';
import { PushSubscription } from 'web-push';
import { sendNotification, subscribeUser, unsubscribeUser } from './actions';
import { urlBase64ToUint8Array } from './utils';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Test Notification');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  // Enhanced logging function
  const logToSentry = (
    level: 'info' | 'error' | 'warning',
    message: string,
    extra?: any
  ) => {
    const logData = {
      message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...extra,
    };

    console.log(`[${level.toUpperCase()}] ${message}`, logData);

    if (level === 'error') {
      Sentry.captureException(new Error(message), {
        tags: { component: 'PushNotificationManager' },
        extra: logData,
      });
    } else {
      Sentry.addBreadcrumb({
        message,
        level: level as any,
        category: 'push-notifications',
        data: logData,
      });
    }
  };

  useEffect(() => {
    logToSentry('info', 'PushNotificationManager component mounted');

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      logToSentry('info', 'Push notifications supported');
      setIsSupported(true);
      registerServiceWorker();
    } else {
      logToSentry('warning', 'Push notifications not supported', {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
      });
    }
  }, []);

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    logToSentry(type === 'error' ? 'error' : 'info', `Status: ${message}`);
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: null, message: '' }), 5000);
  };

  async function registerServiceWorker() {
    logToSentry('info', 'Starting service worker registration');

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      logToSentry('info', 'Service worker registered successfully', {
        scope: registration.scope,
        state: registration.active?.state,
      });

      // Wait for service worker to be ready
      const readyRegistration = await navigator.serviceWorker.ready;
      logToSentry('info', 'Service worker ready', {
        state: readyRegistration.active?.state,
      });

      const sub = await registration.pushManager.getSubscription();
      logToSentry('info', 'Checked existing subscription', {
        hasSubscription: !!sub,
        endpoint: sub?.endpoint ? 'exists' : 'none',
      });

      setSubscription(sub);
      if (sub) {
        showStatus('info', 'Already subscribed to notifications');
      }
    } catch (error) {
      logToSentry('error', 'Service worker registration failed', {
        error: error.message,
        stack: error.stack,
        name: error.name,
      });
      showStatus('error', 'Failed to register service worker');
    }
  }

  async function subscribeToPush() {
    logToSentry('info', 'Starting push subscription process');
    setIsLoading(true);

    try {
      // Check environment variables
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      logToSentry('info', 'Environment check', {
        hasVapidKey: !!vapidKey,
        vapidKeyLength: vapidKey?.length || 0,
        nodeEnv: process.env.NODE_ENV,
      });

      if (!vapidKey) {
        throw new Error('VAPID_PUBLIC_KEY_MISSING');
      }

      // Check notification support
      if (!('Notification' in window)) {
        throw new Error('NOTIFICATION_API_NOT_SUPPORTED');
      }

      logToSentry('info', 'Checking notification permission', {
        currentPermission: Notification.permission,
      });

      // Request permission
      let permission = Notification.permission;
      if (permission === 'default') {
        logToSentry('info', 'Requesting notification permission');
        permission = await Notification.requestPermission();
        logToSentry('info', 'Permission request result', { permission });
      }

      if (permission !== 'granted') {
        throw new Error(`PERMISSION_DENIED: ${permission}`);
      }

      // Get service worker registration
      logToSentry('info', 'Getting service worker registration');
      const registration = await navigator.serviceWorker.ready;

      logToSentry('info', 'Service worker ready for subscription', {
        scope: registration.scope,
        activeState: registration.active?.state,
      });

      // Check for existing subscription
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        logToSentry('info', 'Found existing subscription', {
          endpoint: existingSub.endpoint.substring(0, 50) + '...',
        });
        setSubscription(existingSub);
        showStatus('info', 'Already subscribed to notifications');
        return;
      }

      // Convert VAPID key
      logToSentry('info', 'Converting VAPID key');
      let applicationServerKey;
      try {
        applicationServerKey = urlBase64ToUint8Array(vapidKey);
        logToSentry('info', 'VAPID key converted successfully', {
          keyLength: applicationServerKey.length,
        });
      } catch (keyError) {
        logToSentry('error', 'VAPID key conversion failed', {
          error: keyError.message,
          vapidKeyPreview: vapidKey.substring(0, 10) + '...',
        });
        throw new Error('VAPID_KEY_CONVERSION_FAILED');
      }

      // Create subscription
      logToSentry('info', 'Creating push subscription');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      logToSentry('info', 'Push subscription created', {
        endpoint: sub.endpoint.substring(0, 50) + '...',
        hasAuth: !!sub.getKey('auth'),
        hasP256dh: !!sub.getKey('p256dh'),
      });

      setSubscription(sub);

      // Serialize subscription
      const serializedSub = JSON.parse(JSON.stringify(sub));
      logToSentry('info', 'Subscription serialized', {
        hasEndpoint: !!serializedSub.endpoint,
        hasKeys: !!serializedSub.keys,
      });

      // Send to server
      logToSentry('info', 'Sending subscription to server');
      const startTime = Date.now();

      const result = await subscribeUser(serializedSub, navigator.userAgent);
      const endTime = Date.now();

      logToSentry('info', 'Server response received', {
        success: result.success,
        error: result.error,
        responseTime: endTime - startTime,
        resultKeys: Object.keys(result),
      });

      if (result.success) {
        showStatus('success', 'Successfully subscribed to push notifications!');
        logToSentry('info', 'Subscription process completed successfully');
      } else {
        logToSentry('error', 'Server subscription failed', {
          error: result.error,
          result: result,
        });
        showStatus('error', result.error || 'Failed to subscribe');
      }
    } catch (error) {
      logToSentry('error', 'Subscription process failed', {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorString: error.toString(),
      });

      // More specific error messages
      let errorMessage = 'Failed to subscribe to notifications';
      if (
        error.message.includes('permission') ||
        error.message.includes('PERMISSION_DENIED')
      ) {
        errorMessage =
          'Permission denied. Please enable notifications in your browser settings.';
      } else if (error.message.includes('VAPID')) {
        errorMessage = 'Configuration error. Please contact support.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Push notifications are not supported on this device.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Subscription was cancelled.';
      } else if (error.message.includes('NOTIFICATION_API_NOT_SUPPORTED')) {
        errorMessage = 'Notifications are not supported in this browser.';
      }

      showStatus('error', errorMessage);
    } finally {
      setIsLoading(false);
      logToSentry('info', 'Subscription process ended');
    }
  }

  async function unsubscribeFromPush() {
    logToSentry('info', 'Starting unsubscribe process');
    setIsLoading(true);

    try {
      if (subscription) {
        logToSentry('info', 'Unsubscribing from push manager');
        await subscription.unsubscribe();

        logToSentry('info', 'Notifying server of unsubscription');
        const result = await unsubscribeUser(subscription.endpoint);

        logToSentry('info', 'Unsubscribe server response', {
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          setSubscription(null);
          showStatus('success', 'Successfully unsubscribed from notifications');
          logToSentry('info', 'Unsubscribe process completed successfully');
        } else {
          logToSentry('error', 'Server unsubscribe failed', {
            error: result.error,
          });
          showStatus('error', result.error || 'Failed to unsubscribe');
        }
      }
    } catch (error) {
      logToSentry('error', 'Unsubscription failed', {
        error: error.message,
        stack: error.stack,
      });
      showStatus('error', 'Failed to unsubscribe from notifications');
    } finally {
      setIsLoading(false);
      logToSentry('info', 'Unsubscribe process ended');
    }
  }

  async function sendTestNotification() {
    if (!message.trim()) {
      logToSentry('warning', 'Send notification attempted with empty message');
      showStatus('error', 'Please enter a message');
      return;
    }

    logToSentry('info', 'Sending test notification', {
      titleLength: title.length,
      messageLength: message.length,
    });

    setIsLoading(true);

    try {
      const startTime = Date.now();
      const result = await sendNotification(message, title);
      const endTime = Date.now();

      logToSentry('info', 'Send notification response', {
        success: result.success,
        sent: result.sent,
        total: result.total,
        error: result.error,
        responseTime: endTime - startTime,
      });

      if (result.success) {
        showStatus(
          'success',
          `Notification sent successfully! (${result.sent}/${result.total} delivered)`
        );
        setMessage('');
        logToSentry('info', 'Test notification sent successfully');
      } else {
        logToSentry('error', 'Send notification failed', {
          error: result.error,
        });
        showStatus('error', result.error || 'Failed to send notification');
      }
    } catch (error) {
      logToSentry('error', 'Send notification error', {
        error: error.message,
        stack: error.stack,
      });
      showStatus('error', 'Failed to send notification');
    } finally {
      setIsLoading(false);
      logToSentry('info', 'Send notification process ended');
    }
  }

  if (!isSupported) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-800">Not Supported</h3>
            <p className="text-sm text-red-700 mt-1">
              Push notifications are not supported in this browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-5 5v-5zM4 19l5-5 5 5v5l-5-5v5zM12 3l8 8-8 8-8-8z"
            />
          </svg>
          <span>Push Notifications</span>
        </h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Status Message */}
        {status.type && (
          <div
            className={`p-3 rounded-md flex items-start space-x-3 ${
              status.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : status.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex-shrink-0">
              {status.type === 'success' && (
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {status.type === 'error' && (
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {status.type === 'info' && (
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p
              className={`text-sm ${
                status.type === 'success'
                  ? 'text-green-700'
                  : status.type === 'error'
                  ? 'text-red-700'
                  : 'text-blue-700'
              }`}
            >
              {status.message}
            </p>
          </div>
        )}

        {/* Subscription Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${
                subscription ? 'bg-green-400' : 'bg-gray-400'
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              {subscription ? 'Subscribed' : 'Not Subscribed'}
            </span>
          </div>
          <button
            onClick={subscription ? unsubscribeFromPush : subscribeToPush}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              subscription
                ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50'
            } disabled:cursor-not-allowed flex items-center space-x-2`}
          >
            {isLoading && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            <span>{subscription ? 'Unsubscribe' : 'Subscribe'}</span>
          </button>
        </div>

        {/* Send Notification Form */}
        {subscription && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Send Test Notification
              </h3>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Notification title"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                    placeholder="Enter your notification message..."
                  />
                </div>

                <button
                  onClick={sendTestNotification}
                  disabled={isLoading || !message.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-md font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isLoading && (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span>Send Notification</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
