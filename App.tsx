
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Image, Plus, ZoomIn, ZoomOut, Settings, MessageSquare, Save, Maximize, Move } from 'lucide-react';
import CalendarGrid from './components/CalendarGrid';
import ChatPanel from './components/ChatPanel';
import DesignPanel from './components/DesignPanel';
import EventEditor from './components/EventEditor';
import { ChurchEvent, ServiceType, ChatMessage, UIConfig } from './types';
import { processCommand } from './services/geminiService';
import { toPng } from 'html-to-image';

declare global { interface Window { html2pdf: any; html2canvas: any; } }

const STORAGE_KEYS = {
  EVENTS: 'cultogen_events_v26_custom',
  PEOPLE: 'cultogen_people_v26',
  CONFIG: 'cultogen_ui_config_v26_custom',
  DEFAULT_CONFIG: 'cultogen_user_default_config_v26',
  MESSAGES: 'cultogen_messages_v26',
  LAST_DATE: 'cultogen_last_date_v26'
};

const MONTH_THEMES: Record<string, string> = {
  '2026-06': 'MÊS DAS LIDERANÇAS ECLESIÁSTICAS',
  '2026-07': 'MÊS DE MISSÕES REGIONAIS',
};

const HARD_DEFAULT_CONFIG: UIConfig = {
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

const INITIAL_PEOPLE = [
  'Amparo', 'Antonia Maria', 'Ataniel', 'Diomar', 'Fco. Antonio', 
  'Filho', 'Francisca Alves', 'Francisco Antonio', 'Jesus', 'Jovana', 
  'Lourival', 'Maria José', 'Nayana', 'Pr. Hélio', 'Pr. Lourival', 
  'Raquel', 'Ryan', 'Teresa'
].sort();

// Dados históricos das escalas fornecidas
const PRELOADED_EVENTS: ChurchEvent[] = [
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

const App: React.FC = () => {
  // Inicializa na última escala/mês visualizado e salvo, ou Janeiro de 2026 como padrão
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    try {
      const savedDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);
      if (savedDate) {
        const parsed = new Date(savedDate);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Erro ao recuperar última data:", e);
    }
    return new Date(2026, 0, 1);
  });

  const getSavedDefault = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEFAULT_CONFIG);
    try {
      const parsed = saved ? JSON.parse(saved) : HARD_DEFAULT_CONFIG;
      // Migração rápida para defaults se chaves novas faltarem
      return { ...HARD_DEFAULT_CONFIG, ...parsed };
    } catch {
      return HARD_DEFAULT_CONFIG;
    }
  };

  const [uiConfig, setUiConfig] = useState<UIConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    try { 
      const parsed = saved ? JSON.parse(saved) : getSavedDefault(); 
      const merged = { ...HARD_DEFAULT_CONFIG, ...parsed };
      
      // Migração de cores antigas para novas (Title/Text) se necessário
      if (parsed.colorAdoracao && !parsed.colorAdoracaoTitle) {
         merged.colorAdoracaoTitle = parsed.colorAdoracao;
         merged.colorAdoracaoText = parsed.colorAdoracao;
      }
      if (parsed.colorCentral && !parsed.colorCentralTitle) {
         merged.colorCentralTitle = parsed.colorCentral;
         merged.colorCentralText = parsed.colorCentral;
      }
      if (parsed.colorDomiciliar && !parsed.colorDomiciliarTitle) {
         merged.colorDomiciliarTitle = parsed.colorDomiciliar;
         merged.colorDomiciliarText = parsed.colorDomiciliar;
      }
      if (parsed.colorOutro && !parsed.colorOutroTitle) {
         merged.colorOutroTitle = parsed.colorOutro;
         merged.colorOutroText = parsed.colorOutro;
      }
      
      return merged;
    } catch { return HARD_DEFAULT_CONFIG; }
  });

  const [events, setEvents] = useState<ChurchEvent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
    try { 
      const parsed = saved ? JSON.parse(saved) : [];
      if (parsed.length > 0) {
        const existingIds = new Set(parsed.map((e: ChurchEvent) => e.id));
        const missing = PRELOADED_EVENTS.filter(e => !existingIds.has(e.id));
        return [...parsed, ...missing];
      }
      return PRELOADED_EVENTS;
    } catch { 
      return PRELOADED_EVENTS; 
    }
  });

  const [people, setPeople] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PEOPLE);
    try { 
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...parsed, ...INITIAL_PEOPLE])).sort();
      }
      return INITIAL_PEOPLE; 
    } catch { return INITIAL_PEOPLE; }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    try { 
      return saved ? JSON.parse(saved) : [{ 
        role: 'model', 
        text: 'Olá! Preenchi os dados de Dezembro/2025 e Janeiro/2026 conforme as imagens e atualizei o visual para o tema Rosa Pastel. Se precisar de ajustes, é só pedir.', 
        timestamp: Date.now() 
      }]; 
    } catch { return []; }
  });

  // Visualização e Pan
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false); // Controls the Visual State (pointer-events)
  const isMouseDownRef = useRef(false); // Controls the Logic State
  const dragStart = useRef({ x: 0, y: 0 });

  const [activeSidebar, setActiveSidebar] = useState<'none' | 'chat' | 'design'>('none');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editorState, setEditorState] = useState<{ isOpen: boolean; date: string; event?: ChurchEvent; }>({ isOpen: false, date: '' });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(uiConfig));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(people));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    localStorage.setItem(STORAGE_KEYS.LAST_DATE, currentDate.toISOString());
  }, [uiConfig, events, people, messages, currentDate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      isMouseDownRef.current = true;
      // Não setamos isDragging(true) aqui para permitir o clique
      dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDownRef.current) {
      // Só ativa o modo dragging se realmente mover o mouse (prevenindo bloqueio do clique)
      if (!isDragging) setIsDragging(true);
      
      setPanOffset({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  };

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(0.7);
  };

  const handleSaveAsDefault = () => {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_CONFIG, JSON.stringify(uiConfig));
    alert("Visual atual salvo como seu novo padrão!");
  };

  const handleSendMessage = async (text: string, attachment?: { data: string; mimeType: string }) => {
    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now(), attachment };
    setMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const response = await processCommand(text, events, currentDate, people, uiConfig, attachment);
      setMessages(prev => [...prev, { role: 'model', text: response.message, timestamp: Date.now() }]);
      if (response.deletedEventIds?.length) {
        const delIds = new Set(response.deletedEventIds);
        setEvents(prev => prev.filter(e => !delIds.has(e.id)));
      }
      if (response.updatedEvents?.length) {
        setEvents(prev => {
          const incomingIds = new Set(response.updatedEvents?.map(e => e.id));
          return [...prev.filter(e => !incomingIds.has(e.id)), ...response.updatedEvents!];
        });
      }
      if (response.updatedConfig) setUiConfig(prev => ({ ...prev, ...response.updatedConfig }));
      if (response.suggestedMonth) {
        const [y, m] = response.suggestedMonth.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m)) setCurrentDate(new Date(y, m - 1, 1));
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Erro ao processar comando.', timestamp: Date.now() }]);
    } finally { setIsAiLoading(false); }
  };

  const handleDownloadPDF = () => {
    if (!window.html2pdf) return;
    setIsDownloading(true);

    const element = document.getElementById('printable-content');
    if (!element) return;

    // Criar clone para exportação limpa em 100%
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);

    const monthStr = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const opt = {
      margin: 0,
      filename: `Escala-${monthStr}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    window.html2pdf().set(opt).from(clone).save().then(() => {
      setIsDownloading(false);
      document.body.removeChild(clone);
    });
  };

  const handleDownloadPNG = async () => {
    const element = document.getElementById('printable-content');
    if (!element) return;
    setIsDownloading(true);

    const monthStr = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(element, {
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `Escala-${monthStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erro ao exportar PNG:", error);
      alert("Erro ao exportar imagem PNG.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#333333]">
      <EventEditor isOpen={editorState.isOpen} onClose={() => setEditorState(prev => ({ ...prev, isOpen: false }))} date={editorState.date} event={editorState.event} onSave={(ev) => setEvents(prev => { const idx = prev.findIndex(e => e.id === ev.id); if (idx >= 0) { const upd = [...prev]; upd[idx] = ev; return upd; } return [...prev, ev]; })} people={people} onUpdatePeople={setPeople} />

      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-50 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-primary text-2xl">church</span>
            <h1 className="font-bold text-gray-800 hidden sm:block">CultoGen AI</h1>
          </div>
          <div className="flex items-center bg-gray-100 rounded-md p-0.5 border border-gray-200">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronLeft size={16} /></button>
            <span className="px-3 min-w-[140px] text-center font-bold text-xs uppercase select-none">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setActiveSidebar(activeSidebar === 'chat' ? 'none' : 'chat')} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold uppercase transition-all ${activeSidebar === 'chat' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><MessageSquare size={16} /> IA</button>
          <button onClick={() => setActiveSidebar(activeSidebar === 'design' ? 'none' : 'design')} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold uppercase transition-all ${activeSidebar === 'design' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Settings size={16} /> Visual</button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button onClick={handleDownloadPNG} disabled={isDownloading} title="Exportar imagem PNG de alta resolução para WhatsApp e redes" className="px-4 py-2 bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-xs font-bold uppercase hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm">
            <Image size={14} /> {isDownloading ? 'Gerando...' : 'Exportar PNG'}
          </button>
          <button onClick={handleDownloadPDF} disabled={isDownloading} title="Exportar documento PDF em tamanho A4 para impressão" className="px-4 py-2 bg-gray-900 text-white rounded-lg flex items-center gap-2 text-xs font-bold uppercase hover:bg-black disabled:opacity-50 transition-colors shadow-sm">
            <Download size={14} /> {isDownloading ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`absolute left-0 top-0 h-full bg-white border-r border-gray-200 z-[45] transition-transform duration-300 shadow-2xl w-[350px] ${activeSidebar !== 'none' ? 'translate-x-0' : '-translate-x-full'}`}>
           {activeSidebar === 'chat' ? 
              <ChatPanel messages={messages} onSendMessage={handleSendMessage} onClearChat={() => setMessages([])} isLoading={isAiLoading} /> : 
              activeSidebar === 'design' ? 
              <DesignPanel 
                config={uiConfig} 
                onChange={setUiConfig} 
                onReset={() => setUiConfig(getSavedDefault())} 
                onSaveDefault={handleSaveAsDefault}
                currentEvents={events} 
              /> : null}
        </aside>

        <main 
          className={`flex-1 overflow-hidden relative flex items-center justify-center select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Controles Flutuantes de Visualização */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur rounded-full shadow-2xl border border-gray-200 p-1.5 flex items-center gap-2">
             <button onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ZoomOut size={18} /></button>
             <div className="w-16 text-center">
               <span className="text-[10px] font-black text-gray-800 block leading-none">{Math.round(zoomLevel * 100)}%</span>
               <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">Visual</span>
             </div>
             <button onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ZoomIn size={18} /></button>
             <div className="w-px h-6 bg-gray-200 mx-1"></div>
             <button onClick={resetView} title="Resetar Visão" className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Maximize size={18} /></button>
             <div className="px-3 flex flex-col items-center">
                <Move size={12} className="text-primary mb-0.5" />
                <span className="text-[7px] font-black uppercase text-gray-400">Arraste a folha</span>
             </div>
          </div>

          {/* O Documento */}
          <div 
            className="transition-transform duration-75 ease-out shadow-[0_0_100px_rgba(0,0,0,0.5)]"
            style={{ 
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                pointerEvents: isDragging ? 'none' : 'auto' // Crucial: só bloqueia eventos se estiver arrastando
            }}
          >
            <div 
              id="printable-content" 
              className="bg-white flex flex-col items-center origin-center" 
              style={{ 
                  width: '297mm', 
                  height: '210mm', 
                  padding: `${uiConfig.edgeTop}px ${uiConfig.edgeRight}px ${uiConfig.edgeBottom}px ${uiConfig.edgeLeft}px`,
                  boxSizing: 'border-box'
              }}
            >
               {/* Cabeçalho Superior - Idêntico ao Anexo (Serifa e Layout) */}
               <div className="w-full flex justify-between items-end pb-1 border-b border-black mb-1">
                  <div>
                     <h1 className="font-serif font-black uppercase tracking-wide leading-tight pb-0.5 text-gray-900" style={{ fontSize: `${uiConfig.fontSizeTitle}px` }}>
                       DIREÇÃO DOS CULTOS
                     </h1>
                     <p className="font-bold text-[10px] text-gray-900 uppercase tracking-widest">
                       I IGREJA BATISTA EM SÃO JOSÉ DO DIVINO - PI
                     </p>
                  </div>
                  <div className="text-right">
                     <h2 className="font-serif font-bold italic leading-none text-gray-900" style={{ fontSize: `${uiConfig.fontSizeMonth}px` }}>
                       {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                     </h2>
                  </div>
               </div>
               
               <div 
                 className="w-full text-center shrink-0" 
                 style={{ 
                    padding: `${uiConfig.spacingVerse}px 0`
                 }}
               >
                  <p className="font-serif italic font-bold text-black leading-tight" style={{ fontSize: `${uiConfig.fontSizeVerse}px` }}>
                    "Portanto, meus amados irmãos, sede firmes e constantes, sempre abundantes na obra do Senhor..." (I CO 15:58)
                  </p>
               </div>

               <div 
                 className="flex flex-col overflow-hidden mx-auto"
                 style={{ 
                   width: `${uiConfig.gridWidth}%`, 
                   height: `${uiConfig.gridHeight}px`,
                   maxHeight: '100%'
                 }}
               >
                 <CalendarGrid currentDate={currentDate} events={events} config={uiConfig} onDateClick={(d) => setEditorState({ isOpen: true, date: d })} onEventClick={(e) => setEditorState({ isOpen: true, date: e.date, event: e })} onDeleteEvent={(id) => setEvents(prev => prev.filter(e => e.id !== id))} />
               </div>

                <div className="w-full text-center mt-auto pt-3 shrink-0">
                   {(() => {
                     const mKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                     const theme = MONTH_THEMES[mKey];
                     return theme ? (
                       <h3 className="font-serif font-black text-center text-gray-900 uppercase tracking-widest mb-1.5 text-base">
                         {theme}
                       </h3>
                     ) : null;
                   })()}
                   <p className="font-bold uppercase text-gray-900 tracking-wide" style={{ fontSize: `${uiConfig.fontSizeFooter}px` }}>
                     OBS: QUANDO NÃO PUDER DIRIGIR O CULTO, POR FAVOR, AVISE COM NO MÍNIMO 24 HORAS DE ANTECEDÊNCIA.
                   </p>
                </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
