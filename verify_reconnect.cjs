const baseUrl = 'https://p01--evolution--6n2dx6dsdlsf.code.run';
const apiKey = '020F2F224360-40F7-B022-D17AB8E529E2';
const instance = 'wats';

async function testConnectionAndSend() {
  console.log('1. Checking connectionState...');
  try {
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
      headers: { 'apikey': apiKey }
    });
    console.log('Connection state status:', stateRes.status, await stateRes.text());
  } catch (e) {
    console.error('State check error:', e.message);
  }

  console.log('2. Testing sendText to studio number (5511948116922)...');
  try {
    const sendRes = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: '5511948116922',
        text: '🤖 Teste de Verificação do IndicaAi: O WhatsApp reconectou com sucesso!'
      })
    });
    console.log('SendText status:', sendRes.status, await sendRes.text());
  } catch (e) {
    console.error('SendText error:', e.message);
  }
}
testConnectionAndSend();
