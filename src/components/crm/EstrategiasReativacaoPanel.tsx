import React, { useState } from 'react';
import { ClienteCRM } from '../../types/crm';
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
  Play
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
  const [limiteEnviosDia, setLimiteEnviosDia] = useState(25);
  const [intervaloSegundos, setIntervaloSegundos] = useState(30);

  // Campanha selecionada
  const [campanhaAtiva, setCampanhaAtiva] = useState<'retoque' | 'resgate' | 'indicacao' | 'flash'>('retoque');

  // Filtragem dos clientes reais existentes por estratégia
  const clientesRetoque = clientes.filter(c => {
    return c.diasSemContato !== undefined && c.diasSemContato >= 30 && c.diasSemContato <= 75;
  });

  const clientesResgate = clientes.filter(c => {
    return Boolean(c.desmarcouEm) || (c.agendamentos && c.agendamentos.some(b => b.status === 'rescheduled' || b.status === 'no_show'));
  });

  const clientesIndicacao = clientes.filter(c => {
    return c.totalSessoes > 0 && (c.bucketTemperatura === 'quente' || c.bucketTemperatura === 'morno');
  });

  const clientesFlash = clientes.filter(c => {
    return c.bucketTemperatura === 'morno' || c.bucketTemperatura === 'esfriando';
  });

  const getListaAtiva = () => {
    switch (campanhaAtiva) {
      case 'retoque': return clientesRetoque;
      case 'resgate': return clientesResgate;
      case 'indicacao': return clientesIndicacao;
      case 'flash': return clientesFlash;
    }
  };

  const listaAtual = getListaAtiva();

  const handleDispararCampanha = () => {
    if (!antiBanProtecaoAtiva) {
      const confirmacao = window.confirm(
        '⚠️ ATENÇÃO: A proteção Anti-Bloqueio Meta está DESLIGADA. Disparar mensagens sem intervalo cadenciado pode causar banimento do seu número de WhatsApp pela Meta. Deseja prosseguir sob sua responsabilidade?'
      );
      if (!confirmacao) return;
    }

    toast.info(`Iniciando Campanha via Co-Piloto para ${Math.min(listaAtual.length, limiteEnviosDia)} clientes em fila segura!`);
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
                  <>Disparos cadenciados a cada <strong>{intervaloSegundos}s</strong> com delay randômico. Limite máximo de <strong>{limiteEnviosDia} mensagens/dia</strong> e aprovação obrigatória do Marquinhos via WhatsApp.</>
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
              <strong className="text-emerald-400">Até {limiteEnviosDia} envios/dia</strong>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Co-Piloto:</span>
              <strong className="text-amber-400">Só envia após seu aval no Zap</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── AS 4 ESTRATÉGIAS PARA ACORDAR A BASE ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-headline font-black text-white uppercase tracking-wider">
              Estratégias de Reativação (Acordar Clientes da Base)
            </h2>
            <p className="text-xs text-zinc-400">
              Campanhas cirúrgicas para quem já tatuou ou agendou no estúdio Somos 1.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSimulador}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-amber-400" />
            <span>Simulador Sandbox (Número Fictício)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Retoque & Cuidados */}
          <button
            type="button"
            onClick={() => setCampanhaAtiva('retoque')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              campanhaAtiva === 'retoque'
                ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🌿</span>
              <span className="text-xs font-headline font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {clientesRetoque.length} clientes
              </span>
            </div>
            <h4 className="text-xs font-headline font-black text-white uppercase tracking-wider mb-1">
              1. Retoque &amp; Cuidados
            </h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Tatuaram há 30–75 dias. Pergunta da cicatrização e oferece retoque grátis ou 15% na próxima.
            </p>
          </button>

          {/* Card 2: Resgate de Reagendamentos */}
          <button
            type="button"
            onClick={() => setCampanhaAtiva('resgate')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              campanhaAtiva === 'resgate'
                ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">❄️</span>
              <span className="text-xs font-headline font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {clientesResgate.length} clientes
              </span>
            </div>
            <h4 className="text-xs font-headline font-black text-white uppercase tracking-wider mb-1">
              2. Resgate de No-Shows
            </h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Desmarcaram ou reagendaram sem definir nova data. Mensagem acolhedora do Agente Avalanche.
            </p>
          </button>

          {/* Card 3: Programa de Indicação */}
          <button
            type="button"
            onClick={() => setCampanhaAtiva('indicacao')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              campanhaAtiva === 'indicacao'
                ? 'bg-purple-500/10 border-purple-500 shadow-md shadow-purple-500/10'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">💎</span>
              <span className="text-xs font-headline font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {clientesIndicacao.length} clientes
              </span>
            </div>
            <h4 className="text-xs font-headline font-black text-white uppercase tracking-wider mb-1">
              3. Créditos de Indicação
            </h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Clientes que têm amigos para indicar e saldo VIP acumulado para abater na próxima tattoo.
            </p>
          </button>

          {/* Card 4: Flash Day / Horários Vagos */}
          <button
            type="button"
            onClick={() => setCampanhaAtiva('flash')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              campanhaAtiva === 'flash'
                ? 'bg-sky-500/10 border-sky-500 shadow-md shadow-sky-500/10'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">⚡</span>
              <span className="text-xs font-headline font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {clientesFlash.length} clientes
              </span>
            </div>
            <h4 className="text-xs font-headline font-black text-white uppercase tracking-wider mb-1">
              4. Vagas VIP da Semana
            </h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Clientes mornos/esfriando. Convite exclusivo para preencher 2 horários vagos desta semana.
            </p>
          </button>
        </div>
      </div>

      {/* ── DETALHES DA CAMPANHA SELECIONADA & CLIENTES APTOS ── */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Campanha Ativa:
            </span>
            <h3 className="text-sm font-headline font-black text-white uppercase tracking-wider">
              {campanhaAtiva === 'retoque' && '🌿 Cicatrização & Retoque (30 a 75 dias)'}
              {campanhaAtiva === 'resgate' && '❄️ Resgate de No-Shows e Reagendamentos Pendentes'}
              {campanhaAtiva === 'indicacao' && '💎 Ativação de Créditos de Indicação VIP'}
              {campanhaAtiva === 'flash' && '⚡ Preenchimento de Vagas VIP da Semana'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {listaAtual.length} cliente(s) real(is) qualificado(s) nesta esteira.
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
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Template da Mensagem (Personalizada com Nome e Última Tattoo):
          </span>
          <p className="text-xs text-zinc-200 italic font-sans leading-relaxed">
            {campanhaAtiva === 'retoque' && (
              `"Fala [Nome]! Tudo beleza por aí? Lembrei da sua tattoo aqui no estúdio. Como tá o processo de cicatrização? Ficou tudo 100% ou precisa de algum retoque? Manda uma foto aí pra eu dar uma olhada!"`
            )}
            {campanhaAtiva === 'resgate' && (
              `"Fala [Nome]! Vi aqui que a gente não conseguiu fechar a data daquela sua tattoo. Ficou alguma dúvida sobre o orçamento ou ideia do desenho? Temos 2 horários abertos para essa semana se quiser tirar o projeto do papel!"`
            )}
            {campanhaAtiva === 'indicacao' && (
              `"Opa [Nome]! Passando pra te lembrar que você tem créditos acumulados do programa de indicação no Somos 1 Tattoo. Seus amigos indicados já podem liberar até R$ 100 de bônus pra sua próxima sessão!"`
            )}
            {campanhaAtiva === 'flash' && (
              `"Fala [Nome]! Tivemos uma liberação de horário VIP para essa semana aqui no Somos 1. Como você curte o estilo fineline/realismo, separei 15% de bônus exclusivo se quiser encaixar nesses horários!"`
            )}
          </p>
        </div>

        {/* Lista dos Clientes Reais Identificados para Esta Campanha */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Clientes Aptos ({listaAtual.length}):
          </span>

          {listaAtual.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-headline uppercase text-xs tracking-wider bg-zinc-900/40 rounded-2xl border border-white/5">
              Nenhum cliente atende aos critérios desta campanha no momento.
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
                        Último contato há {c.diasSemContato} dias
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

    </div>
  );
};
