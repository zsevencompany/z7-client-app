import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
const logoImg = new URL('../assets/LOGO-Z7-esports.png', import.meta.url).href;

import { API } from '../config';

interface LoginProps {
  onConnected: (data: {
    apiKey: string;
    organizerId: string;
    organizerName: string;
    tournaments: any[];
    token: string;
  }) => void;
}

export default function Login({ onConnected }: LoginProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey]     = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [showKey, setShowKey]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const saved = localStorage.getItem('z7_api_key');
    if (saved) { setApiKey(saved); setShowKey(true); }
    checkServer();
  }, []);

  async function checkServer() {
    try {
      await fetch(`${API}/settings/themes`, { signal: AbortSignal.timeout(4000) });
      setServerStatus('online');
    } catch {
      setServerStatus('offline');
    }
  }

  async function handleLogin() {
    setError(''); setSuccess(false);
    if (!email.trim())   { setError('Veuillez entrer votre email.');    return; }
    if (!password.trim()){ setError('Veuillez entrer votre mot de passe.'); return; }
    if (!apiKey.trim())  { setError('Veuillez entrer votre clef API.'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/client-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, apiKey: apiKey.trim() }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        localStorage.setItem('z7_api_key', apiKey.trim());
        localStorage.setItem('z7_token',   data.data.token);
        setTimeout(() => onConnected({
          apiKey:        apiKey.trim(),
          organizerId:   data.data.id        || '',
          organizerName: data.data.name      || data.data.pseudo || '',
          tournaments:   data.data.tournaments || [],
          token:         data.data.token,
        }), 1000);
      } else {
        setError(data.message || 'Identifiants incorrects.');
      }
    } catch (err: any) {
      setError(err.name === 'TimeoutError'
        ? 'Le serveur ne répond pas.'
        : 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleLogin();
  }

  const statusLabel = {
    checking: 'Vérification...',
    online:   'Serveur connecté',
    offline:  'Serveur hors ligne'
  }[serverStatus];

  return (
    <div style={s.root}>
      <div style={s.glowPurple} />
      <div style={s.glowBlue} />
      <div style={s.grid} />

      <div style={s.wrap}>

        {/* Brand */}
        <div style={s.brand}>
          <img src={logoImg} alt="Z7" style={{ width: 110, height: 110, objectFit: 'contain' }} />
          <div>
            <div style={s.brandName}>Z7 Competition</div>
            <div style={s.brandSub}>Client organisateur</div>
          </div>
        </div>

        {/* Carte */}
        <div style={s.card}>
          <div style={s.cardTitle}>Connexion</div>
          <div style={s.cardDesc}>Rentrez vos identifiants pour vous connecter à votre espace client.</div>

          {error && (
            <div style={s.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={s.successBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Connexion réussie ! Chargement...</span>
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Email</label>
            <div style={s.inputWrap}>
              <svg style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} onKeyDown={onKey} placeholder="votre@email.com" autoComplete="email"
                style={{ ...s.input, borderColor: error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)' }} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Mot de passe</label>
            <div style={s.inputWrap}>
              <svg style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={onKey} placeholder="••••••••" autoComplete="current-password"
                style={{ ...s.input, borderColor: error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)' }} />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={s.eyeBtn}>
                {showPwd ? (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
                : (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)}
              </button>
            </div>
          </div>

          <div style={{ ...s.field, marginBottom: 20 }}>
            <label style={s.label}>Clef API</label>
            <div style={s.inputWrap}>
              <svg style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
              <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => { setApiKey(e.target.value); setError(''); }} onKeyDown={onKey} placeholder="xxxxxxxxxxxx-xxxxxxx-xxxxxxx" autoComplete="off" spellCheck={false}
                style={{ ...s.input, borderColor: error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', fontFamily: 'monospace' }} />
              <button type="button" onClick={() => setShowKey(v => !v)} style={s.eyeBtn}>
                {showKey ? (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
                : (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)}
              </button>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading || success}
            style={{ ...s.btnConnect, opacity: loading || success ? 0.7 : 1, cursor: loading || success ? 'not-allowed' : 'pointer' }}>
            {loading ? (<><div style={s.spinner} /><span>Vérification...</span></>) : (<span>Se connecter</span>)}
          </button>

          <div style={{ ...s.divider, marginTop: 20 }}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>où trouver ma clef</span>
            <div style={s.dividerLine} />
          </div>

          <div style={s.infoBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#33C6FF" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              Votre clef API est disponible dans{' '}
              <strong style={{ color: '#33C6FF', fontWeight: 600 }}>Mon compte → Clef API</strong>
              {' '}sur z7competition.com.
            </span>
          </div>

          <div style={s.serverStatus}>
            <div style={{ ...s.statusDot, background: serverStatus === 'online' ? '#4ade80' : serverStatus === 'offline' ? '#ef4444' : '#FFB700', boxShadow: serverStatus === 'online' ? '0 0 6px #4ade80' : 'none' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{statusLabel}</span>
          </div>
        </div>

        <div style={s.footer}>Z7 Competition © 2026 — v2.0.0</div>
      </div>

      <style>{`
        @keyframes z7spin { to { transform: rotate(360deg); } }
        @keyframes z7fadein { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  glowPurple: { position: 'fixed', width: 600, height: 600, top: -200, left: -150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  glowBlue: { position: 'fixed', width: 500, height: 500, bottom: -180, right: -120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(51,198,255,0.10) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  grid: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)' },
  wrap: { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%', maxWidth: 440, padding: 24 },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  brandName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 3, background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, textAlign: 'center' } as any,
  brandSub: { fontSize: 11, fontWeight: 600, letterSpacing: 3, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center' } as any,
  card: { width: '100%', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px) saturate(150%)', WebkitBackdropFilter: 'blur(40px) saturate(150%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24, lineHeight: 1.5 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16, animation: 'z7fadein 0.2s ease' },
  successBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#4ade80', marginBottom: 16, animation: 'z7fadein 0.2s ease' },
  field: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' } as any,
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, pointerEvents: 'none' },
  input: { width: '100%', border: '1px solid', borderRadius: 12, padding: '13px 42px', color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, background 0.2s' },
  eyeBtn: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnConnect: { width: '100%', padding: 14, background: 'linear-gradient(135deg, #33C6FF, #8B5CF6)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.2s' } as any,
  spinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'z7spin 0.7s linear infinite' },
  divider: { display: 'flex', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' },
  dividerText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' },
  infoBadge: { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(51,198,255,0.06)', border: '1px solid rgba(51,198,255,0.15)', borderRadius: 12, padding: '12px 14px', marginTop: 16 },
  serverStatus: { display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 12 },
  statusDot: { width: 6, height: 6, borderRadius: '50%', transition: 'background 0.3s' },
  footer: { fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: 0.5 } as any,
};