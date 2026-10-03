# CRM & Funil Comercial — Casos de Borda (Edge Cases)

> Status: 🟢 CONFIRMADO
> Layout: Feature-Folder / Módulo

---

## 1. Casos Extremos Mapeados no Legado

### EC-CRM-01: Telefones com ou sem código de país (DDI 55)
- **Problema:** Usuários podem cadastrar telefone como `11999998888`, `(11) 99999-8888` ou `5511999998888`.
- **Tratamento:** A função `normalizePhone` extrai estritamente os caracteres numéricos e valida o prefixo `55`. Comparações de deduplicação utilizam sempre a versão canônica sanitizada.

### EC-CRM-02: Mutação de Lead Sintético gerado a partir de Booking
- **Problema:** No Kanban, agendamentos aparecem como cards com ID `booking_{bookingId}`. Se o operador arrastar esse card para `concluido` ou `perdido`, o documento não existe na coleção `leads`.
- **Tratamento:** O método `updateLead` intercepta IDs prefixados com `booking_` e reflete a mutação de status diretamente no documento da coleção `bookings` (`COMPLETED` ou `REJECTED`), abortando a gravação em `leads`.

### EC-CRM-03: Cliente sem data de sessão registrada
- **Problema:** Registros antigos de clientes podem não ter o campo `date` ou `ultimaSessaoEm` preenchido.
- **Tratamento:** O algoritmo `calcularBucketTemperatura` assume `diasSemContato = undefined` e retorna por padrão o status neutro e seguro `morno`.
