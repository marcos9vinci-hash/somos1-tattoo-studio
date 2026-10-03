# Agenda & Booking — Casos de Borda (Edge Cases)

> Status: 🟢 CONFIRMADO
> Layout: Feature-Folder / Módulo

---

## 1. Casos Extremos Mapeados no Legado

### EC-AGE-01: Tentativa de agendamento em feriado ou recesso do estúdio
- **Problema:** Cliente tenta marcar sessão em dia que o estúdio estará fechado para convenção ou reforma.
- **Tratamento:** O array `studio_settings.blockedDates` é consultado antes de renderizar os dias no calendário; dias bloqueados recebem estilo visual esmaecido e evento `onClick` desativado.

### EC-AGE-02: Queda de conexão no momento do débito de créditos
- **Problema:** A gravação do agendamento é concluída, mas a conexão oscila antes de abater os créditos.
- **Tratamento:** As operações são sequenciais e tratadas pelo `handleFirestoreError`. Recomenda-se para versões futuras envolver a criação do agendamento e o débito de créditos em uma `runTransaction` atômica do Firestore.
