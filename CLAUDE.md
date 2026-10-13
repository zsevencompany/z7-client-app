# z7-client-app — dépôt officiel APP / CLIENT

**`C:\Z7\Z7-DEV\z7-client-app`**

Le logiciel organisateur (Electron) : lecture des parties, envoi des
résultats.

## Avant toute modification

1. **Nommer le dépôt** concerné.
2. **Afficher son chemin absolu** et vérifier qu'il commence par
   `C:\Z7\Z7-DEV\` (code) — ou `C:\Z7\DOCUMENTATION`, `C:\Z7\RAPPORTS`.
3. **Lire `git status`**.
4. **Signaler tout travail non commité** avant d'en commencer un autre.

## L'architecture officielle : `C:\Z7` (depuis le 13/10/2026)

| dossier | rôle |
|---|---|
| `Z7-DEV\` | **Le seul endroit où l'on développe.** Les quatre dépôts de travail. |
| `Z7-PROD\` | Dernière version **publiée** de chaque projet (clones en lecture seule, HEAD détachée sur `origin/main`). **On n'y développe jamais.** Mise à jour : `OUTILS\synchroniser-prod.ps1`. |
| `DOCUMENTATION\` | Documentation vivante (dépôt Git). |
| `RAPPORTS\` | Historique daté des chantiers (dépôt Git). |
| `OUTILS\` | Scripts PowerShell : prérequis, installation, démarrage/arrêt, reset DEV, tests, état, synchro PROD. |
| `BACKUPS\` | Sauvegardes **chiffrées uniquement**. |
| `RESSOURCES\`, `ARCHIVES\` | Cahiers des charges, DA ; anciennes copies (lecture seule). |

## Les dépôts officiels — et eux seuls

| | chemin de travail |
|---|---|
| Frontend (Z7 Competition) | `C:\Z7\Z7-DEV\Z7-frontend` |
| Backend (Z7 Competition) | `C:\Z7\Z7-DEV\z7-backend` |
| Z7 Company (ex-site administrateur) | `C:\Z7\Z7-DEV\Z7-site-administrateur` |
| Client App (logiciel organisateur) | `C:\Z7\Z7-DEV\z7-client-app` |
| Documentation globale | `C:\Z7\DOCUMENTATION` |

Espace de travail : `C:\Z7\Z7-DEV\Z7-DEV.code-workspace`.

**Ne jamais modifier** : `C:\Z7\Z7-PROD\`, l'ancien dossier
`C:\Users\L3nny\Z7-github\` (conservé jusqu'à validation de la migration),
une copie du Bureau, un dossier `-main`, `-hotfix`, une sauvegarde ou une
archive.

**Ne jamais créer** d'autre clone, copie, worktree ou dossier hotfix
**sans autorisation explicite de Lenny** : `Z7-DEV` et `Z7-PROD` sont les
seules copies prévues.

> ⚠️ **Si plusieurs copies existent : NE JAMAIS CHOISIR.** Demander.

## DEV ≠ recette ≠ production

| | ce que c'est |
|---|---|
| **DEV** | `:5500` (site), `:5501` (Z7 Company), `:5173` (client app) → backend local `:5000` → MongoDB DEV locale (`Z7-DEV\_donnees\mongodb`). **Données FICTIVES**, bandeau bleu « DEV ». |
| **RECETTE FICTIVE** | `:5503` et les autres recettes locales. Base en mémoire, jetée à l'arrêt. |
| **PRODUCTION LOCALE (volontaire)** | `localStorage.z7_cible_api = 'prod'` sur `:5500`/`:5501` : la vraie API, **bandeau rouge**, écritures réelles. Jamais par défaut, jamais sans l'accord de Lenny. |
| **PRODUCTION** | `z7competition.com` → Render → MongoDB Atlas. Le vrai compte de Lenny. |

**Ne jamais présenter une donnée de DEV ou de recette comme venant du vrai
compte.** Nommer l'environnement à chaque fois qu'un chiffre est cité.

## Git

Un **commit local est un point de sauvegarde**. Il ne met rien en ligne,
ne fusionne rien, ne déploie rien.

Branches : `t1-page-tournoi` = branche de **travail** (un push dessus ne
déploie rien) ; `main` = **production** (Render pour le backend, Vercel
pour le site).

**Jamais sans l'autorisation explicite de Lenny** : `push`, `merge`,
déploiement, `reset`, `revert`, ou toute opération touchant la
production.

Quand Lenny valide une modification et demande de la conserver :
commit local au format `type(portée): description`.

```
feat(podium): valide top 3 avec bannières
fix(accueil): corrige footer responsive
feat(1v1): valide cartes défis publiques
```

## Deux interdits qui ne se discutent pas

- **Aucun secret** affiché, copié ou commité : mot de passe, clé d'API,
  jeton, cookie, URI MongoDB, donnée personnelle. **Aucun `.env` de
  production dans `C:\Z7`** ; un secret local éventuel va dans
  `%USERPROFILE%\.z7-secrets\` (hors `C:\Z7`, hors Git, hors clé USB).
- **Ne jamais prétendre qu'une modification est validée** si Lenny ne
  l'a pas dit explicitement. « Mesuré » et « validé » sont deux choses
  différentes.

## Propre à ce dépôt

- `npm run dev` / `npm start` (Vite en développement) vise le **backend de
  DEV** (`src/config.ts`) ; le paquet construit (`npm run build`,
  `build:electron`) vise la **production**.
- Le parser des parties est en **.NET 8** (`parser/net8.0`).
- `dist/` et `release/` sont des **sorties de construction** : ne pas
  les éditer à la main.
- Ce qu'il envoie alimente des classements **dotés en argent réel**.
