const https = require('https');
const fs = require('fs');
const path = require('path');

const apikey = '020F2F224360-40F7-B022-D17AB8E529E2';
const host = 'p01--evolution--6n2dx6dsdlsf.code.run';

const request = (method, endpoint, data = null, customHeaders = {}) => new Promise((resolve, reject) => {
  const payload = data ? JSON.stringify(data) : null;
  const req = https.request({
    hostname: host,
    path: endpoint,
    method: method,
    headers: {
      'apikey': apikey,
      'Content-Type': 'application/json',
      ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      ...customHeaders
    }
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body }));
  });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('=== INICIANDO FLUXO DE RECONSTRUÇÃO DA INSTÂNCIA WATS ===');

  try {
    console.log('\n1. Deletando instância antiga...');
    const delRes = await request('DELETE', '/instance/delete/wats');
    console.log('Resultado DELETE:', delRes.status, delRes.body);
    await delay(3000);

    console.log('\n2. Criando instância limpa...');
    const create = await request('POST', '/instance/create', {
      instanceName: 'wats',
      token: apikey,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    });
    console.log('Resultado CREATE:', create.status, create.body);
    await delay(2000);

    console.log('\n3. Configurando Webhook do n8n...');
    const hookRes = await request('POST', '/webhook/set/wats', {
      webhook: {
        enabled: true,
        url: 'https://www.marcos9vinci.dedyn.io/webhook/evolution-events',
        byEvents: false,
        base64: false,
        events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
      }
    });
    console.log('Resultado WEBHOOK:', hookRes.status, hookRes.body);
    await delay(1000);

    console.log('\n4. Solicitando QR Code...');
    const qr = await request('GET', '/instance/connect/wats');
    console.log('Resultado CONNECT:', qr.status);

    try {
      const qrData = JSON.parse(qr.body);
      if (qrData.base64) {
        console.log('\n✅ SUCESSO! QR Code obtido!');
        const base64Data = qrData.base64.replace(/^data:image\/\w+;base64,/, '');
        const targetPath = 'C:\\Users\\Pc\\.gemini\\antigravity\\brain\\64f90dc8-5350-46db-b5b8-74dadff3b578\\qrcode_whatsapp.png';
        fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
        console.log('QR Code salvo em imagem:', targetPath);
        if (qrData.pairingCode) console.log('Pairing Code alternativo:', qrData.pairingCode);
        if (qrData.code) console.log('Raw QR String:', qrData.code.slice(0, 50) + '...');
      } else {
        console.log('Retorno completo:', qr.body);
      }
    } catch(e) {
      console.log('Retorno não-JSON:', qr.body);
    }
  } catch (err) {
    console.error('Erro no fluxo:', err.message);
  }
}

run();
