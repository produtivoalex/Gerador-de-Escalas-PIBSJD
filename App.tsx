
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Image, ZoomIn, ZoomOut, Settings, MessageSquare, Maximize, Move } from 'lucide-react';
import CalendarGrid from './components/CalendarGrid';
import ChatPanel from './components/ChatPanel';
import DesignPanel from './components/DesignPanel';
import EventEditor from './components/EventEditor';
import type { AppData, ChurchEvent, ChatMessage } from './types';
import { MONTH_THEMES } from './data/defaults';
import { applyEventChanges, defaultData, loadData, saveData, parseBackup, serializeBackup } from './services/storage';
import { processCommand } from './services/geminiService';
import { cachedCloud, cloudRequest, useCloudSync, type CloudSession } from './services/cloudSync';



const App: React.FC<{ cloud?: CloudSession; onLogout?: () => void }> = ({ cloud, onLogout }) => {
  const [initial] = useState(() => {
    if (cloud) {
      const cached = cachedCloud(cloud);
      if (cached) return { data: cached.data as AppData, error: '' };
      if (cloud.data) return { data: cloud.data, error: '' };
    }
    try { return { data: loadData(localStorage), error: '' }; }
    catch { return { data: defaultData(), error: 'Não foi possível ler os dados salvos. Eles foram preservados; importe um backup para recuperar.' }; }
  });
  const [appData, setAppData] = useState<AppData>(initial.data);
  const [loadError, setLoadError] = useState(initial.error);
  const [storageError, setStorageError] = useState('');
  const [notice, setNotice] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const { events, people, messages, config: uiConfig } = appData;
  const currentDate = new Date(appData.lastDate);
  function update<K extends keyof AppData>(key: K, value: React.SetStateAction<AppData[K]>) {
    setAppData(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as (old: AppData[K]) => AppData[K])(prev[key]) : value }));
  }
  const setEvents = (value: React.SetStateAction<ChurchEvent[]>) => update('events', value);
  const setPeople = (value: string[]) => update('people', value);
  const setMessages = (value: React.SetStateAction<ChatMessage[]>) => update('messages', value);
  const setUiConfig = (value: React.SetStateAction<AppData['config']>) => update('config', value);
  const setCurrentDate = (date: Date) => update('lastDate', date.toISOString());
  const getSavedDefault = () => appData.defaultConfig;

  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false); // Controls the Visual State (pointer-events)
  const isMouseDownRef = useRef(false); // Controls the Logic State
  const dragStart = useRef({ x: 0, y: 0 });

  const [activeSidebar, setActiveSidebar] = useState<'none' | 'chat' | 'design'>('none');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editorState, setEditorState] = useState<{ isOpen: boolean; date: string; event?: ChurchEvent; }>({ isOpen: false, date: '' });
  const [showList, setShowList] = useState(() => window.matchMedia('(max-width: 640px)').matches);
  const sync = useCloudSync(appData, setAppData, cloud, isAiLoading || editorState.isOpen || !!loadError);
  const [versions, setVersions] = useState<{ version: number; updated: string }[] | null>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (versions) historyRef.current?.showModal(); }, [versions]);
  const openHistory = async () => {
    try { setVersions(await cloudRequest('/api/versions')); }
    catch (error) { setNotice((error as Error).message); }
  };
  const restoreVersion = async (version: number) => {
    try {
      const restored = await cloudRequest('/api/versions/' + version);
      if (!confirm(`Restaurar a versão ${version}? A restauração será salva como uma nova versão. Exporte um backup das alterações locais antes de continuar.`)) return;
      saveData(localStorage, restored.data);
      setAppData(restored.data); setVersions(null); setNotice('Versão restaurada. Aguardando sincronização.');
    } catch (error) { setNotice((error as Error).message); }
  };

  useEffect(() => {
    if (loadError) return;
    try {
      saveData(localStorage, appData);
      localStorage.removeItem('cultogen_gemini_api_key');
      setStorageError('');
    } catch {
      setStorageError('Não foi possível salvar neste navegador. Exporte um backup para preservar as alterações.');
    }
  }, [appData, loadError]);

  const handleBackup = async () => {
    try {
      const { downloadFile } = await import('./services/exportSchedule');
      downloadFile(new Blob([serializeBackup(appData)], { type: 'application/json' }),
        'Escalas-backup-' + new Date().toISOString().slice(0, 10) + '.json');
      setNotice('Backup exportado. Guarde o arquivo em um local seguro ou importe em outro computador.');
    } catch { setNotice('Não foi possível exportar o backup. Tente novamente.'); }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 15000000) throw new Error('O backup excede o limite de 15 MB.');
      const restored = parseBackup(await file.text());
      if (!confirm('Importar este backup substituirá as escalas, os nomes, o visual e as conversas atuais. Deseja continuar?')) return;
      // Save atomically before updating the screen. A quota failure keeps current data intact.
      saveData(localStorage, restored);
      setAppData(restored);
      setLoadError('');
      setStorageError('');
      setNotice('Backup importado com sucesso.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível importar o backup.'); }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
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
    update('defaultConfig', { ...uiConfig });
    setNotice('Visual atual definido como padrão.');
  };

  const handleSendMessage = async (text: string, attachment?: { data: string; mimeType: string }) => {
    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now(), attachment };
    setMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const response = await processCommand(text, events, currentDate, people, uiConfig, attachment);
      setMessages(prev => [...prev, { role: 'model', text: response.message, timestamp: Date.now() }]);
      setEvents(prev => applyEventChanges(prev, response));
      if (response.updatedConfig) setUiConfig(prev => ({ ...prev, ...response.updatedConfig }));
      if (response.suggestedMonth) {
        const [y, m] = response.suggestedMonth.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m)) setCurrentDate(new Date(y, m - 1, 1));
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: error instanceof Error ? error.message : 'Erro ao processar comando.', timestamp: Date.now() }]);
    } finally { setIsAiLoading(false); }
  };

  const handleExport = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('printable-content');
    if (!element || isDownloading) return;
    setIsDownloading(true);
    try {
      const { exportSchedule } = await import('./services/exportSchedule');
      await exportSchedule(element, currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }), format);
    } catch {
      setNotice('Não foi possível exportar ' + format.toUpperCase() + '. Tente novamente.');
    } finally { setIsDownloading(false); }
  };


  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#333333]">
      {versions && <dialog ref={historyRef} onCancel={() => setVersions(null)} aria-labelledby="history-title" className="rounded-xl p-5 max-w-md w-[calc(100%-2rem)] max-h-[80dvh]">
        <h2 id="history-title" className="font-bold text-lg">Histórico na nuvem</h2>
        <p className="text-sm my-3">Últimas 30 versões. Restaurar preserva a versão anterior no histórico.</p>
        {!versions.length && <p>Nenhuma versão salva ainda.</p>}
        {versions.map(v => <button key={v.version} disabled={isAiLoading} onClick={() => restoreVersion(v.version)} className="block w-full border rounded p-3 my-2 text-left">Versão {v.version} · {new Date(v.updated).toLocaleString('pt-BR')}</button>)}
        <button onClick={() => setVersions(null)} className="mt-3 underline">Fechar histórico</button>
      </dialog>}
      <EventEditor isOpen={editorState.isOpen} onClose={() => setEditorState(prev => ({ ...prev, isOpen: false }))} date={editorState.date} event={editorState.event} onSave={(ev) => setEvents(prev => { const idx = prev.findIndex(e => e.id === ev.id); if (idx >= 0) { const upd = [...prev]; upd[idx] = ev; return upd; } return [...prev, ev]; })} people={people} onUpdatePeople={setPeople} onDelete={(id) => setEvents(prev => prev.filter(e => e.id !== id))} />

      <header className="min-h-14 flex-wrap gap-2 py-2 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-50 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-primary text-2xl">church</span>
            <h1 className="font-bold text-gray-800 hidden sm:block">CultoGen AI</h1>
          </div>
          <div className="flex items-center bg-gray-100 rounded-md p-0.5 border border-gray-200">
            <button aria-label="Mês anterior" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronLeft size={16} /></button>
            <span className="px-3 min-w-[140px] text-center font-bold text-xs uppercase select-none">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <button aria-label="Próximo mês" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowList(!showList)} aria-pressed={showList} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">{showList ? 'Ver folha' : 'Ver lista'}</button>
          {cloud && <><button onClick={openHistory} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">Histórico</button><button onClick={onLogout} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">Sair</button></>}
          <input ref={importRef} type="file" accept=".json,application/json" aria-label="Importar arquivo de backup" className="hidden" onChange={handleImport} disabled={isAiLoading} />
          <button onClick={handleBackup} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">Backup</button>
          <button onClick={() => importRef.current?.click()} disabled={isAiLoading} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold disabled:opacity-50">Importar</button>
          <button onClick={() => setActiveSidebar(activeSidebar === 'chat' ? 'none' : 'chat')} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold uppercase transition-all ${activeSidebar === 'chat' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><MessageSquare size={16} /> IA</button>
          <button onClick={() => setActiveSidebar(activeSidebar === 'design' ? 'none' : 'design')} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold uppercase transition-all ${activeSidebar === 'design' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Settings size={16} /> Visual</button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button onClick={() => handleExport('png')} disabled={isDownloading} title="Exportar imagem PNG de alta resolução para WhatsApp e redes" className="px-4 py-2 bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-xs font-bold uppercase hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm">
            <Image size={14} /> {isDownloading ? 'Gerando...' : 'Exportar PNG'}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={isDownloading} title="Exportar documento PDF em tamanho A4 para impressão" className="px-4 py-2 bg-gray-900 text-white rounded-lg flex items-center gap-2 text-xs font-bold uppercase hover:bg-black disabled:opacity-50 transition-colors shadow-sm">
            <Download size={14} /> {isDownloading ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </header>

      {cloud && <div className="px-4 py-2 bg-white border-b text-xs flex flex-wrap gap-3 items-center"><span role="status">{sync.status}</span>{sync.conflict && <><button disabled={isAiLoading} onClick={() => sync.resolve('remote')} className="underline">Usar versão da nuvem</button><button disabled={isAiLoading} onClick={() => sync.resolve('local')} className="underline">Enviar versão local</button><button onClick={handleBackup} className="underline">Baixar backup local</button></>}</div>}

      {(loadError || storageError || notice) && <div role="status" className="px-4 py-2 bg-amber-50 text-amber-900 text-sm flex justify-between gap-3">
        <span>{loadError || storageError || notice}</span>
        {!loadError && !storageError && <button onClick={() => setNotice('')} aria-label="Fechar aviso">×</button>}
      </div>}
      <div className="flex-1 flex overflow-hidden relative">
        <aside aria-label="Painel de ferramentas" hidden={activeSidebar === 'none'} className={`absolute left-0 top-0 h-full bg-white border-r border-gray-200 z-[45] shadow-2xl w-[350px] max-w-full flex flex-col`}>
          <button onClick={() => setActiveSidebar('none')} className="p-2 border-b text-sm text-right">Fechar painel ×</button>
          <div className="flex-1 min-h-0">
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
          </div>
        </aside>

        <main 
          aria-label="Escala mensal"
          className={`flex-1 relative ${showList ? 'overflow-y-auto bg-gray-100 p-4' : `overflow-hidden flex items-center justify-center select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {showList && <div className="max-w-2xl mx-auto space-y-3 pb-6">
            <h2 className="text-lg font-bold">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => {
              const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
              const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
              return <section key={date} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex justify-between items-center gap-2"><h3 className="font-bold text-sm capitalize">{day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}</h3><button aria-label={`Adicionar culto em ${i + 1}/${day.getMonth() + 1}/${day.getFullYear()}`} onClick={() => setEditorState({ isOpen: true, date })} className="text-sm px-3 py-2 rounded bg-gray-100">+ Culto</button></div>
                {events.filter(e => e.date === date).map(event => <button key={event.id} onClick={() => setEditorState({ isOpen: true, date, event })} className="block text-left w-full mt-3 border-t pt-3 text-sm"><strong>{event.customTitle || event.type}</strong><span className="block mt-1">Dirigente: {event.leader || 'Não definido'}</span><span className="block">Pregador: {event.preacher || 'Não definido'}</span>{event.notes && <span className="block mt-1">{event.notes}</span>}</button>)}
              </section>;
            })}
          </div>}
          {/* Controles Flutuantes de Visualização */}
          <div hidden={showList} className="floating-controls fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur rounded-full shadow-2xl border border-gray-200 p-1.5 flex items-center gap-2">
             <button aria-label="Diminuir zoom" onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ZoomOut size={18} /></button>
             <div className="w-16 text-center">
               <span className="text-[10px] font-black text-gray-800 block leading-none">{Math.round(zoomLevel * 100)}%</span>
               <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">Visual</span>
             </div>
             <button aria-label="Aumentar zoom" onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ZoomIn size={18} /></button>
             <div className="w-px h-6 bg-gray-200 mx-1"></div>
             <button onClick={resetView} title="Resetar Visão" className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Maximize size={18} /></button>
             <div className="px-3 flex flex-col items-center">
                <Move size={12} className="text-primary mb-0.5" />
                <span className="text-[7px] font-black uppercase text-gray-400">Arraste a folha</span>
             </div>
          </div>

          {/* O Documento */}
          <div 
            aria-hidden={showList || undefined}
            inert={showList || undefined}
            className="transition-transform duration-75 ease-out shadow-[0_0_100px_rgba(0,0,0,0.5)]"
            style={{ 
                ...(showList ? { position: 'fixed', left: '-10000px', top: 0 } as const : {}),
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
                 <CalendarGrid currentDate={currentDate} events={events} config={uiConfig} onDateClick={(d) => setEditorState({ isOpen: true, date: d })} onEventClick={(e) => setEditorState({ isOpen: true, date: e.date, event: e })} />
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
