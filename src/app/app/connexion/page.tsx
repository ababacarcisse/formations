import { privateMetadata } from "@/lib/seo";
import { ActionForm } from "@/components/action-form";
import { buyerLogin } from "@/lib/login-actions";
export const metadata = {
  ...privateMetadata,
  title: "Connexion à mon application",
};
export default function Login() {
  return (
    <main id="contenu" className="container section legal">
      <h1>Votre application business</h1>
      <p>
        Utilisez l’email de votre inscription confirmée pour recevoir un lien de
        connexion.
      </p>
      <div className="card">
        <ActionForm action={buyerLogin} label="Recevoir mon lien">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
        </ActionForm>
      </div>
    </main>
  );
}
