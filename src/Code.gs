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

function papelAtual() {
  var cfg = lerConfig();
  var e = emailAtual();
  if (!e) throw new Error('Não foi possível identificar sua conta Google. Entre com a conta autorizada e recarregue.');
  if (listaEmails(cfg.emails_coordenacao).indexOf(e) >= 0) return 'coordenacao';
  if (listaEmails(cfg.emails_avaliacao).indexOf(e) >= 0) return 'avaliacao';
  throw new Error('A conta ' + e + ' não tem acesso a este sistema.');
}

function exigir(papeis) {
  var p = papelAtual();
  if (papeis.indexOf(p) < 0) throw new Error('Esta ação é só da coordenação.');
  return p;
}

var AUTOR = { coordenacao: 'Coordenação', avaliacao: 'Avaliação social' };

function sim(v) { return v === true || /^(SIM|TRUE|S|1)$/i.test(String(v).trim()); }

function comTrava(fn) {
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try { return fn(); } finally { trava.releaseLock(); }
}

function registrarHistorico(casoId, acao) {
  inserirLinhas('Historico', [{ data_hora: new Date(), usuario: AUTOR[papelAtual()] || emailAtual(), caso_id: casoId, acao: acao }]);
}

/* ---------- montagem dos casos ---------- */

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
      o.prioridade = Number(o.prioridade) || 2;
      o.complexidade = o.complexidade === '' ? '' : Number(o.complexidade);
      o.passou_avaliacao = sim(o.passou_avaliacao);
      o.prazo_respondido = sim(o.prazo_respondido);
      o.diagnostico = String(o.diagnostico || '').split(',').filter(Boolean);
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

function api_iniciar() {
  var papel = papelAtual();
  var cfg = lerConfig();
  var casos = montarCasos().filter(function (c) { return visivelPara(papel, c); });
  var ges = null;
  if (papel === 'coordenacao') {
    ges = {
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
  return { papel: papel, email: emailAtual(), hoje: dataIso(new Date()), casos: casos, ges: ges, listas: lerListas() };
}

function api_novoCaso(d) {
  exigir(['coordenacao']);
  return comTrava(function () {
    if (!String(d.responsavel || '').trim()) throw new Error('Informe o responsável familiar.');
    var receb = isoParaData(d.recebido) || new Date();
    var id = proximoIdCaso(receb.getFullYear());
    var agora = new Date();
    var caso = {
      id: id, criado_em: agora, criado_por: emailAtual(), responsavel: d.responsavel.trim(), cpf: d.cpf, endereco: d.endereco,
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

var CAMPOS_EDITAVEIS = ['responsavel', 'cpf', 'endereco', 'bairro', 'contato', 'remetente', 'remetente_detalhe',
  'doc_tipo', 'doc_num', 'recebido', 'prazo', 'descricao', 'prioridade'];

function api_editarCaso(id, campos, pessoas) {
  var papel = papelAtual();
  return comTrava(function () {
    var c = buscarCaso(id);
    if (!visivelPara(papel, paraCliente(c))) throw new Error('Sem acesso a este caso.');
    CAMPOS_EDITAVEIS.forEach(function (k) {
      if (k in campos) c[k] = (k === 'recebido' || k === 'prazo') ? isoParaData(campos[k]) : campos[k];
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
 * Desfecho da avaliação social.
 * tipo 'indicar_acompanhamento' deixa o caso aguardando a coordenação escolher a técnica.
 */
function api_desfecho(id, tipo, obs, tecnica, complexidade) {
  var papel = papelAtual();
  return comTrava(function () {
    var c = buscarCaso(id);
    if (tipo === 'indicar_acompanhamento') {
      if (papel === 'coordenacao' && tecnica) {
        c.etapa = 'acompanhamento'; c.tecnica = tecnica; c.complexidade = Number(complexidade) || 1; c.inicio_acomp = new Date();
        c.desfecho = 'Passado para acompanhamento'; c.desfecho_data = new Date(); c.desfecho_obs = obs || '';
        registrarHistorico(id, 'Avaliação concluída; repassado para acompanhamento com ' + tecnica);
      } else {
        c.etapa = 'repasse'; c.desfecho = 'Indicado acompanhamento'; c.desfecho_data = new Date(); c.desfecho_obs = obs || '';
        registrarHistorico(id, 'Avaliação concluída com indicação de acompanhamento');
      }
    } else {
      c.etapa = 'encerrado'; c.desfecho = tipo; c.desfecho_data = new Date(); c.desfecho_obs = obs || '';
      registrarHistorico(id, 'Desfecho: ' + tipo);
    }
    return salvarCasoLinha(c);
  });
}

function api_diagnostico(id, codigos) {
  papelAtual();
  return comTrava(function () {
    var c = buscarCaso(id);
    c.diagnostico = (codigos || []).join(',');
    return salvarCasoLinha(c);
  });
}

function api_registro(id, r) {
  var papel = papelAtual();
  return comTrava(function () {
    if (!String(r.texto || '').trim()) throw new Error('Escreva o registro antes de salvar.');
    inserirLinhas('Registros', [{
      id: proximoIdSimples('R'), caso_id: id, data: isoParaData(r.data) || new Date(), tipo: r.tipo, texto: r.texto.trim(),
      autor: AUTOR[papel], criado_em: new Date(), criado_por: emailAtual()
    }]);
    return montarCasos([String(id)])[0];
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

function api_discussao(id, texto, data) {
  exigir(['coordenacao']);
  return comTrava(function () {
    if (!String(texto || '').trim()) throw new Error('Escreva o plano definido na discussão.');
    inserirLinhas('Discussoes', [{ id: proximoIdSimples('D'), caso_id: id, data: isoParaData(data) || new Date(), texto: texto.trim(), criado_em: new Date(), criado_por: emailAtual() }]);
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

/** Grava o relatório "Famílias Acompanhadas por Técnico" lido no navegador. */
function api_salvarGesuas(meta, linhas) {
  exigir(['coordenacao']);
  return comTrava(function () {
    var sh = aba('GESUAS');
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, ESQUEMA.GESUAS.length).clearContent();
    inserirLinhas('GESUAS', (linhas || []).map(function (g) {
      return { tecnico: g.tecnico, responsavel: g.responsavel, inicio: String(g.inicio || ''), servico: g.servico, paf: g.paf };
    }));
    gravarConfig('gesuas_origem', meta.origem || '', 'Arquivo do último relatório do GESUAS importado');
    gravarConfig('gesuas_periodo', meta.periodo || '', 'Período do último relatório do GESUAS');
    gravarConfig('gesuas_importado_em', Utilities.formatDate(new Date(), FUSO, 'dd/MM/yyyy HH:mm'), 'Quando o relatório foi importado');
    return api_iniciar().ges;
  });
}
