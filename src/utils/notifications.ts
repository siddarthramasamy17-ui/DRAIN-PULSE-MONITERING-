/**
 * Push Notification System for DRAIN PULSE
 * Alerts inspection operators immediately when water thresholds are critically exceeded
 * Fully protected against sandbox iframe security restrictions
 */

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
}

class PushNotificationManager {
  private lastAlertTime = 0;
  private cooldownMs = 15000; // Prevent spamming notifications, 15s cooldown per threshold event

  public checkSupport(): boolean {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined';
    } catch {
      return false;
    }
  }

  public getPermission(): NotificationPermission {
    try {
      if (!this.checkSupport()) return 'denied';
      return Notification.permission;
    } catch {
      return 'denied';
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!this.checkSupport()) {
        return 'denied';
      }
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  /**
   * Dispatches a critical water threshold alert push notification
   */
  public triggerWaterCriticalAlert(levelMm: number, thresholdMm: number, pipeId: string, distanceM: number): boolean {
    const now = Date.now();
    if (now - this.lastAlertTime < this.cooldownMs) {
      return false;
    }
    this.lastAlertTime = now;

    try {
      if (this.checkSupport() && this.getPermission() === 'granted') {
        const title = `🚨 DRAIN PULSE: CRITICAL WATER LEVEL (${levelMm.toFixed(1)}mm)`;
        const options: NotificationOptions = {
          body: `Water level exceeded threshold of ${thresholdMm}mm in Pipe [${pipeId}] at distance ${distanceM.toFixed(1)}m. Immediate rover retrieval recommended!`,
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444"><path d="M12 2L1 21h22L12 2zm0 3.8L20.2 19H3.8L12 5.8zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>',
          tag: 'critical-water-alert',
          requireInteraction: true,
          silent: false,
        };

        const notif = new Notification(title, options);
        notif.onclick = () => {
          try {
            window.focus();
            notif.close();
          } catch {
            // ignore
          }
        };
        return true;
      }
    } catch {
      // Catch cross-origin iframe security exceptions smoothly
    }
    return false;
  }

  /**
   * Trigger a test notification
   */
  public async sendTestNotification(): Promise<boolean> {
    if (!this.checkSupport()) return false;

    try {
      if (this.getPermission() !== 'granted') {
        const result = await this.requestPermission();
        if (result !== 'granted') return false;
      }

      const notif = new Notification('DRAIN PULSE: Telemetry Alert System Active', {
        body: 'Push notification service verified. Critical water level warnings will be pushed directly to this station.',
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306b6d4"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
        tag: 'test-ping',
      });
      setTimeout(() => {
        try { notif.close(); } catch { /* ignore */ }
      }, 6000);
      return true;
    } catch {
      return false;
    }
  }
}

export const pushNotifier = new PushNotificationManager();
