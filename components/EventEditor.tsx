import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Edit2, Check, Save, Users } from 'lucide-react';
import { ChurchEvent, ServiceType } from '../types';

interface EventEditorProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  event?: ChurchEvent;
  onSave: (event: ChurchEvent) => void;
  onDelete: (id: string) => void;
  people: string[];
  onUpdatePeople: (people: string[]) => void;
}

const EventEditor: React.FC<EventEditorProps> = ({ 
  isOpen, 
  onClose, 
  date, 
  event, 
  onSave, 
  onDelete,
  people, 
  onUpdatePeople 
}) => {
  const [type, setType] = useState<ServiceType>(ServiceType.ADORACAO);
  const [eventDate, setEventDate] = useState(date);
  const [customTitle, setCustomTitle] = useState('');
  const [leader, setLeader] = useState('');
  const [preacher, setPreacher] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isManagingPeople, setIsManagingPeople] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [editingPersonIndex, setEditingPersonIndex] = useState<number | null>(null);
  const [editingPersonName, setEditingPersonName] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.showModal();
    return () => { dialogRef.current?.close(); previous?.focus(); };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setEventDate(event.date);
        setType(event.type);
        setCustomTitle(event.customTitle || '');
        setLeader(event.leader);
        setPreacher(event.preacher);
        setNotes(event.notes || '');
      } else {
        setEventDate(date);
        const d = new Date(date + 'T12:00:00'); 
        const day = d.getDay();
        if (day === 0) {
           setType(ServiceType.ADORACAO);
           setNotes('');
        }
        else if (day === 3) {
           setType(ServiceType.CENTRAL);
           setNotes('');
        }
        else if (day === 5) {
           setType(ServiceType.DOMICILIAR);
           setNotes('PGMs');
        }
        else {
           setType(ServiceType.OUTRO);
           setNotes('');
        }

        setCustomTitle('');
        setLeader('');
        setPreacher('');
      }
      setIsManagingPeople(false);
    }
  }, [isOpen, date, event]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      id: event?.id || crypto.randomUUID(),
      date: eventDate,
      type,
      customTitle: type === ServiceType.OUTRO ? customTitle : undefined,
      leader,
      preacher,
      notes: notes.trim() || undefined
    });
    onClose();
  };

  const handleAddPerson = () => {
    if (newPersonName.trim() && !people.includes(newPersonName.trim())) {
      onUpdatePeople([...people, newPersonName.trim()].sort());
      setNewPersonName('');
    }
  };

  const handleDeletePerson = (name: string) => {
    if (confirm(`Tem certeza que deseja remover "${name}" da lista?`)) {
      onUpdatePeople(people.filter(p => p !== name));
    }
  };

  const startEditPerson = (index: number) => {
    setEditingPersonIndex(index);
    setEditingPersonName(people[index]);
  };

  const saveEditPerson = (index: number) => {
    if (editingPersonName.trim()) {
      const newPeople = [...people];
      newPeople[index] = editingPersonName.trim();
      onUpdatePeople(newPeople.sort());
      setEditingPersonIndex(null);
    }
  };

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <dialog ref={dialogRef} aria-labelledby="editor-title" onCancel={onClose} className="p-0 rounded-xl w-[calc(100%-2rem)] max-w-lg backdrop:bg-black/50 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 id="editor-title" className="text-lg font-bold text-gray-900 capitalize">{formattedDate}</h3>
            <p className="text-xs text-gray-500">{isManagingPeople ? 'Gerenciar Nomes' : 'Editar Escala'}</p>
          </div>
          <div className="flex gap-2">
            {!isManagingPeople && (
              <button 
                onClick={() => setIsManagingPeople(true)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                title="Gerenciar lista de nomes"
              >
                <Users size={16} /> Gerenciar Nomes
              </button>
            )}
            <button aria-label="Fechar editor" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isManagingPeople ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button 
                  onClick={() => setIsManagingPeople(false)}
                  className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
                >
                  ← Voltar para edição
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label="Novo nome" value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Novo nome..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                />
                <button 
                  aria-label="Adicionar nome" onClick={handleAddPerson}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {people.map((person, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between group">
                    {editingPersonIndex === idx ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          aria-label="Editar nome" value={editingPersonName}
                          onChange={(e) => setEditingPersonName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm outline-none text-gray-900"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveEditPerson(idx)}
                        />
                        <button aria-label="Salvar nome" onClick={() => saveEditPerson(idx)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16}/></button>
                        <button aria-label="Cancelar edição do nome" onClick={() => setEditingPersonIndex(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={16}/></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-gray-900 text-sm">{person}</span>
                        <div className="flex gap-1 opacity-100 transition-opacity">
                          <button 
                            aria-label={`Editar nome ${person}`} onClick={() => startEditPerson(idx)}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            aria-label={`Excluir nome ${person}`} onClick={() => handleDeletePerson(person)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2" htmlFor="event-date">Data do culto</label>
                <input id="event-date" type="date" aria-label="Data do culto" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900" />
                {event && <p className="mt-1 text-[11px] text-gray-500">Altere a data para mover este card para outro dia.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo de Culto</label>
                <select 
                  aria-label="Tipo de Culto" value={type}
                  onChange={(e) => setType(e.target.value as ServiceType)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                >
                  {Object.values(ServiceType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {type === ServiceType.OUTRO && (
                <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Nome do Evento
                  </label>
                  <input
                    type="text"
                    aria-label="Nome do Evento" value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Culto de Missões"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Dirigente
                </label>
                <div className="relative">
                  <select
                    aria-label="Dirigente" value={leader}
                    onChange={(e) => setLeader(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                  >
                    <option value="">Selecione um dirigente...</option>
                    {people.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Pregador
                </label>
                <div className="relative">
                  <select
                    aria-label="Pregador" value={preacher}
                    onChange={(e) => setPreacher(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                  >
                    <option value="">Selecione um pregador...</option>
                    {people.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Observações
                </label>
                <textarea
                  aria-label="Observações" value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-900"
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
          )}
        </div>

        {!isManagingPeople && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-end gap-3">
            {event && <button className="mr-auto px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg" onClick={() => {
              if (confirm('Excluir este culto da escala?')) { onDelete(event.id); onClose(); }
            }}>Excluir culto</button>}
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Save size={16} /> Salvar Alterações
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
};

export default EventEditor;
