# Histórias de Usuário — Jornada Ponta a Ponta de Atendimento e Indicação

> Status: 🟢 CONFIRMADO (Jornada Transversal)

---

## US-01: Novo Lead chega via Indicação e Realiza Tattoo
- **Como** um cliente potencial indicado por um amigo,
- **Quero** acessar o link do Indica Aí, selecionar um porte de tatuagem, enviar fotos de referência e escolher um horário,
- **Para que** eu possa garantir minha sessão no estúdio com confiança e atendimento ágil.

### Critérios de Aceite:
1. O cadastro deve vincular o `referredBy` ao amigo titular do link.
2. A confirmação do agendamento deve disparar WhatsApp de confirmação em até 4 segundos.
3. Após a conclusão da tattoo, o titular do link deve receber 10% do valor da sessão em créditos.

---

## US-02: Cliente Antigo usa Créditos para Abater Nova Tattoo
- **Como** um cliente fidelizado com saldo de 300 créditos acumulados,
- **Quero** agendar uma nova sessão de tattoo de R$ 400 e aplicar meu saldo,
- **Para que** eu pague apenas R$ 200 em dinheiro/PIX respeitando a trava de 50%.

### Critérios de Aceite:
1. O sistema deve sugerir o abatimento de exatamente 200 créditos (50% de R$ 400).
2. O saldo remanescente do usuário deve passar de 300 para 100 créditos.
3. Uma transação auditada de `BOOKING_DISCOUNT` deve ser gerada no extrato.
