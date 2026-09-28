/**
 * Camada de dados: cada aba da planilha base funciona como uma tabela.
 * A linha 1 de cada aba guarda os nomes das colunas.
 */

var ESQUEMA = {
  Casos: ['id', 'criado_em', 'criado_por', 'responsavel', 'cpf', 'endereco', 'bairro', 'contato',
    'remetente', 'remetente_detalhe', 'doc_tipo', 'doc_num', 'recebido', 'prazo', 'prazo_respondido',
    'descricao', 'prioridade', 'etapa', 'passou_avaliacao', 'diagnostico',
    'desfecho', 'desfecho_data', 'desfecho_obs', 'tecnica', 'inicio_acomp', 'complexidade',
    'desligamento', 'origem', 'atualizado_em'],
  Pessoas: ['caso_id', 'nome', 'nascimento', 'sexo'],
  Registros: ['id', 'caso_id', 'data', 'tipo', 'texto', 'autor', 'criado_em', 'criado_por'],
  Discussoes: ['id', 'caso_id', 'data', 'texto', 'criado_em', 'criado_por'],
  Historico: ['data_hora', 'usuario', 'caso_id', 'acao'],
  GESUAS: ['tecnico', 'responsavel', 'inicio', 'servico', 'paf'],
  Listas: ['remetentes', 'tipos_documento', 'tecnicas', 'bairros', 'tipos_registro'],
  Config: ['chave', 'valor', 'observacao']
};

/** Colunas guardadas como data (no navegador viram 'aaaa-mm-dd'). */
var COLUNAS_DATA = {
  recebido: 1, prazo: 1, desfecho_data: 1, inicio_acomp: 1, desligamento: 1,
  nascimento: 1, data: 1
};

function planilhaBase() {
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa) return ativa;
  var id = PropertiesService.getScriptProperties().getProperty('BASE_ID');
  if (!id) throw new Error('Planilha base não configurada. Rode a função configurar().');
  return SpreadsheetApp.openById(id);
}

function aba(nome) {
  var sh = planilhaBase().getSheetByName(nome);
  if (!sh) throw new Error('Aba "' + nome + '" não encontrada. Rode a função configurar().');
  return sh;
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
    return v;
  });
}

function inserirLinhas(nome, objetos) {
  if (!objetos.length) return;
  var sh = aba(nome);
  var linhas = objetos.map(function (o) { return objetoParaLinha(nome, o); });
  sh.getRange(sh.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
}

function atualizarLinha(nome, linha, obj) {
  var sh = aba(nome);
  var l = objetoParaLinha(nome, obj);
  sh.getRange(linha, 1, 1, l.length).setValues([l]);
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
  var c = {};
  lerTabela('Config').forEach(function (l) { c[String(l.chave).trim()] = l.valor; });
  return c;
}

function gravarConfig(chave, valor, observacao) {
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

/** Próximo número de caso do ano: 2026-001, 2026-002... */
function proximoIdCaso(ano) {
  var chave = 'sequencia_' + ano;
  var atual = Number(lerConfig()[chave] || 0) + 1;
  gravarConfig(chave, atual, 'Último número de caso usado em ' + ano);
  return ano + '-' + pad(atual, 3);
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
