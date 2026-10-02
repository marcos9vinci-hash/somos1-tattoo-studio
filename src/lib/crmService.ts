import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where,
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Lead, 
  ClienteCRM, 
  LeadStage, 
  ClienteCarteiraTempStage,
  CRMDashboardMetrics,
  ColunaAIAgentConfig,
  calcularBucketTemperatura,
  EstrategiaCampanha
} from '../types/crm';
import { DEFAULT_ESTRATEGIAS } from './defaultEstrategias';
import { STAGE_AGENTS_NAIA } from './naiaAgentsConfig';
import { UserProfile, Booking, BookingStatus } from '../types';
import { whatsappService } from './whatsappService';

const LEADS_COLLECTION = 'leads';
const USERS_COLLECTION = 'users';
const BOOKINGS_COLLECTION = 'bookings';

export const crmService = {
  // ==========================================
  // LEADS DO FUNIL COMERCIAL
  // ==========================================
  async getLeads(): Promise<Lead[]> {
    try {
      // 1. Leads cadastrados manualmente ou por robô IA
      let leadsManuais: Lead[] = [];
      try {
        const q = query(collection(db, LEADS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        leadsManuais = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      } catch (e) {
        const snapshot = await getDocs(collection(db, LEADS_COLLECTION));
        leadsManuais = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      }

      // 2. Agendamentos reais da Agenda → alimentam o funil automaticamente
      const [bookingsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, BOOKINGS_COLLECTION)),
        getDocs(collection(db, USERS_COLLECTION))
      ]);
      const allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      const userPhoneMap = new Map<string, string>();
      usersSnap.docs.forEach(d => {
        const uData = d.data();
        if (uData.phone) userPhoneMap.set(d.id, uData.phone);
      });

      const leadsFromBookings: Lead[] = allBookings.map(b => {
        let estagio: LeadStage = 'agendado';
        if (b.status === BookingStatus.COMPLETED) {
          estagio = 'concluido'; // → promovido para Carteira de Clientes
        } else if (b.status === BookingStatus.APPROVED || b.status === BookingStatus.DEPOSIT_PAID) {
          estagio = 'agendado';
        } else if (b.status === BookingStatus.PENDING_APPROVAL) {
          estagio = 'negociacao';
        } else if (b.status === BookingStatus.REJECTED || b.status === BookingStatus.NO_SHOW) {
          estagio = 'followup'; // Desmarcou ou faltou → entra no follow-up de resgate
        }

        const resolvedPhone = b.userPhone || (b.userId ? userPhoneMap.get(b.userId) : '') || '';

        return {
          id: `booking_${b.id}`,
          nome: b.userName || 'Cliente da Agenda',
          telefone: resolvedPhone,
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

      // Mescla, evitando duplicidade pelo telefone
      const mapTelefones = new Set(leadsManuais.map(l => (l.telefone || '').replace(/\D/g, '')));
      const bookingsNaoDuplicados = leadsFromBookings.filter(lb => {
        const clean = (lb.telefone || '').replace(/\D/g, '');
        return !clean || !mapTelefones.has(clean);
      });

      return [...leadsManuais, ...bookingsNaoDuplicados];
    } catch (error) {
      console.warn('Fallback leads sem índice:', error);
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
    await deleteDoc(doc(db, LEADS_COLLECTION, id));
  },

  // ==========================================
  // CARTEIRA DE CLIENTES (pós-tattoo, temperatura)
  // ==========================================
  async getClientes(): Promise<ClienteCRM[]> {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const bookingsSnap = await getDocs(collection(db, BOOKINGS_COLLECTION));

    const allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    const agora = Date.now();
    const MS_POR_DIA = 24 * 60 * 60 * 1000;

    // Função utilitária para extrair timestamp seguro mesmo com data no formato "YYYY-MM-DD HH:mm"
    const extrairMsDeData = (dateStr?: string): number => {
      if (!dateStr || typeof dateStr !== 'string') return 0;
      const clean = dateStr.trim().split(' ')[0]; // isola YYYY-MM-DD
      const parts = clean.split('-');
      if (parts.length < 3) return 0;
      const a = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (isNaN(a) || isNaN(m) || isNaN(d)) return 0;
      return new Date(a, m - 1, d, 12, 0, 0).getTime();
    };

    const clientes: ClienteCRM[] = usersSnap.docs.map(uDoc => {
      const u = uDoc.data() as UserProfile;
      const userBookings = allBookings.filter(b => b.userId === uDoc.id || b.userPhone === u.phone);

      const concluidas = userBookings.filter(b => 
        b.status === BookingStatus.COMPLETED || 
        b.status === BookingStatus.APPROVED || 
        b.status === BookingStatus.DEPOSIT_PAID
      );
      const agendadas = userBookings.filter(b =>
        b.status === BookingStatus.APPROVED ||
        b.status === BookingStatus.DEPOSIT_PAID ||
        b.status === BookingStatus.PENDING_APPROVAL
      );

      const totalGasto = concluidas.reduce((acc, b) => acc + (b.priceEstimated || b.valor_estimado || 0), 0);

      let ultimaDataMs = 0;
      let fotosTattoos: string[] = [];
      let estilos: string[] = [];

      userBookings.forEach(b => {
        if (b.fotos_referencia && Array.isArray(b.fotos_referencia)) {
          fotosTattoos.push(...b.fotos_referencia);
        }
        if (b.estilo && !estilos.includes(b.estilo)) {
          estilos.push(b.estilo);
        }
        const dataMs = extrairMsDeData(b.date);
        if (dataMs > ultimaDataMs) ultimaDataMs = dataMs;
      });

      const diasSemContato = ultimaDataMs > 0
        ? Math.max(0, Math.floor((agora - ultimaDataMs) / MS_POR_DIA))
        : undefined;

      const desmarcadas = userBookings.filter(b => 
        b.status === BookingStatus.REJECTED || 
        b.status === BookingStatus.NO_SHOW
      );
      const desmarcouEm = desmarcadas.length > 0 ? desmarcadas[desmarcadas.length - 1].date : undefined;

      // Identifica o agendamento mais recente do cliente para verificar se ele faltou ou desmarcou
      const sortedBookings = [...userBookings].sort((a, b) => extrairMsDeData(b.date) - extrairMsDeData(a.date));
      const ultimoBooking = sortedBookings[0];
      const ultimoStatus = ultimoBooking ? (ultimoBooking.status as string) : undefined;

      const totalSessoes = concluidas.length || (userBookings.length > 0 ? 1 : 0);
      let bucketTemperatura: ClienteCarteiraTempStage = (u as any).bucketTemperatura === 'emReativacao'
        ? 'emReativacao'
        : calcularBucketTemperatura(diasSemContato, totalSessoes, ultimoStatus);

      return {
        id: uDoc.id,
        nome: u.name || 'Cliente Cadastrado',
        telefone: u.phone,
        email: u.email || '',
        instagram: u.instagram || '',
        bucketTemperatura,
        estagioCiclo: bucketTemperatura as any,
        totalGasto,
        totalSessoes,
        diasSemContato,
        estilosFavoritos: estilos,
        fotosTatuagensFeitas: fotosTattoos,
        agendamentos: userBookings,
        temSessaoAgendada: agendadas.length > 0,
        desmarcouEm,
        emReativacaoLeadId: (u as any).emReativacaoLeadId,
        observacoesInternas: (u as any).observacoesInternas || '',
        alertaFollowUpAtivo: bucketTemperatura === 'quente' || bucketTemperatura === 'alerta',
        createdAt: u.createdAt,
        updatedAt: u.lastSeenAt || u.createdAt
      } as ClienteCRM;
    });

    // ─── POPULAR CARTEIRA COM CLIENTES REAIS DE BOOKINGS ───
    const mapTelefones = new Set(clientes.map(c => (c.telefone || '').replace(/\D/g, '')).filter(Boolean));
    const mapNomes = new Set(clientes.map(c => (c.nome || '').trim().toLowerCase()).filter(Boolean));

    const bookingsByClient: Record<string, Booking[]> = {};
    allBookings.forEach(b => {
      const cleanPhone = (b.userPhone || '').replace(/\D/g, '');
      const cleanName = (b.userName || '').trim().toLowerCase();
      const isAlreadyCovered = (cleanPhone && mapTelefones.has(cleanPhone)) || (cleanName && mapNomes.has(cleanName));
      if (!isAlreadyCovered) {
        const groupKey = cleanPhone || cleanName || b.id;
        if (!bookingsByClient[groupKey]) bookingsByClient[groupKey] = [];
        bookingsByClient[groupKey].push(b);
      }
    });

    Object.entries(bookingsByClient).forEach(([key, bList]) => {
      const first = bList[0];
      const nome = first.userName || 'Cliente Estúdio';
      const telefone = first.userPhone || '';
      const concluidas = bList.filter(b => 
        b.status === BookingStatus.COMPLETED || 
        b.status === BookingStatus.APPROVED || 
        b.status === BookingStatus.DEPOSIT_PAID
      );
      const agendadas = bList.filter(b =>
        b.status === BookingStatus.APPROVED ||
        b.status === BookingStatus.DEPOSIT_PAID ||
        b.status === BookingStatus.PENDING_APPROVAL
      );
      const totalGasto = concluidas.reduce((acc, b) => acc + (b.priceEstimated || b.valor_estimado || 0), 0);

      let ultimaDataMs = 0;
      let fotosTattoos: string[] = [];
      let estilos: string[] = [];

      bList.forEach(b => {
        if (b.fotos_referencia && Array.isArray(b.fotos_referencia)) {
          fotosTattoos.push(...b.fotos_referencia);
        }
        if (b.estilo && !estilos.includes(b.estilo)) {
          estilos.push(b.estilo);
        }
        const dataMs = extrairMsDeData(b.date);
        if (dataMs > ultimaDataMs) ultimaDataMs = dataMs;
      });

      const diasSemContato = ultimaDataMs > 0
        ? Math.max(0, Math.floor((agora - ultimaDataMs) / MS_POR_DIA))
        : undefined;

      const desmarcadas = bList.filter(b => 
        b.status === BookingStatus.REJECTED || 
        b.status === BookingStatus.NO_SHOW
      );
      const desmarcouEm = desmarcadas.length > 0 ? desmarcadas[desmarcadas.length - 1].date : undefined;

      // Identifica o agendamento mais recente da lista do cliente
      const sortedBList = [...bList].sort((a, b) => extrairMsDeData(b.date) - extrairMsDeData(a.date));
      const ultimoBooking = sortedBList[0];
      const ultimoStatus = ultimoBooking ? (ultimoBooking.status as string) : undefined;

      const totalSessoes = concluidas.length || (bList.length > 0 ? 1 : 0);
      const bucketTemperatura = calcularBucketTemperatura(diasSemContato, totalSessoes, ultimoStatus);

      clientes.push({
        id: `booking_client_${key}`,
        nome,
        telefone,
        email: '',
        instagram: '',
        bucketTemperatura,
        estagioCiclo: bucketTemperatura as any,
        totalGasto,
        totalSessoes,
        diasSemContato,
        estilosFavoritos: estilos,
        fotosTatuagensFeitas: fotosTattoos,
        agendamentos: bList,
        temSessaoAgendada: agendadas.length > 0,
        desmarcouEm,
        alertaFollowUpAtivo: bucketTemperatura === 'quente' || bucketTemperatura === 'alerta',
        createdAt: first.createdAt || new Date().toISOString(),
        updatedAt: first.createdAt || new Date().toISOString()
      });
    });

    return clientes;
  },

  /** Busca clientes por bucket de temperatura — ideal para queries do bot de IA */
  async getClientesPorBucket(bucket: ClienteCarteiraTempStage): Promise<ClienteCRM[]> {
    const todos = await this.getClientes();
    return todos.filter(c => c.bucketTemperatura === bucket);
  },

  async getInactiveClientes(diasInatividade: number = 30): Promise<ClienteCRM[]> {
    const clientes = await this.getClientes();
    return clientes.filter(c =>
      c.diasSemContato !== undefined && c.diasSemContato >= diasInatividade
    );
  },

  async createCliente(data: Omit<ClienteCRM, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      name: data.nome,
      phone: data.telefone,
      email: data.email || '',
      instagram: data.instagram || '',
      bucketTemperatura: data.bucketTemperatura || 'morno',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async updateCliente(id: string, data: Partial<ClienteCRM>): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, id);
    const payload: Record<string, any> = { updatedAt: serverTimestamp() };
    if (data.nome) payload.name = data.nome;
    if (data.telefone) payload.phone = data.telefone;
    if (data.email !== undefined) payload.email = data.email;
    if (data.instagram !== undefined) payload.instagram = data.instagram;
    if (data.observacoesInternas !== undefined) payload.observacoesInternas = data.observacoesInternas;
    if (data.bucketTemperatura) payload.bucketTemperatura = data.bucketTemperatura;
    await updateDoc(docRef, payload);
  },

  async deleteCliente(id: string): Promise<void> {
    await deleteDoc(doc(db, USERS_COLLECTION, id));
  },

  async salvarObservacoesCliente(clienteId: string, observacoes: string): Promise<void> {
    try {
      await updateDoc(doc(db, USERS_COLLECTION, clienteId), {
        observacoesInternas: observacoes,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Aviso ao salvar observações do cliente:', e);
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

  async enviarMensagemChat(
    clienteId: string,
    mensagem: string,
    remetente: 'cliente' | 'ia' | 'tatuador',
    telefone?: string
  ): Promise<any> {
    const msgPayload: any = {
      clienteId,
      remetente,
      mensagem,
      timestamp: new Date(),
      status: 'enviado'
    };

    try {
      const subCol = collection(db, USERS_COLLECTION, clienteId, 'crm_messages');
      await addDoc(subCol, { ...msgPayload, timestamp: serverTimestamp() });
      msgPayload.status = 'entregue';
    } catch (e) {
      console.warn('Aviso ao salvar mensagem no Firestore:', e);
    }

    if ((remetente === 'tatuador' || remetente === 'ia') && telefone) {
      try {
        whatsappService.sendTextMessage(telefone, mensagem).catch(err => {
          console.warn('Aviso no disparo via WhatsApp Evolution:', err);
        });
      } catch (err) {
        console.warn('Falha no disparo whatsappService:', err);
      }
    }

    return msgPayload;
  },

  // ==========================================
  // DISPARO DE MENSAGENS (WHATSAPP)
  // ==========================================
  async dispararFollowUpCliente(
    cliente: ClienteCRM,
    mensagemCustom?: string
  ): Promise<{ success: boolean; message: string }> {
    const telefone = cliente.telefone;
    if (!telefone) {
      return { success: false, message: 'Cliente sem telefone cadastrado.' };
    }

    // Mensagem varia por temperatura
    let texto = mensagemCustom;
    if (!texto) {
      const bucket = cliente.bucketTemperatura;
      if (bucket === 'quente') {
        texto = `Oi ${cliente.nome}! 😊\n\nPassando aqui pelo Somos 1 Studio para saber como está sua tattoo e se a cicatrização está 100% perfeita!\n\nSe precisar de qualquer dica de cuidados ou quiser dar uma olhada em novas ideias, só me chamar! 🎨`;
      } else if (bucket === 'morno') {
        texto = `Oi ${cliente.nome}! Tudo certo por aí? 🌟\n\nQueremos te ouvir! Como ficou sua tattoo? Poderia nos deixar um review e marcar a gente no Instagram? Conta muito pra nós! ❤️`;
      } else if (bucket === 'esfriando') {
        texto = `Oi ${cliente.nome}! Sentimos a sua falta aqui no Somos 1! 🎨\n\nTemos novidades incríveis chegando e pensamos em você! Quer ver as referências novas? Só dar um oi! 😊`;
      } else if (bucket === 'alerta') {
        texto = `Oi ${cliente.nome}! Passando com uma novidade importante: seus créditos no IndicaAI estão prestes a vencer!\n\nNão perca a oportunidade. Quando podemos agendar sua próxima tattoo? 🔥`;
      } else {
        texto = `Oi ${cliente.nome}! Faz tempo que não te vemos aqui no Somos 1 Studio!\n\nTemos uma promoção especial para clientes que voltam. Bora conversar? 🎉`;
      }
    }

    try {
      await whatsappService.sendViaN8n({
        to: telefone,
        text: texto,
        action: 'followup'
      });
      return { success: true, message: 'Follow-up disparado com sucesso via WhatsApp!' };
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

  /**
   * REATIVAÇÃO: Envia cliente da Carteira de volta para o Funil Comercial na coluna Negociação
   * para fechar um novo trampo. Mantém histórico e vínculo.
   */
  async reativarClienteParaLead(cliente: ClienteCRM): Promise<string> {
    const leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      instagram: cliente.instagram,
      origem: 'manual',
      estagio: 'negociacao',
      temperatura: 'quente',
      ideiaProjeto: `Reativação: Cliente já realizou ${cliente.totalSessoes} sessão(ões). Total gasto: R$ ${cliente.totalGasto}.`,
      estiloTatuagem: (cliente.estilosFavoritos && cliente.estilosFavoritos[0]) || '',
      notasInternas: [
        `Cliente reativado da Carteira em ${new Date().toLocaleDateString('pt-BR')}.`,
        cliente.observacoesInternas || ''
      ].filter(Boolean),
      responsavelAtendimento: 'Tatuador'
    };

    const leadId = await this.createLead(leadData);

    // Marca o cliente na Carteira como "emReativacao" e vincula o lead
    try {
      await updateDoc(doc(db, USERS_COLLECTION, cliente.id), {
        bucketTemperatura: 'emReativacao',
        emReativacaoLeadId: leadId,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Aviso ao atualizar status de reativação do cliente:', e);
    }

    return leadId;
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
    const leadsQualificados = leads.filter(l => l.estagio === 'qualificacao' || l.estagio === 'negociacao').length;
    const leadsAgendados = leads.filter(l => l.estagio === 'agendado' || l.estagio === 'concluido' || l.estagio === 'pos_venda').length;
    const taxaConversao = leads.length > 0 ? (leadsAgendados / leads.length) * 100 : 0;

    const temperaturaCounts = {
      quente: clientes.filter(c => c.bucketTemperatura === 'quente').length,
      morno: clientes.filter(c => c.bucketTemperatura === 'morno').length,
      esfriando: clientes.filter(c => c.bucketTemperatura === 'esfriando').length,
      alerta: clientes.filter(c => c.bucketTemperatura === 'alerta').length,
      expirado: clientes.filter(c => c.bucketTemperatura === 'expirado').length,
      emReativacao: clientes.filter(c => c.bucketTemperatura === 'emReativacao').length,
      desmarcou: clientes.filter(c => c.bucketTemperatura === 'desmarcou').length
    };

    return {
      totalLeads: leads.length,
      leadsNovos,
      leadsQualificados,
      leadsAgendados,
      taxaConversao: Math.round(taxaConversao * 10) / 10,
      totalClientes: clientes.length,
      clientesInativos: temperaturaCounts.esfriando + temperaturaCounts.alerta + temperaturaCounts.expirado,
      totalFollowUpsPendentes: temperaturaCounts.alerta + temperaturaCounts.quente,
      temperaturaCounts
    };
  },

  // ==========================================
  // CONFIGURAÇÃO DOS AGENTES DE IA POR ETAPA (CRUD COMPLETO)
  // ==========================================
  async getStageAgents(): Promise<Record<LeadStage, ColunaAIAgentConfig>> {
    try {
      const snap = await getDocs(collection(db, 'crm_stage_agents'));
      if (snap.empty) {
        return STAGE_AGENTS_NAIA;
      }
      const loaded: Partial<Record<LeadStage, ColunaAIAgentConfig>> = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as ColunaAIAgentConfig;
        if (data.stageId) {
          loaded[data.stageId] = { ...STAGE_AGENTS_NAIA[data.stageId], ...data };
        }
      });
      return { ...STAGE_AGENTS_NAIA, ...loaded };
    } catch (err) {
      console.warn('Erro ao carregar crm_stage_agents do Firestore, usando fallback:', err);
      return STAGE_AGENTS_NAIA;
    }
  },

  async saveStageAgent(config: ColunaAIAgentConfig): Promise<void> {
    try {
      const docRef = doc(db, 'crm_stage_agents', config.stageId);
      await setDoc(docRef, {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Erro ao salvar crm_stage_agent:', err);
      throw err;
    }
  },

  // ==========================================
  // ESTRATÉGIAS DE CAMPANHA & REATIVAÇÃO (CRUD)
  // ==========================================
  async getEstrategias(): Promise<EstrategiaCampanha[]> {
    try {
      const snap = await getDocs(collection(db, 'crm_estrategias'));
      if (snap.empty) {
        return DEFAULT_ESTRATEGIAS;
      }
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as EstrategiaCampanha));
    } catch (err) {
      console.warn('Aviso ao carregar crm_estrategias do Firestore, usando fallback:', err);
      return DEFAULT_ESTRATEGIAS;
    }
  },

  async saveEstrategia(estrategia: EstrategiaCampanha): Promise<void> {
    try {
      const docRef = doc(db, 'crm_estrategias', estrategia.id);
      await setDoc(docRef, {
        ...estrategia,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Erro ao salvar crm_estrategia:', err);
      throw err;
    }
  },

  async deleteEstrategia(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'crm_estrategias', id));
    } catch (err) {
      console.error('Erro ao excluir crm_estrategia:', err);
      throw err;
    }
  }
};
