"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/login-actions";
export function ActionForm({
  action,
  children,
  label = "Enregistrer",
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  label?: string;
}) {
  const [state, submit, pending] = useActionState(action, { message: "" });
  return (
    <form action={submit} className="form">
      {children}
      <button className="button" disabled={pending}>
        {pending ? "Traitement…" : label}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
