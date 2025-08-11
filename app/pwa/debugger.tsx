'use client';

import {
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function PushNotificationDebugger() {
  const [debugInfo, setDebugInfo] = useState({
    environment: {},
    serviceWorker: {},
    permissions: {},
    subscription: {},
    errors: [],
  });
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const info = {
      environment: {},
      serviceWorker: {},
      permissions: {},
      subscription: {},
      errors: [],
    };

    try {
      // Environment checks
      info.environment = {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
        hasNotifications: 'Notification' in window,
        isHttps: location.protocol === 'https:',
        isLocalhost: location.hostname === 'localhost',
        userAgent: navigator.userAgent,
        vapidPublic: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          ? `${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.substring(0, 20)}...`
          : 'NOT SET',
      };

      // Permission checks
      if ('Notification' in window) {
        info.permissions = {
          current: Notification.permission,
          canRequest: Notification.permission === 'default',
        };
      }

      // Service Worker checks
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          info.serviceWorker = {
            isRegistered: !!registration,
            scope: registration?.scope || 'N/A',
            state: registration?.active?.state || 'N/A',
            scriptURL: registration?.active?.scriptURL || 'N/A',
          };

          if (registration) {
            const subscription =
              await registration.pushManager.getSubscription();
            info.subscription = {
              exists: !!subscription,
              endpoint: subscription?.endpoint
                ? `${subscription.endpoint.substring(0, 50)}...`
                : 'N/A',
              hasAuth: !!(subscription?.getKey && subscription.getKey('auth')),
              hasP256dh: !!(
                subscription?.getKey && subscription.getKey('p256dh')
              ),
            };
          }
        } catch (error) {}
      }

      // Test server action availability
      try {
        // This would normally call your server action
        // For demo purposes, we'll simulate different scenarios
        const testResult = await fetch('/api/test-push', { method: 'POST' });
        // @ts-ignore
        info.serverConnection = {
          reachable: testResult.ok,
          status: testResult.status,
        };
      } catch (error) {}
    } catch (error) {}

    setDebugInfo(info);
    setIsChecking(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (condition: boolean) => {
    if (condition === true)
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (condition === false)
      return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  };

  const DiagnosticSection = ({
    title,
    data,
    icon,
  }: {
    title: string;
    data: any;
    icon: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-sm text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}:
            </span>
            <div className="flex items-center gap-2">
              {typeof value === 'boolean' && getStatusIcon(value)}
              <span
                className={`text-sm font-mono ${
                  value === true
                    ? 'text-green-600'
                    : value === false
                    ? 'text-red-600'
                    : 'text-gray-700'
                }`}
              >
                {String(value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const possibleIssues: string[] = [];

  // @ts-ignore
  if (!debugInfo.environment.hasServiceWorker) {
    possibleIssues.push('Service Worker not supported in this browser');
  }
  // @ts-ignore
  if (!debugInfo.environment.hasPushManager) {
    possibleIssues.push('Push Manager not supported in this browser');
  }
  // @ts-ignore
  if (!debugInfo.environment.isHttps && !debugInfo.environment.isLocalhost) {
    possibleIssues.push(
      'Push notifications require HTTPS (except on localhost)'
    );
  }
  // @ts-ignore
  if (debugInfo.environment.vapidPublic === 'NOT SET') {
    possibleIssues.push(
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable not set'
    );
  }
  // @ts-ignore
  if (debugInfo.permissions.current === 'denied') {
    possibleIssues.push('Notification permission denied by user');
  }
  // @ts-ignore
  if (!debugInfo.serviceWorker.isRegistered) {
    possibleIssues.push('Service Worker not registered');
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Push Notification Diagnostics
          </h1>
          <button
            onClick={runDiagnostics}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`}
            />
            {isChecking ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {debugInfo.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Errors Detected
            </h3>
            <ul className="space-y-1">
              {debugInfo.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {possibleIssues.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Potential Issues
            </h3>
            <ul className="space-y-1">
              {possibleIssues.map((issue, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <DiagnosticSection
          title="Environment Support"
          data={debugInfo.environment}
          icon={<Info className="w-5 h-5 text-blue-500" />}
        />

        <DiagnosticSection
          title="Permissions"
          data={debugInfo.permissions}
          icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
        />

        <DiagnosticSection
          title="Service Worker"
          data={debugInfo.serviceWorker}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
        />

        <DiagnosticSection
          title="Push Subscription"
          data={debugInfo.subscription}
          icon={<Info className="w-5 h-5 text-blue-500" />}
        />
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Common Solutions</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <strong>Environment Variables:</strong> Ensure
            NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and
            NEXT_PUBLIC_VAPID_EMAIL are set correctly.
          </div>
          <div>
            <strong>Service Worker:</strong> Make sure you have a service worker
            file (sw.js) in your public directory.
          </div>
          <div>
            <strong>File Permissions:</strong> Check that your app can write to
            the 'data' directory for storing subscriptions.
          </div>
          <div>
            <strong>Server Actions:</strong> Verify your server actions are
            properly configured and accessible.
          </div>
          <div>
            <strong>HTTPS:</strong> Push notifications require HTTPS in
            production (localhost is exempt).
          </div>
        </div>
      </div>
    </div>
  );
}
