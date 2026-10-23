// ============================================================
//  src/components/CodesPartie.tsx  --  GAMES ET CODES DE LA MANCHE
// ============================================================
//  23/10/2026. Meme moteur que le panel web (z7-backend, utils/codePartie.js) :
//    - LECTURE de l'etat : GET /tournaments/:id/stages/:n/game-codes (session
//      de l'organisateur) — le serveur ne rend le code qu'a qui gere le tournoi ;
//    - GESTES : POST /bot/send-pp-code avec `action` (clef de l'organisateur)
//      — modifier, renvoyer, cloturer. L'ouverture d'une game reste le champ
//      « Code PP » de la barre (nouveau code = nouvelle game).
//  Aucune regle n'est refaite ici (eligibilite, fenetre, cloture : serveur).
//  Aucun code n'est stocke localement ni ecrit dans un journal.
//  Un geste a la fois (verrou), confirmation explicite, etat relu apres
//  chaque geste et toutes les 15 s ; un refus « etat perime » relit aussitot.
import { useCallback, useEffect, useRef, useState } from 'react';
import { appelApi } from '../reseau';
import { LIBELLES_ETAT, codeSaisiValide, corpsGeste, etatGame, gestesPermis, heureParis, lireRefus, resteFenetre, type EtatGame, type GameServeur, type Geste } from './codesPartieLogique';

const COULEURS: Record<EtatGame, string> = { actif: '#4ade80', modifie: '#33C6FF', expire: '#f59e0b', cloture: 'rgba(255,255,255,0.35)' };

export default function CodesPartie({ tournamentId, stageIndex, stageName, clef, jeton, rafraichir }: {
  tournamentId: string; stageIndex: number; stageName: string; clef: string; jeton: string; rafraichir: number;
}) {
  const [games, setGames] = useState<GameServeur[] | null>(null);
  const [erreurLecture, setErreurLecture] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [retour, setRetour] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  const [edition, setEdition] = useState<{ partie: number; code: string } | null>(null);
  const [maintenant, setMaintenant] = useState(Date.now());
  const verrou = useRef(false);

  const lire = useCallback(async () => {
    const r = await appelApi<{ data: GameServeur[] }>(`/tournaments/${encodeURIComponent(tournamentId)}/stages/${stageIndex}/game-codes`, { jeton });
    if (r.ok && r.data) { setGames(r.data.data || []); setErreurLecture(''); }
    else setErreurLecture(lireRefus(r).message);
  }, [tournamentId, stageIndex, jeton]);

  useEffect(() => { setGames(null); setEdition(null); setRetour(null); void lire(); }, [lire, rafraichir]);
  useEffect(() => { const t = setInterval(() => void lire(), 15000); return () => clearInterval(t); }, [lire]);
  useEffect(() => { const t = setInterval(() => setMaintenant(Date.now()), 1000); return () => clearInterval(t); }, []);

  async function geste(g: GameServeur, nom: Geste, code?: string) {
    if (verrou.current) return;
    if (nom === 'modifier') {
      const c = codeSaisiValide(code || '');
      if (!c) { setRetour({ type: 'erreur', texte: 'Nouveau code invalide : 1 à 64 caractères, sans retour à la ligne.' }); return; }
      if (!confirm(`Game ${g.partie} : remplacer le code « ${g.code || '?'} » par « ${c} » ?\n\nL’ancien code ne sera plus accessible aux joueurs ; le nouveau leur est envoyé.`)) return;
      code = c;
    }
    if (nom === 'renvoyer' && !confirm(`Game ${g.partie} : renvoyer le code en vigueur ?\n\nLe code ne change pas. Il repart aux joueurs autorisés qui ne l’ont pas reçu.`)) return;
    if (nom === 'cloturer' && !confirm(`Clôturer la game ${g.partie} ?\n\nSon code ne sera plus envoyé à personne (ni renvoi, ni nouvel inscrit). Ce geste est définitif.`)) return;
    verrou.current = true;
    setEnCours(`${nom}:${g.partie}`);
    setRetour(null);
    try {
      let r = await appelApi('/bot/send-pp-code', { methode: 'POST', clef, delaiMs: 120000, corps: corpsGeste(nom, tournamentId, stageIndex, g.partie, code) });
      //  Renvoi : tout le monde l'a deja recu → proposer le renvoi a TOUS (choix explicite).
      if (nom === 'renvoyer' && r.ok && r.data && r.data.count === 0 && r.data.dejaEnvoyes > 0
          && confirm(`Tous les joueurs autorisés (${r.data.dejaEnvoyes}) ont déjà reçu ce code. Le renvoyer volontairement à TOUS ?`)) {
        r = await appelApi('/bot/send-pp-code', { methode: 'POST', clef, delaiMs: 120000, corps: corpsGeste('renvoyer', tournamentId, stageIndex, g.partie, undefined, true) });
      }
      if (r.ok && r.data) {
        const d = r.data;
        const texte = nom === 'cloturer' ? `Game ${g.partie} clôturée.`
          : nom === 'modifier' ? `Game ${g.partie} : nouveau code envoyé à ${d.count} joueur(s) (version ${d.version}).${d.echecs ? ` Échec pour ${d.echecs}.` : ''}`
          : `Game ${g.partie} : code renvoyé à ${d.count} joueur(s).${d.dejaEnvoyes ? ` Déjà reçu par ${d.dejaEnvoyes}.` : ''}${d.echecs ? ` Échec pour ${d.echecs}.` : ''}`;
        setRetour({ type: 'ok', texte });
        setEdition(null);
      } else {
        const refus = lireRefus(r);
        setRetour({ type: 'erreur', texte: refus.aRelire ? `${refus.message} L’état a été rechargé.` : refus.message });
      }
    } finally {
      verrou.current = false;
      setEnCours(null);
      await lire();
    }
  }

  const occupe = enCours !== null;
  const bouton = (couleur: string, actif: boolean): React.CSSProperties => ({
    padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: actif ? 'pointer' : 'not-allowed',
    background: couleur, color: '#fff', opacity: actif ? 1 : 0.4, whiteSpace: 'nowrap',
  });

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }} aria-label="Codes de partie">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>🔑 Codes de partie — {stageName}</div>
        <button onClick={() => void lire()} disabled={occupe} style={bouton('rgba(255,255,255,0.08)', !occupe)}>↻ Actualiser</button>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
        Un nouveau code (champ « Code PP ») ouvre une nouvelle game. Pour corriger le code d’une game : « Modifier » (l’ancien devient inaccessible).
        Un joueur éligible qui s’inscrit dans les 5 minutes reçoit le code en vigueur ; après, plus de code tardif.
      </div>
      {retour && (
        <div role={retour.type === 'erreur' ? 'alert' : 'status'} style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12,
          background: retour.type === 'erreur' ? 'rgba(239,68,68,0.12)' : 'rgba(74,222,128,0.12)', color: retour.type === 'erreur' ? '#fca5a5' : '#86efac' }}>{retour.texte}</div>
      )}
      {erreurLecture && <div role="alert" style={{ marginBottom: 10, fontSize: 12, color: '#fca5a5' }}>État des games illisible : {erreurLecture}</div>}
      {games === null && !erreurLecture && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Chargement…</div>}
      {games && games.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Aucun code publié dans cette manche.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(games || []).map((g) => {
          const etat = etatGame(g, maintenant);
          const permis = gestesPermis(etat);
          const reste = resteFenetre(g, maintenant);
          const verrouille = (x: Geste) => occupe || !permis.includes(x);
          return (
            <div key={g.partie} data-game={g.partie} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: `3px solid ${COULEURS[etat]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <strong style={{ color: '#fff', fontSize: 13 }}>Game {g.partie}</strong>
                <span style={{ fontSize: 12, color: COULEURS[etat] }}>{LIBELLES_ETAT[etat]}{reste ? ` (${reste})` : ''}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  code <code style={{ color: etat === 'cloture' ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: 700 }}>{g.code || '—'}</code>
                  {g.version > 1 ? ` · version ${g.version}` : ''} · publié à {heureParis(g.ouverteLe)}{g.clotureLe ? ` · clôturé à ${heureParis(g.clotureLe)}` : ''} · reçu par {g.remises}
                </span>
                <span style={{ flex: 1 }} />
                {permis.length > 0 && <>
                  <button disabled={verrouille('modifier')} onClick={() => setEdition({ partie: g.partie, code: '' })} style={bouton('linear-gradient(135deg,#33C6FF,#6366f1)', !verrouille('modifier'))}>✏️ Modifier</button>
                  <button disabled={verrouille('renvoyer')} onClick={() => void geste(g, 'renvoyer')} style={bouton('linear-gradient(135deg,#6366f1,#8b5cf6)', !verrouille('renvoyer'))}>{enCours === `renvoyer:${g.partie}` ? '⏳' : '📨'} Renvoyer</button>
                  <button disabled={verrouille('cloturer')} onClick={() => void geste(g, 'cloturer')} style={bouton('linear-gradient(135deg,#f59e0b,#ef4444)', !verrouille('cloturer'))}>{enCours === `cloturer:${g.partie}` ? '⏳' : '🔒'} Clôturer</button>
                </>}
              </div>
              {edition && edition.partie === g.partie && permis.includes('modifier') && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <input aria-label={`Nouveau code de la game ${g.partie}`} autoFocus value={edition.code} placeholder="Nouveau code"
                    onChange={(e) => setEdition({ partie: g.partie, code: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
                    style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', width: 160 }} />
                  <button disabled={occupe} onClick={() => void geste(g, 'modifier', edition.code)} style={bouton('linear-gradient(135deg,#4ade80,#22c55e)', !occupe)}>{enCours === `modifier:${g.partie}` ? '⏳ Envoi…' : 'Valider le nouveau code'}</button>
                  <button disabled={occupe} onClick={() => setEdition(null)} style={bouton('rgba(255,255,255,0.08)', !occupe)}>Annuler</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
