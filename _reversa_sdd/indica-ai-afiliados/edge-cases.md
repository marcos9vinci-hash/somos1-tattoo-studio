# Indica Aí (Afiliados & Recomendações) — Casos de Borda (Edge Cases)

> Status: 🟢 CONFIRMADO
> Layout: Feature-Folder / Módulo

---

## 1. Casos Extremos Mapeados no Legado

### EC-IND-01: Auto-Indicação ou Ciclos de Convite
- **Problema:** Um usuário A convida B, que convida A, gerando um grafo cíclico infinito que estouraria a pilha de chamadas (Stack Overflow) da recursão.
- **Tratamento:** O filtro `u.referredBy === user.uid && u.uid !== user.uid` e o limitador estrito `level < maxDepth` garantem que a árvore nunca ultrapasse 3 iterações de profundidade.

### EC-IND-02: Usuário novo sem rede de indicados na visualização inicial
- **Problema:** Usuário recém-cadastrado acessa a tela `/network` e visualizaria uma árvore vazia sem entender o funcionamento da rede.
- **Tratamento:** Em `src/pages/Network.tsx:59`, se o usuário não possuir nenhum filho direto, o front-end injeta temporariamente uma estrutura de demonstração rica (`sampleData`) para ensinar visualmente o ganho nos 3 níveis.

### EC-IND-03: Arredondamento fracionário de centavos em comissões
- **Problema:** Aplicação de 2.5% sobre valores ímpares pode gerar dízimas ou centavos quebrados.
- **Tratamento:** O código utiliza `Math.round(totalSpent * commissionRate)` para garantir que o saldo de créditos seja sempre um número inteiro, facilitando o cálculo de abatimento na tela de agendamento.
