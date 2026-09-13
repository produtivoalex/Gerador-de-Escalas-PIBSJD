import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../types';
import { parseAppData } from './validation';

export interface CloudState { version: number; data: AppData | null; updated: string | null }
export interface CloudSession extends CloudState { username: string }
const key = (username: string) => `cultogen_cloud_v1:${username}`;

export async function cloudRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Não foi possível sincronizar.'), { status: response.status, remote: data, recoveryAvailable: data.recoveryAvailable, setupRequired: data.setupRequired });
  return data;
}

export function cachedCloud(session: CloudSession) {
  try {
    const cached = JSON.parse(localStorage.getItem(key(session.username)) || 'null');
    if (cached && Number.isSafeInteger(cached.version) && typeof cached.baseline === 'string' && JSON.stringify(cached.data) !== cached.baseline) {
      return { ...cached, data: parseAppData(cached.data) };
    }
  } catch { /* Keep unreadable cache untouched; backups remain available. */ }
  return null;
}

export function useCloudSync(data: AppData, onRemote: (data: AppData) => void, session?: CloudSession, paused = false) {
  const [cache] = useState(() => session ? cachedCloud(session) : null);
  const version = useRef(cache?.version ?? session?.version ?? 0);
  const baseline = useRef(cache?.baseline ?? JSON.stringify(session?.data));
  const latest = useRef(data); latest.current = data;
  const apply = useRef(onRemote); apply.current = onRemote;
  const pause = useRef(paused); pause.current = paused;
  const busy = useRef(false);
  const [status, setStatus] = useState(session ? 'Conectado à nuvem' : '');
  const [conflict, setConflict] = useState<CloudState | null>(cache && session && cache.version !== session.version ? session : null);
  const conflictRef = useRef(conflict); conflictRef.current = conflict;
  function persist() {
    if (!session) return;
    try { localStorage.setItem(key(session.username), JSON.stringify({ data: latest.current, version: version.current, baseline: baseline.current })); }
    catch { setStatus('Cópia local indisponível. Exporte um backup.'); }
  }
  useEffect(() => { persist(); }, [data, session?.username]);
  useEffect(() => {
    if (!session) return;
    let stopped = false;
    async function sync() {
      if (busy.current || pause.current || conflictRef.current) return;
      busy.current = true;
      const sent = latest.current, raw = JSON.stringify(sent);
      const dirty = raw !== baseline.current;
      try {
        const remote: CloudState = await cloudRequest('/api/state', dirty ? { method: 'PUT', body: JSON.stringify({ version: version.current, data: sent }) } : {});
        if (stopped) return;
        // An editor may have opened while this read was in flight. Retry after it closes.
        if (!dirty && pause.current) return;
        if (!dirty && remote.version !== version.current && JSON.stringify(latest.current) !== raw) {
          setConflict(remote); setStatus('Conflito: há alterações em outro dispositivo.'); return;
        }
        version.current = remote.version;
        baseline.current = JSON.stringify(remote.data);
        if (!dirty && remote.data && JSON.stringify(latest.current) === raw && raw !== baseline.current) {
          latest.current = parseAppData(remote.data); apply.current(latest.current);
        }
        persist();
        setStatus(JSON.stringify(latest.current) === baseline.current ? `Sincronizado · versão ${remote.version}` : 'Salvando alterações…');
      } catch (error) {
        if (stopped) return;
        if ((error as any).status === 409) { setConflict((error as any).remote); setStatus('Conflito: escolha qual versão manter.'); }
        else setStatus(error instanceof Error ? error.message + ' Alterações mantidas neste navegador.' : 'Sem conexão. Alterações mantidas neste navegador.');
      } finally { busy.current = false; }
    }
    const timer = setInterval(sync, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [session?.username]);

  const resolve = (choice: 'local' | 'remote') => {
    if (!conflict || pause.current) return;
    if (!confirm(choice === 'remote' ? 'Usar a versão da nuvem substituirá as alterações locais. Exporte um backup antes de continuar.' : 'Enviar a versão local substituirá a versão atual na nuvem. A anterior ficará no histórico. Continuar?')) return;
    version.current = conflict.version;
    baseline.current = JSON.stringify(conflict.data);
    if (choice === 'remote' && conflict.data) { latest.current = conflict.data; apply.current(conflict.data); }
    persist(); setConflict(null); setStatus('Sincronizando…');
  };
  return { status, conflict, resolve };
}
