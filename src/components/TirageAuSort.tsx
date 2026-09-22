import React, { useState, useRef, useEffect, useCallback } from 'react';

const carteImg = new URL('../assets/Carte-a-jouer.png', import.meta.url).href;

type Mode     = 'wheel' | 'cards';
type SpinMode = 'elimination' | 'direct';

const COLORS = ['#33C6FF','#8B5CF6','#F59E0B','#4ADE80','#F97316','#EC4899','#06B6D4','#A78BFA','#34D399','#FB923C'];

export default function TirageAuSort() {
  const [mode, setMode]         = useState<Mode>('wheel');
  const [spinMode, setSpinMode] = useState<SpinMode>('elimination');
  const [items, setItems]       = useState<string[]>(['Choix 1', 'Choix 2', 'Choix 3', 'Choix 4']);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [input, setInput]       = useState('');
  const [popup, setPopup]       = useState<{ text: string; type: 'elimination' | 'direct' } | null>(null);
  const [autoSpin, setAutoSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle]       = useState(0);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  // Refs pour éviter les closures stale
  const eliminatedR  = useRef<string[]>([]);
  const itemsR       = useRef<string[]>(['Choix 1', 'Choix 2', 'Choix 3', 'Choix 4']);
  const angleR       = useRef(0);
  const spinningR    = useRef(false);
  const autoSpinR    = useRef(false);
  const spinModeR    = useRef<SpinMode>('elimination');

  // Sync refs
  useEffect(() => { eliminatedR.current = eliminated; }, [eliminated]);
  useEffect(() => { itemsR.current = items; }, [items]);
  useEffect(() => { angleR.current = angle; }, [angle]);
  useEffect(() => { spinningR.current = spinning; }, [spinning]);
  useEffect(() => { autoSpinR.current = autoSpin; }, [autoSpin]);
  useEffect(() => { spinModeR.current = spinMode; }, [spinMode]);

  const active = items.filter(it => !eliminated.includes(it));

  // ── Dessin ────────────────────────────────────────────
  function drawWheel(a: number, activeList: string[]) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const cx = W / 2, cy = W / 2, r = W / 2 - 8;
    ctx.clearRect(0, 0, W, W);
    if (!activeList.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const slice = (Math.PI * 2) / activeList.length;
    activeList.forEach((item, i) => {
      const start = a + i * slice, end = start + slice;
      const color = COLORS[i % COLORS.length];
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
      ctx.fillStyle = color + '28'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
      const fs = Math.min(15, Math.max(9, 160 / activeList.length));
      ctx.font = `700 ${fs}px Inter, Arial`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 5;
      const maxLen = Math.floor(r * 0.55 / (fs * 0.55));
      ctx.fillText(item.length > maxLen ? item.slice(0, maxLen - 1) + '…' : item, r - 16, fs / 3);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0c14'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 4; ctx.stroke();
  }

  useEffect(() => { drawWheel(angle, active); }, [angle, items, eliminated]);

  // ── Spin — tout en refs ───────────────────────────────
  const doSpin = useCallback(() => {
    const currentElim  = eliminatedR.current;
    const currentItems = itemsR.current;
    const currentActive = currentItems.filter(it => !currentElim.includes(it));
    if (spinningR.current || currentActive.length < 2) return;

    spinningR.current = true;
    setSpinning(true);
    setPopup(null);

    const totalRot   = Math.PI * 2 * (9 + Math.random() * 6);
    const duration   = 4200;
    const start      = performance.now();
    const startAngle = angleR.current;

    function animate(now: number) {
      const t    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur  = startAngle + totalRot * ease;
      angleR.current = cur;
      setAngle(cur);
      drawWheel(cur, currentActive);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      // Fin de la rotation
      const finalAngle = cur % (Math.PI * 2);
      const slice = (Math.PI * 2) / currentActive.length;
      const norm  = (((-finalAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const idx   = Math.floor(norm / slice) % currentActive.length;
      const loser = currentActive[idx];
      const isLast = spinModeR.current === 'elimination' && currentActive.length === 2;

      spinningR.current = false;
      setSpinning(false);

      if (spinModeR.current === 'direct') {
        setPopup({ text: loser, type: 'direct' });
        setTimeout(() => setPopup(null), 2200);
        return;
      }

      // Élimination
      if (isLast) {
        const winner = currentActive.find(a => a !== loser) || loser;
        setPopup({ text: winner, type: 'direct' });
        setTimeout(() => {
          setEliminated(prev => [...prev, loser]);
          eliminatedR.current = [...eliminatedR.current, loser];
          setPopup(null);
          autoSpinR.current = false;
          setAutoSpin(false);
        }, 2200);
      } else {
        setPopup({ text: loser, type: 'elimination' });
        setTimeout(() => {
          const newElim = [...eliminatedR.current, loser];
          eliminatedR.current = newElim;
          setEliminated([...newElim]);
          setPopup(null);
          const remaining = itemsR.current.filter(it => !newElim.includes(it));
          if (autoSpinR.current && remaining.length >= 2) {
            setTimeout(doSpin, 800);
          }
        }, 2200);
      }
    }
    animRef.current = requestAnimationFrame(animate);
  }, []);

  function spin() { doSpin(); }

  function reset() {
    cancelAnimationFrame(animRef.current);
    eliminatedR.current = [];
    setEliminated([]);
    setPopup(null);
    angleR.current = 0;
    setAngle(0);
    spinningR.current = false;
    setSpinning(false);
    autoSpinR.current = false;
    setAutoSpin(false);
    setFlippedCard(null);
  }

  function addItem() {
    const lines = input.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setItems(prev => { const toAdd = lines.filter(l => !prev.includes(l)); return [...prev, ...toAdd]; });
    setInput('');
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const lines = text.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      setItems(prev => { const toAdd = lines.filter(l => !prev.includes(l)); return [...prev, ...toAdd]; });
      setInput('');
    } else { setInput(prev => prev + text); }
  }

  function removeItem(item: string) {
    setItems(prev => prev.filter(i => i !== item));
    setEliminated(prev => prev.filter(i => i !== item));
    eliminatedR.current = eliminatedR.current.filter(i => i !== item);
  }

  function flipCard(idx: number) {
    if (spinning || flippedCard !== null) return;
    const item = active[idx];
    setFlippedCard(idx);
    const isLast = spinMode === 'elimination' && active.length === 2;
    if (isLast) {
      const winner = active.find(a => a !== item) || item;
      setPopup({ text: winner, type: 'direct' });
      setTimeout(() => { setEliminated(prev => [...prev, item]); setFlippedCard(null); setPopup(null); }, 2200);
    } else {
      setPopup({ text: item, type: spinMode === 'direct' ? 'direct' : 'elimination' });
      if (spinMode === 'elimination') {
        setTimeout(() => { setEliminated(prev => [...prev, item]); setFlippedCard(null); setPopup(null); }, 2200);
      }
    }
  }

  // ── Rendu ─────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '20px 24px', display: 'flex', gap: 16, position: 'relative' }}>

      {/* CENTRE */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, alignItems: 'center' }}>

        {/* Mode */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', justifyContent: 'center' }}>
          {(['elimination', 'direct'] as SpinMode[]).map(m => (
            <button key={m} onClick={() => { setSpinMode(m); reset(); }} style={{
              padding: '7px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: spinMode === m ? (m === 'elimination' ? 'rgba(239,68,68,0.2)' : 'rgba(255,183,0,0.2)') : 'rgba(255,255,255,0.06)',
              color: spinMode === m ? (m === 'elimination' ? '#ef4444' : '#FFB700') : 'rgba(255,255,255,0.5)',
              outline: spinMode === m ? `1px solid ${m === 'elimination' ? 'rgba(239,68,68,0.4)' : 'rgba(255,183,0,0.4)'}` : 'none',
            }}>
              {m === 'elimination' ? '❌ Élimination' : '🏆 Choix direct'}
            </button>
          ))}
          {(eliminated.length > 0 || autoSpin) && (
            <button onClick={reset} style={{ padding: '7px 14px', borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
              🔄 Réinitialiser
            </button>
          )}
        </div>

        {/* ROUE */}
        {mode === 'wheel' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, flex: 1 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%) rotate(180deg)', zIndex: 2, color: '#FFB700', fontSize: 28, filter: 'drop-shadow(0 0 8px #FFB700)', lineHeight: 1 }}>▶</div>
              <canvas ref={canvasRef} width={460} height={460} style={{ borderRadius: '50%', display: 'block', filter: 'drop-shadow(0 0 20px rgba(51,198,255,0.15))' }} />
              {/* Popup centré sur la roue */}
              {popup && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', zIndex: 10, pointerEvents: 'none' }}>
                  <div style={{
                    background: 'rgba(10,12,20,0.97)',
                    border: popup.type === 'direct' ? '2px solid #FFB700' : '2px solid #ef4444',
                    borderRadius: 20, padding: '28px 44px', textAlign: 'center',
                    boxShadow: popup.type === 'direct' ? '0 0 60px rgba(255,183,0,0.5)' : '0 0 60px rgba(239,68,68,0.4)',
                    animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, color: popup.type === 'direct' ? '#FFB700' : '#ef4444' }}>
                      {popup.type === 'direct' ? '🏆 A gagné' : '❌ Éliminé'}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#fff' }}>{popup.text}</div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {spinMode === 'elimination' && (
                <button onClick={() => { setAutoSpin(v => !v); autoSpinR.current = !autoSpinR.current; }} style={{
                  padding: '13px 20px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: autoSpin ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)',
                  color: autoSpin ? '#4ade80' : 'rgba(255,255,255,0.4)',
                  outline: autoSpin ? '1px solid rgba(74,222,128,0.4)' : 'none',
                }}>
                  {autoSpin ? '⏸ Auto ON' : '▶▶ Auto'}
                </button>
              )}
              <button onClick={spin} disabled={spinning || active.length < 2} style={{
                padding: '13px 52px', borderRadius: 14, fontSize: 15, fontWeight: 900,
                cursor: spinning || active.length < 2 ? 'not-allowed' : 'pointer',
                background: spinning || active.length < 2 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#33C6FF,#8B5CF6)',
                border: 'none', color: spinning || active.length < 2 ? 'rgba(255,255,255,0.25)' : '#fff',
              }}>
                {spinning ? '🌀 En cours...' : active.length < 2 ? 'Ajoutez des éléments' : '🎰 Faire tourner'}
              </button>
            </div>
          </div>
        )}

        {/* CARTES */}
        {mode === 'cards' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', padding: '20px 0', maxWidth: 600, position: 'relative' }}>
            {active.map((item, i) => (
              <div key={item} onClick={() => flipCard(i)} style={{ width: 140, height: 190, borderRadius: 14, cursor: flippedCard !== null ? 'default' : 'pointer', position: 'relative', transition: 'transform 0.25s', transform: flippedCard === i ? 'scale(1.07)' : 'scale(1)' }}>
                {flippedCard === i ? (
                  <div style={{ width: '100%', height: '100%', borderRadius: 14, background: `${COLORS[i % COLORS.length]}22`, border: `2px solid ${COLORS[i % COLORS.length]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: 30 }}>🎴</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[i % COLORS.length], textAlign: 'center', padding: '0 10px' }}>{item}</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={carteImg} alt="carte" style={{ width: '105%', height: '105%', objectFit: 'contain', opacity: 0.95, marginTop: 8 }} />
                  </div>
                )}
              </div>
            ))}
            {active.length === 0 && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, padding: 40 }}>Plus d'éléments disponibles</div>}
            {popup && (
              <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, pointerEvents: 'none' }}>
                <div style={{ background: 'rgba(10,12,20,0.97)', border: popup.type === 'direct' ? '2px solid #FFB700' : '2px solid #ef4444', borderRadius: 20, padding: '28px 44px', textAlign: 'center', boxShadow: popup.type === 'direct' ? '0 0 60px rgba(255,183,0,0.5)' : '0 0 60px rgba(239,68,68,0.4)', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, color: popup.type === 'direct' ? '#FFB700' : '#ef4444' }}>{popup.type === 'direct' ? '🏆 A gagné' : '❌ Éliminé'}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: '#fff' }}>{popup.text}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Éliminés */}
        {spinMode === 'elimination' && eliminated.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,68,68,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>Éliminés :</span>
            {eliminated.map(e => <span key={e} style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, fontSize: 11, color: 'rgba(239,68,68,0.6)', textDecoration: 'line-through' }}>{e}</span>)}
          </div>
        )}
      </div>

      {/* DROITE */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 8px', marginBottom: 4 }}>Style</div>
          {([['wheel', '🎡', 'Roue'], ['cards', '🃏', 'Cartes cachées']] as [Mode, string, string][]).map(([m, icon, label]) => (
            <button key={m} onClick={() => { setMode(m as Mode); reset(); }} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: mode === m ? 'rgba(51,198,255,0.1)' : 'transparent', color: mode === m ? '#33C6FF' : 'rgba(255,255,255,0.5)', outline: mode === m ? '1px solid rgba(51,198,255,0.25)' : 'none' }}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Éléments ({active.length}/{items.length})</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onPaste={handlePaste}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); } }}
              placeholder="Ajouter..." rows={2}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none', minWidth: 0, resize: 'vertical', fontFamily: 'Arial', lineHeight: 1.4 }} />
            <button onClick={addItem} style={{ padding: '7px 10px', background: 'rgba(51,198,255,0.15)', border: '1px solid rgba(51,198,255,0.3)', borderRadius: 8, color: '#33C6FF', fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start' }}>+</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: 340 }}>
            {items.map((item, i) => {
              const isElim = eliminated.includes(item);
              return (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 8, background: isElim ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isElim ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: isElim ? '#ef4444' : COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: isElim ? 'rgba(255,255,255,0.2)' : '#fff', textDecoration: isElim ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
                  <button onClick={() => removeItem(item)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 12, padding: '0 2px', flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}