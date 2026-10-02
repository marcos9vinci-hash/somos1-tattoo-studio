import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Phone, 
  UserCheck, 
  Clock, 
  Sparkles, 
  DollarSign, 
  UserX, 
  Calendar,
  Send,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { ClienteCRM, ClienteLifecycleStage } from '../../types/crm';
import { cn } from '../../lib/utils';

interface Somos1ClientesKanbanProps {
  clientes: ClienteCRM[];
  onStageChange?: (clienteId: string, novoEstagio: ClienteLifecycleStage) => void;
  onAbrirChat: (cliente: ClienteCRM) => void;
  onAbrirFicha: (cliente: ClienteCRM) => void;
  onDispararFollowUp?: (cliente: ClienteCRM) => void;
}

interface ColunaDef {
  id: ClienteLifecycleStage;
  titulo: string;
  subtitulo: string;
  corBorder: string;
  corBadge: string;
  corIcon: string;
  icon: React.ReactNode;
}

const COLUNAS_SOMOS_1: ColunaDef[] = [
  {
    id: 'novos',
    titulo: 'Novos',
    subtitulo: 'Cadastrados sem sessão',
    corBorder: 'border-blue-500/30',
    corBadge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    corIcon: 'text-blue-400',
    icon: <Users className="w-3.5 h-3.5" />
  },
  {
    id: 'negociacao',
    titulo: 'Negociação',
    subtitulo: 'Sessão agendada/orçamento',
    corBorder: 'border-amber-500/30',
    corBadge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    corIcon: 'text-amber-400',
    icon: <Sparkles className="w-3.5 h-3.5" />
  },
  {
    id: 'ativos',
    titulo: 'Ativos',
    subtitulo: 'Sessão recente (<30d)',
    corBorder: 'border-emerald-500/30',
    corBadge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    corIcon: 'text-emerald-400',
    icon: <UserCheck className="w-3.5 h-3.5" />
  },
  {
    id: 'recorrentes',
    titulo: 'Recorrentes',
    subtitulo: '2+ sessões concluídas',
    corBorder: 'border-purple-500/30',
    corBadge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    corIcon: 'text-purple-400',
    icon: <DollarSign className="w-3.5 h-3.5" />
  },
  {
    id: 'desmarcaram',
    titulo: 'Desmarcaram',
    subtitulo: 'Cancelamento / No-Show',
    corBorder: 'border-orange-500/30',
    corBadge: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    corIcon: 'text-orange-400',
    icon: <UserX className="w-3.5 h-3.5" />
  },
  {
    id: 'inativos',
    titulo: 'Inativos',
    subtitulo: 'Sem tattoo > 30 dias',
    corBorder: 'border-zinc-700',
    corBadge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    corIcon: 'text-zinc-400',
    icon: <Clock className="w-3.5 h-3.5" />
  }
];

export const Somos1ClientesKanban: React.FC<Somos1ClientesKanbanProps> = ({
  clientes,
  onAbrirChat,
  onAbrirFicha,
  onDispararFollowUp
}) => {
  const [busca, setBusca] = useState('');

  const filtrarClientesPorColuna = (colunaId: ClienteLifecycleStage) => {
    return clientes.filter(c => {
      // Normaliza possíveis variações singular/plural
      const cStage = c.estagioCiclo;
      const matchStage = 
        cStage === colunaId ||
        (colunaId === 'novos' && cStage === 'novo') ||
        (colunaId === 'ativos' && cStage === 'ativo') ||
        (colunaId === 'recorrentes' && cStage === 'recorrente') ||
        (colunaId === 'inativos' && cStage === 'inativo');

      if (!matchStage) return false;
      if (!busca.trim()) return true;

      const termo = busca.toLowerCase();
      return (
        c.nome.toLowerCase().includes(termo) ||
        (c.telefone && c.telefone.includes(termo))
      );
    });
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Barra de Busca / Filtro */}
      <div className="flex items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-white/5">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Filtrar por nome ou telefone..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-[11px] font-headline text-zinc-400">
          Total de Clientes no Funil: <strong className="text-white">{clientes.length}</strong>
        </div>
      </div>

      {/* Grid das 6 Colunas do Somos 1 com Rolagem Horizontal Suave */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
        {COLUNAS_SOMOS_1.map(coluna => {
          const clientesColuna = filtrarClientesPorColuna(coluna.id);

          return (
            <div
              key={coluna.id}
              className={cn(
                "flex flex-col bg-zinc-950/80 rounded-2xl border min-w-[240px] flex-1 max-h-[780px] shadow-sm",
                coluna.corBorder
              )}
            >
              {/* Header da Coluna */}
              <div className="p-3 border-b border-white/5 shrink-0 bg-zinc-900/40 rounded-t-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={coluna.corIcon}>{coluna.icon}</span>
                    <h3 className="font-headline font-black text-xs uppercase tracking-wider text-white truncate">
                      {coluna.titulo}
                    </h3>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black font-headline border shrink-0", coluna.corBadge)}>
                    {clientesColuna.length}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-headline mt-0.5 truncate">
                  {coluna.subtitulo}
                </p>
              </div>

              {/* Lista de Cards com Scroll Interno */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto min-h-[300px]">
                {clientesColuna.length === 0 ? (
                  <div className="py-12 text-center text-zinc-600 text-[11px] font-headline italic">
                    Nenhum cliente nesta etapa
                  </div>
                ) : (
                  clientesColuna.map(cliente => (
                    <div
                      key={cliente.id}
                      className="bg-zinc-900/90 border border-white/5 hover:border-white/20 p-3 rounded-xl transition-all shadow-xs hover:shadow-md space-y-2.5 group"
                    >
                      {/* Topo do Card: Iniciais + Nome */}
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                          onClick={() => onAbrirFicha(cliente)}
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-headline font-bold text-xs text-white truncate group-hover:text-primary-fixed transition-colors">
                              {cliente.nome}
                            </h4>
                            <p className="text-[10px] text-zinc-400 font-mono truncate">
                              {cliente.telefone || 'Sem WhatsApp'}
                            </p>
                          </div>
                        </div>

                        {/* Botão de abrir Ficha Completa */}
                        <button
                          type="button"
                          onClick={() => onAbrirFicha(cliente)}
                          className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/5 transition-all"
                          title="Abrir Ficha Completa"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Métricas Rápidas: Gasto e Sessões */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5 text-[10px] font-headline">
                        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                          <span className="text-zinc-500 block text-[9px]">Gasto Total</span>
                          <span className="text-white font-bold">R$ {cliente.totalGasto || 0}</span>
                        </div>
                        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                          <span className="text-zinc-500 block text-[9px]">Sessões</span>
                          <span className="text-amber-400 font-bold">{cliente.totalSessoes || 0} concl.</span>
                        </div>
                      </div>

                      {/* Dias Sem Contato (se aplicável) */}
                      {cliente.diasSemContato !== undefined && cliente.diasSemContato > 0 && (
                        <div className="text-[9px] text-zinc-500 font-headline flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-zinc-500" />
                          <span>Último atendimento há {cliente.diasSemContato} dias</span>
                        </div>
                      )}

                      {/* Ações Rápidas do Card */}
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                        {/* Botão Chat Direto no Navegador */}
                        <button
                          type="button"
                          onClick={() => onAbrirChat(cliente)}
                          className="flex-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg py-1.5 text-[10px] font-headline font-bold flex items-center justify-center gap-1 transition-all"
                          title="Abrir Chat no Navegador"
                        >
                          <MessageSquare className="w-3 h-3 text-purple-400" />
                          Chat
                        </button>

                        {/* Botão Chamar no WhatsApp Web / App */}
                        {cliente.telefone && (
                          <button
                            type="button"
                            onClick={() => {
                              const limpo = cliente.telefone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${limpo}`, '_blank');
                            }}
                            className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-all"
                            title="Conversar via WhatsApp"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        )}

                        {/* Botão Ver Ficha */}
                        <button
                          type="button"
                          onClick={() => onAbrirFicha(cliente)}
                          className="p-1.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/5 transition-all"
                          title="Ver Ficha Detalhada"
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
    </div>
  );
};
