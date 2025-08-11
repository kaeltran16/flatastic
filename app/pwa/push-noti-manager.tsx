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
  const [message, setMessage] = useState('Hello from Next.js PWA!');
  const [status, setStatus] = useState('Initializing...');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev.slice(-4),
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    checkSupport();
  }, []);

  async function checkSupport() {
    try {
      addLog('Checking push notification support...');

      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      if (!('PushManager' in window)) {
        throw new Error('Push Manager not supported');
      }

      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      setIsSupported(true);
      addLog('✓ Push notifications supported!');
      setStatus('Push notifications supported');

      await checkExistingSubscription();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Support check failed: ${errorMsg}`);
      setStatus(`Not supported: ${errorMsg}`);
      setIsSupported(false);
    }
  }

  async function checkExistingSubscription() {
    try {
      addLog('Checking for existing service worker registration...');

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        addLog('No service worker registration found');
        setStatus('Service worker not registered');
        return;
      }

      addLog('✓ Service worker registration found');

      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        setSubscription(existingSub as unknown as PushSubscription);
        addLog('✓ Found existing push subscription');
        setStatus('Already subscribed to push notifications');
      } else {
        addLog('No existing push subscription found');
        setStatus('Ready to subscribe');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Error checking subscription: ${errorMsg}`);
      setStatus(`Error: ${errorMsg}`);
    }
  }

  async function subscribeToPush() {
    setIsLoading(true);
    try {
      addLog('Starting subscription process...');

      // Check permission
      let permission = Notification.permission;
      if (permission === 'default') {
        addLog('Requesting notification permission...');
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        throw new Error(`Permission denied: ${permission}`);
      }
      addLog('✓ Notification permission granted');

      // Get service worker registration
      addLog('Getting service worker registration...');
      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        addLog('Registering service worker...');
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
      }

      addLog('✓ Service worker ready');
      await navigator.serviceWorker.ready;

      // Create subscription
      addLog('Creating push subscription...');
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error('VAPID_PUBLIC_KEY not found in environment');
      }

      addLog(`Using VAPID key: ${vapidKey.substring(0, 20)}...`);

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      addLog('✓ Push subscription created');
      setSubscription(sub as unknown as PushSubscription);

      // Save to server
      addLog('Saving subscription to server...');
      const serializedSub = JSON.parse(JSON.stringify(sub));
      const result = await subscribeUser(serializedSub);

      if (result.success) {
        addLog('✓ Subscription saved to server');
        setStatus('Successfully subscribed!');

        // Test notification immediately
        addLog('Sending welcome notification...');
        await sendTestNotification(
          'Welcome! Push notifications are now enabled.'
        );
      } else {
        throw new Error(result.error || 'Failed to save subscription');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Subscription failed: ${errorMsg}`);
      setStatus(`Subscription failed: ${errorMsg}`);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeFromPush() {
    setIsLoading(true);
    try {
      addLog('Unsubscribing...');

      if (subscription) {
        // @ts-ignore
        await subscription.unsubscribe();
        addLog('✓ Browser subscription cancelled');
      }

      // @ts-ignore
      const result = await unsubscribeUser();
      setSubscription(null);

      if (result.success) {
        addLog('✓ Server subscription removed');
        setStatus('Successfully unsubscribed');
      } else {
        addLog(`⚠ Server unsubscribe warning: ${result.error}`);
        setStatus('Unsubscribed (with warnings)');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Unsubscribe error: ${errorMsg}`);
      setStatus(`Unsubscribe error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function sendTestNotification(customMessage?: string) {
    const notificationMessage = customMessage || message;

    if (!subscription) {
      addLog('✗ No subscription available');
      setStatus('Error: No subscription available');
      return;
    }

    if (!notificationMessage.trim()) {
      addLog('✗ Empty message');
      setStatus('Error: Please enter a message');
      return;
    }

    setIsLoading(true);
    try {
      addLog(`Sending notification: "${notificationMessage}"`);
      const result = await sendNotification(notificationMessage);

      if (result.success) {
        addLog(
          `✓ Notification sent successfully (${result.sent}/${result.total})`
        );
        setStatus(`Notification sent! (${result.sent}/${result.total})`);
        if (!customMessage) setMessage(''); // Only clear if user-initiated
      } else {
        throw new Error(result.error || 'Unknown send error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Send failed: ${errorMsg}`);
      setStatus(`Send failed: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Environment check
  const envCheck = {
    hasVapidPublic: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPublicPreview:
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 20) + '...',
    isLocalhost:
      typeof window !== 'undefined' && window.location.hostname === 'localhost',
    protocol:
      typeof window !== 'undefined' ? window.location.protocol : 'unknown',
  };

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'monospace',
      }}
    >
      <h2>🔔 Push Notifications Test</h2>

      {/* Status */}
      <div
        style={{
          padding: '15px',
          backgroundColor: isSupported ? '#e8f5e8' : '#fee',
          borderRadius: '8px',
          marginBottom: '20px',
          border: `2px solid ${isSupported ? '#4caf50' : '#f44336'}`,
        }}
      >
        <strong>Status:</strong> {status}
      </div>

      {/* Environment Check */}
      <details
        style={{
          marginBottom: '20px',
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '4px',
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          🔧 Environment Check
        </summary>
        <pre style={{ fontSize: '12px', margin: '10px 0' }}>
          {JSON.stringify(envCheck, null, 2)}
        </pre>
      </details>

      {/* Logs */}
      <details
        style={{
          marginBottom: '20px',
          backgroundColor: '#f0f0f0',
          padding: '10px',
          borderRadius: '4px',
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          📋 Activity Log
        </summary>
        <div
          style={{
            fontSize: '12px',
            fontFamily: 'monospace',
            marginTop: '10px',
            maxHeight: '200px',
            overflow: 'auto',
          }}
        >
          {logs.map((log, i) => (
            <div
              key={i}
              style={{ padding: '2px 0', borderBottom: '1px solid #ddd' }}
            >
              {log}
            </div>
          ))}
        </div>
      </details>

      {!isSupported ? (
        <div style={{ color: '#f44336', padding: '20px', textAlign: 'center' }}>
          ❌ Push notifications are not supported in this environment
        </div>
      ) : (
        <div>
          {subscription ? (
            <div
              style={{
                backgroundColor: '#e8f5e8',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ color: '#2e7d32', margin: '0 0 15px 0' }}>
                ✅ Subscribed to Push Notifications
              </h3>

              <button
                onClick={unsubscribeFromPush}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? '⏳ Unsubscribing...' : '🔕 Unsubscribe'}
              </button>

              <div>
                <h4>Send Test Notification:</h4>
                <div
                  style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
                >
                  <input
                    type="text"
                    placeholder="Enter notification message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                      padding: '10px',
                      flex: 1,
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={() => sendTestNotification()}
                    disabled={isLoading || !message.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor:
                        isLoading || !message.trim()
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: isLoading || !message.trim() ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isLoading ? '⏳ Sending...' : '🚀 Send'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#fff3e0',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <h3 style={{ color: '#ef6c00', margin: '0 0 15px 0' }}>
                🔔 Enable Push Notifications
              </h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Get notified instantly when new content is available
              </p>
              <button
                onClick={subscribeToPush}
                disabled={isLoading}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? '⏳ Setting up...' : '🔔 Enable Notifications'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
