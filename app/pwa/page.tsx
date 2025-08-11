import { PushNotificationDebugger } from './debugger';
import { PushNotificationManager } from './push-noti-manager';

export default function Page() {
  return (
    <div>
      <PushNotificationManager />
      <PushNotificationDebugger />
    </div>
  );
}
