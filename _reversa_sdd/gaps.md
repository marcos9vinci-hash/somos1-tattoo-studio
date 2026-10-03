# Registro de Lacunas (Gaps) — SuperApp Somos 1 / Indica Aí

> Gerado pelo Reversa Reviewer em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: Categorização por Severidade

---

## 1. Resumo Executivo de Lacunas

| Severidade | Quantidade | Impacto |
|---|:---:|---|
| 🔴 **Crítico** | 0 | Nenhuma lacuna bloqueante para reimplementação |
| 🟡 **Moderado** | 2 | Otimizações de concorrência e transação atômica recomendadas |
| 🟢 **Cosmético** | 1 | Nomenclaturas de parâmetros em componentes legados |

---

## 2. Detalhamento dos Pontos Moderados (🟡)

### GAP-01: Atomicidade na Reserva com Desconto de Créditos
- **Localização:** `src/pages/Booking.tsx:132-164`
- **Descrição:** O agendamento é inserido na coleção `bookings` e, em seguida, o saldo de créditos do usuário é atualizado via `updateDoc`.
- **Risco:** Em caso de falha de conexão rara entre a gravação do booking e o débito dos créditos, o cliente poderia ter o booking aprovado sem ter o saldo deduzido.
- **Recomendação:** Encapsular a criação do booking e a dedução do saldo em uma única `runTransaction` do Firestore.

### GAP-02: Deduplicação de Leads em Memória
- **Localização:** `src/lib/crmService.ts:39-224`
- **Descrição:** A reconciliação entre `leads`, `bookings` e `users` é processada em memória no cliente a cada chamada de `getLeads()`.
- **Risco:** Para bases com mais de 5.000 clientes, o consumo de memória do navegador pode aumentar.
- **Recomendação:** Implementar Cloud Function disparada em `onWrite` no Firestore para manter uma coleção materializada e indexada.
