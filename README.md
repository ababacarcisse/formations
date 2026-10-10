# Import Afrique — formation Alibaba en Afrique

Projet Next.js 16 App Router, TypeScript strict, Tailwind CSS, Supabase, SasPay et Resend, en français. Il comprend la page de vente, les sessions, la liste d’attente, le checkout hébergé, la confirmation privée, l’administration et l’application business/PWA réservée aux acheteurs.

**Les services réels doivent être configurés avant l’ouverture des ventes.** Les intégrations sont testées avec des réponses simulées et PostgreSQL local ; aucun paiement réel ni email réel n’a été effectué pendant la création. Les textes légaux restent des modèles à finaliser.

## Arborescence

```text
src/app/                 pages, API, robots, sitemap et visuel social
src/components/          formulaires, frise, suivi paiement et interfaces
src/config/site.ts       marque, prix, formateur, témoignages, contact, garantie
src/lib/                 clients serveur, autorisation, paiements, emails et exports
src/proxy.ts             rafraîchissement de session Supabase (Next.js 16)
supabase/migrations/     schéma, RLS et fonctions transactionnelles
supabase/seed.sql         session de démonstration, en brouillon
public/                  icônes PWA, service worker et page hors connexion
scripts/test_database.py tests PostgreSQL isolés via Docker
tests/                   tests unitaires, navigateur et accès aux données
```

## Développement et vérifications

Node.js 24 et npm ; le lockfile est versionné. Aucun worktree supplémentaire n’est nécessaire : chaque tâche cloud est déjà isolée.

```sh
npm ci --cache /tmp/formations-npm-cache
npm run dev
```

```sh
npm run lint
npm run typecheck
npm run test
npm run test:db     # Docker requis ; conteneur jetable, aucune base distante modifiée
npm run build
npm run test:e2e   # build préalable, Chromium requis ; lance un serveur de test sur 3100
```

Le test SQL utilise un PostgreSQL réel et des fonctions Auth simulées (`auth.uid` / `auth.jwt`) : il vérifie les migrations, les confirmations concurrentes, les règles RLS, la gestion des paiements au-delà de la capacité et la transaction de stock. Il ne valide pas l’infrastructure Auth Supabase distante. Les tests SasPay utilisent des fixtures conformes à la documentation officielle, pas une clé marchande réelle.

## Configuration sécurisée

Utilisez les paramètres sécurisés de l’environnement / de Vercel pour les clés. Ne les commitez jamais et ne les copiez pas dans le chat. `.env.example` contient uniquement les noms requis et les URL publiques. Pour le développement local, un fichier `.env.local` est ignoré par Git ; ne le partagez pas.

- `NEXT_PUBLIC_SITE_URL=https://www.formations.cissesolutions.cloud` : URL canonique, retour SasPay et redirection Auth.
- `NEXT_PUBLIC_SITE_INDEXABLE=false` en local/préproduction ; `true` uniquement sur le déploiement public final. Les previews Vercel restent non indexables même si cette variable vaut `true`.
- `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_URL` : `https://nxvaddymaaedzhdgyngf.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique de votre projet ; aucune clé service role dans le navigateur.
- `SUPABASE_SERVICE_ROLE_KEY` : base, commandes et tâches serveur.
- `SASPAY_SECRET_KEY` et `SASPAY_WEBHOOK_SECRET` : API et vérification HMAC locale.
- `SASPAY_PAYMENTS_ENABLED=false` initialement ; activer en test après configuration, puis en production après un test complet réussi.
- `RESEND_API_KEY`, `EMAIL_FROM` : expéditeur validé par Resend.
- `CRON_SECRET` : secret aléatoire fort pour authentifier les tâches planifiées.
- `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA4_ID` : facultatifs ; aucun traceur publicitaire ne se charge sans consentement.

`SUPABASE_URL` est fourni pour les outils serveur ; l’application emploie `NEXT_PUBLIC_SUPABASE_URL` comme endpoint commun. Un changement de variable `NEXT_PUBLIC_*` nécessite un nouveau build. Une configuration enregistrée dans le brouillon cloud n’est ni un déploiement Vercel ni une migration de base.

## Supabase

Le projet Supabase est fourni. Appliquez **dans l’ordre** les cinq fichiers de `supabase/migrations/`, via le SQL Editor ou la CLI Supabase reliée au projet (ne pas utiliser `db reset` sur une base existante). Appliquez `supabase/seed.sql` si vous souhaitez la session de démonstration : elle reste en brouillon et ses dates sont relatives à l’exécution. Ne l’ouvrez qu’après avoir ajouté vos vraies dates et vos liens privés.

Schéma principal : `training_sessions`, `session_meetings`, `orders`, `waitlist`, `admin_users`, `email_logs`, `order_events`, `webhook_inbox`, `rate_limits`. Le bonus utilise `business_products`, `business_clients`, `business_sales` et `business_expenses`. Toutes les tables ont RLS activée. Le public lit une projection contrôlée via `get_public_sessions()` : les liens Zoom/Meet, WhatsApp, notes et coordonnées ne sont jamais exposés dans cette projection.

Dans **Authentication → URL Configuration**, définissez le Site URL canonique et autorisez `https://www.formations.cissesolutions.cloud/auth/callback` (et la callback locale pour le développement). Maintenez la confirmation des emails activée : un email non vérifié ne doit pas ouvrir une session utilisateur. Activez email/mot de passe pour l’administration et les liens magiques pour les acheteurs. Configurez un SMTP de production pour l’envoi des liens magiques Supabase : la configuration Resend de l’application n’envoie pas ces emails Auth automatiquement.

Créez un utilisateur administrateur dans **Authentication → Users**, puis utilisez son UUID dans le SQL Editor :

```sql
insert into public.admin_users(user_id, role)
values ('UUID_DE_VOTRE_UTILISATEUR', 'admin');
```

Connectez-vous sur `/admin/connexion`. L’interface permet de créer/modifier/dupliquer/ouvrir/fermer les sessions et leurs trois séances, consulter les commandes avec recherche et pagination, exporter les commandes/participants/liste d’attente et appliquer les actions de paiement.

Les sessions Auth et les capacités de consultation des commandes sont conservées dans des cookies HTTP-only ; l’authentification de cette application passe par le serveur.

Le numéro participant (001–999) est attribué uniquement à la confirmation par une fonction SQL sous verrou de session, avec contrainte d’unicité. Une confirmation répétée conserve son numéro. Si le paiement arrive après remplissage de la session, la commande reste `success` avec `manual_review=true` et sans numéro : convenez d’une solution. Pour l’inscrire à cette session, augmentez la capacité puis validez à nouveau ; la fonction attribuera le numéro. L’action « Marquer remboursé » enregistre un remboursement déjà effectué ; elle ne déclenche aucun virement.

Les séances sont enregistrées en UTC et saisies/affichées en heure de Dakar/Abidjan (GMT). Les tableaux business lisent les données par lots ; au-delà de 100 000 lignes, une pagination spécialisée devra être ajoutée. Le propriétaire de l’application business est identifié par l’email authentifié correspondant à une commande `success` sans alerte manuelle. Un remboursement supprime cet accès si aucune autre inscription admissible ne reste.

## SasPay : contrat officiel et tests avant lancement

Documentation consultée : [index](https://docs.saspay.me/llms.txt), [quickstart](https://docs.saspay.me/quickstart), [paiements](https://docs.saspay.me/api-reference/payments), [checkout](https://docs.saspay.me/api-reference/payments/checkout-create), [statut](https://docs.saspay.me/api-reference/payments/checkout-status), [vérification](https://docs.saspay.me/api-reference/payments/verify), [webhooks](https://docs.saspay.me/api-reference/webhooks), [enveloppe des réponses](https://docs.saspay.me/api-reference/introduction) et OpenAPI, le 10 octobre 2026.

Créez votre compte sur `app.saspay.me`, obtenez une clé de test avec scope PAYIN ou BOTH, puis configurez dans le dashboard le webhook :

```text
https://www.formations.cissesolutions.cloud/api/webhooks/saspay
```

Abonnez-le aux événements `transaction.created`, `transaction.success`, `transaction.failed`, `transaction.cancelled`. Copiez le secret de signature au moment de sa création dans les paramètres sécurisés. La signature est vérifiée sur `${timestamp}.${corps_brut}` en HMAC SHA-256, avec les en-têtes officiels `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Event` et une tolérance de 5 minutes. Un webhook sans signature valide est rejeté.

Le checkout transmet `amount`, `currency`, les coordonnées, `return_url`, `expires_at` et `metadata.order_id`. **SasPay ignore `Idempotency-Key` sur le checkout hébergé**, contrairement aux opérations de débit direct. Le header demandé est envoyé, mais la déduplication repose sur l’identifiant d’intention unique local. Une répétition dans le même navigateur reprend l’URL existante ; une création incertaine n’est pas réémise automatiquement. Vérifiez une tentative incertaine dans le dashboard SasPay avant de recommencer. La session hébergée ne débite rien tant que le client ne la paie pas.

La vérification rapproche le `transaction_id` fourni par le statut de la session, puis le résultat serveur `/payments/{id}/verify/`. Elle compare **`requested_amount`**, la devise et l’identité de transaction, jamais seulement `net_amount` ni le statut déclaré dans l’URL/webhook. Les frais SasPay sont configurés sur votre compte : pour facturer exactement 10 000 FCFA au client, choisissez le mode de frais DEDUCTED dans les paramètres SasPay ; le net perçu sera alors inférieur. L’interface doit annoncer tout supplément si vous choisissez ADD_ON.

Les webhooks omettent l’identifiant du checkout. L’inbox durable les rapproche via la liste documentée des sessions. Si le rapprochement ne termine pas immédiatement, le cron et la consultation privée de la commande revérifient directement sa session. Le rapprochement webhook parcourt au maximum dix pages par exécution ; les commandes locales sont vérifiées indépendamment, sans perdre un paiement tardif.

Testez en sandbox : succès, échec sans retour automatique, paiement pending, webhook invalide/rejoué, confirmations simultanées, session pleine après paiement et email en panne. Vérifiez que le numéro, le montant, les dates et les liens sont corrects, avant de remplacer la clé de test par la clé live. L’URL de succès seule ne permet jamais de lire une commande : le cookie HTTP-only créé à l’inscription est obligatoire. Un autre navigateur doit utiliser l’email ou le support.

## Resend, emails et tâches planifiées

Vérifiez votre domaine d’envoi dans Resend et définissez `EMAIL_FROM`. Après confirmation, une file en base envoie l’email HTML avec numéro, dates GMT, liens privés, préparation et calendrier `.ics`. Les rappels 24 h / 1 h avant les séances et les relances après échec sont journalisés. Une panne email ne bloque pas la réception du webhook. Les échecs sont retentés (maximum cinq essais automatiques) ; l’administration peut redemander une confirmation. Resend fournit une fenêtre de déduplication limitée : le système ne revendique pas une livraison exactement une fois pour une panne persistante au-delà de cette fenêtre.

`vercel.json` configure `/api/cron` toutes les 15 minutes ; cette fréquence nécessite un plan Vercel compatible (le plan Hobby limite les crons). Sinon utilisez un ordonnanceur externe sécurisé envoyant `Authorization: Bearer <CRON_SECRET>`. Le cron vérifie les commandes pending de plus de 15 minutes, expire celles de plus de 24 heures, rapproche les webhooks et traite les emails/rappels. Une confirmation tardive vérifiée peut toujours restaurer une commande expirée. La limite compte SasPay est protégée par un compteur partagé en base ; une vérification limitée sera retentée.

## SEO, accessibilité et déploiement

La page de vente est rendue côté serveur, en français, avec un H1, des titres hiérarchisés, contenu Alibaba/Afrique francophone, FAQ native, métadonnées, Open Graph/Twitter, visuel social, URL canonique et JSON-LD `Course`. Aucun avis inventé ou note de témoignage n’est utilisé dans le schéma. Les vraies expériences peuvent être ajoutées dans `site.testimonials`.

Le sitemap ne contient que la page de vente. Les pages privées sont `noindex`, exclues du sitemap et déconseillées au crawl par robots. `robots.txt` ne remplace pas l’authentification. Les pages légales sont non indexables jusqu’à la finalisation de `site.legalComplete`. Configurez les noms, coordonnées, textes de garantie, conditions et politique réelle avant d’activer le paiement. Le prix de référence barré doit être justifiable.

Ajoutez les deux domaines à Vercel, configurez leur DNS et TLS, et déployez. Next.js redirige en **308** le domaine sans `www` vers `https://www.formations.cissesolutions.cloud`, en conservant chemin et paramètres. Activez `NEXT_PUBLIC_SITE_INDEXABLE=true` uniquement en production, reconstruisez, vérifiez `/robots.txt` et `/sitemap.xml`, puis soumettez le sitemap à Google Search Console. Les résultats enrichis et positions Google ne sont jamais garantis.

Police Manrope auto-hébergée via `next/font/local` ; aucun appel à Google Fonts. Visuels SVG légers, composants serveur par défaut, accordéons natifs, effets CSS et animation du calculateur dans l’espace privé. L’hébergeur doit réécrire les en-têtes de proxy (Host, X-Forwarded-Proto, X-Vercel-Forwarded-For) et ne pas accepter des valeurs arbitraires fournies par les clients. Les formulaires ont labels et focus visibles. Les traceurs facultatifs ne s’exécutent qu’après consentement. `Purchase` est réclamé une seule fois en base après confirmation serveur ; comme tout tracking navigateur, la livraison aux plateformes n’est pas garantie si le navigateur bloque le réseau.

L’application business propose stock, ventes, clients/dettes, relances WhatsApp préparées à cliquer, dépenses par catégorie, calculateur de coût d’import et exports CSV. Le stock et les ventes sont modifiés dans une transaction SQL, les données sont isolées par utilisateur. Elle est installable via un manifeste et un service worker ; ses données privées ne sont **pas** mises en cache hors connexion.

Les sorties des tests et les scores Lighthouse mesurés sont consignés dans `VALIDATION.md`. Les performances de production dépendent aussi des services configurés et de l’hébergement. Aucun déploiement public n’est effectué automatiquement.
