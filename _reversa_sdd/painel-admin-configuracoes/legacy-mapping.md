# Mapeamento do Legado — Módulo: Painel Admin & Configurações

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Arquivos de Código Fonte

### 1.1 Telas Administrativas
- **Arquivo:** `src/pages/Admin.tsx`
  - **Linhas:** 1 a 2.300
  - **Papel:** Tela mestre administrativa. Gerencia estado global de abas, controle de acesso (`isAdmin`), mutações no Firestore para usuários, regras do estúdio, campanhas promocionais, convites e instâncias da Evolution API.
- **Arquivo:** `src/pages/AdminDashboard.tsx`
  - **Papel:** Visão consolidada de KPIs de faturamento, volume de indicações e uso de créditos.

### 1.2 Componentes e Serviços de Suporte
- **Arquivo:** `src/lib/creditService.ts`: Serviço de concessão e débito transacional de créditos no Firestore.
- **Arquivo:** `src/components/admin/DetalhesAgendamentoModal.tsx`: Edição e override de status de agendamentos.
- **Arquivo:** `src/components/admin/AgendaScheduleSettingsModal.tsx`: Ajustes de parâmetros da agenda.
- **Arquivo:** `src/components/admin/WhatsAppAutomationModal.tsx`: Parâmetros de mensageria da Evolution API.
