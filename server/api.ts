import { buildGeminiRequest } from './prompt';
import { parseAIRequest, parseAIResponse } from '../services/validation';

export interface ServerEnv { GEMINI_API_KEY?: string; GEMINI_MODEL?: string }
export const MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

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
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'sua_chave_aqui') {
    return json({ error: 'A IA ainda não foi configurada no servidor. A edição manual continua disponível.' }, 503);
  }
  const model = env.GEMINI_MODEL || 'gemini-3.6-flash';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) return json({ error: 'Modelo de IA inválido na configuração do servidor.' }, 503);
  try {
    const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(buildGeminiRequest(input)), signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) {
      // Do not expose upstream details or credentials in responses or logs.
      if (response.status === 429) return json({ error: 'Limite de uso da IA atingido. Tente novamente mais tarde.' }, 429);
      return json({ error: 'Não foi possível consultar a IA. Verifique a chave e o modelo no servidor.' }, 502);
    }
    const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const content = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
    return json(parseAIResponse(JSON.parse(content || '')));
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    return json({ error: timeout ? 'A IA demorou para responder. Tente novamente.' :
      'A IA não retornou uma resposta válida. Nenhuma alteração foi aplicada; tente novamente.' }, timeout ? 504 : 502);
  }
}
