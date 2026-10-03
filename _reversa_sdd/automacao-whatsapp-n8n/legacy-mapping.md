# Mapeamento do Legado — Módulo: Automação WhatsApp & n8n

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Arquivos de Código Fonte

### 1.1 Serviço de Mensageria e Conexões Externas
- **Arquivo:** `src/lib/whatsappService.ts`
  - **Linhas:** 1 a 636
  - **Endpoints integrados:**
    - Primário: `https://www.marcos9vinci.dedyn.io/webhook/indica-automacao` (Webhook n8n)
    - Fallback: `https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/{instance}` (Evolution API)
  - **Métodos principais:**
    - `sendMessage()`: Roteador resiliente n8n -> Evolution.
    - `sendViaN8n()`: Envio assíncrono com timeout de 4s via AbortController.
    - `sendDirectEvolution()`: Envio direto HTTP via API key do estúdio.
    - `triggerBookingLifecycle()`: Pipeline automatizado de 5 etapas do agendamento.

### 1.2 Interpretadores de Linguagem Natural e Escâner
- **Arquivo:** `src/lib/whatsappIntentParser.ts`
  - **Linhas:** 1 a 206
  - **Papel:** Reconhecimento de intenções (`APPROVE`, `REJECT`, `RESCHEDULE`, `UNCERTAIN`) em respostas de WhatsApp ou transcrições de áudio do tatuador.
- **Arquivo:** `src/lib/whatsappBatchScanner.ts`
  - **Linhas:** 1 a 355
  - **Papel:** Varredura em lote de conversas da Evolution API para descoberta e ingestão de novos leads no CRM.

### 1.3 Telas e Componentes de Controle de Automações
- **Arquivo:** `src/components/admin/WhatsAppAutomationModal.tsx`
  - **Papel:** Ativação/desativação de gatilhos automáticos (Lembretes, Check-in, Aniversários, Resgate).
- **Arquivo:** `src/components/admin/WhatsAppTemplatesModal.tsx`
  - **Papel:** Editor de mensagens com interpolação de tags dinâmicas (`{cliente}`, `{data}`, `{horario}`).
- **Arquivo:** `src/components/crm/SimuladorFluxoWhatsApp.tsx`
  - **Papel:** Simulador visual de envio e teste de réguas de contato.
