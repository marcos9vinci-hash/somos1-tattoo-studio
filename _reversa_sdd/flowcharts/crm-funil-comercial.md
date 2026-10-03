# Fluxograma — CRM & Funil Comercial (Somos 1 / Indica Aí)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído diretamente de `src/types/crm.ts`, `src/lib/crmService.ts`)

---

## 1. Visão Geral da Arquitetura de Duplo Funil

O sistema opera com uma esteira comercial bifurcada:
1. **Funil 1 — Comercial (Pré-Tattoo):** Focado em conversão de leads vindos de WhatsApp, Instagram ou Indica Aí até a realização da tattoo.
2. **Funil 2 — Carteira de Clientes (Pós-Tattoo):** Esteira de retenção e reengajamento baseada no tempo desde a última tattoo (`diasSemContato`).

```mermaid
flowchart TD
    %% Início do Funil Comercial
    subgraph Funil_Comercial["Funil 1 — Comercial (Pré-Tattoo)"]
        LeadIn["Entrada de Lead<br/>(WhatsApp, Instagram, Indica Aí)"] --> Novo["1. Novo<br/>(Triagem Rápida & Boas-Vindas)"]
        Novo --> Qualif["2. Qualificação<br/>(Clone do Dono / SPIN Selling)"]
        Qualif --> Negoc["3. Negociação<br/>(Jonathan Copy / Orçamento & Sinal)"]
        Negoc --> Agendado["4. Sessão Agendada<br/>(Agenda Oficial do Estúdio)"]
        
        Agendado -->|Tattoo Realizada| Concluido["5. Concluído<br/>(Sessão Realizada)"]
        Agendado -->|Cliente Faltou / Desmarcou| NoShow["No-Show / Desmarcou"]
        
        Novo -.->|Sumiu| Followup["Follow-up / Resgate"]
        Qualif -.->|Sem interesse| Perdido["Perdido"]
        Negoc -.->|Sem fechar| Followup
    end

    %% Transição para a Carteira de Clientes
    Concluido -->|0 a 7 dias| Quente
    NoShow -->|Direto para coluna| DesmarcouCol

    %% Funil de Carteira
    subgraph Carteira_Clientes["Funil 2 — Carteira de Clientes (Pós-Tattoo / Esteira de Temperatura)"]
        Quente["🔥 Quente (0 a 7 dias)<br/>Cicatrização Inicial & Pomada"]
        Morno["🌿 Morno (8 a 30 dias)<br/>Foto & Retoque / Indica Aí"]
        Esfriando["❄️ Esfriando (31 a 90 dias)<br/>2ª Tattoo / Novo Projeto"]
        Alerta["⚠️ Alerta (91 a 179 dias)<br/>Créditos a vencer / Reativação"]
        Expirado["🛑 Expirado (> 180 dias)<br/>Inativo / Campanha Especial"]
        DesmarcouCol["⚠️ Faltou / No-Show<br/>Resgate de Agendamento"]
        
        Quente -->|Tempo passa| Morno
        Morno -->|Tempo passa| Esfriando
        Esfriando -->|Tempo passa| Alerta
        Alerta -->|Tempo passa| Expirado
    end

    %% Reativação
    Carteira_Clientes -.->|Reabrir Lead no Funil| Reativacao["🔄 Em Reativação<br/>(Gera Lead no Funil 1)"]
    Reativacao --> Negoc
```

---

## 2. Agentes de IA por Coluna do Funil Comercial

| Coluna | ID Agente | Papel & Tom de Voz | Origem / Framework |
|---|---|---|---|
| **Novo** | `agent_novo` | Recepção ágil (`casual_estudio`) | NAIA Onboarding & Triagem |
| **Qualificação** | `agent_qualificacao` | Qualificação SPIN/BANT (`consultivo_spin`) | Subagente 02 — Clone do Dono |
| **Negociação** | `agent_negociacao` | Apresentação de valor e sinal (`persuasivo_copy`) | Subagente 04 — Jonathan Copywriter |
| **Agendado** | `agent_agendado` | Confirmação e lembretes pré-sessão | Agenda Oficial / Evolution API |
| **Pós-Venda** | `agent_posvenda` | Acompanhamento de cicatrização (`acolhedor_posvenda`) | Subagente 06 — Juliana Cuidados |
| **Follow-up** | `agent_followup` | Reengajamento de contatos frios | NAIA Resgate |
