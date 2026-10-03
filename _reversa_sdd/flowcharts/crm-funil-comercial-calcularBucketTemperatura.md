# Fluxograma da Função: `calcularBucketTemperatura`

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Localização no código: `src/types/crm.ts` (linhas 172–196)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Assinatura da Função

```typescript
function calcularBucketTemperatura(
  diasSemContato: number | undefined,
  totalSessoes: number,
  ultimoStatus?: string,
  temNoShow?: boolean
): ClienteCarteiraTempStage
```

---

## 2. Fluxograma de Decisão

```mermaid
flowchart TD
    Start(["Início: calcularBucketTemperatura"]) --> CheckNoShow{"temNoShow == true OU<br/>ultimoStatus in ['no_show', 'rejected']?"}
    
    CheckNoShow -- Sim --> ReturnDesmarcou["Retorna: 'desmarcou'<br/>(Coluna Faltou / No-Show)"]
    
    CheckNoShow -- Não --> CheckDiasDefined{"diasSemContato === undefined?"}
    CheckDiasDefined -- Sim --> ReturnMornoDefault["Retorna: 'morno'<br/>(Valor padrão por segurança)"]
    
    CheckDiasDefined -- Não --> Check0a7{"diasSemContato <= 7?"}
    
    Check0a7 -- Sim --> CheckSessao{"totalSessoes > 0?"}
    CheckSessao -- Sim --> ReturnQuente["Retorna: 'quente'<br/>(Exclusivo: Cicatrização Pós-Tattoo)"]
    CheckSessao -- Não --> ReturnMornoSemSessao["Retorna: 'morno'<br/>(Sem sessão concluída)"]
    
    Check0a7 -- Não --> Check8a30{"diasSemContato <= 30?"}
    Check8a30 -- Sim --> ReturnMorno["Retorna: 'morno'<br/>(8 a 30 dias: Foto & Retoque / Indica Aí)"]
    
    Check8a30 -- Não --> Check31a90{"diasSemContato <= 90?"}
    Check31a90 -- Sim --> ReturnEsfriando["Retorna: 'esfriando'<br/>(31 a 90 dias: 2ª Tattoo / Novo Projeto)"]
    
    Check31a90 -- Não --> Check91a179{"diasSemContato <= 179?"}
    Check91a179 -- Sim --> ReturnAlerta["Retorna: 'alerta'<br/>(91 a 179 dias: Créditos a Vencer)"]
    
    Check91a179 -- Não --> ReturnExpirado["Retorna: 'expirado'<br/>(>= 180 dias: Inativo há > 6 meses)"]

    ReturnDesmarcou --> EndNode(["Fim"])
    ReturnMornoDefault --> EndNode
    ReturnQuente --> EndNode
    ReturnMornoSemSessao --> EndNode
    ReturnMorno --> EndNode
    ReturnEsfriando --> EndNode
    ReturnAlerta --> EndNode
    ReturnExpirado --> EndNode
```

---

## 3. Regras de Negócio Críticas Documentadas

1. **Exclusividade do 'quente':**
   - O estado `quente` só é atribuído se `diasSemContato <= 7` **E** `totalSessoes > 0`. Clientes cadastrados sem sessão concluída nunca entram em `quente`.
2. **Prioridade de No-Show:**
   - Cancelamentos ou faltas (`no_show`, `rejected`) têm precedência absoluta sobre o cálculo temporal e enviam o cliente diretamente para o bucket `desmarcou`.
3. **Ponto de Corte de 180 Dias:**
   - O marco de 180 dias está estritamente atrelado à política de validade de comissões/créditos do motor do Indica Aí.
