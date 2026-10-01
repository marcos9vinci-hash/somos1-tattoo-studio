import React, { useState, useEffect } from 'react';
import { crmService } from '../lib/crmService';
import { Lead, ClienteCRM, LeadStage, ClienteLifecycleStage, CRMDashboardMetrics } from '../types/crm';
import { LeadKanbanBoard } from '../components/crm/LeadKanbanBoard';
import { CustomerLifecycleBoard } from '../components/crm/CustomerLifecycleBoard';
import { FollowUpAlertsWidget } from '../components/crm/FollowUpAlertsWidget';
import { LeadModal } from '../components/crm/LeadModal';
import { ClienteModal } from '../components/crm/ClienteModal';
import { 
  Users, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  RefreshCw, 
  Filter, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Bot
} from 'lucide-react';

export const CRMDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'clientes'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clientes, setClientes] = useState<ClienteCRM[]>([]);
  const [inativos, setInativos] = useState<ClienteCRM[]>([]);
  const [metrics, setMetrics] = useState<CRMDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Modais
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  
  const [selectedCliente, setSelectedCliente] = useState<ClienteCRM | null>(null);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);

  // Status / Toast feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, clientesData, inativosData, metricsData] = await Promise.all([
        crmService.getLeads(),
        crmService.getClientes(),
        crmService.getInactiveClientes(30),
        crmService.getDashboardMetrics()
      ]);

      setLeads(leadsData);
      setClientes(clientesData);
      setInativos(inativosData);
      setMetrics(metricsData);
    } catch (err: any) {
      console.error('Erro ao carregar dados do CRM:', err);
      showToast('error', 'Erro ao carregar registros do CRM no Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers para Leads
  const handleLeadStageChange = async (leadId: string, novoEstagio: LeadStage) => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estagio: novoEstagio } : l));
      await crmService.updateLeadStage(leadId, novoEstagio);
      showToast('success', 'Estágio do lead atualizado!');
      crmService.getDashboardMetrics().then(setMetrics);
    } catch (err) {
      showToast('error', 'Falha ao atualizar estágio do lead.');
      loadData();
    }
  };

  const handleSaveLead = async (leadData: Partial<Lead>) => {
    try {
      if (selectedLead) {
        await crmService.updateLead(selectedLead.id, leadData);
        showToast('success', 'Lead atualizado com sucesso!');
      } else {
        await crmService.createLead(leadData as any);
        showToast('success', 'Novo lead cadastrado com sucesso!');
      }
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao salvar informações do lead.');
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

  // Handlers para Clientes
  const handleClienteStageChange = async (clienteId: string, novoEstagio: ClienteLifecycleStage) => {
    try {
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, estagioCiclo: novoEstagio } : c));
      await crmService.updateClienteLifecycleStage(clienteId, novoEstagio);
      showToast('success', 'Estágio do ciclo de vida atualizado!');
    } catch (err) {
      showToast('error', 'Falha ao atualizar ciclo do cliente.');
      loadData();
    }
  };

  const handleSaveCliente = async (clienteData: Partial<ClienteCRM>) => {
    try {
      if (selectedCliente) {
        await crmService.updateCliente(selectedCliente.id, clienteData);
        showToast('success', 'Cliente atualizado!');
      } else {
        await crmService.createCliente(clienteData as any);
        showToast('success', 'Cliente cadastrado com sucesso!');
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

  const handleDispararTodosFollowUps = async (lista: ClienteCRM[]) => {
    let sucessos = 0;
    for (const c of lista) {
      const res = await crmService.dispararFollowUpCliente(c);
      if (res.success) sucessos++;
      // pequeno delay para não saturar
      await new Promise(r => setTimeout(r, 600));
    }
    showToast('success', `${sucessos} mensagens de reativação enviadas via WhatsApp!`);
    loadData();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-6 lg:p-8">
      {/* Toast Notification */}
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

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wide border border-amber-500/30">
              Somos 1 Tattoo CRM
            </span>
            <span className="flex items-center gap-1 text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700">
              <Bot className="w-3 h-3 text-emerald-400" />
              Agentes IA Ativos
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
            Gestão Comercial & Retenção
          </h1>
          <p className="text-sm text-zinc-400">
            Painel unificado de Leads, Clientes, Ciclo de Vida e Mensageria Automatizada via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>

          {activeTab === 'leads' ? (
            <button
              onClick={() => {
                setSelectedLead(null);
                setIsLeadModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Adicionar Lead
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedCliente(null);
                setIsClienteModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Adicionar Cliente
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Total de Leads</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.totalLeads || 0}</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {metrics?.leadsNovos || 0} novos esta semana
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Taxa de Conversão</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{metrics?.taxaConversao || 0}%</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {metrics?.leadsAgendados || 0} convertidos em sessão
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Base de Clientes</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.totalClientes || 0}</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Ativos no ecossistema
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Inativos &gt; 30 dias</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{inativos.length}</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Prontos para reativação
          </div>
        </div>
      </div>

      {/* Widget de Follow-up 30+ Dias */}
      <FollowUpAlertsWidget
        inativos={inativos}
        onDispararIndividual={handleDispararFollowUp}
        onDispararTodos={handleDispararTodosFollowUps}
        onRefresh={loadData}
      />

      {/* Tabs de Seleção */}
      <div className="flex items-center gap-2 border-b border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'leads'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Funil de Leads ({leads.length})
        </button>

        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'clientes'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Ciclo de Vida de Clientes ({clientes.length})
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-sm">Carregando painel CRM...</span>
        </div>
      ) : activeTab === 'leads' ? (
        <LeadKanbanBoard
          leads={leads}
          onStageChange={handleLeadStageChange}
          onSelectLead={(l) => {
            setSelectedLead(l);
            setIsLeadModalOpen(true);
          }}
          onNewLeadClick={() => {
            setSelectedLead(null);
            setIsLeadModalOpen(true);
          }}
        />
      ) : (
        <CustomerLifecycleBoard
          clientes={clientes}
          onStageChange={handleClienteStageChange}
          onSelectCliente={(c) => {
            setSelectedCliente(c);
            setIsClienteModalOpen(true);
          }}
          onDispararFollowUp={handleDispararFollowUp}
          onNewClienteClick={() => {
            setSelectedCliente(null);
            setIsClienteModalOpen(true);
          }}
        />
      )}

      {/* Modais de Edição/Criação */}
      <LeadModal
        lead={selectedLead}
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSave={handleSaveLead}
        onDelete={handleDeleteLead}
        onSendMessage={handleSendLeadMessage}
      />

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
