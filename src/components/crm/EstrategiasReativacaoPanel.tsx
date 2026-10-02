import React, { useState, useEffect } from 'react';
import { ClienteCRM, EstrategiaCampanha, ClienteCarteiraTempStage } from '../../types/crm';
import { crmService } from '../../lib/crmService';
import { DEFAULT_ESTRATEGIAS } from '../../lib/defaultEstrategias';
import { EstrategiaModal } from './EstrategiaModal';
import { 
  Flame, 
  Sun, 
  Snowflake, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  Sparkles, 
  Send, 
  Clock, 
  CheckCircle2, 
  Users, 
  Gift, 
  Calendar,
  MessageSquare,
  Play,
  Plus,
  Pencil,
  RefreshCw
} from 'lucide-react';
import { toast } from '../../lib/toast';

interface Props {
  clientes: ClienteCRM[];
  onOpenSimulador: () => void;
  onOpenChatCliente: (cliente: { id: string; nome: string; telefone: string }) => void;
}

export const EstrategiasReativacaoPanel: React.FC<Props> = ({
  clientes,
  onOpenSimulador,
  onOpenChatCliente
}) => {
  // Trava de Segurança Meta (Anti-Ban Guard)
  const [antiBanProtecaoAtiva, setAntiBanProtecaoAtiva] = useState(true);
  const [intervaloSegundos, setIntervaloSegundos] = useState(30);

  // Lista de estratégias carregadas do Firestore
  const [estrategias, setEstrategias] = useState<EstrategiaCampanha[]>(DEFAULT_ESTRATEGIAS);
  const [selectedEstrategiaId, setSelectedEstrategiaId] = useState<string>(DEFAULT_ESTRATEGIAS[0].id);
  const [loadingEstrategias, setLoadingEstrategias] = useState(false);

  // Modal de edição / criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estrategiaParaEditar, setEstrategiaParaEditar] = useState<EstrategiaCampanha | null>(null);

  const carregarEstrategias = async () => {
    setLoadingEstrategias(true);
    try {
      const data = await crmService.getEstrategias();
      if (data && data.length > 0) {
        setEstrategias(data);
        if (!data.some(e => e.id === selectedEstrategiaId)) {
          setSelectedEstrategiaId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Fallback para estratégias padrão:', err);
    } finally {
      setLoadingEstrategias(false);
    }
  };

  useEffect(() => {
    carregarEstrategias();
  }, []);

  const estrategiaAtiva = estrategias.find(e => e.id === selectedEstrategiaId) || estrategias[0] || DEFAULT_ESTRATEGIAS[0];

  // Filtro inteligente de clientes por estratégia
  const filtrarClientesPorEstrategia = (est: EstrategiaCampanha): ClienteCRM[] => {
    return clientes.filter(c => {
      if (est.criterioTipo === 'dias') {
        if (c.diasSemContato === undefined) return false;
        const min = est.diasMin ?? 0;
        const max = est.diasMax ?? 999;
        return c.diasSemContato >= min && c.diasSemContato <= max;
      }
      if (est.criterioTipo === 'temperatura') {
        if (!est.temperaturaAlvo || est.temperaturaAlvo.length === 0) return true;
        return est.temperaturaAlvo.includes(c.bucketTemperatura);
      }
      if (est.criterioTipo === 'desmarcou') {
        return Boolean(c.desmarcouEm) || (c.agendamentos && c.agendamentos.some(b => b.status === 'rescheduled' || b.status === 'no_show'));
      }
      if (est.criterioTipo === 'saldo_indicacao') {
        return c.totalSessoes > 0 && (c.bucketTemperatura === 'quente' || c.bucketTemperatura === 'morno' || c.bucketTemperatura === 'alerta');
      }
      return false;
    });
  };

  const listaAtual = filtrarClientesPorEstrategia(estrategiaAtiva);

  const handleSalvarEstrategia = async (salva: EstrategiaCampanha) => {
    await crmService.saveEstrategia(salva);
    toast.success('Estratégia salva com sucesso!');
    await carregarEstrategias();
    setSelectedEstrategiaId(salva.id);
  };

  const handleExcluirEstrategia = async (id: string) => {
    await crmService.deleteEstrategia(id);
    toast.info('Estratégia removida.');
    await carregarEstrategias();
  };

  const handleDispararCampanha = () => {
    if (!antiBanProtecaoAtiva) {
      const confirmacao = window.confirm(
        '⚠️ ATENÇÃO: A proteção Anti-Bloqueio Meta está DESLIGADA. Disparar mensagens sem intervalo cadenciado pode causar banimento do seu número de WhatsApp pela Meta. Deseja prosseguir sob sua responsabilidade?'
      );
      if (!confirmacao) return;
    }

    const limite = estrategiaAtiva.limiteDiario || 25;
    toast.info(`Iniciando "${estrategiaAtiva.titulo}" via Co-Piloto para ${Math.min(listaAtual.length, limite)} clientes em fila segura!`);
    onOpenSimulador();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ── BARRA SUPERIOR: CONTROLE ANTI-BLOQUEIO META ── */}
      <div className={`p-5 rounded-3xl border transition-all ${
        antiBanProtecaoAtiva 
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
          : 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-500/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              antiBanProtecaoAtiva 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-rose-500/20 text-rose-400 border-rose-500/50'
            }`}>
              {antiBanProtecaoAtiva ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-headline font-black uppercase tracking-wider text-white">
                  {antiBanProtecaoAtiva ? 'Proteção Anti-Bloqueio Meta: LIGADA ✅' : 'Proteção Meta DESATIVADA ⚠️'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  antiBanProtecaoAtiva 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {antiBanProtecaoAtiva ? 'Modo Seguro Ativo' : 'Alto Risco de Ban'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                {antiBanProtecaoAtiva ? (
                  <>Disparos cadenciados a cada <strong>{intervaloSegundos}s</strong> com delay randômico. Limite máximo de <strong>{estrategiaAtiva.limiteDiario || 25} mensagens/dia</strong> e aprovação obrigatória do Marquinhos via WhatsApp.</>
                ) : (
                  <><strong>CUIDADO:</strong> O algoritmo de spam da Meta analisa o volume por segundo. Disparos contínuos sem pausa podem derrubar sua conta de WhatsApp instantaneamente.</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => setAntiBanProtecaoAtiva(!antiBanProtecaoAtiva)}
              className={`px-4 py-2.5 rounded-xl font-headline font-black text-xs uppercase tracking-wider transition-all border shadow-sm ${
                antiBanProtecaoAtiva
                  ? 'bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400'
                  : 'bg-rose-600 text-white border-rose-500 hover:bg-rose-500'
              }`}
            >
              {antiBanProtecaoAtiva ? 'DESLIGAR TRAVA' : 'LIGAR PROTEÇÃO META'}
            </button>
          </div>
        </div>

        {/* Parâmetros da Trava */}
        {antiBanProtecaoAtiva && (
          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center gap-6 text-xs text-zinc-300 font-headline">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Intervalo de Segurança:</span>
              <strong className="text-emerald-400">{intervaloSegundos} a {intervaloSegundos + 15} segundos</strong>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Limite Diário Seguro:</span>
              <strong className="text-emerald-400">Até {estrategiaAtiva.limiteDiario || 25} envios/dia</strong>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Co-Piloto:</span>
              <strong className="text-amber-400">Só envia após seu aval no Zap</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── SELEÇÃO DE ESTRATÉGIAS & BOTÃO DE NOVA ESTRATÉGIA ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-headline font-black text-white uppercase tracking-wider">
              Estratégias de Reativação da Base ({estrategias.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Campanhas com filtros inteligentes por dias de inatividade ou coluna de temperatura.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEstrategiaParaEditar(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Nova Estratégia</span>
            </button>

            <button
              type="button"
              onClick={onOpenSimulador}
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-amber-400" />
              <span>Simulador Sandbox</span>
            </button>
          </div>
        </div>

        {/* Grade de Cards das Estratégias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {estrategias.map(est => {
            const count = filtrarClientesPorEstrategia(est).length;
            const isAtiva = est.id === selectedEstrategiaId;

            return (
              <button
                key={est.id}
                type="button"
                onClick={() => setSelectedEstrategiaId(est.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isAtiva
                    ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{est.emoji || '🎯'}</span>
                    <span className={`text-[10px] font-headline font-black px-2 py-0.5 rounded-full border ${
                      count > 0 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>
                      {count} clientes
                    </span>
                  </div>
                  <h4 className="text-xs font-headline font-black text-white uppercase tracking-wider mb-1 line-clamp-1">
                    {est.titulo}
                  </h4>
                  <p className="text-[11px] text-zinc-400 leading-tight line-clamp-2">
                    {est.descricao}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>
                    {est.criterioTipo === 'dias' ? `${est.diasMin ?? 0}–${est.diasMax ?? 999}d` : est.criterioTipo}
                  </span>
                  {isAtiva && <span className="text-amber-400 font-bold uppercase text-[9px]">Ativa</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DETALHES DA ESTRATÉGIA SELECIONADA & CLIENTES APTOS ── */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                Estratégia Selecionada:
              </span>
              <button
                type="button"
                onClick={() => {
                  setEstrategiaParaEditar(estrategiaAtiva);
                  setIsModalOpen(true);
                }}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                <span>Editar Regras desta Estratégia</span>
              </button>
            </div>
            <h3 className="text-sm font-headline font-black text-white uppercase tracking-wider mt-0.5">
              {estrategiaAtiva.emoji} {estrategiaAtiva.titulo}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Critério: <strong>{estrategiaAtiva.criterioTipo === 'dias' ? `Clientes entre ${estrategiaAtiva.diasMin} e ${estrategiaAtiva.diasMax} dias sem tatuar` : estrategiaAtiva.criterioTipo === 'temperatura' ? `Colunas ${estrategiaAtiva.temperaturaAlvo?.join(', ')}` : estrategiaAtiva.criterioTipo}</strong> • {listaAtual.length} cliente(s) qualificado(s).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDispararCampanha}
              disabled={listaAtual.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Disparar Campanha via Co-Piloto</span>
            </button>
          </div>
        </div>

        {/* Modelo da Mensagem que o Agente vai Propor */}
        <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
              Template da Mensagem com Personalização Dinâmica:
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              {estrategiaAtiva.especialistaAssinatura || '🤖 [Clone do Dono]'}
            </span>
          </div>
          <p className="text-xs text-zinc-200 italic font-sans leading-relaxed">
            "{estrategiaAtiva.mensagemTemplate}"
          </p>
        </div>

        {/* Lista dos Clientes Reais Identificados para Esta Campanha */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Clientes Aptos ({listaAtual.length}):
            </span>
            <span className="text-[10px] text-zinc-500">
              Limite diário seguro: até {estrategiaAtiva.limiteDiario || 25} envios
            </span>
          </div>

          {listaAtual.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-headline uppercase text-xs tracking-wider bg-zinc-900/40 rounded-2xl border border-white/5">
              Nenhum cliente atende aos critérios exatos desta estratégia no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {listaAtual.map(c => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-zinc-900/90 border border-white/5 hover:border-amber-500/30 flex items-center justify-between transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-white truncate">{c.nome}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{c.telefone || 'Sem WhatsApp'}</p>
                    {c.diasSemContato !== undefined && (
                      <span className="text-[9px] text-amber-400/90 font-mono">
                        Última sessão há {c.diasSemContato} dias • {c.bucketTemperatura}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenChatCliente({ id: c.id, nome: c.nome, telefone: c.telefone })}
                    className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-xs transition-all shrink-0"
                    title="Conversar com este cliente"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal de Criação / Edição de Estratégia */}
      <EstrategiaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        estrategia={estrategiaParaEditar}
        clientes={clientes}
        onSave={handleSalvarEstrategia}
        onDelete={estrategiaParaEditar ? handleExcluirEstrategia : undefined}
      />

    </div>
  );
};
