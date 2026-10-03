# CRM & Funil Comercial — Tarefas de Implementação (Tasks)

> Status: 🟢 CONFIRMADO (Plano Executável)
> Layout: Feature-Folder / Módulo

---

## Pré-requisitos
- [x] Modelos de dados e tipos definidos em `src/types/crm.ts`
- [x] Conexão ativa com Firebase Firestore (`db`)
- [x] Integração com `whatsappService` operacional

---

## Tarefas de Implementação

- [ ] **T-CRM-01:** Implementar a função `calcularBucketTemperatura`
  - Origem: `src/types/crm.ts:172-196`
  - Critério de Pronto: Atribuir corretamente os 6 buckets (`quente`, `morno`, `esfriando`, `alerta`, `expirado`, `desmarcou`) respeitando as travas de `totalSessoes > 0` e No-Show.
  - Confiança: 🟢

- [ ] **T-CRM-02:** Implementar a reconciliação híbrida `getLeads()`
  - Origem: `src/lib/crmService.ts:39-224`
  - Critério de Pronto: Unir `leads` manuais e `bookings` sem duplicar contatos com mesmo telefone.
  - Confiança: 🟢

- [ ] **T-CRM-03:** Implementar a agregação da Carteira `getClientes()`
  - Origem: `src/lib/crmService.ts:292-430`
  - Critério de Pronto: Calcular LTV (`totalGasto`), `totalSessoes` e `diasSemContato` por cliente.
  - Confiança: 🟢

- [ ] **T-CRM-04:** Implementar a transição de reativação `reabrirNoFunilComercial()`
  - Origem: `src/lib/crmService.ts:510-540`
  - Critério de Pronto: Criar lead no Funil Comercial vinculado ao ID do cliente sem sobrescrever o perfil do usuário.
  - Confiança: 🟢

---

## Tarefas de Teste

- [ ] **TT-CRM-01:** Testar reconciliação quando cliente possui lead manual E booking futuro ativo (deve forçar estágio `agendado`).
- [ ] **TT-CRM-02:** Testar cálculo de temperatura com `diasSemContato = 5` e `totalSessoes = 0` (deve retornar `morno`, não `quente`).
- [ ] **TT-CRM-03:** Testar cliente com `no_show` (deve retornar compulsoriamente `desmarcou`).
