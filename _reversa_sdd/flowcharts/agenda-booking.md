# Fluxograma — Agenda & Booking (Somos 1 / Indica Aí)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído diretamente de `src/pages/Booking.tsx`, `src/types.ts`)

---

## 1. Ciclo de Vida do Agendamento (Máquina de Estados)

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL: Solicitação criada pelo cliente
    
    PENDING_APPROVAL --> APPROVED: Estúdio / Tatuador aceita
    PENDING_APPROVAL --> REJECTED: Horário indisponível ou fora de escopo
    
    APPROVED --> DEPOSIT_PAID: Sinal de segurança pago (ex: R$ 80)
    APPROVED --> RESCHEDULED: Reagendamento solicitado
    
    DEPOSIT_PAID --> COMPLETED: Sessão de tattoo finalizada
    DEPOSIT_PAID --> NO_SHOW: Cliente não compareceu
    DEPOSIT_PAID --> RESCHEDULED: Cliente pede nova data
    
    RESCHEDULED --> APPROVED: Nova data confirmada
    
    COMPLETED --> [*]: Entra na Carteira de Clientes (Quente)
    NO_SHOW --> [*]: Entra na Carteira de Clientes (Desmarcou)
    REJECTED --> [*]
```

---

## 2. Fluxograma da Ação: `handleConfirm` (Criação de Agendamento)

```mermaid
flowchart TD
    Start(["Início: handleConfirm()"]) --> ValidateInput{"Data e Horário<br/>selecionados?"}
    ValidateInput -- Não --> Abort(["Aborta"])
    
    ValidateInput -- Sim --> CalcCredits["Calcula Abatimento com Créditos:<br/>maxCreditUsage = min(creditsBalance, estimatedValue * 0.50)<br/>(Trava de segurança: máximo 50% de desconto)"]
    
    CalcCredits --> InsertBooking["Grava na coleção 'bookings':<br/>- status = PENDING_APPROVAL<br/>- priceEstimated = estimatedValue<br/>- creditsUsed = maxCreditUsage"]
    
    InsertBooking --> CheckCreditsUsed{"maxCreditUsage > 0?"}
    
    CheckCreditsUsed -- Sim --> DeductCredits["Atualiza 'users/{uid}':<br/>creditsBalance -= maxCreditUsage"]
    DeductCredits --> LogTransaction["Registra na coleção 'transactions':<br/>type = BOOKING_DISCOUNT"]
    
    CheckCreditsUsed -- Não --> NotifyAdmins
    LogTransaction --> NotifyAdmins
    
    NotifyAdmins["Consulta 'users' onde role == 'admin':<br/>Grava notificações na coleção 'notifications'"]
    
    NotifyAdmins --> TriggerWhatsApp["Aciona whatsappService.triggerBookingLifecycle():<br/>1. Mensagem de Confirmação Imediata<br/>2. Agenda Lembrete Pré-Sessão<br/>3. Agenda Follow-up Pós-Sessão"]
    
    TriggerWhatsApp --> NavigateHome["Redireciona para tela principal ('/')"]
    NavigateHome --> EndNode(["Fim"])
```
