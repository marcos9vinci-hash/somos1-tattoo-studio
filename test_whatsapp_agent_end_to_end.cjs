const https = require('https');

const WEBHOOK_URL = 'https://www.marcos9vinci.dedyn.io/webhook/agente-whatsapp';

function sendSimulation({ remoteJid, pushName, text }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: remoteJid,
          fromMe: false,
          id: 'TEST_' + Date.now()
        },
        pushName: pushName,
        message: {
          conversation: text
        }
      }
    });

    const url = new URL(WEBHOOK_URL);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("=== INICIANDO TESTE END-TO-END DO AGENTE WHATSAPP ===");

  // Teste 1: Admin pedindo resumo da agenda de amanhã
  console.log("\n[Cenário 1] Admin: 'Como tá a agenda de amanhã?'");
  const res1 = await sendSimulation({
    remoteJid: '5511948116922@s.whatsapp.net',
    pushName: 'Markinhos',
    text: 'Como tá a agenda de amanhã?'
  });
  console.log("Status resposta 1:", res1.status, res1.data);

  // Aguardar 3 segundos
  await new Promise(r => setTimeout(r, 3000));

  // Teste 2: Cliente consultando horários livres na sexta
  console.log("\n[Cenário 2] Cliente: 'Olá, quais horários tem na sexta?'");
  const res2 = await sendSimulation({
    remoteJid: '5511945296712@s.whatsapp.net',
    pushName: 'Michele',
    text: 'Olá, quais horários tem na sexta?'
  });
  console.log("Status resposta 2:", res2.status, res2.data);

  console.log("\n=== TESTES CONCLUÍDOS COM SUCESSO ===");
}

run().catch(console.error);
