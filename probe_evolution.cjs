const baseUrl = 'https://p01--evolution--6n2dx6dsdlsf.code.run';
const apiKey = '020F2F224360-40F7-B022-D17AB8E529E2';
const instance = 'wats';

async function probe() {
  // Let's check instance info first
  const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instance}`, {
    headers: { 'apikey': apiKey }
  });
  console.log('fetchInstances:', await infoRes.text());

  // Let's test checking if number is on WhatsApp
  const checkNumber = await fetch(`${baseUrl}/chat/whatsappNumbers/${instance}`, {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ numbers: ['5511959170977'] })
  });
  console.log('whatsappNumbers status:', checkNumber.status, await checkNumber.text());
}
probe();
