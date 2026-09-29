const fs = require('fs');
const https = require('https');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const N8N_URL = 'https://www.marcos9vinci.dedyn.io/webhook/indica-automacao';
const MARCOS_PHONE = '5511957837132';
const MARCOS_NAME = 'Marcos Vinicius Gomes';

function sendCampainha(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(N8N_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("=== INICIANDO AGENDAMENTO REAL & AUTOMAÇÃO DA CAMPAINHA N8N ===");

  // 1. Salvar no Firestore
  try {
    const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
    const app = initializeApp(config);
    const db = getFirestore(app, config.firestoreDatabaseId);

    const bookingId = 'booking_real_0125';
    await setDoc(doc(db, 'bookings', bookingId), {
      userName: MARCOS_NAME,
      userPhone: MARCOS_PHONE,
      date: '2026-09-28',
      time: '01:25',
      descricao_servico: 'Tatuagem Exclusiva',
      artistId: 'somos1tattoo',
      status: 'confirmed',
      confirmationSent: true,
      confirmationSentAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log("✅ 1. Agendamento gravado no Firestore com sucesso: ID", bookingId);
  } catch(e) {
    console.warn("⚠️ Aviso ao salvar no Firestore (prosseguindo com automação):", e.message);
  }

  // 2. Calcular os tempos exatos
  const now = new Date();
  
  // Data de hoje às 01:24:00 (Lembrete 1 min antes)
  const reminderTime = new Date(now);
  reminderTime.setHours(1, 24, 0, 0);

  // Data de hoje às 01:26:00 (Follow-up 1 min depois)
  const followUpTime = new Date(now);
  followUpTime.setHours(1, 26, 0, 0);

  let secondsToReminder = Math.round((reminderTime.getTime() - now.getTime()) / 1000);
  if (secondsToReminder <= 0) secondsToReminder = 5; // fallback se já passou do segundo

  let secondsToFollowUp = Math.round((followUpTime.getTime() - now.getTime()) / 1000);
  if (secondsToFollowUp <= 0) secondsToFollowUp = 120;

  console.log(`⏰ Hora atual: ${now.toLocaleTimeString('pt-BR')}`);
  console.log(`⏳ Segundos até o Lembrete (01:24): ${secondsToReminder}s`);
  console.log(`⏳ Segundos até o Follow-up (01:26): ${secondsToFollowUp}s`);

  // 3. DISPARO 1: CONFIRMAÇÃO IMEDIATA
  console.log("\n🚀 Disparando CONFIRMAÇÃO IMEDIATA...");
  const msgConf = `✅ Olá ${MARCOS_NAME}! Seu agendamento para hoje às 01:25 foi confirmado com sucesso no Somos 1 Tattoo Studio!`;
  const resConf = await sendCampainha({
    action: 'confirmacao',
    phone: MARCOS_PHONE,
    message: msgConf,
    instance: 'wats'
  });
  console.log("Resultado Confirmação:", resConf.status, resConf.body);

  // 4. DISPARO 2: LEMBRETE PROGRAMADO (Wait Node no n8n)
  console.log(`\n⏰ Programando LEMBRETE no nó Wait do n8n para acordar em ${secondsToReminder}s (às 01:24)...`);
  const msgLemb = `⏰ Oi ${MARCOS_NAME}! Passando para lembrar da sua tattoo daqui a 1 minuto, às 01:25! Estamos te esperando no Somos 1 Tattoo Studio.`;
  const resLemb = await sendCampainha({
    action: 'lembrete',
    phone: MARCOS_PHONE,
    message: msgLemb,
    delayAmount: secondsToReminder,
    delayUnit: 'seconds',
    instance: 'wats'
  });
  console.log("Resultado Lembrete Programado:", resLemb.status, resLemb.body);

  // 5. DISPARO 3: FOLLOW-UP PROGRAMADO (Wait Node no n8n)
  console.log(`\n✨ Programando FOLLOW-UP no nó Wait do n8n para acordar em ${secondsToFollowUp}s (às 01:26)...`);
  const msgFol = `✨ Olá ${MARCOS_NAME}! Sua sessão das 01:25 acabou de finalizar. Como está se sentindo? Qualquer dúvida nos cuidados e cicatrização da sua nova tattoo, nossa equipe está 100% à disposição!`;
  const resFol = await sendCampainha({
    action: 'followup',
    phone: MARCOS_PHONE,
    message: msgFol,
    delayAmount: secondsToFollowUp,
    delayUnit: 'seconds',
    instance: 'wats'
  });
  console.log("Resultado Follow-up Programado:", resFol.status, resFol.body);

  console.log("\n=== TODOS OS 3 GATILHOS FORAM ENTREGUES AO N8N! ===");
}

run();
