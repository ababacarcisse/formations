import { privateMetadata } from "@/lib/seo";
import { ActionForm } from "@/components/action-form";
import { adminLogin } from "@/lib/login-actions";
export const metadata = {
  ...privateMetadata,
  title: "Connexion administrateur",
};
export default function Login() {
  return (
    <main id="contenu" className="container section legal">
      <h1>Espace administrateur</h1>
      <p>Connectez-vous avec votre compte administrateur.</p>
      <div className="card">
        <ActionForm action={adminLogin} label="Se connecter">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Mot de passe
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
        </ActionForm>
      </div>
    </main>
  );
}
