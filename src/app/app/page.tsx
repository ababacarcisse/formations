import { readAll } from "@/lib/read-all";
import { requireBuyer } from "@/lib/auth";
import { logout } from "@/lib/login-actions";
import { ActionForm } from "@/components/action-form";
import { businessAction } from "@/lib/business-actions";
import { ImportCalculator } from "@/components/import-calculator";
import { InstallApp } from "@/components/install-app";
import { money, meetingDate } from "@/lib/format";
import type { Product, Client, Sale, Expense } from "@/lib/types";
export default async function Business() {
  const { db } = await requireBuyer();
  const [products, clients, sales, expenses] = await Promise.all([
    readAll<Product>(db, "business_products"),
    readAll<Client>(db, "business_clients"),
    readAll<Sale>(db, "business_sales"),
    readAll<Expense>(db, "business_expenses"),
  ]);
  const turnover = sales.reduce(
      (n, s) => n + Number(s.unit_price) * s.quantity,
      0,
    ),
    cost = sales.reduce((n, s) => n + Number(s.unit_cost) * s.quantity, 0),
    spent = expenses.reduce((n, e) => n + Number(e.amount), 0),
    debts = sales.filter(
      (s) => Number(s.paid) < Number(s.unit_price) * s.quantity,
    );
  return (
    <main id="contenu" className="container section">
      <nav className="workspace-nav" aria-label="Mon business">
        <a href="#produits">Stock</a>
        <a href="#ventes">Ventes</a>
        <a href="#clients">Clients et dettes</a>
        <a href="#depenses">Dépenses</a>
        <a href="#calculateur">Coût d’import</a>
        <form action={logout}>
          <button>Déconnexion</button>
        </form>
      </nav>
      <h1>Votre business, en un coup d’œil.</h1>
      <InstallApp />
      <div className="grid four">
        {[
          ["Chiffre d’affaires", turnover],
          ["Bénéfice estimé", turnover - cost - spent],
          ["Dépenses", spent],
          [
            "Créances clients",
            debts.reduce(
              (n, s) => n + Number(s.unit_price) * s.quantity - Number(s.paid),
              0,
            ),
          ],
        ].map(([title, n]) => (
          <article className="card" key={title}>
            <p>{title}</p>
            <h3>{money(Number(n))}</h3>
          </article>
        ))}
      </div>

      <section className="section" id="produits">
        <h2>Produits et stock</h2>
        <a href="/api/business/export?kind=products" className="button small">
          Exporter les produits
        </a>
        <div className="grid two">
          <div className="card">
            <ActionForm action={businessAction} label="Ajouter le produit">
              <input name="type" type="hidden" value="product" />
              <label>
                Produit
                <input name="name" required />
              </label>
              <label>
                Coût unitaire (FCFA)
                <input name="cost" type="number" min={0} step="0.01" required />
              </label>
              <label>
                Prix de vente (FCFA)
                <input
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                />
              </label>
              <label>
                Stock initial
                <input name="stock" type="number" min={0} required />
              </label>
              <label>
                Alerte sous ce niveau
                <input
                  name="low_stock"
                  type="number"
                  min={0}
                  defaultValue={3}
                  required
                />
              </label>
            </ActionForm>
          </div>
          <div>
            {products.map((p) => (
              <article className="card" key={p.id}>
                <h3>{p.name}</h3>
                <p>
                  {money(p.price)} · coût {money(p.cost)}
                </p>
                <p className={p.stock <= p.low_stock ? "warning" : ""}>
                  {p.stock} en stock {p.stock <= p.low_stock && "— stock bas"}
                </p>
                <ActionForm action={businessAction} label="Ajuster le stock">
                  <input name="type" type="hidden" value="stock" />
                  <input name="id" type="hidden" value={p.id} />
                  <label>
                    Quantité disponible
                    <input
                      name="stock"
                      type="number"
                      min={0}
                      defaultValue={p.stock}
                      required
                    />
                  </label>
                </ActionForm>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section" id="ventes">
        <h2>Ventes</h2>
        <a href="/api/business/export?kind=sales" className="button small">
          Exporter les ventes
        </a>
        <div className="card">
          <ActionForm action={businessAction} label="Enregistrer la vente">
            <input name="type" type="hidden" value="sale" />
            <label>
              Produit
              <select name="product" required>
                <option value="">Choisir</option>
                {products.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name} · {p.stock} en stock
                  </option>
                ))}
              </select>
            </label>
            <label>
              Client
              <select name="client">
                <option value="">Vente au comptant</option>
                {clients.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantité
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                required
              />
            </label>
            <label>
              Prix unitaire (FCFA)
              <input name="price" type="number" min={0} step="0.01" required />
            </label>
            <label>
              Montant déjà encaissé (FCFA)
              <input name="paid" type="number" min={0} step="0.01" required />
            </label>
          </ActionForm>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Total</th>
                <th>Bénéfice brut</th>
                <th>Encaissé</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>{meetingDate(s.created_at)}</td>
                  <td>{products.find((p) => p.id === s.product_id)?.name}</td>
                  <td>{s.quantity}</td>
                  <td>{money(s.quantity * s.unit_price)}</td>
                  <td>{money(s.quantity * (s.unit_price - s.unit_cost))}</td>
                  <td>{money(s.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section" id="clients">
        <h2>Clients et dettes</h2>
        <a href="/api/business/export?kind=clients" className="button small">
          Exporter les clients
        </a>
        <div className="grid two">
          <div className="card">
            <ActionForm action={businessAction} label="Ajouter le client">
              <input name="type" type="hidden" value="client" />
              <label>
                Nom
                <input name="name" required />
              </label>
              <label>
                WhatsApp avec indicatif
                <input
                  name="phone"
                  type="tel"
                  placeholder="+221771234567"
                  pattern="\+[1-9][0-9]{7,14}"
                  required
                />
              </label>
            </ActionForm>
          </div>
          <div>
            {clients.map((c) => (
              <p key={c.id}>
                {c.name} · {c.phone}
              </p>
            ))}
          </div>
        </div>
        {debts.map((s) => {
          const c = clients.find((c) => c.id === s.client_id),
            due = s.quantity * s.unit_price - s.paid;
          return (
            <article className="card" key={s.id}>
              <h3>
                {c?.name ?? "Client non renseigné"} · {money(due)} à recevoir
              </h3>
              {c && (
                <a
                  href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${c.name}, rappel concernant votre solde de ${money(due)}. Merci !`)}`}
                >
                  Préparer une relance WhatsApp →
                </a>
              )}
              <ActionForm
                action={businessAction}
                label="Enregistrer le règlement"
              >
                <input name="type" type="hidden" value="debt" />
                <input name="id" type="hidden" value={s.id} />
                <label>
                  Montant reçu (FCFA)
                  <input
                    name="amount"
                    type="number"
                    min={0.01}
                    max={due}
                    step="0.01"
                    required
                  />
                </label>
              </ActionForm>
            </article>
          );
        })}
      </section>
      <section className="section" id="depenses">
        <h2>Dépenses par catégorie</h2>
        <a href="/api/business/export?kind=expenses" className="button small">
          Exporter les dépenses
        </a>
        <div className="grid two">
          <div className="card">
            <ActionForm action={businessAction} label="Ajouter la dépense">
              <input name="type" type="hidden" value="expense" />
              <label>
                Description
                <input name="description" required />
              </label>
              <label>
                Catégorie
                <select name="category">
                  {[
                    "Transport",
                    "Douane",
                    "Marketing",
                    "Fonctionnement",
                    "Autre",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Montant (FCFA)
                <input
                  name="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                />
              </label>
            </ActionForm>
          </div>
          <div className="card">
            {[
              "Transport",
              "Douane",
              "Marketing",
              "Fonctionnement",
              "Autre",
            ].map((c) => (
              <p key={c}>
                {c} :{" "}
                {money(
                  expenses
                    .filter((e) => e.category === c)
                    .reduce((n, e) => n + Number(e.amount), 0),
                )}
              </p>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Catégorie</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{meetingDate(e.created_at)}</td>
                  <td>{e.description}</td>
                  <td>{e.category}</td>
                  <td>{money(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section id="calculateur">
        <ImportCalculator />
      </section>
    </main>
  );
}
