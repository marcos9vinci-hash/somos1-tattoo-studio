import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';
import { Lead, ClienteCRM, CRMTask, LeadStage, ClienteLifecycleStage, CRMDashboardMetrics } from '../types/crm';
import { whatsappService } from './whatsappService';

const LEADS_COLLECTION = 'leads';
const CLIENTES_COLLECTION = 'clientes';
const CRM_TASKS_COLLECTION = 'crm_tasks';

export const crmService = {
  // ==========================================
  // LEADS CRUD
  // ==========================================
  async getLeads(): Promise<Lead[]> {
    try {
      const q = query(collection(db, LEADS_COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
    } catch (error) {
      console.warn('Erro ao buscar leads com ordenação, buscando fallback sem índice:', error);
      const snapshot = await getDocs(collection(db, LEADS_COLLECTION));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
    }
  },

  async getLeadById(id: string): Promise<Lead | null> {
    const docRef = doc(db, LEADS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Lead;
  },

  async createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, LEADS_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ultimoContatoEm: serverTimestamp()
    });
    return docRef.id;
  },

  async updateLead(id: string, data: Partial<Lead>): Promise<void> {
    const docRef = doc(db, LEADS_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async updateLeadStage(id: string, novoEstagio: LeadStage): Promise<void> {
    const docRef = doc(db, LEADS_COLLECTION, id);
    await updateDoc(docRef, {
      estagio: novoEstagio,
      updatedAt: serverTimestamp()
    });
  },

  async deleteLead(id: string): Promise<void> {
    const docRef = doc(db, LEADS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  async addLeadNote(id: string, nota: string, autor: string = 'Admin'): Promise<void> {
    const lead = await this.getLeadById(id);
    if (!lead) return;
    const notaFormatada = `[${new Date().toLocaleString('pt-BR')} - ${autor}] ${nota}`;
    const notasAtuais = lead.notasInternas || [];
    await this.updateLead(id, {
      notasInternas: [notaFormatada, ...notasAtuais]
    });
  },

  // ==========================================
  // CLIENTES CRM CRUD
  // ==========================================
  async getClientes(): Promise<ClienteCRM[]> {
    try {
      const q = query(collection(db, CLIENTES_COLLECTION), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClienteCRM));
    } catch (error) {
      console.warn('Erro ao buscar clientes com ordenação:', error);
      const snapshot = await getDocs(collection(db, CLIENTES_COLLECTION));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClienteCRM));
    }
  },

  async getClienteById(id: string): Promise<ClienteCRM | null> {
    const docRef = doc(db, CLIENTES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as ClienteCRM;
  },

  async createCliente(data: Omit<ClienteCRM, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, CLIENTES_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async updateCliente(id: string, data: Partial<ClienteCRM>): Promise<void> {
    const docRef = doc(db, CLIENTES_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async updateClienteLifecycleStage(id: string, novoEstagio: ClienteLifecycleStage): Promise<void> {
    const docRef = doc(db, CLIENTES_COLLECTION, id);
    await updateDoc(docRef, {
      estagioCiclo: novoEstagio,
      updatedAt: serverTimestamp()
    });
  },

  async deleteCliente(id: string): Promise<void> {
    const docRef = doc(db, CLIENTES_COLLECTION, id);
    await deleteDoc(docRef);
  },

  async addClienteNote(id: string, nota: string, autor: string = 'Admin'): Promise<void> {
    const cliente = await this.getClienteById(id);
    if (!cliente) return;
    const notaFormatada = `[${new Date().toLocaleString('pt-BR')} - ${autor}] ${nota}`;
    const notasAtuais = cliente.notasInternas || [];
    await this.updateCliente(id, {
      notasInternas: [notaFormatada, ...notasAtuais]
    });
  },

  // Busca clientes inativos (+30 dias sem retorno ou sem sessao)
  async getInactiveClientes(diasInatividade: number = 30): Promise<ClienteCRM[]> {
    const todos = await this.getClientes();
    const agora = Date.now();
    const msInatividade = diasInatividade * 24 * 60 * 60 * 1000;

    return todos.filter(c => {
      if (c.estagioCiclo === 'inativo') return true;
      let ultimaDataMs = 0;
      if (c.ultimaSessaoEm?.toMillis) {
        ultimaDataMs = c.ultimaSessaoEm.toMillis();
      } else if (c.updatedAt?.toMillis) {
        ultimaDataMs = c.updatedAt.toMillis();
      } else if (typeof c.ultimaSessaoEm === 'number') {
        ultimaDataMs = c.ultimaSessaoEm;
      }
      return ultimaDataMs > 0 && agora - ultimaDataMs > msInatividade;
    });
  },

  // ==========================================
  // DISPARO DE MENSAGEM / FOLLOW-UP VIA WHATSAPP (N8N)
  // ==========================================
  async dispararFollowUpCliente(cliente: ClienteCRM, mensagemCustom?: string): Promise<{ success: boolean; message: string }> {
    const telefone = cliente.telefone;
    if (!telefone) {
      return { success: false, message: 'Cliente não possui telefone cadastrado.' };
    }

    const texto = mensagemCustom || 
      `Olá ${cliente.nome}! Tudo bem? Passando para saber como está sua cicatrização e se já está pensando no seu próximo projeto aqui no Somos 1 Tattoo! 🎨`;

    try {
      await whatsappService.sendViaN8n({
        to: telefone,
        text: texto,
        action: 'followup'
      });

      // Atualiza cliente com marcação de follow-up
      await this.updateCliente(cliente.id, {
        ultimoDisparoFollowUpEm: serverTimestamp(),
        alertaFollowUpAtivo: false
      });

      await this.addClienteNote(cliente.id, `Follow-up enviado via WhatsApp: "${texto.substring(0, 40)}..."`, 'IA_Assessor');

      return { success: true, message: 'Follow-up disparado com sucesso via WhatsApp/n8n!' };
    } catch (err: any) {
      console.error('Erro ao disparar follow-up:', err);
      return { success: false, message: err.message || 'Falha ao enviar mensagem.' };
    }
  },

  async dispararMensagemLead(lead: Lead, mensagem: string): Promise<{ success: boolean; message: string }> {
    if (!lead.telefone) {
      return { success: false, message: 'Lead não possui telefone cadastrado.' };
    }

    try {
      await whatsappService.sendViaN8n({
        to: lead.telefone,
        text: mensagem,
        action: 'confirmacao'
      });

      await this.updateLead(lead.id, {
        ultimoContatoEm: serverTimestamp()
      });

      await this.addLeadNote(lead.id, `Mensagem enviada: "${mensagem.substring(0, 40)}..."`, 'IA_Assessor');

      return { success: true, message: 'Mensagem enviada ao lead com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao enviar mensagem ao lead.' };
    }
  },

  // ==========================================
  // MÉTRICAS DO DASHBOARD
  // ==========================================
  async getDashboardMetrics(): Promise<CRMDashboardMetrics> {
    const [leads, clientes] = await Promise.all([
      this.getLeads(),
      this.getClientes()
    ]);

    const leadsNovos = leads.filter(l => l.estagio === 'novo').length;
    const leadsQualificados = leads.filter(l => l.estagio === 'qualificacao' || l.estagio === 'pronto').length;
    const leadsAgendados = leads.filter(l => l.estagio === 'agendado' || l.estagio === 'concluido').length;
    const taxaConversao = leads.length > 0 ? (leadsAgendados / leads.length) * 100 : 0;

    const inativos = await this.getInactiveClientes(30);

    return {
      totalLeads: leads.length,
      leadsNovos,
      leadsQualificados,
      leadsAgendados,
      taxaConversao: Math.round(taxaConversao * 10) / 10,
      totalClientes: clientes.length,
      clientesInativos: inativos.length,
      totalFollowUpsPendentes: inativos.length
    };
  }
};
