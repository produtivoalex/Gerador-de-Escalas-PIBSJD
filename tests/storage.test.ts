import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEventChanges, defaultData, loadData, parseBackup, restoreSeptemberSchedule, saveData, serializeBackup, STORAGE_KEY, RECOVERED_SEPTEMBER_KEY } from '../services/storage';

function memory() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
}

test('legacy migration preserves deleted events and people, including empty lists', () => {
  const storage = memory();
  storage.setItem('cultogen_events_v26_custom', '[]');
  storage.setItem('cultogen_people_v26', '[]');
  const data = loadData(storage);
  assert.equal(data.events.filter(e => e.date.startsWith('2026-09-')).length, 13);
  assert.deepEqual(data.people, []);
  saveData(storage, data);
  assert.deepEqual(loadData(storage), data);
  assert.deepEqual(loadData(storage), data);
});

test('deleting a preloaded event remains deleted after saving and reloading', () => {
  const storage = memory();
  const data = defaultData();
  const deleted = data.events[0].id;
  data.events = applyEventChanges(data.events, { message: '', deletedEventIds: [deleted] });
  saveData(storage, data);
  assert.equal(loadData(storage).events.some(e => e.id === deleted), false);
});

test('backup roundtrip preserves all data and refuses malformed content before writing', () => {
  const data = defaultData();
  assert.deepEqual(parseBackup(serializeBackup(data)), data);
  assert.throws(() => parseBackup('{"app":"another","version":1}'));
  assert.throws(() => parseBackup(serializeBackup({ ...data, events: [{ ...data.events[0], date: '2026-02-31' }] })));
  assert.throws(() => parseBackup(serializeBackup({ ...data, config: { ...data.config, gridHeight: -1 } })));
});

test('corrupt saved data is surfaced without overwriting it', () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, '{broken');
  assert.throws(() => loadData(storage));
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
});

test('AI changes replace matching IDs and honor deletion without duplicates', () => {
  const event = defaultData().events[0];
  const edited = { ...event, leader: 'Teste' };
  assert.deepEqual(applyEventChanges([event], { message: '', updatedEvents: [edited] }), [edited]);
  assert.deepEqual(applyEventChanges([event], { message: '', updatedEvents: [edited], deletedEventIds: [event.id] }), []);
});

test('recovers the 13 September services from the image without replacing edits or duplicating events', () => {
  const original = defaultData();
  const september = original.events.filter(event => event.date.startsWith('2026-09-'));
  assert.equal(september.length, 13);
  assert.equal(september.filter(event => event.notes === 'PGMs').length, 4);
  const edited = { ...original, events: original.events.filter(event => event.id !== 'sep-02') };
  edited.events = edited.events.map(event => event.id === 'sep-04' ? { ...event, leader: 'Dirigente editado' } : event);
  const restored = restoreSeptemberSchedule(edited);
  assert.equal(restored.events.filter(event => event.id === 'sep-02').length, 1);
  assert.equal(restored.events.find(event => event.id === 'sep-02')?.leader, 'Maria José');
  assert.equal(restored.events.find(event => event.id === 'sep-04')?.leader, 'Dirigente editado');
  assert.equal(restoreSeptemberSchedule(restored).events.length, restored.events.length);
  const saved = memory(); saved.setItem(STORAGE_KEY, JSON.stringify(edited));
  const recovered = loadData(saved);
  assert.equal(recovered.events.filter(event => event.date.startsWith('2026-09-')).length, 13);
  assert.equal(parseBackup(serializeBackup(edited)).events.filter(event => event.date.startsWith('2026-09-')).length, 12);
  assert.equal(parseBackup(JSON.stringify({ app: 'cultogen', version: 1, data: edited })).events.filter(event => event.date.startsWith('2026-09-')).length, 13);
  assert.equal(saved.getItem(RECOVERED_SEPTEMBER_KEY), '1');
});
