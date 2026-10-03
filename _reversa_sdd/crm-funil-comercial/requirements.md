# CRM & Funil Comercial — Especificação de Requisitos (Requirements)

> Status: 🟢 CONFIRMADO (Extraído diretamente de `src/types/crm.ts`, `src/lib/crmService.ts`)
> Layout: Feature-Folder / Módulo

---

## 1. Visão Geral
Gerencia o ciclo de vida completo de clientes do estúdio através de dois funis coordenados: o **Funil Comercial (Pré-Tattoo)**, para conversão rápida de leads via WhatsApp e SPIN Selling, e a **Carteira de Clientes (Pós-Tattoo)**, para acompanhamento de cicatrização, retenção e reativação escalonada por temperatura (`diasSemContato`).

---

## 2. Responsabilidades
- Ingestão e qualificação de novos leads vindos de WhatsApp, Instagram, Indica Aí ou inserção manual.
- Apoio ao atendimento consultivo com agentes de IA especializados por coluna do Kanban.
- Reconciliação híbrida em memória entre agendamentos da Agenda Oficial (`bookings`) e leads em negociação (`leads`).
- Cálculo contínuo da temperatura da base de clientes e disparo de cadências de retenção.
- Reativação de clientes antigos gerando novos leads sem duplicação de perfil.

---

## 3. Regras de Negócio

| ID | Regra | Confiança | Evidência no Código |
|---|---|:---:|---|
| **RN-CRM-01** | Sessões concluídas até 15 dias atrás permanecem temporariamente no Funil Comercial em `pos_venda` para suporte à cicatrização. A partir do 16º dia, são transferidas exclusivamente para a Carteira. | 🟢 | `src/lib/crmService.ts:81` |
| **RN-CRM-02** | O status `quente` (0 a 7 dias) é restrito a clientes com `totalSessoes > 0`. | 🟢 | `src/types/crm.ts:191` |
| **RN-CRM-03** | No-Show ou Cancelamento (`no_show`, `rejected`) força o cliente para a coluna `desmarcou`, com precedência sobre cálculo de dias. | 🟢 | `src/types/crm.ts:180` |
| **RN-CRM-04** | Deduplicação de clientes é feita pelo número de telefone normalizado (`replace(/\D/g, '')`). | 🟢 | `src/lib/crmService.ts:90` |
| **RN-CRM-05** | Ao reabrir cliente na carteira, cria-se novo lead com `origem = 'reativacao_carteira'` e vincula-se `emReativacaoLeadId`. | 🟢 | `src/lib/crmService.ts:510` |

---

## 4. Requisitos Funcionais

| ID | Requisito | MoSCoW | Critério de Aceite |
|---|---|:---:|---|
| **RF-CRM-01** | Listar leads no Kanban comercial agrupados pelos estágios `novo`, `qualificacao`, `negociacao`, `agendado`, `concluido`, `pos_venda`, `followup`, `perdido`. | Must | Leads manuais e agendamentos futuros devem aparecer nas respectivas colunas sem duplicatas. |
| **RF-CRM-02** | Permitir arrastar e soltar (drag-and-drop) leads entre colunas com atualização imediata no Firestore. | Must | Alteração de coluna deve atualizar o campo `estagio` e `updatedAt`. |
| **RF-CRM-03** | Agrupar clientes da carteira pós-tattoo por buckets de temperatura: `quente`, `morno`, `esfriando`, `alerta`, `expirado`, `desmarcou`. | Must | O bucket deve ser recalculado dinamicamente com base em `diasSemContato`. |
| **RF-CRM-04** | Reabrir cliente inativo ou esfriando no Funil Comercial via ação de 1 clique. | Should | Cria lead com dados pré-preenchidos e marca cliente como `emReativacao`. |
| **RF-CRM-05** | Disparar mensagens de campanha segmentadas por temperatura via WhatsApp. | Should | Mensagens devem ser enviadas respeitando cadência e limite diário configurado. |

---

## 5. Critérios de Aceitação (Gherkin)

```gherkin
Cenário: Cliente conclui tatuagem recente
  Dado que o cliente "Bruno Silva" teve um booking marcado como COMPLETED há 3 dias
  Quando a tela do CRM for carregada
  Então o cliente deve aparecer no Funil Comercial na coluna "Pós-Venda (Cicatrização)"
  E deve aparecer na Carteira de Clientes no bucket "🔥 Quente (0-7d)"

Cenário: Cliente concluiu tatuagem há mais de 15 dias
  Dado que o cliente "Camila Rocha" concluiu uma tatuagem há 20 dias
  Quando o Funil Comercial for carregado
  Então o cliente NÃO deve aparecer nas colunas do Funil de Vendas
  E deve aparecer na Carteira de Clientes no bucket "🌿 Morno (8-30d)"

Cenário: Cliente falta à sessão (No-Show)
  Dado que o cliente "Marcos Souza" faltou à sessão agendada
  Quando o status for alterado para "no_show"
  Então o cliente deve ser movido compulsoriamente para o bucket "⚠️ Faltou / No-Show"
```

---

## 6. Rastreabilidade de Código

| Arquivo Legado | Responsabilidade Mapeada |
|---|---|
| `src/types/crm.ts` | Definição dos tipos `Lead`, `ClienteCRM`, enums de estágio e função `calcularBucketTemperatura`. |
| `src/lib/crmService.ts` | CRUD Firestore, reconciliação de agendamentos e transição entre funis. |
| `src/components/crm/LeadKanbanBoard.tsx` | Renderização do Kanban comercial e drag-and-drop. |
| `src/components/crm/Somos1ClientesKanban.tsx` | Renderização da esteira de temperatura da carteira. |
