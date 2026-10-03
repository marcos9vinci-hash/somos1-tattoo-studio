# ADR 001: Separação Arquitetural do Duplo Funil (Comercial vs Carteira de Retenção)

> Status: Aprovado / Implementado
> Data: 2026-10-03
> Decisores: Arquitetura Somos 1 / Indica Aí
> Escala de Confiança: 🟢 CONFIRMADO (Código)

---

## Contexto
Um estúdio de tatuagem possui duas dinâmicas comerciais completamente distintas:
1. **Conversão de Vendas (Pré-Tattoo):** Leads que precisam de resposta rápida, qualificação de arte (SPIN Selling), orçamento e cobrança de sinal para agendamento.
2. **Retenção & LTV (Pós-Tattoo):** Clientes que já tatuaram e passam por cicatrização, solicitação de fotos, retoques e incentivo à 2ª tattoo ou indicação de amigos no Indica Aí.

Manter todos em um único Kanban sobrecarregava a visão da equipe comercial e misturava métricas de conversão de novos clientes com churn de clientes antigos.

---

## Decisão
Implementar dois funis independentes mas sincronizados:
1. **Funil 1 — Comercial (`leads`):** Colunas: Novo, Qualificação, Negociação, Agendado, Concluído, Pós-Venda, Follow-up, Perdido.
2. **Funil 2 — Carteira de Clientes (`ClienteCarteiraTempStage`):** Esteira temporal baseada em `diasSemContato`: Quente (0-7d), Morno (8-30d), Esfriando (31-90d), Alerta (91-179d), Expirado (>180d) e Desmarcou (No-Show).

A transição é automática: após 15 dias de cicatrização no Funil Comercial, o cliente sai do Kanban de vendas e passa a viver exclusivamente na Carteira. Se desejar uma nova tattoo, o botão "Reabrir no Funil" gera um lead vinculado sem duplicar o usuário.

---

## Alternativas Consideradas
- **Funil Único com Filtros:** Descartado porque poluía visualmente o Kanban diário com centenas de clientes de anos anteriores.
- **Tabelas Estáticas de Clientes:** Descartado porque não fornecia o apelo visual de esteira nem acionamento de campanhas segmentadas por temperatura.

---

## Consequências
- **Positivas:** Clareza absoluta do time de vendas; automações de WhatsApp segmentadas pelo tempo exato pós-tattoo; integridade das métricas de CAC e conversão.
- **Negativas / Atenção:** Necessidade de algoritmo de reconciliação em memória (`crmService.getLeads()`) para garantir que agendamentos futuros reflitam corretamente no funil de vendas sem duplicações.
