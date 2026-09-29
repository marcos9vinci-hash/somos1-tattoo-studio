const baseUrl = 'https://p01--evolution--6n2dx6dsdlsf.code.run';
const apiKey = '020F2F224360-40F7-B022-D17AB8E529E2';
const instance = 'wats';

async function testMarcos() {
  console.log('Sending test to Marcos (5511957837132)...');
  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: '5511957837132',
        text: '🤖 Teste do IndicaAi para o Marcos: Se você recebeu esta mensagem, o envio de lembretes está funcionando!'
      })
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
  } catch(e) {
    console.error('Error:', e);
  }
}
testMarcos();
