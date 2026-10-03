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

      // 2. Agendamentos reais da Agenda → alimentam o funil comercial apenas se forem ATIVOS / FUTUROS
      // REGRA: Clientes de sessões passadas/concluídas pertencem exclusivamente à CARTEIRA DE CLIENTES (Esteira de Temperatura).
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

      const todayStr = new Date().toISOString().split('T')[0];
      const MS_POR_DIA = 24 * 60 * 60 * 1000;
      const quinzeDiasAtrasStr = new Date(Date.now() - (15 * MS_POR_DIA)).toISOString().split('T')[0];

      // 1. Agendamentos ATIVOS futuros ou de hoje (para a coluna "Sessão Agendada"):
      const activeBookings = allBookings.filter(b => {
        if (b.status === BookingStatus.COMPLETED) return false;
        const bDate = (b.date || '').split('T')[0];
        // Se tem data informada e é anterior a hoje, já aconteceu
        if (bDate && bDate < todayStr) return false;
        return true;
      });

      // 2. Agendamentos RECENTES concluídos nos últimos 15 dias (para a coluna "Pós-Venda (Cicatrização)"):
      const recentBookings = allBookings.filter(b => {
        const bDate = (b.date || '').split('T')[0];
        const isRecentDate = bDate && bDate >= quinzeDiasAtrasStr && bDate < todayStr;
        const isCompleted = b.status === BookingStatus.COMPLETED || (isRecentDate && b.status === BookingStatus.APPROVED);
        return isCompleted && (isRecentDate || !bDate);
      });

      // Mapeia por telefone normalizado
      const activeBookingsByPhone = new Map<string, Booking>();
      activeBookings.forEach(b => {
        const rawPhone = b.userPhone || (b.userId ? userPhoneMap.get(b.userId) : '') || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone) activeBookingsByPhone.set(cleanPhone, b);
      });

      const recentBookingsByPhone = new Map<string, Booking>();
      recentBookings.forEach(b => {
        const rawPhone = b.userPhone || (b.userId ? userPhoneMap.get(b.userId) : '') || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone) recentBookingsByPhone.set(cleanPhone, b);
      });

      // Atualiza leads manuais existentes: se houver agendamento ativo futuro ou pós-venda recente
      const updatedLeadsManuais = leadsManuais
        .filter(l => {
          // Se for concluído há mais de 15 dias, gradua para a Carteira de Temperatura
          if (l.estagio === 'concluido' || l.estagio === 'pos_venda') {
            const updatedAtMs = l.updatedAt?.toMillis ? l.updatedAt.toMillis() : (l.updatedAt ? new Date(l.updatedAt).getTime() : 0);
            if (updatedAtMs > 0 && updatedAtMs < (Date.now() - 15 * MS_POR_DIA)) {
              return false; // Mais de 15 dias -> vai para Carteira de Temperatura
            }
          }
          return true;
        })
        .map(lead => {
          const cleanPhone = (lead.telefone || '').replace(/\D/g, '');
          const matchingActive = cleanPhone ? activeBookingsByPhone.get(cleanPhone) : null;
          const matchingRecent = cleanPhone ? recentBookingsByPhone.get(cleanPhone) : null;

          if (matchingActive) {
            const dataFmt = matchingActive.date ? matchingActive.date.split('-').reverse().join('/') : '';
            return {
              ...lead,
              estagio: 'agendado' as LeadStage,
              temperatura: 'quente' as const,
              ideiaProjeto: lead.ideiaProjeto || matchingActive.descricao_servico || `Tattoo ${matchingActive.size} em ${dataFmt} às ${matchingActive.time}`,
              spin: {
                ticketEstimado: matchingActive.priceEstimated || matchingActive.valor_estimado || lead.spin?.ticketEstimado || 0,
                urgencia: 'alta' as const
              }
            };
          }

          if (matchingRecent) {
            const dataFmt = matchingRecent.date ? matchingRecent.date.split('-').reverse().join('/') : '';
            return {
              ...lead,
              estagio: 'pos_venda' as LeadStage,
              temperatura: 'quente' as const,
              ideiaProjeto: lead.ideiaProjeto || matchingRecent.descricao_servico || `Tattoo ${matchingRecent.size} (Feita em ${dataFmt})`,
              spin: {
                ticketEstimado: matchingRecent.priceEstimated || matchingRecent.valor_estimado || lead.spin?.ticketEstimado || 0,
                urgencia: 'media' as const
              }
            };
          }

          return lead;
        });

      // E para os bookings que não têm lead manual, cria os cards
      const existingPhones = new Set(updatedLeadsManuais.map(l => (l.telefone || '').replace(/\D/g, '')).filter(Boolean));
      const leadsFromBookings: Lead[] = [];

      // 1. Agendados futuros/hoje:
      activeBookings.forEach(b => {
        const rawPhone = b.userPhone || (b as any).clientPhone || (b.userId ? userPhoneMap.get(b.userId) : '') || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (!cleanPhone || !existingPhones.has(cleanPhone)) {
          let estagio: LeadStage = 'agendado';
          if (b.status === BookingStatus.PENDING_APPROVAL) estagio = 'negociacao';
          else if (b.status === BookingStatus.REJECTED || b.status === BookingStatus.NO_SHOW) estagio = 'followup';

          const dataFmt = b.date ? b.date.split('-').reverse().join('/') : '';
          leadsFromBookings.push({
            id: `booking_${b.id}`,
            nome: b.userName || (b as any).clientName || 'Cliente da Agenda',
            telefone: rawPhone,
            origem: 'site',
            estagio,
            temperatura: 'quente',
            ideiaProjeto: b.descricao_servico || `Tattoo tamanho ${b.size}${dataFmt ? ` (${dataFmt} às ${b.time || ''})` : ''}`,
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
          } as Lead);

          if (cleanPhone) existingPhones.add(cleanPhone);
        }
      });

      // 2. Recém-concluídos (< 15 dias) em Pós-Venda:
      recentBookings.forEach(b => {
        const rawPhone = b.userPhone || (b as any).clientPhone || (b.userId ? userPhoneMap.get(b.userId) : '') || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (!cleanPhone || !existingPhones.has(cleanPhone)) {
          const dataFmt = b.date ? b.date.split('-').reverse().join('/') : '';
          leadsFromBookings.push({
            id: `booking_${b.id}`,
            nome: b.userName || (b as any).clientName || 'Cliente da Agenda',
            telefone: rawPhone,
            origem: 'site',
            estagio: 'pos_venda',
            temperatura: 'quente',
            ideiaProjeto: b.descricao_servico || `Tattoo tamanho ${b.size}${dataFmt ? ` (Feita em ${dataFmt})` : ''}`,
            estiloTatuagem: b.estilo || '',
            tamanhoAproximado: b.size,
            localCorpo: b.regiao_corpo || '',
            fotosReferencia: b.fotos_referencia || [],
            spin: {
              ticketEstimado: b.priceEstimated || b.valor_estimado || 0,
              urgencia: 'media'
            },
            responsavelAtendimento: 'Agenda Oficial',
            createdAt: b.createdAt || new Date().toISOString(),
            updatedAt: b.createdAt || new Date().toISOString()
          } as Lead);

          if (cleanPhone) existingPhones.add(cleanPhone);
        }
      });

      return [...updatedLeadsManuais, ...leadsFromBookings];
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
    const [usersSnap, bookingsSnap] = await Promise.all([
      getDocs(collection(db, USERS_COLLECTION)),
      getDocs(collection(db, BOOKINGS_COLLECTION))
    ]);

    const allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    const agora = Date.now();
    const MS_POR_DIA = 24 * 60 * 60 * 1000;
    const todayStr = new Date().toISOString().split('T')[0];

    // Função utilitária para extrair timestamp seguro mesmo com data no formato "YYYY-MM-DD", "DD/MM/YYYY", ISO ou Timestamp
    const extrairMsDeData = (b: any): number => {
      if (!b) return 0;
      const dateStr = typeof b === 'string' ? b : b.date;
      let ms = 0;
      if (dateStr && typeof dateStr === 'string') {
        const clean = dateStr.trim();
        if (clean.includes('/')) {
          const parts = clean.split(' ')[0].split('/');
          if (parts.length === 3) {
            ms = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 12, 0).getTime();
          }
        } else if (clean.includes('-')) {
          const parts = clean.split(' ')[0].split('T')[0].split('-');
          if (parts.length === 3) {
            ms = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0).getTime();
          }
        }
      }
      if (ms === 0 && typeof b === 'object') {
        if (b.updatedAt?.toMillis) ms = b.updatedAt.toMillis();
        else if (b.createdAt?.toMillis) ms = b.createdAt.toMillis();
        else if (b.createdAt) ms = new Date(b.createdAt).getTime();
      }
      return isNaN(ms) ? 0 : ms;
    };

    const clientes: ClienteCRM[] = usersSnap.docs.map(uDoc => {
      const u = uDoc.data() as UserProfile;
      const uPhoneClean = (u.phone || '').replace(/\D/g, '');
      const userBookings = allBookings.filter(b => {
        if (b.userId && b.userId === uDoc.id) return true;
        if (uPhoneClean && b.userPhone) {
          const bPhoneClean = b.userPhone.replace(/\D/g, '');
          if (bPhoneClean === uPhoneClean) return true;
          if (bPhoneClean.endsWith(uPhoneClean) || uPhoneClean.endsWith(bPhoneClean)) return true;
        }
        return false;
      });

      const concluidas = userBookings.filter(b => 
        b.status === BookingStatus.COMPLETED ||
        (b.status === BookingStatus.APPROVED && b.date && b.date < todayStr)
      );
      const agendadas = userBookings.filter(b =>
        (b.status === BookingStatus.APPROVED ||
        b.status === BookingStatus.DEPOSIT_PAID ||
        b.status === BookingStatus.PENDING_APPROVAL) &&
        (!b.date || b.date >= todayStr)
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
        const dataMs = extrairMsDeData(b);
        if (dataMs > ultimaDataMs) ultimaDataMs = dataMs;
      });

      const diasSemContato = ultimaDataMs > 0
        ? Math.max(0, Math.floor((agora - ultimaDataMs) / MS_POR_DIA))
        : undefined;

      const desmarcadas = userBookings.filter(b => {
        const st = String(b.status || '').toLowerCase().replace('-', '_').trim();
        return st === 'no_show' || st === 'rejected';
      });
      const desmarcouEm = desmarcadas.length > 0 ? desmarcadas[desmarcadas.length - 1].date : undefined;

      // Identifica o agendamento mais recente do cliente para verificar se ele faltou ou desmarcou
      const sortedBookings = [...userBookings].sort((a, b) => extrairMsDeData(b) - extrairMsDeData(a));
      const ultimoBooking = sortedBookings[0];
      const ultimoStatus = ultimoBooking ? (ultimoBooking.status as string) : undefined;
      const normUltimoStatus = (ultimoStatus || '').toLowerCase().replace('-', '_').trim();
      const temNoShow = (normUltimoStatus === 'no_show' || normUltimoStatus === 'rejected') || (u as any).bucketTemperatura === 'desmarcou';

      const totalSessoes = concluidas.length;
      let bucketTemperatura: ClienteCarteiraTempStage;
      if (temNoShow) {
        bucketTemperatura = 'desmarcou';
      } else if ((u as any).bucketTemperatura === 'emReativacao') {
        bucketTemperatura = 'emReativacao';
      } else {
        bucketTemperatura = calcularBucketTemperatura(diasSemContato, totalSessoes, ultimoStatus, false);
      }

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
    const phonesClientes = clientes.map(c => (c.telefone || '').replace(/\D/g, '')).filter(Boolean);
    const mapNomes = new Set(clientes.map(c => (c.nome || '').trim().toLowerCase()).filter(Boolean));

    const bookingsByClient: Record<string, Booking[]> = {};
    allBookings.forEach(b => {
      const cleanPhone = (b.userPhone || '').replace(/\D/g, '');
      const cleanName = (b.userName || '').trim().toLowerCase();
      const phoneMatch = cleanPhone && phonesClientes.some(p => p === cleanPhone || p.endsWith(cleanPhone) || cleanPhone.endsWith(p));
      const isAlreadyCovered = phoneMatch || (cleanName && mapNomes.has(cleanName));
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
        (b.status === BookingStatus.APPROVED && b.date && b.date < todayStr)
      );
      const agendadas = bList.filter(b =>
        (b.status === BookingStatus.APPROVED ||
        b.status === BookingStatus.DEPOSIT_PAID ||
        b.status === BookingStatus.PENDING_APPROVAL) &&
        (!b.date || b.date >= todayStr)
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
        const dataMs = extrairMsDeData(b);
        if (dataMs > ultimaDataMs) ultimaDataMs = dataMs;
      });

      const diasSemContato = ultimaDataMs > 0
        ? Math.max(0, Math.floor((agora - ultimaDataMs) / MS_POR_DIA))
        : undefined;

      const desmarcadas = bList.filter(b => {
        const st = String(b.status || '').toLowerCase().replace('-', '_').trim();
        return st === 'no_show' || st === 'rejected';
      });
      const desmarcouEm = desmarcadas.length > 0 ? desmarcadas[desmarcadas.length - 1].date : undefined;

      // Identifica o agendamento mais recente da lista do cliente
      const sortedBList = [...bList].sort((a, b) => extrairMsDeData(b) - extrairMsDeData(a));
      const ultimoBooking = sortedBList[0];
      const ultimoStatus = ultimoBooking ? (ultimoBooking.status as string) : undefined;
      const normUltimoStatus = (ultimoStatus || '').toLowerCase().replace('-', '_').trim();
      const temNoShow = normUltimoStatus === 'no_show' || normUltimoStatus === 'rejected';

      const totalSessoes = concluidas.length;
      let bucketTemperatura: ClienteCarteiraTempStage;
      if (temNoShow) {
        bucketTemperatura = 'desmarcou';
      } else {
        bucketTemperatura = calcularBucketTemperatura(diasSemContato, totalSessoes, ultimoStatus, false);
      }

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
    await setDoc(docRef, payload, { merge: true });
  },

  async deleteCliente(id: string): Promise<void> {
    if (id.startsWith('booking_client_')) return;
    await deleteDoc(doc(db, USERS_COLLECTION, id));
  },

  async salvarObservacoesCliente(clienteId: string, observacoes: string): Promise<void> {
    try {
      await setDoc(doc(db, USERS_COLLECTION, clienteId), {
        observacoesInternas: observacoes,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Aviso ao salvar observações do cliente:', e);
    }
  },

  async getMensagensChat(clienteId: string, telefone?: string, nome?: string): Promise<any[]> {
    const mensagens: any[] = [];
    const idsVistos = new Set<string>();

    const cleanPhone = telefone ? telefone.replace(/\D/g, '') : '';
    const searchName = (nome || '').toLowerCase().trim();

    // 1. Tenta buscar da subcoleção em users/{clienteId}/crm_messages se clienteId for ID de usuário válido
    try {
      if (clienteId && !clienteId.startsWith('booking_')) {
        const subCol = collection(db, USERS_COLLECTION, clienteId, 'crm_messages');
        const q = query(subCol, orderBy('timestamp', 'asc'));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          if (!idsVistos.has(d.id)) {
            idsVistos.add(d.id);
            mensagens.push({ id: d.id, ...d.data() });
          }
        });
      }
    } catch (e) {
      // Ignora erro se subcoleção não existir
    }

    // 2. Busca na coleção unificada crm_messages pelo telefone normalizado
    if (cleanPhone) {
      try {
        const qPhone = query(
          collection(db, 'crm_messages'),
          where('telefone', '==', cleanPhone)
        );
        const snapPhone = await getDocs(qPhone);
        snapPhone.docs.forEach(d => {
          if (!idsVistos.has(d.id)) {
            idsVistos.add(d.id);
            mensagens.push({ id: d.id, ...d.data() });
          }
        });
      } catch (err) {
        console.warn('Aviso ao buscar crm_messages por telefone:', err);
      }
    }

    // 3. SINCRONIZAÇÃO AO VIVO COM WHATSAPP (EVOLUTION API):
    // Busca as mensagens reais trocadas pelo WhatsApp (suporta tanto telefones regulares quanto @lid)
    try {
      const evoMessages = await this.buscarMensagensEvolutionAoVivo(cleanPhone, searchName);
      if (evoMessages && evoMessages.length > 0) {
        for (const em of evoMessages) {
          if (!idsVistos.has(em.id)) {
            idsVistos.add(em.id);
            mensagens.push(em);
          }
        }
      }
    } catch (evoErr) {
      console.warn('Aviso ao buscar mensagens ao vivo na Evolution API:', evoErr);
    }

    // Ordena mensagens cronologicamente
    mensagens.sort((a, b) => {
      const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
      const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
      return tA - tB;
    });

    return mensagens;
  },

  async buscarMensagensEvolutionAoVivo(cleanPhone: string, searchName: string): Promise<any[]> {
    const EVOLUTION_HOST = 'p01--evolution--6n2dx6dsdlsf.code.run';
    const EVOLUTION_APIKEY = '020F2F224360-40F7-B022-D17AB8E529E2';
    const EVOLUTION_INSTANCE = 'wats';

    const chatsRes = await fetch(`https://${EVOLUTION_HOST}/chat/findChats/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_APIKEY },
      body: JSON.stringify({})
    });
    if (!chatsRes.ok) return [];

    const chatsData = await chatsRes.json();
    const allChats: any[] = Array.isArray(chatsData) ? chatsData : (chatsData.chats || chatsData.records || []);

    const normClean = cleanPhone ? cleanPhone.replace(/^55/, '') : '';
    const first = searchName ? searchName.split(' ')[0].toLowerCase() : '';

    // Encontra TODAS as threads que pertencem a este contato (ex: número direto + JID @lid)
    const matchingChats = allChats.filter(c => {
      const jid = c.remoteJid || c.id || '';
      const alt = c.lastMessage?.key?.remoteJidAlt || '';
      const pName = (c.pushName || c.name || '').toLowerCase();

      const phoneMatch = Boolean(
        cleanPhone && (
          jid.includes(cleanPhone) ||
          jid.includes(normClean) ||
          alt.includes(cleanPhone) ||
          alt.includes(normClean)
        )
      );

      const nameMatch = Boolean(
        first && first.length >= 3 && (pName.includes(first) || first.includes(pName))
      );

      return phoneMatch || nameMatch;
    });

    if (matchingChats.length === 0) return [];

    // Coleta JIDs únicos
    const jidsToFetch = Array.from(new Set(matchingChats.map(c => c.remoteJid || c.id).filter(Boolean)));

    // Busca mensagens em paralelo para todos os JIDs vinculados
    const messagePromises = jidsToFetch.map(async (remoteJid) => {
      try {
        const msgRes = await fetch(`https://${EVOLUTION_HOST}/chat/findMessages/${EVOLUTION_INSTANCE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_APIKEY },
          body: JSON.stringify({
            where: { key: { remoteJid } },
            limit: 40
          })
        });
        if (!msgRes.ok) return [];
        const msgData = await msgRes.json();
        return (msgData.messages?.records || []) as any[];
      } catch (err) {
        console.warn(`Erro ao buscar mensagens do JID ${remoteJid}:`, err);
        return [];
      }
    });

    const results = await Promise.all(messagePromises);
    const combinedRecords: any[] = results.flat();

    const seenIds = new Set<string>();
    const formatted: any[] = [];

    for (const r of combinedRecords) {
      const msgId = r.key?.id || r.id;
      if (!msgId || seenIds.has(msgId)) continue;
      seenIds.add(msgId);

      const fromMe = Boolean(r.key?.fromMe);
      const msgObj = r.message || {};
      let text = msgObj.conversation || msgObj.extendedTextMessage?.text || '';
      if (!text && msgObj.imageMessage) text = '📸 [Foto enviada]';
      if (!text && msgObj.audioMessage) text = '🎵 [Áudio enviado]';
      if (!text) text = '[Mensagem]';

      formatted.push({
        id: msgId,
        remetente: fromMe ? 'tatuador' : 'cliente',
        mensagem: text,
        timestamp: new Date((r.messageTimestamp || Date.now() / 1000) * 1000),
        status: 'entregue'
      });
    }

    return formatted;
  },

  async enviarMensagemChat(
    clienteId: string,
    mensagem: string,
    remetente: 'cliente' | 'ia' | 'tatuador',
    telefone?: string
  ): Promise<any> {
    const cleanPhone = telefone ? telefone.replace(/\D/g, '') : '';
    const msgPayload: any = {
      clienteId,
      telefone: cleanPhone,
      remetente,
      mensagem,
      timestamp: new Date(),
      status: 'enviado'
    };

    // 1. Salva na coleção unificada crm_messages
    try {
      await addDoc(collection(db, 'crm_messages'), {
        ...msgPayload,
        timestamp: serverTimestamp()
      });
      msgPayload.status = 'entregue';
    } catch (e) {
      console.warn('Aviso ao salvar mensagem em crm_messages:', e);
    }

    // 2. Salva na subcoleção do usuário se clienteId for um user real
    if (clienteId && !clienteId.startsWith('booking_')) {
      try {
        const subCol = collection(db, USERS_COLLECTION, clienteId, 'crm_messages');
        await addDoc(subCol, { ...msgPayload, timestamp: serverTimestamp() });
      } catch (e) {
        // silencioso
      }
    }

    // 3. Dispara no WhatsApp via Evolution API se for envio do tatuador ou IA
    if ((remetente === 'tatuador' || remetente === 'ia') && cleanPhone) {
      try {
        whatsappService.sendMessage(cleanPhone, mensagem, null, 'followup').catch(err => {
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
      await setDoc(doc(db, USERS_COLLECTION, cliente.id), {
        bucketTemperatura: 'emReativacao',
        emReativacaoLeadId: leadId,
        updatedAt: serverTimestamp()
      }, { merge: true });
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
    const leadsQualificados = leads.filter(l => l.estagio === 'qualificacao').length;
    const leadsNegociacao = leads.filter(l => l.estagio === 'negociacao' || l.estagio === 'pronto').length;
    const leadsAgendados = leads.filter(l => l.estagio === 'agendado').length;
    const leadsConcluidos = leads.filter(l => l.estagio === 'concluido' || l.estagio === 'pos_venda').length;

    const totalConvertidos = leadsAgendados + leadsConcluidos;
    const leadsAtivos = leads.filter(l => l.estagio !== 'perdido').length;
    const taxaConversao = leadsAtivos > 0 ? (totalConvertidos / leadsAtivos) * 100 : 0;
    const taxaQualificacao = leads.length > 0 ? ((leadsQualificados + leadsNegociacao + totalConvertidos) / leads.length) * 100 : 0;
    const taxaFechamento = (leadsNegociacao + totalConvertidos) > 0 ? (totalConvertidos / (leadsNegociacao + totalConvertidos)) * 100 : 0;

    // Pipeline estimado (valor potencial em negociação e agendado)
    const pipelineEstimado = leads
      .filter(l => l.estagio === 'negociacao' || l.estagio === 'pronto' || l.estagio === 'agendado')
      .reduce((acc, l) => acc + (l.spin?.ticketEstimado || l.orcamentoMaximo || 0), 0);

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
      leadsNegociacao,
      leadsAgendados,
      leadsConcluidos,
      taxaConversao: Math.round(taxaConversao * 10) / 10,
      taxaQualificacao: Math.round(taxaQualificacao * 10) / 10,
      taxaFechamento: Math.round(taxaFechamento * 10) / 10,
      pipelineEstimado,
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
  },

  /**
   * Sincroniza em tempo real a mudança de status da agenda no CRM (leads e carteira)
   */
  async syncBookingToCRM(booking: Booking, nextStatus: BookingStatus): Promise<void> {
    if (!booking) return;
    const norm = String(nextStatus).toLowerCase().replace('-', '_').trim();
    const cleanBookingPhone = (booking.userPhone || '').replace(/\D/g, '');
    
    // 1. Atualiza documento do usuário/cliente no users se houver userId ou telefone
    try {
      let userDocId = booking.userId;
      if (!userDocId && cleanBookingPhone) {
        const uSnap = await getDocs(collection(db, USERS_COLLECTION));
        const matched = uSnap.docs.find(d => {
          const uData = d.data();
          const p = (uData.phone || uData.telefone || '').replace(/\D/g, '');
          return p && (p === cleanBookingPhone || p.endsWith(cleanBookingPhone) || cleanBookingPhone.endsWith(p));
        });
        if (matched) userDocId = matched.id;
      }

      if (userDocId) {
        const userRef = doc(db, USERS_COLLECTION, userDocId);
        const updatePayload: Record<string, any> = { updatedAt: serverTimestamp() };
        if (norm === 'no_show' || norm === 'rejected') {
          updatePayload.bucketTemperatura = 'desmarcou';
          updatePayload.desmarcouEm = booking.date || new Date().toISOString();
        } else if (norm === 'completed') {
          updatePayload.bucketTemperatura = 'quente';
          updatePayload.ultimaSessaoEm = booking.date || new Date().toISOString();
        }
        await updateDoc(userRef, updatePayload);
      } else if (cleanBookingPhone && (norm === 'no_show' || norm === 'rejected')) {
        // Se o cliente ainda não tinha cadastro na tabela users mas faltou, cria o registro para aparecer em desmarcou
        await addDoc(collection(db, USERS_COLLECTION), {
          name: booking.userName || 'Cliente Estúdio',
          phone: booking.userPhone,
          role: 'user',
          bucketTemperatura: 'desmarcou',
          desmarcouEm: booking.date || new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn('syncBookingToCRM [user]:', err);
    }

    // 2. Atualiza lead correspondente no funil se existir
    try {
      let leadDocRef: any = null;
      if (booking.id) {
        const leadRef = doc(db, LEADS_COLLECTION, `booking_${booking.id}`);
        const leadSnap = await getDoc(leadRef);
        if (leadSnap.exists()) {
          leadDocRef = leadRef;
        }
      }

      if (!leadDocRef && cleanBookingPhone) {
        const qSnap = await getDocs(query(collection(db, LEADS_COLLECTION), where('telefone', '==', cleanBookingPhone)));
        if (!qSnap.empty) {
          leadDocRef = doc(db, LEADS_COLLECTION, qSnap.docs[0].id);
        }
      }

      if (!leadDocRef && booking.userName) {
        const qSnap = await getDocs(query(collection(db, LEADS_COLLECTION), where('nome', '==', booking.userName)));
        if (!qSnap.empty) {
          leadDocRef = doc(db, LEADS_COLLECTION, qSnap.docs[0].id);
        }
      }

      const novoEstagio: LeadStage = norm === 'completed' ? 'pos_venda' : 'followup';
      const novaTemp: 'quente' | 'morno' = norm === 'completed' ? 'quente' : 'morno';

      const orcamentoEstimado = booking.priceEstimated || booking.valor_estimado;

      if (leadDocRef) {
        const leadUpdate: Record<string, any> = {
          estagio: novoEstagio,
          temperatura: novaTemp,
          updatedAt: serverTimestamp()
        };
        if (orcamentoEstimado) {
          leadUpdate.orcamentoMaximo = Number(orcamentoEstimado);
        }
        await updateDoc(leadDocRef, leadUpdate);
      } else {
        // Se ainda não existia lead correspondente, cria para que apareça na coluna certa do Funil
        const newLeadPayload: any = {
          nome: booking.userName || 'Cliente Estúdio',
          telefone: booking.userPhone || '',
          estagio: novoEstagio,
          temperatura: novaTemp,
          origem: 'agenda',
          ultimaMensagem: norm === 'completed' ? 'Sessão concluída com sucesso!' : 'Cliente não compareceu à sessão.',
          pilotoIA: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (orcamentoEstimado) {
          newLeadPayload.orcamentoMaximo = Number(orcamentoEstimado);
        }
        await addDoc(collection(db, LEADS_COLLECTION), newLeadPayload);
      }
    } catch (err) {
      console.warn('syncBookingToCRM [lead]:', err);
    }
  },

  // ==========================================
  // CONTATOS IGNORADOS (BLACKLIST)
  // ==========================================
  async ignorarContato(telefone: string, motivo: string = 'Marcado manualmente'): Promise<void> {
    const normalizedPhone = telefone.replace(/\D/g, '');
    if (!normalizedPhone) return;
    // Use phone as document ID for idempotency
    await setDoc(doc(db, 'contatos_ignorados', normalizedPhone), {
      telefone: normalizedPhone,
      motivo,
      dataIgnorado: serverTimestamp()
    });
    // Also delete any existing lead with this phone
    const q = query(collection(db, LEADS_COLLECTION), where('telefone', '==', normalizedPhone));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, LEADS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  },

  async removerContatoIgnorado(telefone: string): Promise<void> {
    const normalizedPhone = telefone.replace(/\D/g, '');
    if (!normalizedPhone) return;
    await deleteDoc(doc(db, 'contatos_ignorados', normalizedPhone));
  },

  async getContatosIgnorados(): Promise<{ telefone: string; motivo: string; dataIgnorado: any }[]> {
    const snap = await getDocs(collection(db, 'contatos_ignorados'));
    return snap.docs.map(d => ({ telefone: d.id, ...d.data() } as any));
  },

  // ==========================================
  // CONFIRMAÇÃO DE PRESENÇA ESTILO GOOGLE (1-CLIQUE)
  // ==========================================
  async getSessoesParaConfirmar(): Promise<{
    id: string;
    nome: string;
    telefone: string;
    data: string;
    hora: string;
    tamanho: string;
    estilo?: string;
    status: string;
    booking: Booking;
  }[]> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const snap = await getDocs(collection(db, BOOKINGS_COLLECTION));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Filtra agendamentos cuja data seja hoje ou anterior e que ainda constem como aprovados
      const pendentes = all.filter(b => {
        const st = String(b.status || '').toLowerCase().replace('-', '_').trim();
        const isApproved = st === 'approved' || st === 'deposit_paid';
        if (!isApproved) return false;
        const bDate = (b.date || '').split('T')[0];
        if (!bDate) return false;
        return bDate <= todayStr;
      });

      // Ordena decrescente: sessões de hoje primeiro, e por horário mais recente
      pendentes.sort((a, b) => {
        const dateDiff = (b.date || '').localeCompare(a.date || '');
        if (dateDiff !== 0) return dateDiff;
        return (b.time || '').localeCompare(a.time || '');
      });

      return pendentes.map(b => ({
        id: b.id,
        nome: b.userName || b.clientName || 'Cliente Estúdio',
        telefone: b.userPhone || b.clientPhone || '',
        data: b.date,
        hora: b.time || '10:00',
        tamanho: b.size || 'Média',
        estilo: b.estilo || '',
        status: b.status,
        booking: b
      }));
    } catch (e) {
      console.warn('Erro ao buscar sessoesParaConfirmar:', e);
      return [];
    }
  },

  async enviarAlertaPresencaWhatsApp(sessao: any): Promise<boolean> {
    const adminPhone = '5511948116922';
    const dataFmt = sessao.data ? sessao.data.split('-').reverse().join('/') : 'Hoje';
    const msg = `🔔 *Confirmação de Presença — Somos 1 Tattoo*\n\nMarkinhos, o cliente *${sessao.nome}* compareceu à sessão das *${sessao.hora}* (${dataFmt})?\n\nResponda diretamente aqui com:\n✅ *Sim, compareceu*\n❌ *Não compareceu*\n\n(Ou responda com áudio ou texto natural que o robô já atualiza a agenda e o CRM no app! 👊 ⚔️🛡️)`;
    
    try {
      const ok = await whatsappService.sendViaN8n({
        to: adminPhone,
        text: msg,
        action: 'lembrete'
      });
      if (ok) return true;
      return await whatsappService.sendDirectEvolution(adminPhone, msg);
    } catch (e) {
      console.warn('Erro ao enviar alerta WhatsApp de presença:', e);
      return false;
    }
  },

  async concluirSessoesAntigasEmLote(diasAtras: number = 15): Promise<number> {
    const cutoff = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sessoes = await this.getSessoesParaConfirmar();
    const antigas = sessoes.filter(s => s.data && s.data < cutoff);
    for (const sessao of antigas) {
      await this.confirmarPresencaBooking(sessao.id, true, sessao.booking);
    }
    return antigas.length;
  },

  async confirmarPresencaBooking(bookingId: string, compareceu: boolean, bookingData?: any): Promise<void> {
    const nextStatus = compareceu ? BookingStatus.COMPLETED : BookingStatus.NO_SHOW;
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);

    // 1. Atualiza status do agendamento
    await updateDoc(bookingRef, {
      status: nextStatus,
      updatedAt: serverTimestamp()
    });

    // 2. Busca dados completos se não vieram
    let bData = bookingData;
    if (!bData) {
      const bSnap = await getDoc(bookingRef);
      if (bSnap.exists()) {
        bData = { id: bSnap.id, ...bSnap.data() };
      }
    }

    // 3. Dispara sincronização em cadeia com Funil e Carteira de Temperatura
    if (bData) {
      await this.syncBookingToCRM(bData, nextStatus);

      // 4. Cascata para agendamentos duplicados do mesmo cliente na mesma data
      try {
        const cleanPhone = (bData.userPhone || bData.clientPhone || '').replace(/\D/g, '');
        const clientName = (bData.userName || bData.clientName || '').trim().toLowerCase();
        const bookingDate = (bData.date || '').split('T')[0];

        const allSnap = await getDocs(collection(db, BOOKINGS_COLLECTION));
        const duplicates = allSnap.docs.filter(d => {
          if (d.id === bookingId) return false;
          const data = d.data();
          const dDate = (data.date || '').split('T')[0];
          if (bookingDate && dDate !== bookingDate) return false;

          const dPhone = (data.userPhone || data.clientPhone || '').replace(/\D/g, '');
          const dName = (data.userName || data.clientName || '').trim().toLowerCase();

          const samePhone = cleanPhone && dPhone && (dPhone === cleanPhone || dPhone.endsWith(cleanPhone) || cleanPhone.endsWith(dPhone));
          const sameName = Boolean(clientName && dName && (clientName === dName || dName.includes(clientName) || clientName.includes(dName)));

          return samePhone || sameName;
        });

        for (const dup of duplicates) {
          await updateDoc(doc(db, BOOKINGS_COLLECTION, dup.id), {
            status: nextStatus,
            updatedAt: serverTimestamp()
          });
        }
      } catch (errDup) {
        console.warn('Erro ao atualizar duplicatas de booking:', errDup);
      }
    }
  }
};

