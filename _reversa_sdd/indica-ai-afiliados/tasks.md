# Indica Aí (Afiliados & Recomendações) — Tarefas de Implementação (Tasks)

> Status: 🟢 CONFIRMADO (Plano Executável)
> Layout: Feature-Folder / Módulo

---

## Pré-requisitos
- [x] Tipos `UserProfile`, `Booking`, `BookingStatus` definidos em `src/types.ts`
- [x] Relação pai-filho estruturada via campo `referredBy` em `users`

---

## Tarefas de Implementação

- [ ] **T-IND-01:** Implementar o algoritmo recursivo `buildReferralTree`
  - Origem: `src/lib/referralUtils.ts:26-80`
  - Critério de Pronto: Montar árvore até 3 níveis, aplicar alíquotas (10%, 5%, 2.5%) e evitar nós cíclicos.
  - Confiança: 🟢

- [ ] **T-IND-02:** Implementar agregador de estatísticas `calculateTreeStats`
  - Origem: `src/lib/referralUtils.ts:85-115`
  - Critério de Pronto: Somar total de membros, distribuição por nível e volume de comissões geradas.
  - Confiança: 🟢

- [ ] **T-IND-03:** Implementar aplanar da árvore `flattenTreeByLevels`
  - Origem: `src/lib/referralUtils.ts:120-136`
  - Critério de Pronto: Agrupar nós em listas planas indexadas por chave numérica (1, 2, 3) para visualização.
  - Confiança: 🟢

---

## Tarefas de Teste

- [ ] **TT-IND-01:** Testar nó folha em Nível 4 (não deve ser incluído na árvore).
- [ ] **TT-IND-02:** Testar usuário com `referredBy` apontando para seu próprio `uid` (deve ignorar auto-relação).
- [ ] **TT-IND-03:** Testar comissão sobre booking com status `APPROVED` (deve gerar 0 créditos até mudar para `COMPLETED`).
