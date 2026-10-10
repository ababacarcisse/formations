"use client";
import Script from "next/script";
import { useSyncExternalStore } from "react";
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("tracking-consent", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("tracking-consent", callback);
    window.removeEventListener("storage", callback);
  };
}
const consent = () => {
  try {
    return localStorage.getItem("tracking-consent");
  } catch {
    return "refused";
  }
};
export function track(
  name: "Lead" | "InitiateCheckout" | "Purchase",
  extra: Record<string, unknown> = {},
) {
  if (consent() !== "accepted") return;
  window.fbq?.("track", name, extra);
  window.gtag?.(
    "event",
    {
      Lead: "generate_lead",
      InitiateCheckout: "begin_checkout",
      Purchase: "purchase",
    }[name],
    extra,
  );
}
export async function trackPurchase(id: string) {
  const ga = process.env.NEXT_PUBLIC_GA4_ID,
    meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gaRequired = Boolean(ga && /^G-[A-Z0-9]+$/.test(ga)),
    metaRequired = Boolean(meta && /^\d+$/.test(meta));
  if (
    consent() !== "accepted" ||
    (!gaRequired && !metaRequired) ||
    (gaRequired && !window.gtag) ||
    (metaRequired && !window.fbq)
  )
    return;
  try {
    const response = await fetch(`/api/orders/${id}/purchase`, {
      method: "POST",
    });
    if (!response.ok) return;
    const event = await response.json();
    if (event.claimed)
      track("Purchase", {
        transaction_id: event.transaction_id,
        value: event.value,
        currency: event.currency,
      });
  } catch {
    /* No unconfirmed purchase is emitted. */
  }
}
export function Tracking() {
  const choice = useSyncExternalStore(subscribe, consent, () => null);
  const ga = process.env.NEXT_PUBLIC_GA4_ID,
    meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gaId = ga && /^G-[A-Z0-9]+$/.test(ga) ? ga : null,
    metaId = meta && /^\d+$/.test(meta) ? meta : null;
  if (!gaId && !metaId) return null;
  const choose = (value: string) => {
    const previous = consent();
    try {
      localStorage.setItem("tracking-consent", value);
    } catch {
      return;
    }
    window.dispatchEvent(new Event("tracking-consent"));
    if (previous === "accepted" && value !== "accepted")
      window.location.reload();
  };
  return (
    <>
      {choice === null && (
        <aside className="consent" aria-label="Choix des traceurs">
          <p>
            Autorisez-vous les outils de mesure d’audience et de publicité ?
            Vous pouvez refuser sans modifier votre accès au site.
          </p>
          <button onClick={() => choose("accepted")}>Accepter</button>
          <button onClick={() => choose("refused")}>Refuser</button>
          <a href="/confidentialite">En savoir plus</a>
        </aside>
      )}
      {choice === "accepted" && (
        <>
          {gaId && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
              />
              <Script
                id="ga-config"
                strategy="afterInteractive"
              >{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${gaId}');window.dispatchEvent(new Event("tracking-ready"));`}</Script>
            </>
          )}
          {metaId && (
            <Script
              id="meta-config"
              strategy="afterInteractive"
            >{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaId}');fbq('track','PageView');window.dispatchEvent(new Event('tracking-ready'));`}</Script>
          )}
        </>
      )}
      <aside aria-label="Préférences de cookies">
        <button
          className="consent-choice"
          onClick={() => {
            try {
              localStorage.removeItem("tracking-consent");
            } catch {
              return;
            }
            window.location.reload();
          }}
        >
          Mes préférences de cookies
        </button>
      </aside>
    </>
  );
}
