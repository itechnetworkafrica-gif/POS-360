import { useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

export type NotificationEvent =
  | { type: "sale_complete"; amount: number; method: string }
  | { type: "low_stock"; product: string; qty: number }
  | { type: "new_customer"; name: string }
  | { type: "daily_target"; amount: number }
  | { type: "table_alert"; table: string; duration: number };

async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendBrowserNotification(title: string, body: string, icon = "/logo.png") {
  if (Notification.permission !== "granted") return;
  const n = new Notification(title, { body, icon, badge: "/logo.png" });
  setTimeout(() => n.close(), 6000);
}

export function useNotifications() {
  const { toast } = useToast();
  const { sym } = useCurrency();
  const permGranted = useRef(false);

  useEffect(() => {
    requestPermission().then(granted => { permGranted.current = granted; });
  }, []);

  const notify = useCallback((event: NotificationEvent) => {
    switch (event.type) {
      case "sale_complete": {
        const title = "Sale Completed ✓";
        const body  = `${sym}${event.amount.toLocaleString()} received via ${event.method}`;
        toast({ title, description: body });
        sendBrowserNotification(title, body);
        break;
      }
      case "low_stock": {
        const title = "⚠ Low Stock Alert";
        const body  = `${event.product} has only ${event.qty} unit${event.qty !== 1 ? "s" : ""} left`;
        toast({ title, description: body, variant: "destructive" });
        sendBrowserNotification(title, body);
        break;
      }
      case "new_customer": {
        const title = "New Customer Registered";
        const body  = `${event.name} just signed up`;
        toast({ title, description: body });
        sendBrowserNotification(title, body);
        break;
      }
      case "daily_target": {
        const title = "🎉 Daily Target Achieved!";
        const body  = `You've hit ${sym}${event.amount.toLocaleString()} in sales today`;
        toast({ title, description: body });
        sendBrowserNotification(title, body);
        break;
      }
      case "table_alert": {
        const title = "Table Alert";
        const body  = `${event.table} has been occupied for ${event.duration} minutes`;
        toast({ title, description: body, variant: "destructive" });
        sendBrowserNotification(title, body);
        break;
      }
    }
  }, [toast, sym]);

  // Real-time stock alert monitor — polls low-stock endpoint every 30s and
  // notifies once per product per "stock episode" (resets once restocked above threshold).
  const alertedRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/dashboard/low-stock-alerts", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const items: { id: number; name: string; stockQuantity: number }[] = await res.json();
        const seenIds = new Set(items.map(i => i.id));

        // Clear alert memory for items that have been restocked above threshold
        for (const id of Array.from(alertedRef.current.keys())) {
          if (!seenIds.has(id)) alertedRef.current.delete(id);
        }

        items.forEach(item => {
          const lastAlertedQty = alertedRef.current.get(item.id);
          if (lastAlertedQty === undefined || lastAlertedQty !== item.stockQuantity) {
            alertedRef.current.set(item.id, item.stockQuantity);
            notify({ type: "low_stock", product: item.name, qty: item.stockQuantity });
          }
        });
      } catch {}
    };

    poll();
    const id = setInterval(poll, 30 * 1000); // every 30 seconds — near real-time
    return () => { cancelled = true; clearInterval(id); };
  }, [notify]);

  return { notify, permGranted: permGranted.current };
}
