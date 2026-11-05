/* Gerado por tools/montar.js a partir da pasta src/. Não edite aqui: edite src/ e rode o script de novo. */

/* ======================= Util.gs ======================= */

/**
 * Funções utilitárias sem dependência do Google (testáveis fora do Apps Script).
 */

var FUSO = 'America/Sao_Paulo';

/** Remove acentos, passa para maiúsculas e normaliza espaços. */
function normalizar(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

var PARTICULAS = { DE: 1, DA: 1, DO: 1, DOS: 1, DAS: 1, E: 1 };

/** Palavras significativas de um nome (sem "de", "da", "dos"...). */
function tokensNome(s) {
  return normalizar(s).replace(/[^A-Z ]/g, ' ').split(' ')
    .filter(function (t) { return t && !PARTICULAS[t]; });
}

/**
 * Compara dois nomes de pessoa tolerando nomes incompletos.
 * Exige o mesmo primeiro nome e pelo menos 2 palavras em comum
 * (ou todas as palavras do nome mais curto, até 3).
 */
function mesmoNome(a, b) {
  var A = tokensNome(a), B = tokensNome(b);
  if (A.length < 2 || B.length < 2 || A[0] !== B[0]) return false;
  var sa = {}, sb = {};
  A.forEach(function (t) { sa[t] = 1; });
  B.forEach(function (t) { sb[t] = 1; });
  var ka = Object.keys(sa), kb = Object.keys(sb);
  var menor = ka.length <= kb.length ? ka : kb;
  var maior = ka.length <= kb.length ? sb : sa;
  var comuns = menor.filter(function (t) { return maior[t]; }).length;
  return comuns >= 2 && comuns >= Math.min(menor.length, 3);
}

function primeiroNome(s) {
  return tokensNome(s)[0] || '';
}

/** "SOLANGE APARECIDA DE ALMEIDA" -> "Solange Aparecida de Almeida" */
function tituloNome(s) {
  return String(s || '').toLowerCase()
    .replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); })
    .replace(/\b(De|Da|Do|Dos|Das|E)\b/g, function (m) { return m.toLowerCase(); });
}

function pad(n, t) { n = String(n); while (n.length < t) n = '0' + n; return n; }

/** Date -> 'yyyy-MM-dd' (data local, sem hora). */
function dataIso(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
}

/** 'yyyy-MM-dd' -> Date (meia-noite local). */
function isoParaData(s) {
  if (!s) return '';
  if (s instanceof Date) return s;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

/** Primeira data dd/mm/aaaa (ou dd/mm/aa) encontrada num texto. */
function extrairDataBr(s) {
  var m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return '';
  var a = +m[3]; if (a < 100) a += 2000;
  var d = new Date(a, +m[2] - 1, +m[1]);
  if (d.getMonth() !== +m[2] - 1) return '';
  return d;
}

/** Divide "Fulana, Beltrano e Sicrano" em nomes. */
function dividirNomes(s) {
  return String(s || '')
    .split(/,|;|\n|\/|\s+e\s+/i)
    .map(function (x) { return x.replace(/\s+/g, ' ').trim(); })
    .filter(function (x) { return x.length > 2; });
}

/** Padroniza o remetente em categorias fixas; devolve {categoria, detalhe}. */
function padronizarRemetente(s) {
  var t = normalizar(s);
  var regras = [
    [/\bCT\b|CONSELHO TUTELAR/, 'Conselho Tutelar'],
    [/DISQUE/, 'Disque 100'],
    [/MINISTERIO PUBLICO|\bMP\b|PROMOTORIA/, 'Ministério Público'],
    [/JUDICI|\bVARA\b|AUDIENCIA|FORUM|DEFENSORIA|TRIBUNAL/, 'Poder Judiciário'],
    [/DELEGACIA|BOLETIM|POLICIA/, 'Delegacia de Polícia'],
    [/\bCRAS\b|\bCAS\b|REFERENCIAMENTO/, 'CRAS (referenciamento)'],
    [/\bUBS\b|\bESF\b|\bEFS\b|SAUDE/, 'UBS/ESF'],
    [/HOSPITAL/, 'Hospital'],
    [/\bCAPS\b/, 'CAPS'],
    [/ESCOLA|EMEF|EEEF|EMEI|COLEGIO|FICAI|CEAP/, 'Escola / FICAI'],
    [/ESPONTANEA/, 'Demanda espontânea'],
    [/DENUNCIA/, 'Denúncia'],
    [/CREAS|FAMILIA ACOLHEDORA|\bCRM\b|VIGILANCIA|BUSCA ATIVA|PROCURADORIA|MICRO ?REDE|CADASTRO UNICO|CONSELHO DO IDOSO/, 'Rede socioassistencial / Prefeitura']
  ];
  for (var i = 0; i < regras.length; i++) {
    if (regras[i][0].test(t)) return { categoria: regras[i][1], detalhe: String(s || '').trim() };
  }
  return { categoria: t ? 'Outro' : '', detalhe: String(s || '').trim() };
}

/** Deduz o tipo de documento a partir do número/descrição informados. */
function tipoDocumento(s) {
  var t = normalizar(s);
  if (!t) return 'Sem documento';
  if (/REQUISI/.test(t)) return 'Requisição';
  if (/MEMORANDO/.test(t)) return 'Memorando';
  if (/E ?MAIL/.test(t)) return 'E-mail';
  if (/RELATORIO/.test(t)) return 'Relatório';
  if (/SISTEMA|PROTOCOLO/.test(t)) return 'Sistema';
  if (/NOTICIA/.test(t)) return 'Notícia de Fato';
  return 'Ofício';
}

/* ======================= Dados.gs ======================= */

/**
 * Camada de dados: cada aba da planilha base funciona como uma tabela.
 * A linha 1 de cada aba guarda os nomes das colunas.
 */

var ESQUEMA = {
  Casos: ['id', 'criado_em', 'criado_por', 'responsavel', 'cpf', 'endereco', 'bairro', 'contato',
    'remetente', 'remetente_detalhe', 'doc_tipo', 'doc_num', 'recebido', 'prazo', 'prazo_respondido',
    'descricao', 'prioridade', 'etapa', 'passou_avaliacao', 'diagnostico',
    'desfecho', 'desfecho_data', 'desfecho_obs', 'tecnica', 'inicio_acomp', 'complexidade',
    'desligamento', 'origem', 'atualizado_em', 'gesuas_vinculo', 'gesuas_rejeitados', 'violacao_outra',
    'gesuas_visto'],
  Pessoas: ['caso_id', 'nome', 'nascimento', 'sexo'],
  Registros: ['id', 'caso_id', 'data', 'tipo', 'texto', 'autor', 'criado_em', 'criado_por', 'editado_em', 'editado_por', 'gesuas_em', 'gesuas_por', 'pendencias', 'pendencia_ok', 'pendencia_ok_por'],
  Discussoes: ['id', 'caso_id', 'data', 'texto', 'criado_em', 'criado_por'],
  Historico: ['data_hora', 'usuario', 'caso_id', 'acao'],
  GESUAS: ['tecnico', 'responsavel', 'inicio', 'servico', 'paf', 'cpf', 'nis', 'bairro', 'endereco'],
  Atendimentos: ['chave', 'tecnico', 'responsavel', 'cpf', 'nis', 'bairro', 'data'],
  CRM: ['id', 'criado_em', 'criado_por', 'fonte', 'entrada', 'processo', 'chave', 'origem', 'situacao', 'nome', 'nascimento', 'cpf', 'telefone',
    'endereco', 'bairro', 'tecnica', 'status', 'status_data', 'gesuas', 'caso_id', 'obs', 'atualizado_em'],
  CRM_Contatos: ['id', 'crm_id', 'data', 'meio', 'resultado', 'texto', 'autor', 'criado_em', 'criado_por'],
  Listas: ['remetentes', 'tipos_documento', 'tecnicas', 'bairros', 'tipos_registro'],
  Config: ['chave', 'valor', 'observacao']
};

/** Colunas guardadas como data (no navegador viram 'aaaa-mm-dd'). */
var COLUNAS_DATA = {
  recebido: 1, prazo: 1, desfecho_data: 1, inicio_acomp: 1, desligamento: 1,
  nascimento: 1, data: 1, entrada: 1, status_data: 1
};
/** Colunas com data e hora gravadas pelo sistema. As demais são texto. */
var COLUNAS_CARIMBO = { criado_em: 1, atualizado_em: 1, data_hora: 1 };

/** Formato de cada coluna: sem o formato de texto, a planilha interpreta o que é gravado como se alguém
 *  digitasse (CPF perde o zero da frente, "01/2023" vira data, "- item" e "+55..." viram fórmula com erro). */
function formatoColuna(c) {
  return COLUNAS_DATA[c] ? 'dd/mm/yyyy' : COLUNAS_CARIMBO[c] ? 'dd/mm/yyyy hh:mm:ss' : '@';
}

function planilhaBase() {
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa) return ativa;
  var id = PropertiesService.getScriptProperties().getProperty('BASE_ID');
  if (!id) throw new Error('Planilha base não configurada. Rode a função configurar().');
  return SpreadsheetApp.openById(id);
}

/* cada chamada ao servidor é uma execução nova: abas e Config lidas uma vez valem até o fim dela */
var ABAS_CACHE = {}, CONFIG_CACHE = null;

function aba(nome) {
  if (ABAS_CACHE[nome]) return ABAS_CACHE[nome];
  var sh = planilhaBase().getSheetByName(nome);
  var cols = ESQUEMA[nome];
  if (!sh && cols) sh = planilhaBase().insertSheet(nome);  // abas novas do ESQUEMA nascem sozinhas
  if (!sh) throw new Error('Aba "' + nome + '" não encontrada. Rode a função configurar().');
  if (cols) {
    var ult = sh.getLastColumn();
    // o sistema lê e grava cada coluna pela posição: com coluna inserida, apagada ou trocada de lugar à mão,
    // gravaria na coluna errada. Nesse caso para e avisa, sem gravar nada.
    var prob = problemasCabecalho(nome, ult ? sh.getRange(1, 1, 1, ult).getValues()[0] : []);
    if (prob.length) throw new Error('A aba "' + nome + '" da planilha foi alterada à mão: ' + prob.join('; ') +
      '. Para não gravar dados na coluna errada, o sistema não usa essa aba até ela voltar como era. ' +
      'Desfaça a mudança na planilha (Arquivo > Histórico de versões) e recarregue a página.');
    // colunas novas do ESQUEMA entram sozinhas em planilhas criadas antes delas
    if (ult < cols.length) {
      garantirTamanho(sh, 2, cols.length);
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
      formatarColunas(sh, cols, ult);
    }
  }
  ABAS_CACHE[nome] = sh;
  return sh;
}

/** Problemas no cabeçalho de uma aba: coluna do ESQUEMA que está em outra posição, ou nome de outra coluna
 *  no lugar dela. Cabeçalho só renomeado (sem nome de coluna do sistema no lugar errado) não é problema. */
function problemasCabecalho(nome, cab) {
  var cols = ESQUEMA[nome], pos = {}, out = [];
  cab.forEach(function (x, j) { var k = String(x).trim(); if (k && !(k in pos)) pos[k] = j; });
  cols.forEach(function (c, j) {
    var achado = String(cab[j] === undefined ? '' : cab[j]).trim();
    if (achado === c) return;
    if (c in pos) out.push('a coluna "' + c + '" está em ' + letraColuna(pos[c]) + ', e deveria estar em ' + letraColuna(j));
    else if (achado && cols.indexOf(achado) >= 0) out.push('em ' + letraColuna(j) + ' está "' + achado + '", e deveria estar "' + c + '"');
  });
  return out;
}

/** 0 -> A, 25 -> Z, 26 -> AA */
function letraColuna(j) {
  var s = ''; j++;
  while (j > 0) { var r = (j - 1) % 26; s = String.fromCharCode(65 + r) + s; j = Math.floor((j - 1) / 26); }
  return s;
}

/** A planilha não grava fora do tamanho da aba: aumenta linhas e colunas antes. */
function garantirTamanho(sh, linhas, colunas) {
  if (sh.getMaxRows() < linhas) sh.insertRowsAfter(sh.getMaxRows(), linhas - sh.getMaxRows());
  if (sh.getMaxColumns() < colunas) sh.insertColumnsAfter(sh.getMaxColumns(), colunas - sh.getMaxColumns());
}

/** Texto puro nas colunas que não são data (CPF e NIS não podem perder o zero da frente). */
function formatarColunas(sh, cols, desde) {
  for (var j = desde; j < cols.length; j++) {
    var c = cols[j], r = sh.getRange(2, j + 1, Math.max(sh.getMaxRows() - 1, 1), 1);
    if (!COLUNAS_CARIMBO[c]) r.setNumberFormat(formatoColuna(c));
  }
}

/** Grava linhas a partir de "ini": a aba cresce se precisar, e cada célula recebe o formato da coluna antes
 *  do valor. Assim as linhas além das formatadas na instalação também guardam o texto como foi digitado. */
function gravarBloco(sh, nome, ini, linhas) {
  var n = ESQUEMA[nome].length, f = ESQUEMA[nome].map(formatoColuna);
  garantirTamanho(sh, ini + linhas.length - 1, n);
  sh.getRange(ini, 1, linhas.length, n).setNumberFormats(linhas.map(function () { return f; })).setValues(linhas);
}

/** Lê uma aba inteira como lista de objetos. Cada objeto recebe _linha (número da linha). */
function lerTabela(nome) {
  var sh = aba(nome);
  var ult = sh.getLastRow();
  if (ult < 2) return [];
  var cols = ESQUEMA[nome];
  var valores = sh.getRange(2, 1, ult - 1, cols.length).getValues();
  var out = [];
  for (var i = 0; i < valores.length; i++) {
    var v = valores[i];
    if (v.every(function (x) { return x === '' || x === null; })) continue;
    var o = { _linha: i + 2 };
    for (var j = 0; j < cols.length; j++) o[cols[j]] = v[j];
    out.push(o);
  }
  return out;
}

function objetoParaLinha(nome, obj) {
  return ESQUEMA[nome].map(function (c) {
    var v = obj[c];
    if (v === undefined || v === null) return '';
    if (COLUNAS_DATA[c] && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return isoParaData(v);
    if (Array.isArray(v)) return v.join(',');
    // texto que a planilha já tinha transformado em data (ex.: ofício "01/2023") volta como texto legível
    if (v instanceof Date && !COLUNAS_DATA[c] && !COLUNAS_CARIMBO[c]) return Utilities.formatDate(v, FUSO, 'dd/MM/yyyy');
    return v;
  });
}

function inserirLinhas(nome, objetos) {
  if (!objetos.length) return;
  var sh = aba(nome);
  gravarBloco(sh, nome, sh.getLastRow() + 1, objetos.map(function (o) { return objetoParaLinha(nome, o); }));
}

/** Troca o conteúdo da aba pela lista nova: grava por cima e só depois limpa o que sobrou da anterior.
 *  Se a gravação falhar no meio, a aba não fica vazia. */
function substituirLinhas(nome, objetos) {
  var sh = aba(nome), n = ESQUEMA[nome].length, antes = sh.getLastRow();
  if (objetos.length) gravarBloco(sh, nome, 2, objetos.map(function (o) { return objetoParaLinha(nome, o); }));
  var fim = objetos.length + 1;
  if (antes > fim) sh.getRange(fim + 1, 1, antes - fim, n).clearContent();
}

/** Grava várias linhas já lidas (com _linha) em uma leitura e uma escrita, em vez de uma por linha. */
function atualizarLinhas(nome, objs) {
  if (!objs.length) return;
  var sh = aba(nome), n = ESQUEMA[nome].length;
  var ls = objs.map(function (o) { return o._linha; });
  var ini = Math.min.apply(null, ls), fim = Math.max.apply(null, ls);
  var cols = ESQUEMA[nome];
  // as linhas do meio voltam como estavam (texto que tinha virado data volta como texto legível)
  var vals = sh.getRange(ini, 1, fim - ini + 1, n).getValues().map(function (l) {
    var o = {}; cols.forEach(function (c, j) { o[c] = l[j]; }); return objetoParaLinha(nome, o); });
  objs.forEach(function (o) { vals[o._linha - ini] = objetoParaLinha(nome, o); });
  gravarBloco(sh, nome, ini, vals);
}

function atualizarLinha(nome, linha, obj) {
  gravarBloco(aba(nome), nome, linha, [objetoParaLinha(nome, obj)]);
}

/** Converte um objeto lido da planilha para o formato enviado ao navegador. */
function paraCliente(o) {
  var r = {};
  Object.keys(o).forEach(function (k) {
    if (k === '_linha') return;
    var v = o[k];
    if (v instanceof Date) r[k] = COLUNAS_DATA[k] ? dataIso(v) : Utilities.formatDate(v, FUSO, "yyyy-MM-dd'T'HH:mm:ss");
    else r[k] = v;
  });
  return r;
}

/* ---------- Config ---------- */

function lerConfig() {
  if (CONFIG_CACHE) return CONFIG_CACHE;
  var c = {};
  lerTabela('Config').forEach(function (l) { c[String(l.chave).trim()] = l.valor; });
  return CONFIG_CACHE = c;
}

function gravarConfig(chave, valor, observacao) {
  CONFIG_CACHE = null;
  var linhas = lerTabela('Config');
  for (var i = 0; i < linhas.length; i++) {
    if (String(linhas[i].chave).trim() === chave) {
      linhas[i].valor = valor;
      if (observacao !== undefined) linhas[i].observacao = observacao;
      atualizarLinha('Config', linhas[i]._linha, linhas[i]);
      return;
    }
  }
  inserirLinhas('Config', [{ chave: chave, valor: valor, observacao: observacao || '' }]);
}

/**
 * Próximo número de caso do ano: 2026-001, 2026-002...
 * Roda dentro da trava e relê a Config: a leitura do começo da execução pode ser de antes de outra pessoa
 * cadastrar um caso, e dois casos com o mesmo número misturariam registros e pessoas. Por segurança, pula
 * também número que já esteja na aba Casos.
 */
function proximoIdCaso(ano) {
  CONFIG_CACHE = null;
  var chave = 'sequencia_' + ano;
  var atual = Number(lerConfig()[chave] || 0), usados = {}, id;
  lerTabela('Casos').forEach(function (c) { usados[String(c.id).trim()] = 1; });
  do { atual++; id = ano + '-' + pad(atual, 3); } while (usados[id]);
  gravarConfig(chave, atual, 'Último número de caso usado em ' + ano);
  return id;
}

function proximoIdSimples(prefixo) {
  return prefixo + '-' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

/* ---------- Listas ---------- */

function lerListas() {
  var sh = aba('Listas');
  var ult = sh.getLastRow();
  var cols = ESQUEMA.Listas;
  var r = {};
  cols.forEach(function (c) { r[c] = []; });
  if (ult < 2) return r;
  var v = sh.getRange(2, 1, ult - 1, cols.length).getValues();
  v.forEach(function (linha) {
    linha.forEach(function (x, j) { if (String(x).trim()) r[cols[j]].push(String(x).trim()); });
  });
  return r;
}

/* ======================= Code.gs ======================= */

/**
 * Controle de Demandas CREAS — web app (Google Apps Script)
 *
 * Primeira instalação: rode configurar() uma vez pelo editor e preencha
 * os e-mails na aba Config. Depois publique em Implantar > Nova implantação > App da Web.
 */

function doGet() {
  var t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('Controle de Demandas CREAS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/* ---------- instalação ---------- */

var LISTAS_PADRAO = {
  remetentes: ['Conselho Tutelar', 'CRAS (referenciamento)', 'Ministério Público', 'Poder Judiciário', 'Disque 100',
    'Delegacia de Polícia', 'UBS/ESF', 'Hospital', 'CAPS', 'Escola / FICAI', 'Demanda espontânea', 'Denúncia',
    'Rede socioassistencial / Prefeitura', 'Outro'],
  tipos_documento: ['Ofício', 'Requisição', 'Memorando', 'Notícia de Fato', 'E-mail', 'Relatório', 'Sistema', 'Sem documento'],
  tecnicas: ['Alexandra', 'Aline', 'Brenda', 'Liana', 'Mirelle', 'Simone', 'Solange'],
  bairros: [],
  tipos_registro: ['Atendimento', 'VD', 'Tentativa de VD', 'Contato telefônico / WhatsApp', 'Articulação com a rede', 'Ofício enviado', 'Outro']
};

/** Cria as abas que faltarem. Pode ser rodada de novo sem apagar dados. */
function configurar() {
  var ss = planilhaBase();
  PropertiesService.getScriptProperties().setProperty('BASE_ID', ss.getId());
  Object.keys(ESQUEMA).forEach(function (nome) {
    var sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome);
    var cols = ESQUEMA[nome];
    // com colunas mexidas à mão, reescrever o cabeçalho esconderia que os dados estão fora do lugar
    var ult = sh.getLastColumn(), prob = problemasCabecalho(nome, ult ? sh.getRange(1, 1, 1, ult).getValues()[0] : []);
    if (prob.length) throw new Error('A aba "' + nome + '" foi alterada à mão: ' + prob.join('; ') + '. Corrija antes de rodar configurar().');
    // planilha nova nasce com 26 colunas; a aba Casos tem mais que isso
    garantirTamanho(sh, 2, cols.length);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e8eeed');
    sh.setFrozenRows(1);
    // colunas de texto não podem virar data sozinhas (ex.: ofício "01/2023")
    cols.forEach(function (c, j) {
      if (!COLUNAS_DATA[c] && c !== 'criado_em' && c !== 'atualizado_em' && c !== 'data_hora') {
        sh.getRange(2, j + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
      } else if (COLUNAS_DATA[c]) {
        sh.getRange(2, j + 1, sh.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy');
      }
    });
  });
  // listas padrão (só se a aba estiver vazia)
  var listas = aba('Listas');
  if (listas.getLastRow() < 2) {
    var cols = ESQUEMA.Listas;
    var max = Math.max.apply(null, cols.map(function (c) { return LISTAS_PADRAO[c].length; }));
    var linhas = [];
    for (var i = 0; i < max; i++) linhas.push(cols.map(function (c) { return LISTAS_PADRAO[c][i] || ''; }));
    listas.getRange(2, 1, linhas.length, cols.length).setValues(linhas);
  }
  // configurações iniciais
  var cfg = lerConfig();
  var eu = Session.getActiveUser().getEmail();
  if (!('emails_coordenacao' in cfg)) gravarConfig('emails_coordenacao', eu, 'E-mails com acesso de coordenação, separados por vírgula');
  if (!('emails_avaliacao' in cfg)) gravarConfig('emails_avaliacao', '', 'E-mails com acesso da avaliação social, separados por vírgula');
  if (!('planilha_antiga_id' in cfg)) gravarConfig('planilha_antiga_id', '', 'ID da planilha antiga (já convertida para Planilhas Google), usado só na migração');
  completarLimites(cfg);
  var padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);
  return 'Planilha base pronta. Confira os e-mails na aba Config.';
}

/* ---------- acesso ---------- */

function emailAtual() {
  return String(Session.getActiveUser().getEmail() || '').toLowerCase();
}

function listaEmails(s) {
  return String(s || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
}

var PAPEL_CACHE = null, AUTOR_CACHE = null;
/* Um sistema só: coordenação e técnicos da avaliação social têm o mesmo acesso.
   A lista em que o e-mail está muda só a assinatura dos registros (autorAtual). */
function papelAtual() {
  if (PAPEL_CACHE) return PAPEL_CACHE;
  var cfg = lerConfig();
  var e = emailAtual();
  if (!e) throw new Error('Não foi possível identificar sua conta Google. Entre com a conta autorizada e recarregue.');
  if (listaEmails(cfg.emails_coordenacao).indexOf(e) >= 0) { AUTOR_CACHE = 'Coordenação'; return PAPEL_CACHE = 'coordenacao'; }
  if (listaEmails(cfg.emails_avaliacao).indexOf(e) >= 0) { AUTOR_CACHE = 'Avaliação social'; return PAPEL_CACHE = 'coordenacao'; }
  throw new Error('A conta ' + e + ' não tem acesso a este sistema. Peça à coordenação para incluir este e-mail na aba Config da planilha.');
}

function autorAtual() {
  papelAtual();
  return AUTOR_CACHE || emailAtual();
}

function exigir(papeis) {
  var p = papelAtual();
  if (papeis.indexOf(p) < 0) throw new Error('Esta ação é só da coordenação.');
  return p;
}

function sim(v) { return v === true || /^(SIM|TRUE|S|1)$/i.test(String(v).trim()); }

function comTrava(fn) {
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try { return fn(); } finally { trava.releaseLock(); }
}

function registrarHistorico(casoId, acao) {
  inserirLinhas('Historico', [{ data_hora: new Date(), usuario: autorAtual(), caso_id: casoId, acao: acao }]);
}

/* ---------- montagem dos casos ---------- */

/** Violações seguem a lista do GESUAS. Códigos do antigo quadro de papel viram o equivalente (negligência e abandono, todos em um). */
var VIOLACAO_LEGADA = { ng1: 'neg', ng2: 'neg', ng3: 'neg', ng4: 'neg', ca1: 'neg', ca2: 'neg', ca3: 'neg', ca4: 'neg',
  id1: 'neg', pd1: 'neg', pd2: 'neg', sg1: 'neg', sg2: 'neg' };

function normalizarViolacoes(texto) {
  var vistos = {}, out = [];
  String(texto || '').split(',').forEach(function (k) {
    k = String(k).trim(); k = VIOLACAO_LEGADA[k] || k;
    if (k && !vistos[k]) { vistos[k] = true; out.push(k); }
  });
  return out;
}

function montarCasos(filtroIds) {
  var casos = lerTabela('Casos');
  var pessoas = lerTabela('Pessoas'), regs = lerTabela('Registros'), discs = lerTabela('Discussoes'), hist = lerTabela('Historico');
  var porCaso = function (lista) {
    var m = {};
    lista.forEach(function (x) { var k = String(x.caso_id); (m[k] = m[k] || []).push(paraCliente(x)); });
    return m;
  };
  var mp = porCaso(pessoas), mr = porCaso(regs), md = porCaso(discs), mh = porCaso(hist);
  return casos
    .filter(function (c) { return !filtroIds || filtroIds.indexOf(String(c.id)) >= 0; })
    .map(function (c) {
      var o = paraCliente(c);
      o.id = String(o.id);
      o.prioridade = Number(o.prioridade) || 0;  // 0 = sem prioridade definida (casos criados sem ela)
      o.complexidade = o.complexidade === '' ? '' : Number(o.complexidade);
      o.passou_avaliacao = sim(o.passou_avaliacao);
      o.prazo_respondido = sim(o.prazo_respondido);
      o.diagnostico = normalizarViolacoes(o.diagnostico);
      o.pessoas = mp[o.id] || [];
      o.registros = (mr[o.id] || []).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      o.discussoes = (md[o.id] || []).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      o.historico = mh[o.id] || [];
      return o;
    });
}

function visivelPara(papel, c) {
  return papel === 'coordenacao' || c.passou_avaliacao || c.etapa === 'avaliacao';
}

function buscarCaso(id) {
  var linhas = lerTabela('Casos');
  for (var i = 0; i < linhas.length; i++) if (String(linhas[i].id) === String(id)) return linhas[i];
  throw new Error('Caso ' + id + ' não encontrado.');
}

function salvarCasoLinha(c) {
  c.atualizado_em = new Date();
  atualizarLinha('Casos', c._linha, c);
  return montarCasos([String(c.id)])[0];
}

/* ---------- API chamada pelo navegador ---------- */

function lerGesuas(cfg) {
  return {
    origem: cfg.gesuas_origem || '',
    periodo: cfg.gesuas_periodo || '',
    importado_em: cfg.gesuas_importado_em ? String(cfg.gesuas_importado_em) : '',
    linhas: lerTabela('GESUAS').map(function (g) {
      var o = paraCliente(g);
      o.inicio = g.inicio instanceof Date ? Utilities.formatDate(g.inicio, FUSO, 'dd/MM/yyyy') : String(g.inicio);
      return o;
    })
  };
}

/** Atendimentos do GESUAS em formato compacto: [técnico, responsável, cpf, bairro, data]. */
function lerAtendimentos() {
  return lerTabela('Atendimentos').map(function (a) {
    return [String(a.tecnico), String(a.responsavel), String(a.cpf || ''), String(a.bairro || ''), a.data instanceof Date ? dataIso(a.data) : String(a.data || '')];
  });
}

/** Dias sem movimentação até virar aviso no Painel. Ficam na aba Config: a coordenação muda o número lá. */
var LIMITES_PADRAO = {
  alerta_dias_triagem: [7, 'Dias aguardando triagem sem decisão de destino até virar aviso no Painel'],
  alerta_dias_avaliacao: [30, 'Dias de avaliação social sem registro até virar aviso ("avaliação parada")'],
  alerta_dias_gesuas: [30, 'Dias depois do repasse sem a família aparecer no GESUAS até virar aviso no Painel'],
  alerta_dias_pendencia: [15, 'Dias com pendência de registro em aberto até virar aviso no Painel'],
  alerta_dias_atendimento: [60, 'Dias sem atendimento registrado no GESUAS até virar aviso (Painel, Conferência e Indicadores)']
};

/** {triagem, avaliacao, gesuas, pendencia, atendimento}: o número da Config ou, vazio ou inválido, o padrão. */
function lerLimites(cfg) {
  var o = {};
  Object.keys(LIMITES_PADRAO).forEach(function (k) { var n = Number(cfg[k]); o[k.replace('alerta_dias_', '')] = n > 0 ? n : LIMITES_PADRAO[k][0]; });
  return o;
}

/** Põe na Config as linhas dos limites que ainda não existem (planilhas criadas antes deles). */
function completarLimites(cfg) {
  Object.keys(LIMITES_PADRAO).forEach(function (k) { if (!(k in cfg)) gravarConfig(k, LIMITES_PADRAO[k][0], LIMITES_PADRAO[k][1]); });
}

function api_iniciar() {
  var papel = papelAtual();
  var cfg = lerConfig();
  var casos = montarCasos().filter(function (c) { return visivelPara(papel, c); });
  var ges = papel === 'coordenacao' ? lerGesuas(cfg) : null;
  var atend = papel === 'coordenacao' ? lerAtendimentos() : [];
  // na primeira abertura depois da atualização, as linhas dos limites aparecem na Config para a coordenação ajustar
  if (Object.keys(LIMITES_PADRAO).some(function (k) { return !(k in cfg); })) comTrava(function () { CONFIG_CACHE = null; completarLimites(lerConfig()); });
  return { papel: papel, autor: autorAtual(), email: emailAtual(), hoje: dataIso(new Date()), casos: casos, ges: ges, atend: atend, crm: lerCrm(), listas: lerListas(), limites: lerLimites(cfg), crmConsulta: String(cfg.crm_link_consulta || '') };
}

function api_novoCaso(d) {
  exigir(['coordenacao']);
  return comTrava(function () {
    // a chave vem do navegador: se a resposta se perdeu e a pessoa clicou de novo, devolve o caso já gravado
    var origem = d.chave ? 'sistema:' + String(d.chave) : 'sistema';
    if (d.chave) {
      var ja = lerTabela('Casos').filter(function (c) { return String(c.origem) === origem; })[0];
      if (ja) return montarCasos([String(ja.id)])[0];
    }
    exigirVitima(d.pessoas);
    // direto para acompanhamento não passa pela avaliação: a violação vivenciada é marcada aqui
    var violacoes = d.destino === 'acompanhamento' ? exigirViolacoes(d.diagnostico) : [];
    var outra = exigirOutra(violacoes, d.violacao_outra);
    var receb = isoParaData(d.recebido) || new Date();
    var id = proximoIdCaso(receb.getFullYear());
    var agora = new Date();
    var caso = {
      id: id, criado_em: agora, criado_por: emailAtual(), responsavel: String(d.responsavel || '').trim(), cpf: d.cpf, endereco: d.endereco,
      bairro: d.bairro, contato: d.contato, remetente: d.remetente, remetente_detalhe: d.remetente_detalhe,
      doc_tipo: d.doc_tipo, doc_num: d.doc_num, recebido: receb, prazo: isoParaData(d.prazo), prazo_respondido: '',
      descricao: d.descricao, prioridade: Number(d.prioridade) || 2, etapa: 'triagem', passou_avaliacao: '', diagnostico: '',
      origem: origem, atualizado_em: agora
    };
    if (d.destino === 'avaliacao') { caso.etapa = 'avaliacao'; caso.passou_avaliacao = 'SIM'; }
    if (d.destino === 'acompanhamento') {
      caso.etapa = 'acompanhamento'; caso.tecnica = d.tecnica; caso.complexidade = Number(d.complexidade) || 1;
      caso.diagnostico = violacoes.join(','); caso.violacao_outra = outra;
      caso.inicio_acomp = agora; caso.desfecho = 'Passado para acompanhamento'; caso.desfecho_data = agora;
    }
    inserirLinhas('Casos', [caso]);
    inserirLinhas('Pessoas', (d.pessoas || []).filter(function (p) { return String(p.nome || '').trim(); })
      .map(function (p) { return { caso_id: id, nome: p.nome.trim(), nascimento: isoParaData(p.nascimento), sexo: p.sexo || '' }; }));
    registrarHistorico(id, 'Encaminhamento registrado' + (d.destino === 'avaliacao' ? ' e enviado para avaliação social' :
      d.destino === 'acompanhamento' ? ' e repassado a ' + d.tecnica : ''));
    return montarCasos([id])[0];
  });
}

function exigirVitima(pessoas) {
  var ok = (pessoas || []).some(function (p) { return String(p.nome || '').trim(); });
  if (!ok) throw new Error('Informe o nome de pelo menos uma vítima.');
}

var CAMPOS_EDITAVEIS = ['responsavel', 'cpf', 'endereco', 'bairro', 'contato', 'remetente', 'remetente_detalhe',
  'doc_tipo', 'doc_num', 'recebido', 'prazo', 'descricao', 'prioridade'];

function api_editarCaso(id, campos, pessoas) {
  var papel = papelAtual();
  return comTrava(function () {
    var c = buscarCaso(id);
    if (!visivelPara(papel, paraCliente(c))) throw new Error('Sem acesso a este caso.');
    if (pessoas) exigirVitima(pessoas);
    CAMPOS_EDITAVEIS.forEach(function (k) {
      if (!(k in campos)) return;
      if (k === 'prioridade') c[k] = Number(campos[k]) || '';
      else c[k] = (k === 'recebido' || k === 'prazo') ? isoParaData(campos[k]) : campos[k];
    });
    if (pessoas) {
      var sh = aba('Pessoas');
      var antigas = lerTabela('Pessoas').filter(function (p) { return String(p.caso_id) === String(id); })
        .map(function (p) { return p._linha; }).sort(function (a, b) { return b - a; });
      // grava as pessoas novas antes de apagar as antigas: se algo falhar no meio, ninguém some
      inserirLinhas('Pessoas', pessoas.filter(function (p) { return String(p.nome || '').trim(); })
        .map(function (p) { return { caso_id: id, nome: p.nome.trim(), nascimento: isoParaData(p.nascimento), sexo: p.sexo || '' }; }));
      antigas.forEach(function (l) { sh.deleteRow(l); });
    }
    registrarHistorico(id, 'Dados do caso editados');
    return salvarCasoLinha(c);
  });
}

/** Coordenação decide o destino de um caso em triagem ou aguardando repasse. */
function api_encaminhar(id, destino, tecnica, complexidade, codigos, prioridade, outra) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    if (destino === 'avaliacao') {
      c.etapa = 'avaliacao'; c.passou_avaliacao = 'SIM';
      registrarHistorico(id, 'Enviado para avaliação social');
    } else if (destino === 'acompanhamento') {
      if (!tecnica) throw new Error('Escolha a técnica de referência.');
      // sem violação marcada (caso que não passou pela avaliação), ela vem junto com o repasse
      if (codigos && codigos.length) { var v = exigirViolacaoEPrioridade(codigos, prioridade), qual = exigirOutra(v.codigos, outra);
        c.diagnostico = v.codigos.join(','); c.prioridade = v.prioridade; c.violacao_outra = qual; }
      else if (!normalizarViolacoes(c.diagnostico).length) throw new Error('Marque ao menos uma violação vivenciada.');
      c.etapa = 'acompanhamento'; c.tecnica = tecnica; c.complexidade = Number(complexidade) || 1;
      c.inicio_acomp = new Date(); c.desfecho = 'Passado para acompanhamento'; c.desfecho_data = new Date();
      registrarHistorico(id, 'Repassado para acompanhamento com ' + tecnica);
    } else throw new Error('Destino inválido.');
    return salvarCasoLinha(c);
  });
}

/**
 * Desfecho da avaliação social que não é indicar acompanhamento (arquivar, contrarreferenciar...).
 * Indicar acompanhamento tem função própria: exige violação e prioridade.
 */
function api_desfecho(id, tipo, obs) {
  papelAtual();
  return comTrava(function () {
    if (tipo === 'indicar_acompanhamento') throw new Error('Atualize a página (Ctrl+F5) e indique o acompanhamento de novo.');
    var c = buscarCaso(id);
    c.etapa = 'encerrado'; c.desfecho = tipo; c.desfecho_data = new Date(); c.desfecho_obs = obs || '';
    registrarHistorico(id, 'Desfecho: ' + tipo);
    return salvarCasoLinha(c);
  });
}

/** Códigos de violação válidos e prioridade 1 a 3: sem isso a indicação não é aceita. */
function exigirViolacoes(codigos) {
  var lista = (codigos || []).map(String).filter(Boolean);
  if (!lista.length) throw new Error('Marque ao menos uma violação vivenciada.');
  return lista;
}

/** Com "Outra" marcada, é preciso dizer qual; sem ela, o texto não é guardado. */
function exigirOutra(codigos, outra) {
  if (codigos.indexOf('out') < 0) return '';
  var t = String(outra || '').trim();
  if (!t) throw new Error('Diga qual é a outra violação.');
  return t;
}

function exigirViolacaoEPrioridade(codigos, prioridade) {
  var lista = exigirViolacoes(codigos);
  var p = Number(prioridade);
  if (p !== 1 && p !== 2 && p !== 3) throw new Error('Escolha a prioridade.');
  return { codigos: lista, prioridade: p };
}

/**
 * Quem avaliou indica o acompanhamento: marca a violação vivenciada e a prioridade.
 * O caso fica aguardando a coordenação escolher a técnica (etapa "repasse").
 */
function api_indicarAcompanhamento(id, obs, codigos, prioridade, outra) {
  papelAtual();
  return comTrava(function () {
    var v = exigirViolacaoEPrioridade(codigos, prioridade), qual = exigirOutra(v.codigos, outra);
    var c = buscarCaso(id);
    c.diagnostico = v.codigos.join(','); c.prioridade = v.prioridade; c.violacao_outra = qual;
    c.etapa = 'repasse'; c.desfecho = 'Indicado acompanhamento'; c.desfecho_data = new Date(); c.desfecho_obs = obs || '';
    registrarHistorico(id, 'Avaliação concluída com indicação de acompanhamento');
    return salvarCasoLinha(c);
  });
}

/** Corrige as violações e a prioridade de um caso sem mudar a etapa. */
function api_violacao(id, codigos, prioridade, outra) {
  papelAtual();
  return comTrava(function () {
    var v = exigirViolacaoEPrioridade(codigos, prioridade), qual = exigirOutra(v.codigos, outra);
    var c = buscarCaso(id);
    c.diagnostico = v.codigos.join(','); c.prioridade = v.prioridade; c.violacao_outra = qual;
    registrarHistorico(id, 'Violações e prioridade atualizadas');
    return salvarCasoLinha(c);
  });
}

function jaGravado(nomeAba, idLinha) {
  return lerTabela(nomeAba).some(function (x) { return String(x.id) === String(idLinha); });
}

/** Relê um caso da planilha (usado quando uma gravação da fila é descartada). */
function api_caso(id) {
  var papel = papelAtual();
  var c = montarCasos([String(id)])[0];
  if (!c || !visivelPara(papel, c)) throw new Error('Caso ' + id + ' não encontrado.');
  return c;
}

function api_registro(id, r) {
  var papel = papelAtual();
  return comTrava(function () {
    if (!String(r.texto || '').trim()) throw new Error('Escreva o registro antes de salvar.');
    // o id vem do navegador: um reenvio da fila traz o mesmo id e não grava de novo
    if (r.id && jaGravado('Registros', r.id)) return montarCasos([String(id)])[0];
    inserirLinhas('Registros', [{
      id: r.id || proximoIdSimples('R'), caso_id: id, data: isoParaData(r.data) || new Date(), tipo: r.tipo, texto: r.texto.trim(),
      pendencias: String(r.pendencias || '').trim(), autor: autorAtual(), criado_em: new Date(), criado_por: emailAtual()
    }]);
    return montarCasos([String(id)])[0];
  });
}

/** Registro de um caso, conferindo se quem pede pode mexer nele. */
function registroDoCaso(casoId, regId, soAutor) {
  var papel = papelAtual();
  var c = buscarCaso(casoId);
  if (!c || !visivelPara(papel, c)) throw new Error('Caso ' + casoId + ' não encontrado.');
  var r = lerTabela('Registros').filter(function (x) { return String(x.id) === String(regId) && String(x.caso_id) === String(casoId); })[0];
  if (!r) throw new Error('Registro não encontrado. Recarregue a página.');
  if (soAutor && papel !== 'coordenacao' && String(r.criado_por || '').toLowerCase() !== emailAtual())
    throw new Error('Só quem escreveu o registro ou a coordenação pode editá-lo.');
  return r;
}

function api_editarRegistro(casoId, regId, campos) {
  return comTrava(function () {
    var r = registroDoCaso(casoId, regId, true);
    var texto = String(campos.texto || '').trim();
    if (!texto) throw new Error('O registro não pode ficar vazio.');
    r.data = isoParaData(campos.data) || r.data;
    r.tipo = campos.tipo || r.tipo;
    r.texto = texto;
    if ('pendencias' in campos) r.pendencias = String(campos.pendencias || '').trim();
    r.editado_em = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH:mm');
    r.editado_por = emailAtual();
    atualizarLinha('Registros', r._linha, r);
    registrarHistorico(casoId, 'Registro de ' + Utilities.formatDate(r.data instanceof Date ? r.data : new Date(), FUSO, 'dd/MM/yyyy') + ' editado');
    return montarCasos([String(casoId)])[0];
  });
}

/** Marca (ou desmarca) que o registro já foi lançado no GESUAS. */
function api_registroGesuas(casoId, regId, feito) {
  return comTrava(function () {
    var r = registroDoCaso(casoId, regId, false);
    r.gesuas_em = feito ? Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH:mm') : '';
    r.gesuas_por = feito ? emailAtual() : '';
    atualizarLinha('Registros', r._linha, r);
    return montarCasos([String(casoId)])[0];
  });
}

/** Marca (ou desmarca) que a pendência anotada no registro foi resolvida. */
function api_pendenciaResolvida(casoId, regId, feito) {
  return comTrava(function () {
    var r = registroDoCaso(casoId, regId, false);
    if (!String(r.pendencias || '').trim()) throw new Error('Este registro não tem pendência.');
    r.pendencia_ok = feito ? Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH:mm') : '';
    r.pendencia_ok_por = feito ? emailAtual() : '';
    atualizarLinha('Registros', r._linha, r);
    return montarCasos([String(casoId)])[0];
  });
}

function api_prazoRespondido(id) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    c.prazo_respondido = 'SIM';
    registrarHistorico(id, 'Prazo de resposta marcado como respondido');
    return salvarCasoLinha(c);
  });
}

/** Muda o prazo de resposta (prorrogação, data corrigida) ou o tira (novo vazio). Fica no histórico do caso. */
function api_alterarPrazo(id, novo) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    var br = function (v) {
      var d = v instanceof Date ? v : (isoParaData(v) || extrairDataBr(v));
      return d instanceof Date && !isNaN(d) ? Utilities.formatDate(d, FUSO, 'dd/MM/yyyy') : '';
    };
    var antes = br(c.prazo);
    c.prazo = novo ? isoParaData(novo) : '';
    var depois = br(c.prazo);
    if (antes === depois) return montarCasos([String(id)])[0];
    if (depois) c.prazo_respondido = '';
    registrarHistorico(id, !depois ? 'Prazo de resposta removido (era ' + antes + ')'
      : antes ? 'Prazo de resposta alterado de ' + antes + ' para ' + depois
      : 'Prazo de resposta definido para ' + depois);
    return salvarCasoLinha(c);
  });
}

function api_acompanhamento(id, tecnica, complexidade) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    if (tecnica && tecnica !== c.tecnica) registrarHistorico(id, 'Técnica alterada de ' + c.tecnica + ' para ' + tecnica);
    c.tecnica = tecnica || c.tecnica;
    c.complexidade = Number(complexidade) || c.complexidade;
    return salvarCasoLinha(c);
  });
}

function api_discussao(id, texto, data, idCliente) {
  exigir(['coordenacao']);
  return comTrava(function () {
    if (!String(texto || '').trim()) throw new Error('Escreva o plano definido na discussão.');
    if (idCliente && jaGravado('Discussoes', idCliente)) return montarCasos([String(id)])[0];
    inserirLinhas('Discussoes', [{ id: idCliente || proximoIdSimples('D'), caso_id: id, data: isoParaData(data) || new Date(), texto: texto.trim(), criado_em: new Date(), criado_por: emailAtual() }]);
    return montarCasos([String(id)])[0];
  });
}

function api_desligar(id, motivo, obs) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    c.etapa = 'encerrado'; c.desligamento = new Date();
    c.desfecho = 'Desligado: ' + motivo; c.desfecho_data = new Date(); c.desfecho_obs = obs || '';
    registrarHistorico(id, 'Desligado do acompanhamento: ' + motivo);
    return salvarCasoLinha(c);
  });
}

/**
 * Reabre um caso encerrado. destino 'acompanhamento' desfaz um desligamento (feito por engano ou pela
 * importação do GESUAS): volta com a mesma técnica e a mesma data de início. Sem destino, vai para nova triagem.
 */
function api_reabrir(id, destino) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    if (destino === 'acompanhamento') {
      if (!c.tecnica || !c.inicio_acomp) throw new Error('Este caso não tem técnica e início de acompanhamento para onde voltar.');
      c.etapa = 'acompanhamento'; c.desfecho = 'Passado para acompanhamento'; c.desfecho_data = c.inicio_acomp; c.desfecho_obs = ''; c.desligamento = '';
      registrarHistorico(id, 'Desligamento desfeito: volta ao acompanhamento com ' + c.tecnica);
    } else {
      c.etapa = 'triagem'; c.desfecho = ''; c.desfecho_data = ''; c.desfecho_obs = ''; c.desligamento = '';
      registrarHistorico(id, 'Caso reaberto para nova triagem');
    }
    return salvarCasoLinha(c);
  });
}

/**
 * Conferência manual com o GESUAS.
 * confirmar: nome é a família do GESUAS ("está no GESUAS" sempre escolhe a família, para o sistema perceber quando ela sair);
 * rejeitar: nome não é esta família; desfazer: volta à comparação automática.
 */
function api_vinculoGesuas(id, acao, nome) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    nome = String(nome || '').trim();
    if (acao === 'confirmar' && nome) {
      c.gesuas_vinculo = nome;
      registrarHistorico(id, 'GESUAS: confirmado como a família "' + nome + '"');
    } else if (acao === 'rejeitar' && nome) {
      var rej = String(c.gesuas_rejeitados || '').split('|').filter(Boolean);
      var novos = nome.split('|').filter(Boolean);
      novos.forEach(function (n) { if (rej.indexOf(n) < 0) rej.push(n); });
      c.gesuas_rejeitados = rej.join('|');
      if (novos.indexOf(c.gesuas_vinculo) >= 0) c.gesuas_vinculo = '';
      if (novos.indexOf(c.gesuas_visto) >= 0) c.gesuas_visto = '';
      registrarHistorico(id, novos.length > 1 ? 'GESUAS: nenhuma das famílias sugeridas é esta' : 'GESUAS: "' + nome + '" não é esta família');
    } else if (acao === 'desfazer') {
      c.gesuas_vinculo = '';
      c.gesuas_rejeitados = '';
      c.gesuas_visto = '';
      registrarHistorico(id, 'GESUAS: conferência desfeita, volta à comparação automática');
    } else throw new Error('Ação inválida.');
    return salvarCasoLinha(c);
  });
}

/**
 * Importação dos relatórios do GESUAS lidos no navegador. Cada parte é opcional:
 *  ges:          famílias acompanhadas por técnico (substitui a lista anterior), já com CPF/NIS/bairro/endereço tirados dos atendimentos;
 *  desligar:     casos que saíram do GESUAS desde o relatório anterior;
 *  completar:    [{id, campos}] dados vazios dos casos preenchidos a partir do GESUAS (nunca sobrescreve);
 *  vistos:       [[id, nome]] casos encontrados no GESUAS e o nome da família lá (gesuas_visto): se ela sumir
 *                de um relatório futuro, o caso aparece como "saiu do GESUAS", nunca como "não registrado";
 *  atendimentos: atendimentos por técnico; só entram os que ainda não estão na planilha.
 * O navegador manda os atendimentos em lotes (soAtendimentos) para cada execução ficar curta;
 * a lista completa de atendimentos só volta no último lote (fim).
 */
function api_importarGesuas(p) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var agora = new Date(), tocados = {}, novos = 0, hist = [], mudados = [];
    var autor = autorAtual();
    var anotar = function (id, acao) { hist.push({ data_hora: agora, usuario: autor, caso_id: id, acao: acao }); };
    if (p.ges) {
      // grava por cima da lista anterior e só depois limpa a sobra: uma falha no meio não deixa a aba vazia
      substituirLinhas('GESUAS', (p.ges.linhas || []).map(function (g) {
        return { tecnico: g.tecnico, responsavel: g.responsavel, inicio: String(g.inicio || ''), servico: g.servico, paf: g.paf,
          cpf: g.cpf || '', nis: g.nis || '', bairro: g.bairro || '', endereco: g.endereco || '' };
      }));
      gravarConfig('gesuas_origem', p.ges.origem || '', 'Arquivo do último relatório do GESUAS importado');
      gravarConfig('gesuas_periodo', p.ges.periodo || '', 'Período do último relatório do GESUAS');
      gravarConfig('gesuas_importado_em', Utilities.formatDate(agora, FUSO, 'dd/MM/yyyy HH:mm'), 'Quando o relatório foi importado');
    }
    var desligar = (p.desligar || []).map(String), completar = {}, vistos = {};
    (p.completar || []).forEach(function (x) { completar[String(x.id)] = x.campos || {}; });
    (p.vistos || []).forEach(function (x) { if (x && x[1]) vistos[String(x[0])] = String(x[1]); });
    if (desligar.length || Object.keys(completar).length || Object.keys(vistos).length) {
      lerTabela('Casos').forEach(function (c) {
        var id = String(c.id), mudou = false;
        if (completar[id]) {
          var feitos = [];
          ['responsavel', 'cpf', 'endereco', 'bairro'].forEach(function (k) {
            if (completar[id][k] && !String(c[k] || '').trim()) { c[k] = completar[id][k]; feitos.push(k); }
          });
          if (feitos.length) { mudou = true; anotar(id, 'Dados completados a partir do GESUAS: ' + feitos.join(', ')); }
        }
        if (vistos[id] && String(c.gesuas_visto || '') !== vistos[id]) { c.gesuas_visto = vistos[id]; mudou = true; }
        if (desligar.indexOf(id) >= 0 && c.etapa === 'acompanhamento') {
          c.etapa = 'encerrado'; c.desligamento = agora; c.desfecho = 'Desligado: saiu do GESUAS';
          c.desfecho_data = agora; c.desfecho_obs = 'Não consta no relatório ' + ((p.ges && p.ges.origem) || '') + '.';
          anotar(id, 'Desligado: não consta mais no relatório do GESUAS');
          mudou = true;
        }
        if (mudou) { c.atualizado_em = agora; mudados.push(c); tocados[id] = 1; }
      });
      atualizarLinhas('Casos', mudados);
      if (hist.length) inserirLinhas('Historico', hist);
    }
    if (p.atendimentos && p.atendimentos.length) {
      var ja = {};
      lerTabela('Atendimentos').forEach(function (a) { ja[a.chave] = 1; });
      var entram = p.atendimentos.filter(function (a) { if (ja[a.chave]) return false; ja[a.chave] = 1; return true; });
      inserirLinhas('Atendimentos', entram);
      novos = entram.length;
    }
    var ids = Object.keys(tocados);
    return { ges: p.soAtendimentos ? null : lerGesuas(lerConfig()), casos: ids.length ? montarCasos(ids) : [],
      atend: p.fim ? lerAtendimentos() : null, novos: novos };
  });
}

/* ---------- manutenção: verificação da base ---------- */

/**
 * Procura na planilha sinais de dado perdido ou estragado. Só lê: não muda nada.
 * Rode pelo editor (selecione auditarBase e clique em Executar; o resultado sai no Registro de execução)
 * ou pelo item "Verificar a base" do menu do sistema.
 */
function auditarBase() {
  var ss = planilhaBase(), t = {}, avisos = [];
  Object.keys(ESQUEMA).forEach(function (nome) {
    var sh = ss.getSheetByName(nome);
    if (!sh) { if (!/^CRM/.test(nome)) avisos.push('A aba "' + nome + '" não existe na planilha.'); return; }  // as do CRM nascem no primeiro uso
    var ult = sh.getLastColumn(), prob = problemasCabecalho(nome, ult ? sh.getRange(1, 1, 1, ult).getValues()[0] : []);
    if (prob.length) { avisos.push('A aba "' + nome + '" teve colunas mexidas à mão (' + prob.join('; ') + '). Ela não foi verificada.'); return; }
    t[nome] = lerTabela(nome);
  });
  var tecnicas = t.Listas ? lerListas().tecnicas : [];
  var r = auditarDados(t, tecnicas);
  var texto = [
    'Verificação da base em ' + Utilities.formatDate(new Date(), FUSO, 'dd/MM/yyyy HH:mm'),
    '',
    r.resumo.join('\n'),
    '',
    avisos.concat(r.avisos).length ? avisos.concat(r.avisos).map(function (a) { return '⚠ ' + a; }).join('\n') : '✓ Nenhum sinal de dado perdido ou estragado.'
  ].join('\n');
  Logger.log(texto);
  return texto;
}

function api_auditoria() {
  exigir(['coordenacao']);
  return auditarBase();
}

/**
 * As verificações, sobre as abas já lidas (t.Casos, t.Pessoas...). Aba que não veio (colunas mexidas) é pulada.
 * Devolve {resumo, avisos}; cada aviso traz até 8 exemplos (nº do caso ou linha da planilha).
 */
function auditarDados(t, tecnicas) {
  var avisos = [], resumo = [];
  var exemplos = function (l) { return l.slice(0, 8).join(', ') + (l.length > 8 ? ' e mais ' + (l.length - 8) : ''); };
  var aviso = function (l, txt) { if (l.length) avisos.push(txt + ': ' + l.length + ' (' + exemplos(l) + ')'); };
  var vazio = function (v) { return v === '' || v === null || v === undefined; };
  var dig = function (v) { return String(v === null || v === undefined ? '' : v).replace(/\D/g, ''); };
  var erroFormula = function (v) { return typeof v === 'string' && /^#(ERROR|NAME|VALUE|REF|N\/A|DIV\/0|NUM)/.test(v); };
  var ehData = function (v) { return Object.prototype.toString.call(v) === '[object Date]'; };
  var casos = t.Casos || [], porId = {};

  if (t.Casos) {
    var repetidos = [], semId = [];
    casos.forEach(function (c) {
      var id = String(c.id).trim();
      if (!id) { semId.push('linha ' + c._linha); return; }
      if (porId[id]) repetidos.push(id + ' (linhas ' + porId[id]._linha + ' e ' + c._linha + ')'); else porId[id] = c;
    });
    aviso(repetidos, 'Número de caso repetido (os registros e as pessoas desses casos se misturam)');
    aviso(semId, 'Linha da aba Casos sem número de caso');
    var etapas = { triagem: 1, avaliacao: 1, repasse: 1, acompanhamento: 1, encerrado: 1 }, cont = {};
    casos.forEach(function (c) { cont[c.etapa] = (cont[c.etapa] || 0) + 1; });
    resumo.push('Casos: ' + casos.length + ' (' + Object.keys(cont).map(function (k) { return (k || 'sem etapa') + ' ' + cont[k]; }).join(', ') + ')');
    aviso(casos.filter(function (c) { return !etapas[c.etapa]; }).map(function (c) { return c.id + ' ("' + c.etapa + '")'; }), 'Caso com etapa desconhecida');
    var acomp = casos.filter(function (c) { return c.etapa === 'acompanhamento'; });
    aviso(acomp.filter(function (c) { return vazio(c.tecnica); }).map(function (c) { return c.id; }), 'Caso em acompanhamento sem técnica');
    aviso(acomp.filter(function (c) { return vazio(c.inicio_acomp); }).map(function (c) { return c.id; }), 'Caso em acompanhamento sem data de início');
    var primeiros = {}; (tecnicas || []).forEach(function (x) { primeiros[primeiroNome(x)] = 1; });
    if ((tecnicas || []).length) aviso(acomp.filter(function (c) { return !vazio(c.tecnica) && !primeiros[primeiroNome(c.tecnica)]; }).map(function (c) { return c.id + ' ("' + c.tecnica + '")'; }),
      'Caso em acompanhamento com técnica que não está na lista de técnicas (ex.: "Avaliação", vindo da planilha antiga)');
    aviso(casos.filter(function (c) { return c.etapa === 'encerrado' && vazio(c.desfecho); }).map(function (c) { return c.id; }), 'Caso encerrado sem desfecho');
    aviso(casos.filter(function (c) { return !vazio(c.prioridade) && [1, 2, 3].indexOf(Number(c.prioridade)) < 0; }).map(function (c) { return c.id + ' (' + c.prioridade + ')'; }), 'Prioridade fora de 1, 2 ou 3');
    // datas guardadas como texto e textos que a planilha transformou em data, número ou fórmula
    var comoTexto = [], viraram = [], formula = [];
    casos.forEach(function (c) {
      Object.keys(COLUNAS_DATA).forEach(function (k) { if (k in c && !vazio(c[k]) && !ehData(c[k])) comoTexto.push(c.id + ' (' + k + ': "' + c[k] + '")'); });
      ['cpf', 'contato', 'doc_num', 'responsavel', 'endereco', 'bairro', 'descricao', 'remetente', 'remetente_detalhe'].forEach(function (k) {
        if (ehData(c[k])) viraram.push(c.id + ' (' + k + ')');
        if (erroFormula(c[k])) formula.push(c.id + ' (' + k + ')');
      });
    });
    aviso(comoTexto, 'Data guardada como texto (não entra nos prazos e nos indicadores)');
    aviso(viraram, 'Texto que a planilha transformou em data (ex.: nº do ofício "01/2023")');
    aviso(formula, 'Texto que a planilha transformou em fórmula com erro (começava com "-", "+" ou "=")');
    aviso(casos.filter(function (c) { var n = dig(c.cpf).length; return n === 9 || n === 10 || typeof c.cpf === 'number'; }).map(function (c) { return c.id + ' (' + c.cpf + ')'; }),
      'CPF com 9 ou 10 dígitos ou guardado como número (provável zero da frente perdido)');
  }

  var orfaos = function (nome, rot) {
    if (!t[nome] || !t.Casos) return;
    aviso(t[nome].filter(function (x) { return !porId[String(x.caso_id).trim()]; }).map(function (x) { return 'linha ' + x._linha + (vazio(x.caso_id) ? '' : ' (caso ' + x.caso_id + ')'); }), rot);
  };
  if (t.Pessoas) {
    resumo.push('Pessoas: ' + t.Pessoas.length);
    orfaos('Pessoas', 'Pessoa ligada a um caso que não existe');
    if (t.Casos) {
      var comPessoa = {}; t.Pessoas.forEach(function (p) { if (String(p.nome || '').trim()) comPessoa[String(p.caso_id).trim()] = 1; });
      aviso(casos.filter(function (c) { return String(c.id).trim() && !comPessoa[String(c.id).trim()]; }).map(function (c) { return c.id; }), 'Caso sem nenhuma vítima ou pessoa');
    }
    aviso(t.Pessoas.filter(function (p) { return erroFormula(p.nome); }).map(function (p) { return 'linha ' + p._linha; }), 'Nome de pessoa que virou fórmula com erro');
  }
  if (t.Registros) {
    resumo.push('Registros de atendimento: ' + t.Registros.length);
    orfaos('Registros', 'Registro ligado a um caso que não existe');
    var vistos = {}, regRep = [];
    t.Registros.forEach(function (r) { var id = String(r.id).trim(); if (!id) return; if (vistos[id]) regRep.push(id); vistos[id] = 1; });
    aviso(regRep, 'Registro com id repetido');
    aviso(t.Registros.filter(function (r) { return !String(r.texto || '').trim(); }).map(function (r) { return 'linha ' + r._linha + ' (caso ' + r.caso_id + ')'; }), 'Registro sem texto');
    aviso(t.Registros.filter(function (r) { return !ehData(r.data); }).map(function (r) { return 'linha ' + r._linha + ' (caso ' + r.caso_id + ')'; }), 'Registro sem data ou com data guardada como texto');
    aviso(t.Registros.filter(function (r) { return erroFormula(r.texto) || erroFormula(r.pendencias); }).map(function (r) { return 'linha ' + r._linha + ' (caso ' + r.caso_id + ')'; }),
      'Texto de registro ou pendência que virou fórmula com erro');
  }
  if (t.Discussoes) { resumo.push('Discussões de caso: ' + t.Discussoes.length); orfaos('Discussoes', 'Discussão ligada a um caso que não existe'); }
  if (t.Historico) { resumo.push('Histórico: ' + t.Historico.length + ' ações'); orfaos('Historico', 'Histórico ligado a um caso que não existe'); }
  if (t.GESUAS) {
    resumo.push('Famílias no relatório do GESUAS: ' + t.GESUAS.length);
    aviso(t.GESUAS.filter(function (g) { var n = dig(g.cpf).length; return n === 9 || n === 10; }).map(function (g) { return 'linha ' + g._linha; }), 'CPF de família do GESUAS com 9 ou 10 dígitos (provável zero perdido)');
  }
  if (t.Atendimentos) {
    resumo.push('Atendimentos do GESUAS importados: ' + t.Atendimentos.length);
    var chaves = {}, atRep = [];
    t.Atendimentos.forEach(function (a) { var k = String(a.chave); if (chaves[k]) atRep.push('linha ' + a._linha); chaves[k] = 1; });
    aviso(atRep, 'Atendimento do GESUAS importado duas vezes');
  }
  if (t.CRM) {
    var crmIds = {}, procs = {}, crmRep = [], procRep = [];
    t.CRM.forEach(function (x) {
      var id = String(x.id).trim(), p = dig(x.processo);
      if (crmIds[id]) crmRep.push(id); crmIds[id] = 1;
      if (p) { if (procs[p]) procRep.push(x.processo + ' (' + procs[p] + ' e ' + id + ')'); else procs[p] = id; }
    });
    resumo.push('CRM: ' + t.CRM.length + ' casos');
    aviso(crmRep, 'Número de caso do CRM repetido');
    aviso(procRep, 'Processo cadastrado em dois casos do CRM');
    if (t.CRM_Contatos) {
      resumo.push('Contatos do CRM: ' + t.CRM_Contatos.length);
      aviso(t.CRM_Contatos.filter(function (k) { return !crmIds[String(k.crm_id).trim()]; }).map(function (k) { return 'linha ' + k._linha; }), 'Contato do CRM ligado a um caso que não existe');
    }
  }
  return { resumo: resumo, avisos: avisos };
}

/* ======================= Crm.gs ======================= */

/**
 * CRM: casos de violência contra a mulher que chegam do Fórum (e de outros serviços) pelo e-mail do CRM.
 *
 * Caminho de cada caso: chega o e-mail com o nº do processo e a chave de acesso -> alguém abre o processo e
 * anota nome, telefone, endereço e documento da mulher -> confere se ela já tem cadastro no GESUAS ->
 * faz o primeiro contato para oferecer o atendimento -> acompanhamento ou encerramento.
 *
 * Abas (nascem na primeira gravação):
 * - CRM: um caso por linha;
 * - CRM_Contatos: cada tentativa de contato ou atendimento, ligada ao caso pelo crm_id.
 */

var STATUS_CRM = { espera: 'Em espera', acompanhamento: 'Em acompanhamento', reencaminhado: 'Reencaminhado', inativo: 'Inativo', arquivado: 'Arquivado' };
var CAMPOS_CRM = ['entrada', 'processo', 'chave', 'origem', 'situacao', 'nome', 'nascimento', 'cpf', 'telefone', 'endereco', 'bairro',
  'tecnica', 'gesuas', 'caso_id', 'obs', 'status'];
/* resultado do contato que muda a situação do caso */
var RESULTADO_STATUS_CRM = { aceitou: 'acompanhamento', recusou: 'inativo' };

/** As duas abas do CRM só existem depois da primeira gravação: até lá, a leitura devolve lista vazia sem criar nada. */
function abaCrmExiste(nome) { return !!planilhaBase().getSheetByName(nome); }

function lerCrm(filtroIds) {
  if (!abaCrmExiste('CRM')) return [];
  var contatos = {};
  if (abaCrmExiste('CRM_Contatos')) lerTabela('CRM_Contatos').forEach(function (x) {
    var k = String(x.crm_id); (contatos[k] = contatos[k] || []).push(paraCliente(x));
  });
  return lerTabela('CRM')
    .filter(function (x) { return !filtroIds || filtroIds.indexOf(String(x.id)) >= 0; })
    .map(function (x) {
      var o = paraCliente(x);
      o.id = String(o.id); o.crm = true;
      o.status = STATUS_CRM[o.status] ? o.status : 'espera';
      o.contatos = (contatos[o.id] || []).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      return o;
    });
}

function crmUm(id) {
  var c = lerCrm([String(id)])[0];
  if (!c) throw new Error('Caso do CRM ' + id + ' não encontrado. Recarregue a página.');
  return c;
}

function api_crmUm(id) { exigir(['coordenacao']); return crmUm(id); }

/** Gerador de CRM-0001, CRM-0002... Dentro da trava: relê a Config uma vez e pula número que já esteja na aba. */
function geradorIdCrm(usados) {
  CONFIG_CACHE = null;
  var atual = Number(lerConfig().sequencia_crm || 0);
  return {
    proximo: function () { var id; do { atual++; id = 'CRM-' + pad(atual, 4); } while (usados[id]); usados[id] = 1; return id; },
    gravar: function () { gravarConfig('sequencia_crm', atual, 'Último número de caso do CRM usado'); }
  };
}

function digitosProcesso(p) { return String(p || '').replace(/\D/g, ''); }

/** Casos novos (vindos do e-mail ou digitados). Processo já cadastrado não entra de novo. */
function api_crmNovos(lista) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var atuais = abaCrmExiste('CRM') ? lerTabela('CRM') : [], usados = {}, procs = {};
    atuais.forEach(function (x) { usados[String(x.id)] = 1; var d = digitosProcesso(x.processo); if (d) procs[d] = String(x.id); });
    var novos = [], repetidos = [], agora = new Date(), ger = geradorIdCrm(usados);
    (lista || []).forEach(function (d) {
      var dp = digitosProcesso(d.processo);
      if (dp && procs[dp]) { repetidos.push(procs[dp]); return; }
      if (!dp && !String(d.nome || '').trim()) return;
      var o = { id: ger.proximo(), criado_em: agora, criado_por: emailAtual(), fonte: d.fonte || 'manual', status: 'espera', status_data: '', atualizado_em: agora };
      CAMPOS_CRM.forEach(function (k) { if (k !== 'status' && d[k] !== undefined) o[k] = String(d[k] || '').trim(); });
      o.entrada = isoParaData(d.entrada) || agora;
      o.nascimento = isoParaData(d.nascimento);
      if (dp) procs[dp] = o.id;
      novos.push(o);
    });
    if (novos.length) {
      inserirLinhas('CRM', novos);
      ger.gravar();
    }
    return { crm: lerCrm(), novos: novos.map(function (o) { return o.id; }), repetidos: repetidos };
  });
}

/** Muda campos de um caso do CRM. Mudar a situação grava também a data dela. */
function api_crmEditar(id, campos) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var x = lerTabela('CRM').filter(function (l) { return String(l.id) === String(id); })[0];
    if (!x) throw new Error('Caso do CRM ' + id + ' não encontrado. Recarregue a página.');
    Object.keys(campos || {}).forEach(function (k) {
      if (CAMPOS_CRM.indexOf(k) < 0) return;
      var v = campos[k];
      if (k === 'status') {
        if (!STATUS_CRM[v]) throw new Error('Situação desconhecida: ' + v);
        if (v !== x.status) x.status_data = new Date();
      }
      if (k === 'processo' && digitosProcesso(v)) {
        var outro = lerTabela('CRM').filter(function (l) { return String(l.id) !== String(id) && digitosProcesso(l.processo) === digitosProcesso(v); })[0];
        if (outro) throw new Error('O processo ' + v + ' já está no caso ' + outro.id + '.');
      }
      x[k] = COLUNAS_DATA[k] ? isoParaData(v) : String(v === null || v === undefined ? '' : v).trim();
    });
    x.atualizado_em = new Date();
    atualizarLinha('CRM', x._linha, x);
    return crmUm(id);
  });
}

/** Tentativa de contato ou atendimento. O id vem do navegador: reenvio da fila não grava duas vezes.
 *  "Aceitou" passa o caso para acompanhamento; "não quis" deixa inativo (quem registra pode mudar depois).
 *  Encerrar e reabrir também passam por aqui (resultado "situacao", com r.status): ficam na linha do tempo. */
function api_crmContato(id, r) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var x = lerTabela('CRM').filter(function (l) { return String(l.id) === String(id); })[0];
    if (!x) throw new Error('Caso do CRM ' + id + ' não encontrado. Recarregue a página.');
    if (r.id && abaCrmExiste('CRM_Contatos') && jaGravado('CRM_Contatos', r.id)) return crmUm(id);
    inserirLinhas('CRM_Contatos', [{
      id: r.id || proximoIdSimples('K'), crm_id: id, data: isoParaData(r.data) || new Date(), meio: r.meio || '', resultado: r.resultado || '',
      texto: String(r.texto || '').trim(), autor: autorAtual(), criado_em: new Date(), criado_por: emailAtual()
    }]);
    // mudança de situação pedida (encerrar, reabrir) ou trazida pelo resultado do contato
    var st = STATUS_CRM[r.status] ? r.status : x.status === 'espera' ? RESULTADO_STATUS_CRM[r.resultado] : '';
    if (st && st !== x.status) { x.status = st; x.status_data = new Date(); }
    x.atualizado_em = new Date();
    atualizarLinha('CRM', x._linha, x);
    return crmUm(id);
  });
}

/* ---------- trazer os casos da aba "Casos CRM" da planilha antiga (Controle) ---------- */

var STATUS_ANTIGO_CRM = { 'EM ESPERA': 'espera', 'EM ACOMPANHAMENTO': 'acompanhamento', 'REENCAMINHADO': 'reencaminhado', 'ENCAMINHAMENTO': 'reencaminhado',
  'INATIVO': 'inativo', 'ARQUIVADO': 'arquivado', 'INFORMACOES': 'arquivado' };

function origemCrm(s) {
  var t = String(s || '').trim(), n = normalizar(t);
  if (!t || n === 'DEMANDAS') return '';
  if (/^E[XS]PONTAN/.test(n)) return 'Espontânea';
  var m = n.match(/^(\d)\s*(?:A|O|°|º|ª)?\s*VARA CRIMINAL/);
  if (m) return m[1] + 'ª Vara Criminal';
  return t;
}
function situacaoCrm(s) {
  var t = String(s || '').trim(), n = normalizar(t);
  if (!t || n === 'SITUACAO') return '';
  if (/^VIOLENCIA DOM/.test(n)) return 'Violência doméstica';
  if (/^IDOS/.test(n)) return 'Pessoa idosa';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Converte as linhas da aba antiga (valores, com o cabeçalho) em casos e contatos. Puro: testável fora da planilha. */
function mapearCrmAntigo(valores, hoje) {
  var regras = { status: /^STATUS/, entrada: /^ENTRADA/, ultimo: /^ULTIMO ATEND/, demanda: /^DEMANDA/, situacao: /^SITUACAO/, nome: /^NOME/,
    idade: /^IDADE/, trabalha: /^TRABALHA/, composicao: /^COMPOSICAO/, tecnica: /^TECNICA/, encaminhamento: /^ENCAMINHAMENTO/, cad: /^CAD/, bairro: /^BAIRRO/ };
  var cab = null, col = {};
  for (var i = 0; i < Math.min(valores.length, 8) && !cab; i++) {
    var h = valores[i].map(normalizar);
    if (h.indexOf('NOME') < 0) continue;
    cab = i;
    Object.keys(regras).forEach(function (k) { for (var j = 0; j < h.length; j++) if (regras[k].test(h[j])) { col[k] = j; break; } });
  }
  if (cab === null) throw new Error('Não achei o cabeçalho (com a coluna Nome) na aba do CRM.');
  var casos = [], contatos = [], pulados = 0;
  var val = function (l, k) { return col[k] === undefined ? '' : l[col[k]]; };
  var txt = function (l, k) { var v = val(l, k); return v instanceof Date ? Utilities.formatDate(v, FUSO, 'dd/MM/yyyy') : String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); };
  for (var r = cab + 1; r < valores.length; r++) {
    var l = valores[r], nome = txt(l, 'nome');
    if (!nome || normalizar(nome) === 'NOME') { if (l.some(function (x) { return String(x).trim(); })) pulados++; continue; }
    var obs = [['Idade', 'idade'], ['Trabalha', 'trabalha'], ['Composição familiar', 'composicao'], ['Encaminhamento', 'encaminhamento'], ['CadÚnico', 'cad']]
      .map(function (p) { var v = txt(l, p[1]); return v ? p[0] + ': ' + v : ''; }).filter(String).join('\n');
    var ultimo = dataValida(val(l, 'ultimo'), hoje), ultimoTxt = ultimo ? '' : txt(l, 'ultimo');
    if (ultimoTxt && ultimoTxt !== '/') obs = (obs ? obs + '\n' : '') + 'Último atendimento: ' + ultimoTxt;
    var c = {
      fonte: 'planilha antiga', entrada: dataValida(val(l, 'entrada'), hoje), status: STATUS_ANTIGO_CRM[normalizar(txt(l, 'status'))] || 'espera',
      origem: origemCrm(txt(l, 'demanda')), situacao: situacaoCrm(txt(l, 'situacao')), nome: nome, tecnica: tecnicaPadrao(txt(l, 'tecnica')),
      bairro: txt(l, 'bairro'), obs: obs, status_data: ultimo || ''
    };
    casos.push(c);
    if (ultimo) contatos.push({ caso: c, data: ultimo, meio: '', resultado: 'atendimento', texto: 'Último atendimento anotado na planilha antiga' });
  }
  return { casos: casos, contatos: contatos, pulados: pulados };
}

/** Lê a aba do CRM da planilha antiga (link do Google Planilhas) e grava aqui. Só roda uma vez. */
function api_crmMigrar(url) {
  exigir(['coordenacao']);
  var m = String(url || '').match(/\/d\/([\w-]{20,})/) || String(url || '').match(/^([\w-]{20,})$/);
  if (!m) throw new Error('Cole o link da planilha (o endereço que aparece no navegador quando ela está aberta).');
  var antiga;
  try { antiga = SpreadsheetApp.openById(m[1]); }
  catch (e) { throw new Error('Não consegui abrir a planilha. Confira o link e se ela foi salva como Planilhas Google (Arquivo > Salvar como Planilhas Google), e se sua conta tem acesso a ela.'); }
  var sh = antiga.getSheets().filter(function (s) { return /CRM/.test(normalizar(s.getName())); })[0];
  if (!sh) throw new Error('A planilha não tem uma aba com "CRM" no nome.');
  var r = mapearCrmAntigo(sh.getDataRange().getValues(), new Date());
  return comTrava(function () {
    var atuais = abaCrmExiste('CRM') ? lerTabela('CRM') : [];
    if (atuais.some(function (x) { return x.fonte === 'planilha antiga'; })) throw new Error('Os casos da planilha antiga já foram trazidos.');
    var usados = {}, agora = new Date(), email = emailAtual();
    atuais.forEach(function (x) { usados[String(x.id)] = 1; });
    var ger = geradorIdCrm(usados);
    // em ordem de entrada: os números seguem a ordem em que os casos chegaram
    r.casos.sort(function (a, b) { return (a.entrada || agora) - (b.entrada || agora); });
    r.casos.forEach(function (c) {
      c.id = ger.proximo(); c.criado_em = agora; c.criado_por = email; c.atualizado_em = agora; });
    inserirLinhas('CRM', r.casos);
    inserirLinhas('CRM_Contatos', r.contatos.map(function (k) {
      return { id: proximoIdSimples('K'), crm_id: k.caso.id, data: k.data, meio: k.meio, resultado: k.resultado, texto: k.texto, autor: 'Planilha antiga', criado_em: agora, criado_por: email };
    }));
    if (r.casos.length) ger.gravar();
    return { crm: lerCrm(), trazidos: r.casos.length, pulados: r.pulados };
  });
}

/* ======================= Migracao.gs ======================= */

/**
 * Migração da planilha antiga "Casos em Avaliação Social e Repassados para acompanhamento".
 *
 * Como usar (uma vez só):
 * 1. Abra o .xlsx antigo no Google Drive e use Arquivo > Salvar como Planilhas Google.
 * 2. Copie o ID da planilha convertida (o trecho da URL entre /d/ e /edit) para a aba Config,
 *    na chave planilha_antiga_id.
 * 3. No editor do Apps Script, rode migrarPlanilhaAntiga().
 *
 * Regras:
 * - Aba 2026: casos com técnica preenchida entram como "Em acompanhamento"; sem técnica, "Aguardando triagem".
 * - Aba 2025: entra como histórico (encerrado), para servir de consulta e de aviso de caso já conhecido.
 * - Aba Avaliação Social: se a família já veio das abas de ano, o caso é marcado como "passou por avaliação"
 *   e recebe o que foi registrado; se não, vira um caso próprio (pendentes voltam para a fila de avaliação).
 * - Todo caso migrado fica com origem "migração ..." para você poder filtrar e revisar na planilha.
 */

function migrarPlanilhaAntiga() {
  var cfg = lerConfig();
  if (!cfg.planilha_antiga_id) throw new Error('Preencha planilha_antiga_id na aba Config.');
  if (lerTabela('Casos').length) throw new Error('A aba Casos já tem dados. A migração só roda com a base vazia.');
  var antiga = SpreadsheetApp.openById(String(cfg.planilha_antiga_id).trim());
  var abas = {};
  ['2025', '2026', 'Avaliação Social'].forEach(function (n) {
    var sh = antiga.getSheetByName(n);
    abas[n] = sh ? sh.getDataRange().getValues() : [];
  });
  var r = mapearMigracao(abas, new Date());
  inserirLinhas('Casos', r.casos);
  inserirLinhas('Pessoas', r.pessoas);
  inserirLinhas('Registros', r.registros);
  inserirLinhas('Historico', r.casos.map(function (c) {
    return { data_hora: new Date(), usuario: 'Migração', caso_id: c.id, acao: 'Importado da planilha antiga (' + c.origem + ')' };
  }));
  Object.keys(r.sequencias).forEach(function (ano) { gravarConfig('sequencia_' + ano, r.sequencias[ano], 'Último número de caso usado em ' + ano); });
  Logger.log(r.relatorio.join('\n'));
  return r.relatorio.join('\n');
}

/** Localiza a linha de cabeçalho e devolve {linha, col: {chave: índice}}. */
function mapearCabecalho(valores, regras) {
  for (var i = 0; i < Math.min(valores.length, 8); i++) {
    var cab = valores[i].map(normalizar);
    var col = {};
    Object.keys(regras).forEach(function (k) {
      for (var j = 0; j < cab.length; j++) if (regras[k].test(cab[j])) { col[k] = j; break; }
    });
    if (col.usuarios !== undefined || col.responsavel !== undefined) return { linha: i, col: col };
  }
  return null;
}

function dataValida(v, hoje) {
  var d = v instanceof Date ? v : extrairDataBr(v);
  if (!(d instanceof Date) || isNaN(d)) return '';
  if (d > hoje) {
    // dia e mês trocados na digitação (ex.: 01/12/2026 que era 12/01/2026)
    var t = new Date(d.getFullYear(), d.getDate() - 1, d.getMonth() + 1);
    if (t.getDate() === d.getMonth() + 1 && t <= hoje) return t;
    return '';
  }
  if (d.getFullYear() < 2015) return '';
  return d;
}

function tecnicaPadrao(texto) {
  var t = String(texto || '').split(/[\/(,]/)[0].trim();
  if (!t) return '';
  return tituloNome(t.split(' ')[0]);
}

function mapearMigracao(abas, hoje) {
  var casos = [], pessoas = [], registros = [], relatorio = [], seq = {};
  var agora = hoje;
  var novoId = function (d) {
    var ano = (d instanceof Date ? d : hoje).getFullYear();
    seq[ano] = (seq[ano] || 0) + 1;
    return ano + '-' + pad(seq[ano], 3);
  };
  var regrasAno = {
    numero: /^N/, usuarios: /USUARIO/, remetente: /REMETENTE/, documento: /MEMORANDO|OFICIO/,
    data: /^DATA/, tecnica: /TECNIC/, prazo: /PRECISA/, obs: /OBSERVA/
  };

  // ---------- abas de ano ----------
  var linhasAno = [];
  ['2025', '2026'].forEach(function (nomeAba) {
    var v = abas[nomeAba] || [];
    var cab = mapearCabecalho(v, regrasAno);
    if (!cab) { relatorio.push('Aba ' + nomeAba + ': cabeçalho não encontrado.'); return; }
    var c = cab.col, n = 0;
    for (var i = cab.linha + 1; i < v.length; i++) {
      var l = v[i];
      var usuarios = String(l[c.usuarios] || '').trim();
      if (!usuarios) continue;
      linhasAno.push({ aba: nomeAba, l: l, c: c, usuarios: usuarios });
      n++;
    }
    relatorio.push('Aba ' + nomeAba + ': ' + n + ' encaminhamentos lidos.');
  });
  // ordena por data para os números seguirem a ordem de chegada
  linhasAno.forEach(function (x) {
    x.data = dataValida(x.l[x.c.data], hoje);
    // na aba de um ano, datas muito anteriores costumam ser erro de digitação do ano (ex.: 23/01/2025 na aba 2026)
    var anoAba = Number(x.aba);
    if (x.data && x.data < new Date(anoAba - 1, 10, 1)) {
      var t = new Date(anoAba, x.data.getMonth(), x.data.getDate());
      if (t <= hoje) x.data = t;
    }
  });
  linhasAno.sort(function (a, b) { return (a.data || hoje) - (b.data || hoje); });

  linhasAno.forEach(function (x) {
    var l = x.l, c = x.c;
    var nomes = dividirNomes(x.usuarios);
    var rem = padronizarRemetente(l[c.remetente]);
    var docTxt = c.documento !== undefined ? String(l[c.documento] || '').trim() : '';
    var tecTxt = c.tecnica !== undefined ? String(l[c.tecnica] || '').trim() : '';
    var prazoTxt = c.prazo !== undefined ? l[c.prazo] : '';
    var obs = c.obs !== undefined ? String(l[c.obs] || '').trim() : '';
    var prazo = dataValida(prazoTxt, new Date(2100, 0, 1));
    var id = novoId(x.data);
    var caso = {
      id: id, criado_em: agora, criado_por: 'migração', responsavel: nomes[0] || x.usuarios,
      remetente: rem.categoria, remetente_detalhe: rem.detalhe, doc_tipo: tipoDocumento(docTxt), doc_num: docTxt,
      recebido: x.data, prazo: prazo, prazo_respondido: prazo && prazo < hoje ? 'SIM' : '',
      descricao: 'Migrado da planilha antiga (aba ' + x.aba + ', nº ' + (l[c.numero] || '?') + ').' + (obs ? ' Obs.: ' + obs : '') +
        (prazoTxt && !(prazoTxt instanceof Date) && !/^n[aã]o$/i.test(String(prazoTxt).trim()) ? ' Atendimento/resposta: ' + prazoTxt : ''),
      prioridade: 2, etapa: 'triagem', passou_avaliacao: /avalia/i.test(tecTxt) ? 'SIM' : '', diagnostico: '',
      origem: 'migração ' + x.aba, atualizado_em: agora
    };
    var tec = tecnicaPadrao(tecTxt);
    if (x.aba === '2025') {
      caso.etapa = 'encerrado'; caso.desfecho = 'Histórico ' + x.aba + ' (migrado)'; caso.desfecho_data = x.data;
      caso.tecnica = tec; caso.inicio_acomp = tec ? x.data : '';
      if (tecTxt) caso.desfecho_obs = 'Técnica na planilha antiga: ' + tecTxt;
    } else if (tec) {
      caso.etapa = 'acompanhamento'; caso.tecnica = tec; caso.complexidade = 1; caso.inicio_acomp = x.data;
      caso.desfecho = 'Passado para acompanhamento'; caso.desfecho_data = x.data;
      if (tecTxt !== tec) caso.desfecho_obs = 'Técnica na planilha antiga: ' + tecTxt;
    }
    casos.push(caso);
    nomes.forEach(function (nm) { pessoas.push({ caso_id: id, nome: nm, nascimento: '', sexo: '' }); });
  });

  // ---------- aba Avaliação Social ----------
  var va = abas['Avaliação Social'] || [];
  var cabA = mapearCabecalho(va, {
    responsavel: /RESPONSAVEL/, vitimas: /VITIMA/, descricao: /DESCRI/, recebimento: /RECEBIMENTO/,
    feito: /JA SE FEZ/, prioridade: /PRIORIDADE/, situacao: /SITUACAO/
  });
  var genericos = /^(IDOS[OA]|CRIANCAS?|ADOLESCENTES?|FILHOS?|NETOS?|MAE|PAI|FAMILIA)$/;
  var vinculados = 0, criados = 0;
  if (cabA) {
    var c = cabA.col;
    for (var i = cabA.linha + 1; i < va.length; i++) {
      var l = va[i];
      var resp = String(l[c.responsavel] || '').trim();
      var vit = dividirNomes(l[c.vitimas]).filter(function (n) { return !genericos.test(normalizar(n)) && tokensNome(n).length >= 2; });
      var desc = String(l[c.descricao] || '').trim();
      if (!resp && !vit.length && !desc) continue;
      var feito = String(l[c.feito] instanceof Date ? dataIso(l[c.feito]) : (l[c.feito] || '')).trim();
      var sit = normalizar(l[c.situacao]);
      var prio = Number(l[c.prioridade]) || 2;
      var receb = dataValida(l[c.recebimento], hoje);
      var extra = va[i].slice(Math.max(c.situacao + 1, 7)).filter(function (x) { return String(x).trim(); }).join(' ');
      var nomes = (resp ? [resp] : []).concat(vit);

      // procura a família nas abas de ano
      var achado = null;
      for (var k = casos.length - 1; k >= 0 && !achado; k--) {
        if (casos[k].origem.indexOf('migração 20') !== 0) continue;
        var pk = pessoas.filter(function (p) { return p.caso_id === casos[k].id; }).map(function (p) { return p.nome; });
        if (nomes.some(function (n) { return pk.some(function (m) { return mesmoNome(n, m); }); })) achado = casos[k];
      }
      var textoRegistro = [feito, extra].filter(Boolean).join(' | ');

      if (achado) {
        vinculados++;
        achado.passou_avaliacao = 'SIM';
        achado.prioridade = prio;
        if (achado.etapa === 'triagem') {
          if (sit === 'CONCLUIDO') achado.etapa = /ACOMPANH/.test(normalizar(feito)) ? 'repasse' : 'triagem';
          else if (sit !== 'NAO LOCALIZADO') achado.etapa = 'avaliacao';
        }
        if (desc) achado.descricao = desc + ' — ' + achado.descricao;
        if (textoRegistro) registros.push({ id: 'M-' + achado.id + '-' + i, caso_id: achado.id, data: receb || achado.recebido, tipo: 'Outro', texto: 'Planilha antiga (Avaliação Social): ' + textoRegistro, autor: 'Avaliação social', criado_em: agora, criado_por: 'migração' });
        continue;
      }

      criados++;
      var id = novoId(receb);
      var caso = {
        id: id, criado_em: agora, criado_por: 'migração', responsavel: resp || vit[0] || '(sem nome)', remetente: '', remetente_detalhe: '',
        doc_tipo: 'Sem documento', doc_num: '', recebido: receb, prazo: '', prazo_respondido: '',
        descricao: (desc || 'Sem descrição') + ' (migrado da aba Avaliação Social)', prioridade: prio,
        etapa: 'avaliacao', passou_avaliacao: 'SIM', diagnostico: '', origem: 'migração avaliação', atualizado_em: agora
      };
      var f = normalizar(feito);
      var concluidoPeloTexto = !sit && /ACOMPANH|ARQUIV|CONTRARREF|CONTRA REF|ENCERRAD|IMPROCEDENTE|RESPONDID/.test(f) && !/EM AVALIA/.test(f);
      if (sit === 'CONCLUIDO' || concluidoPeloTexto) {
        caso.etapa = 'encerrado'; caso.desfecho_data = receb;
        caso.desfecho = /ACOMPANH/.test(f) ? 'Indicado acompanhamento (migrado, sem técnica na planilha)' :
          /CONTRARREF|CONTRA REF|\bCRAS\b/.test(f) ? 'Contrarreferenciado ao CRAS' :
          /ARQUIV/.test(f) ? 'Arquivado' :
          /IMPROCEDENTE|NAO CONFIRM/.test(f) ? 'Denúncia não confirmada — respondido ao órgão' : 'Avaliação concluída (migrado)';
        caso.desfecho_obs = feito;
      } else if (sit === 'NAO LOCALIZADO') {
        caso.etapa = 'encerrado'; caso.desfecho = 'Não localizado'; caso.desfecho_data = receb; caso.desfecho_obs = feito;
      }
      casos.push(caso);
      (resp ? [resp] : []).concat(vit).forEach(function (nm) { pessoas.push({ caso_id: id, nome: nm, nascimento: '', sexo: '' }); });
      if (textoRegistro) registros.push({ id: 'M-' + id, caso_id: id, data: receb || '', tipo: 'Outro', texto: 'Planilha antiga: ' + textoRegistro, autor: 'Avaliação social', criado_em: agora, criado_por: 'migração' });
    }
    relatorio.push('Aba Avaliação Social: ' + vinculados + ' ligados a casos das abas de ano, ' + criados + ' criados como casos próprios.');
  } else relatorio.push('Aba Avaliação Social: cabeçalho não encontrado.');

  var cont = {};
  casos.forEach(function (c) { cont[c.etapa] = (cont[c.etapa] || 0) + 1; });
  relatorio.push('Total: ' + casos.length + ' casos (' + Object.keys(cont).map(function (k) { return k + ': ' + cont[k]; }).join(', ') + ').');
  return { casos: casos, pessoas: pessoas, registros: registros, relatorio: relatorio, sequencias: seq };
}
