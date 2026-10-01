import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Paperclip, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, attachment?: { data: string; mimeType: string }) => void;
  onClearChat: () => void;
  isLoading: boolean;
  currentDate: Date;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, onClearChat, isLoading, currentDate }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{ data: string; mimeType: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachment) && !isLoading) {
      onSendMessage(input, attachment || undefined);
      setInput('');
      setAttachment(null);
    }
  };

  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const nextMonthLabel = nextMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const sendNextMonth = () => { if (!isLoading) onSendMessage(`Gere a escala de ${nextMonthLabel}.`); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
        alert('Escolha uma imagem PNG, JPEG ou WebP de até 4 MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          data: (reader.result as string).split(',')[1],
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D47F7F]" fill="#D47F7F" />
            IA Assistente
          </h2>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Controle Inteligente
          </p>
          <button type="button" onClick={sendNextMonth} disabled={isLoading} className="mt-2 text-left text-[11px] font-bold text-[#b65f5f] hover:underline disabled:opacity-50">
            Gerar escala de {nextMonthLabel}
          </button>
        </div>
        <button 
          onClick={() => { if(confirm("Limpar conversa?")) onClearChat(); }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Limpar Chat"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div role="log" aria-label="Conversa com a IA" aria-live="polite" className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll bg-gray-50/30">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border ${
                msg.role === 'user' ? 'bg-gray-100 border-gray-200 text-gray-600' : 'bg-[#D47F7F] border-transparent text-white'
              }`}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gray-800 text-white rounded-tr-none'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}
            >
              {msg.attachment && (
                <div className="mb-2 rounded-lg overflow-hidden border border-gray-100">
                  <img 
                    src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                    alt="Anexo" 
                    className="max-w-full h-auto block"
                  />
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase ml-10 animate-pulse">
            Processando escala...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        {attachment && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200">
            <div className="flex items-center gap-2 overflow-hidden">
              <ImageIcon size={14} className="text-gray-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-gray-600 truncate uppercase">Imagem pronta</span>
            </div>
            <button 
              type="button" 
              aria-label="Remover imagem" onClick={() => setAttachment(null)}
              className="text-gray-400 hover:text-red-500 p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
        <div className="relative flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/png,image/jpeg,image/webp"
            className="hidden" 
          />
          <button
            type="button"
            aria-label="Anexar imagem" onClick={() => fileInputRef.current?.click()}
            className={`p-2.5 rounded-full transition-colors ${attachment ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
          >
            <Paperclip size={18} />
          </button>
          
          <div className="relative flex-1">
            <input
              type="text"
              aria-label="Mensagem para a IA" value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Qual escala devo gerar?"
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#D47F7F] focus:ring-1 focus:ring-[#D47F7F] rounded-full text-xs transition-all outline-none text-gray-900 placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              aria-label="Enviar mensagem"
              disabled={(!input.trim() && !attachment) || isLoading}
              className="absolute right-1 top-1 p-1.5 bg-[#D47F7F] text-white rounded-full hover:bg-[#c06b6b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
