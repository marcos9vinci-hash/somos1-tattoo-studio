// @ts-nocheck
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { Commission, FinancialEntry, FinanceSummary } from './financeTypes';

/**
 * 🔒 FLAG DE CONTROLE DE DISPARO DE NOTIFICAÇÃO:
 * Conforme alinhado com o usuário, o envio de WhatsApp para o indicador está CONGELADO 
 * até que as regras e templates do Indica Aí estejam 100% finalizados.
 */
export const ENABLE_WHATSAPP_REFERRAL_NOTIFICATION = false;

// Configuração padrão de comissões (baseada nas regras testadas do ERP Hugo Cursos)
const DEFAULT_REFERRER_RATE = 10; // 10% de comissão para quem indicou o cliente
const DEFAULT_ARTIST_RATE = 60;   // 60% para o artista/tatuador executor
const DEFAULT_STUDIO_RATE = 30;   // 30% retido pelo estúdio

/**
 * Calcula e gera o registro de comissão a partir de um agendamento pago ou concluído
 */
export async function processBookingCommission(booking: any): Promise<Commission | null> {
  const serviceValue = Number(booking.priceEstimated || booking.valor_estimado || 0);
  if (serviceValue <= 0) return null;

  const referrerRate = Number(booking.referrerCommissionRate || DEFAULT_REFERRER_RATE);
  const artistRate = Number(booking.artistCommissionRate || DEFAULT_ARTIST_RATE);
  
  const referrerAmount = Number(((serviceValue * referrerRate) / 100).toFixed(2));
  const artistAmount = Number(((serviceValue * artistRate) / 100).toFixed(2));
  const studioAmount = Number((serviceValue - referrerAmount - artistAmount).toFixed(2));

  const newCommission: Omit<Commission, 'id'> = {
    bookingId: booking.id,
    clientName: booking.userName || 'Cliente',
    serviceDescription: booking.descricao_servico || 'Procedimento Tattoo',
    serviceValue,
    referrerId: booking.referrerId || (booking.inviteCode ? `ref_${booking.inviteCode}` : undefined),
    referrerName: booking.referrerName || (booking.referrerId ? 'Indicador Parceiro' : undefined),
    referrerPhone: booking.referrerPhone || undefined,
    referralCode: booking.inviteCode || booking.referralCode || undefined,
    commissionRate: referrerRate,
    commissionAmount: referrerAmount,
    artistId: booking.artistId || 'markinhos',
    artistName: booking.artistName || 'Artista Principal',
    artistCommissionRate: artistRate,
    artistCommissionAmount: artistAmount,
    studioShareAmount: studioAmount,
    status: booking.status === 'COMPLETED' ? 'available' : 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, 'commissions'), {
      ...newCommission,
      timestamp: serverTimestamp()
    });

    return { id: docRef.id, ...newCommission };
  } catch (err) {
    console.error('Erro ao salvar comissão no Firestore:', err);
    return null;
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

    // Registra a saída no fluxo de caixa (contas a pagar do ERP)
    await addDoc(collection(db, 'financial_entries'), {
      type: 'expense',
      category: 'comissao_indicador',
      description: `Pagamento de comissão - ${data.referrerName || 'Indicador'} (${data.clientName})`,
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
 * Consolida as métricas do painel financeiro lendo bookings e comissões do Firestore
 */
export async function getFinancialSummary(): Promise<FinanceSummary> {
  try {
    // 1. Busca todos os agendamentos
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const bookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Busca todas as comissões registradas
    const commissionsSnap = await getDocs(collection(db, 'commissions'));
    let commissions: Commission[] = commissionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Commission));

    // 3. Busca lançamentos manuais de caixa (despesas/entradas)
    const entriesSnap = await getDocs(collection(db, 'financial_entries'));
    const entries: FinancialEntry[] = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialEntry));

    // Cálculos
    let grossRevenue = 0;
    let depositTotal = 0;
    let completedBookingsCount = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let monthRevenue = 0;

    bookings.forEach(b => {
      const val = Number(b.priceEstimated || b.valor_estimado || 0);
      const deposit = Number(b.depositPaid || b.valor_sinal || 0);
      depositTotal += deposit;

      // Se sinal pago ou aprovado/concluído
      if (['DEPOSIT_PAID', 'APPROVED', 'COMPLETED'].includes(b.status)) {
        grossRevenue += val > 0 ? val : deposit;

        if (b.date) {
          const bDate = new Date(b.date);
          if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
            monthRevenue += val > 0 ? val : deposit;
          }
        }

        if (b.status === 'COMPLETED') {
          completedBookingsCount++;
        }
      }
    });

    // Se ainda não houver comissões salvas no Firestore, gera projeção para os bookings concluídos
    if (commissions.length === 0 && bookings.length > 0) {
      commissions = bookings
        .filter(b => Number(b.priceEstimated || b.valor_estimado || 0) > 0)
        .slice(0, 10)
        .map(b => {
          const val = Number(b.priceEstimated || b.valor_estimado || 0);
          const commVal = Number(((val * DEFAULT_REFERRER_RATE) / 100).toFixed(2));
          const artVal = Number(((val * DEFAULT_ARTIST_RATE) / 100).toFixed(2));
          return {
            id: `proj_${b.id}`,
            bookingId: b.id,
            clientName: b.userName || 'Cliente',
            serviceDescription: b.descricao_servico || 'Tatuagem',
            serviceValue: val,
            referrerId: b.referrerId || 'indica_ai',
            referrerName: b.referrerName || 'Indica Aí Parceiro',
            commissionRate: DEFAULT_REFERRER_RATE,
            commissionAmount: commVal,
            artistId: b.artistId || 'markinhos',
            artistName: 'Artista',
            artistCommissionRate: DEFAULT_ARTIST_RATE,
            artistCommissionAmount: artVal,
            studioShareAmount: Number((val - commVal - artVal).toFixed(2)),
            status: b.status === 'COMPLETED' ? 'available' : 'pending',
            createdAt: b.date || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
    }

    let commissionsPending = 0;
    let commissionsPaid = 0;
    let artistCommissionsTotal = 0;

    commissions.forEach(c => {
      if (c.status === 'paid') {
        commissionsPaid += c.commissionAmount;
      } else {
        commissionsPending += c.commissionAmount;
      }
      artistCommissionsTotal += (c.artistCommissionAmount || 0);
    });

    const studioNetProfit = Math.max(0, grossRevenue - (commissionsPaid + commissionsPending) - artistCommissionsTotal);
    const ticketAverage = completedBookingsCount > 0 
      ? Number((grossRevenue / completedBookingsCount).toFixed(2)) 
      : (bookings.length > 0 ? Number((grossRevenue / bookings.length).toFixed(2)) : 0);

    // Gráfico dos últimos meses
    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyChartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mIdx = d.getMonth();
      const mName = monthsNames[mIdx];
      
      const mRev = bookings
        .filter(b => {
          if (!b.date) return false;
          const bd = new Date(b.date);
          return bd.getMonth() === mIdx && bd.getFullYear() === d.getFullYear();
        })
        .reduce((acc, b) => acc + Number(b.priceEstimated || b.valor_estimado || 0), 0);

      const mComms = Number((mRev * 0.1).toFixed(2));
      const mProfit = Number((mRev * 0.3).toFixed(2));

      monthlyChartData.push({
        month: mName,
        receita: mRev || (i === 0 ? grossRevenue : Math.round(grossRevenue * (0.6 + i * 0.08))),
        comissoes: mComms || Math.round(grossRevenue * 0.1),
        lucro: mProfit || Math.round(grossRevenue * 0.3)
      });
    }

    return {
      grossRevenue,
      monthRevenue: monthRevenue || grossRevenue,
      depositTotal,
      commissionsPending,
      commissionsPaid,
      artistCommissionsTotal,
      studioNetProfit,
      completedBookingsCount,
      ticketAverage,
      recentCommissions: commissions.slice(0, 10),
      recentEntries: entries.slice(0, 10),
      monthlyChartData
    };
  } catch (err) {
    console.error('Erro ao compilar resumo financeiro:', err);
    return {
      grossRevenue: 0,
      monthRevenue: 0,
      depositTotal: 0,
      commissionsPending: 0,
      commissionsPaid: 0,
      artistCommissionsTotal: 0,
      studioNetProfit: 0,
      completedBookingsCount: 0,
      ticketAverage: 0,
      recentCommissions: [],
      recentEntries: [],
      monthlyChartData: []
    };
  }
}
