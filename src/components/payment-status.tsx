"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { participant, meetingDate, safeHttps } from "@/lib/format";
import type { OrderView } from "@/lib/types";
import { trackPurchase } from "@/components/tracking";
export function PaymentStatus({ initial }: { initial: OrderView }) {
  const [order, setOrder] = useState(initial),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (order.status !== "pending") return;
    const start = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - start >= 120000) {
        clearInterval(timer);
        setMessage(
          "Le paiement est toujours en attente. Vous recevrez un email dès sa confirmation. Vous pouvez aussi actualiser cette page.",
        );
        return;
      }
      try {
        const res = await fetch(`/api/orders/${order.id}`, {
          cache: "no-store",
        });
        if (res.ok) setOrder(await res.json());
      } catch {
        /* A subsequent poll can recover. */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [order.id, order.status]);
  useEffect(() => {
    if (order.status === "success") {
      void trackPurchase(order.id);
      const onConsent = () => void trackPurchase(order.id);
      window.addEventListener("tracking-ready", onConsent);
      return () => window.removeEventListener("tracking-ready", onConsent);
    }
  }, [order.id, order.status]);
  if (order.status === "success" && order.manual_review)
    return (
      <div className="card">
        <h2>Paiement reçu, inscription à organiser.</h2>
        <p>
          La session était complète au moment de la confirmation. Le formateur
          doit vous proposer une solution. Votre paiement est enregistré ; aucun
          numéro participant n’est attribué pour l’instant.
        </p>
      </div>
    );
  if (order.status === "success")
    return (
      <div className="card">
        <h2>Ton inscription est confirmée !</h2>
        <p>Ton numéro participant</p>
        <p className="price">{participant(order.participant_number!)}</p>
        <p>Garde-le précieusement, il t’identifie pendant les séances.</p>
        <h3>{order.title}</h3>
        {order.meetings?.map((m) => (
          <p key={m.id}>
            <b>{m.title}</b>
            <br />
            {meetingDate(m.starts_at)}
          </p>
        ))}
        <p>Heure de Dakar/Abidjan (GMT).</p>
        {safeHttps(order.whatsapp_group_link) && (
          <a className="button" href={safeHttps(order.whatsapp_group_link)!}>
            Rejoindre le groupe WhatsApp
          </a>
        )}
        <p>
          Votre email de confirmation contient les consignes et le calendrier.
        </p>
        <Link href="/app/connexion">Accéder à mon application business →</Link>
      </div>
    );
  if (order.status === "pending")
    return (
      <div className="card">
        <h2>Vérification du paiement en cours.</h2>
        <p>
          Cette page vérifie le statut toutes les 5 secondes pendant deux
          minutes.
        </p>
        <p role="status">{message}</p>
      </div>
    );
  return (
    <div className="card">
      <h2>
        {order.status === "refunded"
          ? "Commande remboursée"
          : "Le paiement n’a pas abouti."}
      </h2>
      <p>Aucune inscription n’est confirmée pour cette commande.</p>
      <Link
        className="button"
        href={`/checkout?session=${order.session_id}&retry=${order.id}`}
      >
        Choisir une session et réessayer
      </Link>
    </div>
  );
}
