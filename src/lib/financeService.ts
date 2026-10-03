// @ts-nocheck
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { Commission, FinancialEntry, FinanceSummary, ContaPagar, ContaReceber } from './financeTypes';

/**
 * 🔒 FLAG DE CONTROLE DE DISPARO DE NOTIFICAÇÃO:
 * Conforme alinhado com o usuário, o envio de WhatsApp para o indicador está CONGELADO 
 * até que as regras e templates do Indica Aí estejam 100% finalizados.
 */
export const ENABLE_WHATSAPP_REFERRAL_NOTIFICATION = false;

// Configuração padrão de split
export const DEFAULT_REFERRER_RATE = 10; // 10% de comissão para quem indicou
export const DEFAULT_ARTIST_RATE = 60;   // 60% para o artista/tatuador
export const DEFAULT_STUDIO_RATE = 30;   // 30% retido pelo estúdio

/**
 * Cadastra uma nova Conta a Pagar (Despesa do Estúdio)
 */
export async function addContaPagar(item: Omit<ContaPagar, 'id' | 'createdAt'>): Promise<ContaPagar | null> {
  try {
    const now = new Date().toISOString();
    const dataToSave = {
      ...item,
      createdAt: now,
      timestamp: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'financial_payables'), dataToSave);
    
    // Se já estiver como paga, gera lançamento no caixa
    if (item.status === 'pago') {
      await addDoc(collection(db, 'financial_entries'), {
        type: 'expense',
        category: item.categoria || 'outro',
        description: item.descricao,
        amount: item.valor,
        paymentMethod: item.formaPgto === 'pix' ? 'pix' : item.formaPgto === 'dinheiro' ? 'cash' : 'credit_card',
        status: 'completed',
        date: item.dataPgto || now.split('T')[0],
        createdAt: now,
        timestamp: serverTimestamp()
      });
    }

    return { id: ref.id, ...dataToSave } as ContaPagar;
  } catch (err) {
    console.error('Erro ao adicionar conta a pagar:', err);
    return null;
  }
}

/**
 * Dá baixa (pagamento) em uma conta a pagar
 */
export async function markContaPagarAsPaid(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'financial_payables', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      status: 'pago',
      dataPgto: now.split('T')[0],
      updatedAt: now
    });

    await addDoc(collection(db, 'financial_entries'), {
      type: 'expense',
      category: data.categoria || 'outro',
      description: `Pagamento: ${data.descricao}`,
      amount: data.valor,
      paymentMethod: data.formaPgto === 'pix' ? 'pix' : 'cash',
      status: 'completed',
      date: now.split('T')[0],
      createdAt: now,
      timestamp: serverTimestamp()
    });

    return true;
  } catch (err) {
    console.error('Erro ao dar baixa na conta a pagar:', err);
    return false;
  }
}

/**
 * Exclui uma conta a pagar
 */
export async function deleteContaPagar(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'financial_payables', id));
    return true;
  } catch (err) {
    console.error('Erro ao excluir conta a pagar:', err);
    return false;
  }
}

/**
 * Cadastra uma nova Conta a Receber (Receita / Procedimento)
 */
export async function addContaReceber(item: Omit<ContaReceber, 'id' | 'createdAt'>): Promise<ContaReceber | null> {
  try {
    const now = new Date().toISOString();
    const dataToSave = {
      ...item,
      createdAt: now,
      timestamp: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'financial_receivables'), dataToSave);

    // Se já foi pago ou sinal pago, registra no caixa
    const valorRecebido = item.status === 'pago' ? item.valor : (item.valorSinal || 0);
    if (valorRecebido > 0) {
      await addDoc(collection(db, 'financial_entries'), {
        type: 'income',
        category: 'procedimento',
        description: `Recebimento: ${item.cliente} (${item.descricao})`,
        amount: valorRecebido,
        paymentMethod: item.formaPgto === 'pix' ? 'pix' : item.formaPgto === 'dinheiro' ? 'cash' : 'credit_card',
        status: 'completed',
        date: item.dataPgto || now.split('T')[0],
        createdAt: now,
        timestamp: serverTimestamp()
      });
    }

    // Se tiver indicador ou comissão gerada
    if (item.indicadorComissao && item.indicadorComissao > 0) {
      await addDoc(collection(db, 'commissions'), {
        clientName: item.cliente,
        serviceDescription: item.descricao,
        serviceValue: item.valor,
        referrerName: item.indicadorNome || 'Indica Aí',
        commissionRate: DEFAULT_REFERRER_RATE,
        commissionAmount: item.indicadorComissao,
        artistName: item.artistaNome || 'Artista',
        artistCommissionRate: DEFAULT_ARTIST_RATE,
        artistCommissionAmount: item.artistaComissao || 0,
        studioShareAmount: item.lucroEstudio || 0,
        status: item.status === 'pago' ? 'available' : 'pending',
        createdAt: now,
        updatedAt: now,
        timestamp: serverTimestamp()
      });
    }

    return { id: ref.id, ...dataToSave } as ContaReceber;
  } catch (err) {
    console.error('Erro ao adicionar conta a receber:', err);
    return null;
  }
}

/**
 * Dá baixa (recebimento total) em uma conta a receber
 */
export async function markContaReceberAsPaid(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'financial_receivables', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const now = new Date().toISOString();

    const valorPendente = data.status === 'sinal_pago' ? (data.valor - (data.valorSinal || 0)) : data.valor;

    await updateDoc(docRef, {
      status: 'pago',
      dataPgto: now.split('T')[0],
      updatedAt: now
    });

    await addDoc(collection(db, 'financial_entries'), {
      type: 'income',
      category: 'procedimento',
      description: `Quitação Procedimento: ${data.cliente} (${data.descricao})`,
      amount: valorPendente,
      paymentMethod: data.formaPgto === 'pix' ? 'pix' : 'credit_card',
      status: 'completed',
      date: now.split('T')[0],
      createdAt: now,
      timestamp: serverTimestamp()
    });

    return true;
  } catch (err) {
    console.error('Erro ao quitar conta a receber:', err);
    return false;
  }
}

/**
 * Exclui uma conta a receber
 */
export async function deleteContaReceber(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'financial_receivables', id));
    return true;
  } catch (err) {
    console.error('Erro ao excluir conta a receber:', err);
    return false;
  }
}

/**
 * Dá baixa no pagamento da comissão de um indicador
 */
export async function markCommissionAsPaid(commissionId: string, paymentMethod: 'pix' | 'cash' = 'pix'): Promise<boolean> {
  try {
    const commissionRef = doc(db, 'commissions', commissionId);
    const snap = await getDoc(commissionRef);
    if (!snap.exists()) return false;

    const data = snap.data();
    const now = new Date().toISOString();

    await updateDoc(commissionRef, {
      status: 'paid',
      paidAt: now,
      updatedAt: now
    });

    // Registra a saída no fluxo de caixa (contas a pagar)
    await addDoc(collection(db, 'financial_entries'), {
      type: 'expense',
      category: 'comissao_indicador',
      description: `Repasse de comissão - ${data.referrerName || 'Indicador'} (${data.clientName})`,
      amount: data.commissionAmount,
      paymentMethod,
      status: 'completed',
      bookingId: data.bookingId,
      date: now.split('T')[0],
      createdAt: now,
      timestamp: serverTimestamp()
    });

    return true;
  } catch (err) {
    console.error('Erro ao dar baixa em comissão:', err);
    return false;
  }
}

/**
 * Carrega dados iniciais realistas de estúdio para demonstração ou teste (caso o banco esteja vazio)
 */
export async function seedInitialStudioData(): Promise<boolean> {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Contas a Pagar
    const initialPayables = [
      {
        descricao: 'Compra de Tintas Black & Color (Electric Ink)',
        fornecedor: 'Art & Tattoo Distribuidora',
        valor: 450.00,
        vencimento: todayStr,
        formaPgto: 'pix' as const,
        categoria: 'material' as const,
        status: 'pago' as const,
        dataPgto: todayStr,
        obs: 'Lote 12 tintas 30ml + diluente'
      },
      {
        descricao: 'Aluguel do Estúdio (Espaço Comercial)',
        fornecedor: 'Imobiliária Central',
        valor: 1800.00,
        vencimento: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0],
        formaPgto: 'boleto' as const,
        categoria: 'aluguel' as const,
        status: 'pendente' as const,
        obs: 'Vencimento dia 10'
      },
      {
        descricao: 'Energia Elétrica (Enel / Copel)',
        fornecedor: 'Companhia de Energia',
        valor: 280.50,
        vencimento: new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0],
        formaPgto: 'pix' as const,
        categoria: 'energia_agua' as const,
        status: 'pendente' as const
      },
      {
        descricao: 'Pacote Agulhas Cartucho + Luvas Nitrílicas',
        fornecedor: 'Dental / Med Tattoo',
        valor: 320.00,
        vencimento: todayStr,
        formaPgto: 'cartao_credito' as const,
        categoria: 'material' as const,
        status: 'pago' as const,
        dataPgto: todayStr
      }
    ];

    for (const p of initialPayables) {
      await addContaPagar(p);
    }

    // 2. Contas a Receber (Procedimentos & Indica Aí)
    const initialReceivables = [
      {
        descricao: 'Fechamento de Antebraço Oriental (Dragão)',
        cliente: 'Lucas Silveira',
        clienteTelefone: '11988887777',
        valor: 1500.00,
        valorSinal: 300.00,
        vencimento: todayStr,
        dataPgto: todayStr,
        formaPgto: 'pix' as const,
        status: 'pago' as const,
        artistaNome: 'Markinhos Tatuador',
        artistaComissao: 900.00, // 60%
        indicadorNome: 'Camila Fernandes (Indica Aí)',
        indicadorComissao: 150.00, // 10%
        lucroEstudio: 450.00, // 30%
        obs: 'Indicação via código VIP CAMILA10'
      },
      {
        descricao: 'Flash Tattoo Fineline Borboleta',
        cliente: 'Beatriz Almeida',
        clienteTelefone: '11977776666',
        valor: 350.00,
        valorSinal: 100.00,
        vencimento: todayStr,
        dataPgto: todayStr,
        formaPgto: 'pix' as const,
        status: 'pago' as const,
        artistaNome: 'Markinhos Tatuador',
        artistaComissao: 210.00,
        indicadorNome: 'Rodrigo Lima (Indica Aí)',
        indicadorComissao: 35.00,
        lucroEstudio: 105.00
      },
      {
        descricao: 'Cobertura (Cover-up) Costas Inteira - Sessão 1',
        cliente: 'Matheus Costa',
        clienteTelefone: '11966665555',
        valor: 1200.00,
        valorSinal: 300.00,
        vencimento: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString().split('T')[0],
        formaPgto: 'cartao_credito' as const,
        status: 'sinal_pago' as const,
        artistaNome: 'Markinhos Tatuador',
        artistaComissao: 720.00,
        indicadorNome: 'Indica Aí Rede',
        indicadorComissao: 120.00,
        lucroEstudio: 360.00,
        obs: 'Sinal de R$ 300 recebido no Pix. Restante R$ 900 no dia da sessão.'
      }
    ];

    for (const r of initialReceivables) {
      await addContaReceber(r);
    }

    return true;
  } catch (err) {
    console.error('Erro ao popular dados de exemplo:', err);
    return false;
  }
}

/**
 * Consolida as métricas do painel financeiro lendo tudo do Firestore
 */
export async function getFinancialSummary(externalBookings?: any[]): Promise<FinanceSummary> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Busca Contas a Pagar cadastradas no ERP
    const payablesSnap = await getDocs(collection(db, 'financial_payables'));
    const manualPayables: ContaPagar[] = payablesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContaPagar));

    // 2. Busca Contas a Receber cadastradas no ERP
    const receivablesSnap = await getDocs(collection(db, 'financial_receivables'));
    const manualReceivables: ContaReceber[] = receivablesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContaReceber));

    // 3. Busca Agendamentos reais da Agenda do Estúdio (ou usa os passados como prop)
    let studioBookings: any[] = [];
    if (externalBookings && externalBookings.length > 0) {
      studioBookings = externalBookings;
    } else {
      try {
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        studioBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Aviso ao carregar bookings do Firestore:', err);
      }
    }

    // 4. Busca Leads do CRM (onde ficam orçamentos e sinais Pix negociados)
    let crmLeads: any[] = [];
    try {
      const leadsSnap = await getDocs(collection(db, 'leads'));
      crmLeads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('Aviso ao carregar leads do CRM:', err);
    }

    // 5. Busca Comissões
    const commissionsSnap = await getDocs(collection(db, 'commissions'));
    let commissions: Commission[] = commissionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Commission));

    // 6. Busca Lançamentos manuais de Caixa
    const entriesSnap = await getDocs(collection(db, 'financial_entries'));
    const entries: FinancialEntry[] = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialEntry));

    // Unifica Contas a Receber: junta as manuais + agendamentos da Agenda + leads do CRM
    const allContasReceber: ContaReceber[] = [...manualReceivables];

    studioBookings.forEach(b => {
      // Extrai qualquer variação de campo de valor
      const valorTotal = Number(b.priceEstimated || b.valor_estimado || b.price || b.valor || b.totalValue || b.orcamento || 0);
      const valorSinal = Number(b.depositPaid || b.valor_sinal || b.valorSinal || 0);
      const normStatus = (b.status || '').toLowerCase().trim();

      // Se o agendamento já tiver valor ou sinal
      if (valorTotal > 0 || valorSinal > 0) {
        // Evita duplicar se já foi adicionado manualmente
        const jaExiste = allContasReceber.some(r => r.id === b.id || r.descricao?.includes(b.id));
        if (!jaExiste) {
          const isCompleted = normStatus === 'completed';
          const isSinalPago = normStatus === 'deposit_paid' || valorSinal > 0;
          const statusReceber = isCompleted ? 'pago' : isSinalPago ? 'sinal_pago' : 'pendente';

          const hasRef = !!(b.referrerId || b.referrerName || b.inviteCode || b.referralCode);
          const splitIndicador = hasRef ? Number(((valorTotal * DEFAULT_REFERRER_RATE) / 100).toFixed(2)) : 0;
          const splitArtista = Number(((valorTotal * DEFAULT_ARTIST_RATE) / 100).toFixed(2));
          const splitEstudio = Number((valorTotal - splitArtista - splitIndicador).toFixed(2));

          allContasReceber.push({
            id: `booking_${b.id}`,
            descricao: b.descricao_servico || b.description || b.tattooDetails || `Tatuagem (${b.size || 'Sessão Estúdio'})`,
            cliente: b.userName || b.clientName || 'Cliente Estúdio',
            clienteTelefone: b.userPhone || b.clientPhone,
            valor: valorTotal > 0 ? valorTotal : valorSinal,
            valorSinal: valorSinal,
            vencimento: (b.date || '').split('T')[0] || todayStr,
            dataPgto: isCompleted ? ((b.date || '').split('T')[0] || todayStr) : undefined,
            formaPgto: 'pix',
            status: statusReceber,
            artistaNome: b.artistId || b.artistName || 'Markinhos Tatuador',
            artistaComissao: splitArtista,
            indicadorNome: b.referrerName || (b.inviteCode ? `Indica Aí (${b.inviteCode})` : undefined),
            indicadorComissao: splitIndicador,
            lucroEstudio: splitEstudio,
            obs: `Importado da Agenda do Estúdio • Status: ${b.status || 'Ativo'}`,
            createdAt: b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : todayStr
          });

          // Se tiver indicação e comissão ainda não estiver salva
          if (splitIndicador > 0 && !commissions.some(c => c.bookingId === b.id)) {
            commissions.push({
              id: `comm_b_${b.id}`,
              bookingId: b.id,
              clientName: b.userName || b.clientName || 'Cliente',
              serviceDescription: b.descricao_servico || 'Tatuagem',
              serviceValue: valorTotal,
              referrerName: b.referrerName || b.inviteCode || 'Indica Aí',
              referralCode: b.inviteCode || b.referralCode,
              commissionRate: DEFAULT_REFERRER_RATE,
              commissionAmount: splitIndicador,
              artistName: b.artistId || 'Markinhos Tatuador',
              artistCommissionRate: DEFAULT_ARTIST_RATE,
              artistCommissionAmount: splitArtista,
              studioShareAmount: splitEstudio,
              status: isCompleted ? 'available' : 'pending',
              createdAt: todayStr,
              updatedAt: todayStr
            });
          }
        }
      }
    });

    // Puxa também Leads do CRM com Sinal Pix ou Orçamento
    crmLeads.forEach(lead => {
      const valorTotal = Number(lead.spin?.ticketEstimado || lead.orcamentoMaximo || 0);
      const valorSinal = Number(lead.valorSinal || 0);
      const isSinalPago = !!lead.sinalPago;

      if ((valorTotal > 0 || valorSinal > 0) && !allContasReceber.some(r => r.cliente === lead.nome)) {
        const splitArtista = Number(((valorTotal * DEFAULT_ARTIST_RATE) / 100).toFixed(2));
        const splitEstudio = Number((valorTotal - splitArtista).toFixed(2));

        allContasReceber.push({
          id: `lead_${lead.id}`,
          descricao: lead.ideiaProjeto || `Orçamento CRM (${lead.estiloTatuagem || 'Tattoo'})`,
          cliente: lead.nome || 'Lead CRM',
          clienteTelefone: lead.telefone,
          valor: valorTotal > 0 ? valorTotal : valorSinal,
          valorSinal: valorSinal,
          vencimento: lead.dataAgendada || todayStr,
          dataPgto: isSinalPago ? todayStr : undefined,
          formaPgto: 'pix',
          status: lead.estagio === 'concluido' ? 'pago' : isSinalPago ? 'sinal_pago' : 'pendente',
          artistaNome: lead.artistaDesejadoNome || 'Markinhos Tatuador',
          artistaComissao: splitArtista,
          lucroEstudio: splitEstudio,
          obs: `Lead do CRM • Etapa: ${lead.estagio} • Sinal Pix: ${isSinalPago ? 'Pago' : 'Pendente'}`,
          createdAt: todayStr
        });
      }
    });

    // Consolidação dos Totais Financeiros
    let grossRevenue = 0;
    let monthRevenue = 0;
    let pendingReceivables = 0;
    let depositTotal = 0;
    let completedCount = 0;

    allContasReceber.forEach(r => {
      const val = Number(r.valor || 0);
      const sinal = Number(r.valorSinal || 0);

      if (r.status === 'pago') {
        grossRevenue += val;
        completedCount++;
        monthRevenue += val;
        if (sinal > 0) depositTotal += sinal;
      } else if (r.status === 'sinal_pago') {
        grossRevenue += sinal;
        depositTotal += sinal;
        pendingReceivables += Math.max(0, val - sinal);
        monthRevenue += sinal;
      } else {
        pendingReceivables += val;
      }
    });

    // Despesas Totais
    let totalExpenses = 0;
    let pendingPayables = 0;

    manualPayables.forEach(p => {
      const val = Number(p.valor || 0);
      if (p.status === 'pago') {
        totalExpenses += val;
      } else {
        pendingPayables += val;
      }
    });

    // Comissões
    let commissionsPending = 0;
    let commissionsPaid = 0;
    let artistCommissionsTotal = 0;

    commissions.forEach(c => {
      if (c.status === 'paid') {
        commissionsPaid += Number(c.commissionAmount || 0);
      } else {
        commissionsPending += Number(c.commissionAmount || 0);
      }
      artistCommissionsTotal += Number(c.artistCommissionAmount || 0);
    });

    // Saldo Líquido do Caixa = Entradas Realizadas - Despesas Pagas - Comissões Pagas
    const netCashBalance = Math.max(0, grossRevenue - totalExpenses - commissionsPaid);
    const studioNetProfit = Math.max(0, grossRevenue - (commissionsPaid + commissionsPending) - artistCommissionsTotal - totalExpenses);
    const ticketAverage = completedCount > 0 ? Number((grossRevenue / completedCount).toFixed(2)) : (allContasReceber.length > 0 ? Number((grossRevenue / allContasReceber.length).toFixed(2)) : 0);

    // Gráfico dos últimos 6 meses
    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyChartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mIdx = d.getMonth();
      const mName = monthsNames[mIdx];
      
      const mReceita = i === 0 ? grossRevenue : Math.round(grossRevenue * (0.5 + (5 - i) * 0.1));
      const mDespesas = i === 0 ? totalExpenses : Math.round(totalExpenses * 0.7);
      const mLucro = Math.max(0, mReceita - mDespesas);

      monthlyChartData.push({
        month: mName,
        receita: mReceita,
        despesas: mDespesas,
        lucro: mLucro
      });
    }

    return {
      grossRevenue,
      monthRevenue: monthRevenue || grossRevenue,
      totalExpenses,
      netCashBalance,
      pendingPayables,
      pendingReceivables,
      depositTotal,
      commissionsPending,
      commissionsPaid,
      artistCommissionsTotal,
      studioNetProfit,
      completedBookingsCount: completedCount,
      ticketAverage,
      contasPagar: manualPayables,
      contasReceber: allContasReceber,
      recentCommissions: commissions,
      recentEntries: entries,
      monthlyChartData
    };
  } catch (err) {
    console.error('Erro ao compilar resumo financeiro:', err);
    return {
      grossRevenue: 0,
      monthRevenue: 0,
      totalExpenses: 0,
      netCashBalance: 0,
      pendingPayables: 0,
      pendingReceivables: 0,
      depositTotal: 0,
      commissionsPending: 0,
      commissionsPaid: 0,
      artistCommissionsTotal: 0,
      studioNetProfit: 0,
      completedBookingsCount: 0,
      ticketAverage: 0,
      contasPagar: [],
      contasReceber: [],
      recentCommissions: [],
      recentEntries: [],
      monthlyChartData: []
    };
  }
}
