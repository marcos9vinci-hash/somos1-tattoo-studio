import React, { useState, useMemo } from 'react';
import {
  Flame,
  Sun,
  Snowflake,
  AlertTriangle,
  Timer,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  MessageSquare,
  Rocket,
  ThumbsUp
} from 'lucide-react';
import { ClienteCRM, ClienteCarteiraTempStage } from '../../types/crm';
import { cn } from '../../lib/utils';

interface TemperaturaWidgetProps {
  clientes: ClienteCRM[];
  onDispararWhatsApp: (cliente: ClienteCRM, msgCustom?: string) => void;
  onAbrirChat: (cliente: ClienteCRM) => void;
}

// ─── Configuração visual por bucket ───────────────────────────────────────────

interface BucketConfig {
  id: ClienteCarteiraTempStage;
  label: string;
  emoji: string;
  Icon: any;
  faixa: string;
  acao: string;
  cor: {
    badge: string;
    border: string;
    header: string;
    btn: string;
    pulse: boolean;
  };
}

const BUCKETS: BucketConfig[] = [
  {
    id: 'quente',
    label: 'Quente',
    emoji: '🔥',
    Icon: Flame,
    faixa: '0–7 dias',
    acao: 'Cicatrização',
    cor: {
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      border: 'border-rose-500/30',
      header: 'bg-rose-500/10',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
      pulse: false
    }
  },
  {
    id: 'morno',
    label: 'Morno',
    emoji: '☀️',
    Icon: Sun,
    faixa: '8–30 dias',
    acao: 'Review & IndicaAi',
    cor: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      border: 'border-amber-500/30',
      header: 'bg-amber-500/10',
      btn: 'bg-amber-500 hover:bg-amber-600 text-black',
      pulse: false
    }
  },
  {
    id: 'esfriando',
    label: 'Esfriando',
    emoji: '❄️',
    Icon: Snowflake,
    faixa: '31–90 dias',
    acao: 'Reengajamento',
    cor: {
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      border: 'border-blue-500/30',
      header: 'bg-blue-500/10',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
      pulse: false
    }
  },
  {
    id: 'alerta',
    label: 'Alerta Crédito',
    emoji: '🧊',
    Icon: AlertTriangle,
    faixa: '91–179 dias',
    acao: '⚡ IndicaAi vence!',
    cor: {
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
      border: 'border-violet-500/40',
      header: 'bg-violet-500/10',
      btn: 'bg-violet-600 hover:bg-violet-700 text-white',
      pulse: true
    }
  },
  {
    id: 'expirado',
    label: 'Expirado',
    emoji: '⌛',
    Icon: Timer,
    faixa: '>180 dias',
    acao: 'Campanha especial',
    cor: {
      badge: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
      border: 'border-zinc-700/40',
      header: 'bg-zinc-800/30',
      btn: 'bg-zinc-700 hover:bg-zinc-600 text-white',
      pulse: false
    }
  },
  {
    id: 'desmarcou',
    label: 'No-Show / Faltou',
    emoji: '🔴',
    Icon: AlertTriangle,
    faixa: 'Faltou à sessão',
    acao: 'Resgate de Cliente',
    cor: {
      badge: 'bg-rose-600/20 text-rose-300 border-rose-600/40',
      border: 'border-rose-600/40',
      header: 'bg-rose-950/20',
      btn: 'bg-rose-600 hover:bg-rose-500 text-white',
      pulse: true
    }
  }
];

// ─── Componente principal ──────────────────────────────────────────────────────

export const TemperaturaWidget: React.FC<TemperaturaWidgetProps> = ({
  clientes,
  onDispararWhatsApp,
  onAbrirChat
}) => {
  const [expandido, setExpandido] = useState<ClienteCarteiraTempStage | null>(null);
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());

  // Distribui clientes por bucket, excluindo quem tem sessão agendada (não concluída ainda)
  const porBucket = useMemo(() => {
    const mapa: Record<ClienteCarteiraTempStage, ClienteCRM[]> = {
      quente: [],
      morno: [],
      esfriando: [],
      alerta: [],
      expirado: [],
      emReativacao: [],
      desmarcou: []
    };
    clientes
      .filter(c => c.totalSessoes > 0 && !dispensados.has(c.id))
      .forEach(c => {
        mapa[c.bucketTemperatura].push(c);
      });
    return mapa;
  }, [clientes, dispensados]);

  const totalAlertas = porBucket.alerta.length + porBucket.quente.length + (porBucket.desmarcou?.length || 0);

  const toggleBucket = (id: ClienteCarteiraTempStage) => {
    setExpandido(prev => (prev === id ? null : id));
  };

  const dispensar = (clienteId: string) => {
    setDispensados(prev => new Set([...prev, clienteId]));
  };

  const dispararEmMassa = (bucket: ClienteCarteiraTempStage) => {
    const lista = porBucket[bucket];
    lista.forEach(c => onDispararWhatsApp(c));
  };

  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
      {/* ── Cabeçalho compacto ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🌡️</span>
          <span className="font-headline font-black text-xs text-white uppercase tracking-wider">
            Temperatura da Carteira
          </span>
          {totalAlertas > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40 animate-pulse">
              {totalAlertas} urgent{totalAlertas > 1 ? 'es' : 'e'}
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-500 font-headline">
          Clique em uma faixa para expandir
        </span>
      </div>

      {/* ── Faixas de temperatura — 1 linha ── */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-white/5">
        {BUCKETS.map(bucket => {
          const count = porBucket[bucket.id].length;
          const isOpen = expandido === bucket.id;
          const Icon = bucket.Icon;

          return (
            <button
              key={bucket.id}
              onClick={() => toggleBucket(bucket.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border font-headline font-bold text-[11px] transition-all hover:scale-105 active:scale-95',
                bucket.cor.badge,
                isOpen && 'ring-2 ring-white/20 scale-105'
              )}
              title={`${bucket.label} — ${bucket.faixa}`}
            >
              <span className="text-sm leading-none">{bucket.emoji}</span>
              <span className="hidden sm:inline">{bucket.label}</span>
              <span
                className={cn(
                  'min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-black/30 text-[10px] font-black',
                  bucket.cor.pulse && count > 0 && 'animate-pulse text-violet-300'
                )}
              >
                {count}
              </span>
              {isOpen ? (
                <ChevronUp className="w-3 h-3 opacity-60" />
              ) : (
                <ChevronDown className="w-3 h-3 opacity-60" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Painel expandido do bucket selecionado ── */}
      {expandido && (() => {
        const bucket = BUCKETS.find(b => b.id === expandido)!;
        const lista = porBucket[expandido];

        return (
          <div className={cn('p-4 space-y-3', bucket.cor.header)}>
            {/* Header do painel expandido */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{bucket.emoji}</span>
                <div>
                  <h4 className="font-headline font-black text-sm text-white">
                    {bucket.label}
                    <span className="ml-2 text-[10px] font-normal opacity-60">{bucket.faixa}</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-headline">{bucket.acao}</p>
                </div>
              </div>

              {lista.length > 1 && (
                <button
                  onClick={() => dispararEmMassa(expandido)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-headline font-bold transition-all',
                    bucket.cor.btn
                  )}
                  title={`Disparar mensagem para todos os ${lista.length} clientes desta faixa`}
                >
                  <Rocket className="w-3 h-3" />
                  Disparar para {lista.length}
                </button>
              )}
            </div>

            {/* Cards dos clientes */}
            {lista.length === 0 ? (
              <div className="py-8 text-center">
                <ThumbsUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-headline">Nenhum cliente nesta faixa agora</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {lista.map(cliente => (
                  <div
                    key={cliente.id}
                    className={cn(
                      'bg-zinc-900/80 border rounded-xl p-3 space-y-2.5 relative transition-all hover:border-white/20',
                      bucket.cor.border
                    )}
                  >
                    {/* Dispensar */}
                    <button
                      onClick={() => dispensar(cliente.id)}
                      className="absolute top-2 right-2 text-zinc-600 hover:text-white p-0.5 rounded transition-colors"
                      title="Dispensar alerta"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Identidade */}
                    <div className="flex items-center gap-2 pr-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-300 border border-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {cliente.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-headline font-bold text-xs text-white truncate">
                          {cliente.nome}
                        </h5>
                        <p className="text-[9px] text-zinc-400 font-mono truncate">
                          {cliente.diasSemContato !== undefined
                            ? `${cliente.diasSemContato}d sem contato`
                            : cliente.telefone || 'Sem telefone'}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onAbrirChat(cliente)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-lg py-1.5 text-[10px] font-headline font-bold flex items-center justify-center gap-1 text-zinc-300 transition-all"
                      >
                        <MessageSquare className="w-3 h-3 text-purple-400" />
                        Chat
                      </button>
                      <button
                        onClick={() => onDispararWhatsApp(cliente)}
                        className={cn(
                          'flex-1 rounded-lg py-1.5 text-[10px] font-headline font-black flex items-center justify-center gap-1 transition-all active:scale-95',
                          bucket.cor.btn
                        )}
                      >
                        <Send className="w-3 h-3" />
                        Zap
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
