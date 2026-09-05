
import React, { useState } from 'react';
import { UIConfig, ChurchEvent, ServiceType } from '../types';
import { Type, Palette, Layout, Settings2, RotateCcw, ChevronDown, ChevronUp, MoveHorizontal, Image as ImageIcon, Save } from 'lucide-react';

interface DesignPanelProps {
  config: UIConfig;
  onChange: (config: UIConfig) => void;
  onReset: () => void;
  onSaveDefault: () => void;
  currentEvents: ChurchEvent[]; 
}

const DesignPanel: React.FC<DesignPanelProps> = ({ config, onChange, onReset, onSaveDefault }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    global: true,
    cores: true,
    fontes: false,
    espaços: false,
    grade: false
  });

  const toggle = (section: string) => setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  const update = (key: keyof UIConfig, value: any) => onChange({ ...config, [key]: value });

  const SectionHeader = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
    <button 
      onClick={() => toggle(id)}
      className="w-full flex justify-between items-center py-3 px-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100"
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-800">{label}</span>
      </div>
      {openSections[id] ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
        <h2 className="font-black text-gray-800 flex items-center gap-2 uppercase text-xs tracking-widest">
          <Settings2 size={16} className="text-primary" /> Personalizar Design
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={onSaveDefault} className="p-1.5 text-gray-400 hover:text-primary transition-colors" title="Salvar como Padrão">
            <Save size={14} />
          </button>
          <button onClick={onReset} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Restaurar Padrões Salvos">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pb-20">
        <SectionHeader id="global" label="Configurações Globais" icon={Layout} />
        {openSections.global && (
          <div className="p-4 space-y-4 bg-gray-50/30">
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <label className="text-[9px] font-black text-gray-700 uppercase mb-2 block">Cabeçalho da Grade</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[7px] font-bold text-gray-400 uppercase">Fundo</label>
                  <input type="color" value={config.headerBgColor} onChange={(e) => update('headerBgColor', e.target.value)} className="w-full h-8 rounded border-0 p-0 cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[7px] font-bold text-gray-400 uppercase">Texto</label>
                  <input type="color" value={config.headerTextColor} onChange={(e) => update('headerTextColor', e.target.value)} className="w-full h-8 rounded border-0 p-0 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        )}

        <SectionHeader id="cores" label="Cores dos Cards" icon={Palette} />
        {openSections.cores && (
          <div className="p-4 space-y-4 bg-gray-50/30">
            {[
              { label: ServiceType.ADORACAO, title: 'colorAdoracaoTitle', text: 'colorAdoracaoText', bg: 'bgColorAdoracao' },
              { label: ServiceType.CENTRAL, title: 'colorCentralTitle', text: 'colorCentralText', bg: 'bgColorCentral' },
              { label: ServiceType.DOMICILIAR, title: 'colorDomiciliarTitle', text: 'colorDomiciliarText', bg: 'bgColorDomiciliar' },
              { label: 'Outros Eventos', title: 'colorOutroTitle', text: 'colorOutroText', bg: 'bgColorOutro' },
            ].map(item => (
              <div key={item.label} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[9px] font-black text-gray-700 uppercase">{item.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[7px] font-bold text-gray-400 uppercase">Título</label>
                    <input type="color" value={config[item.title as keyof UIConfig] as string} onChange={(e) => update(item.title as keyof UIConfig, e.target.value)} className="w-full h-8 rounded border-0 p-0 cursor-pointer" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[7px] font-bold text-gray-400 uppercase">Texto</label>
                    <input type="color" value={config[item.text as keyof UIConfig] as string} onChange={(e) => update(item.text as keyof UIConfig, e.target.value)} className="w-full h-8 rounded border-0 p-0 cursor-pointer" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[7px] font-bold text-gray-400 uppercase">Fundo</label>
                    <input type="color" value={config[item.bg as keyof UIConfig] as string} onChange={(e) => update(item.bg as keyof UIConfig, e.target.value)} className="w-full h-8 rounded border-0 p-0 cursor-pointer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionHeader id="fontes" label="Tamanhos de Fontes" icon={Type} />
        {openSections.fontes && (
          <div className="p-4 space-y-4 bg-gray-50/30">
            {[
              { label: 'Título Principal', key: 'fontSizeTitle' },
              { label: 'Mês e Ano', key: 'fontSizeMonth' },
              { label: 'Versículo Bíblico', key: 'fontSizeVerse' },
              { label: 'Dias da Semana', key: 'fontSizeWeekDays' },
              { label: 'Título do Card', key: 'fontSizeCardTitle' },
              { label: 'Nomes (DIR/PREG)', key: 'fontSizeCardText' },
              { label: 'Rodapé (Obs)', key: 'fontSizeFooter' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between mb-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase">{item.label}</label>
                  <span className="text-[9px] text-gray-400 font-mono">{config[item.key as keyof UIConfig]}px</span>
                </div>
                <input type="range" min="6" max="60" value={config[item.key as keyof UIConfig] as number} onChange={(e) => update(item.key as keyof UIConfig, parseInt(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg accent-primary" />
              </div>
            ))}
          </div>
        )}

        <SectionHeader id="espaços" label="Extremidades (Margens)" icon={Layout} />
        {openSections.espaços && (
          <div className="p-4 space-y-4 bg-gray-50/30">
            {[
              { label: 'Acima do Cabeçalho', key: 'edgeTop' },
              { label: 'Abaixo do Rodapé', key: 'edgeBottom' },
              { label: 'Lateral Esquerda', key: 'edgeLeft' },
              { label: 'Lateral Direita', key: 'edgeRight' },
              { label: 'Em torno do Versículo', key: 'spacingVerse' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between mb-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase">{item.label}</label>
                  <span className="text-[9px] text-gray-400 font-mono">{config[item.key as keyof UIConfig]}px</span>
                </div>
                <input type="range" min="0" max="100" value={config[item.key as keyof UIConfig] as number} onChange={(e) => update(item.key as keyof UIConfig, parseInt(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg accent-primary" />
              </div>
            ))}
          </div>
        )}

        <SectionHeader id="grade" label="Dimensões da Grade" icon={MoveHorizontal} />
        {openSections.grade && (
          <div className="p-4 space-y-4 bg-gray-50/30">
            {[
              { label: 'Largura da Grade (%)', key: 'gridWidth', min: 50, max: 100 },
              { label: 'Altura da Grade (px)', key: 'gridHeight', min: 300, max: 800 },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between mb-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase">{item.label}</label>
                  <span className="text-[9px] text-gray-400 font-mono">{config[item.key as keyof UIConfig]}</span>
                </div>
                <input type="range" min={item.min} max={item.max} value={config[item.key as keyof UIConfig] as number} onChange={(e) => update(item.key as keyof UIConfig, parseInt(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg accent-primary" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignPanel;
