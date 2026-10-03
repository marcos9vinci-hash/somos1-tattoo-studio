# Dicionário de Dados — SuperApp Somos 1 / Indica Aí

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído de `src/types/crm.ts`, `src/types/index.ts`, `src/lib/crmService.ts`)

---

## 1. Módulo: CRM & Funil Comercial

### Entidade: `Lead` (Coleção Firestore: `leads`)
Representa uma oportunidade de venda pré-tattoo no Funil Comercial.

| Campo | Tipo | Obrigatório | Padrão | Descrição / Regra de Domínio | Confiança |
|---|---|---|---|---|---|
| `id` | `string` | Sim | Auto (UUID/DocId) | Identificador único do documento | 🟢 |
| `nome` | `string` | Sim | - | Nome completo ou de contato do lead | 🟢 |
| `telefone` | `string` | Sim | - | WhatsApp com DDD (chave de deduplicação) | 🟢 |
| `email` | `string` | Não | `undefined` | E-mail do cliente | 🟢 |
| `instagram` | `string` | Não | `undefined` | Handle (@) do perfil no Instagram | 🟢 |
| `origem` | `LeadSource` | Sim | `'manual'` | `'whatsapp' \| 'instagram' \| 'indicacao' \| 'site' \| 'manual' \| 'n8n_agente'` | 🟢 |
| `estagio` | `LeadStage` | Sim | `'novo'` | `'novo' \| 'qualificacao' \| 'negociacao' \| 'agendado' \| 'concluido' \| 'pos_venda' \| 'followup' \| 'perdido'` | 🟢 |
| `temperatura` | `string` | Não | `'morno'` | `'frio' \| 'morno' \| 'quente'` | 🟢 |
| `ideiaProjeto` | `string` | Não | `""` | Descrição do que o cliente quer tatuar | 🟢 |
| `estiloTatuagem` | `string` | Não | `""` | Ex: Fineline, Realismo, Blackwork, Old School | 🟢 |
| `tamanhoAproximado`| `string` | Não | `""` | Medidas em cm ou porte (pequeno, médio, grande) | 🟢 |
| `localCorpo` | `string` | Não | `""` | Braço, antebraço, costela, panturrilha, etc. | 🟢 |
| `orcamentoMaximo` | `number` | Não | `undefined` | Teto financeiro informado pelo cliente | 🟢 |
| `artistaDesejadoId`| `string` | Não | `undefined` | ID do tatuador preferido | 🟢 |
| `artistaDesejadoNome`| `string` | Não | `undefined` | Nome do tatuador preferido | 🟢 |
| `fotosReferencia` | `string[]` | Não | `[]` | URLs no Firebase Storage das referências visuais | 🟢 |
| `spin` | `SPINAnalysis` | Não | `{}` | Diagnóstico SPIN Selling e perfil comportamental | 🟢 |
| `notasInternas` | `string[]` | Não | `[]` | Comentários e histórico do time comercial | 🟢 |
| `responsavelAtendimento` | `string` | Não | `'IA_Assessor'` | Nome do agente IA ou do operador humano | 🟢 |
| `criadoPor` | `string` | Não | `'usuario_admin'`| `'agente_ia' \| 'usuario_admin' \| 'usuario_publico'` | 🟢 |
| `createdAt` | `Timestamp` | Sim | `serverTimestamp()` | Data de criação do registro | 🟢 |
| `updatedAt` | `Timestamp` | Sim | `serverTimestamp()` | Data da última alteração de estágio/dados | 🟢 |
| `ultimoContatoEm` | `Timestamp` | Não | `serverTimestamp()` | Data da última mensagem trocada | 🟢 |

---

### Entidade: `ClienteCRM` (Coleção Firestore: `users` + Agregação `bookings`)
Representa o perfil pós-tattoo e ciclo de vida na Carteira de Clientes.

| Campo | Tipo | Obrigatório | Padrão | Descrição / Regra de Domínio | Confiança |
|---|---|---|---|---|---|
| `id` | `string` | Sim | Auto | ID do usuário no Firebase Auth/Firestore | 🟢 |
| `nome` | `string` | Sim | - | Nome completo do cliente | 🟢 |
| `telefone` | `string` | Sim | - | Telefone formatado e sanitizado | 🟢 |
| `bucketTemperatura` | `ClienteCarteiraTempStage` | Sim | `'morno'` | `'quente' \| 'morno' \| 'esfriando' \| 'alerta' \| 'expirado' \| 'emReativacao' \| 'desmarcou'` | 🟢 |
| `totalGasto` | `number` | Sim | `0` | LTV acumulado do cliente no estúdio (R$) | 🟢 |
| `totalSessoes` | `number` | Sim | `0` | Quantidade de sessões concluídas | 🟢 |
| `ultimaSessaoEm` | `Timestamp / string` | Não | `undefined` | Data da sessão mais recente realizada | 🟢 |
| `diasSemContato` | `number` | Não | `0` | Dias corridos desde a última sessão ou contato | 🟢 |
| `estilosFavoritos`| `string[]` | Não | `[]` | Estilos que o cliente já tatuou | 🟢 |
| `fotosTatuagensFeitas` | `string[]` | Não | `[]` | Galeria das artes executadas no estúdio | 🟢 |
| `temSessaoAgendada` | `boolean` | Não | `false` | Flag se há booking futuro aprovado | 🟢 |
| `desmarcouEm` | `string` | Não | `undefined` | Data em que ocorreu o No-Show / Cancelamento | 🟢 |
| `emReativacaoLeadId` | `string` | Não | `undefined` | ID do lead gerado no funil quando reaberto | 🟢 |

---

### Entidade: `SPINAnalysis` (Objeto aninhado em Lead)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `situacao` | `string` | Não | Primeira tattoo ou já tem outras? |
| `problema` | `string` | Não | Insegurança com traço, dor, cicatrização, cover-up |
| `implicacao` | `string` | Não | Impacto emocional ou significado pessoal |
| `necessidade` | `string` | Não | O que o cliente busca no atendimento do estúdio |
| `perfilComportamental` | `'analitico' \| 'expressivo' \| 'afavel' \| 'diretivo'` | Não | Matriz de comunicação consultiva |
| `urgencia` | `'baixa' \| 'media' \| 'alta'` | Não | Nível de prontidão para agendamento |
| `ticketEstimado` | `number` | Não | Valor projetado para a sessão |

---

## 2. Módulo: Indica Aí (Afiliados & Recomendações)

### Entidade: `ReferralNode` (Árvore de Indicações em Memória)
Representa um nó na árvore genealógica de afiliados calculada por `buildReferralTree`.

| Campo | Tipo | Obrigatório | Descrição / Regra | Confiança |
|---|---|---|---|---|
| `user` | `UserProfile` | Sim | Dados do perfil do usuário | 🟢 |
| `level` | `number` | Sim | Profundidade na árvore: `0` (raiz), `1` (direto), `2` (indireto), `3` (sub-indireto) | 🟢 |
| `children` | `ReferralNode[]` | Sim | Lista de indicados diretos deste nó | 🟢 |
| `totalTattoos` | `number` | Sim | Contagem de sessões concluídas (`BookingStatus.COMPLETED`) | 🟢 |
| `totalSpent` | `number` | Sim | Valor total investido em tattoos concluídas | 🟢 |
| `creditsGenerated` | `number` | Sim | Créditos gerados para o usuário raiz (`Math.round(totalSpent * rate)`) | 🟢 |
| `status` | `'completed' \| 'scheduled' \| 'lead'` | Sim | Status operacional mais avançado do indicado | 🟢 |
| `latestBooking` | `Booking` | Não | Agendamento mais recente | 🟢 |

---

### Entidade: `TreeStats` (Estatísticas Agregadas da Rede)

| Campo | Tipo | Descrição |
|---|---|---|
| `totalPeople` | `number` | Total de membros da rede até o 3º nível (`level1 + level2 + level3`) |
| `level1Count` | `number` | Quantidade de indicados diretos (Nível 1) |
| `level2Count` | `number` | Quantidade de indicados de 2º nível |
| `level3Count` | `number` | Quantidade de indicados de 3º nível |
| `completedTattoos` | `number` | Total de tattoos concluídas por toda a rede |
| `totalCreditsGenerated`| `number` | Total acumulado de comissões/créditos gerados |

---

### Extensão na Entidade: `UserProfile` (Coleção Firestore: `users`)

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `inviteCode` | `string` | Sim | Auto (ex: VIP-TATTOO) | Código único para convite de amigos |
| `referredBy` | `string` | Não | `undefined` | UID do usuário que o indicou (chave pai na árvore) |
| `creditsBalance` | `number` | Sim | `0` | Saldo disponível para abater em tattoos |
| `tier` | `UserTier` | Sim | `'bronze'` | Ranking: `'bronze' \| 'prata' \| 'ouro' \| 'diamante'` |

---

## 3. Módulo: Agenda & Booking

### Entidade: `Booking` (Coleção Firestore: `bookings`)
Representa um agendamento de sessão de tattoo no estúdio.

| Campo | Tipo | Obrigatório | Padrão | Descrição / Regra | Confiança |
|---|---|---|---|---|---|
| `id` | `string` | Sim | Auto | ID do documento no Firestore | 🟢 |
| `userId` | `string` | Sim | - | UID do cliente no Firebase Auth | 🟢 |
| `userName` | `string` | Não | - | Nome completo do cliente | 🟢 |
| `userPhone` | `string` | Não | - | Telefone de contato para WhatsApp | 🟢 |
| `artistId` | `string \| null` | Não | `null` | UID do tatuador selecionado | 🟢 |
| `size` | `'Pequena' \| 'Média' \| 'Grande'` | Sim | `'Média'` | Porte da arte (define duração estimada do slot) | 🟢 |
| `date` | `string` | Sim | - | Data da sessão no formato ISO `YYYY-MM-DD` | 🟢 |
| `time` | `string` | Sim | - | Horário no formato `HH:mm` | 🟢 |
| `status` | `BookingStatus` | Sim | `'pending_approval'` | `'pending_approval' \| 'approved' \| 'rejected' \| 'rescheduled' \| 'deposit_pending' \| 'deposit_paid' \| 'no_show' \| 'completed'` | 🟢 |
| `priceEstimated` | `number` | Sim | `0` | Valor base estimado da tattoo (R$) | 🟢 |
| `depositPaid` | `number` | Sim | `0` | Sinal financeiro pago para reserva de data | 🟢 |
| `creditsUsed` | `number` | Sim | `0` | Créditos abatidos (máximo 50% do total) | 🟢 |
| `regiao_corpo` | `string` | Não | `""` | Local anatômico da tattoo | 🟢 |
| `fotos_referencia`| `string[]` | Não | `[]` | URLs das imagens anexadas pelo cliente | 🟢 |
| `descricao_servico`| `string` | Não | `""` | Descrição textual da ideia do projeto | 🟢 |
| `observacoes` | `string` | Não | `""` | Notas adicionais | 🟢 |
| `confirmationSent` | `boolean` | Não | `false` | Flag de disparo do WhatsApp de confirmação | 🟢 |
| `reminderSent` | `boolean` | Não | `false` | Flag de disparo do WhatsApp de lembrete | 🟢 |
| `createdAt` | `Timestamp` | Sim | `serverTimestamp()` | Data/hora de solicitação da reserva | 🟢 |

---

### Entidade: `StudioSettings` (Coleção Firestore: `studio_settings/main`)

| Campo | Tipo | Descrição |
|---|---|---|
| `workingDays` | `number[]` | Dias da semana em operação (`0=Dom`, `1=Seg`, ... `6=Sáb`) |
| `workingHours` | `{ start: string, end: string }` | Faixa de horário de atendimento (ex: 09:00 às 19:00) |
| `durations` | `{ Pequena: number, Média: number, Grande: number }` | Duração em minutos por porte (60m, 120m, 240m) |
| `blockedDates` | `string[]` | Datas bloqueadas no formato `YYYY-MM-DD` |
| `blockedIntervals` | `Array<{ date: string, start: string, end: string, label?: string }>` | Janelas específicas bloqueadas na agenda |
| `maxSessionsPerDay`| `number` | Capacidade máxima diária simultânea de sessões (padrão: 5) |
| `whatsappTemplates`| `Record<string, string>` | Templates de mensagens com tags (`[Nome]`, `[Data]`, etc.) |

---

## 4. Módulo: Automação WhatsApp & n8n

### Entidade: `N8nDispatchPayload` (Contrato de Saída Webhook)

| Campo | Tipo | Obrigatório | Descrição / Exemplo |
|---|---|---|---|
| `phone` | `string` | Sim | Telefone formatado com DDI 55 (ex: `5511999998888`) |
| `message` | `string` | Sim | Corpo da mensagem formatada |
| `action` | `string` | Sim | `'confirmacao' \| 'reagendamento' \| 'lembrete' \| 'followup' \| 'cancelamento'` |
| `delay_seconds` | `number` | Não | Segundos de atraso programado no n8n |
| `delayAmount` | `number` | Não | Valor numérico de tempo (ex: 2) |
| `delayUnit` | `string` | Não | `'minutes' \| 'hours' \| 'days'` |
| `instance` | `string` | Sim | Instância da Evolution API (padrão: `'wats'`) |

---

### Entidade: `ParsedIntentResult` (Classificação de Resposta)

| Campo | Tipo | Descrição |
|---|---|---|
| `intent` | `ArtistIntent` | Decisão detectada: `'APPROVE' \| 'REJECT' \| 'RESCHEDULE' \| 'UNCERTAIN'` |
| `confidence` | `number` | Grau de certeza da inferência (0.0 a 1.0) |
| `matchedRule` | `string` | Padrão regex que disparou o acerto |
| `normalizedText` | `string` | Texto limpo processado |
| `suggestedAction` | `string` | Ação operacional recomendada para o sistema |

---

### Entidade: `ScanBatchReport` (Resultado da Varredura da Evolution API)

| Campo | Tipo | Descrição |
|---|---|---|
| `totalChatsLidos` | `number` | Quantidade de conversas analisadas na instância |
| `novosLeadsCapturados`| `number` | Contatos convertidos em novos leads no CRM |
| `leadsAtualizados` | `number` | Contatos existentes com histórico enriquecido |
| `ignorados` | `number` | Mensagens de sistema ou sem contexto útil |
| `erros` | `Array<{ remoteJid: string, erro: string }>` | Registro de falhas pontuais |

---

## 5. Módulo: Galeria & Portfólio IA

### Entidade: `SocialPost` (Coleção Firestore / Estado da Galeria)

| Campo | Tipo | Obrigatório | Descrição / Regra | Confiança |
|---|---|---|---|---|
| `id` | `string` | Sim | Identificador do post no estúdio | 🟢 |
| `status` | `PostStatus` | Sim | `'rascunho' \| 'pronto' \| 'agendado' \| 'publicado'` | 🟢 |
| `legenda` | `string` | Sim | Texto e hashtags gerados pela IA | 🟢 |
| `midiaUrl` | `string` | Sim | URL da imagem ou vídeo da tatuagem | 🟢 |
| `estiloTatuagem` | `string` | Não | Estilo detectado (Fineline, Realismo, etc.) | 🟢 |
| `bufferScheduleId`| `string` | Não | ID do agendamento retornado pelo Buffer | 🟢 |
| `dataPublicacao` | `Timestamp \| string`| Não | Horário previsto ou efetivo de publicação | 🟢 |

---

## 6. Módulo: Painel Admin & Configurações

### Entidade: `StudioRule` (Coleção Firestore: `studio_rules`)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador da regra do estúdio |
| `order` | `number` | Sim | Ordem de exibição no app |
| `title` | `string` | Sim | Título da norma (ex: "Sinal e Cancelamentos") |
| `content` | `string` | Sim | Texto detalhado |
| `active` | `boolean`| Sim | Se a regra está visível |

---

### Entidade: `Campaign` (Coleção Firestore: `campaigns`)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador da campanha promocional |
| `title` | `string` | Sim | Nome da ação (ex: "Semana Flash Week") |
| `description` | `string` | Sim | Detalhes e regulamento |
| `bonusLevel1Percent` | `number` | Sim | Bônus adicional para indicações N1 |
| `bonusLevel2Percent` | `number` | Sim | Bônus adicional para indicações N2 |
| `bonusLevel3Percent` | `number` | Sim | Bônus adicional para indicações N3 |
| `active` | `boolean` | Sim | Flag se a campanha está vigente |
| `startDate` | `Timestamp` | Sim | Início da campanha |
| `endDate` | `Timestamp` | Sim | Fim da campanha |





