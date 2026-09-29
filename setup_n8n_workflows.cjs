const https = require('https');

const N8N_HOST = 'www.marcos9vinci.dedyn.io';
const N8N_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZjIwYWY2Yy05NDUwLTRiMmItYTI3Yy03NTk5YWRlMDBlZjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWI5ODYxYzUtY2I2NS00ZDY3LWI0ZDMtN2M3ODgyNGM1ZjIzIiwiaWF0IjoxNzkwNTY1OTc1fQ.OISZGxWw39DHfmJwQg9L0J3uPwXgtHgq7Z9mAwFoXeM';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: N8N_HOST,
      port: 443,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_TOKEN,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch {
          resolve({ status: res.statusCode, raw: resBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log("=== CONFIGURANDO WORKFLOWS NO N8N ===");

  // 1. WORKFLOW DA CAMPAINHA & LEMBRETES (Indica AI -> n8n -> Wait -> Evolution)
  const indicaWorkflow = {
    name: "Indica AI — Campainha & Lembretes WhatsApp",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "indica-automacao",
          responseMode: "onReceived",
          responseData: "allEntries",
          options: {}
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [100, 300],
        id: "webhook-trigger",
        name: "Campainha Indica AI",
        webhookId: "indica-automacao"
      },
      {
        parameters: {
          jsCode: `
const body = $json.body || $json;

let rawPhone = String(body.phone || body.number || "").replace(/\\D/g, "");
if (rawPhone && !rawPhone.startsWith("55")) {
  rawPhone = "55" + rawPhone;
}

const action = String(body.action || "confirmacao").toLowerCase();
const message = body.message || body.text || "";
const instance = body.instance || "wats";

let delayAmount = 0;
let delayUnit = "seconds";
let needWait = false;

function unitToMs(val, unit) {
  const v = Number(val || 0);
  switch (unit) {
    case 'minutes': return v * 60 * 1000;
    case 'hours': return v * 60 * 60 * 1000;
    case 'days': return v * 24 * 60 * 60 * 1000;
    default: return v * 60 * 1000;
  }
}

function parseDateTime(dStr, tStr) {
  if (!dStr) return null;
  const parts = dStr.split('-').map(Number);
  let h = 10, min = 0;
  if (tStr) {
    const p = tStr.split(':').map(Number);
    h = p[0] || 0;
    min = p[1] || 0;
  }
  return new Date(parts[0], parts[1] - 1, parts[2], h, min, 0, 0);
}

if (action === "confirmacao" || action === "reagendamento") {
  needWait = false;
  delayAmount = 0;
} else if (action === "lembrete" || action === "followup") {
  // PRIORIDADE 1: Se veio delay_seconds calculado do app
  if (typeof body.delay_seconds !== "undefined" && Number(body.delay_seconds) > 0) {
    delayAmount = Math.max(1, Math.round(Number(body.delay_seconds)));
    delayUnit = "seconds";
    needWait = true;
  }
  // PRIORIDADE 2: Se veio trigger_time (ISO string)
  else if (body.trigger_time) {
    const targetMs = new Date(body.trigger_time).getTime();
    const diffSec = Math.round((targetMs - Date.now()) / 1000);
    delayAmount = diffSec > 0 ? diffSec : 20;
    delayUnit = "seconds";
    needWait = true;
  }
  // PRIORIDADE 3: Se veio booking_date e configuracoes do estudio
  else if (body.booking_date) {
    const apptDate = parseDateTime(body.booking_date, body.booking_time);
    if (apptDate) {
      if (action === "lembrete") {
        const rVal = body.reminder_value || 2;
        const rUnit = body.reminder_unit || 'minutes';
        const targetMs = apptDate.getTime() - unitToMs(rVal, rUnit);
        const diffSec = Math.round((targetMs - Date.now()) / 1000);
        delayAmount = diffSec > 0 ? diffSec : 20;
        delayUnit = "seconds";
        needWait = true;
      } else if (action === "followup") {
        const fVal = body.followup_value || 2;
        const fUnit = body.followup_unit || 'minutes';
        const targetMs = apptDate.getTime() + unitToMs(fVal, fUnit);
        const diffSec = Math.round((targetMs - Date.now()) / 1000);
        delayAmount = diffSec > 0 ? diffSec : 60;
        delayUnit = "seconds";
        needWait = true;
      }
    }
  }
  // PRIORIDADE 4: Se veio delayAmount e delayUnit genéricos
  else if (typeof body.delayAmount !== "undefined" && Number(body.delayAmount) > 0) {
    delayAmount = Number(body.delayAmount);
    delayUnit = body.delayUnit || "minutes";
    needWait = true;
  }
}

return [{
  json: {
    phone: rawPhone,
    message: message,
    action: action,
    instance: instance,
    delayAmount: delayAmount,
    delayUnit: delayUnit,
    needWait: needWait,
    booking_date: body.booking_date || null,
    booking_time: body.booking_time || null,
    config: {
      reminder_value: body.reminder_value || null,
      reminder_unit: body.reminder_unit || null,
      followup_value: body.followup_value || null,
      followup_unit: body.followup_unit || null
    },
    receivedAt: new Date().toISOString()
  }
}];
`
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [320, 300],
        id: "code-preparar",
        name: "Processar Dados & Delay"
      },
      {
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              typeValidation: "strict"
            },
            conditions: [
              {
                id: "c1",
                leftValue: "={{ $json.needWait }}",
                rightValue: true,
                operator: {
                  type: "boolean",
                  operation: "equals"
                }
              }
            ],
            combinator: "and"
          },
          options: {}
        },
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position: [540, 300],
        id: "if-wait",
        name: "Precisa Aguardar?"
      },
      {
        parameters: {
          amount: "={{ $json.delayAmount }}",
          unit: "={{ $json.delayUnit }}"
        },
        type: "n8n-nodes-base.wait",
        typeVersion: 1.1,
        position: [760, 200],
        id: "wait-node",
        name: "Aguardar (Lembrete/Followup)"
      },
      {
        parameters: {
          method: "POST",
          url: "=https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/{{ $json.instance }}",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "apikey",
                value: "020F2F224360-40F7-B022-D17AB8E529E2"
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          specifyBody: "keypair",
          bodyParameters: {
            parameters: [
              { name: "number", value: "={{ $json.phone }}" },
              { name: "text", value: "={{ $json.message }}" }
            ]
          },
          options: {},
          onError: "continueRegularOutput"
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [1020, 300],
        id: "http-evolution",
        name: "Disparar WhatsApp (Evolution API)"
      }
    ],
    connections: {
      "Campainha Indica AI": {
        main: [
          [{ node: "Processar Dados & Delay", type: "main", index: 0 }]
        ]
      },
      "Processar Dados & Delay": {
        main: [
          [{ node: "Precisa Aguardar?", type: "main", index: 0 }]
        ]
      },
      "Precisa Aguardar?": {
        main: [
          [{ node: "Aguardar (Lembrete/Followup)", type: "main", index: 0 }],
          [{ node: "Disparar WhatsApp (Evolution API)", type: "main", index: 0 }]
        ]
      },
      "Aguardar (Lembrete/Followup)": {
        main: [
          [{ node: "Disparar WhatsApp (Evolution API)", type: "main", index: 0 }]
        ]
      }
    },
    settings: {
      executionOrder: "v1"
    }
  };

  console.log("Atualizando workflow Indica AI...");
  const resUpdate = await apiRequest('PUT', '/workflows/LVc5U5TgedX8t5GR', indicaWorkflow);
  console.log("Update status:", resUpdate.status);

  console.log("Ativando workflow Indica AI...");
  const resActivate = await apiRequest('POST', '/workflows/LVc5U5TgedX8t5GR/activate');
  console.log("Activate status:", resActivate.status, resActivate.data?.active);

  // 2. WORKFLOW RECEPTOR DE EVENTOS DA EVOLUTION (Para substituir o Ngrok de vez)
  console.log("\nCriando workflow Evolution API Eventos Inbound...");
  const evolutionInboundWorkflow = {
    name: "Evolution API — Receptor de Webhooks & Inbound",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "evolution-events",
          responseMode: "onReceived",
          responseData: "allEntries",
          options: {}
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [100, 300],
        id: "webhook-evolution",
        name: "Webhook Evolution Inbound",
        webhookId: "evolution-events"
      },
      {
        parameters: {
          jsCode: `
// Loga o evento recebido da Evolution API
const event = $json.body?.event || "unknown";
const instance = $json.body?.instance || "wats";
console.log("[n8n Evolution Webhook] Event:", event, "Instance:", instance);

return [{
  json: {
    event: event,
    instance: instance,
    receivedAt: new Date().toISOString(),
    payload: $json.body
  }
}];
`
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [340, 300],
        id: "code-log",
        name: "Registrar Evento"
      }
    ],
    connections: {
      "Webhook Evolution Inbound": {
        main: [
          [{ node: "Registrar Evento", type: "main", index: 0 }]
        ]
      }
    },
    settings: {
      executionOrder: "v1"
    }
  };

  const resEvo = await apiRequest('POST', '/workflows', evolutionInboundWorkflow);
  console.log("Criação Evolution Inbound:", resEvo.status, resEvo.data?.id);
  if (resEvo.data?.id) {
    const resActEvo = await apiRequest('POST', `/workflows/${resEvo.data.id}/activate`);
    console.log("Ativação Evolution Inbound:", resActEvo.status, resActEvo.data?.active);
  }

  console.log("\n=== CONCLUÍDO COM SUCESSO! ===");
}

main().catch(console.error);
