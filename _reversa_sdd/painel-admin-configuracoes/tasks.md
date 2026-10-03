# Painel Admin & Configurações — Tarefas de Implementação (Tasks)

> Status: 🟢 CONFIRMADO (Plano Executável)
> Layout: Feature-Folder / Módulo

---

## Tarefas de Implementação

- [ ] **T-ADM-01:** Implementar o componente `ModuleErrorBoundary`
  - Origem: `src/pages/Admin.tsx:35-72`
  - Critério de Pronto: Capturar exceções de componentes filhos e renderizar fallback com botão de recarregar.
  - Confiança: 🟢

- [ ] **T-ADM-02:** Implementar mutação de créditos auditada em `creditService`
  - Origem: `src/lib/creditService.ts`
  - Critério de Pronto: Atualizar saldo e criar registro na coleção `transactions` em sequência.
  - Confiança: 🟢
