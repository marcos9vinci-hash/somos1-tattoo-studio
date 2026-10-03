# Mapeamento do Legado — Módulo: Agenda & Booking

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Arquivos de Código Fonte

### 1.1 Modelos e Configurações de Agenda
- **Arquivo:** `src/types.ts`
  - **Linhas:** 68 a 140 (Enums `BookingStatus`, interfaces `StudioSettings`, `StudioRule`, `Booking`, `CreditTransaction`, `AppNotification`).
  - **Papel:** Estruturas de dados canônicas de agendamentos e regras operacionais do estúdio.

### 1.2 Telas de Agendamento do Cliente
- **Arquivo:** `src/pages/Booking.tsx`
  - **Linhas:** 1 a 618
  - **Papel:** Fluxo de agendamento em etapas:
    1. Escolha de Porte (Pequena, Média, Grande) e Região do Corpo.
    2. Upload de fotos de referência (conversão em base64 DataURL).
    3. Seleção de Data e Horário em calendário customizado com validação de slots.
    4. Cálculo de abatimento financeiro com créditos Indica Aí (limite 50%).
    5. Confirmação, gravação em `bookings`, débito de créditos e disparo do ciclo WhatsApp.

### 1.3 Componentes Administrativos de Gestão da Agenda
- **Arquivo:** `src/components/admin/UnifiedCalendar.tsx`
  - **Papel:** Visão administrativa integrada de sessões diárias/mensais com status coloridos.
- **Arquivo:** `src/components/admin/DetalhesAgendamentoModal.tsx`
  - **Papel:** Visualização completa dos detalhes do agendamento, foto de referências, alteração de status e botões de contato.
- **Arquivo:** `src/components/admin/NovoAgendamentoWizard.tsx`
  - **Papel:** Assistente rápido para administradores encaixarem clientes manualmente na agenda.
- **Arquivo:** `src/components/admin/AgendaScheduleSettingsModal.tsx`
  - **Papel:** Configuração de horários de abertura/fechamento, dias úteis, limites diários e intervalos bloqueados.
