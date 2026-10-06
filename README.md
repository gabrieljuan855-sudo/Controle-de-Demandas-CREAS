# Controle de Demandas CREAS

Sistema web (Google Apps Script) para registrar os encaminhamentos recebidos pelo CREAS Taquara/RS, conduzir a avaliação social e acompanhar o repasse dos casos às técnicas. Substitui a planilha "Casos em Avaliação Social e Repassados para acompanhamento".

**Fluxo de um caso:** Entrada → Triagem → Avaliação social → Desfecho → Acompanhamento → Desligamento. Cada família tem um registro único. Os dados digitados na entrada seguem para a ficha de avaliação e para o acompanhamento sem ser digitados de novo.

## O que o sistema faz

- **Novo encaminhamento** (coordenação). A vítima é o dado principal e obrigatório; o responsável familiar é opcional. Remetente, documento e prazo vêm de listas. O sistema avisa quando a vítima ou a família já tem registro.
- **Vítima como nome do caso.** Listas, painel e ficha mostram o nome da vítima. A conferência com o GESUAS continua cruzando pelo responsável familiar e pelas demais pessoas do caso.
- **Salvamento em segundo plano.** Ao salvar (registro, violações, desfecho, repasse, edição, conferência do GESUAS etc.), a tela atualiza na hora e a gravação segue por trás. Um painel no canto mostra cada alteração até ficar salva. Se falhar, o sistema tenta de novo sozinho; se continuar falhando, a linha fica em vermelho com "Tentar de novo" ou "Descartar". Fechar a aba com algo pendente pede confirmação. O único cadastro que ainda espera o servidor é o **novo encaminhamento**, porque o número do caso é gerado pela planilha; a importação do PDF do GESUAS também espera.
- **Violações iguais às do GESUAS.** A lista de violações do sistema é a mesma do GESUAS: Violência Física, Psicológica, Exploração Sexual, Abuso/Violência Sexual, Negligência ou Abandono, Trabalho Infantil, Trajetória de Rua, Tráfico de Pessoas, Discriminação por orientação sexual, Violência Patrimonial, Afastamento do convívio familiar (medida socioeducativa e medida de proteção), Discriminação em decorrência de raça/etnia, Descumprimento de condicionalidades do PBF e do PETI, Exploração da imagem, Membro em situação de desaparecimento, Violência Moral, Violência Institucional, Bullying e Outra. Os casos já marcados com o quadro antigo são convertidos sozinhos ao abrir (todos os itens de negligência e abandono viram "Negligência ou Abandono"; a antiga "Exploração sexual, de imagem ou relacionados" vira "Exploração Sexual", e vale conferir em "Editar violações" os que eram de imagem). A planilha só passa a guardar os códigos novos quando o caso é editado.
  - **"Outra": qual?** Ao marcar "Outra", aparece o campo **Qual é a outra violação?** (obrigatório), com sugestões das normativas do SUAS que não têm opção própria no GESUAS (mendicância, discriminação por deficiência, por identidade de gênero, por idade e religiosa, autonegligência da pessoa idosa, trabalho análogo ao de escravo) e o que já foi digitado em outros casos, para manter a mesma escrita. Aparece no caso como "Outra: …", na ficha impressa (em branco, com linha para escrever) e no indicador "Por violação", que mostra o que há dentro de "Outra".
  - **Direto para acompanhamento** (no cadastro do encaminhamento ou pelo botão da triagem) também mostra o quadro de violações e exige ao menos uma, já que o caso não passa pela avaliação social. No repasse da triagem, a prioridade também aparece para confirmar. Casos que já têm violação marcada (vindos da avaliação) não pedem de novo no repasse à técnica.
- **Pendências no registro.** Além da evolução, o registro tem um quadro **Pendências** logo abaixo (documentos a buscar, retornos, providências). Fica opcional e é gravado junto com a evolução, no formulário completo e no modo de campo, inclusive sem internet. Aparece destacado no registro, na ficha impressa e pode ser corrigido em Editar.
  - **Pendência resolvida.** Cada pendência fica "em aberto" até alguém clicar em **Pendência resolvida** (dá para reabrir). As em aberto aparecem numa caixa no topo da aba Dados do caso (com o botão **Resolvida**), na lista de casos (marca "⚑ pendência em aberto" abaixo do nome), no filtro **Com pendência em aberto**, no cartão do painel e, no celular, no cartão da fila e no topo da tela de registro.
- **Registros de atendimento** têm três botões:
  - **Copiar** copia a evolução para colar no GESUAS; quando o registro tem pendências, **Copiar pendências** copia só elas.
  - **Editar** corrige data, tipo e texto. O registro mostra "editado em", e o histórico do caso guarda a edição.
  - **Marcar como lançado no GESUAS** confirma que o registro já foi lançado lá, com a data; dá para desfazer. Vale para os registros feitos a partir de 02/10/2026; a aba de registros avisa quantos deles ainda não foram marcados.
- **Copiar nomes com um clique.** Um ícone ao lado dos nomes (vítimas, responsável, CPF e famílias do GESUAS) copia o texto para colar na busca do GESUAS, sem abrir o caso. Aparece nas listas, no painel, na tela do caso e na conferência do GESUAS.
- **Modo de campo no celular.** No celular, o sistema abre só com a fila da avaliação social e o registro de atendimento: escolha o caso, toque no tipo (visita, tentativa de visita, atendimento, telefone), escreva ou dite pelo teclado e salve. Endereço e telefone (com um toque para ligar) aparecem no caso.
  - **Sem internet:** o registro fica guardado no celular e é enviado sozinho quando o sinal volta, sem duplicar. O que estava sendo escrito também fica guardado se a aba recarregar.
  - **Importante:** abra o sistema no celular **com internet, antes de sair**, e deixe a aba aberta. O Google não permite abrir o sistema do zero sem internet. Se a aba fechar, os registros guardados são enviados na próxima vez que o sistema abrir com internet.
  - No iPhone, o Safari pode apagar dados de sites pouco usados; prefira enviar os registros no mesmo dia.
  - "Abrir a versão completa" leva ao sistema inteiro; "Modo de campo", no menu, volta.
- **Tema claro ou escuro.** No menu lateral, escolha Automático (segue o aparelho), Claro ou Escuro. A escolha fica salva no navegador.
- **Avaliação social.** O técnico registra as visitas e atendimentos com data e, ao concluir, escolhe o desfecho entre as opções prontas:
  - indicar acompanhamento: abre uma janela em que ele marca a **violação vivenciada** (as 20 opções do GESUAS, na mesma ordem; dá para marcar mais de uma) e a **prioridade** (1 urgente, 2 alta, 3 regular), as duas obrigatórias, e pode deixar uma observação. O caso segue para a coordenação escolher a técnica;
  - contrarreferenciar ao CRAS;
  - não confirmado;
  - não localizado;
  - outro serviço;
  - arquivar.
- **Impressão da ficha.** O botão "Imprimir ficha", na tela do caso, gera a mesma Ficha de Avaliação Social em papel — identificação, endereço, descrição, lista de violações do GESUAS (com o que já foi marcado) e os registros de atendimento — pronta para entregar à técnica ou anexar ao encaminhamento.
- **Prioridade (1 urgente, 2 alta, 3 regular).** Entra em dois momentos:
  - no **cadastro do encaminhamento** (padrão 2, editável em Editar dados): serve para a fila da avaliação. As filas de triagem, avaliação e repasse aparecem por prioridade e, dentro dela, pelo caso mais antigo, e o mesmo vale para a fila do celular, que mostra o selo P1, P2 ou P3 no cartão. O painel mostra o cartão **Urgentes (prioridade 1) em avaliação**. Clicar no título de uma coluna volta a ordenar como você quiser;
  - ao **indicar acompanhamento**: quem avaliou vê a prioridade de hoje e confirma ou altera. O valor final é o do acompanhamento.
- **Repasse.** A coordenação escolhe a técnica e a complexidade; a violação e a prioridade seguem como o técnico da avaliação indicou. Em "Dados do caso", o botão **Editar violações e prioridade** corrige as duas depois, sem mudar a etapa. As discussões de caso ficam registradas por data.
- **Conferência com o GESUAS.** Você importa os relatórios do GESUAS exportados em .xls, os três de uma vez:
  - **Famílias Acompanhadas por Técnico** (também aceito em PDF): quem está em acompanhamento, com técnica, início e PAF;
  - **Acompanhamentos**: CPF, NIS, endereço e bairro das famílias. Serve para cruzar pelo CPF e completar dados vazios dos casos (nunca sobrescreve o que foi digitado);
  - **Famílias Atendidas por Técnico**: cada atendimento com data. Na primeira vez, exporte os últimos 12 meses; depois, o mês novo. Atendimentos já importados não se repetem.

  O telefone que vem nos relatórios não é guardado. O sistema aponta, por técnica:
  - famílias repassadas e ainda não cadastradas no GESUAS;
  - famílias com PAF em branco;
  - famílias sem atendimento registrado no GESUAS há mais de 60 dias (aparece quando houver pelo menos 60 dias de atendimentos importados);

  O GESUAS é a referência: com a família encontrada lá, a **técnica do caso passa a ser a do GESUAS** (a indicada no repasse fica como histórico). A tela **Acompanhamento** mostra os casos em acompanhamento e também as famílias que as técnicas incluíram direto no GESUAS, só para consulta: não é preciso cadastrá-las aqui.

  Ao importar um relatório novo, as famílias que **saíram do GESUAS** desde o relatório anterior aparecem numa lista marcada e são **desligadas ao salvar** (dá para desmarcar alguma antes). Assim o desligamento não precisa ser registrado à mão.

  Quando o nome não bate, mas há família com o mesmo sobrenome (da mesma técnica, ou com dois sobrenomes em comum), o caso aparece como **a conferir**. A coordenação confirma ("É esta família"), recusa ("Não é") ou recusa todas as sugestões de uma vez ("Nenhuma destas famílias"). Quando a família foi cadastrada com outro nome, **"Está no GESUAS com outro nome"** abre uma busca: digite parte do nome e a lista do relatório vai filtrando (famílias da mesma técnica aparecem primeiro); um clique vincula o caso àquela família. Se não achar, dá para confirmar sem vincular. A decisão fica salva no caso e pode ser desfeita.

  Um botão copia a mensagem pronta para cada técnica.
- **Painel enxuto.** Os cartões do painel mostram os números (e abrem a lista filtrada); a lista ao lado mostra só as **12 mais urgentes**: a mais grave primeiro e, na mesma gravidade, a mais atrasada. "Ver todas" abre a lista completa.
- **Tela do caso sem repetição.** A descrição aparece uma vez (abaixo do nome). O resumo junta responsável e CPF, endereço e bairro, remetente, documento e data de recebimento numa linha de origem; a técnica de referência aparece só no resumo (com "conforme o GESUAS" e a data de início); a situação no GESUAS só na aba Dados. Na lista de casos, o responsável aparece abaixo da vítima só quando é outra pessoa.
- **Celular (modo de campo):** mostra a idade da vítima, **Abrir no mapa** (endereço e bairro no mapa do celular, útil na zona rural), o telefone para ligar e as pendências em aberto antes do formulário. Na versão completa no celular, os desfechos da avaliação ficam em uma lista compacta.
- **Painel e lista de casos.** Há uma só lista de **Casos**, com filtros de etapa (triagem, avaliação, repasse, acompanhamento, encerrados), técnica, pendência e serviço (PAEFI ou MSE). Cada número do painel e da tabela por técnica é um atalho: abre essa lista já filtrada, e é contado por ela, então os números sempre batem. Em **Acompanhamento** aparecem também, só para consulta, as famílias que as técnicas incluíram direto no GESUAS.
  - **Filtros:** etapa (cada aba mostra quantos casos tem), técnica, pendência e serviço. Em **Mais filtros**: período de recebimento, remetente, bairro, violação (as do GESUAS) e prioridade. O filtro ativo fica destacado, e **Limpar filtros** volta tudo ao normal.
  - **Busca:** procura por palavras em qualquer ordem ("silva maria" acha "Maria da Silva") em nome, nº do caso, CPF (com ou sem pontos), bairro, endereço, remetente, ofício e técnica. Se o caso estiver em outra etapa, o número na aba mostra onde. A tecla **/** leva à busca de qualquer tela, e **Esc** limpa.
  - **Ordenar:** clique no título da coluna (uma vez sobe, outra desce, outra volta ao normal). Na fila de triagem, avaliação e repasse, a última coluna mostra a última movimentação e há quantos dias.
  - **Baixar lista (.csv):** baixa a lista filtrada, na ordem da tela, para abrir no Excel ou no Planilhas.
  - **Menu lateral:** o número ao lado de **Casos** é o de famílias em acompanhamento. Ao entrar em Casos, abrem logo abaixo os atalhos **Avaliação social** e **Acompanhamentos**, cada um com seu número; Casos continua abrindo a lista geral.
  - **Famílias que estão só no GESUAS** também abrem, para consulta: técnica, início, serviço, PAF, CPF, NIS, bairro, endereço, a lista de atendimentos importados e os casos deste sistema com o mesmo nome. Abrem pela lista de Acompanhamento e pelas tabelas da Conferência GESUAS.
  - Ao voltar de um caso, a lista abre no mesmo ponto em que estava. O caso mostra também os **outros casos da mesma família** (mesmo nome ou CPF).
- **Situação no GESUAS de cada caso em acompanhamento**, sempre em relação à data do relatório importado:
  - **registrado** (com PAF e último atendimento);
  - **repassado depois do relatório**: ainda não dá para cobrar, aguarda o próximo relatório;
  - **a conferir**: família com o mesmo sobrenome no relatório;
  - **não registrado**: repasse até 90 dias antes do relatório e a família não aparece; vira cobrança para a técnica;
  - **não consta no GESUAS**: em acompanhamento aqui há mais tempo e fora do relatório; provavelmente desligada lá. O caso mostra o botão para desligar, e a importação oferece desligar esses casos de uma vez (desmarcados por padrão).
- **MSE (LA/PSC)** vem no mesmo relatório do GESUAS, mas fica fora das contas do PAEFI (painel, carga por técnica, territórios); aparece no filtro de serviço.
- **Atendimentos do GESUAS em qualquer caso**, inclusive na avaliação social: a ficha do caso mostra quantos atendimentos há no GESUAS e o último, pelo CPF ou pelo nome.
- **Indicadores.** Só usam o que já é registrado no trabalho do dia a dia e no relatório do GESUAS, sem campos extras. Com filtro de período (últimos 12 meses, ano atual, ano anterior, tudo):
  - encaminhamentos por mês, comparando com o mesmo mês do ano anterior;
  - caminho dos encaminhamentos: recebidos, avaliados, indicados para acompanhamento, em acompanhamento no GESUAS;
  - tempo (mediana) de cada etapa: recebimento até a conclusão da avaliação, conclusão até o repasse, repasse até a inclusão no GESUAS;
  - desfecho das avaliações e, por remetente, quanto se confirma como acompanhamento ou não se confirma;
  - violações do GESUAS mais frequentes, e o cruzamento com o bairro (as 6 mais frequentes como colunas);
  - registros de atendimento por tipo, registros por avaliação e avaliações com visita domiciliar;
  - carga por técnica (famílias no GESUAS ponderadas pela complexidade), PAF preenchido e famílias aguardando inclusão;
  - atendimentos registrados no GESUAS por mês, produção por técnica e tempo do repasse até o primeiro atendimento;
  - **mês a mês, duas pendências do GESUAS:** famílias aguardando inclusão no GESUAS (repassadas e ainda não registradas, no último dia de cada mês) e famílias sem atendimento há mais de 60 dias (com a % sobre as famílias em acompanhamento naquele mês). Os meses são refeitos a cada abertura, sem nada a registrar: a espera conta do repasse até a data de início da família no GESUAS, e a falta de atendimento usa os atendimentos importados. O último ponto é o mesmo número do painel, e o botão "Ver a lista de hoje" abre essa lista. Só aparecem os meses com 60 dias de atendimentos importados, e quem já saiu do GESUAS não entra nos meses antigos;
  - encaminhamentos por território e território × violação (bairro do caso ou do GESUAS), e famílias em acompanhamento por território;
  - encaminhamentos de vítimas ou famílias que já tinham caso anterior.

  Os números de recebidos, remetentes, violações, situações, territórios e da carga por técnica são clicáveis: abrem a lista de casos com o mesmo filtro e o mesmo período, e a contagem bate.

## Quem acessa

Todos usam o mesmo sistema, com o mesmo acesso: entrada, triagem, avaliação, repasse, registros (inclusive editar), GESUAS e indicadores. O e-mail de cada pessoa vai na aba **Config** da planilha base, em uma das duas linhas, e a linha só muda a assinatura dos registros e do histórico:

| Linha da Config | Assinatura |
|---|---|
| `emails_coordenacao` | Coordenação |
| `emails_avaliacao` | Avaliação social |

O site roda com a conta Google de quem acessa. Por isso, só entra quem tem acesso à planilha base e está listado na aba Config.

## Instalação

1. No Google Drive, crie uma planilha nova chamada **Controle de Demandas CREAS – Base**.
2. Na planilha, abra **Extensões > Apps Script**.
3. Crie no editor os arquivos abaixo e cole o conteúdo de cada um, que está na pasta `src/`:
   - Arquivos de **script**: `Code`, `Dados`, `Util`, `Migracao` (sem a extensão `.gs`).
   - Arquivos **HTML**: `Index`, `Estilo`, `App`.
   - Em **Configurações do projeto**, marque "Mostrar arquivo de manifesto appsscript.json" e substitua o conteúdo dele pelo de `src/appsscript.json`.
4. Selecione a função `configurar` e clique em **Executar**. Autorize o acesso quando o Google pedir. As abas da base são criadas e o seu e-mail entra como coordenação.
5. Na aba **Config** da planilha, preencha `emails_avaliacao` com o e-mail da avaliação social.
6. Compartilhe a planilha base com esse e-mail como **Editor**. Isso é necessário porque o site grava na planilha com a conta de quem está usando.
7. Publique o site em **Implantar > Nova implantação > App da Web**:
   - Executar como: **Usuário que acessa o app da Web**
   - Quem pode acessar: **Qualquer pessoa com uma Conta do Google**

   O acesso continua restrito pelos e-mails da aba Config. Copie a URL gerada: esse é o endereço do sistema.

### Migrar a planilha antiga (uma vez só)

1. Abra o `.xlsx` antigo no Drive e use **Arquivo > Salvar como Planilhas Google**.
2. Copie o ID da planilha convertida (o trecho da URL entre `/d/` e `/edit`) para a chave `planilha_antiga_id` da aba Config.
3. No editor do Apps Script, execute `migrarPlanilhaAntiga`. O resumo aparece no registro de execução.

Regras da migração:

- **Aba 2026:** caso com técnica preenchida entra como *Em acompanhamento*; sem técnica, entra como *Aguardando triagem*.
- **Aba 2025:** entra como histórico encerrado. Serve para consulta e para o aviso de "família já conhecida".
- **Aba Avaliação Social:**
  - família que já está nas abas de ano: o caso é marcado como "passou por avaliação";
  - família que não está: vira caso próprio;
  - avaliação sem situação concluída volta para a fila de avaliação.
- **Padronização:**
  - remetentes são agrupados em categorias, e o texto original fica em "Detalhe do remetente";
  - datas com dia e mês trocados ou com o ano errado são corrigidas quando dá para identificar.
- **Marcação:** todo caso migrado recebe `origem = migração …`, para você filtrar e revisar na planilha.

Com os dados de 24/09/2026, o resultado esperado é de 349 casos: 98 em acompanhamento, 34 na fila de avaliação, 1 em triagem e 216 encerrados ou históricos.

### Atualizar o sistema depois

Cole os arquivos novos no editor. Depois abra **Implantar > Gerenciar implantações**, edite a implantação e escolha **Nova versão**. A URL continua a mesma.

Quem preferir a linha de comando pode usar o [clasp](https://github.com/google/clasp) (`clasp clone <scriptId>` e `clasp push`) com a pasta `src/` como `rootDir`.

## Estrutura

```
src/
  appsscript.json   manifesto (fuso, publicação como web app)
  Code.gs           web app, instalação, perfis e funções chamadas pelo navegador (api_*)
  Dados.gs          leitura e gravação das abas (cada aba é uma tabela)
  Util.gs           normalização de nomes, datas e remetentes
  Migracao.gs       importação da planilha antiga
  Index.html        página
  Estilo.html       aparência
  App.html          telas e lógica do navegador, incluindo a leitura do PDF do GESUAS (pdf.js)
```

### Abas da planilha base

| Aba | Conteúdo |
|---|---|
| Casos | Um caso por linha: identificação, origem, prazo, etapa, diagnóstico, desfecho, técnica, complexidade |
| Pessoas | Pessoas da família e possíveis vítimas de cada caso |
| Registros | Evoluções com data (visitas, atendimentos, contatos), pendências, quem editou e quando foi lançado no GESUAS |
| Discussoes | Planos definidos nas discussões de caso |
| Historico | Registro automático de cada mudança (quem e quando) |
| GESUAS | Último relatório "Famílias Acompanhadas por Técnico" importado, com CPF, NIS, bairro e endereço do relatório Acompanhamentos |
| Atendimentos | Atendimentos importados do relatório "Famílias Atendidas por Técnico" (técnico, responsável, CPF/NIS, bairro e data) |
| Listas | Remetentes, tipos de documento, técnicas, bairros e tipos de registro. Edite aqui para mudar as opções do site |
| Config | E-mails de acesso, numeração dos casos e dados da última importação do GESUAS |

## Privacidade

Os dados das famílias ficam só na planilha base, no Google Drive de quem a criou. Este repositório contém apenas o código, sem nenhum dado de pessoas. O PDF do GESUAS é lido no navegador, e só a lista de famílias extraída dele é gravada na planilha. A lista baixada em .csv tem dados pessoais: guarde e apague com o mesmo cuidado da planilha.
