import React, { useState, useEffect } from 'react';
import { crmService } from '../lib/crmService';
import { whatsappService } from '../lib/whatsappService';
import { executeBatchScan50Chats } from '../lib/whatsappBatchScanner';
import { Lead, ClienteCRM, LeadStage, CRMDashboardMetrics, EstrategiaCampanha } from '../types/crm';
import { LeadKanbanBoard } from '../components/crm/LeadKanbanBoard';
import { CarteiraClientesKanban } from '../components/crm/CarteiraClientesKanban';
import { TemperaturaWidget } from '../components/crm/TemperaturaWidget';
import { Somos1ClientDetailPanel } from '../components/crm/Somos1ClientDetailPanel';
import { Somos1MassMessageModal } from '../components/crm/Somos1MassMessageModal';
import { ChatInterfaceModal } from '../components/crm/ChatInterfaceModal';
import { LeadModal } from '../components/crm/LeadModal';
import { ClienteModal } from '../components/crm/ClienteModal';
import { EstrategiasReativacaoPanel } from '../components/crm/EstrategiasReativacaoPanel';
import { SimuladorFluxoWhatsAppModal } from '../components/crm/SimuladorFluxoWhatsAppModal';
import {
  Users,
  Sparkles,
  Clock,
  TrendingUp,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Bot,
  Rocket,
  Flame,
  Sun,
  Snowflake,
  AlertTriangle,
  Zap,
  Play
} from 'lucide-react';

type ActiveTab = 'carteira' | 'funil' | 'estrategias';

export const CRMDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('carteira');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clientes, setClientes] = useState<ClienteCRM[]>([]);
  const [metrics, setMetrics] = useState<CRMDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Modais de Lead
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Modais de Cliente
  const [selectedCliente, setSelectedCliente] = useState<ClienteCRM | null>(null);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);

  // Painéis laterais e Simulador
  const [clienteParaChat, setClienteParaChat] = useState<{ id: string; nome: string; telefone: string } | null>(null);
  const [clienteParaFicha, setClienteParaFicha] = useState<ClienteCRM | null>(null);
  const [isMassMessageOpen, setIsMassMessageOpen] = useState(false);
  const [isSimuladorOpen, setIsSimuladorOpen] = useState(false);
  const [estrategiaParaSimular, setEstrategiaParaSimular] = useState<EstrategiaCampanha | null>(null);

  // Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, clientesData, metricsData] = await Promise.all([
        crmService.getLeads(),
        crmService.getClientes(),
        crmService.getDashboardMetrics()
      ]);
      setLeads(leadsData);
      setClientes(clientesData);
      setMetrics(metricsData);
    } catch (err: any) {
      console.error('Erro ao carregar dados do CRM:', err);
      showToast('error', 'Erro ao carregar registros do CRM.');
    } finally {
      setLoading(false);
    }
  };

  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const handleScan50Chats = async () => {
    setIsScanning(true);
    try {
      const settings = await whatsappService.getSettings();
      const baseUrl = settings?.automation?.evolutionBaseUrl || (import.meta as any).env?.VITE_EVOLUTION_BASE_URL || '';
      const apiKey = settings?.automation?.evolutionApiKey || (import.meta as any).env?.VITE_EVOLUTION_API_KEY || '';
      const instance = settings?.automation?.evolutionInstance || 'wats';

      if (!baseUrl || !apiKey) {
        showToast('error', 'URL ou Chave da Evolution API ausente em Studio Settings.');
        setIsScanning(false);
        return;
      }

      showToast('success', 'Iniciando leitura segura das últimas 50 conversas...');
      const report = await executeBatchScan50Chats(baseUrl, apiKey, instance);
      showToast('success', `Varredura concluída! ${report.novosLeadsCapturados} novos leads, ${report.leadsAtualizados} atualizados.`);
      await loadData();
    } catch (err: any) {
      showToast('error', `Falha ao escanear conversas: ${err?.message || 'Erro de conexão'}`);
    } finally {
      setIsScanning(false);
    }
  };

  // ── Handlers Leads ──────────────────────────────────────────────────────────

  const handleLeadStageChange = async (leadId: string, novoEstagio: LeadStage) => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estagio: novoEstagio } : l));
      await crmService.updateLeadStage(leadId, novoEstagio);
      showToast('success', 'Etapa do lead atualizada!');
      crmService.getDashboardMetrics().then(setMetrics);
    } catch (err) {
      showToast('error', 'Falha ao atualizar etapa do lead.');
      loadData();
    }
  };

  const handleSaveLead = async (leadData: Partial<Lead>) => {
    try {
      if (selectedLead) {
        await crmService.updateLead(selectedLead.id, leadData);
        showToast('success', 'Lead atualizado!');
      } else {
        await crmService.createLead(leadData as any);
        showToast('success', 'Novo lead cadastrado!');
      }
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao salvar lead.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await crmService.deleteLead(leadId);
      showToast('success', 'Lead removido.');
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao remover lead.');
    }
  };

  const handleSendLeadMessage = async (lead: Lead, msg: string) => {
    const res = await crmService.dispararMensagemLead(lead, msg);
    if (res.success) {
      showToast('success', res.message);
      loadData();
    } else {
      showToast('error', res.message);
    }
  };

  // ── Handlers Clientes ───────────────────────────────────────────────────────

  const handleSaveCliente = async (clienteData: Partial<ClienteCRM>) => {
    try {
      if (selectedCliente) {
        await crmService.updateCliente(selectedCliente.id, clienteData);
        showToast('success', 'Cliente atualizado!');
      } else {
        await crmService.createCliente(clienteData as any);
        showToast('success', 'Cliente cadastrado!');
      }
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao salvar cliente.');
    }
  };

  const handleDeleteCliente = async (clienteId: string) => {
    try {
      await crmService.deleteCliente(clienteId);
      showToast('success', 'Cliente removido.');
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao remover cliente.');
    }
  };

  const handleDispararFollowUp = async (cliente: ClienteCRM, msgCustom?: string) => {
    const res = await crmService.dispararFollowUpCliente(cliente, msgCustom);
    if (res.success) {
      showToast('success', res.message);
      loadData();
    } else {
      showToast('error', res.message);
    }
  };

  const handleReativarCliente = async (cliente: ClienteCRM) => {
    try {
      await crmService.reativarClienteParaLead(cliente);
      showToast('success', `${cliente.nome} enviado para a coluna de Negociação no Funil Comercial!`);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao reativar cliente.');
    }
  };

  // ── Métricas de temperatura ─────────────────────────────────────────────────

  const temp = metrics?.temperaturaCounts;

  return (
    <div className="w-full space-y-6">
      {/* Toast */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border text-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold text-[10px] uppercase tracking-wider border border-amber-500/30">
              Somos 1 Tattoo CRM
            </span>
            <span className="flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
              <Bot className="w-3 h-3 text-emerald-500" />
              Sincronizado com Agenda &amp; IA
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-headline font-black text-foreground uppercase tracking-wide mt-1">
            Gestão Comercial &amp; Carteira de Clientes
          </h1>
          <p className="text-xs text-muted-foreground font-headline">
            Funil Comercial de Leads · Carteira por Temperatura · Fichas · Disparo Direto
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-headline font-bold text-foreground transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>

          <button
            onClick={handleScan50Chats}
            disabled={isScanning || loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-headline font-bold transition-all active:scale-95 disabled:opacity-50"
            title="Lê as últimas 50 conversas do WhatsApp na Evolution API e classifica leads no Funil sem queimar tokens"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Lendo 50 Chats...' : 'Scan 50 Conversas'}
          </button>

          <button
            onClick={() => setIsSimuladorOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-amber-400" />
            Simulador Sandbox
          </button>

          <button
            onClick={() => setIsMassMessageOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-headline font-bold transition-all active:scale-95"
          >
            <Rocket className="w-3.5 h-3.5 text-purple-400" />
            Disparo em Massa
          </button>

          {activeTab === 'funil' ? (
            <button
              onClick={() => { setSelectedLead(null); setIsLeadModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-fixed text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Novo Lead
            </button>
          ) : (
            <button
              onClick={() => { setSelectedCliente(null); setIsClienteModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">Carteira</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-headline font-black text-foreground">{clientes.length}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">clientes pós-tattoo</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">Leads</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-headline font-black text-foreground">{leads.length}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">em qualificação</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">🔥 Quente</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-headline font-black text-rose-400">{temp?.quente ?? 0}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">cicatrização ativa</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">❄️ Esfriando</span>
            <Snowflake className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-headline font-black text-blue-400">{temp?.esfriando ?? 0}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">31–90 dias</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">🧊 Alerta</span>
            <AlertTriangle className={`w-4 h-4 text-violet-400 ${(temp?.alerta ?? 0) > 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div className="text-2xl font-headline font-black text-violet-400">{temp?.alerta ?? 0}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">créditos vencendo</div>
        </div>
      </div>

      {/* ── Widget de temperatura (só na aba Carteira) ── */}
      {activeTab === 'carteira' && (
        <TemperaturaWidget
          clientes={clientes}
          onDispararWhatsApp={handleDispararFollowUp}
          onAbrirChat={(c) => setClienteParaChat(c)}
        />
      )}

      {/* ── Tabs (Mobile Swipe & Scroll Responsivo) ── */}
      <div className="relative border-b border-zinc-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-0.5 -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('carteira')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === 'carteira'
                ? 'border-amber-500 text-amber-400 font-headline'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Carteira de Clientes</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black">
              {clientes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('funil')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === 'funil'
                ? 'border-blue-500 text-blue-400 font-headline'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Funil Comercial</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black">
              {leads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('estrategias')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === 'estrategias'
                ? 'border-purple-500 text-purple-400 font-headline shadow-xs'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Estratégias de Reativação</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black">
              Anti-Ban Meta
            </span>
          </button>
        </div>

        {/* Gradiente indicador de rolagem para mobile */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0.5 w-6 bg-gradient-to-l from-background to-transparent sm:hidden opacity-80" />
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-sm">Carregando painel CRM...</span>
        </div>
      ) : activeTab === 'carteira' ? (
        <CarteiraClientesKanban
          clientes={clientes}
          onAbrirChat={(c) => setClienteParaChat(c)}
          onAbrirFicha={(c) => setClienteParaFicha(c)}
          onDispararFollowUp={handleDispararFollowUp}
          onReativarCliente={handleReativarCliente}
        />
      ) : activeTab === 'funil' ? (
        <div className="space-y-4">
          {/* ── Régua de Conversão de Vendas do Funil ── */}
          <div className="bg-zinc-950 p-4 rounded-2xl border border-blue-500/20 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-headline font-black text-white uppercase tracking-wider">
                    Conversão do Funil de Vendas
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Acompanhe a eficiência de cada etapa para calibrar suas estratégias comerciais.
                  </p>
                </div>
              </div>

              {/* Indicadores de Conversão */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block font-headline">Taxa Geral de Conversão</span>
                  <span className="text-sm font-headline font-black text-emerald-400">
                    {metrics?.taxaConversao ?? 0}%
                  </span>
                </div>

                <div className="bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block font-headline">Pipeline em Negociação</span>
                  <span className="text-sm font-headline font-black text-amber-400">
                    R$ {(metrics?.pipelineEstimado ?? 0).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block font-headline">Taxa de Fechamento</span>
                  <span className="text-sm font-headline font-black text-purple-400">
                    {metrics?.taxaFechamento ?? 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Esteira Visual de Passagem do Funil */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-center">
              <div className="bg-zinc-900/60 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-blue-300 font-headline font-bold block">1. Novos</span>
                <span className="text-base font-headline font-black text-white">{metrics?.leadsNovos ?? 0}</span>
                <span className="text-[9px] text-zinc-500 block">Entrada WhatsApp</span>
              </div>
              <div className="bg-zinc-900/60 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-amber-300 font-headline font-bold block">2. Qualificação</span>
                <span className="text-base font-headline font-black text-white">{metrics?.leadsQualificados ?? 0}</span>
                <span className="text-[9px] text-zinc-500 block">Ideia &amp; Estilo</span>
              </div>
              <div className="bg-zinc-900/60 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-purple-300 font-headline font-bold block">3. Negociação</span>
                <span className="text-base font-headline font-black text-white">{metrics?.leadsNegociacao ?? 0}</span>
                <span className="text-[9px] text-zinc-500 block">Orçamento &amp; Valor</span>
              </div>
              <div className="bg-zinc-900/60 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-emerald-300 font-headline font-bold block">4. Agendados</span>
                <span className="text-base font-headline font-black text-white">{metrics?.leadsAgendados ?? 0}</span>
                <span className="text-[9px] text-zinc-500 block">Data Marcada</span>
              </div>
              <div className="bg-zinc-900/60 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-zinc-300 font-headline font-bold block">5. Concluídos</span>
                <span className="text-base font-headline font-black text-emerald-400">{metrics?.leadsConcluidos ?? 0}</span>
                <span className="text-[9px] text-zinc-500 block">Tattoo Feita</span>
              </div>
            </div>
          </div>

          <LeadKanbanBoard
            leads={leads}
            onStageChange={handleLeadStageChange}
            onSelectLead={(l) => { setSelectedLead(l); setIsLeadModalOpen(true); }}
            onNewLeadClick={() => { setSelectedLead(null); setIsLeadModalOpen(true); }}
            onAbrirChat={(l) => setClienteParaChat({ 
              id: l.id, 
              nome: l.nome, 
              telefone: l.telefone,
              estagio: l.estagio,
              ideiaProjeto: l.ideiaProjeto,
              temperatura: l.temperatura
            })}
          />
        </div>
      ) : (
        <EstrategiasReativacaoPanel
          clientes={clientes}
          onOpenSimulador={(est) => {
            setEstrategiaParaSimular(est || null);
            setIsSimuladorOpen(true);
          }}
          onOpenChatCliente={(c) => setClienteParaChat(c)}
        />
      )}

      {/* ── Simulador Sandbox ── */}
      <SimuladorFluxoWhatsAppModal
        isOpen={isSimuladorOpen}
        onClose={() => {
          setIsSimuladorOpen(false);
          setEstrategiaParaSimular(null);
        }}
        estrategia={estrategiaParaSimular}
        onLeadSimuladoCriado={(lead) => {
          setLeads(prev => [lead, ...prev]);
          showToast('success', 'Lead fictício adicionado ao Kanban para testes!');
        }}
      />

      {/* ── Chat direto estilo Meta Inbox com Co-Piloto IA ── */}
      <ChatInterfaceModal
        isOpen={!!clienteParaChat}
        onClose={() => setClienteParaChat(null)}
        cliente={clienteParaChat}
        onStageChange={(id, novoEstagio) => {
          handleLeadStageChange(id, novoEstagio);
          setClienteParaChat((prev: any) => prev ? { ...prev, estagio: novoEstagio } : null);
        }}
      />

      {/* ── Ficha detalhada ── */}
      <Somos1ClientDetailPanel
        isOpen={!!clienteParaFicha}
        onClose={() => setClienteParaFicha(null)}
        cliente={clienteParaFicha}
        onAbrirChat={(c) => {
          setClienteParaFicha(null);
          setClienteParaChat(c);
        }}
        onDispararFollowUp={handleDispararFollowUp}
        onUpdateCliente={(c) => {
          setClientes(prev => prev.map(item => item.id === c.id ? c : item));
        }}
      />

      {/* ── Disparo em massa ── */}
      <Somos1MassMessageModal
        isOpen={isMassMessageOpen}
        onClose={() => setIsMassMessageOpen(false)}
        clientes={clientes}
        onSucesso={() => {
          showToast('success', 'Disparo em massa concluído!');
          loadData();
        }}
      />

      {/* ── Modal de Lead ── */}
      <LeadModal
        lead={selectedLead}
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSave={handleSaveLead}
        onDelete={handleDeleteLead}
        onSendMessage={handleSendLeadMessage}
      />

      {/* ── Modal de Cliente ── */}
      <ClienteModal
        cliente={selectedCliente}
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        onSave={handleSaveCliente}
        onDelete={handleDeleteCliente}
        onDispararFollowUp={handleDispararFollowUp}
      />
    </div>
  );
};

export default CRMDashboardPage;
