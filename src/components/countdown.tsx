"use client";
import { useEffect, useState } from "react";
export function Countdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, new Date(deadline).getTime() - Date.now()));
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (remaining === null)
    return (
      <span>
        Inscription avant le{" "}
        {new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Africa/Dakar",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(deadline))}{" "}
        (GMT)
      </span>
    );
  if (remaining === 0)
    return <span>La date limite d’inscription est atteinte.</span>;
  return (
    <span>
      Clôture dans {Math.floor(remaining / 86400000)} j ·{" "}
      {Math.floor(remaining / 3600000) % 24} h ·{" "}
      {Math.floor(remaining / 60000) % 60} min
    </span>
  );
}
