const https = require('https');

const options = {
  hostname: 'www.marcos9vinci.dedyn.io',
  port: 443,
  path: '/api/v1/workflows',
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZjIwYWY2Yy05NDUwLTRiMmItYTI3Yy03NTk5YWRlMDBlZjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWI5ODYxYzUtY2I2NS00ZDY3LWI0ZDMtN2M3ODgyNGM1ZjIzIiwiaWF0IjoxNzkwNTY1OTc1fQ.OISZGxWw39DHfmJwQg9L0J3uPwXgtHgq7Z9mAwFoXeM',
    'Content-Type': 'application/json'
  }
};

const workflow = {
  name: 'Test Gemini LangChain Agent',
  nodes: [
    {
      parameters: {
        httpMethod: 'POST',
        path: 'test-agent-v1',
        responseMode: 'onReceived'
      },
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [100, 300],
      id: 'webhook-node',
      name: 'Webhook'
    },
    {
      parameters: {
        promptType: 'define',
        text: '={{ $json.body?.message || "Ola!" }}'
      },
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 1.6,
      position: [350, 300],
      id: 'agent-node',
      name: 'AI Agent'
    },
    {
      parameters: {
        modelName: 'models/gemini-1.5-flash'
      },
      type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
      typeVersion: 1,
      position: [350, 500],
      id: 'gemini-model',
      name: 'Google Gemini Chat Model',
      credentials: {
        googlePalmApi: {
          id: 'x61vzkIWj5BQrTz1',
          name: 'Google Gemini(PaLM) Api account'
        }
      }
    }
  ],
  connections: {
    'Webhook': {
      main: [[{ node: 'AI Agent', type: 'main', index: 0 }]]
    },
    'Google Gemini Chat Model': {
      ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]]
    }
  },
  settings: { executionOrder: 'v1' }
};

const req = https.request(options, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log('Create workflow HTTP ' + res.statusCode + ':', b.slice(0, 350)));
});
req.write(JSON.stringify(workflow));
req.end();
