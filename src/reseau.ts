// ============================================================
//  src/reseau.ts  --  UN APPEL AU SERVEUR QUI NE SE TAIT JAMAIS
// ============================================================
//  Audit pre-tournoi du 12/10/2026. Les appels du logiciel etaient des
//  `fetch` nus : aucun delai maximal (un serveur lent figeait l'ecran
//  sans fin), et plusieurs `.catch(() => {})` avalaient l'echec — une
//  disqualification non enregistree, une liste de tournois vide, un
//  resultat non parti, sans que l'organisateur le sache, en plein direct.
//
//  `appelApi` rend TOUJOURS un resultat lisible :
//    { ok: true,  status, data }                    le serveur a accepte ;
//    { ok: false, status, data, message }           refus du serveur, ou
//                                                   reseau / delai depasse.
//  Il ne leve jamais : l'appelant decide quoi afficher.
// ============================================================
import { API } from './config';

export type ReponseApi<T = any> = { ok: boolean; status: number; data: T | null; message: string };

export async function appelApi<T = any>(chemin: string, options: {
  methode?: string; corps?: unknown; clef?: string; jeton?: string; delaiMs?: number;
} = {}): Promise<ReponseApi<T>> {
  const { methode = 'GET', corps, clef, jeton, delaiMs = 20000 } = options;
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), delaiMs);
  try {
    const entetes: Record<string, string> = {};
    if (corps !== undefined) entetes['Content-Type'] = 'application/json';
    if (clef) entetes['x-api-key'] = clef;
    if (jeton) entetes['Authorization'] = `Bearer ${jeton}`;
    const res = await fetch(`${API}${chemin}`, {
      method: methode, headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: controle.signal,
    });
    let data: any = null;
    try { data = await res.json(); } catch { data = null; }
    const ok = res.ok && !!data && data.success !== false;
    const message = ok ? '' : ((data && data.message) || `Erreur serveur (HTTP ${res.status})`);
    return { ok, status: res.status, data, message };
  } catch (e: any) {
    const message = e && e.name === 'AbortError'
      ? `Le serveur n'a pas répondu en ${Math.round(delaiMs / 1000)} s. Rien n'est garanti : vérifie avant de recommencer.`
      : 'Serveur injoignable : vérifie la connexion internet.';
    return { ok: false, status: 0, data: null, message };
  } finally {
    clearTimeout(minuterie);
  }
}

//  La clef qui fait foi pour les routes de competition : la clef externe
//  si l'organisateur en a saisi une, sinon celle de la session.
export function clefActive(clefSession: string): string {
  return localStorage.getItem('z7_external_api_key') || localStorage.getItem('z7_api_key') || clefSession;
}
