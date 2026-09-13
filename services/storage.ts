import type { AppData, AIResponse, ChurchEvent } from '../types';
import { HARD_DEFAULT_CONFIG, INITIAL_PEOPLE, PRELOADED_EVENTS } from '../data/defaults';
import { parseAppData } from './validation';

export const STORAGE_KEY = 'cultogen_state_v1';
export const RECOVERED_SEPTEMBER_KEY = 'cultogen_september_recovery_v1';
const RECOVERED_SCHEDULE_IDS = new Set(PRELOADED_EVENTS.filter(event => event.date.startsWith('2026-09-')).map(event => event.id));
const LEGACY = {
  events: 'cultogen_events_v26_custom', people: 'cultogen_people_v26',
  config: 'cultogen_ui_config_v26_custom', defaultConfig: 'cultogen_user_default_config_v26',
  messages: 'cultogen_messages_v26', lastDate: 'cultogen_last_date_v26'
};

export function defaultData(): AppData {
  return {
    events: PRELOADED_EVENTS, people: INITIAL_PEOPLE, config: HARD_DEFAULT_CONFIG,
    defaultConfig: HARD_DEFAULT_CONFIG, messages: [], lastDate: new Date(2026, 0, 1).toISOString()
  };
}

/** Restore the user-supplied September 2026 schedule without replacing saved edits. */
export function restoreSeptemberSchedule(data: AppData): AppData {
  const existing = new Set(data.events.map(event => event.id));
  const recovered = PRELOADED_EVENTS.filter(event => RECOVERED_SCHEDULE_IDS.has(event.id) && !existing.has(event.id));
  return recovered.length ? { ...data, events: [...data.events, ...recovered] } : data;
}

function migrateConfig(value: Record<string, any>) {
  const result = { ...HARD_DEFAULT_CONFIG, ...value };
  for (const name of ['Adoracao', 'Central', 'Domiciliar', 'Outro']) {
    const oldKey = `color${name}`;
    if (value[oldKey]) {
      result[`${oldKey}Title`] = value[`${oldKey}Title`] || value[oldKey];
      result[`${oldKey}Text`] = value[`${oldKey}Text`] || value[oldKey];
      delete result[oldKey];
    }
  }
  return result;
}

export function loadData(storage: Pick<Storage, 'getItem'>): AppData {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved !== null) {
    const data = parseAppData(JSON.parse(saved));
    if (storage.getItem(RECOVERED_SEPTEMBER_KEY) === '1') return data;
    const migrated = restoreSeptemberSchedule(data);
    if ('setItem' in storage && typeof storage.setItem === 'function') saveData(storage as Pick<Storage, 'setItem'> & Pick<Storage, 'getItem'>, migrated);
    return migrated;
  }
  const data = defaultData();
  for (const [field, key] of Object.entries(LEGACY)) {
    const raw = storage.getItem(key);
    if (raw !== null) data[field] = field === 'lastDate' ? raw : JSON.parse(raw);
  }
  data.config = migrateConfig(data.config);
  data.defaultConfig = migrateConfig(data.defaultConfig);
  // Existing arrays, including empty ones, are authoritative. Never reseed deleted data.
  return restoreSeptemberSchedule(parseAppData(data));
}

export function saveData(storage: Pick<Storage, 'setItem'>, data: AppData) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
  storage.setItem(RECOVERED_SEPTEMBER_KEY, '1');
}

export function serializeBackup(data: AppData) {
  return JSON.stringify({ app: 'cultogen', version: 2, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function parseBackup(raw: string): AppData {
  if (raw.length > 15000000) throw new Error('O backup excede o limite de 15 MB.');
  const backup = JSON.parse(raw);
  if (backup?.app !== 'cultogen' || ![1, 2].includes(backup?.version)) throw new Error('Formato ou versão de backup não reconhecido.');
  const data = parseAppData(backup.data);
  // Upgrade older exports once; current v2 backups preserve deliberate event deletions.
  return backup.version === 1 ? restoreSeptemberSchedule(data) : data;
}

export function applyEventChanges(events: ChurchEvent[], response: AIResponse) {
  const deleted = new Set(response.deletedEventIds || []);
  const incoming = new Map((response.updatedEvents || []).map(event => [event.id, event]));
  return [...events.filter(event => !deleted.has(event.id) && !incoming.has(event.id)),
    ...incoming.values()].filter(event => !deleted.has(event.id));
}
