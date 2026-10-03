# Indica Aí (Afiliados & Recomendações) — Especificação de Requisitos (Requirements)

> Status: 🟢 CONFIRMADO (Extraído diretamente de `src/lib/referralUtils.ts`, `src/pages/Network.tsx`)
> Layout: Feature-Folder / Módulo

---

## 1. Visão Geral
O módulo implementa o motor de crescimento viral do estúdio baseado em Member-Get-Member (MGM). Transforma clientes em embaixadores ativos da marca que recebem créditos (cashback) em até 3 níveis de profundidade sobre todas as tatuagens concluídas em sua rede.

---

## 2. Responsabilidades
- Gerar e gerenciar códigos únicos de convite (`inviteCode`) por usuário.
- Construir a árvore genealógica recursiva unilevel até 3 níveis de profundidade.
- Calcular comissões em créditos baseando-se no valor gasto em sessões concluídas.
- Consolidar métricas agregadas da rede (total de pessoas, contagem por nível, tattoos feitas).
- Permitir visualização em árvore interativa SVG/CSS e em lista plana filtrável.

---

## 3. Regras de Negócio

| ID | Regra | Confiança | Evidência no Código |
|---|---|:---:|---|
| **RN-IND-01** | Comissões são de exatamente 10% para Nível 1, 5% para Nível 2 e 2.5% para Nível 3. | 🟢 | `src/lib/referralUtils.ts:54-56` |
| **RN-IND-02** | Créditos são gerados **exclusivamente sobre agendamentos com status `COMPLETED`**. | 🟢 | `src/lib/referralUtils.ts:43-58` |
| **RN-IND-03** | A profundidade máxima da árvore é limitada estritamente a 3 níveis (`maxDepth = 3`). | 🟢 | `src/lib/referralUtils.ts:30` |
| **RN-IND-04** | Prevenção absoluta contra laços circulares: um usuário não pode ser pai de si mesmo (`u.uid !== user.uid`). | 🟢 | `src/lib/referralUtils.ts:63` |
| **RN-IND-05** | Créditos calculados são arredondados para inteiros (`Math.round`). | 🟢 | `src/lib/referralUtils.ts:58` |

---

## 4. Requisitos Funcionais

| ID | Requisito | MoSCoW | Critério de Aceite |
|---|---|:---:|---|
| **RF-IND-01** | Construir grafo unilevel completo a partir do usuário raiz até 3 níveis. | Must | Retornar nó raiz com lista de filhos e metadados agregados. |
| **RF-IND-02** | Calcular comissões acumuladas por nó da árvore. | Must | Somar gastos de sessões `COMPLETED` e aplicar alíquota do nível correspondente. |
| **RF-IND-03** | Permitir alternar entre visualização gráfica da Árvore e Lista de Indicados. | Should | Na lista, permitir filtrar por status (`completed`, `scheduled`, `lead`). |
| **RF-IND-04** | Compartilhar link de convite personalizado com mensagem formatada para WhatsApp. | Must | Link deve conter o código `inviteCode` do titular. |

---

## 5. Critérios de Aceitação (Gherkin)

```gherkin
Cenário: Amigo indicado direto conclui tattoo de R$ 500
  Dado que o usuário "Lucas" indicou "Ana" (Nível 1)
  Quando "Ana" concluir uma tatuagem no valor de R$ 500 (Booking COMPLETED)
  Então o usuário "Lucas" deve receber 50 créditos (10% de R$ 500)

Cenário: Amigo de 2º nível conclui tattoo de R$ 800
  Dado que "Ana" indicou "Carlos" (Nível 2 em relação a "Lucas")
  Quando "Carlos" concluir uma tatuagem no valor de R$ 800
  Então "Ana" deve receber 80 créditos (10% N1)
  E "Lucas" deve receber 40 créditos (5% N2)
```
