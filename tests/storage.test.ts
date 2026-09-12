import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEventChanges, defaultData, loadData, parseBackup, saveData, serializeBackup, STORAGE_KEY } from '../services/storage';

function memory() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
}

test('legacy migration preserves deleted events and people, including empty lists', () => {
  const storage = memory();
  storage.setItem('cultogen_events_v26_custom', '[]');
  storage.setItem('cultogen_people_v26', '[]');
  const data = loadData(storage);
  assert.deepEqual(data.events, []);
  assert.deepEqual(data.people, []);
  saveData(storage, data);
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
