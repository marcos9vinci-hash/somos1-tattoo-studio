import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Sun,
  Snowflake,
  AlertTriangle,
  Timer,
  MessageSquare,
  Send,
  ChevronRight,
  MoreVertical,
  Clock,
  RefreshCw
} from 'lucide-react';
import { ClienteCRM, ClienteCarteiraTempStage } from '../../types/crm';
import { cn } from '../../lib/utils';

interface CarteiraClientesKanbanProps {
  clientes: ClienteCRM[];
  onAbrirChat: (cliente: ClienteCRM) => void;
  onAbrirFicha: (cliente: ClienteCRM) => void;
  onDispararFollowUp?: (cliente: ClienteCRM) => void;
  onReativarCliente?: (cliente: ClienteCRM) => void;
}

// ─── Configuração visual por temperatura ──────────────────────────────────────

interface ColunaDef {
  id: ClienteCarteiraTempStage;
  titulo: string;
  subtitulo: string;
  emoji: string;
  Icon: any;
  cor: {
    border: string;
    badge: string;
    icon: string;
    header: string;
    avatar: string;
  };
}

const COLUNAS_CARTEIRA: ColunaDef[] = [
  {
    id: 'quente',
    titulo: 'Quente',
    subtitulo: '0–7 dias pós-sessão',
    emoji: '🔥',
    Icon: Flame,
    cor: {
      border: 'border-rose-500/30',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: 'text-rose-400',
      header: 'bg-rose-500/5',
      avatar: 'from-rose-500/30 to-rose-700/30 text-rose-400 border-rose-500/40'
    }
  },
  {
    id: 'morno',
    titulo: 'Morno',
    subtitulo: '8–30 dias',
    emoji: '☀️',
    Icon: Sun,
    cor: {
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: 'text-amber-400',
      header: 'bg-amber-500/5',
      avatar: 'from-amber-500/30 to-amber-700/30 text-amber-400 border-amber-500/40'
    }
  },
  {
    id: 'esfriando',
    titulo: 'Esfriando',
    subtitulo: '31–90 dias',
    emoji: '❄️',
    Icon: Snowflake,
    cor: {
      border: 'border-blue-500/30',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: 'text-blue-400',
      header: 'bg-blue-500/5',
      avatar: 'from-blue-500/30 to-blue-700/30 text-blue-400 border-blue-500/40'
    }
  },
  {
    id: 'alerta',
    titulo: 'Alerta',
    subtitulo: '91–179 dias ⚡',
    emoji: '🧊',
    Icon: AlertTriangle,
    cor: {
      border: 'border-violet-500/40',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
      icon: 'text-violet-400',
      header: 'bg-violet-500/5',
      avatar: 'from-violet-500/30 to-violet-700/30 text-violet-400 border-violet-500/40'
    }
  },
  {
    id: 'expirado',
    titulo: 'Expirado',
    subtitulo: '>180 dias',
    emoji: '⌛',
    Icon: Timer,
    cor: {
      border: 'border-zinc-700',
      badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      icon: 'text-zinc-400',
      header: 'bg-zinc-900/20',
      avatar: 'from-zinc-700/30 to-zinc-800/30 text-zinc-400 border-zinc-700'
    }
  },
  {
    id: 'emReativacao',
    titulo: 'Em Reativação',
    subtitulo: 'Tentando fechar novamente',
    emoji: '🔄',
    Icon: RefreshCw,
    cor: {
      border: 'border-cyan-500/30',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: 'text-cyan-400',
      header: 'bg-cyan-500/5',
      avatar: 'from-cyan-500/30 to-cyan-700/30 text-cyan-400 border-cyan-500/40'
    }
  }
];

// ─── Componente principal ──────────────────────────────────────────────────────

export const CarteiraClientesKanban: React.FC<CarteiraClientesKanbanProps> = ({
  clientes,
  onAbrirChat,
  onAbrirFicha,
  onDispararFollowUp,
  onReativarCliente
}) => {
  const [busca, setBusca] = useState('');
  const [colunaAtivaMobile, setColunaAtivaMobile] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clientesFiltrados = clientes.filter(c => {
    if (!c.totalSessoes || c.totalSessoes === 0) return false; // só pós-tattoo
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(termo) ||
      (c.telefone && c.telefone.includes(termo))
    );
  });

  const porColuna = (colunaId: ClienteCarteiraTempStage) =>
    clientesFiltrados.filter(c => c.bucketTemperatura === colunaId);

  // ─── Scroll snap mobile: detecta qual coluna está visível ─────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const colW = el.scrollWidth / COLUNAS_CARTEIRA.length;
      const idx = Math.round(el.scrollLeft / colW);
      setColunaAtivaMobile(Math.max(0, Math.min(idx, COLUNAS_CARTEIRA.length - 1)));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const irParaColuna = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const colW = el.scrollWidth / COLUNAS_CARTEIRA.length;
    el.scrollTo({ left: colW * idx, behavior: 'smooth' });
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* ── Barra de busca ── */}
      <div className="flex items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-white/5">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Filtrar por nome ou telefone..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
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
          Carteira: <strong className="text-white">{clientesFiltrados.length}</strong> clientes
        </div>
      </div>

      {/* ── Kanban: flex-row com scroll horizontal (mobile snap + desktop scroll) ── */}
      <div
        ref={scrollRef}
        className={cn(
          'flex gap-3.5 overflow-x-auto pb-4',
          // Mobile: snap por coluna
          'snap-x snap-mandatory',
          // Scrollbar fina no desktop
          '[&::-webkit-scrollbar]:h-1.5',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:bg-zinc-700',
          '[&::-webkit-scrollbar-thumb]:rounded-full'
        )}
      >
        {COLUNAS_CARTEIRA.map((coluna, idx) => {
          const lista = porColuna(coluna.id);
          const Icon = coluna.Icon;

          return (
            <div
              key={coluna.id}
              className={cn(
                // Mobile: ocupa ~85vw, snap
                'snap-start shrink-0 w-[85vw] sm:w-auto',
                // Desktop: largura mínima confortável
                'sm:min-w-[290px] sm:flex-1 sm:max-w-[340px]',
                'flex flex-col bg-zinc-950/80 rounded-2xl border max-h-[780px] shadow-sm',
                coluna.cor.border
              )}
            >
              {/* Header da coluna */}
              <div className={cn('p-3 border-b border-white/5 shrink-0 rounded-t-2xl', coluna.cor.header)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('shrink-0', coluna.cor.icon)}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm leading-none mr-1">{coluna.emoji}</span>
                    <h3 className="font-headline font-black text-xs uppercase tracking-wider text-white truncate">
                      {coluna.titulo}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black font-headline border shrink-0',
                      coluna.cor.badge,
                      coluna.id === 'alerta' && lista.length > 0 && 'animate-pulse'
                    )}
                  >
                    {lista.length}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-headline mt-1 truncate">
                  {coluna.subtitulo}
                </p>
              </div>

              {/* Lista de cards com scroll interno */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto min-h-[300px]">
                {lista.length === 0 ? (
                  <div className="py-12 text-center text-zinc-600 text-[11px] font-headline italic">
                    Nenhum cliente aqui
                  </div>
                ) : (
                  lista.map(cliente => (
                    <div
                      key={cliente.id}
                      className="bg-zinc-900/90 border border-white/5 hover:border-white/20 p-3 rounded-xl transition-all shadow-xs hover:shadow-md space-y-2.5 group"
                    >
                      {/* Topo: avatar + nome */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                          onClick={() => onAbrirFicha(cliente)}
                        >
                          <div
                            className={cn(
                              'w-7 h-7 rounded-full bg-gradient-to-br border flex items-center justify-center text-xs font-bold shrink-0',
                              coluna.cor.avatar
                            )}
                          >
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-headline font-bold text-xs text-white truncate group-hover:text-amber-400 transition-colors">
                              {cliente.nome}
                            </h4>
                            <p className="text-[10px] text-zinc-400 font-mono truncate">
                              {cliente.telefone || 'Sem WhatsApp'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAbrirFicha(cliente)}
                          className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/5 transition-all"
                          title="Abrir Ficha"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Métricas */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5 text-[10px] font-headline">
                        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                          <span className="text-zinc-500 block text-[9px]">Gasto Total</span>
                          <span className="text-white font-bold">R$ {cliente.totalGasto || 0}</span>
                        </div>
                        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                          <span className="text-zinc-500 block text-[9px]">Sessões</span>
                          <span className="text-amber-400 font-bold">{cliente.totalSessoes} concl.</span>
                        </div>
                      </div>

                      {/* Badges de Status (Desmarcou ou Em Reativação) */}
                      {(cliente.desmarcouEm || cliente.bucketTemperatura === 'emReativacao') && (
                        <div className="flex flex-wrap gap-1">
                          {cliente.desmarcouEm && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              🔕 Desmarcou
                            </span>
                          )}
                          {cliente.bucketTemperatura === 'emReativacao' && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              🔄 Reativação no Funil
                            </span>
                          )}
                        </div>
                      )}

                      {/* Dias sem contato */}
                      {cliente.diasSemContato !== undefined && cliente.diasSemContato > 0 && (
                        <div className="text-[9px] text-zinc-500 font-headline flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Última sessão há {cliente.diasSemContato} dias
                          </span>
                          {/* Botão de reativação para clientes esfriando/alerta/expirado */}
                          {onReativarCliente &&
                            cliente.bucketTemperatura !== 'emReativacao' &&
                            (cliente.bucketTemperatura === 'esfriando' ||
                              cliente.bucketTemperatura === 'alerta' ||
                              cliente.bucketTemperatura === 'expirado') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReativarCliente(cliente);
                                }}
                                className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 px-1.5 py-0.5 rounded transition-all"
                                title="Enviar para o Funil Comercial para fechar novo trampo"
                              >
                                🔄 Tentar Fechar
                              </button>
                            )}
                        </div>
                      )}

                      {/* Ações rápidas */}
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => onAbrirChat(cliente)}
                          className="flex-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg py-1.5 text-[10px] font-headline font-bold flex items-center justify-center gap-1 transition-all"
                          title="Chat no Navegador"
                        >
                          <MessageSquare className="w-3 h-3 text-purple-400" />
                          Chat
                        </button>

                        {cliente.telefone && (
                          <button
                            type="button"
                            onClick={() => {
                              const limpo = cliente.telefone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${limpo}`, '_blank');
                            }}
                            className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-all"
                            title="WhatsApp Web"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onAbrirFicha(cliente)}
                          className="p-1.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/5 transition-all"
                          title="Ver Ficha"
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

      {/* ── Indicador de posição mobile (bolinhas) ── */}
      <div className="flex sm:hidden justify-center gap-1.5 pb-1">
        {COLUNAS_CARTEIRA.map((col, idx) => (
          <button
            key={col.id}
            onClick={() => irParaColuna(idx)}
            className={cn(
              'transition-all rounded-full',
              idx === colunaAtivaMobile
                ? 'w-4 h-2 bg-amber-500'
                : 'w-2 h-2 bg-zinc-700 hover:bg-zinc-500'
            )}
            title={col.titulo}
          />
        ))}
      </div>
    </div>
  );
};
