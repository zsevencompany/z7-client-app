# z7-client-app — dépôt officiel APP / CLIENT

**`C:\Users\L3nny\Z7-github\z7-client-app`**

Le logiciel organisateur (Electron) : lecture des parties, envoi des
résultats.

## Avant toute modification

1. **Nommer le dépôt** concerné.
2. **Afficher son chemin absolu** et vérifier qu'il commence par
   `C:\Users\L3nny\Z7-github\`.
3. **Lire `git status`**.
4. **Signaler tout travail non commité** avant d'en commencer un autre.

## Les quatre dépôts officiels — et eux seuls

| | chemin |
|---|---|
| Frontend | `C:\Users\L3nny\Z7-github\Z7-frontend` |
| Backend | `C:\Users\L3nny\Z7-github\z7-backend` |
| Admin / Z7 Company | `C:\Users\L3nny\Z7-github\Z7-site-administrateur` |
| App / Client | `C:\Users\L3nny\Z7-github\z7-client-app` |

Espace de travail : `Z7-github\Z7 Competition.code-workspace`.

**Ne jamais modifier** une copie du Bureau, un dossier `-main`,
`-hotfix`, une sauvegarde ou une archive.

**Ne jamais créer** de clone, de copie, de worktree ni de dossier
hotfix **sans autorisation explicite de Lenny**.

> ⚠️ **Si plusieurs copies existent : NE JAMAIS CHOISIR.** Demander.

## Recette ≠ réel

| | ce que c'est |
|---|---|
| **RECETTE FICTIVE** | `:5503` et les autres recettes locales. Données inventées, serveur jamais déployé. |
| **DONNÉES RÉELLES** | Live Server `:5500` → l'API Render → MongoDB Atlas. Le vrai compte de Lenny. |
| **PRODUCTION** | `z7competition.com`. |

**Ne jamais présenter une donnée de recette comme venant du vrai
compte.** Nommer l'environnement à chaque fois qu'un chiffre est cité.

## Git

Un **commit local est un point de sauvegarde**. Il ne met rien en ligne,
ne fusionne rien, ne déploie rien.

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
  jeton, cookie, URI MongoDB, donnée personnelle.
- **Ne jamais prétendre qu'une modification est validée** si Lenny ne
  l'a pas dit explicitement. « Mesuré » et « validé » sont deux choses
  différentes.

## Propre à ce dépôt

- `dist/` et `release/` sont des **sorties de construction** : ne pas
  les éditer à la main.
- Ce qu'il envoie alimente des classements **dotés en argent réel**.
