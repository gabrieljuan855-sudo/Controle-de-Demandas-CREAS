# Controle de Demandas CREAS

Sistema web (Google Apps Script) para registrar os encaminhamentos recebidos pelo CREAS Taquara/RS, conduzir a avaliação social e acompanhar o repasse dos casos às técnicas. Substitui a planilha "Casos em Avaliação Social e Repassados para acompanhamento".

**Fluxo de um caso:** Entrada → Triagem → Avaliação social → Desfecho → Acompanhamento → Desligamento. Cada família tem um registro único. Os dados digitados na entrada seguem para a ficha de avaliação e para o acompanhamento sem ser digitados de novo.

## O que o sistema faz

- **Novo encaminhamento** (coordenação). Remetente, documento e prazo vêm de listas. O sistema avisa quando a família já tem registro.
- **Ficha de avaliação digital.** Tem os mesmos itens do diagnóstico da ficha em papel, além dos registros de atendimento com data. O desfecho é escolhido entre as opções prontas:
  - indicar acompanhamento;
  - contrarreferenciar ao CRAS;
  - não confirmado;
  - não localizado;
  - outro serviço;
  - arquivar.
- **Repasse.** A coordenação escolhe a técnica e a complexidade. As discussões de caso ficam registradas por data.
- **Conferência com o GESUAS.** Você importa o PDF do relatório "Famílias Acompanhadas por Técnico". O sistema aponta, por técnica:
  - famílias repassadas e ainda não cadastradas no GESUAS;
  - famílias que no GESUAS estão com outra técnica;
  - famílias com PAF em branco.

  Um botão copia a mensagem pronta para cada técnica.
- **Painel de pendências.** Mostra prazos de ofício, casos aguardando triagem ou repasse, avaliações paradas e pendências do GESUAS.
- **Indicadores.** Entradas por mês, por remetente e por tipo de violação, e o tempo médio da avaliação.

## Quem acessa

Há dois perfis, definidos por e-mail na aba **Config** da planilha base:

| Perfil | O que vê e faz |
|---|---|
| Coordenação (`emails_coordenacao`) | Tudo: entrada, triagem, avaliação, repasse, GESUAS e indicadores. |
| Avaliação social (`emails_avaliacao`) | A fila de avaliação e os casos que passaram por ela: ficha, registros e desfecho. |

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
| Registros | Evoluções com data (visitas, atendimentos, contatos) |
| Discussoes | Planos definidos nas discussões de caso |
| Historico | Registro automático de cada mudança (quem e quando) |
| GESUAS | Último relatório "Famílias Acompanhadas por Técnico" importado |
| Listas | Remetentes, tipos de documento, técnicas, bairros e tipos de registro. Edite aqui para mudar as opções do site |
| Config | E-mails de acesso, numeração dos casos e dados da última importação do GESUAS |

## Privacidade

Os dados das famílias ficam só na planilha base, no Google Drive de quem a criou. Este repositório contém apenas o código, sem nenhum dado de pessoas. O PDF do GESUAS é lido no navegador, e só a lista de famílias extraída dele é gravada na planilha.
