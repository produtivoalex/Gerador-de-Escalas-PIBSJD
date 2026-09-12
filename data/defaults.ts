import { ChurchEvent, ServiceType, UIConfig } from '../types';

export const MONTH_THEMES: Record<string, string> = {
  '2026-06': 'MÊS DAS LIDERANÇAS ECLESIÁSTICAS',
  '2026-07': 'MÊS DE MISSÕES REGIONAIS',
};

export const HARD_DEFAULT_CONFIG: UIConfig = {
  headerBgColor: '#DFA09F', // Rosa Pastel exato da imagem
  headerTextColor: '#FFFFFF',
  gridBorderColor: '#e5e7eb',
  gridBorderWidth: 1,
  fontSizeTitle: 34,
  fontSizeMonth: 30,
  fontSizeVerse: 12,
  fontSizeDayNumber: 14,
  fontSizeCardTitle: 9,
  fontSizeCardText: 9,
  fontSizeFooter: 10,
  fontSizeWeekDays: 11,
  cardPadding: 3,
  cardBorderRadius: 4,
  edgeTop: 30,
  edgeBottom: 30,
  edgeLeft: 30,
  edgeRight: 30,
  spacingVerse: 10,
  gridWidth: 100,
  gridHeight: 520,
  // Cores extraídas da imagem (Agora com separação Title/Text)
  colorAdoracaoTitle: '#991B1B', // Vermelho escuro
  colorAdoracaoText: '#991B1B',
  bgColorAdoracao: '#FEF2F2', // Vermelho muito claro

  colorCentralTitle: '#C2410C', // Laranja escuro
  colorCentralText: '#C2410C',
  bgColorCentral: '#FFF7ED', // Laranja muito claro

  colorDomiciliarTitle: '#15803D', // Verde escuro
  colorDomiciliarText: '#15803D',
  bgColorDomiciliar: '#F0FDF4', // Verde muito claro

  colorOutroTitle: '#374151',
  colorOutroText: '#374151',
  bgColorOutro: '#F3F4F6'
};

export const INITIAL_PEOPLE = [
  'Amparo', 'Antonia Maria', 'Ataniel', 'Diomar', 'Fco. Antonio',
  'Filho', 'Francisca Alves', 'Francisco Antonio', 'Jesus', 'Jovana',
  'Lourival', 'Maria José', 'Nayana', 'Pr. Hélio', 'Pr. Lourival',
  'Raquel', 'Ryan', 'Teresa'
].sort();

// Dados históricos das escalas fornecidas
export const PRELOADED_EVENTS: ChurchEvent[] = [
  // DEZEMBRO 2025
  { id: 'dez-03', date: '2025-12-03', type: ServiceType.CENTRAL, leader: 'Ryan', preacher: 'Pr. Lourival' },
  { id: 'dez-05', date: '2025-12-05', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'dez-07', date: '2025-12-07', type: ServiceType.ADORACAO, leader: 'Diomar', preacher: 'Pr. Lourival' },
  { id: 'dez-10', date: '2025-12-10', type: ServiceType.CENTRAL, leader: 'Amparo', preacher: 'Pr. Lourival' },
  { id: 'dez-12', date: '2025-12-12', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'dez-14', date: '2025-12-14', type: ServiceType.ADORACAO, leader: 'Francisco Antonio', preacher: 'Pr. Lourival' },
  { id: 'dez-17', date: '2025-12-17', type: ServiceType.CENTRAL, leader: 'Jovana', preacher: 'Pr. Lourival' },
  { id: 'dez-19', date: '2025-12-19', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'dez-21', date: '2025-12-21', type: ServiceType.ADORACAO, leader: 'Ataniel', preacher: 'Pr. Lourival' },
  { id: 'dez-25', date: '2025-12-25', type: ServiceType.OUTRO, customTitle: 'CULTO NATALINO', leader: 'Raquel', preacher: 'Pr. Lourival' },
  { id: 'dez-26', date: '2025-12-26', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'dez-28', date: '2025-12-28', type: ServiceType.ADORACAO, leader: 'Jesus', preacher: 'Pr. Lourival' },
  { id: 'dez-31', date: '2025-12-31', type: ServiceType.OUTRO, customTitle: 'RÉVEILLON NO CLUBE DO COCO', leader: '', preacher: '' },

  // JANEIRO 2026
  { id: 'jan-04', date: '2026-01-04', type: ServiceType.ADORACAO, leader: 'Teresa', preacher: 'Pr. Lourival' },
  { id: 'jan-07', date: '2026-01-07', type: ServiceType.CENTRAL, leader: 'Francisca Alves', preacher: 'Pr. Lourival' },
  { id: 'jan-09', date: '2026-01-09', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jan-11', date: '2026-01-11', type: ServiceType.ADORACAO, leader: 'Maria José', preacher: 'Pr. Lourival' },
  { id: 'jan-14', date: '2026-01-14', type: ServiceType.CENTRAL, leader: 'Antonia Maria', preacher: 'Pr. Lourival' },
  { id: 'jan-16', date: '2026-01-16', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jan-18', date: '2026-01-18', type: ServiceType.ADORACAO, leader: 'Nayana', preacher: 'Pr. Lourival' },
  { id: 'jan-21', date: '2026-01-21', type: ServiceType.CENTRAL, leader: 'Ryan', preacher: 'Pr. Lourival' },
  { id: 'jan-23', date: '2026-01-23', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jan-25', date: '2026-01-25', type: ServiceType.ADORACAO, leader: 'Diomar', preacher: 'Pr. Lourival' },
  { id: 'jan-28', date: '2026-01-28', type: ServiceType.CENTRAL, leader: 'Fco. Antonio', preacher: 'Pr. Lourival' },
  { id: 'jan-30', date: '2026-01-30', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },

  // MARÇO 2026
  { id: 'mar-01', date: '2026-03-01', type: ServiceType.ADORACAO, leader: 'Teresa', preacher: 'Pr. Lourival' },
  { id: 'mar-04', date: '2026-03-04', type: ServiceType.CENTRAL, leader: 'Francisca Alves', preacher: 'Pr. Lourival' },
  { id: 'mar-06', date: '2026-03-06', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mar-08', date: '2026-03-08', type: ServiceType.ADORACAO, leader: 'Raquel', preacher: 'Pr. Lourival' },
  { id: 'mar-11', date: '2026-03-11', type: ServiceType.CENTRAL, leader: 'Diomar', preacher: 'Pr. Lourival' },
  { id: 'mar-13', date: '2026-03-13', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mar-15', date: '2026-03-15', type: ServiceType.ADORACAO, leader: 'Maria José', preacher: 'Pr. Lourival' },
  { id: 'mar-18', date: '2026-03-18', type: ServiceType.CENTRAL, leader: 'Antonia Maria', preacher: 'Pr. Lourival' },
  { id: 'mar-20', date: '2026-03-20', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mar-22', date: '2026-03-22', type: ServiceType.ADORACAO, leader: 'Jesus', preacher: 'Pr. Lourival' },
  { id: 'mar-25', date: '2026-03-25', type: ServiceType.CENTRAL, leader: 'Ryan', preacher: 'Pr. Lourival' },
  { id: 'mar-27', date: '2026-03-27', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mar-29', date: '2026-03-29', type: ServiceType.ADORACAO, leader: 'Nayana', preacher: 'Pr. Lourival' },

  // ABRIL 2026
  { id: 'abr-01', date: '2026-04-01', type: ServiceType.CENTRAL, leader: 'Jesus', preacher: 'Pr. Lourival' },
  { id: 'abr-03', date: '2026-04-03', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'abr-05', date: '2026-04-05', type: ServiceType.ADORACAO, leader: 'Diomar', preacher: 'Pr. Lourival' },
  { id: 'abr-08', date: '2026-04-08', type: ServiceType.CENTRAL, leader: 'Maria José', preacher: 'Pr. Lourival' },
  { id: 'abr-10', date: '2026-04-10', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'abr-12', date: '2026-04-12', type: ServiceType.ADORACAO, leader: 'Ataniel', preacher: 'Pr. Lourival' },
  { id: 'abr-15', date: '2026-04-15', type: ServiceType.CENTRAL, leader: 'Francisca Alves', preacher: 'Pr. Lourival' },
  { id: 'abr-17', date: '2026-04-17', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'abr-19', date: '2026-04-19', type: ServiceType.ADORACAO, leader: 'Ryan', preacher: 'Pr. Lourival' },
  { id: 'abr-22', date: '2026-04-22', type: ServiceType.CENTRAL, leader: 'Amparo', preacher: 'Pr. Lourival' },
  { id: 'abr-24', date: '2026-04-24', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'abr-26', date: '2026-04-26', type: ServiceType.ADORACAO, leader: 'Filho', preacher: 'Pr. Lourival' },
  { id: 'abr-29', date: '2026-04-29', type: ServiceType.CENTRAL, leader: 'Jovana', preacher: 'Pr. Lourival' },

  // MAIO 2026
  { id: 'mai-01', date: '2026-05-01', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mai-03', date: '2026-05-03', type: ServiceType.ADORACAO, leader: 'Raquel', preacher: 'Pr. Lourival' },
  { id: 'mai-06', date: '2026-05-06', type: ServiceType.CENTRAL, leader: 'Maria José', preacher: 'Pr. Lourival' },
  { id: 'mai-08', date: '2026-05-08', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mai-10', date: '2026-05-10', type: ServiceType.ADORACAO, leader: 'Teresa', preacher: 'Pr. Lourival' },
  { id: 'mai-13', date: '2026-05-13', type: ServiceType.CENTRAL, leader: 'Jesus', preacher: 'Pr. Lourival' },
  { id: 'mai-15', date: '2026-05-15', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mai-17', date: '2026-05-17', type: ServiceType.ADORACAO, leader: 'Diomar', preacher: 'Pr. Lourival' },
  { id: 'mai-20', date: '2026-05-20', type: ServiceType.CENTRAL, leader: 'Francisca Alves', preacher: 'Pr. Lourival' },
  { id: 'mai-22', date: '2026-05-22', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mai-24', date: '2026-05-24', type: ServiceType.ADORACAO, leader: 'Ryan', preacher: 'Pr. Lourival' },
  { id: 'mai-27', date: '2026-05-27', type: ServiceType.CENTRAL, leader: 'Antonia Maria', preacher: 'Pr. Lourival' },
  { id: 'mai-29', date: '2026-05-29', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'mai-31', date: '2026-05-31', type: ServiceType.ADORACAO, leader: 'Nayana', preacher: 'Pr. Lourival' },

  // JUNHO 2026
  { id: 'jun-03', date: '2026-06-03', type: ServiceType.CENTRAL, leader: '', preacher: '' },
  { id: 'jun-05', date: '2026-06-05', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jun-07', date: '2026-06-07', type: ServiceType.ADORACAO, leader: 'Jesus', preacher: 'Pr. Lourival' },
  { id: 'jun-10', date: '2026-06-10', type: ServiceType.CENTRAL, leader: 'Amparo', preacher: 'Pr. Lourival' },
  { id: 'jun-12', date: '2026-06-12', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jun-14', date: '2026-06-14', type: ServiceType.ADORACAO, leader: 'Diomar', preacher: 'Pr. Lourival', notes: 'DIA DO PASTOR' },
  { id: 'jun-17', date: '2026-06-17', type: ServiceType.CENTRAL, leader: 'Maria José', preacher: 'Pr. Lourival' },
  { id: 'jun-19', date: '2026-06-19', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jun-21', date: '2026-06-21', type: ServiceType.ADORACAO, leader: 'Francisco', preacher: 'Pr. Lourival' },
  { id: 'jun-24', date: '2026-06-24', type: ServiceType.CENTRAL, leader: 'Francisca Alves', preacher: 'Pr. Lourival' },
  { id: 'jun-26', date: '2026-06-26', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jun-28', date: '2026-06-28', type: ServiceType.ADORACAO, leader: 'Filho', preacher: 'Pr. Lourival' },

  // JULHO 2026
  { id: 'jul-01', date: '2026-07-01', type: ServiceType.CENTRAL, leader: '', preacher: '' },
  { id: 'jul-03', date: '2026-07-03', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jul-05', date: '2026-07-05', type: ServiceType.ADORACAO, leader: '', preacher: '' },
  { id: 'jul-08', date: '2026-07-08', type: ServiceType.CENTRAL, leader: 'Maria José', preacher: 'Pr. Lourival' },
  { id: 'jul-10', date: '2026-07-10', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jul-12', date: '2026-07-12', type: ServiceType.ADORACAO, leader: 'Raquel', preacher: 'Pr. Lourival' },
  { id: 'jul-15', date: '2026-07-15', type: ServiceType.CENTRAL, leader: 'Jesus', preacher: 'Pr. Lourival' },
  { id: 'jul-17', date: '2026-07-17', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jul-19', date: '2026-07-19', type: ServiceType.ADORACAO, leader: 'Ataniel', preacher: 'Pr. Lourival' },
  { id: 'jul-22', date: '2026-07-22', type: ServiceType.CENTRAL, leader: 'Francisca Alves', preacher: 'Pr. Lourival' },
  { id: 'jul-24', date: '2026-07-24', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'jul-26', date: '2026-07-26', type: ServiceType.ADORACAO, leader: 'Nayana', preacher: 'Pr. Lourival' },
  { id: 'jul-29', date: '2026-07-29', type: ServiceType.CENTRAL, leader: 'Antonia Maria', preacher: 'Pr. Lourival' },
  { id: 'jul-31', date: '2026-07-31', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },

  // AGOSTO 2026
  { id: 'ago-02', date: '2026-08-02', type: ServiceType.ADORACAO, leader: 'Fco. Antonio', preacher: 'Pr. Lourival' },
  { id: 'ago-05', date: '2026-08-05', type: ServiceType.CENTRAL, leader: 'Amparo', preacher: 'Pr. Lourival' },
  { id: 'ago-07', date: '2026-08-07', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'ago-09', date: '2026-08-09', type: ServiceType.ADORACAO, leader: 'Diomar', preacher: 'Pr. Lourival' },
  { id: 'ago-12', date: '2026-08-12', type: ServiceType.CENTRAL, leader: 'Maria José', preacher: 'Pr. Lourival' },
  { id: 'ago-14', date: '2026-08-14', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'ago-16', date: '2026-08-16', type: ServiceType.ADORACAO, leader: 'Teresa', preacher: 'Pr. Lourival' },
  { id: 'ago-19', date: '2026-08-19', type: ServiceType.CENTRAL, leader: 'Jovana', preacher: 'Pr. Lourival' },
  { id: 'ago-21', date: '2026-08-21', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'ago-23', date: '2026-08-23', type: ServiceType.ADORACAO, leader: 'Ryan', preacher: 'Pr. Lourival' },
  { id: 'ago-26', date: '2026-08-26', type: ServiceType.CENTRAL, leader: 'Francisca Alves', preacher: 'Pr. Lourival' },
  { id: 'ago-28', date: '2026-08-28', type: ServiceType.DOMICILIAR, leader: '', preacher: '', notes: 'PGMs' },
  { id: 'ago-30', date: '2026-08-30', type: ServiceType.ADORACAO, leader: 'Jesus', preacher: 'Pr. Lourival' },
];
