# Fluxograma — Motor de Afiliados Indica Aí (3 Níveis)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído diretamente de `src/lib/referralUtils.ts`, `src/pages/Network.tsx`)

---

## 1. Topologia da Rede e Regras de Comissionamento

O motor do Indica Aí estrutura uma rede em cascata unilevel de até 3 níveis de profundidade:

```mermaid
flowchart TD
    Root["👤 Você / Membro Raiz<br/>(Nível 0)"]
    
    subgraph N1["Nível 1 — Indicação Direta (10% de Comissão)"]
        Direct1["Ricardo Mendes<br/>(10% de Cashback)"]
        Direct2["Carla Dias<br/>(10% de Cashback)"]
    end
    
    subgraph N2["Nível 2 — Indicação Indireta (5% de Comissão)"]
        Indir1["Marcos Vinicius<br/>(5% p/ Raiz)"]
        Indir2["Camila Rocha<br/>(5% p/ Raiz)"]
    end
    
    subgraph N3["Nível 3 — Sub-Indireta (2.5% de Comissão)"]
        Sub1["Felipe Diniz<br/>(2.5% p/ Raiz)"]
        Sub2["Larissa Souza<br/>(2.5% p/ Raiz)"]
    end

    Root -->|Compartilha inviteCode| Direct1
    Root -->|Compartilha inviteCode| Direct2
    
    Direct1 --> Direct1_Share["Indica amigos"] --> Indir1
    Direct2 --> Direct2_Share["Indica amigos"] --> Indir2
    
    Indir1 --> Indir1_Share["Indica amigos"] --> Sub1
    Indir2 --> Indir2_Share["Indica amigos"] --> Sub2
```

---

## 2. Ciclo de Vida do Indicado na Árvore

Cada pessoa na rede assume um dos 3 estados:
- **`lead`**: Cadastrou-se via código/link, mas ainda não agendou nem tatuou.
- **`scheduled`**: Possui agendamento com status `APPROVED`, `DEPOSIT_PAID` ou `RESCHEDULED`.
- **`completed`**: Possui pelo menos uma sessão com status `COMPLETED`. **Apenas este estado gera créditos financeiros para a cadeia de afiliados.**

---

## 3. Matriz de Comissionamento em Créditos

| Nível | Relação | Taxa de Comissão | Cálculo |
|---|---|---|---|
| **Nível 1** | Indicado Direto | **10%** | `Math.round(totalSpent * 0.10)` |
| **Nível 2** | Amigo do Indicado | **5%** | `Math.round(totalSpent * 0.05)` |
| **Nível 3** | Convidado de 3º Grau | **2.5%** | `Math.round(totalSpent * 0.025)` |
