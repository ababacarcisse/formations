"use client";
import { useState, useRef } from "react";
import { site } from "@/config/site";
import { money, meetingDate } from "@/lib/format";
import type { PublicSession } from "@/lib/types";
import { track } from "@/components/tracking";
export function CheckoutForm({
  sessions,
  initial,
  enabled,
  retryNonce,
  customer,
}: {
  sessions: PublicSession[];
  initial: string;
  enabled: boolean;
  retryNonce?: string;
  customer?: { full_name: string; email: string; phone: string };
}) {
  const [selected, setSelected] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const attempts = useRef(new Map<string, string>());
  const session = sessions.find((s) => s.id === selected);
  return (
    <div className="checkout-grid">
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            const fingerprint = Array.from(
              new Uint8Array(
                await crypto.subtle.digest(
                  "SHA-256",
                  new TextEncoder().encode(
                    JSON.stringify([
                      selected,
                      data.get("email"),
                      data.get("full_name"),
                      data.get("phone"),
                    ]),
                  ),
                ),
              ),
            )
              .map((n) => n.toString(16).padStart(2, "0"))
              .join("");
            const key = `checkout-attempt:${fingerprint}:${retryNonce ?? "initial"}`;
            let stored: string | null = null;
            try {
              stored = sessionStorage.getItem(key);
            } catch {
              /* Private mode can disable storage. */
            }
            const attempt_id =
              stored ?? attempts.current.get(key) ?? crypto.randomUUID();
            attempts.current.set(key, attempt_id);
            try {
              sessionStorage.setItem(key, attempt_id);
            } catch {
              /* The in-memory key protects repeat clicks in this page. */
            }
            track("InitiateCheckout");
            const res = await fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                attempt_id,
                session_id: selected,
                full_name: data.get("full_name"),
                email: data.get("email"),
                phone: data.get("phone"),
                website: data.get("website"),
              }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            const url = new URL(result.checkout_url);
            if (url.protocol !== "https:")
              throw new Error("URL de paiement invalide");
            window.location.assign(url.href);
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Le paiement est indisponible.",
            );
            setBusy(false);
          }
        }}
      >
        <label>
          Votre session
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            required
          >
            {sessions.map((s) => (
              <option value={s.id} key={s.id} disabled={s.remaining === 0}>
                {s.title} · {s.remaining} places
              </option>
            ))}
          </select>
        </label>
        <label>
          Nom complet
          <input
            name="full_name"
            defaultValue={customer?.full_name}
            autoComplete="name"
            minLength={3}
            maxLength={120}
            required
          />
        </label>
        <label>
          Email
          <input
            name="email"
            defaultValue={customer?.email}
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <label>
          Téléphone avec indicatif pays
          <input
            name="phone"
            defaultValue={customer?.phone}
            type="tel"
            autoComplete="tel"
            placeholder="+2250700000000"
            pattern="\+[1-9][0-9]{7,14}"
            required
          />
        </label>
        <div className="honeypot" aria-hidden="true">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="checkbox">
          <input type="checkbox" required /> J’ai lu et j’accepte les{" "}
          <a href="/cgv">conditions de vente</a> et la{" "}
          <a href="/remboursement">politique de remboursement</a>.
        </label>
        <p>
          Vos coordonnées servent au paiement et à l’organisation de la
          formation. <a href="/confidentialite">Politique de confidentialité</a>
          .
        </p>
        <button
          className="button"
          disabled={busy || !enabled || !session || session.remaining < 1}
        >
          {busy
            ? "Redirection vers le paiement…"
            : "Payer 10 000 FCFA avec SasPay"}
        </button>
        {!enabled && (
          <p>
            Le paiement sera disponible après configuration et validation de
            SasPay.
          </p>
        )}
        <p role="alert">{message}</p>
      </form>
      <aside className="card">
        <p className="eyebrow">VOTRE INSCRIPTION</p>
        <h2>Importer depuis Alibaba en Afrique</h2>
        <p className="price">{money(site.price)}</p>
        <p>Trois séances live. Aucun achat de marchandises inclus.</p>
        {session?.meetings.map((m) => (
          <p key={m.id}>
            <b>
              Séance {m.meeting_number} : {m.title}
            </b>
            <br />
            {meetingDate(m.starts_at)}
          </p>
        ))}
        <p>Heure de Dakar/Abidjan (GMT).</p>
      </aside>
    </div>
  );
}
