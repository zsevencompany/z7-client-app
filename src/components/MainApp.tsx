import React, { useState, useEffect } from 'react';
import Tournois from './Tournois.tsx';
import Bracket from './Bracket.tsx';
import Parametres from './Parametres.tsx';
import TirageAuSort from './TirageAuSort.tsx';
const logoImg = new URL('../assets/LOGO-Z7-esports.png', import.meta.url).href;

import { API } from '../config';

interface Session {
  apiKey: string;
  organizerId: string;
  organizerName: string;
  tournaments: any[];
  token: string;
}

interface Theme {
  bg: string;
  orb1: string;
  orb2: string;
}

interface MainAppProps {
  session: Session;
  onDisconnect: () => void;
}

const TABS = [
  { id: 'tournois', label: 'Tournois' },
  { id: 'bracket',  label: 'Bracket' },
  { id: 'tirage',   label: 'Tirage au sort' },
];

const DEFAULT_THEME: Theme = { bg: '#080b13', orb1: 'rgba(99,102,241,0.3)', orb2: 'rgba(51,198,255,0.2)' };

export default function MainApp({ session, onDisconnect }: MainAppProps) {
  const [activeTab, setActiveTab]           = useState('tournois');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountRef = React.useRef<HTMLDivElement>(null);
  const [user, setUser]   = useState<any>(null);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setShowAccountMenu(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    fetch(`${API}/settings/themes`)
      .then(r => r.json())
      .then(async d => {
        if (!d.success) return;
        const themes = d.data;
        const defTheme = themes.find((t: any) => t.isDefault) || themes[0];
        try {
          const res  = await fetch(`${API}/settings/theme/me`, { headers: { 'x-api-key': session.apiKey } });
          const data = await res.json();
          if (data.success && data.theme) {
            const userTheme = themes.find((t: any) => t.id === data.theme);
            if (userTheme) { setTheme({ bg: userTheme.bg, orb1: userTheme.orb1, orb2: userTheme.orb2 }); return; }
          }
        } catch {}
        if (defTheme) setTheme({ bg: defTheme.bg, orb1: defTheme.orb1, orb2: defTheme.orb2 });
      })
      .catch(() => {});
  }, [session.apiKey]);

  useEffect(() => {
    fetch(`${API}/settings/profile/me`, { headers: { 'x-api-key': session.apiKey } })
      .then(r => r.json())
      .then(d => { if (d.success) setUser(d.data); })
      .catch(() => {});
  }, [session.apiKey]);

  const avatar   = user?.avatar || null;
  const pseudo   = user?.pseudo
    ? user.pseudo.charAt(0).toUpperCase() + user.pseudo.slice(1).toLowerCase()
    : session.organizerName || 'Organisateur';
  const initials = pseudo.slice(0, 2).toUpperCase();
  const avatarBg = user?.avatarColor || 'linear-gradient(135deg, #818cf8, #6366f1)';
  const deco     = (() => { try { return user?.avatarDeco ? JSON.parse(user.avatarDeco) : null; } catch { return null; } })();

  return (
    <div style={{ ...s.root, background: theme.bg }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 20% 50%, ${theme.orb1} 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, ${theme.orb2} 0%, transparent 50%)` }} />
      <div style={s.grid} />

      {/* ── NAVBAR ── */}
      <nav style={s.nav}>
        <div style={s.navContent}>

          {/* Gauche — onglets */}
          <div style={s.navLeft}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...s.navTab, ...(activeTab === tab.id ? s.navTabActive : {}) }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Centre — logo */}
          <div style={s.navLogoCol}>
            <img src={logoImg} alt="Z7" style={s.navLogoImg} />
          </div>

          {/* Droite — profil */}
          <div style={s.navRight}>
            <div ref={accountRef} style={{ position: 'relative' }}>
              <div onClick={() => setShowAccountMenu(v => !v)} style={{ ...s.profilePill, cursor: 'pointer' }}>
                <div style={{ ...s.pillAvatar, background: avatarBg }}>
                  {avatar
                    ? <img src={avatar} alt={pseudo} style={s.pillAvatarImg} />
                    : <span style={s.pillAvatarInitials}>{initials}</span>
                  }
                </div>
                <span style={s.pillName}>{pseudo}</span>
              </div>
              {deco && (deco.gradient || deco.color) && (
                <div style={{
                  position: 'absolute', inset: -2, borderRadius: 50,
                  border: '2px solid transparent', pointerEvents: 'none',
                  ...(deco.gradient ? {
                    backgroundImage: deco.gradient,
                    backgroundOrigin: 'border-box', backgroundClip: 'border-box',
                    WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0) border-box',
                    WebkitMaskComposite: 'destination-out', maskComposite: 'exclude',
                  } : { border: `2px solid ${deco.color}` })
                }} />
              )}
              {showAccountMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  width: 200,
                  background: 'rgba(13,17,23,0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: 6,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 2000,
                }}>
                  <button
                    onClick={() => { setShowAccountMenu(false); setActiveTab('parametres'); }}
                    style={s.menuItem}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Paramètres
                  </button>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setShowAccountMenu(false); onDisconnect(); }}
                    style={{ ...s.menuItem, color: '#ef4444' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </nav>

      {/* ── CONTENU ── */}
      <main style={s.main}>
        {activeTab === 'tournois'   && <Tournois key={activeTab} session={session} />}
        {activeTab === 'bracket'    && <Bracket key={activeTab} session={session} />}
        {activeTab === 'tirage'     && <TirageAuSort />}
        {activeTab === 'parametres' && <Parametres session={session} />}
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw', height: '100vh',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden', position: 'relative',
    fontFamily: "'Inter', 'Arial Black', Arial, sans-serif",
    color: '#fff',
  },
  grid: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
    backgroundSize: '60px 60px',
    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)',
  },
  nav: {
    position: 'fixed', top: 20, left: 20, right: 20,
    width: 'calc(100% - 40px)', height: 62, zIndex: 1000,
    display: 'flex', alignItems: 'center', padding: '0 22px',
    borderRadius: 18,
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(80px) saturate(100%) brightness(1.15)',
    WebkitBackdropFilter: 'blur(80px) saturate(100%) brightness(1.15)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
    boxSizing: 'border-box',
  },
  navContent: { display: 'flex', alignItems: 'center', width: '100%', gap: 12, position: 'relative' },
  navLeft:    { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, zIndex: 1 },
  navTab: {
    background: 'none', border: '1px solid transparent',
    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 900,
    fontFamily: "'Arial Black', Arial, sans-serif",
    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
    padding: '7px 14px', borderRadius: 50, transition: 'all 0.2s',
    whiteSpace: 'nowrap', flexShrink: 0,
  } as React.CSSProperties,
  navTabActive: { color: '#33C6FF', background: 'rgba(51,198,255,0.08)', borderColor: 'rgba(51,198,255,0.2)' },
  navLogoCol:  { position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', zIndex: 0, pointerEvents: 'none' },
  navLogoImg:  { height: 40, objectFit: 'contain' },
  navRight:    { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto', zIndex: 1 },
  profilePill: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '4px 10px 4px 4px',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 50, cursor: 'default', flexShrink: 0,
  },
  pillAvatar: {
    width: 26, height: 26, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  pillAvatarImg:      { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
  pillAvatarInitials: { fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Arial, sans-serif' },
  pillName: {
    fontSize: 12, fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: "'Arial Black', Arial, sans-serif",
    whiteSpace: 'nowrap', letterSpacing: 0.3,
  },
  main: { flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1, marginTop: 82 },
  menuItem: {
    width: '100%', padding: '9px 12px',
    border: 'none', borderRadius: 8,
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13, fontFamily: "'Inter', Arial, sans-serif",
    cursor: 'pointer', textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 10,
    transition: 'background 0.1s',
  } as React.CSSProperties,
};