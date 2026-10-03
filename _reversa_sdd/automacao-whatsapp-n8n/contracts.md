# Automação WhatsApp & n8n — Contratos de Integração (Contracts)

> Status: 🟢 CONFIRMADO
> Layout: Feature-Folder / Módulo

---

## 1. Contrato Webhook n8n (Saída da SPA ➔ n8n)

- **URL:** `https://www.marcos9vinci.dedyn.io/webhook/indica-automacao`
- **Método:** `POST`
- **Cabeçalhos:** `Content-Type: application/json`

### Payload JSON de Requisição:
```json
{
  "action": "confirmacao",
  "phone": "5511999998888",
  "message": "Olá Bruno! Sua sessão está confirmada para 15/10 às 14:00.",
  "delay_seconds": 0,
  "delayAmount": 0,
  "delayUnit": "minutes",
  "instance": "wats"
}
```

---

## 2. Contrato Evolution API (Fallback da SPA ➔ Evolution API)

- **URL:** `https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/wats`
- **Método:** `POST`
- **Cabeçalhos:**
  - `Content-Type: application/json`
  - `apikey: 020F2F224360-40F7-B022-D17AB8E529E2`

### Payload JSON de Requisição:
```json
{
  "number": "5511999998888",
  "text": "Olá Bruno! Sua sessão está confirmada para 15/10 às 14:00.",
  "linkPreview": true
}
```

### Resposta de Sucesso esperada (HTTP 200/201):
```json
{
  "key": {
    "remoteJid": "5511999998888@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5F6..."
  },
  "status": "PENDING"
}
```
