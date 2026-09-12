import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAIRequest, MAX_REQUEST_BYTES } from '../server/api';
import { defaultData } from '../services/storage';

const data = defaultData();
const input = { command: 'Edite o primeiro culto', allEvents: data.events, availablePeople: data.people,
  currentConfig: data.config, currentMonth: '2026-01' };
const request = (body: unknown = input, headers = {}) => new Request('http://localhost/api/generate', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
});
const env = { GEMINI_API_KEY: 'secret-test-key' };

test('rejects unsupported method, cross-origin calls, malformed data and oversized bodies', async () => {
  assert.equal((await handleAIRequest(new Request('http://localhost/api/generate'), env)).status, 405);
  assert.equal((await handleAIRequest(request(input, { origin: 'https://another.example' }), env)).status, 403);
  assert.equal((await handleAIRequest(request({ ...input, currentMonth: '2026-13' }), env)).status, 400);
  assert.equal((await handleAIRequest(request(input, { 'content-length': String(MAX_REQUEST_BYTES + 1) }), env)).status, 413);
  assert.equal((await handleAIRequest(request({ ...input, attachment: { mimeType: 'text/html', data: 'abcd' } }), env)).status, 400);
});

test('missing configuration returns an actionable error', async () => {
  assert.equal((await handleAIRequest(request(), {})).status, 503);
});

test('credentials stay in server headers; current event IDs are supplied for edits', async () => {
  const response = await handleAIRequest(request(), env, async (url, init) => {
    assert.equal(String(url).includes(env.GEMINI_API_KEY), false);
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), env.GEMINI_API_KEY);
    const payload = JSON.parse(String(init?.body));
    assert.ok(payload.systemInstruction.parts[0].text.includes(data.events[0].id));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ message: 'Pronto', updatedEvents: [{ ...data.events[0], leader: 'Ryan' }] }) }] } }] });
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).updatedEvents[0].leader, 'Ryan');
});

test('upstream errors never reveal credentials; invalid AI responses do not reach the client as changes', async () => {
  const failed = await handleAIRequest(request(), env, async () => new Response(env.GEMINI_API_KEY, { status: 403 }));
  assert.equal(failed.status, 502);
  assert.equal((await failed.text()).includes(env.GEMINI_API_KEY), false);
  const malformed = await handleAIRequest(request(), env, async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"message":"ok","updatedEvents":[{}]}' }] } }] }));
  assert.equal(malformed.status, 502);
  const quota = await handleAIRequest(request(), env, async () => new Response('', { status: 429 }));
  assert.equal(quota.status, 429);
});
