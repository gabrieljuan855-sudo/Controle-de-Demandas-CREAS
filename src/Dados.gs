/**
 * Camada de dados: cada aba da planilha base funciona como uma tabela.
 * A linha 1 de cada aba guarda os nomes das colunas.
 */

var ESQUEMA = {
  Casos: ['id', 'criado_em', 'criado_por', 'responsavel', 'cpf', 'endereco', 'bairro', 'contato',
    'remetente', 'remetente_detalhe', 'doc_tipo', 'doc_num', 'recebido', 'prazo', 'prazo_respondido',
    'descricao', 'prioridade', 'etapa', 'passou_avaliacao', 'diagnostico',
    'desfecho', 'desfecho_data', 'desfecho_obs', 'tecnica', 'inicio_acomp', 'complexidade',
    'desligamento', 'origem', 'atualizado_em', 'gesuas_vinculo', 'gesuas_rejeitados', 'violacao_outra'],
  Pessoas: ['caso_id', 'nome', 'nascimento', 'sexo'],
  Registros: ['id', 'caso_id', 'data', 'tipo', 'texto', 'autor', 'criado_em', 'criado_por', 'editado_em', 'editado_por', 'gesuas_em', 'gesuas_por', 'pendencias', 'pendencia_ok', 'pendencia_ok_por'],
  Discussoes: ['id', 'caso_id', 'data', 'texto', 'criado_em', 'criado_por'],
  Historico: ['data_hora', 'usuario', 'caso_id', 'acao'],
  GESUAS: ['tecnico', 'responsavel', 'inicio', 'servico', 'paf', 'cpf', 'nis', 'bairro', 'endereco'],
  Atendimentos: ['chave', 'tecnico', 'responsavel', 'cpf', 'nis', 'bairro', 'data'],
  Listas: ['remetentes', 'tipos_documento', 'tecnicas', 'bairros', 'tipos_registro'],
  Config: ['chave', 'valor', 'observacao']
};

/** Colunas guardadas como data (no navegador viram 'aaaa-mm-dd'). */
var COLUNAS_DATA = {
  recebido: 1, prazo: 1, desfecho_data: 1, inicio_acomp: 1, desligamento: 1,
  nascimento: 1, data: 1
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
