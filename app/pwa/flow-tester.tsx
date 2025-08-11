// Client-side component to test and compare notification flows
'use client';

import { useState } from 'react';

export function NotificationFlowTester({
  sendNotification,
  testNotificationFlow,
}: {
  sendNotification: (message: string) => Promise<{ success: boolean }>;
  testNotificationFlow: (message: string) => Promise<{ success: boolean }>;
}) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('Testing notification flow');

  const addResult = (
    test: string,
    status: string,
    details: string,
    data = null
  ) => {
    const result = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      test,
      status,
      details,
      data,
    };
    // @ts-ignore
    setResults((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10 results
    console.log(`[Flow Test] ${test}: ${status}`, details, data);
  };

  // Test 1: Direct Service Worker Notification
  const testDirectSW = async () => {
    try {
      addResult(
        'Direct SW Test',
        'RUNNING',
        'Testing service worker notification...'
      );

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('No service worker registration');
      }

      await registration.showNotification('Direct SW Test', {
        body: 'This notification was sent directly through the service worker',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'direct-sw-test',
        data: { test: 'direct-sw', timestamp: Date.now() },
        requireInteraction: false,
        // @ts-ignore
        vibrate: [200, 100, 200],
      });

      addResult(
        'Direct SW Test',
        'SUCCESS',
        'Service worker notification sent successfully'
      );
      return true;
    } catch (error) {
      // @ts-ignore
      addResult('Direct SW Test', 'FAILED', `Error: ${error.message}`, error);
      return false;
    }
  };

  // Test 2: Server-sent notification
  const testServerNotification = async () => {
    try {
      addResult(
        'Server Notification',
        'RUNNING',
        'Testing server-sent notification...'
      );

      const result = await sendNotification(testMessage);

      if (result.success) {
        addResult(
          'Server Notification',
          'SUCCESS',
          // @ts-ignore
          `Server reports success: ${result.sent}/${result.total} sent`,
          // @ts-ignore
          result
        );
      } else {
        addResult(
          'Server Notification',
          'FAILED',
          // @ts-ignore
          `Server reports failure: ${result.error}`,
          // @ts-ignore
          result
        );
      }

      return result.success;
    } catch (error) {
      addResult(
        'Server Notification',
        'FAILED',
        // @ts-ignore
        `Error: ${error.message}`,
        // @ts-ignore
        error
      );
      return false;
    }
  };

  // Test 3: Message posting to service worker
  const testSWMessaging = async () => {
    try {
      addResult(
        'SW Messaging',
        'RUNNING',
        'Testing service worker messaging...'
      );

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || !registration.active) {
        throw new Error('No active service worker');
      }

      return new Promise((resolve) => {
        const channel = new MessageChannel();

        channel.port1.onmessage = (event) => {
          if (event.data.success) {
            addResult(
              'SW Messaging',
              'SUCCESS',
              'Service worker responded and showed notification'
            );
            resolve(true);
          } else {
            addResult(
              'SW Messaging',
              'FAILED',
              `SW error: ${event.data.error}`
            );
            resolve(false);
          }
        };

        // @ts-ignore
        registration.active.postMessage(
          {
            type: 'TEST_NOTIFICATION',
            message: testMessage,
          },
          [channel.port2]
        );

        // Timeout after 5 seconds
        setTimeout(() => {
          addResult(
            'SW Messaging',
            'TIMEOUT',
            'Service worker did not respond'
          );
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      // @ts-ignore
      addResult('SW Messaging', 'FAILED', `Error: ${error.message}`, error);
      return false;
    }
  };

  // Test 4: Check subscription details
  const testSubscriptionDetails = async () => {
    try {
      addResult(
        'Subscription Check',
        'RUNNING',
        'Checking push subscription...'
      );

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('No service worker registration');
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        throw new Error('No push subscription found');
      }

      const subscriptionData = {
        endpoint: `${subscription.endpoint.substring(0, 50)}...`,
        // @ts-ignore
        hasAuth: !!(subscription.keys && subscription.keys.auth),
        // @ts-ignore
        hasP256dh: !!(subscription.keys && subscription.keys.p256dh),
        // @ts-ignore
        authLength: subscription.keys?.auth ? subscription.keys.auth.length : 0,
        // @ts-ignore
        p256dhLength: subscription.keys?.p256dh
          ? // @ts-ignore
            subscription.keys.p256dh.length
          : 0,
      };

      addResult(
        'Subscription Check',
        'SUCCESS',
        'Subscription details retrieved',
        // @ts-ignore
        subscriptionData
      );
      return true;
    } catch (error) {
      addResult(
        'Subscription Check',
        'FAILED',
        // @ts-ignore
        `Error: ${error.message}`,
        // @ts-ignore
        error
      );
      return false;
    }
  };

  // Test 5: Full server flow test
  const testFullServerFlow = async () => {
    try {
      addResult(
        'Server Flow Test',
        'RUNNING',
        'Testing complete server notification flow...'
      );

      const result = await testNotificationFlow(testMessage);

      if (result.success) {
        addResult(
          'Server Flow Test',
          'SUCCESS',
          'Server flow test completed successfully',
          // @ts-ignore
          result
        );
      } else {
        addResult(
          'Server Flow Test',
          'FAILED',
          // @ts-ignore
          `Server flow failed: ${result.error}`,
          // @ts-ignore
          result
        );
      }

      return result.success;
    } catch (error) {
      // @ts-ignore
      addResult('Server Flow Test', 'FAILED', `Error: ${error.message}`, error);
      return false;
    }
  };

  // Test 6: Simulate push event manually
  const testManualPushEvent = async () => {
    try {
      addResult('Manual Push Event', 'RUNNING', 'Simulating push event...');

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || !registration.active) {
        throw new Error('No active service worker');
      }

      // Create a mock push event payload
      const mockPayload = {
        title: 'Manual Push Test',
        body: testMessage,
        icon: '/icon-192x192.png',
        data: { test: 'manual-push', timestamp: Date.now() },
      };

      // Post message to SW to simulate push event
      registration.active.postMessage({
        type: 'SIMULATE_PUSH',
        payload: mockPayload,
      });

      addResult(
        'Manual Push Event',
        'SUCCESS',
        'Push event simulation sent to service worker'
      );
      return true;
    } catch (error) {
      addResult(
        'Manual Push Event',
        'FAILED',
        // @ts-ignore
        `Error: ${error.message}`,
        // @ts-ignore
        error
      );
      return false;
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults([]);

    addResult(
      'Test Suite',
      'STARTED',
      'Running comprehensive notification tests...'
    );

    const tests = [
      { name: 'Subscription Details', fn: testSubscriptionDetails },
      { name: 'Direct SW', fn: testDirectSW },
      { name: 'SW Messaging', fn: testSWMessaging },
      { name: 'Manual Push Event', fn: testManualPushEvent },
      { name: 'Server Flow', fn: testFullServerFlow },
      { name: 'Server Notification', fn: testServerNotification },
    ];

    let passedTests = 0;

    for (const test of tests) {
      const result = await test.fn();
      if (result) passedTests++;

      // Wait 1 second between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    addResult(
      'Test Suite',
      'COMPLETED',
      `${passedTests}/${tests.length} tests passed`,
      // @ts-ignore
      { passed: passedTests, total: tests.length }
    );

    setIsLoading(false);
  };

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '1000px',
        margin: '0 auto',
        fontFamily: 'monospace',
      }}
    >
      <h2>🧪 Notification Flow Tester</h2>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
            }}
          >
            Test Message:
          </label>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              width: '300px',
              marginRight: '10px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={runAllTests}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? '🔄 Running Tests...' : '🧪 Run All Tests'}
          </button>

          <button
            onClick={testDirectSW}
            style={{
              padding: '8px 15px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Direct SW
          </button>

          <button
            onClick={testServerNotification}
            style={{
              padding: '8px 15px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Server Notification
          </button>

          <button
            onClick={testSWMessaging}
            style={{
              padding: '8px 15px',
              backgroundColor: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            SW Messaging
          </button>

          <button
            onClick={testSubscriptionDetails}
            style={{
              padding: '8px 15px',
              backgroundColor: '#607d8b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Check Subscription
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div>
        <h3>📊 Test Results</h3>
        {results.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
            }}
          >
            No tests run yet. Click "Run All Tests" to start.
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflow: 'auto' }}>
            {results.map((result) => (
              <div
                // @ts-ignore
                key={result.id}
                style={{
                  padding: '12px',
                  margin: '8px 0',
                  backgroundColor:
                    // @ts-ignore
                    result.status === 'SUCCESS'
                      ? '#e8f5e8'
                      : // @ts-ignore
                      result.status === 'FAILED'
                      ? '#fee'
                      : // @ts-ignore
                      result.status === 'RUNNING'
                      ? // @ts-ignore
                        '#e3f2fd'
                      : // @ts-ignore
                      result.status === 'TIMEOUT'
                      ? // @ts-ignore
                        '#fff3e0'
                      : '#f5f5f5',
                  border: `1px solid ${
                    // @ts-ignore
                    result.status === 'SUCCESS'
                      ? '#4caf50'
                      : // @ts-ignore
                      result.status === 'FAILED'
                      ? '#f44336'
                      : // @ts-ignore
                      result.status === 'RUNNING'
                      ? // @ts-ignore
                        '#2196f3'
                      : // @ts-ignore
                      result.status === 'TIMEOUT'
                      ? '#ff9800'
                      : // @ts-ignore
                        '#ccc'
                  }`,
                  borderRadius: '4px',
                  borderLeft: `4px solid ${
                    // @ts-ignore
                    result.status === 'SUCCESS'
                      ? '#4caf50'
                      : // @ts-ignore
                      result.status === 'FAILED'
                      ? '#f44336'
                      : // @ts-ignore
                      result.status === 'RUNNING'
                      ? '#2196f3'
                      : // @ts-ignore
                      result.status === 'TIMEOUT'
                      ? '#ff9800'
                      : '#ccc'
                  }`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {/* @ts-ignore */}
                      {result.status === 'SUCCESS'
                        ? // @ts-ignore
                          '✅'
                        : // @ts-ignore
                        result.status === 'FAILED'
                        ? '❌'
                        : // @ts-ignore
                        result.status === 'RUNNING'
                        ? '🔄'
                        : // @ts-ignore
                        result.status === 'TIMEOUT'
                        ? '⏰'
                        : // @ts-ignore
                          'ℹ️'}{' '}
                      {/* @ts-ignore */}
                      {result.test}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '4px',
                      }}
                    >
                      {/* @ts-ignore */}
                      {result.details}
                    </div>
                    {/* @ts-ignore */}
                    {result.data && (
                      <details style={{ fontSize: '12px', marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', color: '#666' }}>
                          View Data
                        </summary>
                        <pre
                          style={{
                            backgroundColor: '#f8f9fa',
                            padding: '8px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            marginTop: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {/* @ts-ignore */}
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                      minWidth: '80px',
                      textAlign: 'right',
                    }}
                  >
                    {/* @ts-ignore */}
                    {result.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Tips */}
      <details
        style={{
          marginTop: '20px',
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '4px',
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          🔍 Debug Tips
        </summary>
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          <h4>What to look for:</h4>
          <ul>
            <li>
              <strong>Direct SW works, Server fails:</strong> Issue with
              server-to-SW communication
            </li>
            <li>
              <strong>All tests pass but no notifications:</strong> Browser/OS
              notification settings
            </li>
            <li>
              <strong>Subscription check fails:</strong> Push subscription not
              properly created
            </li>
            <li>
              <strong>SW Messaging fails:</strong> Service worker not responding
              to messages
            </li>
            <li>
              <strong>Server flow fails:</strong> VAPID keys, database, or
              webpush library issues
            </li>
          </ul>

          <h4>Next steps if server notification fails:</h4>
          <ol>
            <li>Check browser console for service worker errors</li>
            <li>Check server logs for detailed error messages</li>
            <li>Verify VAPID keys are correctly configured</li>
            <li>Test with a minimal payload first</li>
            <li>Check if push event is reaching the service worker</li>
          </ol>
        </div>
      </details>
    </div>
  );
}
