"use client";
import { useState } from "react";
import { track } from "@/components/tracking";
export function LeadForm({ enabled }: { enabled: boolean }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage("");
        const data = new FormData(e.currentTarget);
        try {
          const res = await fetch("/api/waitlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: data.get("email"),
              whatsapp: data.get("whatsapp"),
              website: data.get("website"),
              consent: data.get("consent") === "on",
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          setMessage(
            "C’est noté ! Nous vous informerons de la prochaine session.",
          );
          track("Lead");
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Inscription indisponible",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Préviens-moi de la prochaine session</h3>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        WhatsApp avec indicatif
        <input
          name="whatsapp"
          type="tel"
          placeholder="+221771234567"
          autoComplete="tel"
          pattern="\+[1-9][0-9]{7,14}"
          required
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Site internet
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="checkbox">
        <input name="consent" type="checkbox" required /> J’accepte de recevoir
        les informations sur la prochaine session.{" "}
        <a href="/confidentialite">Confidentialité</a>
      </label>
      <button className="button" disabled={!enabled || busy}>
        {busy ? "Enregistrement…" : "M’informer des prochaines dates"}
      </button>
      {!enabled && (
        <p>
          Le formulaire sera disponible à l’activation de la base de données.
        </p>
      )}
      <p role="status">{message}</p>
    </form>
  );
}
