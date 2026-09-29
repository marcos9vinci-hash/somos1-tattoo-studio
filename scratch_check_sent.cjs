const baseUrl = 'https://p01--evolution--6n2dx6dsdlsf.code.run';
const apiKey = '020F2F224360-40F7-B022-D17AB8E529E2';
const instance = 'wats';

async function checkEvolutionMessages() {
  try {
    const res = await fetch(baseUrl + '/chat/findMessages/' + instance, {
      method: 'POST',
      headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 30
      })
    });
    console.log('Status findMessages:', res.status);
    const data = await res.json();
    console.log('Raw data structure:', Object.keys(data));
    const records = data.records || (Array.isArray(data) ? data : (data.messages?.records || []));
    console.log('MESSAGES COUNT:', records.length);
    records.slice(0, 20).forEach((m, idx) => {
      const fromMe = m.key?.fromMe;
      const remoteJid = m.key ? m.key.remoteJid : m.remoteJid;
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || JSON.stringify(m.message);
      const ts = m.messageTimestamp ? new Date(Number(m.messageTimestamp) * 1000).toLocaleString('pt-BR') : 'N/A';
      console.log(`[${idx}] ${fromMe ? 'OUT' : 'IN'} ${ts} -> ${remoteJid}: ${(text || '').slice(0, 90).replace(/\n/g, ' ')}`);
    });
  } catch (e) {
    console.error('Error:', e);
  }
}
checkEvolutionMessages();
