import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "memorizeai-7b8fd",
  appId: "1:287874618983:web:30718f0f4f5ad68cb4e6c2",
  apiKey: "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0",
  authDomain: "memorizeai-7b8fd.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9",
  storageBucket: "memorizeai-7b8fd.firebasestorage.app",
  messagingSenderId: "287874618983"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Converte "HH:MM" para minutos desde meia-noite
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos para "HH:MM"
 */
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const agentService = {
  /**
   * Consulta horários disponíveis em uma data
   */
  async getAvailableSlots(dateStr, size = 'Pequena') {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { available: false, error: 'Data inválida. Use o formato AAAA-MM-DD.' };
    }

    // 1. Carrega configurações do estúdio
    const settingsSnap = await getDoc(doc(db, 'studio_settings', 'main'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};

    const workingDays = settings.workingDays || [1, 2, 3, 4, 5, 6];
    const workingHours = settings.workingHours || { start: '09:00', end: '19:00' };
    const durations = settings.durations || { Pequena: 60, Média: 120, Grande: 240 };
    const blockedDates = settings.blockedDates || [];
    const blockedIntervals = settings.blockedIntervals || [];

    // Checa dia da semana (0 = Domingo)
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    const weekNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    if (!workingDays.includes(dayOfWeek)) {
      return {
        available: false,
        date: dateStr,
        reason: `O estúdio não realiza atendimentos aos ${weekNames[dayOfWeek]}s.`,
        freeSlots: []
      };
    }

    // Checa bloqueio de dia inteiro
    if (blockedDates.includes(dateStr)) {
      return {
        available: false,
        date: dateStr,
        reason: `O estúdio estará fechado neste dia (data com bloqueio integral na agenda).`,
        freeSlots: []
      };
    }

    // 2. Busca agendamentos existentes no dia
    const q = query(
      collection(db, 'bookings'),
      where('date', '==', dateStr)
    );
    const bookingsSnap = await getDocs(q);
    const busyIntervals = [];

    bookingsSnap.forEach(d => {
      const b = d.data();
      // Ignora cancelados ou rejeitados
      if (b.status === 'cancelled' || b.status === 'rejected' || b.status === 'no_show') return;

      const startMin = timeToMinutes(b.time);
      const durationMin = durations[b.size] || (b.size === 'Grande' ? 240 : b.size === 'Média' ? 120 : 60);
      busyIntervals.push({ start: startMin, end: startMin + durationMin });
    });

    // Adiciona intervalos bloqueados manualmente pelo estúdio
    blockedIntervals
      .filter(bi => bi.date === dateStr)
      .forEach(bi => {
        busyIntervals.push({
          start: timeToMinutes(bi.start),
          end: timeToMinutes(bi.end)
        });
      });

    // 3. Calcula slots livres
    const durationNeeded = durations[size] || 60;
    const workStart = timeToMinutes(workingHours.start || '09:00');
    const workEnd = timeToMinutes(workingHours.end || '19:00');

    const freeSlots = [];
    const step = 60; // Slots a cada 1h

    for (let current = workStart; current + durationNeeded <= workEnd; current += step) {
      const slotEnd = current + durationNeeded;
      const overlaps = busyIntervals.some(busy => {
        return (current < busy.end && slotEnd > busy.start);
      });

      if (!overlaps) {
        freeSlots.push(minutesToTime(current));
      }
    }

    return {
      available: freeSlots.length > 0,
      date: dateStr,
      dayOfWeek: weekNames[dayOfWeek],
      freeSlots: freeSlots,
      workingHours: `${workingHours.start} às ${workingHours.end}`,
      durationNeededMinutes: durationNeeded
    };
  },

  /**
   * Cria um novo agendamento no Firestore
   */
  async createBooking(data) {
    const {
      clientName,
      clientPhone,
      date,
      time,
      size = 'Pequena',
      artistId = 'Markinhos',
      description = 'Tatuagem',
      status,
      createdByAdmin = false
    } = data;

    if (!clientName || !date || !time) {
      throw new Error('Nome do cliente, data e horário são obrigatórios.');
    }

    const cleanPhone = (clientPhone || '').replace(/\D/g, '');
    const finalPhone = cleanPhone.length > 0 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;

    const bookingStatus = status || (createdByAdmin ? 'approved' : 'pending_approval');

    const newBookingData = {
      userName: clientName,
      userPhone: finalPhone,
      date: date,
      time: time,
      size: size,
      artistId: artistId,
      descricao_servico: description,
      status: bookingStatus,
      priceEstimated: size === 'Pequena' ? 250 : size === 'Média' ? 600 : 1200,
      depositPaid: createdByAdmin ? 0 : 0,
      confirmationSent: false,
      reminderSent: false,
      followUpSent: false,
      origin: createdByAdmin ? 'whatsapp_admin_agent' : 'whatsapp_client_agent',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'bookings'), newBookingData);

    return {
      success: true,
      bookingId: docRef.id,
      booking: {
        id: docRef.id,
        ...newBookingData
      },
      message: `Agendamento de ${clientName} confirmado para ${date} às ${time} com ${artistId}!`
    };
  },

  /**
   * Retorna resumo de agendamentos para o Admin
   */
  async getDailySummary(dateStr) {
    if (!dateStr) {
      const now = new Date();
      dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const q = query(
      collection(db, 'bookings'),
      where('date', '==', dateStr)
    );
    const snap = await getDocs(q);

    const list = [];
    snap.forEach(d => {
      const b = d.data();
      list.push({
        id: d.id,
        name: b.userName || 'Sem nome',
        phone: b.userPhone || '',
        time: b.time || '00:00',
        size: b.size || 'Média',
        status: b.status,
        service: b.descricao_servico || 'Tatuagem'
      });
    });

    list.sort((a, b) => a.time.localeCompare(b.time));

    let text = `📅 *Agenda Somos 1 Tattoo (${dateStr.split('-').reverse().join('/')})*\n\n`;
    if (list.length === 0) {
      text += `Nenhum agendamento marcado para esta data. Todos os horários estão vagos! 🚀`;
    } else {
      text += `Total de sessões: *${list.length}*\n\n`;
      list.forEach((item, idx) => {
        const statusEmoji = item.status === 'approved' ? '✅' : item.status === 'rescheduled' ? '🔄' : item.status === 'completed' ? '🏆' : '⏳';
        text += `${idx + 1}. *${item.time}* - ${item.name} (${item.size})\n   ${statusEmoji} Status: ${item.status}\n`;
      });
    }

    return {
      date: dateStr,
      count: list.length,
      bookings: list,
      summaryText: text
    };
  },

  /**
   * Bloqueia dia ou horário na agenda
   */
  async blockSlot({ date, start, end, label, fullDay = false }) {
    if (!date) throw new Error('Data é obrigatória para bloqueio.');

    const settingsRef = doc(db, 'studio_settings', 'main');
    const snap = await getDoc(settingsRef);
    const current = snap.exists() ? snap.data() : {};

    if (fullDay) {
      const blockedDates = Array.from(new Set([...(current.blockedDates || []), date]));
      await updateDoc(settingsRef, { blockedDates });
      return { success: true, message: `Dia ${date} bloqueado integralmente na agenda.` };
    } else {
      const newInterval = {
        date,
        start: start || '12:00',
        end: end || '13:00',
        label: label || 'Bloqueio via WhatsApp'
      };
      const blockedIntervals = [...(current.blockedIntervals || []), newInterval];
      await updateDoc(settingsRef, { blockedIntervals });
      return { success: true, message: `Intervalo ${date} das ${start} às ${end} bloqueado com sucesso.` };
    }
  }
};
