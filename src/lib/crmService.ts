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
  // LEADS DO CRM (Alimentado por IA e Agendamentos)
  // ==========================================
  async getLeads(): Promise<Lead[]> {
    try {
      // 1. Busca leads cadastrados manualmente ou por robô IA
      let leadsManuais: Lead[] = [];
      try {
        const q = query(collection(db, LEADS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        leadsManuais = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      } catch (e) {
        const snapshot = await getDocs(collection(db, LEADS_COLLECTION));
        leadsManuais = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      }

      // 2. Busca todos os agendamentos reais da Agenda para povoar automaticamente o funil!
      const bookingsSnap = await getDocs(collection(db, BOOKINGS_COLLECTION));
      const allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));

      const leadsFromBookings: Lead[] = allBookings.map(b => {
        let estagio: LeadStage = 'agendado';
        if (b.status === BookingStatus.COMPLETED) {
          estagio = 'concluido';
        } else if (b.status === BookingStatus.APPROVED || b.status === BookingStatus.DEPOSIT_PAID) {
          estagio = 'agendado';
        } else if (b.status === BookingStatus.PENDING_APPROVAL) {
          estagio = 'pronto';
        } else if (b.status === BookingStatus.REJECTED || b.status === BookingStatus.NO_SHOW) {
          estagio = 'perdido';
        }

        return {
          id: `booking_${b.id}`,
          nome: b.userName || 'Cliente da Agenda',
          telefone: b.userPhone || '',
          origem: 'site',
          estagio,
          temperatura: b.status === BookingStatus.COMPLETED ? 'morno' : 'quente',
          ideiaProjeto: b.descricao_servico || `Tattoo tamanho ${b.size}`,
          estiloTatuagem: b.estilo || '',
          tamanhoAproximado: b.size,
          localCorpo: b.regiao_corpo || '',
          fotosReferencia: b.fotos_referencia || [],
          spin: {
            ticketEstimado: b.priceEstimated || b.valor_estimado || 0,
            urgencia: 'alta'
          },
          responsavelAtendimento: 'Agenda Oficial',
          createdAt: b.createdAt || new Date().toISOString(),
          updatedAt: b.createdAt || new Date().toISOString()
        } as Lead;
      });

      // Mescla os dois, evitando duplicidade pelo telefone
      const mapTelefones = new Set(leadsManuais.map(l => (l.telefone || '').replace(/\D/g, '')));
      const bookingsNaoDuplicados = leadsFromBookings.filter(lb => {
        const clean = (lb.telefone || '').replace(/\D/g, '');
        return !clean || !mapTelefones.has(clean);
      });

      return [...leadsManuais, ...bookingsNaoDuplicados];
    } catch (error) {
      console.warn('Erro ao montar leads com bookings:', error);
      return [];
    }
  },

  async getLeadById(id: string): Promise<Lead | null> {
    if (id.startsWith('booking_')) {
      const bId = id.replace('booking_', '');
      const bDoc = await getDoc(doc(db, BOOKINGS_COLLECTION, bId));
      if (!bDoc.exists()) return null;
      const b = bDoc.data() as Booking;
      return {
        id,
        nome: b.userName || 'Cliente',
        telefone: b.userPhone || '',
        origem: 'site',
        estagio: b.status === BookingStatus.COMPLETED ? 'concluido' : 'agendado',
        temperatura: 'quente',
        ideiaProjeto: b.descricao_servico,
        estiloTatuagem: b.estilo,
        createdAt: b.createdAt,
        updatedAt: b.createdAt
      } as Lead;
    }

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
    if (id.startsWith('booking_')) {
      const bId = id.replace('booking_', '');
      if (data.estagio) {
        let nextStatus: BookingStatus = BookingStatus.APPROVED;
        if (data.estagio === 'concluido') nextStatus = BookingStatus.COMPLETED;
        if (data.estagio === 'perdido') nextStatus = BookingStatus.REJECTED;
        await updateDoc(doc(db, BOOKINGS_COLLECTION, bId), { status: nextStatus });
      }
      return;
    }
    const docRef = doc(db, LEADS_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async updateLeadStage(id: string, novoEstagio: LeadStage): Promise<void> {
    await this.updateLead(id, { estagio: novoEstagio });
  },

  async deleteLead(id: string): Promise<void> {
    if (id.startsWith('booking_')) return;
    const docRef = doc(db, LEADS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ==========================================
  // CLIENTES REAIS (Conectados à coleção users + bookings do Somos 1)
  // ==========================================
  async getClientes(): Promise<ClienteCRM[]> {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const bookingsSnap = await getDocs(collection(db, BOOKINGS_COLLECTION));

    const allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    const agora = Date.now();
    const MS_POR_DIA = 24 * 60 * 60 * 1000;

    return usersSnap.docs.map(uDoc => {
      const u = uDoc.data() as UserProfile;
      const userBookings = allBookings.filter(b => b.userId === uDoc.id || b.userPhone === u.phone);

      const concluidas = userBookings.filter(b => b.status === BookingStatus.COMPLETED);
      const agendadas = userBookings.filter(b => 
        b.status === BookingStatus.APPROVED || 
        b.status === BookingStatus.DEPOSIT_PAID || 
        b.status === BookingStatus.PENDING_APPROVAL
      );

      const totalGasto = concluidas.reduce((acc, b) => acc + (b.priceEstimated || b.valor_estimado || 0), 0);
      
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
      const canceladasOuNoShow = userBookings.filter(b => b.status === BookingStatus.REJECTED || b.status === BookingStatus.NO_SHOW);

      let estagioCiclo: ClienteLifecycleStage = 'novos';
      if (canceladasOuNoShow.length > 0 && agendadas.length === 0 && concluidas.length === 0) {
        estagioCiclo = 'desmarcaram';
      } else if (agendadas.length > 0) {
        estagioCiclo = 'negociacao';
      } else if (concluidas.length > 1) {
        estagioCiclo = 'recorrentes';
      } else if (diasSemContato !== undefined && diasSemContato > 30) {
        estagioCiclo = 'inativos';
      } else if (concluidas.length >= 1) {
        estagioCiclo = 'ativos';
      } else {
        estagioCiclo = 'novos';
      }

      return {
        id: uDoc.id,
        nome: u.name || 'Cliente Cadastrado',
        telefone: u.phone,
        email: u.email || '',
        instagram: u.instagram || '',
        estagioCiclo,
        totalGasto,
        totalSessoes: concluidas.length,
        diasSemContato,
        estilosFavoritos: estilos,
        fotosTatuagensFeitas: fotosTattoos,
        agendamentos: userBookings,
        observacoesInternas: (u as any).observacoesInternas || '',
        alertaFollowUpAtivo: estagioCiclo === 'inativos' || (diasSemContato !== undefined && diasSemContato >= 7 && diasSemContato <= 30),
        createdAt: u.createdAt,
        updatedAt: u.lastSeenAt || u.createdAt
      } as ClienteCRM;
    });
  },

  async getInactiveClientes(diasInatividade: number = 30): Promise<ClienteCRM[]> {
    const clientes = await this.getClientes();
    return clientes.filter(c => c.estagioCiclo === 'inativos' || c.estagioCiclo === 'inativo' || (c.diasSemContato !== undefined && c.diasSemContato >= diasInatividade));
  },

  async salvarObservacoesCliente(clienteId: string, observacoes: string): Promise<void> {
    try {
      const docRef = doc(db, USERS_COLLECTION, clienteId);
      await updateDoc(docRef, {
        observacoesInternas: observacoes,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Aviso ao salvar observações do cliente:", e);
    }
  },

  async getMensagensChat(clienteId: string): Promise<any[]> {
    try {
      const subCol = collection(db, USERS_COLLECTION, clienteId, 'crm_messages');
      const q = query(subCol, orderBy('timestamp', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      return [];
    }
  },

  async enviarMensagemChat(clienteId: string, mensagem: string, remetente: 'cliente' | 'ia' | 'tatuador', telefone?: string): Promise<any> {
    const msgPayload = {
      clienteId,
      remetente,
      mensagem,
      timestamp: new Date(),
      status: 'enviado'
    };

    try {
      // 1. Grava no histórico do Firestore se possível
      const subCol = collection(db, USERS_COLLECTION, clienteId, 'crm_messages');
      const docRef = await addDoc(subCol, {
        ...msgPayload,
        timestamp: serverTimestamp()
      });
      msgPayload.status = 'entregue';
    } catch (e) {
      console.warn("Aviso ao salvar mensagem no Firestore:", e);
    }

    // 2. Se for tatuador ou IA e tiver telefone, dispara via Evolution WhatsApp
    if ((remetente === 'tatuador' || remetente === 'ia') && telefone) {
      try {
        whatsappService.sendTextMessage(telefone, mensagem).catch(err => {
          console.warn("Aviso no disparo via WhatsApp Evolution:", err);
        });
      } catch (err) {
        console.warn("Falha no disparo whatsappService:", err);
      }
    }

    return msgPayload;
  },

  async syncBookingToCRM(booking: Booking, novoStatus: BookingStatus): Promise<void> {
    // Sincronização automática em tempo real
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
