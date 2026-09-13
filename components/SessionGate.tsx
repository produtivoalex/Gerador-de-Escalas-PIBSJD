import React, { useEffect, useState } from 'react';
import App from '../App';
import { cloudRequest, type CloudSession } from '../services/cloudSync';

export default function SessionGate() {
  const [mode, setMode] = useState<'loading' | 'local' | 'login' | 'code' | 'new-pin' | 'cloud'>('loading');
  const [session, setSession] = useState<CloudSession>();
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function check() {
    try {
      const identity = await cloudRequest('/api/session');
      if (identity.enabled === false) { setMode('local'); return; }
      setSetupRequired(!!identity.setupRequired); setRecoveryEmail(identity.recoveryEmail || '');
      if (identity.setupSession) { setMode('new-pin'); return; }
      if (!identity.username) { setMode('login'); return; }
      const state = await cloudRequest('/api/state');
      setSession({ ...state, username: identity.username }); setMode('cloud'); setError('');
    } catch { setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'); }
  }
  useEffect(() => { check(); }, []);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await cloudRequest('/api/login', { method: 'POST', body: JSON.stringify({ pin }) }); setPin(''); await check(); }
    catch (error) { const e = error as Error & { recoveryAvailable?: boolean; setupRequired?: boolean }; setError(e.message); setRecoveryAvailable(!!e.recoveryAvailable); if (e.setupRequired) { setSetupRequired(true); setError(e.message); } }
    finally { setBusy(false); }
  }
  async function requestCode() {
    setBusy(true); setError('');
    try { await cloudRequest('/api/email/send', { method: 'POST', body: JSON.stringify({ purpose: setupRequired ? 'setup' : 'recovery' }) }); setMode('code'); setCode(''); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function verifyCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await cloudRequest('/api/email/verify', { method: 'POST', body: JSON.stringify({ code }) }); setCode(''); if (result.setupRequired) setMode('new-pin'); else await check(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function savePin(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await cloudRequest('/api/pin/set', { method: 'POST', body: JSON.stringify({ pin, confirmation }) }); setPin(''); setConfirmation(''); await check(); }
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
    <form onSubmit={mode === 'login' ? login : mode === 'code' ? verifyCode : mode === 'new-pin' ? savePin : event => { event.preventDefault(); }} className="w-full max-w-sm bg-white p-7 rounded-2xl shadow-lg space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Gerador de Escalas</h1>
      <p className="text-sm text-gray-600">{mode === 'new-pin' ? 'Crie seu PIN pessoal de quatro números.' : mode === 'code' ? `Digite o código de confirmação enviado para ${recoveryEmail || 'seu email cadastrado'}.` : 'Entre com seu PIN para acessar e sincronizar suas escalas.'}</p>
      {mode === 'login' && <>
        <label className="block text-sm font-medium">PIN de 4 números<input aria-label="PIN de 4 números" type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} required className="block w-full mt-1 border rounded-lg p-3 text-center tracking-[0.5em]" /></label>
        <button disabled={busy} className="w-full rounded-lg bg-gray-900 text-white p-3 disabled:opacity-50">{busy ? 'Entrando…' : 'Entrar'}</button>
        {(setupRequired || recoveryAvailable) && <button type="button" onClick={requestCode} disabled={busy} className="w-full p-3 border rounded-lg">{setupRequired ? 'Confirmar email e configurar PIN' : 'Entrar pelo email'}</button>}
      </>}
      {mode === 'code' && <><label className="block text-sm font-medium">Código de seis números<input aria-label="Código de confirmação" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required className="block w-full mt-1 border rounded-lg p-3 text-center tracking-[0.5em]" /></label><button disabled={busy || code.length !== 6} className="w-full rounded-lg bg-gray-900 text-white p-3">{busy ? 'Verificando…' : 'Confirmar email'}</button></>}
      {mode === 'new-pin' && <><label className="block text-sm font-medium">Novo PIN<input aria-label="Novo PIN" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} required className="block w-full mt-1 border rounded-lg p-3 text-center tracking-[0.5em]" /></label><label className="block text-sm font-medium">Confirme o PIN<input aria-label="Confirme o PIN" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" maxLength={4} value={confirmation} onChange={e => setConfirmation(e.target.value.replace(/\D/g, '').slice(0, 4))} required className="block w-full mt-1 border rounded-lg p-3 text-center tracking-[0.5em]" /></label><button disabled={busy || pin.length !== 4 || confirmation.length !== 4} className="w-full rounded-lg bg-gray-900 text-white p-3">Salvar PIN</button></>}
      {mode === 'loading' && !error && <p role="status">Conectando…</p>}
      {error && <><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={check} className="underline">Tentar novamente</button></>}
    </form>
  </main>;
}
