import React, { useState, useEffect, useRef } from 'react';
import { Lead, LeadStage, ColunaAIAgentConfig } from '../../types/crm';
import { crmService } from '../../lib/crmService';
import { 
  UserPlus, 
  MessageCircle, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Flame, 
  MoreVertical,
  Plus,
  BellRing,
  HeartHandshake,
  Send,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Bot,
  Sliders,
  Ban
} from 'lucide-react';
import { STAGE_AGENTS_NAIA } from '../../lib/naiaAgentsConfig';
import { ColunaAgentConfigModal } from './ColunaAgentConfigModal';

interface LeadKanbanBoardProps {
  leads: Lead[];
  onStageChange: (leadId: string, novoEstagio: LeadStage) => void;
  onSelectLead: (lead: Lead) => void;
  onNewLeadClick: () => void;
  onAbrirChat?: (lead: Lead) => void;
  onIgnorarContato?: (lead: Lead) => void;
  onAbrirAgenda?: (lead: Lead) => void;
}

const STAGES: { id: LeadStage; title: string; color: string; badge: string; icon: any }[] = [
  { id: 'novo',        title: 'Novo Contato',          color: 'border-blue-500/40 bg-blue-500/5',     badge: 'bg-blue-500/20 text-blue-300',     icon: UserPlus },
  { id: 'qualificacao',title: 'Qualificação (SPIN)',    color: 'border-amber-500/40 bg-amber-500/5',   badge: 'bg-amber-500/20 text-amber-300',   icon: Sparkles },
  { id: 'negociacao',  title: '💬 Negociação',          color: 'border-purple-500/40 bg-purple-500/5', badge: 'bg-purple-500/20 text-purple-300', icon: MessageCircle },
  { id: 'agendado',    title: '📅 Sessão Agendada',     color: 'border-sky-500/40 bg-sky-500/5',       badge: 'bg-sky-500/20 text-sky-300',       icon: Calendar },
  { id: 'concluido',   title: '✅ Trabalho Realizado',  color: 'border-emerald-500/40 bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-300', icon: CheckCircle2 },
  { id: 'pos_venda',   title: '✨ Pós-Venda (Cuidado)', color: 'border-pink-500/40 bg-pink-500/5',     badge: 'bg-pink-500/20 text-pink-300',     icon: HeartHandshake },
  { id: 'followup',    title: '🔕 Follow-up (Resgate)', color: 'border-orange-500/40 bg-orange-500/5', badge: 'bg-orange-500/20 text-orange-300', icon: BellRing }
];

export const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({
  leads,
  onStageChange,
  onSelectLead,
  onNewLeadClick,
  onAbrirChat,
  onIgnorarContato,
  onAbrirAgenda
}) => {
  const [agentsConfig, setAgentsConfig] = useState<Record<LeadStage, ColunaAIAgentConfig>>(STAGE_AGENTS_NAIA);
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<ColunaAIAgentConfig | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('[draggable="true"]')) {
      return;
    }
    setIsMouseDown(true);
    if (boardRef.current) {
      setStartX(e.pageX - boardRef.current.offsetLeft);
      setScrollLeftState(boardRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !boardRef.current) return;
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    boardRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scrollBoard = (direction: 'left' | 'right') => {
    if (boardRef.current) {
      const amount = direction === 'left' ? -350 : 350;
      boardRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    crmService.getStageAgents().then(loaded => {
      if (loaded) setAgentsConfig(loaded);
    }).catch(err => console.warn('Erro ao carregar agentes do Firestore:', err));
  }, []);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onStageChange(leadId, targetStage);
    }
  };

  const handleSaveAgentConfig = async (novaConfig: ColunaAIAgentConfig) => {
    setAgentsConfig(prev => ({
      ...prev,
      [novaConfig.stageId]: novaConfig
    }));
    try {
      await crmService.saveStageAgent(novaConfig);
    } catch (err) {
      console.error('Erro ao persistir agente no Firestore:', err);
    }
  };

  const getModoBadge = (agent: ColunaAIAgentConfig) => {
    if (!agent.ativo) return { label: 'Pausado', icon: '⏸️', color: 'text-zinc-500 border-zinc-700/50 bg-zinc-800/40' };
    switch (agent.modoAtuacao) {
      case 'copiloto':
        return { label: 'Co-Piloto', icon: '🛡️', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
      case 'apenas_sugerir':
        return { label: 'Sugestão', icon: '💡', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' };
      case 'autonomo':
        return { label: 'Auto', icon: '⚡', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
      default:
        return { label: 'Co-Piloto', icon: '🛡️', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Funil Comercial de Leads
          </h2>
          <p className="text-xs text-zinc-400">
            Arraste os cards entre as etapas, role livremente com o mouse ou use os botões para navegar entre as colunas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Botões de Rolagem Rápida Superior */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => scrollBoard('left')}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all active:scale-90"
              title="Rolar Colunas para Esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-zinc-500 font-headline font-bold px-1.5 uppercase">
              Colunas
            </span>
            <button
              type="button"
              onClick={() => scrollBoard('right')}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all active:scale-90"
              title="Rolar Colunas para Direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onNewLeadClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Grid horizontal do Kanban com mouse drag-to-scroll */}
      <div
        ref={boardRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "flex gap-4 overflow-x-auto pb-4 pt-1 snap-x select-none",
          isMouseDown ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.estagio === stage.id);
          const Icon = stage.icon;
          const agent = agentsConfig[stage.id];
          const modo = agent ? getModoBadge(agent) : null;

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex flex-col rounded-xl border border-dashed ${stage.color} p-3 min-w-[285px] max-w-[285px] min-h-[520px] transition-colors shrink-0`}
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-zinc-300 shrink-0" />
                  <span className="font-semibold text-xs text-zinc-200 truncate">{stage.title}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${stage.badge}`}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Botão de Agente de IA da Coluna (Skills NAIA) */}
              {agent && (
                <button
                  type="button"
                  onClick={() => setSelectedAgentForModal(agent)}
                  className="mb-3 w-full px-2.5 py-1.5 bg-black/40 hover:bg-purple-950/40 border border-purple-500/20 hover:border-purple-500/40 rounded-lg flex items-center justify-between transition-all group"
                  title="Configurar Skills e Modo de Operação deste Agente"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Bot className={`w-3.5 h-3.5 ${agent.ativo ? 'text-amber-400' : 'text-zinc-600'} shrink-0`} />
                    <span className="text-[10px] font-bold text-zinc-300 group-hover:text-amber-300 truncate">
                      {agent.nomeAgente.split('(')[0].trim()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {modo && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold flex items-center gap-0.5 ${modo.color}`}>
                        <span>{modo.icon}</span>
                        <span>{modo.label}</span>
                      </span>
                    )}
                    <Sliders className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                  </div>
                </button>
              )}

              {/* Lista de Cards */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[700px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className="h-28 flex items-center justify-center border border-dashed border-zinc-800/80 rounded-lg text-zinc-500 text-xs">
                    Nenhum lead aqui
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all shadow-md group relative space-y-2"
                    >
                      {/* Topo do card: Nome + Temperatura */}
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => onSelectLead(lead)}
                        >
                          <h4 className="font-bold text-xs text-white truncate group-hover:text-amber-400 transition-colors">
                            {lead.nome}
                          </h4>
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono truncate">
                            <MessageCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            {lead.telefone || 'Sem WhatsApp'}
                          </span>
                        </div>
                        {lead.temperatura && (
                          <span
                            className={`flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              lead.temperatura === 'quente'
                                ? 'bg-rose-500/20 text-rose-300'
                                : lead.temperatura === 'morno'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            <Flame className="w-2.5 h-2.5 mr-0.5" />
                            {lead.temperatura.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Ideia do Projeto */}
                      {lead.ideiaProjeto && (
                        <p className="text-[11px] text-zinc-300 line-clamp-2 italic bg-zinc-950/40 p-1.5 rounded-lg border border-white/5">
                          "{lead.ideiaProjeto}"
                        </p>
                      )}

                      {/* Badge de Agendamento Clicável (Acesso Rápido ao Calendário & Editor) */}
                      {(lead.estagio === 'agendado' || lead.id.startsWith('booking_') || /às\s*\d{2}:\d{2}|\d{2}\/\d{2}/i.test(lead.ideiaProjeto || '')) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAbrirAgenda) {
                              onAbrirAgenda(lead);
                            } else {
                              window.dispatchEvent(new CustomEvent('somos1:navegar_agenda', {
                                detail: { leadId: lead.id, leadNome: lead.nome, date: (lead as any).dataAgendada || (lead as any).date }
                              }));
                            }
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/40 text-sky-200 text-[11px] font-headline font-bold transition-all group/agenda shadow-xs active:scale-98"
                          title="Clique para abrir na Agenda e editar/reagendar horário deste cliente"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0 group-hover/agenda:scale-110 transition-transform" />
                            <span className="truncate font-mono">
                              {lead.ideiaProjeto?.match(/\d{2}\/\d{2}.*?(?:às\s*\d{2}:\d{2})?/i)?.[0] || 
                               ((lead as any).date && (lead as any).time ? `${(lead as any).date.split('-').reverse().join('/')} às ${(lead as any).time}` : 'Ver no Calendário')}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold shrink-0 flex items-center gap-0.5">
                            <span>Editar</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </span>
                        </button>
                      )}

                      {/* Metadados / SPIN */}
                      <div className="pt-1 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-[10px] text-zinc-400 gap-1 font-headline">
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-zinc-300">
                          {lead.origem}
                        </span>
                        {lead.spin?.ticketEstimado ? (
                          <span className="text-amber-400 font-bold">
                            R$ {lead.spin.ticketEstimado}
                          </span>
                        ) : lead.estiloTatuagem ? (
                          <span className="truncate max-w-[90px]">{lead.estiloTatuagem}</span>
                        ) : null}
                      </div>

                      {/* Ações Rápidas (Replicadas da Carteira) */}
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                        {/* Botão Chat no Navegador */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAbrirChat) onAbrirChat(lead);
                          }}
                          className="flex-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg py-1 text-[10px] font-headline font-bold flex items-center justify-center gap-1 transition-all"
                          title="Chat no Navegador com o Lead"
                        >
                          <MessageSquare className="w-3 h-3 text-purple-400" />
                          Chat
                        </button>

                        {/* Botão WhatsApp Web Direto */}
                        {lead.telefone ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const limpo = lead.telefone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${limpo}`, '_blank');
                            }}
                            className="p-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-all"
                            title="Abrir WhatsApp Web"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead);
                            }}
                            className="p-1 bg-zinc-800 text-zinc-500 hover:text-amber-400 border border-zinc-700/60 rounded-lg transition-all"
                            title="Sem telefone: clique para cadastrar WhatsApp"
                          >
                            <Send className="w-3 h-3 opacity-40" />
                          </button>
                        )}

                        {/* Botão Ignorar Contato */}
                        {onIgnorarContato && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Ignorar ${lead.nome}? O contato será removido do CRM e bloqueado de futuras importações.`)) {
                                onIgnorarContato(lead);
                              }
                            }}
                            className="p-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-all"
                            title="Não é Lead / Ignorar Contato"
                          >
                            <Ban className="w-3 h-3" />
                          </button>
                        )}

                        {/* Botão Abrir Detalhes do Lead */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="p-1 bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/5 transition-all"
                          title="Ver Ficha do Lead"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Configuração do Agente da Coluna */}
      <ColunaAgentConfigModal
        isOpen={!!selectedAgentForModal}
        onClose={() => setSelectedAgentForModal(null)}
        config={selectedAgentForModal}
        onSave={handleSaveAgentConfig}
      />
    </div>
  );
};
