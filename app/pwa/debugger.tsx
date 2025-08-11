// Enhanced debugging component for push notifications
'use client';

import { useEffect, useState } from 'react';

export function PushNotificationDebugger() {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState([]);

  const runDiagnostics = async () => {
    const results = [];

    // 1. Check notification permission

    const permission = Notification.permission;
    results.push({
      test: 'Notification Permission',
      status: permission === 'granted' ? 'PASS' : 'FAIL',
      details: `Permission: ${permission}`,
      fix: permission !== 'granted' ? 'Request notification permission' : null,
    });

    // 2. Check if browser supports notifications
    const supportsNotifications = 'Notification' in window;
    results.push({
      test: 'Browser Notification Support',
      status: supportsNotifications ? 'PASS' : 'FAIL',
      details: `Supported: ${supportsNotifications}`,
      fix: !supportsNotifications ? 'Use a modern browser' : null,
    });

    // 3. Check service worker registration
    let swRegistration = null;
    try {
      swRegistration = await navigator.serviceWorker.getRegistration();
      results.push({
        test: 'Service Worker Registration',
        status: swRegistration ? 'PASS' : 'FAIL',
        details: swRegistration
          ? `Active: ${!!swRegistration.active}`
          : 'Not registered',
        fix: !swRegistration ? 'Register service worker' : null,
      });
    } catch (error) {
      results.push({
        test: 'Service Worker Registration',
        status: 'FAIL',
        // @ts-ignore
        details: `Error: ${error.message}`,
        fix: 'Check service worker setup',
      });
    }

    // 4. Check push subscription
    let pushSubscription = null;
    if (swRegistration) {
      try {
        pushSubscription = await swRegistration.pushManager.getSubscription();
        results.push({
          test: 'Push Subscription',
          status: pushSubscription ? 'PASS' : 'FAIL',
          details: pushSubscription ? 'Subscription exists' : 'No subscription',
          fix: !pushSubscription ? 'Subscribe to push notifications' : null,
        });
      } catch (error) {
        results.push({
          test: 'Push Subscription',
          status: 'FAIL',
          // @ts-ignore
          details: `Error: ${error.message}`,
          fix: 'Check push subscription setup',
        });
      }
    }

    // 5. Test local notification (bypass server)
    try {
      if (permission === 'granted') {
        const localNotification = new Notification('Local Test Notification', {
          body: 'This is a direct browser notification test',
          icon: '/icon-192x192.png',
          tag: 'local-test',
        });

        results.push({
          test: 'Local Notification Test',
          status: 'PASS',
          details: 'Local notification created successfully',
          fix: null,
        });

        // Close after 3 seconds
        setTimeout(() => localNotification.close(), 3000);
      } else {
        results.push({
          test: 'Local Notification Test',
          status: 'SKIP',
          details: 'Permission not granted',
          fix: 'Grant notification permission first',
        });
      }
    } catch (error) {
      results.push({
        test: 'Local Notification Test',
        status: 'FAIL',
        // @ts-ignore

        details: `Error: ${error.message}`,
        fix: 'Check browser notification settings',
      });
    }

    // 6. Check system notification settings
    const systemInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };

    results.push({
      test: 'System Information',
      status: 'INFO',
      details: `Platform: ${systemInfo.platform}, Online: ${systemInfo.onLine}`,
      fix: null,
    });
    // @ts-ignore
    setTestResults(results);
    setDebugInfo(systemInfo);
  };

  const testServiceWorkerNotification = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        alert('No service worker registration found');
        return;
      }

      // Test notification through service worker
      await registration.showNotification('Service Worker Test', {
        body: 'This notification was triggered through the service worker',
        icon: '/web-app-manifest-192x192.png',
        badge: '/web-app-manifest-192x192.png',
        tag: 'sw-test',
        requireInteraction: false,
        // @ts-ignore
        vibrate: [200, 100, 200],
        data: { url: '/', test: true },
      });

      alert('Service worker notification sent! Check if it appeared.');
    } catch (error) {
      // @ts-ignore
      alert(`Service worker notification failed: ${error.message}`);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      alert(`Permission result: ${permission}`);
      runDiagnostics(); // Re-run diagnostics
    } catch (error) {
      // @ts-ignore
      alert(`Permission request failed: ${error.message}`);
    }
  };

  const checkBrowserNotificationSettings = () => {
    alert(`
Browser Notification Checklist:

1. Check browser notification settings:
   - Chrome: Settings > Privacy and Security > Site Settings > Notifications
   - Firefox: Settings > Privacy & Security > Permissions > Notifications
   - Safari: Preferences > Websites > Notifications

2. Check operating system settings:
   - Windows: Settings > System > Notifications & actions
   - macOS: System Preferences > Notifications
   - Android: Settings > Apps & notifications
   - iOS: Settings > Notifications

3. Check Do Not Disturb mode
4. Check if site is in incognito/private mode
5. Check if site is muted in browser

Current permission: ${Notification.permission}
    `);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '900px',
        margin: '0 auto',
        fontFamily: 'monospace',
      }}
    >
      <h2>🐛 Push Notification Debugger</h2>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runDiagnostics}
          style={{
            padding: '10px 15px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer',
          }}
        >
          🔄 Run Diagnostics
        </button>

        <button
          onClick={testServiceWorkerNotification}
          style={{
            padding: '10px 15px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer',
          }}
        >
          🧪 Test SW Notification
        </button>

        <button
          onClick={requestNotificationPermission}
          style={{
            padding: '10px 15px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer',
          }}
        >
          🔐 Request Permission
        </button>

        <button
          onClick={checkBrowserNotificationSettings}
          style={{
            padding: '10px 15px',
            backgroundColor: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ⚙️ Settings Help
        </button>
      </div>

      {/* Test Results */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📋 Diagnostic Results</h3>
        {testResults.map((result, index) => (
          <div
            key={index}
            style={{
              padding: '10px',
              margin: '5px 0',
              backgroundColor:
                // @ts-ignore
                result.status === 'PASS'
                  ? '#e8f5e8'
                  : // @ts-ignore
                  result.status === 'FAIL'
                  ? '#fee'
                  : // @ts-ignore
                  result.status === 'SKIP'
                  ? '#fff3e0'
                  : '#f0f0f0',
              border: `1px solid ${
                // @ts-ignore
                result.status === 'PASS'
                  ? '#4caf50'
                  : // @ts-ignore
                  result.status === 'FAIL'
                  ? '#f44336'
                  : // @ts-ignore
                  result.status === 'SKIP'
                  ? '#ff9800'
                  : '#ccc'
              }`,
              borderRadius: '4px',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {/* @ts-ignore */}
              {result.status === 'PASS'
                ? '✅'
                : // @ts-ignore
                result.status === 'FAIL'
                ? '❌'
                : // @ts-ignore
                result.status === 'SKIP'
                ? '⏭️'
                : 'ℹ️'}{' '}
              {/* @ts-ignore */}
              {result.test}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {/* @ts-ignore */}
              {result.details}
            </div>
            {/* @ts-ignore */}
            {result.fix && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#d32f2f',
                  marginTop: '5px',
                  fontStyle: 'italic',
                }}
              >
                {/* @ts-ignore */}
                💡 Fix: {result.fix}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Common Issues */}
      <details style={{ marginBottom: '20px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          🔍 Common Issues & Solutions
        </summary>
        <div style={{ padding: '10px', fontSize: '14px' }}>
          <h4>Why notifications might not appear:</h4>
          <ul>
            <li>
              <strong>Browser blocked notifications:</strong> Check site
              settings in browser
            </li>
            <li>
              <strong>OS-level blocking:</strong> Check system notification
              settings
            </li>
            <li>
              <strong>Do Not Disturb mode:</strong> Turn off DND/Focus mode
            </li>
            <li>
              <strong>Private/Incognito mode:</strong> Notifications often
              blocked in private browsing
            </li>
            <li>
              <strong>Service worker issues:</strong> SW not properly handling
              push events
            </li>
            <li>
              <strong>VAPID key mismatch:</strong> Keys might be incorrect or
              expired
            </li>
            <li>
              <strong>Subscription endpoint expired:</strong> Need to
              resubscribe
            </li>
            <li>
              <strong>Browser tab closed:</strong> Some browsers require active
              tab
            </li>
            <li>
              <strong>Invalid notification payload:</strong> Check payload
              format
            </li>
          </ul>
        </div>
      </details>

      {/* System Info */}
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          💻 System Information
        </summary>
        <pre
          style={{
            fontSize: '12px',
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>
    </div>
  );
}
