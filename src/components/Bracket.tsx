import React, { useState, useEffect, useRef } from 'react';

import { API } from '../config';
import { appelApi, clefActive } from '../reseau';

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
    <div ref={ref} style={{ position: 'relative', minWidth: 240 }}>
      <button type="button" onClick={() => !disabled && setOpen(o => !o)} style={{
        width: '100%', padding: '10px 14px',
        background: open ? 'rgba(51,198,255,0.06)' : 'rgba(255,255,255,0.05)',
        border: open ? '1px solid rgba(51,198,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, color: selected ? '#fff' : 'rgba(255,255,255,0.3)',
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
      }}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
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
                fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' as const,
              }}
            >{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

interface BracketProps {
  session: {
    apiKey: string;
    organizerId: string;
    organizerName: string;
    token: string;
  };
}

function slotHeight(mode: string) { return (mode === '4V4') ? 90 : (mode === '3V3') ? 80 : (mode === '2V2') ? 60 : 36; }

function getRoundNames(numRounds: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < numRounds; i++) {
    const r = numRounds - i;
    if (r === 1) names.push('Finale');
    else if (r === 2) names.push('Demi-finales');
    else if (r === 3) names.push('Quarts de finale');
    else names.push(`Round ${i + 1}`);
  }
  return names;
}

function renderPlayerRow(pseudo: string, isWinner: boolean, color: string): string {
  const initials = pseudo.substring(0,2).toUpperCase();
  const avatarBg = isWinner ? `${color}33` : 'rgba(255,255,255,0.08)';
  const avatarBorder = isWinner ? color : 'rgba(255,255,255,0.2)';
  const avatarColor = isWinner ? color : 'rgba(255,255,255,0.5)';
  const nameColor = isWinner ? '#fff' : 'rgba(255,255,255,0.7)';
  return `<div style="display:flex;align-items:center;gap:6px;padding:0 8px;flex:1;min-width:0;"><div style="width:22px;height:22px;border-radius:50%;background:${avatarBg};border:1px solid ${avatarBorder};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${avatarColor};flex-shrink:0;">${initials}</div><span style="font-size:11px;font-weight:${isWinner ? 700 : 400};color:${nameColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Inter',sans-serif;">${pseudo}</span></div>`;
}

function render3V3Slot(parts: string[], isWinner: boolean, color: string, SLOT_H: number, borderStyle: string, bg: string, scoreHtml: string): string {
  const p1 = parts[0] ? renderPlayerRow(parts[0].trim(), isWinner, color) : '';
  const p2 = parts[1] ? renderPlayerRow(parts[1].trim(), isWinner, color) : '';
  const p3 = parts[2] ? renderPlayerRow(parts[2].trim(), isWinner, color) : '';
  return `<div style="display:flex;height:${SLOT_H}px;background:${bg};border:1px solid rgba(255,255,255,0.08);${borderStyle}border-radius:6px;overflow:hidden;">
    <div style="display:flex;flex-direction:column;flex:1;border-right:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;padding:4px 0;flex:1;border-bottom:1px solid rgba(255,255,255,0.06);">${p1}</div>
      <div style="display:flex;align-items:center;padding:4px 0;flex:1;">${p2}</div>
    </div>
    <div style="display:flex;align-items:center;flex:1;">${p3}${scoreHtml}</div>
  </div>`;
}

function render4V4Slot(parts: string[], isWinner: boolean, color: string, SLOT_H: number, borderStyle: string, bg: string, scoreHtml: string): string {
  const p = (i: number) => parts[i] ? renderPlayerRow(parts[i].trim(), isWinner, color) : '';
  const sep = '<div style="height:1px;background:rgba(255,255,255,0.06);margin:0 4px;"></div>';
  return `<div style="display:flex;height:${SLOT_H}px;background:${bg};border:1px solid rgba(255,255,255,0.08);${borderStyle}border-radius:6px;overflow:hidden;">
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1;border-right:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;padding:4px 0;">${p(0)}</div>
      ${sep}
      <div style="display:flex;align-items:center;padding:4px 0;">${p(1)}</div>
    </div>
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1;">
      <div style="display:flex;align-items:center;padding:4px 0;">${p(2)}${scoreHtml}</div>
      ${sep}
      <div style="display:flex;align-items:center;padding:4px 0;">${p(3)}</div>
    </div>
  </div>`;
}

function renderSlot(name: string | null, isWinner: boolean, isLoser: boolean, score: string | undefined, color: string, mode: string): string {
  const SLOT_H = slotHeight(mode);
  const borderStyle = isWinner ? `border-left:3px solid ${color};` : 'border-left:3px solid rgba(255,255,255,0.1);';
  const bg = isWinner ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
  const scoreHtml = score !== undefined ? `<span style="margin-left:auto;padding-right:8px;font-size:12px;font-weight:900;color:${isWinner ? color : 'rgba(255,255,255,0.4)'};">${score}</span>` : '';
  const emptyRow = `<div style="display:flex;align-items:center;gap:6px;padding:0 8px;flex:1;"><div style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:9px;color:rgba(255,255,255,0.2);">?</div><span style="font-size:10px;color:rgba(255,255,255,0.2);font-family:'Inter',sans-serif;">En attente</span></div>`;
  if (!name) {
    if (mode === '2V2' || mode === '3V3' || mode === '4V4') {
      return `<div style="display:flex;flex-direction:column;justify-content:center;height:${SLOT_H}px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-left:3px solid rgba(255,255,255,0.06);border-radius:6px;padding:4px 0;">${emptyRow}<div style="height:1px;background:rgba(255,255,255,0.06);margin:0 8px;"></div>${emptyRow}</div>`;
    }
    return `<div style="display:flex;align-items:center;height:${SLOT_H}px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-left:3px solid rgba(255,255,255,0.06);border-radius:6px;">${emptyRow}</div>`;
  }
  if (mode === '2V2') {
    const parts = name.split(' / ');
    const rows = parts.map((p: string) => renderPlayerRow(p.trim(), isWinner, color));
    return `<div style="display:flex;flex-direction:column;justify-content:center;height:${SLOT_H}px;background:${bg};border:1px solid rgba(255,255,255,0.08);${borderStyle}border-radius:6px;padding:4px 0;"><div style="display:flex;align-items:center;">${rows[0]}${scoreHtml}</div><div style="height:1px;background:rgba(255,255,255,0.06);margin:0 8px;"></div><div style="display:flex;align-items:center;">${rows[1] || ''}</div></div>`;
  }
  if (mode === '3V3') {
    const parts = name.split(' / ');
    return render3V3Slot(parts, isWinner, color, SLOT_H, borderStyle, bg, scoreHtml);
  }
  if (mode === '4V4') {
    const parts = name.split(' / ');
    return render4V4Slot(parts, isWinner, color, SLOT_H, borderStyle, bg, scoreHtml);
  }
  const initials = name.substring(0, 2).toUpperCase();
  const nameColor = isWinner ? '#fff' : isLoser ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)';
  return `<div style="display:flex;align-items:center;gap:8px;padding:0 10px;height:${SLOT_H}px;background:${bg};border:1px solid rgba(255,255,255,0.08);${borderStyle}border-radius:6px;transition:background 0.15s;"><div style="width:22px;height:22px;border-radius:50%;background:${isWinner ? color + '33' : 'rgba(255,255,255,0.08)'};border:1px solid ${isWinner ? color : 'rgba(255,255,255,0.2)'};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${isWinner ? color : 'rgba(255,255,255,0.5)'};flex-shrink:0;">${initials}</div><span style="font-size:11px;font-weight:${isWinner ? 700 : 400};color:${nameColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;font-family:'Inter',sans-serif;">${name}</span>${scoreHtml}</div>`;
}

function buildSide(matches: any[], numRounds: number, roundNames: string[], color: string, mode: string, SLOT_H: number, GAP: number, PAIR_H: number, totalH: number, colW: number, mirror: boolean, matchOffset: number): string {
  let html = '';
  for (let r = 1; r <= numRounds; r++) {
    const roundMatches = matches.filter((m: any) => m.round === r);
    const pairCount = Math.pow(2, numRounds - r);
    const spacing = totalH / pairCount;
    let pairsHtml = '';
    for (let i = 0; i < pairCount; i++) {
      const globalMatchIndex = matchOffset + i;
      const m = roundMatches.find((x: any) => x.matchIndex === globalMatchIndex) || { p1: null, p2: null, winner: null, score: null, matchIndex: globalMatchIndex };
      const top = i * spacing + (spacing - PAIR_H) / 2;
      const side = mirror ? 'left' : 'right';
      const goldLine = r === numRounds;
      const hLine = `<div style="position:absolute;top:${PAIR_H/2-1}px;${side}:-30px;width:30px;height:1px;background:${goldLine?'rgba(255,183,0,0.5)':'rgba(255,255,255,0.2)'};"></div>`;
      let vLine = '';
      if (r < numRounds && i % 2 === 0 && i + 1 < pairCount) {
        const nextTop = (i+1)*spacing+(spacing-PAIR_H)/2;
        vLine = `<div style="position:absolute;top:${PAIR_H/2}px;${side}:-30px;width:1px;height:${nextTop+PAIR_H/2-(top+PAIR_H/2)}px;background:rgba(255,255,255,0.2);"></div>`;
      }
      const hasPlayers = m.p1 || m.p2;
      pairsHtml += `<div style="position:absolute;top:${top}px;left:0;right:0;">
        <div data-round="${r}" data-match="${m.matchIndex}" data-p1="${m.p1||''}" data-p2="${m.p2||''}" data-winner="${m.winner||''}" data-score="${m.score||''}"
          style="position:relative;border-radius:8px;${hasPlayers?'cursor:pointer;':''}">
          ${renderSlot(m.p1, !!(m.p1&&m.p1===m.winner), !!(m.winner&&m.p1!==m.winner), m.score?.split('-')[0], color, mode)}
          <div style="height:${GAP}px;background:#111;"></div>
          ${renderSlot(m.p2, !!(m.p2&&m.p2===m.winner), !!(m.winner&&m.p2!==m.winner), m.score?.split('-')[1], color, mode)}
          ${m.winner ? `<div style="position:absolute;top:50%;right:6px;transform:translateY(-50%);font-size:9px;color:${color};font-weight:700;background:${color}22;padding:2px 6px;border-radius:4px;">✓</div>` : (hasPlayers ? `<div style="position:absolute;top:50%;right:6px;transform:translateY(-50%);font-size:9px;color:rgba(255,255,255,0.3);">⚙️</div>` : '')}
          ${hLine}${vLine}
        </div>
      </div>`;
    }
    html += `<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:${colW}px;">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:${color};margin-bottom:8px;text-align:center;font-family:Arial;">${roundNames[r-1]||''}</div>
      <div style="position:relative;width:100%;height:${totalH}px;">${pairsHtml}</div>
    </div>
    <div style="width:30px;flex-shrink:0;"></div>`;
  }
  return html;
}

function buildBracketHTML(bracket: any): string {
  const color = bracket.color || '#33C6FF';
  const mode = bracket.mode || '1V1';
  const SLOT_H = slotHeight(mode);
  const GAP = 2;
  const PAIR_H = SLOT_H * 2 + GAP;
  const matches: any[] = bracket.matches || [];
  const teamSize = parseInt(bracket.mode) || 1;
  const nbTeams = Math.max(2, Math.floor((bracket.size || 8) / teamSize));
  const USE_DOUBLE = nbTeams >= 16;
  const numRounds = Math.ceil(Math.log2(nbTeams));
  const roundNames = getRoundNames(numRounds);
  const r1Count = Math.pow(2, numRounds - 1);
  const totalH = r1Count * PAIR_H + (r1Count - 1) * SLOT_H;
  const colW = (mode === '2V2' || mode === '3V3' || mode === '4V4') ? 240 : 180;

  const finalMatch = matches.find((m: any) => m.round === numRounds);
  const champion = finalMatch?.winner || null;

  if (!USE_DOUBLE) {
    const champHtml = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;"><div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#FFB700;margin-bottom:8px;font-family:Arial;">🏆 Champion</div><div style="height:${totalH}px;display:flex;align-items:center;"><div style="border:2px solid #FFB700;border-radius:12px;padding:20px 24px;background:rgba(255,183,0,0.06);text-align:center;min-width:120px;"><div style="font-size:28px;margin-bottom:8px;">${champion?'🏆':'❓'}</div><div style="font-size:13px;font-weight:900;color:#FFB700;">${champion||'À déterminer'}</div></div></div></div>`;
    let html = `<div style="display:inline-flex;align-items:flex-start;padding:20px;text-align:left;">`;
    html += buildSide(matches, numRounds, roundNames, color, mode, SLOT_H, GAP, PAIR_H, totalH, colW, false, 0);
    html += champHtml;
    html += `</div>`;
    return html;
  }

  // Double arbre >= 16 equipes
  const halfRounds = numRounds - 1;
  const halfNames = getRoundNames(halfRounds);
  const halfR1 = Math.pow(2, halfRounds - 1);
  const halfH = halfR1 * PAIR_H + (halfR1 - 1) * SLOT_H;
  const champHtml = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;"><div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#FFB700;margin-bottom:8px;font-family:Arial;">🏆 Champion</div><div style="height:${halfH}px;display:flex;align-items:center;"><div style="border:2px solid #FFB700;border-radius:12px;padding:20px 24px;background:rgba(255,183,0,0.06);text-align:center;min-width:120px;"><div style="font-size:28px;margin-bottom:8px;">${champion?'🏆':'❓'}</div><div style="font-size:13px;font-weight:900;color:#FFB700;">${champion||'À déterminer'}</div></div></div></div>`;

  let html = `<div style="display:inline-flex;align-items:center;padding:20px;gap:0;">`;
  html += `<div style="display:inline-flex;align-items:flex-start;">`;
  html += buildSide(matches, halfRounds, halfNames, color, mode, SLOT_H, GAP, PAIR_H, halfH, colW, false, 0);
  html += `</div>`;
  html += champHtml;
  html += `<div style="display:inline-flex;align-items:flex-start;flex-direction:row-reverse;">`;
  html += buildSide(matches, halfRounds, halfNames, color, mode, SLOT_H, GAP, PAIR_H, halfH, colW, true, halfR1);
  html += `</div>`;
  html += `</div>`;
  return html;
}

export default function Bracket({ session }: BracketProps) {
  const [brackets, setBrackets]               = useState<any[]>([]);
  const [selectedBracket, setSelectedBracket] = useState<any>(null);
  const [bracketDetail, setBracketDetail]     = useState<any>(null);
  const [loading, setLoading]                 = useState(false);
  const [matchModal, setMatchModal]           = useState<{
    round: number; matchIndex: number;
    p1: string | null; p2: string | null;
    currentWinner: string | null; currentScore: string | null;
  } | null>(null);
  const [scoreP1, setScoreP1] = useState('');
  const [scoreP2, setScoreP2] = useState('');
  const treeRef = useRef<HTMLDivElement>(null);

  //  12/10/2026 : plus d'echec silencieux — une liste vide sans
  //  explication ressemblait a « aucun bracket ».
  async function chargerBrackets() {
    const r = await appelApi('/brackets/my', { clef: clefActive(session.apiKey) });
    if (r.ok && r.data && r.data.data) setBrackets(r.data.data);
    else alert('❌ Liste des brackets indisponible : ' + r.message);
  }
  useEffect(() => { chargerBrackets(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.apiKey]);

  useEffect(() => {
    if (!selectedBracket) { setBracketDetail(null); return; }
    setLoading(true);
    appelApi(`/brackets/${encodeURIComponent(selectedBracket._id)}`)
      .then(r => { if (r.ok && r.data) setBracketDetail(r.data.data); else alert('❌ Bracket indisponible : ' + r.message); })
      .finally(() => setLoading(false));
  }, [selectedBracket]);

  async function generateBracket() {
    if (!bracketDetail) return;
    const players = bracketDetail.registeredPlayers || [];
    if (players.length < 2) { alert('Pas assez de joueurs inscrits.'); return; }
    if (!confirm(`Générer le bracket avec ${players.length} joueurs ?`)) return;
    const activeKey = localStorage.getItem('z7_external_api_key') || session.apiKey;
    const teamSize = parseInt(bracketDetail.mode) || 1;
    const nbTeams = Math.max(2, Math.floor(bracketDetail.size / teamSize));
    const numRounds = Math.ceil(Math.log2(nbTeams));
    const r1Slots = Math.pow(2, numRounds - 1);
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matches: any[] = [];
    for (let i = 0; i < r1Slots; i++) {
      const p1 = shuffled[i * 2]?.pseudo || shuffled[i * 2]?.name || null;
      const p2 = shuffled[i * 2 + 1]?.pseudo || shuffled[i * 2 + 1]?.name || null;
      matches.push({ round: 1, matchIndex: i, p1, p2, winner: null, score: null });
    }
    const res = await fetch(`${API}/brackets/${bracketDetail._id}/match`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
      body: JSON.stringify({ matches }),
    });
    const data = await res.json();
    if (data.success) setBracketDetail(data.data);
    else alert('Erreur: ' + data.message);
  }

  async function saveMatch(winner: string) {
    if (!bracketDetail || !matchModal) return;
    const score = `${scoreP1}-${scoreP2}`;
    const activeKey = localStorage.getItem('z7_external_api_key') || session.apiKey;
    const res = await fetch(`${API}/brackets/${bracketDetail._id}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
      body: JSON.stringify({
        round: matchModal.round,
        matchIndex: matchModal.matchIndex,
        p1: matchModal.p1,
        p2: matchModal.p2,
        winner,
        score,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setBracketDetail(data.data);
      setMatchModal(null);
      setScoreP1(''); setScoreP2('');
    }
  }

  function centerBracket() {
    if (!treeRef.current) return;
    const inner = treeRef.current.firstElementChild as HTMLElement;
    if (!inner) return;
    const containerW = treeRef.current.offsetWidth;
    const innerW = inner.offsetWidth;
    inner.style.marginLeft = innerW < containerW ? Math.floor((containerW - innerW) / 2) + 'px' : '0';
  }

  useEffect(() => {
    if (!bracketDetail || !treeRef.current) return;
    const html = buildBracketHTML(bracketDetail);
    treeRef.current.innerHTML = html;
    const handler = (e: Event) => {
      const target = (e.target as HTMLElement).closest('[data-round]') as HTMLElement;
      if (!target) return;
      const round = parseInt(target.dataset.round || '0');
      const matchIndex = parseInt(target.dataset.match || '0');
      const p1 = target.dataset.p1 || null;
      const p2 = target.dataset.p2 || null;
      const winner = target.dataset.winner || null;
      const score = target.dataset.score || null;
      if (!p1 && !p2) return;
      setScoreP1(score?.split('-')[0] || '');
      setScoreP2(score?.split('-')[1] || '');
      setMatchModal({ round, matchIndex, p1, p2, currentWinner: winner, currentScore: score });
    };
    treeRef.current.addEventListener('click', handler);
    setTimeout(centerBracket, 100);
    window.addEventListener('resize', centerBracket);
    return () => {
      treeRef.current?.removeEventListener('click', handler);
      window.removeEventListener('resize', centerBracket);
    };
  }, [bracketDetail]);

  const color = bracketDetail?.color || '#33C6FF';
  const registered = bracketDetail?.registeredPlayers?.length || bracketDetail?.registered || 0;
  const size = bracketDetail?.size || 0;

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
          <button
            onClick={() => { chargerBrackets(); }}
            style={{ ...s.btn, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
          >↻ Rafraîchir</button>
          <Dropdown
            value={selectedBracket?._id || ''}
            onChange={(_, item) => setSelectedBracket(item)}
            placeholder="Sélectionner un bracket"
            options={brackets.map(b => ({ value: b._id, label: b.title, item: b }))}
          />
          {bracketDetail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' as const }}>
              {(!bracketDetail.matches || bracketDetail.matches.length === 0) && (
                <button onClick={generateBracket} style={{ ...s.btn, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}>
                  🎲 Générer le bracket
                </button>
              )}
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial' }}>{bracketDetail.mode} · {bracketDetail.style} · {bracketDetail.region}</span>
              <div style={{ padding: '4px 12px', background: color + '22', border: `1px solid ${color}55`, borderRadius: 20, fontSize: 11, fontWeight: 700, color }}>
                {registered}/{size} joueurs
              </div>
              <div style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: bracketDetail.status === 'finished' ? 'rgba(255,255,255,0.06)' : bracketDetail.status === 'ongoing' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                color: bracketDetail.status === 'finished' ? 'rgba(255,255,255,0.3)' : bracketDetail.status === 'ongoing' ? '#22c55e' : '#fbbf24',
              }}>
                {bracketDetail.status === 'finished' ? '✅ Terminé' : bracketDetail.status === 'ongoing' ? '🔴 En cours' : '🕐 Bientôt'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...s.card, flex: 1, overflow: 'auto', minHeight: 0 }}>
        {!selectedBracket && <div style={s.empty}>Sélectionnez un bracket pour afficher l'arbre</div>}
        {loading && <div style={s.empty}>⏳ Chargement...</div>}
        {bracketDetail && !loading && (
          <>
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{bracketDetail.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial' }}>
                {new Date(bracketDetail.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: 'Arial' }}>
                <span>Participants</span>
                <span style={{ color, fontWeight: 700 }}>{registered}/{size}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${size > 0 ? Math.round(registered / size * 100) : 0}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>
            <div ref={treeRef} style={{ overflowX: 'auto', width: '100%' }} />
          </>
        )}
      </div>

      {matchModal && (() => {
        const c1 = '#33C6FF';
        const c2 = '#f97316';
        const mode = bracketDetail?.mode || '1V1';
        const maxPlayers = Math.max(
          matchModal.p1 ? matchModal.p1.split(' / ').length : 1,
          matchModal.p2 ? matchModal.p2.split(' / ').length : 1
        );
        const renderTeamCard = (name: string | null, color: string, score: string, setScore: (v: string) => void) => {
          const players = name ? name.split(' / ') : [];
          const slots = Array.from({ length: maxPlayers }, (_, i) => players[i]?.trim() || null);
          return (
            <div style={{ flex: 1, background: `${color}11`, border: `1px solid ${color}44`, borderRadius: 14, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {slots.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: p ? `${color}33` : 'rgba(255,255,255,0.04)', border: `1px solid ${p ? color : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: p ? color : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                      {p ? p.substring(0, 2).toUpperCase() : '?'}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p ? color : 'rgba(255,255,255,0.2)', fontFamily: 'Inter,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>{p || '—'}</span>
                  </div>
                ))}
              </div>
              <input type="number" min="0" max="9" value={score} onChange={e => setScore(e.target.value)}
                style={{ width: '100%', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 10, padding: '8px', color, fontSize: 26, fontWeight: 900, textAlign: 'center', outline: 'none', fontFamily: 'Inter,sans-serif' }} />
            </div>
          );
        };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
            onClick={() => setMatchModal(null)}>
            <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: 460, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 16 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', textAlign: 'center' }}>⚔️ Résultat du match</div>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
                {renderTeamCard(matchModal.p1, c1, scoreP1, setScoreP1)}
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)', fontWeight: 900, flexShrink: 0, display: 'flex', alignItems: 'center' }}>VS</div>
                {renderTeamCard(matchModal.p2, c2, scoreP2, setScoreP2)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {matchModal.p1 && (
                  <button onClick={() => saveMatch(matchModal.p1!)} style={{
                    flex: 1, padding: '11px', borderRadius: 12, fontFamily: 'Inter,sans-serif',
                    background: matchModal.currentWinner === matchModal.p1 ? `${c1}33` : `${c1}11`,
                    border: `2px solid ${matchModal.currentWinner === matchModal.p1 ? c1 : c1 + '44'}`,
                    color: c1, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    {matchModal.currentWinner === matchModal.p1 ? '🏆 ' : ''}Équipe {matchModal.matchIndex * 2 + 1} gagne
                  </button>
                )}
                {matchModal.p2 && (
                  <button onClick={() => saveMatch(matchModal.p2!)} style={{
                    flex: 1, padding: '11px', borderRadius: 12, fontFamily: 'Inter,sans-serif',
                    background: matchModal.currentWinner === matchModal.p2 ? `${c2}33` : `${c2}11`,
                    border: `2px solid ${matchModal.currentWinner === matchModal.p2 ? c2 : c2 + '44'}`,
                    color: c2, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    {matchModal.currentWinner === matchModal.p2 ? '🏆 ' : ''}Équipe {matchModal.matchIndex * 2 + 2} gagne
                  </button>
                )}
              </div>
              <button onClick={() => setMatchModal(null)}
                style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                Annuler
              </button>
            </div>
          </div>
        );
      })()}

      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card:  { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
  btn:   { padding: '10px 16px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 60 },
};