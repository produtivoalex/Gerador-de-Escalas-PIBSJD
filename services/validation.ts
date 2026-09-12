import { ServiceType } from '../types';
import type { AIRequest, AIResponse, AppData, ChurchEvent, UIConfig } from '../types';
import { HARD_DEFAULT_CONFIG } from '../data/defaults';

const object = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 20000;
export const validMonth = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const validDate = (value: unknown) => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const validPeople = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= 2000 && value.every(v => text(v) && v.trim().length > 0);
export const validEvents = (value: unknown): value is ChurchEvent[] =>
  Array.isArray(value) && value.length <= 10000 && value.every(e => object(e) &&
    text(e.id) && e.id.length > 0 && validDate(e.date) && Object.values(ServiceType).includes(e.type) &&
    text(e.leader) && text(e.preacher) && (e.notes === undefined || text(e.notes)) &&
    (e.customTitle === undefined || text(e.customTitle))) && new Set(value.map(e => e.id)).size === value.length;

export function validConfig(value: unknown, partial = false): value is UIConfig {
  if (!object(value)) return false;
  if (!partial && Object.keys(HARD_DEFAULT_CONFIG).some(key => !(key in value))) return false;
  return Object.entries(value).every(([key, entry]) => {
    if (key === 'backgroundImageUrl') return entry === undefined || (text(entry) && (entry === '' || /^https:\/\//.test(entry)));
    const defaultValue = HARD_DEFAULT_CONFIG[key as keyof UIConfig];
    if (typeof defaultValue === 'string') return typeof entry === 'string' && /^#[\da-f]{6}$/i.test(entry);
    return typeof defaultValue === 'number' && typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 && entry <= 2000;
  });
}

export function validAttachment(value: unknown) {
  return object(value) && ['image/png', 'image/jpeg', 'image/webp'].includes(value.mimeType) &&
    typeof value.data === 'string' && value.data.length <= 5600000 && /^[A-Za-z0-9+/]+={0,2}$/.test(value.data);
}

export function parseAppData(value: unknown): AppData {
  if (!object(value) || !validEvents(value.events) || !validPeople(value.people) ||
      !validConfig(value.config) || !validConfig(value.defaultConfig) ||
      typeof value.lastDate !== 'string' || !Number.isFinite(Date.parse(value.lastDate)) ||
      !Array.isArray(value.messages) || value.messages.length > 10000 ||
      !value.messages.every(m => object(m) && ['user', 'model'].includes(m.role) && text(m.text) &&
        Number.isFinite(m.timestamp) && (m.attachment === undefined || validAttachment(m.attachment)))) {
    throw new Error('Dados inválidos. Escolha um backup exportado pelo Gerador de Escalas.');
  }
  return value as unknown as AppData;
}

export function parseAIRequest(value: unknown): AIRequest {
  if (!object(value) || !text(value.command) || (!value.command.trim() && !value.attachment) ||
      !validMonth(value.currentMonth) || !validEvents(value.allEvents) ||
      !validPeople(value.availablePeople) || !validConfig(value.currentConfig) ||
      (value.attachment !== undefined && !validAttachment(value.attachment))) {
    throw new Error('Pedido inválido. Verifique o texto e a imagem (PNG, JPEG ou WebP de até 4 MB).');
  }
  return value as unknown as AIRequest;
}

export function parseAIResponse(value: unknown): AIResponse {
  if (!object(value) || !text(value.message) ||
      (value.suggestedMonth !== undefined && !validMonth(value.suggestedMonth)) ||
      (value.updatedEvents !== undefined && !validEvents(value.updatedEvents)) ||
      (value.deletedEventIds !== undefined && (!Array.isArray(value.deletedEventIds) || !value.deletedEventIds.every(text))) ||
      (value.updatedConfig !== undefined && !validConfig(value.updatedConfig, true))) {
    throw new Error('A IA retornou dados inválidos. Nenhuma alteração foi aplicada; tente novamente.');
  }
  return value as unknown as AIResponse;
}
