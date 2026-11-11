# Controle de Demandas CREAS

Sistema web (Google Apps Script) para registrar os encaminhamentos recebidos pelo CREAS Taquara/RS, conduzir a avaliação social e acompanhar o repasse dos casos às técnicas. Substitui a planilha "Casos em Avaliação Social e Repassados para acompanhamento".

**Fluxo de um caso:** Entrada → Triagem → Avaliação social → Desfecho → Acompanhamento → Desligamento. Cada família tem um registro único. Os dados digitados na entrada seguem para a ficha de avaliação e para o acompanhamento sem ser digitados de novo.

## O que o sistema faz

- **Novo encaminhamento** (coordenação), pelo botão **+** da barra no topo. A vítima é o dado principal e obrigatório; o responsável familiar é opcional. Remetente, documento e prazo vêm de listas. O sistema avisa quando a vítima ou a família já tem registro. **Preencher pelo Relatório Sintético** (botão ao lado do título): escolha o PDF do "Relatório Sintético da Família" gerado no GESUAS. Uma janela lista a composição familiar (nome, parentesco e idade); marque as vítimas (crianças e adolescentes já vêm marcados) e o responsável familiar (vem marcada a pessoa de referência). O sistema preenche vítimas (nome e nascimento; o sexo só da pessoa de referência), responsável, CPF (só quando o responsável é a pessoa de referência), endereço, bairro e contato (se informado). Origem, prazo, descrição e destino continuam para digitar. O arquivo é lido no navegador: nada é enviado nem guardado além do que vai para o caso (NIS, renda, despesas e domicílio ficam de fora). O prazo de resposta pode ser alterado depois (prorrogação ou data corrigida) ou retirado, pelo botão **Alterar prazo** na tela do caso ou **alterar** no resumo da lista; a mudança fica no histórico do caso ("Prazo de resposta alterado de 30/10/2026 para 15/11/2026").
- **Vítima como nome do caso.** Listas, painel e ficha mostram o nome da vítima. A conferência com o GESUAS continua cruzando pelo responsável familiar e pelas demais pessoas do caso.
- **Salvamento em segundo plano.** Ao salvar (registro, violações, desfecho, repasse, edição, conferência do GESUAS etc.), a tela atualiza na hora e a gravação segue por trás. Um painel no canto mostra cada alteração até ficar salva. Se falhar, o sistema tenta de novo sozinho por cerca de 2 minutos; se continuar falhando, a linha fica em vermelho com "Tentar de novo" ou "Descartar", e quando a internet volta tenta outra vez sozinho. Fechar a aba com algo pendente pede confirmação. O único cadastro que ainda espera o servidor é o **novo encaminhamento**, porque o número do caso é gerado pela planilha; a importação do PDF do GESUAS também espera.
  - **Nada do que foi digitado se perde.** Registros e discussões que ainda não chegaram à planilha ficam guardados no navegador: se a aba fechar, a página recarregar ou o computador desligar, eles voltam para a fila na próxima abertura (sem duplicar). O registro em digitação e o novo encaminhamento em digitação também ficam guardados: sair da tela, clicar de novo em "Novo encaminhamento" ou recarregar não apaga; só "Limpar" (com confirmação) e o registro apagam.
  - **Novo encaminhamento sem duplicar:** se a resposta da gravação se perder e a pessoa clicar de novo, o servidor reconhece o mesmo cadastro e devolve o caso já gravado.
- **Violações iguais às do GESUAS.** A lista de violações do sistema é a mesma do GESUAS: Violência Física, Psicológica, Exploração Sexual, Abuso/Violência Sexual, Negligência ou Abandono, Trabalho Infantil, Trajetória de Rua, Tráfico de Pessoas, Discriminação por orientação sexual, Violência Patrimonial, Afastamento do convívio familiar (medida socioeducativa e medida de proteção), Discriminação em decorrência de raça/etnia, Descumprimento de condicionalidades do PBF e do PETI, Exploração da imagem, Membro em situação de desaparecimento, Violência Moral, Violência Institucional, Bullying e Outra. Os casos já marcados com o quadro antigo são convertidos sozinhos ao abrir (todos os itens de negligência e abandono viram "Negligência ou Abandono"; a antiga "Exploração sexual, de imagem ou relacionados" vira "Exploração Sexual", e vale conferir em "Editar violações" os que eram de imagem). A planilha só passa a guardar os códigos novos quando o caso é editado.
  - **"Outra": qual?** Ao marcar "Outra", aparece o campo **Qual é a outra violação?** (obrigatório), com sugestões das normativas do SUAS que não têm opção própria no GESUAS (mendicância, discriminação por deficiência, por identidade de gênero, por idade e religiosa, autonegligência da pessoa idosa, trabalho análogo ao de escravo) e o que já foi digitado em outros casos, para manter a mesma escrita. Aparece no caso como "Outra: …", na ficha impressa (em branco, com linha para escrever) e no indicador "Por violação", que mostra o que há dentro de "Outra".
  - **Direto para acompanhamento** (no cadastro do encaminhamento ou pelo botão da triagem) também mostra o quadro de violações e exige ao menos uma, já que o caso não passa pela avaliação social. No repasse da triagem, a prioridade também aparece para confirmar. Casos que já têm violação marcada (vindos da avaliação) não pedem de novo no repasse à técnica.
- **Pendências no registro.** Além da evolução, o registro tem um quadro **Pendências** logo abaixo (documentos a buscar, retornos, providências). Fica opcional e é gravado junto com a evolução, no formulário completo e no modo de campo, inclusive sem internet. Aparece destacado no registro, na ficha impressa e pode ser corrigido em Editar.
  - **Pendência resolvida.** Cada pendência fica "em aberto" até alguém clicar em **Pendência resolvida** (dá para reabrir). As em aberto aparecem numa caixa no topo da tela do caso (com o botão **Resolvida**), na lista de casos (marca "⚑ pendência em aberto" abaixo do nome), no filtro **Com pendência em aberto**, no cartão do painel e, no celular, no cartão da fila e no topo da tela de registro.
- **Registros de atendimento** têm três botões:
  - **Copiar** copia a evolução para colar no GESUAS; quando o registro tem pendências, **Copiar pendências** copia só elas.
  - **Editar** corrige data, tipo e texto. O registro mostra "editado em", e o histórico do caso guarda a edição.
  - **Marcar como lançado no GESUAS** confirma que o registro já foi lançado lá, com a data; dá para desfazer. Vale para os registros feitos a partir de 02/10/2026; a parte de registros avisa quantos deles ainda não foram marcados.
  - **Registros e atendimentos do GESUAS numa lista só.** Na tela do caso, os atendimentos importados do relatório Famílias Atendidas por Técnico entram na mesma lista dos registros feitos aqui, por data. Atendimento do GESUAS no mesmo dia de um registro daqui é tratado como o mesmo atendimento: aparece dentro do registro ("✓ No GESUAS: atendimento com …") e o registro não pede mais "Marcar como lançado". Na linha aberta da lista de casos, **Último atend.** é o mais recente dos dois (aqui ou no GESUAS).
- **Copiar nomes com um clique.** Um ícone ao lado dos nomes (vítimas, responsável, CPF e famílias do GESUAS) copia o texto para colar na busca do GESUAS, sem abrir o caso. Aparece nas listas, no painel, na tela do caso e na conferência do GESUAS.
- **Modo de campo no celular.** No celular, o sistema abre só com a fila da avaliação social e o registro de atendimento: escolha o caso, toque no tipo (visita, tentativa de visita, atendimento, telefone), escreva ou dite pelo teclado e salve. Endereço e telefone (com um toque para ligar) aparecem no caso.
  - **Sem internet:** o registro fica guardado no celular e é enviado sozinho quando o sinal volta, sem duplicar. O que estava sendo escrito também fica guardado se a aba recarregar.
  - **Importante:** abra o sistema no celular **com internet, antes de sair**, e deixe a aba aberta. O Google não permite abrir o sistema do zero sem internet. Se a aba fechar, os registros guardados são enviados na próxima vez que o sistema abrir com internet.
  - No iPhone, o Safari pode apagar dados de sites pouco usados; prefira enviar os registros no mesmo dia.
  - "Abrir a versão completa" leva ao sistema inteiro; "Modo de campo", no menu, volta.
- **Visual.** Menu lateral com ícones, em duas seções (Menu principal e Outros). No computador ele fica recolhido numa faixa estreita só com os ícones, para sobrar espaço para o conteúdo, e abre por cima da tela num movimento leve (só a parte visível muda, nada é recalculado; os subitens de Casos deslizam junto), com o nome e o número de cada item, ao passar o mouse (ou ao navegar com o teclado); no celular e no tablet segue aberto como antes. Cartões sem borda com cantos arredondados, cartões sem borda com cantos arredondados, e a lista de casos com busca, abas, filtros e tabela num cartão só. O texto cinza tem contraste de pelo menos 4,5:1 nos dois temas, e a etapa "aguardando repasse" tem cor própria (não a vermelha de alerta).
- **Textos de explicação viram o ícone ⓘ** ao lado do título de cada bloco (Indicadores, Conferência GESUAS): o texto aparece ao passar o mouse ou ao tocar. As telas não têm mais parágrafos de introdução abaixo do título.
- **Tela do caso numa página só, com rolagem** (sem abas): dados e pendências, situação no GESUAS, **Registros e atendimentos** (os do GESUAS junto; o formulário fica recolhido no botão **Novo registro** e abre sozinho quando há rascunho), **Acompanhamento** (complexidade e discussões de caso) e, recolhido no fim, o **Histórico**.
- **Barra no topo, à direita do título de cada tela:**
  - **+**: novo encaminhamento;
  - **busca** (o mesmo que a tecla **/**);
  - **tema**: cada clique troca entre Automático (segue o aparelho), Claro e Escuro, e a escolha fica salva no navegador;
  - **sino**: o número é o de prazos de resposta vencidos ou que vencem em 7 dias (vermelho quando há algum vencido), e o clique abre essa lista.

  Quem está usando aparece no pé do menu lateral.

  No celular, a barra fica numa linha própria, acima do título.
- **Avaliação social.** O técnico registra as visitas e atendimentos com data e, ao concluir, escolhe o desfecho entre as opções prontas:
  - indicar acompanhamento: abre uma janela em que ele marca a **violação vivenciada** (as 20 opções do GESUAS, na mesma ordem; dá para marcar mais de uma) e a **prioridade** (1 urgente, 2 alta, 3 regular), as duas obrigatórias, e pode deixar uma observação. O caso segue para a coordenação escolher a técnica;
  - contrarreferenciar ao CRAS;
  - não confirmado;
  - não localizado;
  - outro serviço;
  - arquivar.
- **Impressão da ficha.** O botão "Imprimir ficha", na tela do caso, gera a ficha em papel (A4, letra maior). Enquanto o caso está em triagem ou avaliação, sai a **Ficha de Avaliação Social**: identificação com tabela das vítimas (nascimento, idade, sexo), responsável e CPF, endereço, bairro e contato; o encaminhamento recebido (remetente, documento, recebido em, prazo, prioridade e descrição); a lista de violações do GESUAS; a conclusão da avaliação para marcar (com a prioridade sugerida); os registros de atendimento; 18 linhas para anotações e assinatura. Depois da indicação de acompanhamento (repasse, acompanhamento ou encerrado depois dele), sai a **Ficha de Encaminhamento para Acompanhamento**, com um bloco próprio (indicado em, se passou pela avaliação, técnica de referência, início, complexidade, prioridade, observação da avaliação e desligamento), as discussões de caso e 16 linhas para anotações do acompanhamento.
- **Prioridade (1 urgente, 2 alta, 3 regular).** Entra em dois momentos:
  - no **cadastro do encaminhamento** (padrão 2, editável em Editar dados): serve para a fila da avaliação. As filas de triagem, avaliação e repasse aparecem por prioridade e, dentro dela, pelo caso mais antigo, e o mesmo vale para a fila do celular, que mostra o selo P1, P2 ou P3 no cartão. O painel mostra o cartão **Urgentes (prioridade 1) em avaliação**. Clicar no título de uma coluna volta a ordenar como você quiser;
  - ao **indicar acompanhamento**: quem avaliou vê a prioridade de hoje e confirma ou altera. O valor final é o do acompanhamento.
- **Repasse.** A coordenação escolhe a técnica e a complexidade; a violação e a prioridade seguem como o técnico da avaliação indicou. Em "Dados do caso", o botão **Editar violações e prioridade** corrige as duas depois, sem mudar a etapa. As discussões de caso ficam registradas por data.
- **Conferência com o GESUAS.** Você importa dois relatórios do GESUAS exportados em .xls, os dois de uma vez:
  - **Famílias Acompanhadas por Técnico** (também aceito em PDF): quem está em acompanhamento, com técnica, início e PAF. É o único que traz todas as famílias em acompanhamento;
  - **Famílias Atendidas por Técnico**: cada atendimento com data, e o CPF, NIS, bairro e endereço da família. Na primeira vez, exporte os últimos 12 meses; depois, o mês novo. Atendimentos já importados não se repetem. O CPF, o bairro e o endereço completam as famílias do GESUAS (vale o atendimento mais recente) e os dados vazios dos casos (nunca sobrescreve o que foi digitado).

  O relatório **Acompanhamentos** não precisa mais ser importado: ele lista só as famílias em acompanhamento que tiveram atendimento no período, com os mesmos CPF, NIS, bairro e endereço do Famílias Atendidas por Técnico. Se for selecionado junto, o sistema avisa e deixa o arquivo de lado.

  O telefone que vem nos relatórios não é guardado. Na tela **Conferência GESUAS** ficam todos os números do GESUAS, numa tabela **por técnica** com o total (cada número abre a lista):
  - no GESUAS;
  - famílias repassadas e ainda não cadastradas no GESUAS;
  - a conferir (mesmo sobrenome);
  - famílias com PAF em branco;
  - famílias sem atendimento registrado no GESUAS há mais de 60 dias, ou o que estiver na Config (aparece quando houver pelo menos esse tempo de atendimentos importados).

  Abaixo da tabela, um aviso mostra os casos em acompanhamento aqui que não aparecem no GESUAS (provavelmente desligados lá). Em seguida vem **o que cada técnica precisa resolver**, só para quem tem pendência, com a conferência pelo sobrenome e as listas;

  O GESUAS é a referência: com a família encontrada lá, a **técnica do caso passa a ser a do GESUAS** (a indicada no repasse fica como histórico). A aba **Acompanhamento** mostra só as famílias em acompanhamento no GESUAS: os casos daqui vinculados a uma família de lá (achada no relatório ou confirmada à mão) e as famílias que as técnicas incluíram direto no GESUAS, só para consulta (não é preciso cadastrá-las aqui). O caso repassado à técnica que ainda não foi achado no relatório fica na aba **Repasse**, como "aguardando inclusão no GESUAS", até aparecer lá.

  Ao importar um relatório novo, as famílias que **saíram do GESUAS** desde o relatório anterior aparecem numa lista marcada e são **desligadas ao salvar** (dá para desmarcar alguma antes). Assim o desligamento não precisa ser registrado à mão. Se o relatório novo for bem menor que o anterior (menos de 80% das famílias, ou muitas saindo de uma vez, como quando é exportado só de uma técnica), aparece um aviso em vermelho e **nenhum caso vem marcado**: marque só os que saíram mesmo. Um caso desligado por engano volta pelo botão **Reabrir caso > Voltar ao acompanhamento**, com a mesma técnica e a mesma data de início.

  **O sistema lembra quem já esteve no GESUAS.** Cada importação grava no caso o nome da família no GESUAS (coluna `gesuas_visto` da aba Casos, criada sozinha). Se a família sumir de um relatório e o caso não for desligado na hora (por exemplo, numa importação com o aviso vermelho em que ela não foi marcada), nas importações seguintes ela continua aparecendo como **saiu do GESUAS**, para desligar, e nunca como "repassada e não registrada" (que cobraria a técnica à toa). Os casos já achados antes desta mudança ganham o nome na primeira importação depois dela.

  Quando o nome não bate, mas há família com o mesmo sobrenome (da mesma técnica, ou com dois sobrenomes em comum), o caso aparece como **a conferir**. A coordenação confirma ("É esta família"), recusa ("Não é") ou recusa todas as sugestões de uma vez ("Nenhuma destas famílias"). Quando a família foi cadastrada com outro nome, **"Está no GESUAS com outro nome"** abre uma busca: digite parte do nome e a lista do relatório vai filtrando (famílias da mesma técnica aparecem primeiro); um clique vincula o caso àquela família. Não há mais "confirmar sem vincular": sem o nome da família, o sistema não perceberia quando ela saísse do GESUAS. Se a família não estiver no relatório, o caso não está em acompanhamento lá. Os casos confirmados assim antes desta mudança aparecem num aviso da Conferência (**confirmados à mão sem a família escolhida**, com a lista), para escolher a família uma vez. A decisão fica salva no caso e pode ser desfeita.

  Um botão copia a mensagem pronta para cada técnica.
- **Painel: o andamento dos casos.** Abre com a saudação e a data. Cada número abre a lista filtrada e é contado por ela:
  - **Andamento dos casos:** as quatro etapas lado a lado, na ordem do fluxo (aguardando triagem, em avaliação social, aguardando técnica ou inclusão no GESUAS, em acompanhamento no GESUAS). Elas somam o total "Em atendimento";
  - **Em atendimento:** o total (o mesmo número do menu) e os urgentes (prioridade 1) na avaliação;
  - **Mais urgentes:** as 8 mais urgentes, com um ícone por tipo e os dias à direita; "Ver todas" mostra a lista completa ("Tudo o que precisa de atenção"). Acima da lista, um botão por tipo, com a contagem, mostra só aquele tipo. Os avisos, na ordem em que aparecem (vermelho antes de amarelo e de azul; no mesmo tipo, o mais atrasado primeiro):
    - **prazo de resposta** vencido (vermelho) ou que vence em até 7 dias;
    - **escolher a técnica:** a avaliação indicou acompanhamento e falta o repasse;
    - **triagem sem decisão de destino** há mais de 7 dias (até lá, aviso azul "Aguardando triagem");
    - **avaliação sem movimentação** há mais de 30 dias (sem registro desde a entrada na avaliação ou o último registro);
    - **sem inclusão no GESUAS:** repassado há mais de 30 dias e ainda não achado no relatório (não registrado, a conferir pelo sobrenome ou que não consta mais). Quem foi repassado depois da data do relatório em uso não entra: ainda não dá para cobrar;
    - **pendência em aberto** há mais de 15 dias, anotada num registro e não marcada como resolvida (um aviso por caso, pela mais antiga);
    - **sem atendimento registrado no GESUAS** há mais de 60 dias, inclusive das famílias que estão só no GESUAS (abre a ficha da família).

    **Os dias de cada aviso ficam na aba Config** e a coordenação muda lá, sem mexer no código: `alerta_dias_triagem` (7), `alerta_dias_avaliacao` (30), `alerta_dias_gesuas` (30), `alerta_dias_pendencia` (15) e `alerta_dias_atendimento` (60). As linhas aparecem sozinhas na primeira abertura depois da atualização; valor vazio ou inválido volta ao padrão. Os dias da avaliação e do atendimento valem também para o medidor, os filtros da lista de casos, a Conferência GESUAS e os Indicadores.
  - **Fila da avaliação:** um medidor com a parte da fila parada há mais de 30 dias, ou o que estiver na Config (sem registro desde a entrada na avaliação ou o último registro), e logo abaixo os prazos vencidos ou em 7 dias e os casos com pendência em aberto. Os números do GESUAS não aparecem no painel, só na Conferência GESUAS; o painel avisa apenas quando o relatório em uso tem mais de 35 dias.
- **Tela do caso sem repetição.** A descrição aparece uma vez (abaixo do nome). O resumo junta responsável e CPF, endereço e bairro, remetente, documento e data de recebimento numa linha de origem; a técnica de referência aparece só no resumo (com "conforme o GESUAS" e a data de início); a situação no GESUAS uma vez, no bloco de dados. Na lista de casos, o responsável aparece abaixo da vítima só quando é outra pessoa.
- **Celular (modo de campo):** mostra a idade da vítima, **Abrir no mapa** (endereço e bairro no mapa do celular, útil na zona rural), o telefone para ligar e as pendências em aberto antes do formulário. Na versão completa no celular, os desfechos da avaliação ficam em uma lista compacta.
- **Painel e lista de casos.** Há uma só lista de **Casos**, com filtros de etapa, técnica, pendência e serviço (PAEFI ou MSE). Cada número do painel e da tabela por técnica da Conferência GESUAS é um atalho: abre essa lista já filtrada, e é contado por ela, então os números sempre batem. As abas de etapa:
  - **Em atendimento:** todos os casos em atendimento, com as famílias que estão só no GESUAS (só para consulta). É a soma das quatro abas seguintes;
  - **Triagem** e **Avaliação**;
  - **Repasse:** aguardando a escolha da técnica ou, já repassado, aguardando a inclusão da família no GESUAS (não registrado, a conferir pelo sobrenome, repassado depois do relatório ou que não consta mais). Mostra o que se espera, a técnica, desde quando e a situação no GESUAS;
  - **Acompanhamento:** só as famílias em acompanhamento no GESUAS, vinculadas a um caso daqui ou incluídas direto lá. Sem relatório do GESUAS importado, vale a etapa gravada no caso;
  - **Encerrados** e **Todos** (os encaminhamentos deste sistema, inclusive os encerrados, sem as famílias só do GESUAS).
  - **Filtros:** numa linha só, abas de etapa (cada uma mostra quantos casos tem), técnica, pendência e serviço, e três ícones: **funil** (mais filtros: período de recebimento, remetente, bairro, violação e prioridade; o número no ícone diz quantos estão ativos), **X** (limpar filtros e busca, só aparece com algum ativo) e **baixar** (.csv). O filtro ativo fica destacado.
  - **Busca** (ao lado do título): procura por palavras em qualquer ordem ("silva maria" acha "Maria da Silva") em nome, nº do caso, CPF (com ou sem pontos), bairro, endereço, remetente, ofício e técnica. Se o caso estiver em outra etapa, o número na aba mostra onde. A tecla **/** leva à busca de qualquer tela, e **Esc** limpa.
  - **Ordenar:** clique no título da coluna (uma vez sobe, outra desce, outra volta ao normal). Na fila de triagem, avaliação e repasse, a última coluna mostra a última movimentação e há quantos dias.
  - **Um clique numa linha** abre o caso ali mesmo, logo abaixo da linha (outro clique fecha): etapa e técnica, há quantos dias foi o último registro e o último atendimento no GESUAS, prazo de resposta (com **alterar**), situação no GESUAS, origem e pendências em aberto. Ao lado, numa linha do tempo só, os últimos registros (até 8) feitos aqui (avaliação social e acompanhamento) e os atendimentos importados do GESUAS, do mais novo ao mais antigo. Para as famílias que estão só no GESUAS, técnica, PAF e os atendimentos. **Dois cliques** (ou **Abrir caso**, ou Enter) abrem a tela completa, como antes; **Novo registro** abre o caso já no formulário de registro. **Esc** fecha a linha aberta, e ao voltar de um caso a linha dele aparece aberta.
  - **Menos poluição:** o ícone de copiar ao lado dos nomes só aparece ao passar o mouse na linha (no celular, sempre); o número do ofício fica na linha aberta.
  - **Baixar lista (.csv)** (ícone): baixa a lista filtrada, na ordem da tela, para abrir no Excel ou no Planilhas.
  - **Menu lateral:** o número ao lado de **Casos** é o da lista que ele abre (**Em atendimento**). Logo abaixo (com o menu aberto) ficam **Avaliação social** e o nome de cada técnica, com o número de famílias que ela acompanha (somados, dão o total da aba Acompanhamento); cada um abre a lista já filtrada. Casos continua abrindo a lista geral. Em **Outros** fica **Verificar a base**.
  - **Famílias que estão só no GESUAS** também abrem, para consulta: técnica, início, serviço, PAF, CPF, NIS, bairro, endereço, a lista de atendimentos importados e os casos deste sistema com o mesmo nome. Abrem pela lista de Acompanhamento e pelas tabelas da Conferência GESUAS.
  - Ao voltar de um caso, a lista abre no mesmo ponto em que estava. O caso mostra também os **outros casos da mesma família** (mesmo nome ou CPF).
- **Situação no GESUAS de cada caso em acompanhamento**, sempre em relação à data do relatório importado:
  - **registrado** (com PAF e último atendimento);
  - **repassado depois do relatório**: ainda não dá para cobrar, aguarda o próximo relatório;
  - **a conferir**: família com o mesmo sobrenome no relatório;
  - **não registrado**: repasse até 90 dias antes do relatório e a família não aparece; vira cobrança para a técnica;
  - **não consta no GESUAS / saiu do GESUAS**: em acompanhamento aqui há mais de 90 dias e fora do relatório, ou a família já esteve no GESUAS e sumiu; provavelmente desligada lá. O caso mostra o botão para desligar, e a importação oferece desligar esses casos de uma vez (desmarcados por padrão).
- **MSE (LA/PSC)** vem no mesmo relatório do GESUAS, mas fica fora das contas do PAEFI (painel, carga por técnica, territórios); aparece no filtro de serviço.
- **Atendimentos do GESUAS em qualquer caso**, inclusive na avaliação social: a ficha do caso mostra quantos atendimentos há no GESUAS e o último, pelo CPF ou pelo nome.
- **Indicadores.** Só usam o que já é registrado no trabalho do dia a dia e no relatório do GESUAS, sem campos extras. Com filtro de período (últimos 12 meses, ano atual, ano anterior, tudo):
  - encaminhamentos por mês, comparando com o mesmo mês do ano anterior;
  - caminho dos encaminhamentos: recebidos, avaliados, indicados para acompanhamento, em acompanhamento no GESUAS;
  - tempo (mediana) de cada etapa: recebimento até a conclusão da avaliação, conclusão até o repasse, repasse até a inclusão no GESUAS;
  - casos em avaliação social hoje, com o tempo na fila (mediana), porque o tempo até concluir só mede as avaliações já concluídas;
  - desfecho das avaliações e, por remetente, quanto se confirma como acompanhamento ou não se confirma;
  - violações do GESUAS mais frequentes, e o cruzamento com o bairro (as 6 mais frequentes como colunas);
  - registros de atendimento por tipo, registros por avaliação e avaliações com visita domiciliar (só os registros até a conclusão da avaliação);
  - carga por técnica (famílias registradas no GESUAS ponderadas pela complexidade, as mesmas da lista que abre ao clicar no nome). PAF em branco e famílias aguardando inclusão ficam na Conferência GESUAS;
  - atendimentos registrados no GESUAS por mês, produção por técnica e tempo do repasse até o primeiro atendimento;
  - **mês a mês, duas pendências do GESUAS:** famílias aguardando inclusão no GESUAS (repassadas e ainda não registradas, no último dia de cada mês) e famílias sem atendimento há mais de 60 dias (com a % sobre as famílias em acompanhamento naquele mês). Os meses são refeitos a cada abertura, sem nada a registrar: a espera conta do repasse até a data de início da família no GESUAS, e a falta de atendimento usa os atendimentos importados. O último ponto é o mesmo número do painel, e o botão "Ver a lista de hoje" abre essa lista. Só aparecem os meses com 60 dias de atendimentos importados, e quem já saiu do GESUAS não entra nos meses antigos;
  - encaminhamentos por território e território × violação (bairro do caso ou do GESUAS), e famílias em acompanhamento por território;
  - encaminhamentos de vítimas ou famílias que já tinham caso anterior.

  Os números de recebidos, remetentes, violações, situações, territórios e da carga por técnica são clicáveis: abrem a lista de casos com o mesmo filtro e o mesmo período, e a contagem bate (em "Tudo", inclusive os casos migrados sem data de recebimento).

- **CRM, Centro de Referência da Mulher (casos do Fórum e da rede).** Parte própria do sistema, com acesso próprio (ver "Quem acessa"), símbolo de escudo com o símbolo feminino e a tela em lilás e roxo. Quem usa o CREAS e o CRM troca de parte no pé do menu ("Sistema", logo acima de quem está usando); quem usa só o CRM abre direto nele e não vê nada do CREAS. O CRM não passa pela avaliação social: o caso segue do e-mail ao contato e ao acompanhamento dentro do próprio CRM. O e-mail do CRM traz só o nº do processo e a chave de acesso; o caminho de cada caso fica na tela:
  1. **Caso novo:** o + no alto da tela do CRM abre um formulário curto: nº do processo e chave de acesso (quando vem do Fórum), nome (se já souber) e origem (já vem 2ª Vara Criminal). Processo que já está no CRM não entra de novo. Entrada (o dia do cadastro) e situação (violência doméstica) são gravadas sozinhas.
  2. **Abrir o processo:** um clique na linha abre o caso para baixo, em três partes: no alto a **ficha** dela, só para leitura (nome, idade, telefone, CPF, endereço, origem, entrada, técnica, observações, situação quando não é violência doméstica, "Cadastro no GESUAS" e, numa linha discreta no fim, o processo e a chave com ícones de copiar e o link da consulta); abaixo, **Registrar contato**; e por último o **Histórico**. "Editar dados" abre só os campos que a técnica preenche: nome, telefone, CPF, endereço, bairro, técnica, processo, chave e observações (gravam ao sair de cada um) e "Concluir" volta à ficha. Caso que só tem o processo já abre em "Editar dados". O endereço da consulta pode ser trocado na aba Config, chave `crm_link_consulta`.
  3. **Conferir no GESUAS:** a equipe do CRM confere no GESUAS se ela tem cadastro e marca "Cadastro no GESUAS: Tem / Não tem" (a coluna No GESUAS da lista mostra essa marcação). Se ela tem cadastro, o Relatório Sintético da Família do GESUAS preenche os dados (escolhendo qual pessoa é ela). **CRM e CREAS não se misturam:** o CRM não mostra casos do CREAS, nem os relatórios e atendimentos do GESUAS importados pelo CREAS, e quem usa só o CRM não recebe esses dados.
  4. **Primeiro contato:** cada tentativa é registrada com data, meio (telefone, WhatsApp, atendimento na unidade, visita domiciliar, carta), resultado (Sem contato, Agendou atendimento, Aceitou o atendimento, Não quis o atendimento ou Atendimento realizado), anotação e, em "+ pendência", o que ficou para depois (fica em aberto até "Pendência resolvida"). Cada contato em que se falou com ela tem "Copiar" e "Marcar como lançado no GESUAS"; tentativas sem retorno e mudanças de situação não são cobradas, nem o que veio da planilha antiga. A lista mostra "⚑ pendência em aberto" e "a lançar no GESUAS", e o filtro "Qualquer situação" mostra só os casos com uma ou outra. "Aceitou o atendimento" passa o caso para Em acompanhamento; "Não quis" deixa inativo; tentativas sem retorno aparecem na lista ("Tentar de novo · 2").
  5. **Acompanhamento ou encerramento:** os atendimentos do acompanhamento são registrados como contatos ("Atendimento realizado"). "Encerrar acompanhamento" marca como inativo, reencaminhado ou arquivado (fica na linha do tempo, e "Reabrir" volta para A fazer). Contatos do CRM levam a assinatura "CRM".

  As técnicas do CRM são só as da coluna `tecnicas_crm` da aba Listas (separadas das do CREAS); casos antigos com outra técnica continuam com ela e aparecem no filtro.

  A lista separa **A fazer** (o mais antigo primeiro), **Em acompanhamento**, **Encerrados** e **Todos**, com busca por nome, processo, CPF ou telefone, filtro por técnica e download em .csv. No menu do CRM, Casos mostra quantos estão em A fazer, com Em acompanhamento e Encerrados logo abaixo.

  **Casos da planilha antiga:** enquanto nada tiver vindo dela, o fim da lista oferece "trazer da planilha antiga". Cole o link da planilha Controle (salva como Planilhas Google) e o sistema traz a aba "Casos CRM": status, entrada, origem (Demandas), situação, nome, técnica e bairro; idade, trabalho, composição familiar, encaminhamento e CadÚnico vão para Observações, e a data do último atendimento vira um contato. Linhas sem nome ficam de fora. Só roda uma vez.

## Quem acessa

O sistema tem duas partes: o **CREAS** (entrada, triagem, avaliação, repasse, registros, GESUAS e indicadores) e o **CRM**, Centro de Referência da Mulher. Quem usa cada parte é escolhido na aba **Config** da planilha base, pelas linhas em que o e-mail está (vários e-mails na mesma linha, separados por vírgula):

| Linha da Config | Acesso | Assinatura |
|---|---|---|
| `emails_coordenacao` | CREAS | Coordenação |
| `emails_avaliacao` | CREAS (o mesmo acesso da coordenação) | Avaliação social |
| `emails_crm` | CRM | CRM |

- E-mail numa linha do CREAS **e** em `emails_crm`: usa os dois e troca no pé do menu ("Sistema", acima da identificação). O sistema abre na última parte usada.
- E-mail só em `emails_crm`: vê só o CRM. Os casos do CREAS não chegam ao navegador dessa pessoa.
- E-mail só numa linha do CREAS: vê só o CREAS.

A linha `emails_crm` aparece sozinha na Config na primeira abertura depois da atualização, vazia: até alguém ser incluído nela, ninguém vê o CRM.

O site roda com a conta Google de quem acessa. Por isso, só entra quem tem acesso à planilha base e está listado na aba Config.

## Instalação

1. No Google Drive, crie uma planilha nova chamada **Controle de Demandas CREAS – Base**.
2. Na planilha, abra **Extensões > Apps Script**.
3. No editor ficam só dois arquivos, que estão prontos na pasta `publicar/`:
   - o arquivo de **script** `Codigo` (sem a extensão `.gs`): apague o conteúdo do `Código.gs` que o editor cria, ou renomeie-o, e cole o de `publicar/Codigo.gs`;
   - o arquivo **HTML** `Index`: crie e cole o de `publicar/Index.html`.
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

1. Abra `publicar/Codigo.gs` no GitHub, copie tudo (botão **Copy raw file**), e no editor do Apps Script selecione todo o conteúdo de `Codigo` (Ctrl+A) e cole por cima.
2. Faça o mesmo com `publicar/Index.html` no arquivo `Index`.
3. Salve e abra **Implantar > Gerenciar implantações**, edite a implantação e escolha **Nova versão**. A URL continua a mesma.

**Uma vez só, ao passar dos 7 arquivos para os 2:** no editor, apague `Code`, `Dados`, `Util`, `Migracao`, `Estilo` e `App` (menu ⋮ ao lado de cada um > Excluir) e crie `Codigo` com o conteúdo de `publicar/Codigo.gs`. `Index` continua com o mesmo nome; só cole o conteúdo novo. Se sobrar algum arquivo antigo, o Apps Script acusa função repetida ao salvar ou abrir. Dados, planilha e URL não mudam.

### Verificar a base (sinais de dado perdido)

No menu, **Outros > Verificar a base** (ou, no editor do Apps Script, a função `auditarBase`, com o resultado no Registro de execução). Só lê a planilha, não muda nada, e aponta:

- número de caso repetido, linha sem número e caso sem nenhuma vítima;
- pessoa, registro, discussão ou histórico ligados a um caso que não existe;
- registro sem texto, sem data ou com id repetido, e atendimento do GESUAS importado duas vezes;
- CPF com 9 ou 10 dígitos (provável zero da frente perdido), texto que a planilha transformou em data ("01/2023") ou em fórmula com erro (texto que começava com "-", "+" ou "=");
- data guardada como texto (fica fora dos prazos e dos indicadores);
- caso em acompanhamento sem técnica, sem início ou com técnica fora da lista (ex.: "Avaliação", vindo da planilha antiga), encerrado sem desfecho e prioridade fora de 1 a 3;
- aba com colunas mexidas à mão.

**Proteções da gravação:**
- o sistema lê e grava cada coluna pela posição. Se alguém inserir, apagar ou trocar uma coluna de lugar na planilha, ele para com um aviso em vez de gravar na coluna errada; renomear o título de uma coluna não atrapalha. Desfaça a mudança em **Arquivo > Histórico de versões**;
- cada linha nova recebe o formato da coluna antes do valor (texto continua texto, data continua data), e a aba cresce sozinha quando passa do tamanho dela;
- o número do caso é calculado dentro da trava, relendo a planilha, e nunca repete um número que já existe;
- ao editar as vítimas, as novas são gravadas antes de apagar as antigas;
- a lista nova do GESUAS é gravada por cima da anterior antes de limpar a sobra.

Quem preferir a linha de comando pode usar o [clasp](https://github.com/google/clasp) (`clasp clone <scriptId>` e `clasp push`) com a pasta `publicar/` como `rootDir` (copie para ela o `src/appsscript.json`).

## Estrutura

O código é escrito e revisado em `src/`, separado por assunto. `publicar/` tem os dois arquivos que vão para o Apps Script, montados a partir de `src/` com `node tools/montar.js`; quem muda `src/` roda o script e faz o commit dos dois juntos. Uma verificação no GitHub (Actions) falha quando `publicar/` não bate com `src/`.

```
publicar/
  Codigo.gs         Util + Dados + Code + Crm + Migracao, num arquivo só
  Index.html        página com o estilo e o código da tela dentro
tools/
  montar.js         monta publicar/ a partir de src/
src/
  appsscript.json   manifesto (fuso, publicação como web app)
  Code.gs           web app, instalação, perfis, funções chamadas pelo navegador (api_*) e verificação da base
  Dados.gs          leitura e gravação das abas (cada aba é uma tabela)
  Util.gs           normalização de nomes, datas e remetentes
  Crm.gs            CRM: casos do Fórum, contatos e a importação da aba "Casos CRM" da planilha antiga
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
| GESUAS | Último relatório "Famílias Acompanhadas por Técnico" importado, com CPF, NIS, bairro e endereço tirados dos atendimentos |
| Atendimentos | Atendimentos importados do relatório "Famílias Atendidas por Técnico" (técnico, responsável, CPF/NIS, bairro e data) |
| CRM | Casos do CRM: entrada, processo e chave, dados da mulher, origem, técnica, situação (em espera, em acompanhamento, reencaminhado, inativo, arquivado), cadastro no GESUAS. Nasce na primeira gravação |
| CRM_Contatos | Tentativas de contato e atendimentos de cada caso do CRM (data, meio, resultado, anotação, quem registrou, pendência e quando foi resolvida, quando foi lançado no GESUAS) |
| Listas | Remetentes, tipos de documento, técnicas do CREAS, bairros, tipos de registro e técnicas do CRM (coluna `tecnicas_crm`, que nasce com Lise, Carina e Simone). Edite aqui para mudar as opções do site |
| Config | E-mails de acesso, numeração dos casos, dados da última importação do GESUAS e os dias de cada aviso do Painel (`alerta_dias_...`) |

## Privacidade

Os dados das famílias ficam só na planilha base, no Google Drive de quem a criou. Este repositório contém apenas o código, sem nenhum dado de pessoas. O PDF do GESUAS é lido no navegador, e só a lista de famílias extraída dele é gravada na planilha. A lista baixada em .csv tem dados pessoais: guarde e apague com o mesmo cuidado da planilha.
