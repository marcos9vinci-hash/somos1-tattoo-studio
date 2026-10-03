import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Bot, 
  User, 
  X, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ChevronRight,
  Flame,
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { CRMMessage, LeadStage } from '../../types/crm';
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
    estagio?: LeadStage;
    ideiaProjeto?: string;
    temperatura?: string;
  } | null;
  onStageChange?: (id: string, novoEstagio: LeadStage) => void;
}

const ESTAGIOS_CONFIG: { id: LeadStage; label: string; cor: string; emoji: string }[] = [
  { id: 'novo', label: 'Novo Lead', cor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', emoji: '✨' },
  { id: 'qualificacao', label: 'Qualificação', cor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', emoji: '🎯' },
  { id: 'negociacao', label: 'Negociação / Orçamento', cor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', emoji: '💰' },
  { id: 'agendado', label: 'Sessão Agendada', cor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', emoji: '🗓️' },
  { id: 'concluido', label: 'Tattoo Concluída', cor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40', emoji: '🏆' },
  { id: 'followup', label: 'Follow-up / Resgate', cor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', emoji: '🚨' }
];

const AGENTES_POR_ESTAGIO: Record<LeadStage, { nome: string; papel: string; cor: string; emoji: string }> = {
  novo: { nome: 'Agente Boas-Vindas', papel: 'Acolhimento & Sondagem Inicial', cor: 'text-blue-400 bg-blue-500/10 border-blue-500/30', emoji: '✨' },
  qualificacao: { nome: 'Agente Ideia & Estilo', papel: 'Referências Visuais & Região do Corpo', cor: 'text-amber-400 bg-amber-500/10 border-amber-500/30', emoji: '🎯' },
  negociacao: { nome: 'Agente Fechamento & Sinal', papel: 'Estimativa de Valor & Trava de Agenda', cor: 'text-purple-400 bg-purple-500/10 border-purple-500/30', emoji: '💰' },
  agendado: { nome: 'Agente Pré-Sessão', papel: 'Endereço (Rua Francesco de Martini 29) & Preparo', cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', emoji: '🗓️' },
  concluido: { nome: 'Agente Cicatrização (15 dias)', papel: 'Cuidados Pós-Tattoo, Pomada & Fotos', cor: 'text-teal-400 bg-teal-500/10 border-teal-500/30', emoji: '🏆' },
  pos_venda: { nome: 'Agente Cicatrização (15 dias)', papel: 'Cuidados Pós-Tattoo, Pomada & Fotos', cor: 'text-teal-400 bg-teal-500/10 border-teal-500/30', emoji: '🏆' },
  pronto: { nome: 'Agente Agendamento Imediato', papel: 'Escolha de Horário Disponível', cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', emoji: '⚡' },
  perdido: { nome: 'Agente Arquivo Morto', papel: 'Cliente Desistente', cor: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30', emoji: '⛔' },
  followup: { nome: 'Agente Resgate', papel: 'Reativação com Condição Especial', cor: 'text-rose-400 bg-rose-500/10 border-rose-500/30', emoji: '🚨' }
};

export const ChatInterfaceModal: React.FC<ChatInterfaceModalProps> = ({ 
  isOpen, 
  onClose, 
  cliente,
  onStageChange 
}) => {
  const [mensagens, setMensagens] = useState<CRMMessage[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [remetenteSelecionado, setRemetenteSelecionado] = useState<'ia' | 'tatuador'>('tatuador');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSugestoesIA, setShowSugestoesIA] = useState(false);
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null);
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [estagioAtual, setEstagioAtual] = useState<LeadStage>(cliente?.estagio || 'novo');
  const [pilotoIAAtivo, setPilotoIAAtivo] = useState<boolean>(false);
  const [avisoTransferencia, setAvisoTransferencia] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cliente?.estagio) {
      setEstagioAtual(cliente.estagio);
    }
  }, [cliente?.estagio]);

  // Carrega histórico de mensagens do cliente e mantém sincronizado
  useEffect(() => {
    if (!cliente?.id || !isOpen) return;

    let isMounted = true;
    const fetchMensagens = (mostrarLoading = false) => {
      if (mostrarLoading) setCarregando(true);
      crmService.getMensagensChat(cliente.id, cliente.telefone)
        .then(hist => {
          if (!isMounted) return;
          if (hist && hist.length > 0) {
            setMensagens(hist);
          } else {
            // Histórico inicial com contexto do cliente
            const primeiroNome = cliente.nome.split(' ')[0] || cliente.nome;
            setMensagens([
              {
                id: 'welcome-1',
                clienteId: cliente.id,
                remetente: 'ia',
                mensagem: `Olá ${primeiroNome}! Sou o assistente do Somos 1 Tattoo Studio. Vi seu interesse e estou à disposição para te ajudar a tirar a ideia do papel!`,
                timestamp: new Date(),
                status: 'lido'
              }
            ]);
          }
        })
        .finally(() => {
          if (isMounted && mostrarLoading) setCarregando(false);
        });
    };

    fetchMensagens(true);

    // Polling a cada 4 segundos para receber respostas do cliente via WhatsApp em tempo real
    const intervalId = setInterval(() => {
      fetchMensagens(false);
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [cliente?.id, cliente?.telefone, isOpen]);

  // Auto scroll para o final das mensagens
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [mensagens]);

  if (!isOpen || !cliente) return null;

  const primeiroNome = cliente.nome.split(' ')[0] || cliente.nome;

  // Sugestões inteligentes do Co-Piloto Meta Style adaptadas ao estágio
  const getSugestoesIA = () => {
    switch (estagioAtual) {
      case 'novo':
      case 'qualificacao':
        return [
          {
            titulo: 'Pedir referência & local do corpo',
            texto: `Fala ${primeiroNome}, beleza? Você já tem alguma imagem ou desenho de referência em mente? E em qual parte do corpo você tá pensando em mandar?`
          },
          {
            titulo: 'Sondar estilo desejado',
            texto: `Opa ${primeiroNome}! Curti a ideia. Você prefere uma linha mais fina e delicada (Fineline) ou algo mais sombreado/realista com presença?`
          },
          {
            titulo: 'Primeira tattoo (Acolhimento)',
            texto: `Fala ${primeiroNome}! Essa vai ser a sua primeira tatuagem ou já tem outros rabiscos? Se for a primeira, fica tranquilo(a) que te oriento em tudo!`
          }
        ];
      case 'negociacao':
        return [
          {
            titulo: 'Passar estimativa & sinal',
            texto: `Consigo fazer essa arte exclusiva pra você! O investimento fica em torno de R$ 350 a R$ 600 dependendo do tamanho final, com um sinalzinho simples para travar a data na agenda. Vamos fechar?`
          },
          {
            titulo: 'Oferecer horários da semana',
            texto: `Tô com a agenda dessa semana aberta, ${primeiroNome}! Tenho vaga na quinta às 14h ou sexta às 16h. Qual desses horários fica melhor pra você?`
          },
          {
            titulo: 'Quebrar objeção de valor',
            texto: `Entendo perfeitamente, ${primeiroNome}! Se preferir, podemos ajustar o tamanho ou simplificar alguns detalhes para encaixar certinho no seu orçamento. O que acha?`
          }
        ];
      case 'agendado':
        return [
          {
            titulo: 'Instruções pré-sessão',
            texto: `Tudo confirmado pra sua sessão, ${primeiroNome}! Lembra de se hidratar bem, vir bem alimentado(a) e evitar álcool nas 24h antes. Nosso estúdio fica na Rua Francesco de Martini 29. Até lá! 🤘`
          },
          {
            titulo: 'Confirmar pontualidade',
            texto: `Opa ${primeiroNome}! Passando só para alinhar os detalhes da nossa sessão marcada. Tá tudo certo com o horário combinado? Te espero aqui no estúdio!`
          }
        ];
      case 'concluido':
        return [
          {
            titulo: 'Check-in de Cicatrização',
            texto: `Fala ${primeiroNome}! Passando pra saber como tá a cicatrização da sua tattoo. Já começou a descascar? Lembra de manter a pomada fininha e qualquer dúvida me chama!`
          },
          {
            titulo: 'Pedir foto para o feed',
            texto: `Opa ${primeiroNome}! Consegue mandar uma foto de como a arte assentou na pele na luz do dia? Quero postar o resultado no insta do estúdio!`
          }
        ];
      default:
        return [
          {
            titulo: 'Resgate amigável',
            texto: `Fala ${primeiroNome}, tudo bem por aí? Lembrei daquele projeto que a gente tava conversando. Conseguiu pensar no desenho ou quer dar continuidade essa semana?`
          },
          {
            titulo: 'Condição especial',
            texto: `Opa ${primeiroNome}! Tô organizando os horários do mês e separamos uma condição exclusiva pra quem já tava trocando ideia com a gente. Bora tirar aquela tattoo do papel?`
          }
        ];
    }
  };

  const handleMudarEstagio = async (novo: LeadStage) => {
    setEstagioAtual(novo);
    const agente = AGENTES_POR_ESTAGIO[novo] || AGENTES_POR_ESTAGIO.novo;
    setAvisoTransferencia(`Conversa transferida para: ${agente.emoji} ${agente.nome} (${agente.papel})`);
    setTimeout(() => setAvisoTransferencia(null), 5000);

    if (onStageChange) {
      onStageChange(cliente.id, novo);
    }
    try {
      await crmService.updateLeadStage(cliente.id, novo);
    } catch (err) {
      console.warn('Erro ao atualizar estágio:', err);
    }
  };

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
    setShowSugestoesIA(false);
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

  const handleAplicarSugestao = (texto: string) => {
    setNovaMensagem(texto);
    setShowSugestoesIA(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const emojisRapidos = [
    '😊', '🔥', '⚡', '✨', '👏', '🤝', '🎨', '🖤', '📍', '💬', '🚀', '🤘'
  ];

  const abrirNoWhatsAppWeb = () => {
    const limpo = cliente.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${limpo}`;
    window.open(url, '_blank');
  };

  const configEstagio = ESTAGIOS_CONFIG.find(e => e.id === estagioAtual) || ESTAGIOS_CONFIG[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Clique fora para fechar */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Lateral Estilo Meta Inbox */}
      <div className="w-full sm:w-[540px] h-full bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* ── Header Principal ── */}
        <div className="p-4 border-b border-white/10 bg-zinc-900/90 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-headline font-black text-base shrink-0 shadow-md">
                {cliente.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-headline font-black text-sm text-white truncate flex items-center gap-1.5">
                  {cliente.nome}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 font-mono">
                  <span>{cliente.telefone || 'Sem WhatsApp'}</span>
                  {cliente.telefone && (
                    <button 
                      onClick={abrirNoWhatsAppWeb}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold font-headline flex items-center gap-1 border border-emerald-500/40 transition-all active:scale-95"
                      title="Abrir no WhatsApp Web / Celular"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      WhatsApp Web
                    </button>
                  )}
                </div>
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
                  title="Responder como Tatuador / Dono"
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

          {/* ── Barra de Nível do Funil Interativa & Agente Responsável ── */}
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 font-headline uppercase tracking-wider font-bold">
                  Nível no Funil:
                </span>
                <select
                  value={estagioAtual}
                  onChange={e => handleMudarEstagio(e.target.value as LeadStage)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-headline font-bold border cursor-pointer focus:outline-none transition-all",
                    configEstagio.cor
                  )}
                >
                  {ESTAGIOS_CONFIG.map(st => (
                    <option key={st.id} value={st.id} className="bg-zinc-900 text-white">
                      {st.emoji} {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Toggle de Piloto Automático da IA */}
                <button
                  type="button"
                  onClick={() => setPilotoIAAtivo(!pilotoIAAtivo)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-headline font-black flex items-center gap-1.5 border transition-all active:scale-95 shadow-sm",
                    pilotoIAAtivo
                      ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20"
                      : "bg-zinc-800 text-zinc-400 border-white/10 hover:text-white"
                  )}
                  title={pilotoIAAtivo ? "Piloto IA ATIVO: O robô responde automaticamente mensagens deste cliente" : "Piloto IA DESLIGADO: Você responde manualmente"}
                >
                  <Bot className={cn("w-3.5 h-3.5", pilotoIAAtivo ? "text-emerald-400 animate-pulse" : "text-zinc-500")} />
                  <span>{pilotoIAAtivo ? 'Piloto IA: ON' : 'Piloto IA: OFF'}</span>
                </button>

                {/* Botão de Sugestão de IA (Meta Style) */}
                <button
                  type="button"
                  onClick={() => setShowSugestoesIA(!showSugestoesIA)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-headline font-black flex items-center gap-1 border transition-all active:scale-95 shadow-sm",
                    showSugestoesIA
                      ? "bg-purple-600 text-white border-purple-400 shadow-purple-600/30"
                      : "bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Sugestões</span>
                </button>
              </div>
            </div>

            {/* Badge do Agente Especialista Ativo */}
            {(() => {
              const agente = AGENTES_POR_ESTAGIO[estagioAtual] || AGENTES_POR_ESTAGIO.novo;
              return (
                <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-950/80 border border-white/5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{agente.emoji}</span>
                    <span className="font-headline font-bold text-zinc-200">{agente.nome}:</span>
                    <span className="text-zinc-400 truncate text-[10px]">{agente.papel}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-bold shrink-0",
                    pilotoIAAtivo ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"
                  )}>
                    {pilotoIAAtivo ? 'Auto-pilot' : 'Manual'}
                  </span>
                </div>
              );
            })()}

            {/* Aviso Animado de Transferência de Agente */}
            {avisoTransferencia && (
              <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-500/50 text-purple-200 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg shadow-purple-900/30">
                <Bot className="w-4 h-4 text-purple-400 shrink-0 animate-bounce" />
                <span className="font-headline font-semibold">{avisoTransferencia}</span>
              </div>
            )}
          </div>

          {/* Card Contextual da Ideia do Projeto */}
          {cliente.ideiaProjeto && (
            <div className="mt-2.5 bg-zinc-950 p-2.5 rounded-xl border border-white/5 text-xs text-zinc-300 flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">💡 Projeto:</span>
              <span className="truncate italic text-zinc-400">{cliente.ideiaProjeto}</span>
            </div>
          )}
        </div>

        {/* ── Painel de Sugestões de IA (Meta Inbox Style) ── */}
        {showSugestoesIA && (
          <div className="p-3 bg-purple-950/30 border-b border-purple-500/30 space-y-2 animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-headline font-bold text-purple-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Sugestões Rápidas de Fechamento (Fase: {configEstagio.label})
              </span>
              <span className="text-[10px] text-purple-400">Clique para aplicar</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {getSugestoesIA().map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAplicarSugestao(sug.texto)}
                  className="p-2.5 bg-zinc-900/90 hover:bg-purple-900/30 border border-purple-500/20 hover:border-purple-500/50 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-amber-300 font-headline">
                      {sug.titulo}
                    </span>
                    <span className="text-[10px] text-purple-400 group-hover:text-purple-300 font-bold flex items-center gap-0.5">
                      Usar resposta <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-sans">
                    "{sug.texto}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Área de Mensagens (WhatsApp Web Style) ── */}
        <div ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {carregando ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-headline animate-pulse">
              Carregando histórico do WhatsApp...
            </div>
          ) : mensagens.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-xs font-headline italic">
              Nenhuma mensagem registrada ainda. Digite abaixo ou use o Co-Piloto para iniciar!
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
              <Paperclip className="w-3.5 h-3.5 text-amber-400" />
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

        {/* ── Input Bar Estilo WhatsApp ── */}
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
                title="Anexar imagem de referência"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              <textarea
                value={novaMensagem}
                onChange={e => setNovaMensagem(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Responder ${cliente.nome.split(' ')[0]} como ${remetenteSelecionado === 'ia' ? 'IA' : 'Tatuador'}...`}
                rows={1}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 resize-none max-h-32 min-h-[42px]"
              />
            </div>

            <button
              type="button"
              onClick={handleEnviar}
              disabled={(!novaMensagem.trim() && !anexoNome) || enviando}
              className="p-2.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40 transition-all font-black shrink-0 mb-0.5 shadow-md shadow-amber-500/20 active:scale-95"
              title="Enviar mensagem via WhatsApp"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
