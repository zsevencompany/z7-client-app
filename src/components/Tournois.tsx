import React, { useState, useEffect, useRef } from 'react';

import { API } from '../config';

// ── Dropdown custom ──────────────────────────────────────────
function Dropdown({ value, onChange, options, placeholder, disabled }: {
  value: string;
  onChange: (val: string, item: any) => void;
  options: { value: string; label: string; item: any }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);
  React.useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => !disabled && setOpen(o => !o)} style={{
        width: '100%', padding: '10px 14px',
        background: open ? 'rgba(51,198,255,0.06)' : 'rgba(255,255,255,0.05)',
        border: open ? '1px solid rgba(51,198,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, color: selected ? '#fff' : 'rgba(255,255,255,0.3)',
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' as const,
        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
      }}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          background: 'rgba(13,17,23,0.98)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value, o.item); setOpen(false); }}
              style={{
                width: '100%', padding: '8px 12px', border: 'none', borderRadius: 7,
                background: o.value === value ? 'rgba(51,198,255,0.15)' : 'transparent',
                color: o.value === value ? '#33C6FF' : 'rgba(255,255,255,0.6)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (o.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Interfaces ───────────────────────────────────────────────
interface Player {
  epicId: string;
  displayName: string;
  placement: number | null;
  eliminations: number;
  platform: string;
  isBot: boolean;
  teamIndex: number | null;
}

interface ReplayItem {
  id: string;
  name: string;
  date: Date;
  state: 'reading' | 'stabilizing' | 'parsing' | 'sent' | 'failed' | 'deleted';
  totalPlayers: number;
  tournamentId: string;
  stageId: string;
}

interface GameItem {
  id: string;
  date: Date;
  players: Player[];
  tournamentId: string;
  stageId: string;
}

interface LeaderboardEntry {
  name: string;
  epicId: string;
  finalPoints: number;
  kills: number;
  wins: number;
  games: number;
  averagePlacement: number;
}

interface TournoisProps {
  session: {
    apiKey: string;
    organizerId: string;
    organizerName: string;
    token: string;
  };
}

export default function Tournois({ session }: TournoisProps) {
  const [tournaments, setTournaments]               = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [selectedStage, setSelectedStage]           = useState<any>(null);
  const [surveillanceActive, setSurveillanceActive] = useState(false);
  const [replayHistory, setReplayHistory]           = useState<ReplayItem[]>([]);
  const [tournamentGames, setTournamentGames]       = useState<GameItem[]>([]);
  const [parsedPlayers, setParsedPlayers]           = useState<Player[]>([]);
  const [showResults, setShowResults]               = useState(false);
  const [searchQuery, setSearchQuery]               = useState('');
  const [lbSortKey, setLbSortKey]                   = useState<'points'|'kills'|'wins'|'avgPlacement'|'games'>('points');
  const [lbDisplayMode, setLbDisplayMode]           = useState<'teams'|'players'>('teams');
  const [selectedGame, setSelectedGame]             = useState<GameItem | null>(null);
  const [actionMenu, setActionMenu]                 = useState<string | null>(null);
  const [disqualified, setDisqualified]             = useState<Set<string>>(new Set());
  const [pointsMods, setPointsMods]                 = useState<Map<string, number>>(new Map());
  const [showPointsModal, setShowPointsModal]       = useState(false);
  const [pointsType, setPointsType]                 = useState<'add' | 'remove'>('add');
  const [pointsPlayer, setPointsPlayer]             = useState('');
  const [pointsPlayerName, setPointsPlayerName]     = useState('');
  const [pointsValue, setPointsValue]               = useState('');
  const [pendingGameId, setPendingGameId]           = useState<string | null>(null);
  const [ppCode, setPpCode]                           = useState('');
  const [ppSending, setPpSending]                     = useState(false);
  const [pendingReplayName, setPendingReplayName]   = useState<string | null>(null);
  const [gameModalMode, setGameModalMode]           = useState<'teams'|'players'>('teams');

  // ── REFS pour éviter le problème de closure dans les listeners Electron ──
  const tournamentGamesRef = useRef<GameItem[]>([]);
  useEffect(() => { tournamentGamesRef.current = tournamentGames; }, [tournamentGames]);

  const disqualifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => { disqualifiedRef.current = disqualified; }, [disqualified]);

  const pointsModsRef = useRef<Map<string, number>>(new Map());
  useEffect(() => { pointsModsRef.current = pointsMods; }, [pointsMods]);

  const selectedTournamentRef = useRef<any>(null);
  useEffect(() => { selectedTournamentRef.current = selectedTournament; }, [selectedTournament]);

  const selectedStageRef = useRef<any>(null);
  useEffect(() => { selectedStageRef.current = selectedStage; }, [selectedStage]);

  const replayAPI = (window as any).replayAPI;

  // Charger tournois depuis API — clef externe en priorité
  useEffect(() => {
    const activeKey = localStorage.getItem('z7_external_api_key') || session.apiKey;
    fetch(`${API}/tournaments/my`, { headers: { 'x-api-key': activeKey } })
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setTournaments(d.data); })
      .catch(() => {});
  }, [session.apiKey]);

  // Charger données sauvegardées
  useEffect(() => {
    const savedHistory = localStorage.getItem('z7_replay_history');
    if (savedHistory) setReplayHistory(JSON.parse(savedHistory).map((r: any) => ({ ...r, date: new Date(r.date) })));
    const savedGames = localStorage.getItem('z7_tournament_games');
    if (savedGames) setTournamentGames(JSON.parse(savedGames).map((g: any) => ({ ...g, date: new Date(g.date) })));
    const savedDQ = localStorage.getItem('z7_disqualified');
    if (savedDQ) setDisqualified(new Set(JSON.parse(savedDQ)));
    const savedMods = localStorage.getItem('z7_points_mods');
    if (savedMods) setPointsMods(new Map(JSON.parse(savedMods)));
  }, []);

  useEffect(() => {
    if (!selectedTournament || !selectedStage) return;
    const key = `z7_replay_history_${selectedTournament._id}_${selectedStage.name}`;
    localStorage.setItem(key, JSON.stringify(replayHistory));
  }, [replayHistory, selectedTournament, selectedStage]);

  useEffect(() => {
    if (!selectedTournament || !selectedStage) return;
    const key = `z7_tournament_games_${selectedTournament._id}_${selectedStage.name}`;
    localStorage.setItem(key, JSON.stringify(tournamentGames));
  }, [tournamentGames, selectedTournament, selectedStage]);
  useEffect(() => { localStorage.setItem('z7_disqualified', JSON.stringify(Array.from(disqualified))); }, [disqualified]);
  useEffect(() => { localStorage.setItem('z7_points_mods', JSON.stringify(Array.from(pointsMods))); }, [pointsMods]);

  // Listeners surveillance Electron
  useEffect(() => {
    if (!replayAPI) return;
    replayAPI.onSurveillanceStatus((status: any) => {
      const t = selectedTournamentRef.current;
      const st = selectedStageRef.current;
      if ((status.status === 'reading' || status.status === 'in-progress') && status.replayName && t && st) {
        setReplayHistory(prev => {
          if (prev.some(r => r.name === status.replayName)) {
            return prev.map(r => r.name === status.replayName && r.state === 'stabilizing' ? { ...r, state: 'reading' } : r);
          }
          return [{ id: `r_${Date.now()}`, name: status.replayName, date: new Date(), state: 'reading', totalPlayers: 0, tournamentId: t._id, stageId: st.name }, ...prev];
        });
      }
      if (status.status === 'stabilizing' && status.replayName) {
        setReplayHistory(prev => prev.map(r => r.name === status.replayName ? { ...r, state: 'stabilizing' } : r));
      }
      if (status.status === 'parsing' && status.replayName) {
        setReplayHistory(prev => prev.map(r => r.name === status.replayName ? { ...r, state: 'parsing' } : r));
      }
    });
    replayAPI.onReplayParsed((data: any) => {
      const t = selectedTournamentRef.current;
      const st = selectedStageRef.current;
      if (!data.success || !t || !st) return;
      const real = data.players.filter((p: any) => !p.isBot);
      setReplayHistory(prev => prev.map(r => r.name === data.replayName ? { ...r, totalPlayers: real.length, state: 'sent' } : r));
      setParsedPlayers(real);
      sendResultsAuto(data.players, data.replayName);
    });
  }, [replayAPI]);

  // ── Calcul points ─────────────────────────────────────────
  function calcPoints(placement: number, kills: number, stage?: any): number {
    const st = stage || selectedStageRef.current;
    if (!st) return 0;
    let pts = 0;
    const killPts  = st.pointsPerKill || 0;
    const maxKills = st.maxKills || 999;
    pts += Math.min(kills, maxKills) * killPts;
    const placements = st.placements || {};
    const sorted = Object.entries(placements)
      .map(([k, v]) => ({ top: parseInt(k.replace('top', '')), pts: v as number }))
      .sort((a, b) => a.top - b.top);
    for (const { top, pts: placePts } of sorted) {
      if (placement <= top) pts += placePts;
    }
    return pts;
  }

  // ── Leaderboard ───────────────────────────────────────────
  function getLeaderboardByTeam(): LeaderboardEntry[] {
  //  LA VUE EQUIPES  (lot T1.5, CDC-438 a 440)
  //
  //  CE QU'ELLE FAISAIT. Elle regroupait les joueurs en rapprochant des
  //  PSEUDOS decoupes dans une chaine, et n'acceptait que les PAIRES
  //  RECIPROQUES : un trio ou un squad etait affiche comme trois ou
  //  quatre joueurs solos. Elle affichait ensuite les points du
  //  « meilleur » joueur de l'equipe, ce qui perdait les ajustements
  //  manuels infliges aux autres membres.
  //
  //  CE QU'ELLE FAIT. Elle regroupe sur les IDENTIFIANTS de la derniere
  //  partie, ce qui vaut pour deux joueurs comme pour quatre. La clef
  //  d'equipe est la liste triee de ces identifiants : deux equipes
  //  distinctes ne peuvent pas la partager, donc un joueur n'apparait
  //  jamais dans deux equipes (CDC-440) — par construction, pas par
  //  verification apres coup.
  //
  //  Les points de l'equipe sont ceux de l'equipe, portes a l'identique
  //  par chacun de ses membres, AUGMENTES de la somme des ajustements
  //  individuels : une penalite infligee a un joueur doit peser sur son
  //  equipe, sinon la sanction ne sert a rien.
    const filtered = selectedTournament && selectedStage
      ? tournamentGames.filter(g => g.tournamentId === selectedTournament._id && g.stageId === selectedStage.name && !(g as any).deleted)
      : [];
    const modeEquipe = estModeEquipe(selectedTournament);

    const playerStats = new Map<string, any>();
    partiesOrdonnees(filtered).forEach(game => {
      const reels = game.players.filter(p => !p.isBot);
      equipesDeLaPartie(reels, modeEquipe).forEach(membres => {
        const placement   = membres[0].placement || 999;
        const killsEquipe = membres.reduce((s, p) => s + p.eliminations, 0);
        const pts         = calcPoints(placement, killsEquipe);
        const wins        = placement === 1 ? 1 : 0;
        membres.forEach(p => {
          //  La composition de la DERNIERE partie fait foi.
          const equipe = membres.map(x => x.epicId).sort();
          const existing = playerStats.get(p.epicId);
          if (existing) {
            existing.points += pts; existing.kills += killsEquipe;
            existing.wins += wins; existing.games += 1;
            existing.placements.push(placement);
            existing.equipe = equipe;
          } else {
            playerStats.set(p.epicId, {
              name: p.displayName, epicId: p.epicId, equipe,
              points: pts, kills: killsEquipe, wins, games: 1, placements: [placement],
            });
          }
        });
      });
    });

    //  Une equipe n'est retenue que si TOUS ses membres declarent la meme
    //  composition. Une declaration a sens unique — un joueur a change
    //  d'equipe en cours de manche — ne fusionne rien : chacun reste seul.
    const memeEquipe = (a: string[], b: string[]) =>
      a.length === b.length && a.every((x, i) => x === b[i]);

    const groupes = new Map<string, any[]>();
    playerStats.forEach(joueur => {
      const coherente = joueur.equipe.length > 1 && joueur.equipe.every((id: string) => {
        const autre = playerStats.get(id);
        return autre && memeEquipe(autre.equipe, joueur.equipe);
      });
      const cle = coherente ? joueur.equipe.join('|') : joueur.epicId;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle)!.push(joueur);
    });

    const lignes: any[] = [];
    groupes.forEach((membres, cle) => {
      const ordonnes = [...membres].sort((a, b) => String(a.epicId).localeCompare(String(b.epicId)));
      //  Les points de l'equipe sont identiques chez chaque membre : on
      //  les compte UNE FOIS, et on y ajoute la somme des ajustements.
      const pointsEquipe = ordonnes.reduce((m, p) => Math.max(m, p.points), 0);
      const ajustements  = ordonnes.reduce((s, p) => s + (pointsMods.get(p.epicId) || 0), 0);
      const placements   = ordonnes[0].placements || [];
      lignes.push({
        name: ordonnes.map(p => p.name).join(' & '),
        epicId: cle,
        finalPoints: pointsEquipe + ajustements,
        kills: ordonnes.reduce((m, p) => Math.max(m, p.kills), 0),
        wins:  ordonnes.reduce((m, p) => Math.max(m, p.wins), 0),
        games: ordonnes.reduce((m, p) => Math.max(m, p.games), 0),
        averagePlacement: placements.length
          ? Math.round(placements.reduce((a: number, b: number) => a + b, 0) / placements.length) : 999,
      });
    });

    return lignes.sort((a, b) => b.finalPoints - a.finalPoints);
  }

  function getLeaderboard(): LeaderboardEntry[] {
    const filtered = selectedTournament && selectedStage
      ? tournamentGames.filter(g => g.tournamentId === selectedTournament._id && g.stageId === selectedStage.name && !(g as any).deleted)
      : [];
    const map = new Map<string, any>();
    filtered.forEach(game => {
      game.players.filter(p => !p.isBot).forEach(p => {
        const placement = p.placement || 999;
        const kills = p.eliminations;
        const pts = calcPoints(placement, kills);
        const wins = placement === 1 ? 1 : 0;
        const existing = map.get(p.epicId);
        if (existing) {
          existing.points += pts; existing.kills += kills; existing.wins += wins;
          existing.games += 1; existing.placements.push(placement);
        } else {
          map.set(p.epicId, { name: p.displayName, epicId: p.epicId, points: pts, kills, wins, games: 1, placements: [placement] });
        }
      });
    });
    const all = Array.from(map.values()).map(p => {
      const mod = pointsMods.get(p.epicId) || 0;
      const avgPlacement = p.placements.length
        ? Math.round(p.placements.reduce((a: number, b: number) => a + b, 0) / p.placements.length)
        : 999;
      return { name: p.name, epicId: p.epicId, finalPoints: p.points + mod, kills: p.kills, wins: p.wins, games: p.games, averagePlacement: avgPlacement };
    });
    const active = all.filter(p => !disqualified.has(p.epicId)).sort((a, b) => b.finalPoints - a.finalPoints);
    const dqd    = all.filter(p => disqualified.has(p.epicId)).sort((a, b) => b.finalPoints - a.finalPoints);
    return [...active, ...dqd];
  }

  // ── Envoi code PP ───────────────────────────────────────────
  // ============================================================
  //  LE CODE D'UNE MANCHE  (CDC-421)
  // ============================================================
  //  Ce bouton envoyait le code a TOUS LES INSCRITS, sans dire de quelle
  //  manche il s'agissait — le serveur ne le demandait pas. Un joueur
  //  elimine en qualification recevait donc le code de la demi-finale,
  //  c'est-a-dire l'acces qu'on venait precisement de lui retirer.
  //
  //  La manche selectionnee est desormais envoyee, et c'est le SERVEUR
  //  qui en deduit les destinataires : les inscrits pour la premiere
  //  manche, les qualifies valides ensuite.
  async function sendPPCode() {
    if (!selectedTournament || !ppCode.trim()) return;
    if (!selectedStage) { alert('S\u00e9lectionne d\'abord la manche concern\u00e9e.'); return; }
    const stageIndex = (selectedTournament.stages || []).indexOf(selectedStage);
    if (stageIndex < 0) { alert('Manche introuvable dans ce tournoi.'); return; }
    //  On annonce QUI va le recevoir, pas seulement combien.
    const cible = stageIndex === 0
      ? 'tous les inscrits ayant un compte Epic li\u00e9'
      : `les joueurs qualifi\u00e9s pour \u00ab ${selectedStage.name} \u00bb`;
    if (!confirm(`Envoyer le code "${ppCode}" à ${cible} ?`)) return;
    setPpSending(true);
    const activeKey = localStorage.getItem('z7_external_api_key') || session.apiKey;
    try {
      const res = await fetch(`${API}/bot/send-pp-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
        body: JSON.stringify({
          tournamentId: selectedTournament._id,
          code: ppCode,
          tournamentName: selectedTournament.name,
          stageIndex,
        }),
      });
      const data = await res.json();
      if (data.success) { alert(`✅ Code envoyé à ${data.count} joueurs !`); setPpCode(''); }
      else alert('❌ ' + data.message);
    } catch { alert('❌ Erreur serveur'); }
    setPpSending(false);
  }

  // ── Surveillance ──────────────────────────────────────────
  async function startSurveillance() {
    if (!selectedTournament || !selectedStage) { alert('Sélectionnez un tournoi et une manche.'); return; }
    if (!replayAPI) { alert('Replay API non disponible — lancez depuis Electron.'); return; }
    const replayPath = localStorage.getItem('z7_replay_path') || 'C:\\Users\\%USERNAME%\\AppData\\Local\\FortniteGame\\Saved\\Demos';
    const r = await replayAPI.startSurveillance(replayPath);
    if (r.success) setSurveillanceActive(true);
    else alert('Erreur: ' + (r.error || 'Impossible de démarrer'));
  }

  async function stopSurveillance() {
    if (!replayAPI) return;
    await replayAPI.stopSurveillance();
    setSurveillanceActive(false);
  }

  // ── Upload manuel ─────────────────────────────────────────
  async function handleManualUpload() {
    if (!selectedTournament || !selectedStage) { alert('Sélectionnez un tournoi et une manche.'); return; }
    if (!replayAPI) { alert('Replay API non disponible.'); return; }
    const file = await replayAPI.selectFile();
    if (!file.success || !file.filePath) return;
    const result = await replayAPI.parseReplay(file.filePath);
    if (!result.success) { alert('Erreur parsing: ' + result.error); return; }
    const real = result.players.filter((p: any) => !p.isBot);
    const fileName = file.filePath.split('\\').pop() || file.filePath.split('/').pop() || 'Replay';
    const sharedId = `g_${Date.now()}`;
    setParsedPlayers(real);
    setPendingGameId(sharedId);
    setPendingReplayName(fileName);
    setShowResults(true);
  }

  // ==================================================================
  //  LES EQUIPES  (lot T1.5, CDC-438 a 440)
  // ==================================================================
  //  Les parties d'une manche, dans l'ORDRE. La composition retenue pour
  //  un joueur est celle de sa DERNIERE partie : c'est ce que veut dire
  //  « compositions actualisees quand un joueur change de mate ».
  const partiesOrdonnees = (games: GameItem[]) =>
    [...games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  //  Les equipes d'UNE partie, telles que le replay les donne.
  //
  //  DEUX PRECAUTIONS. Un joueur sans `teamIndex` est SEUL : sans cette
  //  garde, tous les joueurs sans indice se retrouvaient dans une meme
  //  « equipe » de cent personnes. Et en mode Solo on ne regroupe jamais,
  //  meme si le replay porte des indices : le mode est ce que
  //  l'organisateur a annonce.
  function equipesDeLaPartie(joueurs: Player[], modeEquipe: boolean) {
    const equipes = new Map<string, Player[]>();
    joueurs.forEach(p => {
      const cle = (modeEquipe && p.teamIndex !== null && p.teamIndex !== undefined)
        ? 'e' + p.teamIndex : 'seul:' + p.epicId;
      if (!equipes.has(cle)) equipes.set(cle, []);
      equipes.get(cle)!.push(p);
    });
    return equipes;
  }

  const MODES_EQUIPE = ['Duo', 'Trio', 'Squad'];
  const estModeEquipe = (t: any) => MODES_EQUIPE.includes(t && t.mode);

  // ── Helper : calcul cumulatif depuis une liste de games ─────
  // Utilise les REFS pour avoir les valeurs à jour dans les listeners Electron
  //
  //  CE QUI A CHANGE (lot T1.5). Ce constructeur envoyait
  //  `currentMate: null` pour TOUS les joueurs : l'information d'equipe
  //  etait pourtant dans le replay, et le site ne pouvait donc jamais
  //  afficher la moindre equipe. Il comptait aussi les eliminations du
  //  seul joueur, alors qu'en Duo/Trio/Squad le placement rapporte a
  //  l'equipe entiere : un duo qui gagnait recevait deux fois la moitie
  //  des points de son placement, jamais le compte juste.
  //
  //  Desormais deux comptes sont tenus cote a cote :
  //    • `points` / `kills`            — ceux de l'EQUIPE, identiques pour
  //                                       chacun de ses membres ;
  //    • `individualPoints` / `individualKills` — la part propre du
  //                                       joueur, pour la vue Joueurs.
  //  Le site affichait deux fois les memes chiffres faute de cette part.
  //
  //  Les coequipiers partent en `mates`, par IDENTIFIANT. `currentMate`
  //  — la chaine de pseudos — continue d'etre rempli pour les lecteurs
  //  anciens, mais plus personne ne s'en sert pour identifier quelqu'un.
  function buildCumulativePayload(games: GameItem[], stage?: any): any[] {
    const st = stage || selectedStageRef.current;
    const modeEquipe = estModeEquipe(selectedTournamentRef.current);
    const playerMap = new Map<string, any>();

    partiesOrdonnees(games).forEach(game => {
      const reels = game.players.filter(p => !p.isBot);
      equipesDeLaPartie(reels, modeEquipe).forEach(membres => {
        //  Le placement est celui de l'EQUIPE, les eliminations comptent
        //  pour l'equipe : les points de la partie sont donc les memes
        //  pour chacun de ses membres.
        const placement   = membres[0].placement || 999;
        const killsEquipe = membres.reduce((s, p) => s + p.eliminations, 0);
        const ptsEquipe   = calcPoints(placement, killsEquipe, st);
        const wins        = placement === 1 ? 1 : 0;

        membres.forEach(p => {
          const ptsPropres = calcPoints(placement, p.eliminations, st);
          const autres = membres.filter(x => x.epicId !== p.epicId);
          const mates  = autres.map(x => ({ epicId: x.epicId, name: x.displayName }));
          const existing = playerMap.get(p.epicId);
          if (existing) {
            existing.points           += ptsEquipe;
            existing.kills            += killsEquipe;
            existing.individualPoints += ptsPropres;
            existing.individualKills  += p.eliminations;
            existing.wins             += wins;
            existing.games            += 1;
            existing.placement         = placement;
            //  La DERNIERE partie fait foi pour la composition.
            existing.mates       = mates;
            existing.teamIndex   = p.teamIndex ?? null;
            existing.currentMate = autres.length ? autres.map(x => x.displayName).join(' & ') : null;
          } else {
            playerMap.set(p.epicId, {
              epicId: p.epicId, name: p.displayName,
              points: ptsEquipe, individualPoints: ptsPropres,
              kills: killsEquipe, individualKills: p.eliminations,
              placement, wins, games: 1,
              mates,
              teamIndex: p.teamIndex ?? null,
              currentMate: autres.length ? autres.map(x => x.displayName).join(' & ') : null,
              disqualified: false,
              pointsMod: 0,
            });
          }
        });
      });
    });

    // Utiliser les REFS pour avoir les valeurs à jour
    playerMap.forEach((p, key) => {
      p.disqualified = disqualifiedRef.current.has(key);
      p.pointsMod    = pointsModsRef.current.get(key) || 0;
    });
    return Array.from(playerMap.values());
  }

  // ── Envoi résultats auto ──────────────────────────────────
  async function sendResultsAuto(players: Player[], replayName: string, gameId?: string) {
    const t  = selectedTournamentRef.current;
    const st = selectedStageRef.current;
    if (!t || !st) return;

    const activeKey  = localStorage.getItem('z7_external_api_key') || localStorage.getItem('z7_api_key') || session.apiKey;
    const stageIndex = (t.stages || []).indexOf(st);

    // Utiliser la REF pour avoir les games à jour
    const existingGames = tournamentGamesRef.current.filter(g =>
      !(g as any).deleted &&
      g.tournamentId === t._id &&
      g.stageId === st.name
    );

    const newGame: GameItem = {
      id: `tmp_${Date.now()}`,
      date: new Date(),
      players,
      tournamentId: t._id,
      stageId: st.name,
    };

    const cumulativePayload = buildCumulativePayload([...existingGames, newGame], st);

    try {
      const res = await fetch(`${API}/leaderboard/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
        body: JSON.stringify({ tournamentId: t._id, stageIndex, players: cumulativePayload }),
      });
      const data = await res.json();
      if (data.success) {
        setReplayHistory(prev => prev.map(r => r.name === replayName ? { ...r, state: 'sent' } : r));
        const gid2 = gameId || `g_${Date.now()}`;
        setTournamentGames(prev => [{
          id: gid2, date: new Date(), players,
          tournamentId: t._id, stageId: st.name,
          backendId: data.data?._id, replayName,
        } as any, ...prev]);
      } else {
        setReplayHistory(prev => prev.map(r => r.name === replayName ? { ...r, state: 'failed' } : r));
      }
    } catch {
      setReplayHistory(prev => prev.map(r => r.name === replayName ? { ...r, state: 'failed' } : r));
    }
  }

  // ── Envoi résultats manuel ────────────────────────────────
  async function sendResultsManual() {
    if (!selectedTournament || !selectedStage) return;
    const activeKey  = localStorage.getItem('z7_external_api_key') || localStorage.getItem('z7_api_key') || session.apiKey;
    const stageIndex = (selectedTournament.stages || []).indexOf(selectedStage);

    const existingGames = tournamentGames.filter(g =>
      !(g as any).deleted &&
      g.tournamentId === selectedTournament._id &&
      g.stageId === selectedStage.name
    );

    const newGame: GameItem = {
      id: `tmp_${Date.now()}`,
      date: new Date(),
      players: parsedPlayers,
      tournamentId: selectedTournament._id,
      stageId: selectedStage.name,
    };

    const cumulativePayload = buildCumulativePayload([...existingGames, newGame]);

    try {
      const res = await fetch(`${API}/leaderboard/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
        body: JSON.stringify({ tournamentId: selectedTournament._id, stageIndex, players: cumulativePayload }),
      });
      const data = await res.json();
      if (data.success) {
        const gid = pendingGameId || `g_${Date.now()}`;
        setTournamentGames(prev => [{
          id: gid, date: new Date(), players: parsedPlayers,
          tournamentId: selectedTournament._id, stageId: selectedStage.name,
          backendId: data.data?._id, replayName: pendingReplayName,
        } as any, ...prev]);
        if (pendingReplayName) {
          setReplayHistory(prev => [{
            id: `r_${Date.now()}`, name: pendingReplayName, date: new Date(), state: 'sent',
            totalPlayers: parsedPlayers.filter(p => !p.isBot).length,
            tournamentId: selectedTournament._id, stageId: selectedStage.name,
            gameId: gid,
          } as any, ...prev]);
        }
        setShowResults(false); setParsedPlayers([]);
        setPendingGameId(null); setPendingReplayName(null);
        alert('✅ Résultats envoyés !');
      } else {
        alert('❌ Erreur: ' + data.message);
      }
    } catch { alert('❌ Erreur serveur'); }
  }

  // ── Build payload ─────────────────────────────────────────
  //  `buildPayload` vivait ici. Il n'etait appele NULLE PART, et pourtant
  //  c'etait lui qui renseignait correctement les coequipiers et la part
  //  individuelle de chaque joueur. Le constructeur reellement utilise,
  //  `buildCumulativePayload`, envoyait `currentMate: null` pour tout le
  //  monde. Du code mort qui fait bien ce que le code vivant fait mal est
  //  un piege : on le lit, on croit que la fonction est assuree, et on
  //  cherche le defaut ailleurs. Il est supprime, et sa logique d'equipe
  //  — la bonne — est passee dans `buildCumulativePayload`.

  // ── Actions leaderboard ───────────────────────────────────
  function handleAction(epicId: string, name: string, action: string) {
    setActionMenu(null);
    if (action === 'disqualify') {
      const n = new Set(disqualified);
      const isDQ = n.has(epicId);
      isDQ ? n.delete(epicId) : n.add(epicId);
      setDisqualified(n);
      if (selectedTournament && selectedStage) {
        const activeKey = localStorage.getItem('z7_external_api_key') || localStorage.getItem('z7_api_key') || session.apiKey;
        const stageIndex = (selectedTournament.stages || []).indexOf(selectedStage);
        fetch(`${API}/leaderboard/player-mod`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
          body: JSON.stringify({ tournamentId: selectedTournament._id, stageIndex, epicId, disqualified: !isDQ }),
        }).catch(() => {});
      }
    } else {
      setPointsPlayer(epicId); setPointsPlayerName(name);
      setPointsType(action === 'add' ? 'add' : 'remove');
      setPointsValue(''); setShowPointsModal(true);
    }
  }

  async function deleteGame(game: GameItem) {
    if (!confirm('Supprimer cette game ? Les points seront retirés du leaderboard.')) return;

    setTournamentGames(prev => prev.map(g => g.id === game.id ? { ...g, deleted: true } as any : g));
    const gameReplayName = (game as any).replayName;
    const gameId = game.id;
    setReplayHistory(prev => prev.map(r => {
      const matchByName = gameReplayName && r.name === gameReplayName;
      const matchById   = (r as any).gameId && (r as any).gameId === gameId;
      return (matchByName || matchById) ? { ...r, state: 'deleted' as any } : r;
    }));
    setSelectedGame(null);

    if (selectedTournament && selectedStage) {
      const activeKey  = localStorage.getItem('z7_external_api_key') || localStorage.getItem('z7_api_key') || session.apiKey;
      const stageIndex = (selectedTournament.stages || []).indexOf(selectedStage);

      const remainingGames = tournamentGames.filter(g =>
        g.id !== game.id &&
        !(g as any).deleted &&
        g.tournamentId === selectedTournament._id &&
        g.stageId === selectedStage.name
      );

      const cumulativePayload = buildCumulativePayload(remainingGames);

      await fetch(`${API}/leaderboard/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
        body: JSON.stringify({ tournamentId: selectedTournament._id, stageIndex, players: cumulativePayload }),
      }).catch(() => {});
    }
  }

  async function confirmPoints() {
    const v = parseInt(pointsValue);
    if (isNaN(v) || v <= 0) { alert('Nombre invalide'); return; }
    const n = new Map(pointsMods);
    const cur = n.get(pointsPlayer) || 0;
    const newVal = pointsType === 'add' ? cur + v : cur - v;
    n.set(pointsPlayer, newVal);
    setPointsMods(n);
    setShowPointsModal(false);
    if (selectedTournament && selectedStage) {
      const activeKey = localStorage.getItem('z7_external_api_key') || session.apiKey;
      const stageIndex = (selectedTournament.stages || []).indexOf(selectedStage);
      await fetch(`${API}/leaderboard/player-mod`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
        body: JSON.stringify({ tournamentId: selectedTournament._id, stageIndex, epicId: pointsPlayer, pointsMod: newVal }),
      }).catch(() => {});
    }
  }

  // ── Computed ──────────────────────────────────────────────
  function groupLeaderboardByTeam(entries: LeaderboardEntry[]) {
    const epicToTeam = new Map<string, number>();
    const games = tournamentGames.filter(g => g.tournamentId === selectedTournament?._id && g.stageId === selectedStage?.name);
    games.forEach(game => {
      game.players.filter(p => !p.isBot).forEach(p => {
        if (p.teamIndex !== null && p.teamIndex !== undefined) {
          epicToTeam.set(p.epicId, p.teamIndex);
        }
      });
    });

    const teams = new Map<string, any>();
    entries.forEach(p => {
      const teamIdx = epicToTeam.get(p.epicId);
      const key = teamIdx !== undefined ? `team_${teamIdx}` : p.epicId;
      if (teams.has(key)) {
        const t = teams.get(key);
        t.kills       += p.kills;
        t._needRecalc  = true;
        t.wins         = Math.max(t.wins, p.wins);
        t.games        = Math.max(t.games, p.games);
        t.names.push(p.name);
      } else {
        teams.set(key, { ...p, names: [p.name], epicId: key });
      }
    });
    return Array.from(teams.values())
      .map(t => {
        if (t._needRecalc) {
          const avgPlacement = t.averagePlacement || 999;
          t.finalPoints = calcPoints(avgPlacement, t.kills) + (pointsMods.get(t.epicId) || 0);
        }
        return { ...t, name: t.names.join(' & ') };
      })
      .sort((a, b) => b.finalPoints - a.finalPoints);
  }

  const lb             = getLeaderboard();
  const sortedLb       = [...lb].sort((a, b) => {
    if (lbSortKey === 'avgPlacement') return (a.averagePlacement || 999) - (b.averagePlacement || 999);
    if (lbSortKey === 'points') return (b.finalPoints || 0) - (a.finalPoints || 0);
    const key = lbSortKey as keyof LeaderboardEntry;
    return ((b[key] as number) || 0) - ((a[key] as number) || 0);
  });
  const displayLb      = lbDisplayMode === 'teams' ? getLeaderboardByTeam() : sortedLb;
  const filteredLb     = displayLb.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredHistory = replayHistory.filter(r => !selectedTournament || r.tournamentId === selectedTournament._id);
  const filteredGames   = tournamentGames.filter(g => !selectedTournament || g.tournamentId === selectedTournament._id);

  const stateColor: Record<string, string> = { reading: '#3b82f6', stabilizing: '#f59e0b', parsing: '#8b5cf6', sent: '#4ade80', failed: '#ef4444', deleted: '#ef4444' };
  const stateLabel: Record<string, string> = { reading: '✍️ Écriture', stabilizing: '⏱️ Stabilisation', parsing: '📖 Parsing...', sent: '✓ Envoyé', failed: '❌ Échec', deleted: '🗑️ Supprimé' };

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* CONFIG */}
      <div style={s.card}>
        <div style={s.cardRow}>
          <button
              onClick={() => {
                const activeKey = localStorage.getItem('z7_external_api_key') || session.apiKey;
                fetch(`${API}/tournaments/my`, { headers: { 'x-api-key': activeKey } })
                  .then(r => r.json())
                  .then(d => { if (d.success && d.data) setTournaments(d.data); })
                  .catch(() => {});
              }}
              disabled={surveillanceActive}
              style={{ ...s.btn, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', flexShrink: 0, opacity: surveillanceActive ? 0.4 : 1 }}
            >↻ Rafraîchir</button>
          <div style={s.field}>
            <label style={s.label}>Tournoi</label>
            <Dropdown
              value={selectedTournament?._id || ''}
              onChange={(_, item) => { setSelectedTournament(item); setSelectedStage(null); setTournamentGames([]); setReplayHistory([]); localStorage.removeItem('z7_tournament_games'); localStorage.removeItem('z7_replay_history'); }}
              placeholder="Sélectionner un tournoi"
              disabled={surveillanceActive}
              options={tournaments.map((t: any) => ({ value: t._id, label: t.name, item: t }))}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Manche</label>
            <Dropdown
              value={selectedStage ? String((selectedTournament?.stages || []).indexOf(selectedStage)) : ''}
              onChange={(_, item) => {
                setSelectedStage(item);
                if (selectedTournament && item) {
                  const keyH = `z7_replay_history_${selectedTournament._id}_${item.name}`;
                  const keyG = `z7_tournament_games_${selectedTournament._id}_${item.name}`;
                  const savedH = localStorage.getItem(keyH);
                  const savedG = localStorage.getItem(keyG);
                  setReplayHistory(savedH ? JSON.parse(savedH).map((r: any) => ({ ...r, date: new Date(r.date) })) : []);
                  setTournamentGames(savedG ? JSON.parse(savedG).map((g: any) => ({ ...g, date: new Date(g.date) })) : []);
                }
              }}
              placeholder="Sélectionner une manche"
              disabled={surveillanceActive || !selectedTournament}
              options={(selectedTournament?.stages || []).map((st: any, i: number) => ({ value: String(i), label: st.name, item: st }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
            {surveillanceActive
              ? <button onClick={stopSurveillance} style={{ ...s.btn, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#000' }}>⏸️ Arrêter</button>
              : <button onClick={startSurveillance} style={{ ...s.btn, background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#000' }}>▶️ Surveiller</button>
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={s.label}>Code PP</label>
              <input
                type="text"
                placeholder="Ex: ABC-123"
                value={ppCode}
                onChange={e => setPpCode(e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                disabled={!selectedTournament}
                style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', width: 140, opacity: selectedTournament ? 1 : 0.4 }}
              />
            </div>
            <button
              onClick={sendPPCode}
              disabled={!selectedTournament || !ppCode.trim() || ppSending}
              style={{ ...s.btn, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', opacity: (!selectedTournament || !ppCode.trim() || ppSending) ? 0.4 : 1 }}
            >{ppSending ? '⏳ Envoi...' : '📨 Envoyer PP'}</button>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>

        {/* GAUCHE : Historique replays */}
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={s.panelHeader}>
            <div style={s.panelTitle}>Historique & replays</div>
            <button onClick={handleManualUpload} style={s.btnSmall}>📤 Upload manuel</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredHistory.length === 0
              ? <div style={s.empty}>Aucun replay — démarrez la surveillance</div>
              : filteredHistory.map(r => (
                <div key={r.id} style={{ ...s.replayItem, borderLeftColor: stateColor[r.state] || '#555' }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', background: stateColor[r.state],
                    flexShrink: 0, marginTop: 4,
                    ...(r.state !== 'sent' && r.state !== 'failed' ? { animation: 'z7pulse 1.5s infinite' } : {}),
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🎮 Replay Game #{filteredHistory.length - filteredHistory.indexOf(r)}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Arial', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial', marginTop: 2 }}>
                      {r.date.toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 12, color: stateColor[r.state], marginTop: 4, fontWeight: 700 }}>
                      {r.state === 'sent' ? `${r.totalPlayers} joueurs — ${stateLabel[r.state]}` : stateLabel[r.state]}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Timeline games */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, marginTop: 12, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
              Games du tournoi
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
              {filteredGames.length === 0
                ? <div style={s.empty}>Aucune game enregistrée</div>
                : filteredGames.map((g, i) => {
                  const isDeleted = (g as any).deleted;
                  return (
                    <div key={g.id} onClick={() => setSelectedGame(g)} style={{
                      ...s.gameItem,
                      borderLeftColor: isDeleted ? '#ef4444' : '#33C6FF',
                      opacity: isDeleted ? 0.5 : 1,
                      background: isDeleted ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isDeleted ? '#ef4444' : '#33C6FF', flexShrink: 0, marginTop: 3 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isDeleted ? '#ef4444' : '#fff' }}>
                          {isDeleted ? '🗑️' : '🎮'} Game #{filteredGames.length - i} {isDeleted ? '— Supprimée' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial', marginTop: 2 }}>{g.date.toLocaleString('fr-FR')} — {g.players.length} joueurs</div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>

        {/* DROITE : Leaderboard */}
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={s.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={s.panelTitle}>Leaderboard & stats</div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 3, gap: 3 }}>
                {(['teams', 'players'] as const).map(mode => (
                  <button key={mode} onClick={() => setLbDisplayMode(mode)} style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: 0.5,
                    background: lbDisplayMode === mode ? 'rgba(99,102,241,0.25)' : 'transparent',
                    border: lbDisplayMode === mode ? '1px solid rgba(99,102,241,0.45)' : '1px solid transparent',
                    borderRadius: 6, color: lbDisplayMode === mode ? '#c7d2fe' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>{mode === 'players' ? 'Joueurs' : 'Équipes'}</button>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              style={{ ...s.search, pointerEvents: 'all' as const }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
            {filteredLb.length === 0
              ? <div style={s.empty}>Aucune game enregistrée</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 60px 80px 80px 60px 70px', gap: 4, marginBottom: 8, position: 'sticky', top: 0, zIndex: 1 }}>
                    {(['#','Joueur','points','kills','wins','avgPlacement','games','Action'] as const).map((h, i) => {
                      const labels: Record<string, string> = { '#': '#', Joueur: 'Joueur', points: 'Points', kills: 'Kills', wins: 'Victoires', avgPlacement: 'Pl. Moy.', games: 'Games', Action: 'Action' };
                      const isSortable = !['#','Joueur','Action'].includes(h);
                      const active = lbSortKey === h;
                      return isSortable ? (
                        <button key={i} onClick={() => setLbSortKey(h as any)} style={{
                          padding: '6px 10px', fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase' as const, letterSpacing: 1,
                          background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                          border: active ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, color: active ? '#c7d2fe' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' as const, textAlign: 'left' as const,
                        }}>{labels[h]}</button>
                      ) : (
                        <div key={i} style={{
                          padding: '6px 10px', fontSize: 10, fontWeight: 700,
                          color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, whiteSpace: 'nowrap' as const,
                        }}>{labels[h]}</div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filteredLb.map((p: LeaderboardEntry, i: number) => {
                      const isDQ = disqualified.has(p.epicId);
                      const mod  = pointsMods.get(p.epicId) || 0;
                      const medals = ['🥇','🥈','🥉'];
                      const medalColors = ['#FFB700','#C0C0C0','#CD7F32'];
                      const topQ  = selectedStage?.qualifiers || 0;
                      const safeQ = topQ > 0 ? Math.floor(topQ * 0.75) || 1 : 0;
                      const rank  = i + 1;
                      const isDQPlayer = disqualified.has(p.epicId);
                      let borderColor = 'rgba(255,255,255,0.08)';
                      if (isDQPlayer) {
                        borderColor = 'rgba(239,68,68,0.5)';
                      } else if (topQ > 0) {
                        if (rank <= safeQ)     borderColor = '#4ade80';
                        else if (rank <= topQ) borderColor = '#FFB700';
                        else                   borderColor = '#ef4444';
                      } else {
                        borderColor = i < 3 ? medalColors[i] : 'rgba(255,255,255,0.08)';
                      }
                      return (
                        <div key={p.epicId} style={{
                          display: 'grid', gridTemplateColumns: '44px 1fr 80px 60px 80px 80px 60px 70px',
                          gap: 4, opacity: isDQPlayer ? 0.5 : 1,
                          background: isDQPlayer ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeft: `3px solid ${borderColor}`,
                          borderRadius: 10, transition: 'background 0.15s',
                        }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'}
                        >
                          <div style={{ ...s.td, fontWeight: 900, color: topQ === 0 && i < 3 ? medalColors[i] : 'rgba(255,255,255,0.4)', fontSize: topQ === 0 && i < 3 ? 16 : 12 }}>{topQ === 0 && i < 3 ? medals[i] : rank}</div>
                          <div style={{ ...s.td }}>
                            <span style={{ textDecoration: isDQ ? 'line-through' : 'none', color: isDQ ? '#ef4444' : '#fff', fontSize: 12, fontWeight: 700 }}>{p.name}</span>
                            {isDQ && <span style={{ marginLeft: 6, fontSize: 9, background: '#ef4444', color: '#fff', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>DQ</span>}
                          </div>
                          <div style={{ ...s.td }}>
                            <span style={{ fontWeight: 900, color: '#4ade80', fontSize: 13 }}>{p.finalPoints}</span>
                            {mod !== 0 && <span style={{ fontSize: 10, color: '#FFB700', marginLeft: 4 }}>({mod > 0 ? '+' : ''}{mod})</span>}
                          </div>
                          <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{p.kills}</div>
                          <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{p.wins}</div>
                          <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>#{p.averagePlacement === 999 ? '?' : p.averagePlacement}</div>
                          <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{p.games}</div>
                          <div style={{ ...s.td, position: 'relative' }}>
                            <button
                              onClick={() => setActionMenu(actionMenu === p.epicId ? null : p.epicId)}
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}
                            >⚙️</button>
                            {actionMenu === p.epicId && (
                              <div style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, zIndex: 100, minWidth: 180, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                {[
                                  { label: isDQ ? '✅ Réintégrer' : '❌ Disqualifier', action: 'disqualify' },
                                  { label: '➕ Ajouter des points', action: 'add' },
                                  { label: '➖ Enlever des points', action: 'remove' },
                                ].map(item => (
                                  <button key={item.action} onClick={() => handleAction(p.epicId, p.name, item.action)}
                                    style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 12, fontFamily: 'Arial' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                                  >{item.label}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* MODAL RÉSULTATS MANUEL */}
      {showResults && parsedPlayers.length > 0 && (() => {
        const real = parsedPlayers.filter(p => !p.isBot);
        const teamsMap = new Map<number, Player[]>();
        real.forEach(p => {
          const ti = p.teamIndex ?? -1;
          if (!teamsMap.has(ti)) teamsMap.set(ti, []);
          teamsMap.get(ti)!.push(p);
        });
        const teamsData = Array.from(teamsMap.values())
          .map(members => {
            const placement = members[0].placement || 999;
            const kills = members.reduce((s, p) => s + p.eliminations, 0);
            const pts = calcPoints(placement, kills);
            return { members, placement, kills, pts };
          })
          .sort((a, b) => a.placement - b.placement);

        const playersData = real
          .map(p => ({ ...p, pts: calcPoints(p.placement || 999, p.eliminations) }))
          .sort((a, b) => (a.placement || 999) - (b.placement || 999));

        return (
          <div style={s.overlay} onClick={() => setShowResults(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={s.modalTitle}>📊 Résultats — {real.length} joueurs</div>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 3, gap: 3 }}>
                  {(['teams', 'players'] as const).map(mode => (
                    <button key={mode} onClick={() => setGameModalMode(mode)} style={{
                      padding: '4px 10px', fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      background: gameModalMode === mode ? 'rgba(99,102,241,0.25)' : 'transparent',
                      border: gameModalMode === mode ? '1px solid rgba(99,102,241,0.45)' : '1px solid transparent',
                      borderRadius: 6, color: gameModalMode === mode ? '#c7d2fe' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>{mode === 'teams' ? 'Équipes' : 'Joueurs'}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', margin: '16px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 70px 80px', gap: 4, marginBottom: 6 }}>
                  {['#', gameModalMode === 'teams' ? 'Équipe' : 'Joueur', 'Kills', 'Place', 'Points'].map((h, i) => (
                    <div key={i} style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {gameModalMode === 'teams'
                    ? teamsData.map((team, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 70px 80px', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                        <div style={{ ...s.td, fontWeight: 900, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{i + 1}</div>
                        <div style={{ ...s.td, fontSize: 12, fontWeight: 700, color: '#fff' }}>{team.members.map(m => m.displayName).join(' & ')}</div>
                        <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{team.kills}</div>
                        <div style={{ ...s.td, color: '#33C6FF', fontWeight: 700, fontSize: 12 }}>#{team.placement}</div>
                        <div style={{ ...s.td, color: '#4ade80', fontWeight: 900, fontSize: 13 }}>{team.pts}</div>
                      </div>
                    ))
                    : playersData.map((p, i) => (
                      <div key={p.epicId} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 70px 80px', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                        <div style={{ ...s.td, fontWeight: 900, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{i + 1}</div>
                        <div style={{ ...s.td, fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.displayName}</div>
                        <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{p.eliminations}</div>
                        <div style={{ ...s.td, color: '#33C6FF', fontWeight: 700, fontSize: 12 }}>#{p.placement || '?'}</div>
                        <div style={{ ...s.td, color: '#4ade80', fontWeight: 900, fontSize: 13 }}>{p.pts}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowResults(false)} style={s.btnCancel}>Annuler</button>
                <button onClick={sendResultsManual} style={s.btnConfirm}>📤 Envoyer les résultats</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL GAME DETAILS */}
      {selectedGame && (() => {
        const real = selectedGame.players.filter(p => !p.isBot);
        const teamsMap = new Map<number, typeof real>();
        real.forEach(p => {
          const ti = p.teamIndex ?? -1;
          if (!teamsMap.has(ti)) teamsMap.set(ti, []);
          teamsMap.get(ti)!.push(p);
        });
        const teamsData = Array.from(teamsMap.values())
          .map(members => {
            const placement = members[0].placement || 999;
            const kills = members.reduce((s, p) => s + p.eliminations, 0);
            const pts = calcPoints(placement, kills);
            return { members, placement, kills, pts };
          })
          .sort((a, b) => a.placement - b.placement);

        const playersData = real
          .map(p => ({ ...p, pts: calcPoints(p.placement || 999, p.eliminations) }))
          .sort((a, b) => (a.placement || 999) - (b.placement || 999));

        return (
          <div style={s.overlay} onClick={() => setSelectedGame(null)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={s.modalTitle}>🎮 Game #{filteredGames.length - filteredGames.indexOf(selectedGame)} — {selectedGame.date.toLocaleString('fr-FR')}</div>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 3, gap: 3 }}>
                  {(['teams', 'players'] as const).map(mode => (
                    <button key={mode} onClick={() => setGameModalMode(mode)} style={{
                      padding: '4px 10px', fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      background: gameModalMode === mode ? 'rgba(99,102,241,0.25)' : 'transparent',
                      border: gameModalMode === mode ? '1px solid rgba(99,102,241,0.45)' : '1px solid transparent',
                      borderRadius: 6, color: gameModalMode === mode ? '#c7d2fe' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>{mode === 'teams' ? 'Équipes' : 'Joueurs'}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', margin: '16px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 70px 80px', gap: 4, marginBottom: 6 }}>
                  {['#', 'Équipe', 'Kills', 'Place', 'Points'].map((h, i) => (
                    <div key={i} style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {gameModalMode === 'teams'
                    ? teamsData.map((team, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 70px 80px', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                        <div style={{ ...s.td, fontWeight: 900, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{i + 1}</div>
                        <div style={{ ...s.td, fontSize: 12, fontWeight: 700, color: '#fff' }}>{team.members.map(m => m.displayName).join(' & ')}</div>
                        <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{team.kills}</div>
                        <div style={{ ...s.td, color: '#33C6FF', fontWeight: 700, fontSize: 12 }}>#{team.placement}</div>
                        <div style={{ ...s.td, color: '#4ade80', fontWeight: 900, fontSize: 13 }}>{team.pts}</div>
                      </div>
                    ))
                    : playersData.map((p, i) => (
                      <div key={p.epicId} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 70px 80px', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                        <div style={{ ...s.td, fontWeight: 900, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{i + 1}</div>
                        <div style={{ ...s.td, fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.displayName}</div>
                        <div style={{ ...s.td, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{p.eliminations}</div>
                        <div style={{ ...s.td, color: '#33C6FF', fontWeight: 700, fontSize: 12 }}>#{p.placement || '?'}</div>
                        <div style={{ ...s.td, color: '#4ade80', fontWeight: 900, fontSize: 13 }}>{p.pts}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => deleteGame(selectedGame!)} style={{ ...s.btnCancel, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>🗑️ Supprimer cette game</button>
                <button onClick={() => setSelectedGame(null)} style={s.btnConfirm}>Fermer</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL POINTS */}
      {showPointsModal && (
        <div style={s.overlay} onClick={() => setShowPointsModal(false)}>
          <div style={{ ...s.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{pointsType === 'add' ? '➕ Ajouter' : '➖ Enlever'} des points — {pointsPlayerName}</div>
            <input
              type="number" value={pointsValue} autoFocus
              onChange={e => setPointsValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmPoints()}
              placeholder="Ex: 10"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px', color: '#fff', fontSize: 18, textAlign: 'center', outline: 'none', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPointsModal(false)} style={s.btnCancel}>Annuler</button>
              <button onClick={confirmPoints} style={s.btnConfirm}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes z7pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(51,198,255,0.4); }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card:        { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
  cardRow:     { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' },
  field:       { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 180 },
  label:       { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  btn:         { padding: '10px 20px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnSmall:    { padding: '7px 14px', background: 'linear-gradient(135deg,#33C6FF,#8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' },
  panelTitle:  { fontSize: 14, fontWeight: 700, color: '#fff' },
  search:      { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12, outline: 'none', width: 180 },
  empty:       { textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 20 },
  replayItem:  { display: 'flex', gap: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: '3px solid #555', transition: 'all 0.2s' },
  gameItem:    { display: 'flex', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '2px solid #33C6FF', cursor: 'pointer' },
  td:          { padding: '6px 10px', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal:       { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '90%', maxWidth: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  modalTitle:  { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 },
  btnCancel:   { flex: 1, padding: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnConfirm:  { flex: 1, padding: 12, background: 'linear-gradient(135deg,#4ade80,#22c55e)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 900, cursor: 'pointer' },
};