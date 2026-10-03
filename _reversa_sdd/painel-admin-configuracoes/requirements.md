# Painel Admin & Configurações — Especificação de Requisitos (Requirements)

> Status: 🟢 CONFIRMADO (Extraído de `src/pages/Admin.tsx`, `src/lib/creditService.ts`)
> Layout: Feature-Folder / Módulo

---

## 1. Visão Geral
Centro de governança, parametrização e auditoria financeira do estúdio. Garante a operação segura dos módulos por meio de autorização RBAC, isolamento de falhas e registro de transações manuais auditáveis.

---

## 2. Responsabilidades
- Proteger rotas e ações administrativas exigindo `role == 'admin'`.
- Isolar falhas de runtime entre módulos através de `ModuleErrorBoundary`.
- Permitir concessão e estorno de créditos com justificativa auditada.
- Parametrizar regras de estúdio, campanhas sazonais e credenciais de integração.

---

## 3. Requisitos Funcionais

| ID | Requisito | MoSCoW | Critério de Aceite |
|---|---|:---:|---|
| **RF-ADM-01** | Bloquear acesso a usuários não-administradores na rota `/admin`. | Must | Redirecionar para home se `isAdmin` for falso. |
| **RF-ADM-02** | Isolar falhas de renderização de abas individuais. | Must | Erro em uma aba deve exibir tela de manutenção apenas no bloco afetado. |
| **RF-ADM-03** | Auditar toda concessão manual de créditos na coleção `transactions`. | Must | Registrar `userId`, `amount`, `type: 'admin_adjustment'` e motivo. |
