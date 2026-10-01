import React, { useState } from 'react';
import { ClienteCRM } from '../../types/crm';
import { AlertCircle, Send, CheckCircle2, RefreshCw, MessageSquare } from 'lucide-react';

interface FollowUpAlertsWidgetProps {
  inativos: ClienteCRM[];
  onDispararIndividual: (cliente: ClienteCRM) => Promise<void>;
  onDispararTodos: (clientes: ClienteCRM[]) => Promise<void>;
  onRefresh: () => void;
}

export const FollowUpAlertsWidget: React.FC<FollowUpAlertsWidgetProps> = ({
  inativos,
  onDispararIndividual,
  onDispararTodos,
  onRefresh
}) => {
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleDispararTodos = async () => {
    if (inativos.length === 0) return;
    setLoadingBatch(true);
    try {
      await onDispararTodos(inativos);
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleDispararUm = async (cliente: ClienteCRM) => {
    setProcessingId(cliente.id);
    try {
      await onDispararIndividual(cliente);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-xl p-4 shadow-lg mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Alerta de Follow-up (30+ Dias sem Retorno)</h3>
              <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full text-xs">
                {inativos.length} clientes elegíveis
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Clientes que já tatuaram no Somos 1 há mais de 30 dias e não possuem novo agendamento. 
              Dispare mensagens de reativação pelo WhatsApp homologado com 1 clique (IA ou Manual).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={onRefresh}
            title="Atualizar lista"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDispararTodos}
            disabled={inativos.length === 0 || loadingBatch}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all ${
              inativos.length === 0 || loadingBatch
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
            }`}
          >
            {loadingBatch ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Disparando Mensagens...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Disparar p/ Todos ({inativos.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista Rápida dos Próximos a serem reativados */}
      {inativos.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {inativos.slice(0, 4).map((cliente) => (
              <div
                key={cliente.id}
                className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between text-xs"
              >
                <div className="truncate mr-2">
                  <span className="font-semibold text-white block truncate">{cliente.nome}</span>
                  <span className="text-zinc-400 text-[11px] block">{cliente.telefone}</span>
                </div>
                <button
                  onClick={() => handleDispararUm(cliente)}
                  disabled={processingId === cliente.id}
                  className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium rounded text-[11px] flex items-center gap-1 transition-colors flex-shrink-0"
                >
                  {processingId === cliente.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <MessageSquare className="w-3 h-3" />
                  )}
                  Enviar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
