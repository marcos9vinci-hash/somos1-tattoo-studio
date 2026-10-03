# Fluxograma — Automação WhatsApp & n8n (Somos 1 / Indica Aí)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído de `src/lib/whatsappService.ts`, `src/lib/whatsappBatchScanner.ts`)

---

## 1. Arquitetura de Disparo Resiliente de Mensageria

O envio de mensagens WhatsApp conta com redundância de canal duplo:
1. **Canal Primário:** Webhook n8n (`https://www.marcos9vinci.dedyn.io/webhook/indica-automacao`) com timeout rigoroso de 4.000 ms.
2. **Canal Secundário (Fallback Imediato):** Chamada direta à Evolution API (`https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/wats`).

```mermaid
flowchart TD
    TriggerNode["Evento de Gatilho<br/>(Novo Booking / Transição Funil / Campanha Carteira)"] --> PrepMessage["whatsappService.sendMessage(to, text, settings, action)"]
    
    PrepMessage --> FormatPhone["Normaliza Telefone:<br/>Remove não-dígitos + prefixo 55"]
    
    FormatPhone --> TryN8n["1. Tenta envio via n8n Webhook<br/>(Timeout: 4000ms com AbortController)"]
    
    TryN8n --> N8nCheck{"n8n respondeu<br/>HTTP 200 OK?"}
    
    N8nCheck -- Sim --> SuccessN8n["✅ Mensagem enfileirada no n8n<br/>(Com delays e inteligência de cadência)"]
    
    N8nCheck -- Não (Erro ou Timeout) --> FallbackLog["⚠️ Log de aviso: n8n offline/timeout"]
    
    FallbackLog --> DirectEvolution["2. Dispara Fallback Direto:<br/>Evolution API (/message/sendText/wats)"]
    
    DirectEvolution --> EvolutionCheck{"Evolution API<br/>retornou HTTP 200?"}
    
    EvolutionCheck -- Sim --> SuccessEvo["✅ Mensagem entregue via Evolution API direta"]
    EvolutionCheck -- Não --> FailEvo["❌ Erro registrado no console<br/>(Falha de entrega documentada)"]

    SuccessN8n --> EndNode(["Fim"])
    SuccessEvo --> EndNode
    FailEvo --> EndNode
```

---

## 2. Pipeline Temporal de Ciclo de Vida do Agendamento

```mermaid
flowchart LR
    BookingCreated["Booking Criado"] --> Step1["1. Confirmação Imediata<br/>(delay = 0s)"]
    Step1 --> Step2["2. Check-in de Pré-Sessão<br/>(ex: 2h antes)"]
    Step2 --> Session["Sessão Realizada"]
    Session --> Step3["3. Follow-up de Cicatrização<br/>(ex: 24h a 48h pós-sessão)"]
```
