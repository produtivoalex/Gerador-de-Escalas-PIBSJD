import { buildGroqRequest } from './prompt';
import { parseAIRequest, parseAIResponse } from '../services/validation';

export interface ServerEnv { GROQ_API_KEY?: string; GROQ_MODEL?: string }
export const MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

function normalizeGroqResponse(raw: string, month: string) {
  const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()) as any;
  if (!Array.isArray(parsed)) return parsed;
  return {
    message: 'Escala gerada com sucesso.',
    suggestedMonth: month,
    updatedEvents: parsed.map((event: any, index: number) => ({
      id: event.id || `ai-${event.date || event.data || month}-${index}`,
      date: event.date || event.data,
      type: event.type || event.tipo,
      leader: event.leader ?? event.dirigente ?? '',
      preacher: event.preacher ?? event.pregador ?? '',
      notes: event.notes,
      customTitle: event.customTitle || event.titulo || undefined
    }))
  };
}

export async function handleAIRequest(request: Request, env: ServerEnv, fetcher: typeof fetch = fetch) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'Origem não permitida.' }, 403);
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Envie JSON.' }, 415);
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) return json({ error: 'Pedido muito grande.' }, 413);
  let input;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Pedido vazio.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) { await reader.cancel(); return json({ error: 'Pedido muito grande.' }, 413); }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    input = parseAIRequest(JSON.parse(new TextDecoder().decode(body)));
  } catch {
    return json({ error: 'Pedido inválido. Confira os dados e use imagens PNG, JPEG ou WebP de até 4 MB.' }, 400);
  }
  if (!env.GROQ_API_KEY || env.GROQ_API_KEY === 'sua_chave_aqui') {
    return json({ error: 'A IA ainda não foi configurada no servidor. A edição manual continua disponível.' }, 503);
  }
  const model = env.GROQ_MODEL || 'openai/gpt-oss-120b';
  if (!/^[a-zA-Z0-9._/-]+$/.test(model)) return json({ error: 'Modelo de IA inválido na configuração do servidor.' }, 503);
  try {
    const response = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: JSON.stringify(buildGroqRequest(input, model)), signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) {
      // Do not expose upstream details or credentials in responses or logs.
      if (response.status === 429) return json({ error: 'Limite de uso da IA atingido. Tente novamente mais tarde.' }, 429);
      return json({ error: 'Não foi possível consultar a IA. Verifique a chave e o modelo no servidor.' }, 502);
    }
    const result = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = result.choices?.[0]?.message?.content;
    return json(parseAIResponse(normalizeGroqResponse(content || '', input.currentMonth)));
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    return json({ error: timeout ? 'A IA demorou para responder. Tente novamente.' :
      'A IA não retornou uma resposta válida. Nenhuma alteração foi aplicada; tente novamente.' }, timeout ? 504 : 502);
  }
}
