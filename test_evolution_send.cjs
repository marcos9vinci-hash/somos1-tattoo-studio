const fs = require('fs');

async function testSend() {
  const baseUrl = 'https://p01--evolution--6n2dx6dsdlsf.code.run';
  const apiKey = '020F2F224360-40F7-B022-D17AB8E529E2';
  const instance = 'wats';
  const url = `${baseUrl}/message/sendText/${instance}`;

  // Test with a sample phone number formatted like Amanda: +55 11 95917-0977
  const phone = '5511959170977';
  const body = {
    number: phone,
    text: 'Teste de envio automático',
    linkPreview: true
  };

  console.log('Sending POST to:', url);
  console.log('Body:', JSON.stringify(body));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(body)
    });

    console.log('Response Status:', res.status, res.statusText);
    const data = await res.text();
    console.log('Response Body:', data);
  } catch(e) {
    console.error('Fetch error:', e);
  }
}

testSend();
