const baseUrl = 'https://p01--evolution--6n2dx6dsdlsf.code.run';
const apiKey = '020F2F224360-40F7-B022-D17AB8E529E2';
const instance = 'wats';

async function checkDetails() {
  const res = await fetch(baseUrl + '/chat/findMessages/' + instance, {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 40 })
  });
  const data = await res.json();
  const records = data.messages?.records || [];
  records.filter(m => m.key?.remoteJid?.includes('5511971906772') || m.key?.remoteJid?.includes('5511991124241')).forEach(m => {
    console.log(JSON.stringify(m, null, 2));
  });
}
checkDetails();
