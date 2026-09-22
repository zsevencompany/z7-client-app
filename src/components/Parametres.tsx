import { useState, useEffect } from 'react';

import { API } from '../config';
const DEFAULT_REPLAY_PATH = 'C:\\Users\\%USERNAME%\\AppData\\Local\\FortniteGame\\Saved\\Demos';

interface ParametresProps {
  session: {
    apiKey: string;
    organizerId: string;
    organizerName: string;
    token: string;
  };
}

export default function Parametres({ session }: ParametresProps) {
  const [replayPath, setReplayPath]         = useState('');
  const [externalKey, setExternalKey]       = useState('');
  const [showExtKey, setShowExtKey]         = useState(false);
  const [keyStatus, setKeyStatus]           = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [keyInfo, setKeyInfo]               = useState<any>(null);
  const [saved, setSaved]                   = useState(false);

  const replayAPI = (window as any).replayAPI;

  useEffect(() => {
    const savedPath = localStorage.getItem('z7_replay_path');
    setReplayPath(savedPath || DEFAULT_REPLAY_PATH);
    const savedKey = localStorage.getItem('z7_external_api_key') || '';
    setExternalKey(savedKey);
    if (savedKey) verifyExternalKey(savedKey);
  }, []);

  async function verifyExternalKey(key: string) {
    if (!key.trim()) { setKeyStatus('idle'); setKeyInfo(null); return; }
    setKeyStatus('checking');
    try {
      const res = await fetch(`${API}/tournaments/my`, {
        headers: { 'x-api-key': key.trim() },
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.success) {
        // Récupérer le pseudo depuis la clef
        const pseudo = key.trim().split('-').slice(1, -1).join('-') || 'Organisateur';
        setKeyStatus('valid');
        setKeyInfo({ name: pseudo, tournaments: data.data?.length || 0 });
      } else {
        setKeyStatus('invalid');
        setKeyInfo(null);
      }
    } catch {
      setKeyStatus('invalid');
      setKeyInfo(null);
    }
  }

  async function browsePath() {
    if (!replayAPI) { alert('Disponible uniquement dans Electron'); return; }
    const result = await replayAPI.selectFolder();
    if (result?.success && result.path) setReplayPath(result.path);
  }

  function saveSettings() {
    localStorage.setItem('z7_replay_path', replayPath.trim() || DEFAULT_REPLAY_PATH);
    if (externalKey.trim() && keyStatus === 'valid') {
      localStorage.setItem('z7_external_api_key', externalKey.trim());
    } else if (!externalKey.trim()) {
      localStorage.removeItem('z7_external_api_key');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clearExternalKey() {
    setExternalKey('');
    setKeyStatus('idle');
    setKeyInfo(null);
    localStorage.removeItem('z7_external_api_key');
  }

  const activeKey = externalKey.trim() && keyStatus === 'valid'
    ? externalKey.trim()
    : session.apiKey;

  const isUsingExternal = activeKey !== session.apiKey;

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>

      <div style={s.pageTitle}>Paramètres</div>

      {/* ── Clef API active ── */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#33C6FF" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          <span style={s.cardTitle}>Clef API active</span>
          {isUsingExternal && (
            <span style={s.badgeExternal}>Externe</span>
          )}
        </div>
        <div style={s.cardDesc}>
          La clef API utilisée pour charger les tournois et envoyer les résultats.
        </div>

        {/* Clef active actuelle */}
        <div style={s.infoRow}>
          <div style={s.infoLabel}>Clef actuelle</div>
          <div style={{ ...s.infoValue, fontFamily: 'monospace', fontSize: 12 }}>
            {isUsingExternal ? externalKey : session.apiKey}
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

        {/* Clef externe */}
        <div style={s.field}>
          <label style={s.label}>Connexion avec une clef API différente</label>
          <div style={s.fieldDesc}>
            Entrez la clef d'un autre organisateur pour gérer ses tournois tout en restant connecté avec votre compte.
          </div>
          <div style={s.inputWrap}>
            <svg style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
            <input
              type={showExtKey ? 'text' : 'password'}
              value={externalKey}
              onChange={e => { setExternalKey(e.target.value); setKeyStatus('idle'); setKeyInfo(null); }}
              placeholder="xxxxxxxxxxxx-PSEUDO-Creator"
              autoComplete="off"
              spellCheck={false}
              style={{
                ...s.input,
                borderColor: keyStatus === 'valid' ? 'rgba(74,222,128,0.4)' : keyStatus === 'invalid' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)',
                fontFamily: 'monospace',
              }}
            />
            <button type="button" onClick={() => setShowExtKey(v => !v)} style={s.eyeBtn}>
              {showExtKey
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>

          {/* Status */}
          {keyStatus === 'checking' && (
            <div style={s.statusRow}>
              <div style={{ ...s.statusDot, background: '#FFB700', animation: 'z7pulse 1s infinite' }} />
              <span style={{ color: '#FFB700' }}>Vérification...</span>
            </div>
          )}
          {keyStatus === 'valid' && keyInfo && (
            <div style={s.statusRow}>
              <div style={{ ...s.statusDot, background: '#4ade80' }} />
              <span style={{ color: '#4ade80' }}>Clef valide — <strong>{keyInfo.name}</strong> · {keyInfo.tournaments} tournois</span>
            </div>
          )}
          {keyStatus === 'invalid' && (
            <div style={s.statusRow}>
              <div style={{ ...s.statusDot, background: '#ef4444' }} />
              <span style={{ color: '#ef4444' }}>Clef invalide ou expirée</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              onClick={() => verifyExternalKey(externalKey)}
              disabled={!externalKey.trim() || keyStatus === 'checking'}
              style={{ ...s.btnSecondary, opacity: !externalKey.trim() ? 0.4 : 1 }}
            >
              Vérifier
            </button>
            {externalKey && (
              <button onClick={clearExternalKey} style={s.btnDanger}>
                Retirer la clef externe
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Chemin replays ── */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#33C6FF" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span style={s.cardTitle}>Dossier Replays Fortnite</span>
        </div>
        <div style={s.cardDesc}>
          Chemin vers le dossier où Fortnite sauvegarde les replays. La surveillance cherchera les nouveaux fichiers <code style={{ color: '#33C6FF', fontSize: 11 }}>.replay</code> dans ce dossier.
        </div>

        <div style={s.field}>
          <label style={s.label}>Chemin du dossier</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...s.inputWrap, flex: 1 }}>
              <svg style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <input
                type="text"
                value={replayPath}
                onChange={e => setReplayPath(e.target.value)}
                placeholder={DEFAULT_REPLAY_PATH}
                style={{ ...s.input, fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
            {replayAPI && (
              <button onClick={browsePath} style={s.btnBrowse}>
                📁 Parcourir
              </button>
            )}
          </div>
          <div style={s.fieldDesc}>
            Par défaut : <code style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{DEFAULT_REPLAY_PATH}</code>
          </div>
        </div>
      </div>

      {/* ── Bouton sauvegarder ── */}
      <button onClick={saveSettings} style={saved ? s.btnSaved : s.btnSave}>
        {saved ? '✅ Paramètres sauvegardés !' : 'Sauvegarder les paramètres'}
      </button>

      <style>{`@keyframes z7pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 1, marginBottom: 4 },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '20px 22px',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#fff' },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial, sans-serif', lineHeight: 1.5, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldDesc: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif', lineHeight: 1.5 },
  label: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 } as React.CSSProperties,
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, pointerEvents: 'none' },
  input: {
    width: '100%', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '11px 40px 11px 38px',
    color: '#fff', fontSize: 13, background: 'rgba(255,255,255,0.05)',
    outline: 'none', transition: 'border-color 0.2s',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.3)', padding: 2,
    display: 'flex', alignItems: 'center',
  },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: 'Arial, sans-serif' },
  statusDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  infoRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' },
  infoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial, sans-serif', width: 100, flexShrink: 0 },
  infoValue: { fontSize: 13, color: '#fff', fontWeight: 600 },
  badgeExternal: {
    padding: '2px 8px', borderRadius: 50,
    background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)',
    color: '#a78bfa', fontSize: 11, fontWeight: 700,
  },
  btnSecondary: {
    padding: '9px 18px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    color: '#fff', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  btnDanger: {
    padding: '9px 18px', background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10,
    color: '#ef4444', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  btnBrowse: {
    padding: '11px 16px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    color: '#fff', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  btnSave: {
    padding: '13px 28px', background: 'linear-gradient(135deg, #33C6FF, #8B5CF6)',
    border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
  btnSaved: {
    padding: '13px 28px', background: 'rgba(74,222,128,0.15)',
    border: '1px solid rgba(74,222,128,0.4)', borderRadius: 12,
    color: '#4ade80', fontSize: 14, fontWeight: 700,
    cursor: 'default', letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
};