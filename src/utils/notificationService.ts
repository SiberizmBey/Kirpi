/**
 * Kirpi Task & Team Hub - Desktop & In-App Notification Service
 * Supports HTML5 Desktop Push Notifications & Web Audio Sound Alerts
 */

class NotificationService {
  private audioCtx: AudioContext | null = null;

  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications.');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  public getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  public playNotificationSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      // Audio autoplay policy might restrict without user interaction
    }
  }

  public send(title: string, options?: { body?: string; icon?: string; tag?: string }) {
    this.playNotificationSound();

    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: options?.body || 'Kirpi Hub bildirim detayı',
          icon: options?.icon || 'https://api.iconify.design/lucide:bell.svg?color=%23a855f7',
          tag: options?.tag,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };

        // Auto close after 6 seconds
        setTimeout(() => notif.close(), 6000);
      } catch (err) {
        console.warn('Desktop notification error:', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
