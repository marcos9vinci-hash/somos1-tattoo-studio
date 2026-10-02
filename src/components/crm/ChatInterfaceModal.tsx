import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Bot, User, X, ExternalLink, Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { CRMMessage } from '../../types/crm';
import { crmService } from '../../lib/crmService';
import { cn } from '../../lib/utils';

interface ChatInterfaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    avatar?: string;
  } | null;
}

export const ChatInterfaceModal: React.FC<ChatInterfaceModalProps> = ({ isOpen, onClose, cliente }) => {
  const [mensagens, setMensagens] = useState<CRMMessage[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [remetenteSelecionado, setRemetenteSelecionado] = useState<'ia' | 'tatuador'>('tatuador');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega histórico de mensagens do cliente
  useEffect(() => {
    if (cliente?.id && isOpen) {
      setCarregando(true);
      crmService.getMensagensChat(cliente.id)
        .then(hist => {
          if (hist && hist.length > 0) {
            setMensagens(hist);
          } else {
            // Se ainda não houver histórico gravado, inicia com mensagem de boas-vindas da IA
            setMensagens([
              {
                id: 'welcome-1',
                clienteId: cliente.id,
                remetente: 'ia',
                mensagem: `Olá ${cliente.nome}! Sou o assistente virtual do Somos 1 Tattoo Studio. Como posso ajudar com sua ideia de tattoo hoje?`,
                timestamp: new Date(),
                status: 'lido'
              }
            ]);
          }
        })
        .finally(() => setCarregando(false));
    }
  }, [cliente?.id, isOpen]);

  // Auto scroll para o final das mensagens
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [mensagens]);

  if (!isOpen || !cliente) return null;

  const handleEnviar = async () => {
    if (!novaMensagem.trim() && !anexoNome) return;
    
    let textoFinal = novaMensagem.trim();
    if (anexoNome) {
      textoFinal = textoFinal ? `${textoFinal} [📎 Anexo: ${anexoNome}]` : `📎 Arquivo: ${anexoNome}`;
    }

    const tempMsg: CRMMessage = {
      id: Date.now().toString(),
      clienteId: cliente.id,
      remetente: remetenteSelecionado,
      mensagem: textoFinal,
      timestamp: new Date(),
      status: 'enviado'
    };

    setMensagens(prev => [...prev, tempMsg]);
    setNovaMensagem('');
    setAnexoNome(null);
    setShowEmojiPicker(false);
    setEnviando(true);

    try {
      await crmService.enviarMensagemChat(cliente.id, textoFinal, remetenteSelecionado, cliente.telefone);
      setMensagens(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'entregue' } : m));
    } catch (e) {
      console.warn("Erro ao disparar mensagem:", e);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const emojisRapidos = [
    '😊', '😍', '🔥', '⚡', '✨', '👏', '🤝', '🎨', '🖤', '📍', '💬', '🚀'
  ];

  const abrirNoWhatsAppWeb = () => {
    const limpo = cliente.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${limpo}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Clique fora para fechar */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Lateral */}
      <div className="w-full sm:w-[500px] h-full bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header do Chat */}
        <div className="p-4 border-b border-white/10 bg-zinc-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-headline font-black text-sm shrink-0 shadow-md">
              {cliente.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-headline font-black text-sm text-white truncate flex items-center gap-1.5">
                {cliente.nome}
              </h3>
              <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                <span>{cliente.telefone || 'Sem WhatsApp'}</span>
                {cliente.telefone && (
                  <button 
                    onClick={abrirNoWhatsAppWeb}
                    className="text-[10px] text-green-400 hover:text-green-300 hover:underline flex items-center gap-0.5"
                    title="Abrir no WhatsApp Web"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    Web
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Seletor IA vs Tatuador */}
            <div className="bg-zinc-950 p-1 rounded-xl border border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRemetenteSelecionado('ia')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-headline font-bold flex items-center gap-1 transition-all",
                  remetenteSelecionado === 'ia'
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
                title="Responder em nome do Robô de IA"
              >
                <Bot className="w-3 h-3" />
                IA
              </button>
              <button
                type="button"
                onClick={() => setRemetenteSelecionado('tatuador')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-headline font-bold flex items-center gap-1 transition-all",
                  remetenteSelecionado === 'tatuador'
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
                title="Responder como Tatuador / Atendente"
              >
                <User className="w-3 h-3" />
                Tatuador
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Indicador */}
        <div className="px-4 py-2 bg-zinc-900/40 border-b border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Resposta Direta pelo Navegador</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Modo Atual: <strong className={remetenteSelecionado === 'ia' ? "text-purple-400" : "text-emerald-400"}>
              {remetenteSelecionado === 'ia' ? 'Robô IA (NAIA)' : 'Você (Tatuador)'}
            </strong>
          </span>
        </div>

        {/* Área de Mensagens */}
        <div ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto space-y-4">
          {carregando ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-headline animate-pulse">
              Carregando histórico do cliente...
            </div>
          ) : mensagens.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-xs font-headline italic">
              Nenhuma mensagem registrada ainda. Digite abaixo para iniciar a conversa!
            </div>
          ) : (
            mensagens.map(msg => (
              <MessageBubble key={msg.id} mensagem={msg} />
            ))
          )}
        </div>

        {/* Anexo Indicador */}
        {anexoNome && (
          <div className="px-4 py-2 bg-zinc-900 border-t border-white/10 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center gap-2 truncate">
              <Paperclip className="w-3.5 h-3.5 text-primary-fixed" />
              <span className="truncate">{anexoNome}</span>
            </div>
            <button onClick={() => setAnexoNome(null)} className="text-zinc-500 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Emoji Selector Rápido */}
        {showEmojiPicker && (
          <div className="p-2 bg-zinc-900 border-t border-white/10 grid grid-cols-6 gap-2">
            {emojisRapidos.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setNovaMensagem(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-lg hover:bg-white/10 rounded-lg p-1.5 transition-all text-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar Estilo WhatsApp */}
        <div className="p-3 bg-zinc-900/90 border-t border-white/10 shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1 pb-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setAnexoNome(f.name);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                title="Anexar arquivo / imagem"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              <textarea
                value={novaMensagem}
                onChange={e => setNovaMensagem(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Mensagem como ${remetenteSelecionado === 'ia' ? 'IA' : 'Tatuador'}...`}
                rows={1}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed resize-none max-h-32 min-h-[42px]"
              />
            </div>

            <button
              type="button"
              onClick={handleEnviar}
              disabled={(!novaMensagem.trim() && !anexoNome) || enviando}
              className="p-2.5 rounded-xl bg-primary-fixed text-black hover:opacity-90 disabled:opacity-40 transition-all font-black shrink-0 mb-0.5 shadow-md shadow-primary-fixed/20 active:scale-95"
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
