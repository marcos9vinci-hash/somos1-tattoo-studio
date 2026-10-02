import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Bot, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { ClienteCRM } from '../../types/crm';
import { cn } from '../../lib/utils';

interface Somos1FollowUpAlertsProps {
  clientes: ClienteCRM[];
  onDispararWhatsApp: (cliente: ClienteCRM, msgCustom?: string) => void;
  onAbrirChat: (cliente: ClienteCRM) => void;
}

export const Somos1FollowUpAlerts: React.FC<Somos1FollowUpAlertsProps> = ({
  clientes,
  onDispararWhatsApp,
  onAbrirChat
}) => {
  // Clientes com alerta de follow-up ativo ou inativos
  const [removidos, setRemovidos] = useState<Set<string>>(new Set());

  const clientesEmAlerta = clientes.filter(c => {
    if (removidos.has(c.id)) return false;
    // Pós-venda ativo ou mais de 7 dias sem contato com tattoo concluída
    return (
      c.alertaFollowUpAtivo || 
      (c.diasSemContato !== undefined && c.diasSemContato >= 7 && c.totalSessoes > 0)
    );
  });

  const montarMensagemCicatrização = (cliente: ClienteCRM) => {
    return `Oi ${cliente.nome}! 😊\n\nPassando aqui pelo Somos 1 Studio para saber como está sua tattoo e se a cicatrização está 100% perfeita!\n\nSe precisar de qualquer dica de cuidados ou quiser dar uma olhada em novas ideias, só me chamar aqui! 🎨`;
  };

  const handleEnviarManual = (cliente: ClienteCRM) => {
    const msg = montarMensagemCicatrização(cliente);
    onDispararWhatsApp(cliente, msg);
  };

  const handleRemover = (id: string) => {
    setRemovidos(prev => new Set([...prev, id]));
  };

  if (clientesEmAlerta.length === 0) {
    return (
      <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-8 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <h4 className="font-headline font-black text-sm text-white uppercase tracking-wider">
          Todos os Follow-ups em Dia!
        </h4>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Nenhum cliente com pós-venda ou cicatrização pendente no momento. As réguas de WhatsApp estão cuidando de tudo automaticamente!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border border-amber-500/20 rounded-2xl p-5 space-y-4">
      {/* Header do Widget */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-headline font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
              Alertas de Follow-up & Cicatrização
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                {clientesEmAlerta.length} pendentes
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Clientes que concluíram tattoo recentemente e estão no período ideal de acompanhamento ou reativação.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Alerta */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {clientesEmAlerta.map(cliente => (
          <div
            key={cliente.id}
            className="bg-zinc-900/90 border border-white/5 p-4 rounded-xl space-y-3 relative group hover:border-amber-500/40 transition-all"
          >
            <button
              onClick={() => handleRemover(cliente.id)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-white p-1 rounded-md"
              title="Dispensar alerta"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                {cliente.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 pr-6">
                <h4 className="font-headline font-black text-xs text-white truncate">
                  {cliente.nome}
                </h4>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {cliente.telefone || 'Sem telefone'}
                </p>
              </div>
            </div>

            <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-[10px] font-headline text-zinc-400 flex items-center justify-between">
              <span>Dias desde o atendimento:</span>
              <span className="text-amber-400 font-bold">{cliente.diasSemContato || 7} dias</span>
            </div>

            {/* Ações do Alerta */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onAbrirChat(cliente)}
                className="flex-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg py-2 text-[10px] font-headline font-bold flex items-center justify-center gap-1 transition-all"
                title="Abrir Chat no Navegador"
              >
                <MessageSquare className="w-3 h-3 text-purple-400" />
                Chat
              </button>

              <button
                type="button"
                onClick={() => handleEnviarManual(cliente)}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg py-2 text-[10px] font-headline font-black flex items-center justify-center gap-1 transition-all shadow-md active:scale-95"
                title="Disparar mensagem no WhatsApp"
              >
                <Send className="w-3 h-3" />
                Follow-up Zap
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
