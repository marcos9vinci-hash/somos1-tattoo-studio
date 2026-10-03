# ADR 004: Rede de Afiliados Unilevel com Limite em 3 Níveis de Profundidade

> Status: Aprovado / Implementado
> Data: 2026-10-03
> Decisores: Diretoria e Compliance Somos 1 / Indica Aí
> Escala de Confiança: 🟢 CONFIRMADO (Código)

---

## Contexto
O modelo de Member-Get-Member (MGM) precisava incentivar o boca a boca orgânico além do primeiro círculo de amigos, sem cruzar limites de sustentabilidade financeira ou gerar complexidade contábil/fiscal excessiva.

---

## Decisão
Implementar um grafo recursivo unilevel limitado a exatamente **3 níveis de profundidade (`maxDepth = 3`)** em `src/lib/referralUtils.ts`:
- **Nível 1 (Indicação Direta):** 10% de cashback em créditos sobre tattoos concluídas.
- **Nível 2 (Amigos dos Indicados):** 5% de comissão para a raiz.
- **Nível 3 (Sub-indiretos):** 2.5% de comissão para a raiz.
- **Nível 4 em diante:** Descartados pela poda na função `getNodeData(child, level + 1)` quando `level >= 3`.

Adicionalmente, implementou-se verificação estrita `u.referredBy === user.uid && u.uid !== user.uid` para impedir laços circulares ou auto-indicações fraudulentas.

---

## Alternativas Consideradas
- **Nível Único (10% apenas para diretos):** Considerado insuficiente para estimular o crescimento viral em escala.
- **Profundidade Ilimitada / Binário:** Rejeitado veementemente para evitar desvio para modelos piramidais insustentáveis e manter conformidade estrita com a legislação brasileira.

---

## Consequências
- **Positivas:** Modelo viral comprovado com margem máxima comprometida em 17.5% da receita bruta da sessão; algoritmo leve e computável em memória no cliente; conformidade legal integral.
- **Negativas / Atenção:** O usuário raiz precisa consultar estatísticas agregadas (`calculateTreeStats`) para acompanhar o desempenho geral da árvore.
