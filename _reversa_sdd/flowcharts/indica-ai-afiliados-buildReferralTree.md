# Fluxograma da Função: `buildReferralTree`

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Localização no código: `src/lib/referralUtils.ts` (linhas 26–80)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Assinatura da Função

```typescript
function buildReferralTree(
  rootUser: UserProfile,
  allUsers: UserProfile[],
  allBookings: Booking[] = [],
  maxDepth: number = 3
): ReferralNode
```

---

## 2. Fluxograma Recursivo

```mermaid
flowchart TD
    Start(["Início: buildReferralTree(rootUser, allUsers, allBookings, maxDepth=3)"]) --> CallNode["getNodeData(user = rootUser, level = 0)"]
    
    subgraph RecursiveStep["Passo Recursivo: getNodeData(user, level)"]
        FilterBookings["Filtra userBookings:<br/>allBookings.filter(b => b.userId === user.uid)"]
        
        FilterBookings --> CheckCompleted{"Há agendamentos com<br/>status == COMPLETED?"}
        CheckCompleted -- Sim --> SetCompleted["status = 'completed'<br/>totalTattoos = completed.length<br/>totalSpent = soma(prices)"]
        CheckCompleted -- Não --> CheckScheduled{"Há agendamentos<br/>APPROVED / DEPOSIT_PAID / RESCHEDULED?"}
        
        CheckScheduled -- Sim --> SetScheduled["status = 'scheduled'<br/>totalTattoos = 0<br/>totalSpent = 0"]
        CheckScheduled -- Não --> SetLead["status = 'lead'<br/>totalTattoos = 0<br/>totalSpent = 0"]
        
        SetCompleted --> CalcCommission["Calcula Taxa de Comissão por Nível:<br/>- level 1 -> 10% (0.10)<br/>- level 2 -> 5% (0.05)<br/>- level 3 -> 2.5% (0.025)<br/>- outro -> 0%"]
        SetScheduled --> CalcCommission
        SetLead --> CalcCommission
        
        CalcCommission --> CalcCredits["creditsGenerated = Math.round(totalSpent * commissionRate)"]
        
        CalcCredits --> CheckDepth{"level < maxDepth (3)?"}
        
        CheckDepth -- Sim --> FindChildren["Filtra childUsers:<br/>allUsers.filter(u => u.referredBy === user.uid && u.uid !== user.uid)"]
        FindChildren --> RecurseChildren["children = childUsers.map(child => getNodeData(child, level + 1))"]
        
        CheckDepth -- Não --> EmptyChildren["children = []"]
        
        RecurseChildren --> AssembleNode["Retorna objeto ReferralNode"]
        EmptyChildren --> AssembleNode
    end
    
    AssembleNode --> ReturnTree(["Retorna Árvore Completa (ReferralNode Raiz)"])
```

---

## 3. Comportamento e Detalhes Importantes

1. **Prevenção de Loops Infinitos:**
   - O filtro `u.uid !== user.uid` previne que um usuário que aponte para si mesmo como `referredBy` gere recursão infinita.
2. **Profundidade Fixada:**
   - O limite padrão `maxDepth = 3` isola o sistema de comissões aos 3 níveis comerciais permitidos pelas regras fiscais e de margem do estúdio.
3. **Arredondamento:**
   - Uso de `Math.round` na geração de créditos garante valores inteiros no saldo do cliente (`creditsBalance`).
