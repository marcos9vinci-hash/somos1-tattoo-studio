import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Lead, ClienteCRM, LeadStage, ClienteLifecycleStage, CRMDashboardMetrics } from '../types/crm';
import { UserProfile, Booking, BookingStatus } from '../types';
import { whatsappService } from './whatsappService';

const LEADS_COLLECTION = 'leads';
const USERS_COLLECTION = 'users';
const BOOKINGS_COLLECTION = 'bookings';

export const crmService = {
  // ==========================================
  // LEADS DO CRM (Captados por IA / WhatsApp / Instagram)
  // ==========================================
  async getLeads(): Promise<Lead[]> {
    try {
      const q = query(collection(db, LEADS_COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
    } catch (error) {
      console.warn('Fallback leads sem índice:', error);
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

  // ==========================================
  // CLIENTES REAIS (Conectados à coleção users + bookings do Somos 1)
  // ==========================================
  async getClientes(): Promise<ClienteCRM[]> {
    // 1. Busca todos os usuários do app
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const bookingsSnap = await getDocs(collection(db, BOOKINGS_COLLECTION));

    const allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    const agora = Date.now();
    const MS_POR_DIA = 24 * 60 * 60 * 1000;

    return usersSnap.docs.map(uDoc => {
      const u = uDoc.data() as UserProfile;
      const userBookings = allBookings.filter(b => b.userId === uDoc.id || b.userPhone === u.phone);

      // Total de sessões e valor gasto
      const concluidas = userBookings.filter(b => b.status === BookingStatus.COMPLETED);
      const agendadas = userBookings.filter(b => 
        b.status === BookingStatus.APPROVED || 
        b.status === BookingStatus.DEPOSIT_PAID || 
        b.status === BookingStatus.PENDING_APPROVAL
      );

      const totalGasto = concluidas.reduce((acc, b) => acc + (b.priceEstimated || b.valor_estimado || 0), 0);
      
      // Busca a última sessão
      let ultimaDataMs: number = 0;
      let fotosTattoos: string[] = [];
      let estilos: string[] = [];

      userBookings.forEach(b => {
        if (b.fotos_referencia && Array.isArray(b.fotos_referencia)) {
          fotosTattoos.push(...b.fotos_referencia);
        }
        if (b.estilo && !estilos.includes(b.estilo)) {
          estilos.push(b.estilo);
        }

        if (b.date) {
          const [ano, mes, dia] = b.date.split('-').map(Number);
          const dataMs = new Date(ano, mes - 1, dia).getTime();
          if (dataMs > ultimaDataMs) ultimaDataMs = dataMs;
        }
      });

      const diasSemContato = ultimaDataMs > 0 ? Math.floor((agora - ultimaDataMs) / MS_POR_DIA) : undefined;

      // Classificação automática do ciclo de vida:
      let estagioCiclo: ClienteLifecycleStage = 'novo';
      if (agendadas.length > 0) {
        estagioCiclo = 'negociacao'; // Tem sessão marcada ou em andamento
      } else if (concluidas.length > 2) {
        estagioCiclo = 'recorrente'; // VIP
      } else if (diasSemContato !== undefined && diasSemContato > 30) {
        estagioCiclo = 'inativo'; // Passou de 30 dias sem nova sessão
      } else if (concluidas.length >= 1) {
        estagioCiclo = 'ativo'; // Recém tatuado (<30 dias)
      }

      return {
        id: uDoc.id,
        nome: u.name || 'Cliente Sem Nome',
        telefone: u.phone,
        estagioCiclo,
        totalGasto,
        totalSessoes: concluidas.length,
        diasSemContato,
        estilosFavoritos: estilos,
        fotosTatuagensFeitas: fotosTattoos,
        alertaFollowUpAtivo: estagioCiclo === 'inativo',
        createdAt: u.createdAt,
        updatedAt: u.lastSeenAt || u.createdAt
      } as ClienteCRM;
    });
  },

  async getInactiveClientes(diasInatividade: number = 30): Promise<ClienteCRM[]> {
    const clientes = await this.getClientes();
    return clientes.filter(c => c.estagioCiclo === 'inativo' || (c.diasSemContato !== undefined && c.diasSemContato >= diasInatividade));
  },

  // ==========================================
  // AUTOMAÇÃO DE EVENTOS: QUANDO A AGENDA MUDA
  // ==========================================
  async syncBookingToCRM(booking: Booking, novoStatus: BookingStatus): Promise<void> {
    try {
      // Procura se esse cliente tem um lead ativo correspondente
      const leads = await this.getLeads();
      const rawBookingPhone = (booking.userPhone || '').replace(/\D/g, '');
      const leadCorrespondente = leads.find(l => {
        const rawLeadPhone = (l.telefone || '').replace(/\D/g, '');
        return rawLeadPhone && rawBookingPhone && (rawLeadPhone === rawBookingPhone || rawLeadPhone.endsWith(rawBookingPhone) || rawBookingPhone.endsWith(rawLeadPhone));
      });

      if (leadCorrespondente) {
        if (novoStatus === BookingStatus.APPROVED || novoStatus === BookingStatus.DEPOSIT_PAID) {
          await this.updateLeadStage(leadCorrespondente.id, 'agendado');
        } else if (novoStatus === BookingStatus.COMPLETED) {
          await this.updateLeadStage(leadCorrespondente.id, 'concluido');
        }
      }
    } catch (err) {
      console.warn('Erro ao sincronizar booking no CRM:', err);
    }
  },

  // ==========================================
  // DISPARO DE MENSAGENS (WHATSAPP / N8N)
  // ==========================================
  async dispararFollowUpCliente(cliente: ClienteCRM, mensagemCustom?: string): Promise<{ success: boolean; message: string }> {
    const telefone = cliente.telefone;
    if (!telefone) {
      return { success: false, message: 'Cliente sem telefone cadastrado.' };
    }

    const texto = mensagemCustom || 
      `Olá ${cliente.nome}! Tudo bem? Passando para saber como está sua cicatrização e se já está pensando no seu próximo projeto aqui no Somos 1 Tattoo! 🎨`;

    try {
      await whatsappService.sendViaN8n({
        to: telefone,
        text: texto,
        action: 'followup'
      });
      return { success: true, message: 'Follow-up disparado com sucesso via WhatsApp/n8n!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Falha ao enviar mensagem.' };
    }
  },

  async dispararMensagemLead(lead: Lead, mensagem: string): Promise<{ success: boolean; message: string }> {
    if (!lead.telefone) {
      return { success: false, message: 'Lead sem telefone cadastrado.' };
    }

    try {
      await whatsappService.sendViaN8n({
        to: lead.telefone,
        text: mensagem,
        action: 'confirmacao'
      });
      await this.updateLead(lead.id, { ultimoContatoEm: serverTimestamp() });
      return { success: true, message: 'Mensagem enviada com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao enviar mensagem.' };
    }
  },

  // ==========================================
  // MÉTRICAS EM TEMPO REAL
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
    const inativos = clientes.filter(c => c.estagioCiclo === 'inativo');

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
