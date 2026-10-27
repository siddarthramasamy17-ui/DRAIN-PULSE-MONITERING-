/**
 * Push Notification System for DRAIN PULSE
 * Alerts inspection operators immediately when water thresholds are critically exceeded
 */

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
}

class PushNotificationManager {
  private lastAlertTime = 0;
  private cooldownMs = 15000; // Prevent spamming notifications, 15s cooldown per threshold event

  public checkSupport(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.checkSupport()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.checkSupport()) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return Notification.permission;
    }
  }

  /**
   * Dispatches a critical water threshold alert push notification
   */
  public triggerWaterCriticalAlert(levelMm: number, thresholdMm: number, pipeId: string, distanceM: number) {
    const now = Date.now();
    if (now - this.lastAlertTime < this.cooldownMs) {
      return false;
    }
    this.lastAlertTime = now;

    const title = `🚨 DRAIN PULSE: CRITICAL WATER LEVEL (${levelMm.toFixed(1)}mm)`;
    const options: NotificationOptions = {
      body: `Water level exceeded threshold of ${thresholdMm}mm in Pipe [${pipeId}] at distance ${distanceM.toFixed(1)}m. Immediate rover retrieval recommended!`,
      icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444"><path d="M12 2L1 21h22L12 2zm0 3.8L20.2 19H3.8L12 5.8zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>',
      tag: 'critical-water-alert',
      requireInteraction: true,
      silent: false,
    };

    if (this.checkSupport() && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        return true;
      } catch {
        // Fallback or permission issue
      }
    }
    return false;
  }

  /**
   * Trigger a test notification
   */
  public async sendTestNotification(): Promise<boolean> {
    if (!this.checkSupport()) return false;
    
    if (Notification.permission !== 'granted') {
      const result = await this.requestPermission();
      if (result !== 'granted') return false;
    }

    try {
      const notif = new Notification('DRAIN PULSE: Telemetry Alert System Active', {
        body: 'Push notification service verified. Critical water level warnings will be pushed directly to this station.',
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306b6d4"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
        tag: 'test-ping',
      });
      setTimeout(() => notif.close(), 6000);
      return true;
    } catch {
      return false;
    }
  }
}

export const pushNotifier = new PushNotificationManager();
