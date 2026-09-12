import React, { useEffect, useState } from 'react';
import App from '../App';
import { cloudRequest, type CloudSession } from '../services/cloudSync';

export default function SessionGate() {
  const [mode, setMode] = useState<'loading' | 'local' | 'login' | 'cloud'>('loading');
  const [session, setSession] = useState<CloudSession>();
  const [username, setUsername] = useState('produtivoalex');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function check() {
    try {
      const identity = await cloudRequest('/api/session');
      if (identity.enabled === false) { setMode('local'); return; }
      if (!identity.username) { setMode('login'); return; }
      const state = await cloudRequest('/api/state');
      setSession({ ...state, username: identity.username }); setMode('cloud'); setError('');
    } catch { setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'); }
  }
  useEffect(() => { check(); }, []);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await cloudRequest('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }); setPassword(''); await check(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (!confirm('Sair da conta? Confira se as alterações estão sincronizadas ou exporte um backup antes de sair.')) return;
    try { await cloudRequest('/api/logout', { method: 'POST', body: '{}' }); location.reload(); }
    catch { alert('Não foi possível sair. Tente novamente.'); }
  }
  if (mode === 'local') return <App />;
  if (mode === 'cloud') return <App cloud={session} onLogout={logout} />;
  return <main className="min-h-full grid place-items-center bg-gray-100 p-5">
    <form onSubmit={login} className="w-full max-w-sm bg-white p-7 rounded-2xl shadow-lg space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Gerador de Escalas</h1>
      <p className="text-sm text-gray-600">Entre para acessar suas escalas e sincronizar entre dispositivos.</p>
      {mode === 'login' && <>
        <label className="block text-sm font-medium">Usuário<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required className="block w-full mt-1 border rounded-lg p-3" /></label>
        <label className="block text-sm font-medium">Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="block w-full mt-1 border rounded-lg p-3" /></label>
        <button disabled={busy} className="w-full rounded-lg bg-gray-900 text-white p-3 disabled:opacity-50">{busy ? 'Entrando…' : 'Entrar'}</button>
      </>}
      {mode === 'loading' && !error && <p role="status">Conectando…</p>}
      {error && <><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={check} className="underline">Tentar novamente</button></>}
    </form>
  </main>;
}
