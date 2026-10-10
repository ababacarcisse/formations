# Validation — 10 octobre 2026

Le projet a été vérifié dans l’environnement cloud avec Node.js 24. Aucun déploiement public, paiement réel, email réel ou changement de base Supabase distante n’a été effectué.

## Vérifications effectuées

- Installation reproductible : `npm ci --cache /tmp/formations-npm-cache`.
- ESLint, TypeScript et compilation Next.js en production.
- 59 tests unitaires : contrat SasPay simulé, signatures, vérifications de paiement, checkout, protection d’origine, emails, calendrier, CSV et SEO.
- 8 tests Chromium sur une compilation de production sans clés : page de vente, rendu mobile, métadonnées, redirection canonique, protection des pages privées, commandes inconnues, assets PWA et checkout indisponible sans configuration.
- PostgreSQL 17 local sous Docker : cinq migrations, seed répétable, confirmations concurrentes, capacité, allocation unique des numéros, déduplication, RLS et isolation des clients, stock transactionnel, événements Purchase et compteurs de requêtes. Les fonctions Auth/JWT sont simulées dans ce test local ; il ne valide pas le service Supabase Auth distant.
- Audit axe de la page de vente : aucune violation détectée.

## Lighthouse mobile

Deux mesures locales sur compilation de production avec indexation activée : performance **95 puis 86**, accessibilité **100**, bonnes pratiques **100**, SEO **100**. La deuxième mesure donne FCP 1,3 s, LCP 2,7 s, TBT 410 ms et CLS 0. La variation reflète notamment la charge de l’environnement partagé ; ces scores ne garantissent pas les performances de l’hébergement public. Le résumé de la dernière mesure est dans `reports/lighthouse-mobile-summary.json`.

Les services externes et les traceurs étaient désactivés lors de ces mesures. L’indexation reste désactivée par défaut dans la configuration livrée.

## À vérifier avec vos paramètres sécurisés avant lancement

1. Appliquer les migrations au projet Supabase, configurer Auth, SMTP, les URL de retour et un administrateur.
2. Saisir les clés dans les paramètres sécurisés, vérifier le domaine d’envoi Resend et configurer le webhook SasPay et le cron.
3. Effectuer les scénarios sandbox documentés dans README : succès, échec, paiement en attente, webhook invalide/rejoué, capacité dépassée et panne email. Tester également connexion administrateur, magic link acheteur et isolation de deux comptes sur le service distant.
4. Renseigner l’identité légale, les coordonnées, les textes commerciaux, les sessions, les liens privés et les informations du formateur. Valider les conditions et la garantie.
5. Déployer, vérifier DNS/TLS et les deux domaines, puis activer explicitement paiements et indexation après validation.

Le brouillon cloud contient les scripts d’installation et de démarrage ainsi que les variables attendues. Il doit être relu et publié dans les paramètres de l’environnement. La publication de l’environnement est distincte du déploiement du site.
