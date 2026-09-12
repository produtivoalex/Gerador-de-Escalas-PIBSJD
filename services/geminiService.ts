import type { ChurchEvent, AIResponse, UIConfig } from '../types';
import { parseAIResponse } from './validation';

export async function processCommand(
  command: string, allEvents: ChurchEvent[], currentMonth: Date,
  availablePeople: string[], currentConfig: UIConfig,
  attachment?: { data: string; mimeType: string }
): Promise<AIResponse> {
  const response = await fetch('/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, allEvents, availablePeople, currentConfig, attachment,
      currentMonth: currentMonth.getFullYear() + '-' + String(currentMonth.getMonth() + 1).padStart(2, '0') }),
    signal: AbortSignal.timeout(55000)
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Não foi possível consultar a IA. Confira a conexão e entre novamente se a sessão expirou.'); }
  if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a IA.');
  return parseAIResponse(data);
}
