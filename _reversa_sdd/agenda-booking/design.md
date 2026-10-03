# Agenda & Booking — Design Técnico (Design)

> Status: 🟢 CONFIRMADO (Código Legado)
> Layout: Feature-Folder / Módulo

---

## 1. Interface & Contratos de Serviço

```typescript
interface BookingMutationPayload {
  userId: string;
  userName: string;
  userPhone: string;
  size: 'Pequena' | 'Média' | 'Grande';
  regiao_corpo: string;
  fotos_referencia: string[];
  descricao_servico: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  priceEstimated: number;
  creditsUsed: number;
}
```

---

## 2. Fluxo Principal da Criação de Agendamento (`handleConfirm`)
1. Valida se `selectedDate` e `selectedTime` estão preenchidos.
2. Calcula `estimatedValue` pelo porte (`Pequena: 200`, `Média: 500`, `Grande: 1000`).
3. Calcula `maxCreditUsage = Math.min(profile.creditsBalance, estimatedValue * 0.5)`.
4. Grava documento na coleção `bookings` com status `PENDING_APPROVAL`.
5. Se `creditsUsed > 0`, executa `updateDoc` em `users/{uid}` decrementando saldo via `increment(-creditsUsed)`.
6. Grava extrato na coleção `transactions` com tipo `BOOKING_DISCOUNT`.
7. Grava notificação para os administradores em `notifications`.
8. Aciona `whatsappService.triggerBookingLifecycle` para notificar cliente no WhatsApp.
9. Redireciona o cliente para a tela inicial.
