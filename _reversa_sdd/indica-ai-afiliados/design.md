# Indica Aí (Afiliados & Recomendações) — Design Técnico (Design)

> Status: 🟢 CONFIRMADO (Código Legado)
> Layout: Feature-Folder / Módulo

---

## 1. Interface & Contratos de Serviço

```typescript
interface ReferralTreeContract {
  buildReferralTree(
    rootUser: UserProfile,
    allUsers: UserProfile[],
    allBookings?: Booking[],
    maxDepth?: number
  ): ReferralNode;

  calculateTreeStats(rootNode: ReferralNode): TreeStats;

  flattenTreeByLevels(rootNode: ReferralNode): Record<number, ReferralNode[]>;
}
```

---

## 2. Estrutura de Dados em Memória

```typescript
interface ReferralNode {
  user: UserProfile;
  level: number; // 0=Raiz, 1=Direto, 2=Indireto, 3=Sub-indireto
  children: ReferralNode[];
  totalTattoos: number;
  totalSpent: number;
  creditsGenerated: number;
  status: 'completed' | 'scheduled' | 'lead';
  latestBooking?: Booking;
}
```

---

## 3. Algoritmo de Construção Recursiva
1. Inicia em `level = 0` com o usuário autenticado (`rootUser`).
2. Filtra `allBookings` do usuário atual.
3. Se houver booking com status `COMPLETED`, marca nó como `completed`, conta tattoos e soma total gasto.
4. Caso contrário, se houver agendamento aprovado ou remarcado, marca como `scheduled`.
5. Se não houver agendamentos, classifica como `lead`.
6. Aplica taxa de comissão percentual conforme `level` e calcula créditos com `Math.round(totalSpent * rate)`.
7. Se `level < maxDepth (3)`, filtra usuários onde `referredBy === user.uid && uid !== user.uid`.
8. Chama recursivamente `getNodeData` para cada filho incrementando `level + 1`.
9. Retorna o nó completo com sua subárvore montada.
