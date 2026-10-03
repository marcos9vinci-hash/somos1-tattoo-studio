# Mapeamento do Legado — Módulo: Indica Aí (Afiliados & Recomendações)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Arquivos de Código Fonte

### 1.1 Algoritmos & Utilitários
- **Arquivo:** `src/lib/referralUtils.ts`
  - **Linhas:** 1 a 137
  - **Funções principais:**
    - `buildReferralTree()` (linhas 26–80): Constrói árvore recursiva unilevel até 3 níveis.
    - `calculateTreeStats()` (linhas 85–115): Agrega contagem de membros por nível e total de créditos gerados.
    - `flattenTreeByLevels()` (linhas 120–136): Aplana a árvore em dicionário indexado por nível para renderização em listas filtráveis.

### 1.2 Telas e Componentes Visuais
- **Arquivo:** `src/pages/Network.tsx`
  - **Linhas:** 1 a 413
  - **Papel:** Tela principal da rede Indica Aí. Permite alternar entre visualização em Árvore (`tree`) e Lista (`list`), copiar link de indicação, compartilhar via WhatsApp, visualizar saldo de créditos e rank do usuário (`tier`).
- **Arquivo:** `src/components/network/ReferralTree.tsx`
  - **Papel:** Componente gráfico SVG / CSS interativo para expansão e retração dos nós da árvore de indicados.
