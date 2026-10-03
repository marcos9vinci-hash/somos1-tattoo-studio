# Automação WhatsApp & n8n — Design Técnico (Design)

> Status: 🟢 CONFIRMADO (Código Legado)
> Layout: Feature-Folder / Módulo

---

## 1. Interface & Assinaturas

```typescript
interface WhatsAppServiceContract {
  sendMessage(
    to: string,
    text: string,
    settings?: StudioSettings | null,
    action?: 'confirmacao' | 'reagendamento' | 'lembrete' | 'followup' | 'cancelamento'
  ): Promise<boolean>;

  sendViaN8n(payload: N8nPayload): Promise<boolean>;

  sendDirectEvolution(to: string, text: string, settings?: StudioSettings | null): Promise<boolean>;

  formatMessage(template: string, booking: Booking): string;
}
```

---

## 2. Fluxo de Envio com Tolerância a Falhas
1. `sendMessage` normaliza telefone extraindo caracteres não-numéricos e garantindo prefixo `55`.
2. Cria `AbortController` com `setTimeout(4000)`.
3. Executa `fetch(DEFAULT_N8N_WEBHOOK)` com cabeçalho `Content-Type: application/json`.
4. Se responder `status == 200`, cancela o timer e retorna `true`.
5. Se estourar 4s ou responder com status de erro, captura a exceção, emite log e invoca imediatamente `sendDirectEvolution`.
6. `sendDirectEvolution` monta URL da Evolution API (`{evolutionBaseUrl}/message/sendText/{evolutionInstance}`) e envia JSON com `apikey` nos cabeçalhos.
7. Retorna `true` se a Evolution API confirmar HTTP 200/201.
