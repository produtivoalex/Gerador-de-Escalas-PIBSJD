import type { AppData, AIResponse, ChurchEvent } from '../types';
import { HARD_DEFAULT_CONFIG, INITIAL_PEOPLE, PRELOADED_EVENTS } from '../data/defaults';
import { parseAppData } from './validation';

export const STORAGE_KEY = 'cultogen_state_v1';
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
  if (saved !== null) return parseAppData(JSON.parse(saved));
  const data = defaultData();
  for (const [field, key] of Object.entries(LEGACY)) {
    const raw = storage.getItem(key);
    if (raw !== null) data[field] = field === 'lastDate' ? raw : JSON.parse(raw);
  }
  data.config = migrateConfig(data.config);
  data.defaultConfig = migrateConfig(data.defaultConfig);
  // Existing arrays, including empty ones, are authoritative. Never reseed deleted data.
  return parseAppData(data);
}

export function saveData(storage: Pick<Storage, 'setItem'>, data: AppData) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function serializeBackup(data: AppData) {
  return JSON.stringify({ app: 'cultogen', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function parseBackup(raw: string): AppData {
  if (raw.length > 15000000) throw new Error('O backup excede o limite de 15 MB.');
  const backup = JSON.parse(raw);
  if (backup?.app !== 'cultogen' || backup?.version !== 1) throw new Error('Formato ou versão de backup não reconhecido.');
  return parseAppData(backup.data);
}

export function applyEventChanges(events: ChurchEvent[], response: AIResponse) {
  const deleted = new Set(response.deletedEventIds || []);
  const incoming = new Map((response.updatedEvents || []).map(event => [event.id, event]));
  return [...events.filter(event => !deleted.has(event.id) && !incoming.has(event.id)),
    ...incoming.values()].filter(event => !deleted.has(event.id));
}
