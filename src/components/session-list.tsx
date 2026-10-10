import Link from "next/link";
import { publicSessions } from "@/lib/sessions";
import { meetingDate } from "@/lib/format";
import { paymentsEnabled } from "@/lib/env";
import { LeadForm } from "@/components/lead-form";
import { Countdown } from "@/components/countdown";
export async function SessionList() {
  const { sessions, available } = await publicSessions();
  return (
    <section className="container section" id="sessions">
      <p className="eyebrow">PROCHAINES DATES</p>
      <h2>Choisissez votre session.</h2>
      {sessions.length ? (
        <div className="grid two">
          {sessions.map((s) => (
            <article className="card" key={s.id}>
              <h3>{s.title}</h3>
              <p>
                {s.remaining} place{s.remaining > 1 ? "s" : ""} restante
                {s.remaining > 1 ? "s" : ""}
              </p>
              <ol>
                {s.meetings.map((m) => (
                  <li key={m.id}>
                    <b>{m.meeting_number}.</b> {m.title} —{" "}
                    {meetingDate(m.starts_at)}
                  </li>
                ))}
              </ol>
              <p>Heure de Dakar/Abidjan (GMT).</p>
              <p>
                <Countdown deadline={s.registration_deadline} />
              </p>
              {s.remaining > 0 && paymentsEnabled() ? (
                <Link className="button" href={`/checkout?session=${s.id}`}>
                  Choisir cette session ↗
                </Link>
              ) : (
                <p>
                  {s.remaining === 0
                    ? "Session complète"
                    : "Les inscriptions seront ouvertes après validation du paiement."}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <p>
            {available
              ? "Aucune session n’est ouverte actuellement."
              : "Les dates seront annoncées dès l’ouverture des inscriptions."}
          </p>
          <LeadForm
            enabled={
              available && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
            }
          />
        </div>
      )}
    </section>
  );
}
