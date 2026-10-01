import React from 'react';
import { ClienteCRM, ClienteLifecycleStage } from '../../types/crm';
import { 
  Users, 
  Repeat, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle,
  Plus
} from 'lucide-react';

interface CustomerLifecycleBoardProps {
  clientes: ClienteCRM[];
  onStageChange: (clienteId: string, novoEstagio: ClienteLifecycleStage) => void;
  onSelectCliente: (cliente: ClienteCRM) => void;
  onDispararFollowUp: (cliente: ClienteCRM) => void;
  onNewClienteClick: () => void;
}

const STAGES: { id: ClienteLifecycleStage; title: string; color: string; badge: string; icon: any }[] = [
  { id: 'novo', title: '1ª Sessão Concluída', color: 'border-blue-500/40 bg-blue-500/5', badge: 'bg-blue-500/20 text-blue-300', icon: CheckCircle },
  { id: 'negociacao', title: 'Cicatrização / Feedback', color: 'border-amber-500/40 bg-amber-500/5', badge: 'bg-amber-500/20 text-amber-300', icon: Sparkles },
  { id: 'ativo', title: 'Cliente Ativo', color: 'border-emerald-500/40 bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-300', icon: Users },
  { id: 'recorrente', title: 'Fã / Recorrente (VIP)', color: 'border-purple-500/40 bg-purple-500/5', badge: 'bg-purple-500/20 text-purple-300', icon: Repeat },
  { id: 'inativo', title: 'Inativo (>30 dias)', color: 'border-rose-500/40 bg-rose-500/5', badge: 'bg-rose-500/20 text-rose-300', icon: AlertTriangle }
];

export const CustomerLifecycleBoard: React.FC<CustomerLifecycleBoardProps> = ({
  clientes,
  onStageChange,
  onSelectCliente,
  onDispararFollowUp,
  onNewClienteClick
}) => {
  const handleDragStart = (e: React.DragEvent, clienteId: string) => {
    e.dataTransfer.setData('text/plain', clienteId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: ClienteLifecycleStage) => {
    e.preventDefault();
    const clienteId = e.dataTransfer.getData('text/plain');
    if (clienteId) {
      onStageChange(clienteId, targetStage);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-400" />
            Ciclo de Vida & Fidelização de Clientes
          </h2>
          <p className="text-xs text-zinc-400">
            Acompanhe o pós-venda, retenção e dispare mensagens de reativação para clientes sem sessões há mais de 30 dias.
          </p>
        </div>
        <button
          onClick={onNewClienteClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageClientes = clientes.filter((c) => c.estagioCiclo === stage.id);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex flex-col rounded-xl border border-dashed ${stage.color} p-3 min-w-[260px] min-h-[500px] transition-colors`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-zinc-300" />
                  <span className="font-semibold text-sm text-zinc-200">{stage.title}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stage.badge}`}>
                  {stageClientes.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
                {stageClientes.length === 0 ? (
                  <div className="h-28 flex items-center justify-center border border-dashed border-zinc-800/80 rounded-lg text-zinc-500 text-xs">
                    Nenhum cliente aqui
                  </div>
                ) : (
                  stageClientes.map((cliente) => (
                    <div
                      key={cliente.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cliente.id)}
                      onClick={() => onSelectCliente(cliente)}
                      className="bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all shadow-md group relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{cliente.nome}</h4>
                          <span className="text-xs text-zinc-400 mt-0.5 block truncate">
                            {cliente.telefone}
                          </span>
                        </div>
                        {cliente.totalSessoes > 1 && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                            {cliente.totalSessoes}x sessões
                          </span>
                        )}
                      </div>

                      {/* Métricas do Cliente */}
                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                        <span>Total Gasto:</span>
                        <span className="text-emerald-400 font-bold">
                          R$ {cliente.totalGasto || 0}
                        </span>
                      </div>

                      {/* Ação Rápida de Follow-Up */}
                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {cliente.diasSemContato !== undefined ? `${cliente.diasSemContato}d sem contato` : 'Recente'}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDispararFollowUp(cliente);
                          }}
                          title="Disparar follow-up no WhatsApp agora"
                          className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2 py-1 rounded transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          Follow-up
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
    </div>
  );
};
