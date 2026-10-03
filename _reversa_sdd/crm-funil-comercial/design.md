# CRM & Funil Comercial — Design Técnico (Design)

> Status: 🟢 CONFIRMADO (Código Legado)
> Layout: Feature-Folder / Módulo

---

## 1. Interface & Contratos de Serviço

```typescript
interface CRMServiceContract {
  getLeads(): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | null>;
  createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateLead(id: string, data: Partial<Lead>): Promise<void>;
  updateLeadStage(id: string, novoEstagio: LeadStage): Promise<void>;
  deleteLead(id: string): Promise<void>;
  getClientes(): Promise<ClienteCRM[]>;
  reabrirNoFunilComercial(clienteId: string, dadosIniciais?: Partial<Lead>): Promise<string>;
  dispararCampanhaWhatsApp(clientes: ClienteCRM[], estrategia: EstrategiaCampanha): Promise<void>;
}
```

---

## 2. Fluxo Principal: Reconciliação Híbrida (`getLeads`)
1. Executa consulta em paralelo às coleções Firestore `leads`, `bookings` e `users` via `Promise.all`.
2. Cria tabela hash em memória (`userPhoneMap`) mapeando `userId` ➔ `user.phone`.
3. Separa bookings em dois subconjuntos temporais:
   - **Ativos / Futuros:** `date >= hoje` e `status != COMPLETED`.
   - **Recentes Concluídos:** `date >= (hoje - 15d)` e `status == COMPLETED`.
4. Normaliza telefones da coleção `leads` extraindo apenas dígitos.
5. Sincroniza leads manuais: se houver booking ativo no mesmo telefone, força estágio para `agendado`; se houver booking recente concluído, força estágio para `pos_venda`.
6. Para bookings sem lead manual correspondente, gera registros sintéticos com ID prefixado `booking_${id}`.
7. Retorna a lista unificada consolidada.

---

## 3. Estado Interno & Persistência
- **Coleções Firestore:** `leads` (documentos independentes) e agregação de `users` + `bookings` para a carteira.
- **Deduplicação:** Feita em tempo de execução no cliente usando `Set<string>` com telefones sanitizados.

---

## 4. Observabilidade & Resiliência
- Fallback em caso de erro de índice composto no Firestore: tenta consulta ordenada por `createdAt`; se falhar com erro de índice, executa consulta irrestrita `getDocs(collection(db, 'leads'))`.
- Proteção contra mutações: tentativas de deleção ou alteração direta em IDs `booking_*` são filtradas para proteger a coleção original `bookings`.
