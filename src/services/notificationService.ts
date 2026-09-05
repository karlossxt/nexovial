import { AlertItem, AlertType } from '../types';

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export interface NotificationSettings {
  enabled: boolean;
  notifyOnSecurity: boolean;
  notifyOnRed: boolean;
  notifyOnOrange: boolean;
  onlyWhenInactive: boolean;
}

const SETTINGS_KEY = 'cv_notification_settings';
const NOTIFIED_CACHE_KEY = 'cv_notified_alerts';

class NotificationService {
  private notifiedAlertIds: Set<string> = new Set();
  private originalTitle: string = 'NEXO — Monitoreo Vial en Tiempo Real';
  private titleFlashInterval: NodeJS.Timeout | null = null;
  private pendingUnreadCount: number = 0;
  private onSelectAlertCallback: ((alert: AlertItem) => void) | null = null;

  constructor() {
    // Restore notified IDs cache
    try {
      const cached = sessionStorage.getItem(NOTIFIED_CACHE_KEY);
      if (cached) {
        this.notifiedAlertIds = new Set(JSON.parse(cached));
      }
    } catch {
      this.notifiedAlertIds = new Set();
    }

    // Reset title when user refocuses window/tab
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.clearTitleNotification());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.clearTitleNotification();
        }
      });
    }
  }

  public setSelectAlertCallback(cb: (alert: AlertItem) => void) {
    this.onSelectAlertCallback = cb;
  }

  public getPermissionStatus(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const settings = this.getSettings();
        settings.enabled = true;
        this.saveSettings(settings);
      }
      return permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return Notification.permission;
    }
  }

  public getSettings(): NotificationSettings {
    const defaultSettings: NotificationSettings = {
      enabled: this.getPermissionStatus() === 'granted',
      notifyOnSecurity: true,
      notifyOnRed: true,
      notifyOnOrange: false,
      onlyWhenInactive: false
    };

    if (typeof window === 'undefined') return defaultSettings;

    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse notification settings:', e);
    }
    return defaultSettings;
  }

  public saveSettings(settings: NotificationSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save notification settings:', e);
    }
  }

  public shouldNotifyForType(type: AlertType, settings: NotificationSettings): boolean {
    if (!settings.enabled) return false;
    if (type === 'security') return settings.notifyOnSecurity;
    if (type === 'red') return settings.notifyOnRed;
    if (type === 'orange') return settings.notifyOnOrange;
    return false;
  }

  public notifyAlert(alert: AlertItem, onAlertClick?: (alert: AlertItem) => void): boolean {
    if (alert.ignored) return false;
    if (this.notifiedAlertIds.has(alert.id)) return false;

    // Check if we should notify for this level (Security or Red by default)
    const settings = this.getSettings();
    if (!this.shouldNotifyForType(alert.type, settings)) {
      return false;
    }

    // Check inactive-only condition
    if (settings.onlyWhenInactive && typeof document !== 'undefined' && !document.hidden) {
      return false;
    }

    // Mark as notified in memory & session storage
    this.notifiedAlertIds.add(alert.id);
    try {
      sessionStorage.setItem(
        NOTIFIED_CACHE_KEY,
        JSON.stringify(Array.from(this.notifiedAlertIds).slice(-100))
      );
    } catch {}

    // 1. Flash document title if tab is hidden / background
    if (typeof document !== 'undefined' && document.hidden) {
      this.triggerTitleNotification(alert);
    }

    // 2. Native Browser Notification
    if (this.getPermissionStatus() === 'granted') {
      try {
        const isSecurity = alert.type === 'security';
        const isRed = alert.type === 'red';

        const prefix = isSecurity
          ? '🚨 [ZONA ROJA / SEGURIDAD]'
          : isRed
          ? '⛔ [BLOQUEO TOTAL CARRETERO]'
          : '⚠️ [INCIDENTE MAYOR]';

        const title = `${prefix} ${alert.title.substring(0, 75)}`;
        const body = `${alert.locationName ? `📍 ${alert.locationName}\n` : ''}${alert.description.substring(0, 140)}`;

        const options: NotificationOptions & { renotify?: boolean } = {
          body,
          tag: `cv-alert-${alert.id}`,
          requireInteraction: isSecurity || isRed, // Keep on screen for critical events
          renotify: true,
          silent: false
        };

        const notification = new Notification(title, options);

        notification.onclick = (event) => {
          event.preventDefault();
          if (typeof window !== 'undefined') {
            window.focus();
          }
          notification.close();
          if (onAlertClick) {
            onAlertClick(alert);
          } else if (this.onSelectAlertCallback) {
            this.onSelectAlertCallback(alert);
          }
        };

        return true;
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }

    return false;
  }

  public sendTestNotification(): boolean {
    if (this.getPermissionStatus() !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification('🚨 [PRUEBA] NEXO Notificaciones', {
        body: 'Las alertas de Seguridad Carretera, Rutas Seguras y Bloqueos se mostrarán aquí en tiempo real.',
        tag: 'cv-test-notification',
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        notification.close();
      };
      return true;
    } catch (err) {
      console.error('Test notification failed:', err);
      return false;
    }
  }

  private triggerTitleNotification(alert: AlertItem) {
    this.pendingUnreadCount++;
    if (this.titleFlashInterval) clearInterval(this.titleFlashInterval);

    let isAlertTitle = true;
    const alertLabel = alert.type === 'security' ? '🚨 ZONA ROJA' : '⛔ BLOQUEO';

    this.titleFlashInterval = setInterval(() => {
      if (document.hidden) {
        document.title = isAlertTitle
          ? `(${this.pendingUnreadCount}) ${alertLabel} - NEXO`
          : `⚠️ NUEVO EVENTO VIAL - ${alert.locationName || 'Carreteras MX'}`;
        isAlertTitle = !isAlertTitle;
      } else {
        this.clearTitleNotification();
      }
    }, 1200);
  }

  private clearTitleNotification() {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = null;
    }
    this.pendingUnreadCount = 0;
    document.title = this.originalTitle;
  }
}

export const notificationService = new NotificationService();
