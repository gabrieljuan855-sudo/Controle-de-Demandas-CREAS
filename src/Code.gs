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

function api_iniciar() {
  var papel = papelAtual();
  var cfg = lerConfig();
  var casos = montarCasos().filter(function (c) { return visivelPara(papel, c); });
  var ges = papel === 'coordenacao' ? lerGesuas(cfg) : null;
  var atend = papel === 'coordenacao' ? lerAtendimentos() : [];
  return { papel: papel, autor: autorAtual(), email: emailAtual(), hoje: dataIso(new Date()), casos: casos, ges: ges, atend: atend, listas: lerListas() };
}

function api_novoCaso(d) {
  exigir(['coordenacao']);
  return comTrava(function () {
    exigirVitima(d.pessoas);
    var receb = isoParaData(d.recebido) || new Date();
    var id = proximoIdCaso(receb.getFullYear());
    var agora = new Date();
    var caso = {
      id: id, criado_em: agora, criado_por: emailAtual(), responsavel: String(d.responsavel || '').trim(), cpf: d.cpf, endereco: d.endereco,
      bairro: d.bairro, contato: d.contato, remetente: d.remetente, remetente_detalhe: d.remetente_detalhe,
      doc_tipo: d.doc_tipo, doc_num: d.doc_num, recebido: receb, prazo: isoParaData(d.prazo), prazo_respondido: '',
      descricao: d.descricao, prioridade: Number(d.prioridade) || 2, etapa: 'triagem', passou_avaliacao: '', diagnostico: '',
      origem: 'sistema', atualizado_em: agora
    };
    if (d.destino === 'avaliacao') { caso.etapa = 'avaliacao'; caso.passou_avaliacao = 'SIM'; }
    if (d.destino === 'acompanhamento') {
      caso.etapa = 'acompanhamento'; caso.tecnica = d.tecnica; caso.complexidade = Number(d.complexidade) || 1;
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
      var linhas = lerTabela('Pessoas').filter(function (p) { return String(p.caso_id) === String(id); });
      linhas.reverse().forEach(function (p) { sh.deleteRow(p._linha); });
      inserirLinhas('Pessoas', pessoas.filter(function (p) { return String(p.nome || '').trim(); })
        .map(function (p) { return { caso_id: id, nome: p.nome.trim(), nascimento: isoParaData(p.nascimento), sexo: p.sexo || '' }; }));
    }
    registrarHistorico(id, 'Dados do caso editados');
    return salvarCasoLinha(c);
  });
}

/** Coordenação decide o destino de um caso em triagem ou aguardando repasse. */
function api_encaminhar(id, destino, tecnica, complexidade) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    if (destino === 'avaliacao') {
      c.etapa = 'avaliacao'; c.passou_avaliacao = 'SIM';
      registrarHistorico(id, 'Enviado para avaliação social');
    } else if (destino === 'acompanhamento') {
      if (!tecnica) throw new Error('Escolha a técnica de referência.');
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
function exigirViolacaoEPrioridade(codigos, prioridade) {
  var lista = (codigos || []).map(String).filter(Boolean);
  if (!lista.length) throw new Error('Marque ao menos uma violação vivenciada.');
  var p = Number(prioridade);
  if (p !== 1 && p !== 2 && p !== 3) throw new Error('Escolha a prioridade.');
  return { codigos: lista, prioridade: p };
}

/**
 * Quem avaliou indica o acompanhamento: marca a violação vivenciada e a prioridade.
 * O caso fica aguardando a coordenação escolher a técnica (etapa "repasse").
 */
function api_indicarAcompanhamento(id, obs, codigos, prioridade) {
  papelAtual();
  return comTrava(function () {
    var v = exigirViolacaoEPrioridade(codigos, prioridade);
    var c = buscarCaso(id);
    c.diagnostico = v.codigos.join(','); c.prioridade = v.prioridade;
    c.etapa = 'repasse'; c.desfecho = 'Indicado acompanhamento'; c.desfecho_data = new Date(); c.desfecho_obs = obs || '';
    registrarHistorico(id, 'Avaliação concluída com indicação de acompanhamento');
    return salvarCasoLinha(c);
  });
}

/** Corrige as violações e a prioridade de um caso sem mudar a etapa. */
function api_violacao(id, codigos, prioridade) {
  papelAtual();
  return comTrava(function () {
    var v = exigirViolacaoEPrioridade(codigos, prioridade);
    var c = buscarCaso(id);
    c.diagnostico = v.codigos.join(','); c.prioridade = v.prioridade;
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

function api_prazoRespondido(id) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    c.prazo_respondido = 'SIM';
    registrarHistorico(id, 'Prazo de resposta marcado como respondido');
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

function api_reabrir(id) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var c = buscarCaso(id);
    c.etapa = 'triagem'; c.desfecho = ''; c.desfecho_data = ''; c.desfecho_obs = ''; c.desligamento = '';
    registrarHistorico(id, 'Caso reaberto para nova triagem');
    return salvarCasoLinha(c);
  });
}

/**
 * Conferência manual com o GESUAS.
 * confirmar: nome é a família do GESUAS; manual: está no GESUAS sem escolher família;
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
    } else if (acao === 'manual') {
      c.gesuas_vinculo = '*';
      registrarHistorico(id, 'GESUAS: confirmado manualmente que está em acompanhamento');
    } else if (acao === 'rejeitar' && nome) {
      var rej = String(c.gesuas_rejeitados || '').split('|').filter(Boolean);
      var novos = nome.split('|').filter(Boolean);
      novos.forEach(function (n) { if (rej.indexOf(n) < 0) rej.push(n); });
      c.gesuas_rejeitados = rej.join('|');
      if (novos.indexOf(c.gesuas_vinculo) >= 0) c.gesuas_vinculo = '';
      registrarHistorico(id, novos.length > 1 ? 'GESUAS: nenhuma das famílias sugeridas é esta' : 'GESUAS: "' + nome + '" não é esta família');
    } else if (acao === 'desfazer') {
      c.gesuas_vinculo = '';
      c.gesuas_rejeitados = '';
      registrarHistorico(id, 'GESUAS: conferência desfeita, volta à comparação automática');
    } else throw new Error('Ação inválida.');
    return salvarCasoLinha(c);
  });
}

/**
 * Importação dos relatórios do GESUAS lidos no navegador. Cada parte é opcional:
 *  ges:          famílias acompanhadas por técnico (substitui a lista anterior), já com CPF/bairro se vierem;
 *  desligar:     casos que saíram do GESUAS desde o relatório anterior;
 *  completar:    [{id, campos}] dados vazios dos casos preenchidos a partir do GESUAS (nunca sobrescreve);
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
      var sh = aba('GESUAS');
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, ESQUEMA.GESUAS.length).clearContent();
      inserirLinhas('GESUAS', (p.ges.linhas || []).map(function (g) {
        return { tecnico: g.tecnico, responsavel: g.responsavel, inicio: String(g.inicio || ''), servico: g.servico, paf: g.paf,
          cpf: g.cpf || '', nis: g.nis || '', bairro: g.bairro || '', endereco: g.endereco || '' };
      }));
      gravarConfig('gesuas_origem', p.ges.origem || '', 'Arquivo do último relatório do GESUAS importado');
      gravarConfig('gesuas_periodo', p.ges.periodo || '', 'Período do último relatório do GESUAS');
      gravarConfig('gesuas_importado_em', Utilities.formatDate(agora, FUSO, 'dd/MM/yyyy HH:mm'), 'Quando o relatório foi importado');
    }
    var desligar = (p.desligar || []).map(String), completar = {};
    (p.completar || []).forEach(function (x) { completar[String(x.id)] = x.campos || {}; });
    if (desligar.length || Object.keys(completar).length) {
      lerTabela('Casos').forEach(function (c) {
        var id = String(c.id), mudou = false;
        if (completar[id]) {
          var feitos = [];
          ['responsavel', 'cpf', 'endereco', 'bairro'].forEach(function (k) {
            if (completar[id][k] && !String(c[k] || '').trim()) { c[k] = completar[id][k]; feitos.push(k); }
          });
          if (feitos.length) { mudou = true; anotar(id, 'Dados completados a partir do GESUAS: ' + feitos.join(', ')); }
        }
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
