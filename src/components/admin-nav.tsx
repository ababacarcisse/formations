import Link from "next/link";
import { logout } from "@/lib/login-actions";
export function AdminNav() {
  return (
    <nav className="workspace-nav" aria-label="Administration">
      <Link href="/admin">Tableau de bord</Link>
      <Link href="/admin/sessions">Sessions</Link>
      <Link href="/admin/commandes">Commandes</Link>
      <Link href="/admin/attente">Liste d’attente</Link>
      <form action={logout}>
        <button>Déconnexion</button>
      </form>
    </nav>
  );
}
