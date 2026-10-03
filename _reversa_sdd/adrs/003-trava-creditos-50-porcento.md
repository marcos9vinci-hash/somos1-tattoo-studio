# ADR 003: Limite Máximo de Abatimento de Créditos em 50% (Margem do Estúdio)

> Status: Aprovado / Implementado
> Data: 2026-10-03
> Decisores: Diretoria Financeira Somos 1
> Escala de Confiança: 🟢 CONFIRMADO (Código)

---

## Contexto
O programa de afiliados Indica Aí bonifica embaixadores com créditos acumuláveis em dinheiro interno (`creditsBalance`). Sem uma trava de teto percentual, um cliente com alto volume de indicações poderia solicitar uma tatuagem de valor elevado (ex: R$ 1.500) com custo zero (100% de desconto), impossibilitando o repasse financeiro do tatuador contratado e o pagamento dos insumos consumidos na bancada (agulhas, tintas, anestésicos, luvas).

---

## Decisão
Fixar em nível de código no motor de reserva (`src/pages/Booking.tsx:121`) o teto máximo de utilização de créditos em **50% do valor estimado da tatuagem**:
```typescript
const maxCreditUsage = Math.min(creditsAvailable, estimatedValue * 0.5);
```
O restante do valor (no mínimo 50%) deve ser obrigatoriamente quitado em moeda corrente (PIX, dinheiro ou cartão).

---

## Alternativas Consideradas
- **Abatimento Livre de 100%:** Rejeitado pelo risco direto de fluxo de caixa e desmotivação dos tatuadores comissionados.
- **Teto Fixo em Reais (ex: no máximo R$ 200 de desconto):** Rejeitado porque desestimulava clientes a fecharem projetos grandes (fechamentos de costas, braços inteiros).

---

## Consequências
- **Positivas:** Margem de segurança financeira garantida; sustentabilidade de longo prazo do programa de afiliados; percepção de valor elevada pelo cliente.
- **Negativas / Atenção:** Clientes com saldos muito altos precisam realizar múltiplas sessões para usufruir de todo o crédito acumulado.
