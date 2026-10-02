import React, { useState, useEffect } from 'react';
import { crmService } from '../lib/crmService';
import { Lead, ClienteCRM, LeadStage, ClienteLifecycleStage, CRMDashboardMetrics } from '../types/crm';
import { LeadKanbanBoard } from '../components/crm/LeadKanbanBoard';
import { Somos1ClientesKanban } from '../components/crm/Somos1ClientesKanban';
import { Somos1ClientDetailPanel } from '../components/crm/Somos1ClientDetailPanel';
import { Somos1FollowUpAlerts } from '../components/crm/Somos1FollowUpAlerts';
import { Somos1MassMessageModal } from '../components/crm/Somos1MassMessageModal';
import { ChatInterfaceModal } from '../components/crm/ChatInterfaceModal';
import { LeadModal } from '../components/crm/LeadModal';
import { ClienteModal } from '../components/crm/ClienteModal';
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
  MessageSquare
} from 'lucide-react';

export const CRMDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clientes' | 'leads'>('clientes');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clientes, setClientes] = useState<ClienteCRM[]>([]);
  const [inativos, setInativos] = useState<ClienteCRM[]>([]);
  const [metrics, setMetrics] = useState<CRMDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Modais de Criação/Edição
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  
  const [selectedCliente, setSelectedCliente] = useState<ClienteCRM | null>(null);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);

  // Novos Modais do Somos 1
  const [clienteParaChat, setClienteParaChat] = useState<{ id: string; nome: string; telefone: string } | null>(null);
  const [clienteParaFicha, setClienteParaFicha] = useState<ClienteCRM | null>(null);
  const [isMassMessageOpen, setIsMassMessageOpen] = useState(false);

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

  return (
    <div className="w-full space-y-6">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold text-[10px] uppercase tracking-wider border border-amber-500/30">
              Somos 1 Tattoo CRM Oficial
            </span>
            <span className="flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
              <Bot className="w-3 h-3 text-emerald-500" />
              Sincronização com Agenda & IA Ativa
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-headline font-black text-foreground uppercase tracking-wide mt-1">
            Gestão Comercial & Retenção de Clientes
          </h1>
          <p className="text-xs text-muted-foreground font-headline">
            Funil das 6 Colunas Somos 1, Resposta Direta pelo Navegador, Fichas de Atendimento e Alertas de Pós-Venda.
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
            onClick={() => setIsMassMessageOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-headline font-bold transition-all active:scale-95"
            title="Disparar mensagem para todos os clientes de uma coluna"
          >
            <Rocket className="w-3.5 h-3.5 text-purple-400" />
            Disparo em Massa
          </button>

          {activeTab === 'leads' ? (
            <button
              onClick={() => {
                setSelectedLead(null);
                setIsLeadModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-fixed text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Novo Lead
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedCliente(null);
                setIsClienteModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">Base de Clientes</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-headline font-black text-foreground">{clientes.length}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">
            Organizados nas 6 colunas
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">Funil de Leads</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-headline font-black text-foreground">{leads.length}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">
            Em qualificação e agendamento
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">Taxa de Conversão</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-headline font-black text-emerald-500">{metrics?.taxaConversao || 0}%</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">
            {metrics?.leadsAgendados || 0} sessões geradas
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider">Inativos &gt; 30 dias</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-headline font-black text-orange-400">{inativos.length}</div>
          <div className="text-[10px] text-muted-foreground font-headline mt-1">
            Prontos para reativação
          </div>
        </div>
      </div>

      {/* Alertas de Follow-up & Cicatrização */}
      <Somos1FollowUpAlerts
        clientes={clientes}
        onDispararWhatsApp={handleDispararFollowUp}
        onAbrirChat={(c) => setClienteParaChat(c)}
      />

      {/* Tabs de Seleção Principal */}
      <div className="flex items-center gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'clientes'
              ? 'border-amber-500 text-amber-400 font-headline'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Clientes Somos 1 — 6 Colunas ({clientes.length})
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'leads'
              ? 'border-amber-500 text-amber-400 font-headline'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Funil de Leads ({leads.length})
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-sm">Carregando painel CRM...</span>
        </div>
      ) : activeTab === 'clientes' ? (
        <Somos1ClientesKanban
          clientes={clientes}
          onAbrirChat={(c) => setClienteParaChat(c)}
          onAbrirFicha={(c) => setClienteParaFicha(c)}
          onDispararFollowUp={handleDispararFollowUp}
        />
      ) : (
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
      )}

      {/* 💬 CHAT DIRETO NO NAVEGADOR (DRAWER LATERAL) */}
      <ChatInterfaceModal
        isOpen={!!clienteParaChat}
        onClose={() => setClienteParaChat(null)}
        cliente={clienteParaChat}
      />

      {/* 👤 FICHA DETALHADA DO CLIENTE (DRAWER LATERAL) */}
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

      {/* 🚀 MODAL DE DISPARO EM MASSA POR COLUNA */}
      <Somos1MassMessageModal
        isOpen={isMassMessageOpen}
        onClose={() => setIsMassMessageOpen(false)}
        clientes={clientes}
        onSucesso={() => {
          showToast('success', 'Disparo em massa concluído com sucesso!');
          loadData();
        }}
      />

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
export default CRMDashboardPage;
