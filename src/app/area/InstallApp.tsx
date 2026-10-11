"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BellRing, Check, Download, EllipsisVertical, Share, Smartphone, SquarePlus, User, X } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";

type Platform = "ios" | "android" | "other";

// Evento con cui Chrome/Android offre l'installazione: non è nei tipi DOM standard.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type Device = {
  platform: Platform;
  // true se la pagina gira già dentro l'app aggiunta alla schermata Home
  standalone: boolean;
  // "unavailable": il push qui non esiste (iPhone fuori dall'app) o è stato negato
  push: "on" | "off" | "unavailable";
};

const INSTALL_DISMISSED_KEY = "ima-yoga-install-nudge-dismissed";
const PUSH_DISMISSED_KEY = "ima-yoga-push-nudge-dismissed";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // localStorage non disponibile (es. modalità privata): il promemoria ricomparirà, non è grave
  }
}

async function detectDevice(): Promise<Device> {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const platform: Platform = /Android/.test(ua) ? "android" : isIos ? "ios" : "other";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

  let push: Device["push"] = "unavailable";
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Notification.permission !== "denied") {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    push = subscription ? "on" : "off";
  }
  return { platform, standalone, push };
}

// Guida all'installazione dell'app sul telefono, in due forme: un promemoria
// compatto in cima alla home (solo da telefono, finché serve) e la guida
// completa a passi, apribile anche dal menu account. Dopo l'installazione il
// promemoria diventa l'invito ad attivare le notifiche, che su iPhone esistono
// solo dentro l'app installata.
export function InstallApp({
  showNudge,
  guideOpen,
  onGuideOpenChange,
  onOpenPushSettings,
  pushSettingsOpen,
}: {
  showNudge: boolean;
  guideOpen: boolean;
  onGuideOpenChange: (open: boolean) => void;
  onOpenPushSettings: () => void;
  pushSettingsOpen: boolean;
}) {
  const [device, setDevice] = useState<Device | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState({ install: false, push: false });
  const [tab, setTab] = useState<"ios" | "android" | null>(null);

  // Ricontrolla alla chiusura del pannello notifiche: se sono state appena
  // attivate, l'invito deve sparire.
  useEffect(() => {
    if (pushSettingsOpen) return;
    let cancelled = false;
    detectDevice()
      .then((next) => {
        if (cancelled) return;
        setDevice(next);
        setDismissed({ install: readFlag(INSTALL_DISMISSED_KEY), push: readFlag(PUSH_DISMISSED_KEY) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pushSettingsOpen]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // senza preventDefault Chrome mostra il suo banner; qui l'installazione parte dal nostro pulsante
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    // l'evento vale per una sola richiesta
    setInstallPrompt(null);
  }

  function dismiss(which: "install" | "push") {
    writeFlag(which === "install" ? INSTALL_DISMISSED_KEY : PUSH_DISMISSED_KEY);
    setDismissed((d) => ({ ...d, [which]: true }));
  }

  const onPhone = device !== null && device.platform !== "other";
  const nudge: "install" | "push" | null = !showNudge || !onPhone
    ? null
    : !device.standalone && !dismissed.install
      ? "install"
      : device.push === "off" && !dismissed.push
        ? "push"
        : null;

  const activeTab = tab ?? (device?.platform === "android" ? "android" : "ios");

  return (
    <>
      {nudge && (
        <div
          className="flex items-center gap-3 rounded-2xl mb-4"
          style={{ background: withAlpha(COLORS.primary, 9), border: `1px solid ${withAlpha(COLORS.primary, 28)}`, padding: "12px 12px 12px 14px" }}
        >
          <span
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 38, height: 38, background: withAlpha(COLORS.primary, 14), color: COLORS.primary }}
          >
            {nudge === "install" ? <Smartphone size={18} /> : <BellRing size={18} />}
          </span>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>
              {nudge === "install" ? "Metti ima yoga sul telefono" : "Attiva le notifiche"}
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 1.4, marginTop: 1 }}>
              {nudge === "install"
                ? "Come un'app, con le notifiche."
                : "Ti avviso quando si libera un posto o c'è una novità per te."}
            </div>
          </div>
          <button
            type="button"
            onClick={() => (nudge === "install" ? onGuideOpenChange(true) : onOpenPushSettings())}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
            style={{ background: COLORS.primary }}
          >
            {nudge === "install" ? "Come si fa" : "Attiva"}
          </button>
          <button type="button" onClick={() => dismiss(nudge)} title="Non ora" className="flex-shrink-0" style={{ color: COLORS.inkSoft }}>
            <X size={16} />
          </button>
        </div>
      )}

      {guideOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
          onMouseDown={(e) => e.target === e.currentTarget && onGuideOpenChange(false)}
        >
          <div
            className="w-full p-5 overflow-y-auto"
            style={{ maxWidth: 380, maxHeight: "90vh", background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
                ima yoga sul telefono
              </div>
              <button onClick={() => onGuideOpenChange(false)}>
                <X size={18} />
              </button>
            </div>

            {device?.standalone ? (
              <>
                <div className="flex items-center gap-2 mt-3 mb-4" style={{ fontSize: 13, fontWeight: 600, color: COLORS.success }}>
                  <Check size={16} /> L&apos;app è già installata su questo telefono.
                </div>
                <Steps>
                  <Step n={1}>{notificationsStep(device.push === "on")}</Step>
                </Steps>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.5 }} className="mb-4">
                  Non serve nessuno store: basta aggiungere il sito alla schermata Home. Si apre a schermo intero dalla sua icona e può
                  mandarti le notifiche.
                </div>

                <div className="flex rounded-lg overflow-hidden mb-4" style={{ border: `1px solid ${COLORS.border}` }}>
                  {(["ios", "android"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className="flex-1 py-2 text-sm font-medium"
                      style={{
                        background: activeTab === t ? COLORS.primary : "transparent",
                        color: activeTab === t ? "#fff" : COLORS.inkSoft,
                      }}
                    >
                      {t === "ios" ? "iPhone" : "Android"}
                    </button>
                  ))}
                </div>

                {activeTab === "ios" ? (
                  <Steps>
                    <Step n={1}>
                      Apri questa pagina in <strong>Safari</strong>. Da Instagram, WhatsApp o dalla posta l&apos;installazione non compare.
                    </Step>
                    <Step n={2}>
                      Tocca <strong>Condividi</strong> <InlineIcon icon={<Share size={13} />} /> nella barra in basso. Se non lo vedi, è
                      dentro il menu <InlineIcon icon={<span style={{ fontWeight: 700, letterSpacing: 1 }}>•••</span>} />.
                    </Step>
                    <Step n={3}>
                      Scorri e scegli <strong>Aggiungi alla schermata Home</strong> <InlineIcon icon={<SquarePlus size={13} />} />, poi{" "}
                      <strong>Aggiungi</strong>.
                    </Step>
                    <Step n={4}>
                      Apri <strong>ima yoga</strong> dalla nuova icona ed entra di nuovo con la tua email: la prima volta l&apos;app chiede
                      l&apos;accesso.
                    </Step>
                    <Step n={5}>{notificationsStep(false)}</Step>
                  </Steps>
                ) : (
                  <Steps>
                    {installPrompt ? (
                      <Step n={1}>
                        Tocca qui sotto e conferma <strong>Installa</strong>.
                        <button
                          type="button"
                          onClick={install}
                          className="flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white"
                          style={{ background: COLORS.primary }}
                        >
                          <Download size={15} /> Installa l&apos;app
                        </button>
                      </Step>
                    ) : (
                      <>
                        <Step n={1}>
                          In <strong>Chrome</strong> tocca il menu <InlineIcon icon={<EllipsisVertical size={13} />} /> in alto a destra.
                        </Step>
                        <Step n={2}>
                          Scegli <strong>Aggiungi a schermata Home</strong> (su alcuni telefoni «Installa app»), poi <strong>Installa</strong>.
                        </Step>
                      </>
                    )}
                    <Step n={installPrompt ? 2 : 3}>
                      Apri <strong>ima yoga</strong> dalla nuova icona.
                    </Step>
                    <Step n={installPrompt ? 3 : 4}>{notificationsStep(device?.push === "on")}</Step>
                  </Steps>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function notificationsStep(alreadyOn: boolean): ReactNode {
  return alreadyOn ? (
    <>Le notifiche su questo telefono sono già attive.</>
  ) : (
    <>
      Per le notifiche: tocca l&apos;icona account <InlineIcon icon={<User size={13} />} /> in alto, poi{" "}
      <strong>Notifiche sul telefono</strong> e <strong>Attiva le notifiche</strong>.
    </>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 22, height: 22, fontSize: 11.5, fontWeight: 700, background: withAlpha(COLORS.primary, 14), color: COLORS.primary }}
      >
        {n}
      </span>
      <div className="flex-1" style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

function InlineIcon({ icon }: { icon: ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded"
      style={{ minWidth: 20, height: 20, padding: "0 3px", verticalAlign: -4, border: `1px solid ${COLORS.border}`, color: COLORS.ink, fontSize: 10 }}
    >
      {icon}
    </span>
  );
}
