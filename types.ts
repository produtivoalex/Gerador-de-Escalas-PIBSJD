
export enum ServiceType {
  ADORACAO = 'Culto de Adoração',
  CENTRAL = 'Culto Central',
  DOMICILIAR = 'Culto Domiciliar / Pequenos Grupos',
  OUTRO = 'Outro'
}

export interface UIConfig {
  headerBgColor: string;
  headerTextColor: string;
  gridBorderColor: string;
  gridBorderWidth: number;
  // Fontes
  fontSizeTitle: number;
  fontSizeMonth: number;
  fontSizeVerse: number;
  fontSizeDayNumber: number;
  fontSizeCardTitle: number;
  fontSizeCardText: number;
  fontSizeFooter: number;
  fontSizeWeekDays: number;
  // Design do Card (Simplificado)
  cardPadding: number;
  cardBorderRadius: number;
  // Espaçamentos das Extremidades
  edgeTop: number;
  edgeBottom: number;
  edgeLeft: number;
  edgeRight: number;
  // Margem do Versículo
  spacingVerse: number;
  // Dimensões da Grade
  gridWidth: number; // Porcentagem (ex: 100)
  gridHeight: number; // Pixels ou relativo
  // Cores Unificadas (Separadas por Título e Texto)
  colorAdoracaoTitle: string;
  colorAdoracaoText: string;
  bgColorAdoracao: string;
  
  colorCentralTitle: string;
  colorCentralText: string;
  bgColorCentral: string;
  
  colorDomiciliarTitle: string;
  colorDomiciliarText: string;
  bgColorDomiciliar: string;
  
  colorOutroTitle: string;
  colorOutroText: string;
  bgColorOutro: string;
  // Extras
  backgroundImageUrl?: string;
}

export interface ChurchEvent {
  id: string;
  date: string; 
  type: ServiceType;
  customTitle?: string;
  leader: string;
  preacher: string;
  notes?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachment?: {
    data: string;
    mimeType: string;
  };
}

export interface AIResponse {
  message: string;
  updatedEvents?: ChurchEvent[];
  deletedEventIds?: string[]; 
  suggestedMonth?: string;
  updatedConfig?: Partial<UIConfig>;
}

export interface AIRequest {
  command: string;
  allEvents: ChurchEvent[];
  currentMonth: string;
  availablePeople: string[];
  currentConfig: UIConfig;
  attachment?: { data: string; mimeType: string };
}

export interface AppData {
  events: ChurchEvent[];
  people: string[];
  config: UIConfig;
  defaultConfig: UIConfig;
  messages: ChatMessage[];
  lastDate: string;
}
