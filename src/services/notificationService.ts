/**
 * Centralized Notification Service
 * Manages in-app notifications for swaps, price alerts, and order executions
 */

export interface AppNotification {
  id: string;
  type: "transaction" | "alert" | "order" | "system";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private readonly STORAGE_KEY = 'xlama_notifications';
  private readonly MAX_NOTIFICATIONS = 50;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch {
      this.notifications = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notifications));
    } catch {
      // Handle storage quota exceeded
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current notifications
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }

  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
    const newNotification: AppNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    
    // Keep only the most recent notifications
    if (this.notifications.length > this.MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, this.MAX_NOTIFICATIONS);
    }

    this.saveToStorage();
    this.notify();

    return newNotification;
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      this.notify();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
    this.notify();
  }

  dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.notify();
  }

  clearAll() {
    this.notifications = [];
    this.saveToStorage();
    this.notify();
  }

  // Convenience methods for specific notification types
  notifySwapComplete(fromSymbol: string, toSymbol: string, amount: string, txHash?: string) {
    return this.addNotification({
      type: 'transaction',
      title: 'Swap Completed 🎉',
      message: `Successfully swapped ${amount} ${fromSymbol} for ${toSymbol}`,
      link: txHash ? `/history` : undefined,
    });
  }

  notifySwapFailed(fromSymbol: string, toSymbol: string, error: string) {
    return this.addNotification({
      type: 'transaction',
      title: 'Swap Failed',
      message: `Failed to swap ${fromSymbol} to ${toSymbol}: ${error}`,
    });
  }

  notifyPriceAlert(tokenSymbol: string, condition: 'above' | 'below', targetPrice: number, currentPrice: number) {
    return this.addNotification({
      type: 'alert',
      title: `Price Alert: ${tokenSymbol} 📊`,
      message: `${tokenSymbol} is now ${condition} $${targetPrice.toFixed(4)}. Current: $${currentPrice.toFixed(4)}`,
    });
  }

  notifyOrderTriggered(fromSymbol: string, toSymbol: string, condition: 'above' | 'below', price: number) {
    return this.addNotification({
      type: 'order',
      title: 'Limit Order Triggered 🎯',
      message: `${fromSymbol}/${toSymbol} order triggered at ${condition} $${price.toFixed(6)}`,
      link: '/orders',
    });
  }

  notifyOrderExecuted(fromSymbol: string, toSymbol: string, amount: string, txHash?: string) {
    return this.addNotification({
      type: 'order',
      title: 'Order Executed ✅',
      message: `Successfully executed limit order: ${amount} ${fromSymbol} → ${toSymbol}`,
      link: txHash ? '/orders' : undefined,
    });
  }

  notifyBridgeComplete(fromChain: string, toChain: string, tokenSymbol: string, amount: string) {
    return this.addNotification({
      type: 'transaction',
      title: 'Bridge Complete 🌉',
      message: `Bridged ${amount} ${tokenSymbol} from ${fromChain} to ${toChain}`,
      link: '/history',
    });
  }

  notifySystem(title: string, message: string) {
    return this.addNotification({
      type: 'system',
      title,
      message,
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();
