const baseUrl = 'https://p01--evolution--6n2dx6dsdlsf.code.run';
const apiKey = '020F2F224360-40F7-B022-D17AB8E529E2';
const instance = 'wats';

async function testFormats() {
  const payloads = [
    { label: 'format 1: number + text', body: { number: '5511959170977', text: 'Teste 1' } },
    { label: 'format 2: number with jid + text', body: { number: '5511959170977@s.whatsapp.net', text: 'Teste 2' } },
    { label: 'format 3: textMessage', body: { number: '5511959170977', textMessage: { text: 'Teste 3' } } },
    { label: 'format 4: options + textMessage', body: { number: '5511959170977', options: { delay: 100 }, textMessage: { text: 'Teste 4' } } },
    { label: 'format 5: number without linkPreview', body: { number: '5511959170977', text: 'Teste 5', delay: 100 } }
  ];

  for (const p of payloads) {
    console.log(`Testing ${p.label}...`);
    try {
      const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(p.body)
      });
      console.log(`Result ${p.label}:`, res.status, await res.text());
    } catch(err) {
      console.error(`Error ${p.label}:`, err.message);
    }
  }
}
testFormats();
