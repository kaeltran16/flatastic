// @ts-nocheck
'use client';

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

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    browser: '',
    os: '',
    serviceWorkerSupported: false,
    pushManagerSupported: false,
    notificationApiSupported: false,
    notificationPermission: 'default',
    serviceWorkerState: 'unknown',
    serviceWorkerScope: '',
    vapidKeyPresent: false,
    vapidKeyLength: 0,
    isSecureContext: false,
    isLocalhost: false,
    subscriptionDetails: null,
    lastError: null,
    registrationDetails: null,
    environmentInfo: {},
  });
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  // Enhanced logging function
  const addDebugLog = (
    level: 'info' | 'error' | 'warning' | 'success',
    message: string,
    data?: any
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      data: data || null,
    };

    setDebugLogs((prev) => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs

    const consoleMethod =
      level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data || '');
  };

  // Update debug info
  const updateDebugInfo = () => {
    const info = {
      browser: navigator.userAgent,
      os: navigator.platform,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      notificationApiSupported: 'Notification' in window,
      notificationPermission:
        'Notification' in window ? Notification.permission : 'not-supported',
      serviceWorkerState: 'unknown',
      serviceWorkerScope: '',
      vapidKeyPresent: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      vapidKeyLength: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length || 0,
      isSecureContext: window.isSecureContext,
      isLocalhost:
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1',
      subscriptionDetails: subscription
        ? {
            endpoint: subscription.endpoint?.substring(0, 50) + '...',
            hasAuth: !!subscription.getKey?.('auth'),
            hasP256dh: !!subscription.getKey?.('p256dh'),
            expirationTime: subscription.expirationTime,
          }
        : null,
      lastError: debugInfo.lastError,
      registrationDetails: debugInfo.registrationDetails,
      environmentInfo: {
        nodeEnv: process.env.NODE_ENV,
        protocol: window.location.protocol,
        host: window.location.host,
        pathname: window.location.pathname,
      },
    };

    // Get service worker state
    if (navigator.serviceWorker?.controller) {
      info.serviceWorkerState = navigator.serviceWorker.controller.state;
    }

    navigator.serviceWorker?.ready
      .then((registration) => {
        setDebugInfo((prev) => ({
          ...prev,
          serviceWorkerScope: registration.scope,
          registrationDetails: {
            scope: registration.scope,
            updateViaCache: registration.updateViaCache,
            activeState: registration.active?.state,
            installingState: registration.installing?.state,
            waitingState: registration.waiting?.state,
          },
        }));
      })
      .catch(() => {});

    setDebugInfo(info);
  };

  useEffect(() => {
    addDebugLog('info', 'PushNotificationManager component mounted');
    updateDebugInfo();

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      addDebugLog('info', 'Push notifications supported');
      setIsSupported(true);
      registerServiceWorker();
    } else {
      addDebugLog('warning', 'Push notifications not supported', {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
      });
    }

    // Update permission status periodically
    const interval = setInterval(() => {
      if (
        'Notification' in window &&
        debugInfo.notificationPermission !== Notification.permission
      ) {
        updateDebugInfo();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    addDebugLog(
      type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
      `Status: ${message}`
    );
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: null, message: '' }), 5000);
  };

  async function registerServiceWorker() {
    addDebugLog('info', 'Starting service worker registration');

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      addDebugLog('success', 'Service worker registered successfully', {
        scope: registration.scope,
        state: registration.active?.state,
      });

      setDebugInfo((prev) => ({
        ...prev,
        registrationDetails: {
          scope: registration.scope,
          updateViaCache: registration.updateViaCache,
          activeState: registration.active?.state,
          installingState: registration.installing?.state,
          waitingState: registration.waiting?.state,
        },
      }));

      // Wait for service worker to be ready
      const readyRegistration = await navigator.serviceWorker.ready;
      addDebugLog('success', 'Service worker ready', {
        state: readyRegistration.active?.state,
      });

      const sub = await registration.pushManager.getSubscription();
      addDebugLog('info', 'Checked existing subscription', {
        hasSubscription: !!sub,
        endpoint: sub?.endpoint
          ? sub.endpoint.substring(0, 50) + '...'
          : 'none',
      });

      setSubscription(sub);
      updateDebugInfo();

      if (sub) {
        showStatus('info', 'Already subscribed to notifications');
      }
    } catch (error) {
      const errorInfo = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };

      setDebugInfo((prev) => ({ ...prev, lastError: errorInfo }));
      addDebugLog('error', 'Service worker registration failed', errorInfo);
      showStatus('error', 'Failed to register service worker');
    }
  }

  async function subscribeToPush() {
    addDebugLog('info', 'Starting push subscription process');
    setIsLoading(true);

    try {
      // Check environment variables
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      addDebugLog('info', 'Environment check', {
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

      addDebugLog('info', 'Checking notification permission', {
        currentPermission: Notification.permission,
      });

      // Request permission
      let permission = Notification.permission;
      if (permission === 'default') {
        addDebugLog('info', 'Requesting notification permission');
        permission = await Notification.requestPermission();
        addDebugLog('info', 'Permission request result', { permission });
        updateDebugInfo();
      }

      if (permission !== 'granted') {
        throw new Error(`PERMISSION_DENIED: ${permission}`);
      }

      // Get service worker registration
      addDebugLog('info', 'Getting service worker registration');
      const registration = await navigator.serviceWorker.ready;

      addDebugLog('info', 'Service worker ready for subscription', {
        scope: registration.scope,
        activeState: registration.active?.state,
      });

      // Check for existing subscription
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        addDebugLog('info', 'Found existing subscription', {
          endpoint: existingSub.endpoint.substring(0, 50) + '...',
        });
        setSubscription(existingSub);
        updateDebugInfo();
        showStatus('info', 'Already subscribed to notifications');
        return;
      }

      // Convert VAPID key
      addDebugLog('info', 'Converting VAPID key');
      let applicationServerKey;
      try {
        applicationServerKey = urlBase64ToUint8Array(vapidKey);
        addDebugLog('success', 'VAPID key converted successfully', {
          keyLength: applicationServerKey.length,
        });
      } catch (keyError) {
        addDebugLog('error', 'VAPID key conversion failed', {
          error: keyError.message,
          vapidKeyPreview: vapidKey.substring(0, 10) + '...',
        });
        throw new Error('VAPID_KEY_CONVERSION_FAILED');
      }

      // Create subscription
      addDebugLog('info', 'Creating push subscription');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      addDebugLog('success', 'Push subscription created', {
        endpoint: sub.endpoint.substring(0, 50) + '...',
        hasAuth: !!sub.getKey('auth'),
        hasP256dh: !!sub.getKey('p256dh'),
      });

      setSubscription(sub);
      updateDebugInfo();

      // Serialize subscription
      const serializedSub = JSON.parse(JSON.stringify(sub));
      addDebugLog('info', 'Subscription serialized', {
        hasEndpoint: !!serializedSub.endpoint,
        hasKeys: !!serializedSub.keys,
      });

      // Send to server
      addDebugLog('info', 'Sending subscription to server');
      const startTime = Date.now();

      const result = await subscribeUser(serializedSub, navigator.userAgent);
      const endTime = Date.now();

      addDebugLog('info', 'Server response received', {
        success: result.success,
        error: result.error,
        responseTime: endTime - startTime,
        resultKeys: Object.keys(result),
      });

      if (result.success) {
        showStatus('success', 'Successfully subscribed to push notifications!');
        addDebugLog('success', 'Subscription process completed successfully');
      } else {
        addDebugLog('error', 'Server subscription failed', {
          error: result.error,
          result: result,
        });
        showStatus('error', result.error || 'Failed to subscribe');
      }
    } catch (error) {
      const errorInfo = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };

      setDebugInfo((prev) => ({ ...prev, lastError: errorInfo }));
      addDebugLog('error', 'Subscription process failed', errorInfo);

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
      addDebugLog('info', 'Subscription process ended');
    }
  }

  async function unsubscribeFromPush() {
    addDebugLog('info', 'Starting unsubscribe process');
    setIsLoading(true);

    try {
      if (subscription) {
        addDebugLog('info', 'Unsubscribing from push manager');
        await subscription.unsubscribe();

        addDebugLog('info', 'Notifying server of unsubscription');
        const result = await unsubscribeUser(subscription.endpoint);

        addDebugLog('info', 'Unsubscribe server response', {
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          setSubscription(null);
          updateDebugInfo();
          showStatus('success', 'Successfully unsubscribed from notifications');
          addDebugLog('success', 'Unsubscribe process completed successfully');
        } else {
          addDebugLog('error', 'Server unsubscribe failed', {
            error: result.error,
          });
          showStatus('error', result.error || 'Failed to unsubscribe');
        }
      }
    } catch (error) {
      const errorInfo = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };

      setDebugInfo((prev) => ({ ...prev, lastError: errorInfo }));
      addDebugLog('error', 'Unsubscription failed', errorInfo);
      showStatus('error', 'Failed to unsubscribe from notifications');
    } finally {
      setIsLoading(false);
      addDebugLog('info', 'Unsubscribe process ended');
    }
  }

  async function sendTestNotification() {
    if (!message.trim()) {
      addDebugLog('warning', 'Send notification attempted with empty message');
      showStatus('error', 'Please enter a message');
      return;
    }

    addDebugLog('info', 'Sending test notification', {
      titleLength: title.length,
      messageLength: message.length,
    });

    setIsLoading(true);

    try {
      const startTime = Date.now();
      const result = await sendNotification(message, title);
      const endTime = Date.now();

      addDebugLog('info', 'Send notification response', {
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
        addDebugLog('success', 'Test notification sent successfully');
      } else {
        addDebugLog('error', 'Send notification failed', {
          error: result.error,
        });
        showStatus('error', result.error || 'Failed to send notification');
      }
    } catch (error) {
      const errorInfo = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };

      setDebugInfo((prev) => ({ ...prev, lastError: errorInfo }));
      addDebugLog('error', 'Send notification error', errorInfo);
      showStatus('error', 'Failed to send notification');
    } finally {
      setIsLoading(false);
      addDebugLog('info', 'Send notification process ended');
    }
  }

  const requestPermissionManually = async () => {
    if ('Notification' in window) {
      addDebugLog('info', 'Manually requesting notification permission');
      try {
        const permission = await Notification.requestPermission();
        addDebugLog('info', 'Manual permission request result', { permission });
        updateDebugInfo();
        showStatus(
          permission === 'granted' ? 'success' : 'error',
          `Notification permission: ${permission}`
        );
      } catch (error) {
        addDebugLog('error', 'Manual permission request failed', {
          error: error.message,
        });
        showStatus('error', 'Failed to request permission');
      }
    }
  };

  const testBrowserNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      addDebugLog('info', 'Testing browser notification API directly');
      try {
        new Notification('Test Notification', {
          body: 'This is a direct browser notification test',
          icon: '/icon-192x192.png',
        });
        addDebugLog('success', 'Direct browser notification created');
      } catch (error) {
        addDebugLog('error', 'Direct browser notification failed', {
          error: error.message,
        });
      }
    } else {
      addDebugLog(
        'warning',
        'Cannot test browser notification - permission not granted'
      );
      showStatus('error', 'Notification permission required for browser test');
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'Debug logs cleared');
  };

  if (!isSupported) {
    return (
      <div className="max-w-4xl mx-auto mt-8 space-y-6">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
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
              <h3 className="text-sm font-medium text-red-800">
                Not Supported
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Push notifications are not supported in this browser.
              </p>
            </div>
          </div>
        </div>

        {/* Debug Info for Unsupported Browser */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-800 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Debug Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Browser Support
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service Worker:</span>
                    <span
                      className={
                        debugInfo.serviceWorkerSupported
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {debugInfo.serviceWorkerSupported ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Push Manager:</span>
                    <span
                      className={
                        debugInfo.pushManagerSupported
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {debugInfo.pushManagerSupported ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Notification API:</span>
                    <span
                      className={
                        debugInfo.notificationApiSupported
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {debugInfo.notificationApiSupported ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Environment
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Secure Context:</span>
                    <span
                      className={
                        debugInfo.isSecureContext
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {debugInfo.isSecureContext ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protocol:</span>
                    <span>{debugInfo.environmentInfo.protocol}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700 mb-2">User Agent</h4>
              <p className="text-xs text-gray-600 break-all">
                {debugInfo.browser}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      {/* Main Push Notification Panel */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
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

          {/* Quick Debug Actions */}
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={requestPermissionManually}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              Request Permission
            </button>
            <button
              onClick={testBrowserNotification}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              Test Browser Notification
            </button>
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              {showDebugPanel ? 'Hide' : 'Show'} Debug Panel
            </button>
            <button
              onClick={updateDebugInfo}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
            >
              Refresh Debug Info
            </button>
          </div>

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

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Debug Information</span>
            </h2>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="text-white hover:text-gray-300"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  System Information
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Browser Support
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Service Worker:</span>
                        <span
                          className={
                            debugInfo.serviceWorkerSupported
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {debugInfo.serviceWorkerSupported
                            ? '✓ Supported'
                            : '✗ Not Supported'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Push Manager:</span>
                        <span
                          className={
                            debugInfo.pushManagerSupported
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {debugInfo.pushManagerSupported
                            ? '✓ Supported'
                            : '✗ Not Supported'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Notification API:</span>
                        <span
                          className={
                            debugInfo.notificationApiSupported
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {debugInfo.notificationApiSupported
                            ? '✓ Supported'
                            : '✗ Not Supported'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Permission:</span>
                        <span
                          className={
                            debugInfo.notificationPermission === 'granted'
                              ? 'text-green-600'
                              : debugInfo.notificationPermission === 'denied'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }
                        >
                          {debugInfo.notificationPermission}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Environment
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Secure Context:</span>
                        <span
                          className={
                            debugInfo.isSecureContext
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {debugInfo.isSecureContext ? '✓ HTTPS' : '✗ HTTP'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Localhost:</span>
                        <span
                          className={
                            debugInfo.isLocalhost
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }
                        >
                          {debugInfo.isLocalhost ? '✓ Yes' : '✗ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protocol:</span>
                        <span>{debugInfo.environmentInfo.protocol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Host:</span>
                        <span className="truncate">
                          {debugInfo.environmentInfo.host}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      VAPID Configuration
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>VAPID Key Present:</span>
                        <span
                          className={
                            debugInfo.vapidKeyPresent
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {debugInfo.vapidKeyPresent ? '✓ Yes' : '✗ Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Key Length:</span>
                        <span
                          className={
                            debugInfo.vapidKeyLength > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {debugInfo.vapidKeyLength} chars
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Worker & Subscription Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Service Worker & Subscription
                </h3>
                <div className="space-y-4">
                  {debugInfo.registrationDetails && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Service Worker Registration
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>State:</span>
                          <span
                            className={
                              debugInfo.registrationDetails.activeState ===
                              'activated'
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }
                          >
                            {debugInfo.registrationDetails.activeState ||
                              'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Scope:</span>
                          <span className="truncate text-xs">
                            {debugInfo.registrationDetails.scope}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Update Via Cache:</span>
                          <span>
                            {debugInfo.registrationDetails.updateViaCache}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {debugInfo.subscriptionDetails && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Push Subscription
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Endpoint:</span>
                          <span className="text-green-600">✓ Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auth Key:</span>
                          <span
                            className={
                              debugInfo.subscriptionDetails.hasAuth
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {debugInfo.subscriptionDetails.hasAuth
                              ? '✓ Present'
                              : '✗ Missing'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>P256dh Key:</span>
                          <span
                            className={
                              debugInfo.subscriptionDetails.hasP256dh
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {debugInfo.subscriptionDetails.hasP256dh
                              ? '✓ Present'
                              : '✗ Missing'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expiration:</span>
                          <span>
                            {debugInfo.subscriptionDetails.expirationTime ||
                              'No expiration'}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="block font-medium">
                            Endpoint Preview:
                          </span>
                          <span className="text-xs text-gray-600 break-all">
                            {debugInfo.subscriptionDetails.endpoint}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {debugInfo.lastError && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-700 mb-2">
                        Last Error
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Name:</strong> {debugInfo.lastError.name}
                        </div>
                        <div>
                          <strong>Message:</strong>{' '}
                          {debugInfo.lastError.message}
                        </div>
                        {debugInfo.lastError.stack && (
                          <div>
                            <strong>Stack:</strong>
                            <pre className="text-xs mt-1 p-2 bg-red-100 rounded overflow-x-auto">
                              {debugInfo.lastError.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Browser Details */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Browser Details
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-2">
                  <strong>Platform:</strong> {debugInfo.os}
                </div>
                <div>
                  <strong>User Agent:</strong>
                  <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto whitespace-pre-wrap">
                    {debugInfo.browser}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Logs Panel */}
      {showDebugPanel && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Debug Logs ({debugLogs.length})</span>
            </h2>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Clear Logs
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No debug logs yet. Interact with the push notification system to
                see logs.
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {debugLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      log.level === 'error'
                        ? 'bg-red-50 border-red-400'
                        : log.level === 'warning'
                        ? 'bg-yellow-50 border-yellow-400'
                        : log.level === 'success'
                        ? 'bg-green-50 border-green-400'
                        : 'bg-blue-50 border-blue-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2 py-1 rounded uppercase font-semibold ${
                              log.level === 'error'
                                ? 'bg-red-200 text-red-800'
                                : log.level === 'warning'
                                ? 'bg-yellow-200 text-yellow-800'
                                : log.level === 'success'
                                ? 'bg-green-200 text-green-800'
                                : 'bg-blue-200 text-blue-800'
                            }`}
                          >
                            {log.level}
                          </span>
                          <span className="text-xs text-gray-500">
                            {log.timestamp}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          {log.message}
                        </div>
                        {log.data && (
                          <div className="mt-2">
                            <pre className="text-xs p-2 bg-gray-100 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
