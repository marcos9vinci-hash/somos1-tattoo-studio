# Fluxograma: Processador de Intenções do WhatsApp (`whatsappIntentParser`)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Localização no código: `src/lib/whatsappIntentParser.ts` (linhas 1–206)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Assinatura e Intenções Reconhecidas

```typescript
type ArtistIntent = 'APPROVE' | 'REJECT' | 'RESCHEDULE' | 'UNCERTAIN';

function parseArtistIntent(rawText: string): ParsedIntentResult
```

---

## 2. Fluxograma de Reconhecimento

```mermaid
flowchart TD
    Start(["Recebe texto do WhatsApp / Transcrição de Áudio"]) --> Normalize["Normaliza texto:<br/>lowercase, trim, remove pontuação redundante"]
    
    Normalize --> CheckApprove{"Combina com APPROVAL_PATTERNS?<br/>('1', 'sim', 'pode mandar', 'fechou', 'manda bala', 'veio')"}
    
    CheckApprove -- Sim --> ReturnApprove["intent = 'APPROVE'<br/>confidence = 0.95<br/>Ação: Executa ação proposta pelo co-piloto"]
    
    CheckApprove -- Não --> CheckReject{"Combina com REJECTION_PATTERNS?<br/>('2', 'não', 'cancela', 'não manda', 'esquece', 'faltou')"}
    
    CheckReject -- Sim --> ReturnReject["intent = 'REJECT'<br/>confidence = 0.95<br/>Ação: Descarta proposta e aborta envio"]
    
    CheckReject -- Não --> CheckReschedule{"Combina com RESCHEDULE_PATTERNS?<br/>('3', 'reagendar', 'muda data', 'passa pra amanhã', 'jogar pra outra data')"}
    
    CheckReschedule -- Sim --> ReturnReschedule["intent = 'RESCHEDULE'<br/>confidence = 0.90<br/>Ação: Abre fluxo de reagendamento"]
    
    CheckReschedule -- Não --> ReturnUncertain["intent = 'UNCERTAIN'<br/>confidence = 0.30<br/>Ação: Solicita clarificação ao tatuador"]

    ReturnApprove --> EndNode(["Fim"])
    ReturnReject --> EndNode
    ReturnReschedule --> EndNode
    ReturnUncertain --> EndNode
```
