# Mapeamento do Legado — Módulo: CRM & Funil Comercial

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Arquivos de Código Fonte

### 1.1 Modelos e Tipos
- **Arquivo:** `src/types/crm.ts`
  - **Linhas:** 1 a 271
  - **Papel:** Definição canônica de `Lead`, `ClienteCRM`, `LeadStage`, `ClienteCarteiraTempStage`, `SPINAnalysis`, `ColunaAIAgentConfig`.
  - **Função canônica:** `calcularBucketTemperatura` (linhas 172–196).

### 1.2 Camada de Serviços e Firestore
- **Arquivo:** `src/lib/crmService.ts`
  - **Linhas:** 1 a 940
  - **Papel:** CRUD e lógica de negócios do CRM.
  - **Métodos principais:**
    - `getLeads()` (linhas 39–224): Reconciliação híbrida de leads e bookings.
    - `getClientes()` (linhas 292–430): Agregação de clientes e cálculo de temperatura.
    - `reabrirNoFunilComercial()` (linhas 510–540): Transição carteira -> funil de vendas.
    - `dispararCampanhaWhatsApp()` (linhas 600–680): Integração de disparo com `whatsappService`.

### 1.3 Configurações de IA e Campanhas
- **Arquivo:** `src/lib/defaultEstrategias.ts`
  - **Linhas:** 1 a 88
  - **Papel:** Estratégias padrão de disparo WhatsApp para cada temperatura.
- **Arquivo:** `src/lib/naiaAgentsConfig.ts`
  - **Linhas:** 1 a 160
  - **Papel:** Prompts, tom de voz e personas para os agentes de IA de cada coluna do funil.

### 1.4 Telas e Componentes de Interface
- **Arquivo:** `src/pages/CRMDashboardPage.tsx`
  - **Papel:** Dashboard com KPIs, métricas e visualização geral.
- **Arquivo:** `src/components/crm/LeadKanbanBoard.tsx`
  - **Papel:** Quadro Kanban interativo de vendas com drag-and-drop.
- **Arquivo:** `src/components/crm/Somos1ClientesKanban.tsx`
  - **Papel:** Quadro Kanban da esteira de temperatura pós-tattoo.
- **Arquivo:** `src/components/crm/LeadModal.tsx`
  - **Papel:** Modal para visualização e edição detalhada do Lead.
- **Arquivo:** `src/components/crm/Somos1ClientDetailPane.tsx`
  - **Papel:** Painel lateral de histórico e interações do cliente.
