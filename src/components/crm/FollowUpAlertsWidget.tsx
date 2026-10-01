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
    <div className="bg-card text-card-foreground border border-amber-500/30 rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-500/15 border border-amber-500/25 rounded-xl text-amber-500 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-black text-sm uppercase tracking-wider text-foreground">Alerta de Follow-up (30+ Dias sem Retorno)</h3>
              <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full text-[11px]">
                {inativos.length} clientes elegíveis
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl font-headline">
              Clientes que já tatuaram no Somos 1 há mais de 30 dias e não possuem novo agendamento. 
              Dispare mensagens de reativação pelo WhatsApp com 1 clique (IA ou Manual).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={onRefresh}
            title="Atualizar lista"
            className="p-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors border border-border"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDispararTodos}
            disabled={inativos.length === 0 || loadingBatch}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline font-black text-xs uppercase tracking-wider shadow-xs transition-all ${
              inativos.length === 0 || loadingBatch
                ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
            }`}
          >
            {loadingBatch ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Disparando Mensagens...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Disparar p/ Todos ({inativos.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista Rápida dos Próximos a serem reativados */}
      {inativos.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {inativos.slice(0, 4).map((cliente) => (
              <div
                key={cliente.id}
                className="bg-muted/30 border border-border rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div className="truncate mr-2">
                  <span className="font-bold text-foreground block truncate">{cliente.nome}</span>
                  <span className="text-muted-foreground text-[11px] block">{cliente.telefone}</span>
                </div>
                <button
                  onClick={() => handleDispararUm(cliente)}
                  disabled={processingId === cliente.id}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors shrink-0"
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
