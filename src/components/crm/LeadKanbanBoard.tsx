import React from 'react';
import { Lead, LeadStage } from '../../types/crm';
import { 
  UserPlus, 
  MessageCircle, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Flame, 
  MoreVertical,
  Plus
} from 'lucide-react';

interface LeadKanbanBoardProps {
  leads: Lead[];
  onStageChange: (leadId: string, novoEstagio: LeadStage) => void;
  onSelectLead: (lead: Lead) => void;
  onNewLeadClick: () => void;
}

const STAGES: { id: LeadStage; title: string; color: string; badge: string; icon: any }[] = [
  { id: 'novo', title: 'Novo Lead', color: 'border-blue-500/40 bg-blue-500/5', badge: 'bg-blue-500/20 text-blue-300', icon: UserPlus },
  { id: 'qualificacao', title: 'Em Qualificação (SPIN)', color: 'border-amber-500/40 bg-amber-500/5', badge: 'bg-amber-500/20 text-amber-300', icon: Sparkles },
  { id: 'pronto', title: 'Pronto p/ Agendar', color: 'border-purple-500/40 bg-purple-500/5', badge: 'bg-purple-500/20 text-purple-300', icon: Clock },
  { id: 'agendado', title: 'Sessão Agendada', color: 'border-emerald-500/40 bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-300', icon: Calendar },
  { id: 'concluido', title: 'Tattoo Concluída', color: 'border-zinc-500/40 bg-zinc-500/5', badge: 'bg-zinc-500/20 text-zinc-300', icon: CheckCircle2 }
];

export const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({
  leads,
  onStageChange,
  onSelectLead,
  onNewLeadClick
}) => {
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Funil Comercial de Leads
          </h2>
          <p className="text-xs text-zinc-400">
            Arraste os cards entre as etapas ou clique para abrir a conversa, análise SPIN e detalhes.
          </p>
        </div>
        <button
          onClick={onNewLeadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.estagio === stage.id);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex flex-col rounded-xl border border-dashed ${stage.color} p-3 min-w-[260px] min-h-[500px] transition-colors`}
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-zinc-300" />
                  <span className="font-semibold text-sm text-zinc-200">{stage.title}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stage.badge}`}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Lista de Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
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
                      onClick={() => onSelectLead(lead)}
                      className="bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all shadow-md group relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{lead.nome}</h4>
                          <span className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MessageCircle className="w-3 h-3 text-emerald-400" />
                            {lead.telefone}
                          </span>
                        </div>
                        {lead.temperatura && (
                          <span
                            className={`flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold ${
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
                        <p className="text-xs text-zinc-300 mt-2 line-clamp-2 italic bg-zinc-950/40 p-1.5 rounded">
                          "{lead.ideiaProjeto}"
                        </p>
                      )}

                      {/* Metadados / SPIN */}
                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 gap-1">
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] uppercase">
                          {lead.origem}
                        </span>
                        {lead.spin?.ticketEstimado ? (
                          <span className="text-amber-400 font-medium">
                            R$ {lead.spin.ticketEstimado}
                          </span>
                        ) : lead.estiloTatuagem ? (
                          <span className="truncate max-w-[90px]">{lead.estiloTatuagem}</span>
                        ) : null}
                      </div>

                      {/* Agente IA Badge */}
                      {lead.responsavelAtendimento && (
                        <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Resp: {lead.responsavelAtendimento}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
