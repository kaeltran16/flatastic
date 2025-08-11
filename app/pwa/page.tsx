import { sendNotification, testNotificationFlow } from './actions';
import { PushNotificationDebugger } from './debugger';
import { NotificationFlowTester } from './flow-tester';
import { PushNotificationManager } from './push-noti-manager';

export default function Page() {
  return (
    <div>
      <PushNotificationManager />
      <PushNotificationDebugger />
      <NotificationFlowTester
        sendNotification={sendNotification}
        testNotificationFlow={testNotificationFlow}
      />
    </div>
  );
}
