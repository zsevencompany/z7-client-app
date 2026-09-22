import { useState, useEffect } from 'react';
import Login from './components/Login';
import MainApp from './components/MainApp';

export default function App() {
  const [session, setSession]   = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; progress?: number; ready?: boolean } | null>(null);

  // Restaurer session au chargement
  useEffect(() => {
    const token  = localStorage.getItem('z7_token');
    const apiKey = localStorage.getItem('z7_api_key');
    if (!token || !apiKey) { setChecking(false); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('z7_token');
        localStorage.removeItem('z7_api_key');
        setChecking(false);
        return;
      }
    } catch { setChecking(false); return; }
    setSession({ apiKey, organizerId: '', organizerName: '', tournaments: [], token });
    setChecking(false);
  }, []);

  // Auto-update listeners
  useEffect(() => {
    const api = (window as any).replayAPI;
    if (!api) return;
    api.onUpdateAvailable?.((data: any) => setUpdateInfo({ version: data.version }));
    api.onUpdateProgress?.((data: any) => setUpdateInfo(prev => prev ? { ...prev, progress: data.percent } : null));
    api.onUpdateDownloaded?.((data: any) => setUpdateInfo(prev => prev ? { ...prev, ready: true, progress: 100 } : null));
  }, []);

  function handleConnected(data: any) { setSession(data); }

  function handleDisconnect() {
    localStorage.removeItem('z7_token');
    localStorage.removeItem('z7_api_key');
    setSession(null);
  }

  if (checking) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#080b13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#33C6FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      {!session ? <Login onConnected={handleConnected} /> : <MainApp session={session} onDisconnect={handleDisconnect} />}

      {/* Popup mise à jour */}
      {updateInfo && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: 'rgba(10,12,20,0.97)', border: '1px solid rgba(51,198,255,0.3)', borderRadius: 16, padding: '16px 20px', width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            {updateInfo.ready ? '✅ Mise à jour prête' : '🔄 Mise à jour disponible'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>Version {updateInfo.version}</div>
          {!updateInfo.ready && updateInfo.progress !== undefined && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${updateInfo.progress}%`, background: '#33C6FF', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{updateInfo.progress}%</div>
            </div>
          )}
          {!updateInfo.ready && updateInfo.progress === undefined && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Téléchargement en cours...</div>
          )}
          {updateInfo.ready && (
            <button onClick={() => (window as any).replayAPI?.installUpdate()} style={{ width: '100%', padding: '9px', background: 'linear-gradient(135deg,#33C6FF,#8B5CF6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              🔄 Redémarrer et installer
            </button>
          )}
        </div>
      )}
    </>
  );
}