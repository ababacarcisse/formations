"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return event ? (
    <button
      className="button small"
      onClick={async () => {
        await event.prompt();
        await event.userChoice;
        setEvent(null);
      }}
    >
      Installer l’application
    </button>
  ) : (
    <p className="note">
      Sur mobile : utilisez « Ajouter à l’écran d’accueil » dans votre
      navigateur.
    </p>
  );
}
