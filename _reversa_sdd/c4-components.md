# Diagrama C4 — Nível 3: Componentes Internos da SPA

> Gerado pelo Reversa Architect em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Código)

---

## 1. Decomposição de Componentes da Single Page Application (SPA)

```mermaid
flowchart TD
    subgraph UI_Pages["Camada de Apresentação (Telas & Páginas)"]
        PageCRM["CRMDashboardPage.tsx<br/>[Dashboard Vendas & Carteira]"]
        PageNetwork["Network.tsx<br/>[Árvore de Afiliados Indica Aí]"]
        PageBooking["Booking.tsx<br/>[Wizard de Agendamento]"]
        PageGaleria["GaleriaIA.tsx<br/>[Estúdio Social & Calendário]"]
        PageAdmin["Admin.tsx<br/>[Hub de Governança com ErrorBoundary]"]
    end

    subgraph Core_Services["Camada de Serviços & Lógica de Negócio"]
        SvcCRM["crmService.ts<br/>- getLeads()<br/>- getClientes()<br/>- calcularBucketTemperatura()<br/>- reabrirNoFunilComercial()"]
        SvcReferral["referralUtils.ts<br/>- buildReferralTree()<br/>- calculateTreeStats()<br/>- flattenTreeByLevels()"]
        SvcWhatsApp["whatsappService.ts<br/>- sendMessage()<br/>- sendViaN8n()<br/>- sendDirectEvolution()<br/>- triggerBookingLifecycle()"]
        SvcCredit["creditService.ts<br/>- addCreditTransaction()<br/>- getBalance()"]
        ParserIntent["whatsappIntentParser.ts<br/>- parseArtistIntent()"]
    end

    subgraph Shared_Contexts["Estado Compartilhado & Contextos"]
        AuthCtx["AuthContext.tsx<br/>- user, profile, isAdmin<br/>- refreshProfile()"]
    end

    %% Ligações
    PageCRM --> SvcCRM
    PageCRM --> SvcWhatsApp
    PageNetwork --> SvcReferral
    PageBooking --> SvcWhatsApp
    PageBooking --> AuthCtx
    PageAdmin --> SvcCRM
    PageAdmin --> SvcCredit
    PageAdmin --> SvcWhatsApp
    SvcCRM --> SvcWhatsApp
    SvcWhatsApp --> ParserIntent
```
