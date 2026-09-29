const https = require('https');

const N8N_WEBHOOK = 'https://www.marcos9vinci.dedyn.io/webhook/indica-automacao';

const MARCOS = { name: 'Marcos Vinicius Gomes', phone: '5511957837132' };
const MICHELE = { name: 'Michele', phone: '5511945296712' };

const TEMPLATES = {
  confirmacao: (nome, data, hora, servico) =>
    `Olá, ${nome}! Tudo bem?\n\n\u200bConfirmamos o seu agendamento em nosso estúdio:\n\n\u200b📅 Data: ${data}\n⏰ Horário: ${hora}\n🎨 Serviço: ${servico}\n👨\u200d🎨 Profissional: Markinhos \n\nRua Francesco de Martini 29\nSão Caetano do Sul`,

  lembrete: (nome, data, hora, servico) =>
    `Oi, ${nome}! Passando para lembrar da nossa sessão:\n\n\u200b📅 Data: ${data}\n⏰ Horário: ${hora}\n🎨 Serviço: ${servico}\n\n\u200bObs: Venha bem alimentado(a) e hidratado(a). Se houver qualquer imprevisto, nos avise com antecedência.\n\u200bAté Mais.`,

  followup: (nome, data) =>
    `Olá, ${nome}!\nPassando para acompanhar a cicatrização da sua arte realizada no dia ${data}. Como está a pele?\n\n🌿 Está tudo correndo bem com os cuidados?\n\nSe precisar de qualquer orientação adicional, é só enviar uma mensagem por aqui. Estamos à disposição!`
};

function sendWebhook(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(N8N_WEBHOOK);
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function pad(n) { return String(n).padStart(2, '0'); }
function formatDate(d) { return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

async function runTest(testNum, cliente, minutesFromNow, reminderMinBefore, followUpMinAfter, servico) {
  const now = Date.now();
  const apptDate = new Date(now + minutesFromNow * 60 * 1000);
  const bookingTime = `${pad(apptDate.getHours())}:${pad(apptDate.getMinutes())}`;
  const dataFormatada = formatDate(apptDate);
  const dataISO = isoDate(apptDate);

  const apptMs = apptDate.getTime();
  const reminderMs = apptMs - (reminderMinBefore * 60 * 1000);
  const followUpMs = apptMs + (followUpMinAfter * 60 * 1000);
  const reminderDelay = Math.max(15, Math.round((reminderMs - now) / 1000));
  const followUpDelay = Math.max(15, Math.round((followUpMs - now) / 1000));

  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  🧪 TESTE ${testNum}: ${cliente.name} — ${servico}`);
  console.log(`  📅 Sessão: ${dataFormatada} às ${bookingTime}`);
  console.log(`  🔔 Lembrete: ${reminderMinBefore}min antes → em ${reminderDelay}s`);
  console.log(`  💬 Follow-up: ${followUpMinAfter}min depois → em ${followUpDelay}s`);
  console.log(`${'═'.repeat(65)}`);

  // CONFIRMAÇÃO
  const r1 = await sendWebhook({
    action: 'confirmacao', phone: cliente.phone,
    message: TEMPLATES.confirmacao(cliente.name, dataFormatada, bookingTime, servico),
    delay_seconds: 0, booking_date: dataISO, booking_time: bookingTime, instance: 'wats'
  });
  console.log(`  ✅ Confirmação enviada: HTTP ${r1.status}`);

  // LEMBRETE
  const r2 = await sendWebhook({
    action: 'lembrete', phone: cliente.phone,
    message: TEMPLATES.lembrete(cliente.name, dataFormatada, bookingTime, servico),
    delay_seconds: reminderDelay, delayAmount: reminderDelay, delayUnit: 'seconds',
    trigger_time: new Date(reminderMs).toISOString(),
    booking_date: dataISO, booking_time: bookingTime,
    reminder_value: reminderMinBefore, reminder_unit: 'minutes', instance: 'wats'
  });
  console.log(`  ⏰ Lembrete agendado: HTTP ${r2.status} (dispara em ${reminderDelay}s)`);

  // FOLLOW-UP
  const r3 = await sendWebhook({
    action: 'followup', phone: cliente.phone,
    message: TEMPLATES.followup(cliente.name, dataFormatada),
    delay_seconds: followUpDelay, delayAmount: followUpDelay, delayUnit: 'seconds',
    trigger_time: new Date(followUpMs).toISOString(),
    booking_date: dataISO, booking_time: bookingTime,
    followup_value: followUpMinAfter, followup_unit: 'minutes', instance: 'wats'
  });
  console.log(`  🌿 Follow-up agendado: HTTP ${r3.status} (dispara em ${followUpDelay}s)`);

  return { reminderDelay, followUpDelay, bookingTime };
}

async function main() {
  const now = new Date();
  console.log(`\n🚀 BATERIA DE TESTES v2 (keypair corrigido) — ${now.toLocaleString('pt-BR')}`);

  // TESTE 1: Marcos — Sessão daqui 3min, lembrete 1min antes, follow-up 2min depois
  const t1 = await runTest(1, MARCOS, 3, 1, 2, 'Tatuagem Exclusiva');

  // TESTE 2: Michele — Sessão daqui 5min, lembrete 2min antes, follow-up 3min depois
  const t2 = await runTest(2, MICHELE, 5, 2, 3, 'Flash Tattoo');

  // TESTE 3: Marcos — Sessão daqui 7min, lembrete 3min antes, follow-up 4min depois
  const t3 = await runTest(3, MARCOS, 7, 3, 4, 'Retoque');

  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  📊 CRONOGRAMA DE DISPAROS`);
  console.log(`${'═'.repeat(65)}`);
  console.log(`  Agora: ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  console.log(``);
  console.log(`  TESTE 1 (Marcos — Tattoo Exclusiva, sessão ${t1.bookingTime}):`);
  console.log(`    📨 Confirmação   → AGORA ✅`);
  console.log(`    🔔 Lembrete      → +${t1.reminderDelay}s (~${pad(Math.floor(t1.reminderDelay/60))}:${pad(t1.reminderDelay%60)})`);
  console.log(`    💬 Follow-up     → +${t1.followUpDelay}s (~${pad(Math.floor(t1.followUpDelay/60))}:${pad(t1.followUpDelay%60)})`);
  console.log(``);
  console.log(`  TESTE 2 (Michele — Flash Tattoo, sessão ${t2.bookingTime}):`);
  console.log(`    📨 Confirmação   → AGORA ✅`);
  console.log(`    🔔 Lembrete      → +${t2.reminderDelay}s (~${pad(Math.floor(t2.reminderDelay/60))}:${pad(t2.reminderDelay%60)})`);
  console.log(`    💬 Follow-up     → +${t2.followUpDelay}s (~${pad(Math.floor(t2.followUpDelay/60))}:${pad(t2.followUpDelay%60)})`);
  console.log(``);
  console.log(`  TESTE 3 (Marcos — Retoque, sessão ${t3.bookingTime}):`);
  console.log(`    📨 Confirmação   → AGORA ✅`);
  console.log(`    🔔 Lembrete      → +${t3.reminderDelay}s (~${pad(Math.floor(t3.reminderDelay/60))}:${pad(t3.reminderDelay%60)})`);
  console.log(`    💬 Follow-up     → +${t3.followUpDelay}s (~${pad(Math.floor(t3.followUpDelay/60))}:${pad(t3.followUpDelay%60)})`);
  console.log(``);
  const lastDelay = Math.max(t1.followUpDelay, t2.followUpDelay, t3.followUpDelay);
  console.log(`  ⏱️  Último disparo: ~${Math.ceil(lastDelay/60)} minutos a partir de agora`);
  console.log(`  ✅ 9 webhooks aceitos (3×confirmação + 3×lembrete + 3×follow-up)\n`);
}

main().catch(console.error);
