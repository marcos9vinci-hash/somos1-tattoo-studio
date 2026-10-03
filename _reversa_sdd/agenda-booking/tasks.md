# Agenda & Booking — Tarefas de Implementação (Tasks)

> Status: 🟢 CONFIRMADO (Plano Executável)
> Layout: Feature-Folder / Módulo

---

## Pré-requisitos
- [x] Tipos `Booking`, `BookingStatus`, `StudioSettings` definidos em `src/types.ts`
- [x] Autenticação ativa via `AuthContext`
- [x] Conexão com `whatsappService`

---

## Tarefas de Implementação

- [ ] **T-AGE-01:** Implementar a lógica de cálculo de valor estimado e teto de créditos (50%)
  - Origem: `src/pages/Booking.tsx:119-122`
  - Critério de Pronto: Limitar `maxCreditUsage` a no máximo 50% de `estimatedValue`.
  - Confiança: 🟢

- [ ] **T-AGE-02:** Implementar a mutação transacional `handleConfirm`
  - Origem: `src/pages/Booking.tsx:124-197`
  - Critério de Pronto: Gravar booking, decrementar créditos em `users`, criar extrato em `transactions` e notificar admins.
  - Confiança: 🟢

- [ ] **T-AGE-03:** Conectar o acionador do ciclo de vida de mensagens WhatsApp
  - Origem: `src/pages/Booking.tsx:182-189`
  - Critério de Pronto: Disparar `whatsappService.triggerBookingLifecycle` passando o ID do agendamento recém-criado.
  - Confiança: 🟢

---

## Tarefas de Teste

- [ ] **TT-AGE-01:** Testar agendamento em data com 5 sessões existentes (deve bloquear quando atingir `maxSessionsPerDay`).
- [ ] **TT-AGE-02:** Testar agendamento com saldo de créditos zerado (deve prosseguir sem registrar transação de desconto).
