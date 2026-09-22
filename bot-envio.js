import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, addDoc, serverTimestamp, terminate } from 'firebase/firestore';
import axios from 'axios';

const firebaseConfig = {
  apiKey: "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0",
  authDomain: "memorizeai-7b8fd.firebaseapp.com",
  projectId: "memorizeai-7b8fd",
  storageBucket: "memorizeai-7b8fd.firebasestorage.app",
  messagingSenderId: "287874618983",
  appId: "1:287874618983:web:30718f0f4f5ad68cb4e6c2"
};

const firestoreDatabaseId = "ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firestoreDatabaseId);

// Timer de segurança absoluta: encerra o processo em no máximo 25 segundos
setTimeout(() => {
  console.log("⏳ Timeout de segurança atingido (25s). Encerrando processo.");
  process.exit(0);
}, 25000);

async function logAutomation(msg, type = 'info') {
  try {
    await addDoc(collection(db, 'automation_logs'), {
      message: msg,
      type: type,
      timestamp: serverTimestamp()
    });
    console.log(`[${type.toUpperCase()}]: ${msg}`);
  } catch (e) {
    console.error("Erro ao salvar log:", e.message);
  }
}

function parseAppointmentDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const time = timeStr || "10:00";
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0);
}

function formatMessage(template, booking) {
  return template
    .replace(/{cliente}/g, booking.userName || 'Cliente')
    .replace(/{data}/g, booking.date ? booking.date.split('-').reverse().join('/') : '')
    .replace(/{horario}/g, booking.time || '')
    .replace(/{servico}/g, booking.descricao_servico || 'tatuagem')
    .replace(/{profissional}/g, booking.artistId || 'nosso estúdio');
}

async function startBot() {
  await logAutomation("🤖 Robô na nuvem iniciado.");
  try {
    const settingsSnap = await getDocs(collection(db, 'studio_settings'));
    const settings = settingsSnap.docs.find(d => d.id === 'main')?.data();

    if (!settings?.automation?.enabled) {
      await logAutomation("🛑 Automação desativada nas configurações.", "warn");
      return;
    }

    const { 
      evolutionBaseUrl, 
      evolutionApiKey, 
      evolutionInstance, 
      confirmationEnabled = true,
      reminderEnabled = true,
      reminderValue = 24,
      reminderUnit = 'hours',
      followUpEnabled = true,
      followUpValue = 3,
      followUpUnit = 'days'
    } = settings.automation;

    const templates = settings.whatsappTemplates || {};
    const defaultConfirmation = "✅ Olá {cliente}, seu agendamento para {data} às {horario} está confirmado!";
    const defaultReminder = "⏰ Olá {cliente}, lembrando do seu agendamento no estúdio: dia {data} às {horario}. Qualquer dúvida nos avise!";
    const defaultFollowUp = "✨ Olá {cliente}, tudo bem? Como está a cicatrização do seu procedimento? Se precisar de qualquer orientação ou retoque, estamos à disposição!";

    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const now = new Date();
    const url = `${evolutionBaseUrl.replace(/\/$/, '')}/message/sendText/${evolutionInstance}`;

    const reminderMs = reminderValue * (reminderUnit === 'minutes' ? 60000 : reminderUnit === 'hours' ? 3600000 : 86400000);
    const followUpMs = followUpValue * (followUpUnit === 'minutes' ? 60000 : followUpUnit === 'hours' ? 3600000 : 86400000);

    for (const d of bookingsSnap.docs) {
      const b = { id: d.id, ...d.data() };
      if (!b.userPhone || b.status === 'rejected' || b.status === 'cancelled') continue;

      const phoneClean = b.userPhone.replace(/\D/g, '');
      const fullPhone = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;
      const apptDate = parseAppointmentDate(b.date, b.time);

      // --- 1. CONFIRMAÇÃO IMEDIATA ---
      if (confirmationEnabled && !b.confirmationSent) {
        const text = formatMessage(templates.confirmacao || defaultConfirmation, b);
        try {
          await axios.post(url, { number: fullPhone, text }, { headers: { 'apikey': evolutionApiKey }, timeout: 8000 });
          await updateDoc(doc(db, 'bookings', b.id), { confirmationSent: true });
          await logAutomation(`✅ [Confirmação] Enviada para ${b.userName} (${fullPhone})`);
        } catch (err) {
          await logAutomation(`❌ [Confirmação Falhou] ${b.userName}: ${err.response?.data?.message || err.message}`, "error");
        }
      }

      // --- 2. LEMBRETE PRÉVIO ---
      if (reminderEnabled && !b.reminderSent && apptDate) {
        const timeUntilAppt = apptDate.getTime() - now.getTime();
        // Dispara se estiver dentro da janela de lembrete e ainda antes do atendimento
        if (timeUntilAppt > 0 && timeUntilAppt <= reminderMs) {
          const text = formatMessage(templates.lembrete || defaultReminder, b);
          try {
            await axios.post(url, { number: fullPhone, text }, { headers: { 'apikey': evolutionApiKey }, timeout: 8000 });
            await updateDoc(doc(db, 'bookings', b.id), { reminderSent: true });
            await logAutomation(`⏰ [Lembrete Prévio] Enviado para ${b.userName} (${b.date} às ${b.time})`);
          } catch (err) {
            await logAutomation(`❌ [Lembrete Falhou] ${b.userName}: ${err.response?.data?.message || err.message}`, "error");
          }
        }
      }

      // --- 3. PÓS-VENDA / FOLLOW-UP ---
      if (followUpEnabled && !b.followUpSent && apptDate) {
        const timeSinceAppt = now.getTime() - apptDate.getTime();
        // Dispara se o atendimento já passou há pelo menos followUpMs (ou está marcado como concluído)
        if ((timeSinceAppt >= followUpMs) || (b.status === 'completed' && timeSinceAppt >= 86400000)) {
          const text = formatMessage(templates.followup || defaultFollowUp, b);
          try {
            await axios.post(url, { number: fullPhone, text }, { headers: { 'apikey': evolutionApiKey }, timeout: 8000 });
            await updateDoc(doc(db, 'bookings', b.id), { followUpSent: true });
            await logAutomation(`✨ [Pós-Venda] Enviado para ${b.userName} (${b.date})`);
          } catch (err) {
            await logAutomation(`❌ [Pós-Venda Falhou] ${b.userName}: ${err.response?.data?.message || err.message}`, "error");
          }
        }
      }
    }
  } catch (e) {
    await logAutomation(`💥 Erro Crítico no Robô: ${e.message}`, "error");
  } finally {
    try {
      await terminate(db);
    } catch (_) {}
    await logAutomation("🏁 Robô finalizou a tarefa com sucesso.");
    process.exit(0);
  }
}
startBot();
