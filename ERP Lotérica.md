# ERP Lotérica

## Objetivo

ERP web interno para a gestão de uma lotérica brasileira, com controle de caixas e turnos, tesouraria, prêmios, financeiro, salários, relatórios e auditoria. A primeira entrega funcional cobre autenticação, permissões, cadastros básicos, abertura e movimentação de caixa, prêmio básico, cofre, fechamento com aprovação, histórico e relatório diário.

## Telas

### Autenticação

**Rota:** `/`

**Objetivo:** Autenticar usuários nos perfis de gestor, operador, financeiro e auditor.

**Componentes:**

- **Input Email**
- **Input Senha**
- **Botão Entrar**: Autentica o usuário, valida as permissões do perfil e redireciona para /dashboard
- **Link Recuperar Senha**: Inicia o fluxo de recuperação de senha por e-mail

### Dashboard do Gestor

**Rota:** `/dashboard`

**Objetivo:** Exibir visão consolidada da operação com caixas abertos, fechamentos em revisão, divergências e saldos por local.

**Componentes:**

- **Cartão Caixas Abertos**: Navega para a lista de turnos abertos em /cash
- **Cartão Fechamentos em Revisão**: Navega para a fila de aprovação de fechamentos em /cash/review
- **Cartão Divergências**: Abre a lista de divergências de fechamento pendentes de decisão
- **Painel Saldos por Local**: Exibe saldos de gavetas, cofre, bancos e trânsito com link para /treasury
- **Cartão Prêmios Pagos**: Navega para o histórico de prêmios em /prizes
- **Lista Próximos Vencimentos**: Navega para as obrigações a pagar em /finance

### Abertura de Caixa

**Rota:** `/cash/open`

**Objetivo:** Abrir um novo turno selecionando gaveta, operador e turno, com registro do fundo inicial.

**Componentes:**

- **Seleção de Gaveta**: Lista gavetas disponíveis e bloqueia gavetas com turno já aberto
- **Seleção de Operador**: Define o operador responsável pelo turno
- **Seleção de Turno**: Define o turno de trabalho (manhã, tarde ou noite)
- **Input Fundo Inicial**
- **Botão Abrir Caixa**: Cria o turno com o fundo de abertura como saldo existente ou reforço de troco, sem duplicar dinheiro, e redireciona para /cash/:id

### Operação de Caixa

**Rota:** `/cash/:id`

**Objetivo:** Registrar entradas, saídas, prêmios, sangrias e reforços do turno corrente por meio de pagamento e categoria.

**Componentes:**

- **Cabeçalho do Turno**: Exibe gaveta, operador, turno, abertura e saldo esperado atual
- **Botão Nova Entrada**: Abre o modal de lançamento de entrada com valor, meio de pagamento, categoria e referência de origem
- **Botão Nova Saída**: Abre o modal de lançamento de saída com valor, meio de pagamento, categoria e referência de origem
- **Botão Registrar Prêmio**: Abre o modal de pagamento de prêmio com valor, meio, conta, referência e comprovante
- **Botão Sangria**: Registra transferência da gaveta para o cofre em transação única, com saída na origem e entrada no destino
- **Botão Reforço de Troco**: Registra transferência do cofre para a gaveta em transação única, com saída na origem e entrada no destino
- **Lista de Movimentos**: Exibe os lançamentos do turno com vínculo de referência e permite estorno antes do envio para revisão
- **Botão Ir para Fechamento**: Navega para a tela de fechamento do turno em /cash/:id/close

### Fechamento de Caixa

**Rota:** `/cash/:id/close`

**Objetivo:** Realizar a contagem física, calcular esperado, contado e diferença, e enviar o fechamento para revisão do gestor.

**Componentes:**

- **Resumo Esperado**: Exibe o valor esperado na gaveta e os totais por meio de pagamento em conferência própria
- **Contagem por Cédulas e Moedas**: Registra a contagem física por denominação e calcula o total contado
- **Campos Conferência por Meio**: Registra os totais conferidos de Pix, débito, crédito e demais meios
- **Painel Divergência**: Calcula e exibe a diferença entre contado e esperado, exigindo justificativa quando houver
- **Input Justificativa**
- **Botão Enviar para Revisão**: Bloqueia novos movimentos no turno e envia o fechamento para revisão do gestor

### Aprovação de Fechamentos

**Rota:** `/cash/review`

**Objetivo:** Permitir que o gestor revise fechamentos enviados e registre aprovação, ajuste ou estorno preservando o histórico.

**Componentes:**

- **Fila de Fechamentos em Revisão**: Lista os fechamentos pendentes com operador, gaveta, diferença e justificativa
- **Botão Aprovar**: Aprova o fechamento e consolida os saldos, impedindo duplicidade em reenvios
- **Botão Registrar Ajuste**: Cria um ajuste vinculado ao fechamento, preservando o histórico do movimento original
- **Botão Estornar Movimento**: Estorna um movimento confirmado por lançamento espelho, preservando o histórico e a autoria

### Tesouraria

**Rota:** `/treasury`

**Objetivo:** Exibir saldos e extratos de gavetas, cofre, bancos e trânsito, com registro de depósitos, transferências e conciliação.

**Componentes:**

- **Painel de Saldos por Conta**: Exibe saldo financeiro de gavetas, cofre, bancos e conta de valores em trânsito
- **Extrato de Movimentos**: Lista as movimentações da conta selecionada com natureza, categoria, meio, usuário, data e referência
- **Botão Nova Transferência**: Registra transferência interna em transação única, com saída da origem e entrada no destino
- **Botão Registrar Depósito**: Registra depósito bancário ou envio para trânsito vinculado ao turno quando aplicável
- **Painel de Conciliação**: Compara totais operacionais, fechamentos e registros bancários, marcando itens como pendentes, conciliados ou divergentes
- **Botão Confirmar Recebimento**: Confirma a liquidação de valores em trânsito ou recebíveis e atualiza o status de conciliação

### Prêmios

**Rota:** `/prizes`

**Objetivo:** Registrar pagamentos de prêmios com comprovante e vincular acertos ou ressarcimentos sem duplicar o pagamento original.

**Componentes:**

- **Tabela de Prêmios**: Lista prêmios pagos com valor, data, meio de pagamento, conta, referência e comprovante
- **Botão Registrar Prêmio**: Abre o modal de registro com valor, data, meio, conta, referência e upload de comprovante em storage privado
- **Botão Vincular Acerto**: Vincula o acerto ou ressarcimento correspondente ao prêmio, sem duplicar o pagamento original
- **Filtros por Período e Meio**: Aplica filtros de data, meio de pagamento e situação do acerto na listagem

### Financeiro

**Rota:** `/finance`

**Objetivo:** Gerenciar receitas, comissões, despesas e obrigações com categorias, competência, vencimento, status e baixa por movimento.

**Componentes:**

- **Tabela de Lançamentos**: Lista receitas, comissões, despesas e obrigações com categoria, competência, vencimento, valor e status
- **Botão Novo Lançamento**: Abre o modal de cadastro com tipo, categoria, competência, vencimento e valor
- **Botão Baixar**: Registra baixa total ou parcial da obrigação vinculada a um movimento financeiro
- **Botão Retirada de Sócios**: Registra retirada de sócios classificada separadamente do resultado operacional
- **Filtros por Competência e Status**: Aplica filtros de competência, categoria e status pendente, parcial ou pago na listagem

### Salários

**Rota:** `/team/payroll`

**Objetivo:** Registrar salários, adiantamentos, descontos e benefícios de forma gerencial e restrita, com baixa no pagamento.

**Componentes:**

- **Tabela de Folha**: Lista salários, adiantamentos, descontos e benefícios por funcionário e competência, visível apenas a perfis autorizados
- **Botão Novo Registro**: Abre o modal de registro gerencial com funcionário, tipo, competência e valor
- **Botão Registrar Pagamento**: Registra o pagamento e dá baixa na obrigação correspondente vinculada a um movimento financeiro

### Relatórios

**Rota:** `/reports`

**Objetivo:** Entregar relatórios por período, operador, caixa, categoria e meio de pagamento, com exportação CSV e resultado gerencial.

**Componentes:**

- **Filtros de Período e Operador**: Aplica filtros por período, operador, caixa, categoria e meio de pagamento nos relatórios
- **Relatório Diário**: Exibe o fechamento diário por caixa com esperado, contado, diferenças e prêmios
- **Relatório Fluxo de Caixa**: Exibe entradas, saídas e posição de saldos por conta e por competência, com base identificada
- **Relatório Resultado Gerencial**: Exibe receitas próprias, comissões, prêmios, despesas e retiradas de sócios separados do saldo financeiro
- **Botão Exportar CSV**: Exporta o relatório atual em formato CSV

### Auditoria

**Rota:** `/audit`

**Objetivo:** Exibir a trilha de auditoria com autor, data e referência de criação, aprovação, ajuste e estorno dos registros.

**Componentes:**

- **Tabela Trilha de Auditoria**: Lista eventos com autor, data, referência, tipo de evento e registro afetado conforme as permissões do perfil
- **Filtros de Busca**: Aplica filtros por período, usuário, tipo de evento e entidade na trilha
- **Detalhe do Evento**: Exibe os dados anteriores e posteriores do registro, vedando exclusão de movimentos confirmados

