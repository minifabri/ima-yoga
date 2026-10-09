"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { removePushSubscription, savePushSubscription, sendTestPush } from "./actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// "needs-install": iPhone/iPad aperto in Safari — lì il push esiste solo
// dentro l'app aggiunta alla schermata Home.
type Status = "loading" | "unsupported" | "needs-install" | "off" | "on";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function isIosOutsideHomeScreenApp() {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export function PushSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Status;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = isIosOutsideHomeScreenApp() ? "needs-install" : "unsupported";
      } else {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        next = subscription ? "on" : "off";
      }
      if (!cancelled) setStatus(next);
    })().catch(() => {
      if (!cancelled) setStatus("off");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) {
      setMessage("Notifiche non ancora configurate sul server (manca la chiave VAPID).");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permesso negato: riattivalo dalle impostazioni del telefono (Notifiche → ima yoga).");
        return;
      }
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const result = await savePushSubscription(JSON.parse(JSON.stringify(subscription)), navigator.userAgent);
      if (!result.ok) {
        await subscription.unsubscribe().catch(() => {});
        setMessage(result.error ?? "Non sono riuscita a salvare la sottoscrizione.");
        return;
      }
      setStatus("on");
    } catch {
      setMessage("Non sono riuscita ad attivare le notifiche su questo dispositivo.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setMessage("Non sono riuscita a disattivare le notifiche.");
    } finally {
      setPending(false);
    }
  }

  async function test() {
    setPending(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        setStatus("off");
        return;
      }
      const result = await sendTestPush(subscription.endpoint);
      setMessage(result.ok ? "Notifica di prova inviata." : result.error ?? "Invio non riuscito.");
    } finally {
      setPending(false);
    }
  }

  const on = status === "on";
  const color = on ? COLORS.success : COLORS.inkSoft;

  return (
    <div className="mb-6">
      <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
        Notifiche su questo dispositivo
      </div>
      {status === "unsupported" || status === "needs-install" ? (
        <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
          {status === "needs-install"
            ? "Su iPhone le notifiche funzionano solo dall'app sulla schermata Home: in Safari tocca Condividi → «Aggiungi alla schermata Home», poi apri ima yoga dall'icona e torna qui."
            : "Questo browser non supporta le notifiche push."}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={on ? disable : enable}
              disabled={pending || status === "loading"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              style={{ border: `1px solid ${withAlpha(color, 33)}`, color, background: withAlpha(color, 8) }}
            >
              {on ? <Bell size={15} /> : <BellOff size={15} />}
              {on ? "Notifiche attive" : "Attiva le notifiche"}
            </button>
            {on && (
              <button
                onClick={test}
                disabled={pending}
                className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
              >
                Invia una prova
              </button>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.inkSoft }} className="mt-1.5">
            {message ??
              "Iscrizioni, disdette, richieste di lezione individuale e gli altri avvisi della campanella arrivano anche come notifica sul telefono. Va attivato su ogni dispositivo."}
          </div>
        </>
      )}
    </div>
  );
}
