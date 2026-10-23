// ============================================================
//  src/components/codesPartieLogique.ts  --  CODES DE PARTIE : LOGIQUE D'AFFICHAGE
// ============================================================
//  23/10/2026. Le moteur des codes vit sur le SERVEUR (z7-backend,
//  utils/codePartie.js) : etat versionne PAR GAME, fenetre active de
//  5 minutes, modifier / renvoyer / cloturer, eligibilite des joueurs,
//  audit sans le code. Le logiciel n'en refait AUCUNE regle : il lit l'etat
//  (GET /tournaments/:id/stages/:n/game-codes, meme route que le panel web)
//  et envoie les gestes (POST /bot/send-pp-code + `action`).
//
//  Ce module ne fait que TRADUIRE pour l'ecran : etat lisible d'une game,
//  gestes proposes, message d'un refus du serveur. Le serveur reste juge :
//  un geste propose ici peut toujours etre refuse, et le refus est affiche.
// ============================================================

export interface GameServeur {
  partie: number;
  statut: 'active' | 'closed';
  version: number;
  code?: string | null;
  ouverteLe: string;
  fenetreJusquA: string;
  fenetreActive: boolean;
  clotureLe: string | null;
  remises: number;
}

export type EtatGame = 'actif' | 'modifie' | 'expire' | 'cloture';
export type Geste = 'modifier' | 'renvoyer' | 'cloturer';

//  `actif`   : code publie, fenetre d'inscription encore ouverte ;
//  `modifie` : code corrige (version > 1), fenetre encore ouverte ;
//  `expire`  : fenetre de 5 min passee — la game continue, aucun nouvel
//              inscrit ne recoit plus ce code ;
//  `cloture` : plus aucun envoi possible.
export function etatGame(g: GameServeur, maintenant: number = Date.now()): EtatGame {
  if (g.statut === 'closed') return 'cloture';
  const ouverte = new Date(g.fenetreJusquA).getTime() > maintenant;
  if (!ouverte) return 'expire';
  return g.version > 1 ? 'modifie' : 'actif';
}

export const LIBELLES_ETAT: Record<EtatGame, string> = {
  actif: 'Code actif — fenêtre d’inscription ouverte',
  modifie: 'Code modifié — fenêtre d’inscription ouverte',
  expire: 'Fenêtre expirée — plus aucun nouvel inscrit ne reçoit ce code',
  cloture: 'Clôturée — le code ne part plus',
};

//  Gestes proposes. Une game cloturee n'en a aucun. Apres la fenetre, la
//  game reste corrigeable et renvoyable (aux joueurs qui y avaient droit).
export function gestesPermis(etat: EtatGame): Geste[] {
  return etat === 'cloture' ? [] : ['modifier', 'renvoyer', 'cloturer'];
}

//  Temps restant de la fenetre, « m:ss », ou null si elle est passee.
export function resteFenetre(g: GameServeur, maintenant: number = Date.now()): string | null {
  const ms = new Date(g.fenetreJusquA).getTime() - maintenant;
  if (g.statut === 'closed' || ms <= 0) return null;
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

//  Heure de Paris, sans dependre du fuseau du poste.
export function heureParis(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
}

//  Code saisi : meme regle que le serveur (1 a 64 caracteres, sans controle).
export function codeSaisiValide(brut: string): string | null {
  const c = (brut || '').trim();
  if (!c || c.length > 64 || /[\u0000-\u001f\u007f]/.test(c)) return null;
  return c;
}

//  Corps du geste, tel que le serveur l'attend (routes/bot.js, send-pp-code).
export function corpsGeste(geste: Geste, tournamentId: string, stageIndex: number, partie: number, code?: string, renvoyerATous = false) {
  const base = { tournamentId, stageIndex, partie, action: geste };
  if (geste === 'modifier') return { ...base, code };
  if (geste === 'renvoyer') return { ...base, renvoyer: renvoyerATous };
  return base;
}

//  Un refus du serveur, dit simplement. `aRelire` : l'etat affiche est
//  peut-etre perime (game changee ailleurs) — l'ecran doit le recharger.
export function lireRefus(r: { status: number; data: any; message: string }): { message: string; aRelire: boolean } {
  const code = r.data && r.data.code;
  const MESSAGES: Record<string, string> = {
    PARTIE_CLOTUREE: 'Cette game est déjà clôturée : son code ne part plus.',
    CODE_REMPLACE: 'Ce code a été remplacé : il ne peut plus être envoyé.',
    CODE_IDENTIQUE: 'C’est déjà le code en vigueur. Pour le renvoyer, utilisez « Renvoyer ».',
    CODE_DIFFERENT: 'Un renvoi repart avec le code en vigueur. Pour changer le code, utilisez « Modifier ».',
    CODE_DEJA_UTILISE: 'Ce code est déjà celui d’une autre game de cette manche.',
    CONFLIT: 'La game a changé entre-temps (autre poste ou panel web).',
    PARTIE_INCONNUE: 'Cette game n’existe plus dans cette manche.',
    CODE_INVALIDE: 'Code invalide : 1 à 64 caractères, sans retour à la ligne.',
    AUCUN_QUALIFIE: 'Aucun joueur qualifié validé pour cette manche.',
  };
  const relire = ['PARTIE_CLOTUREE', 'CONFLIT', 'PARTIE_INCONNUE', 'CODE_REMPLACE'].includes(code);
  if (code && MESSAGES[code]) return { message: MESSAGES[code], aRelire: relire };
  if (r.status === 401) return { message: 'Session ou clé expirée : reconnectez-vous.', aRelire: false };
  if (r.status === 403) return { message: 'Droits insuffisants : ce tournoi n’est pas le vôtre.', aRelire: false };
  if (r.status === 0) return { message: r.message || 'Serveur injoignable.', aRelire: false };
  return { message: r.message || `Erreur serveur (HTTP ${r.status}).`, aRelire: false };
}
