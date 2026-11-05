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

function exigirCrm() {
  if (!acessoAtual().crm) throw new Error('Sua conta não usa o CRM. Peça à coordenação para incluir seu e-mail na linha emails_crm da aba Config.');
}

/* contatos do CRM levam a assinatura do CRM, também para quem usa as duas partes */
var AUTOR_CRM = 'CRM';

/** Para quem usa só o CRM (e não recebe os casos do CREAS): os casos do CREAS com o mesmo CPF ou o mesmo nome
 *  da mulher, só o número. Quem usa o CREAS confere isso no navegador, com a lista que já tem. */
function anotarCasosCreas(lista) {
  if (acessoAtual().creas || !lista.length) return lista;
  var casos = lerTabela('Casos'), pessoas = {}, dig = function (v) { return String(v || '').replace(/\D/g, ''); };
  lerTabela('Pessoas').forEach(function (p) { var k = String(p.caso_id); (pessoas[k] = pessoas[k] || []).push(String(p.nome || '')); });
  lista.forEach(function (x) {
    var cpf = dig(x.cpf), nome = String(x.nome || '').trim();
    x.creas = !cpf && !nome ? [] : casos.filter(function (c) {
      if (cpf.length === 11 && dig(c.cpf) === cpf) return true;
      return !!nome && [String(c.responsavel || '')].concat(pessoas[String(c.id)] || []).some(function (n) { return n && mesmoNome(nome, n); });
    }).map(function (c) { return String(c.id); });
  });
  return lista;
}

/** As duas abas do CRM só existem depois da primeira gravação: até lá, a leitura devolve lista vazia sem criar nada. */
function abaCrmExiste(nome) { return !!planilhaBase().getSheetByName(nome); }

function lerCrm(filtroIds) {
  if (!abaCrmExiste('CRM')) return [];
  var contatos = {};
  if (abaCrmExiste('CRM_Contatos')) lerTabela('CRM_Contatos').forEach(function (x) {
    var k = String(x.crm_id); (contatos[k] = contatos[k] || []).push(paraCliente(x));
  });
  return anotarCasosCreas(lerTabela('CRM')
    .filter(function (x) { return !filtroIds || filtroIds.indexOf(String(x.id)) >= 0; })
    .map(function (x) {
      var o = paraCliente(x);
      o.id = String(o.id); o.crm = true;
      o.status = STATUS_CRM[o.status] ? o.status : 'espera';
      o.contatos = (contatos[o.id] || []).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      return o;
    }));
}

function crmUm(id) {
  var c = lerCrm([String(id)])[0];
  if (!c) throw new Error('Caso do CRM ' + id + ' não encontrado. Recarregue a página.');
  return c;
}

function api_crmUm(id) { exigirCrm(); return crmUm(id); }

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
  exigirCrm();
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
  exigirCrm();
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
  exigirCrm();
  return comTrava(function () {
    var x = lerTabela('CRM').filter(function (l) { return String(l.id) === String(id); })[0];
    if (!x) throw new Error('Caso do CRM ' + id + ' não encontrado. Recarregue a página.');
    if (r.id && abaCrmExiste('CRM_Contatos') && jaGravado('CRM_Contatos', r.id)) return crmUm(id);
    inserirLinhas('CRM_Contatos', [{
      id: r.id || proximoIdSimples('K'), crm_id: id, data: isoParaData(r.data) || new Date(), meio: r.meio || '', resultado: r.resultado || '',
      texto: String(r.texto || '').trim(), autor: AUTOR_CRM, criado_em: new Date(), criado_por: emailAtual(),
      pendencias: String(r.pendencias || '').trim()
    }]);
    // mudança de situação pedida (encerrar, reabrir) ou trazida pelo resultado do contato
    var st = STATUS_CRM[r.status] ? r.status : x.status === 'espera' ? RESULTADO_STATUS_CRM[r.resultado] : '';
    if (st && st !== x.status) { x.status = st; x.status_data = new Date(); }
    x.atualizado_em = new Date();
    atualizarLinha('CRM', x._linha, x);
    return crmUm(id);
  });
}

/** Contato de um caso do CRM, conferindo o caso. */
function contatoCrmLinha(id, kid) {
  var k = abaCrmExiste('CRM_Contatos') ? lerTabela('CRM_Contatos').filter(function (x) { return String(x.id) === String(kid) && String(x.crm_id) === String(id); })[0] : null;
  if (!k) throw new Error('Contato não encontrado. Recarregue a página.');
  return k;
}

/** Marca (ou desmarca) que o contato foi lançado no GESUAS. */
function api_crmGesuas(id, kid, feito) {
  exigirCrm();
  return comTrava(function () {
    var k = contatoCrmLinha(id, kid);
    k.gesuas_em = feito ? Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH:mm') : '';
    k.gesuas_por = feito ? emailAtual() : '';
    atualizarLinha('CRM_Contatos', k._linha, k);
    return crmUm(id);
  });
}

/** Marca (ou reabre) a pendência anotada no contato. */
function api_crmPendencia(id, kid, feito) {
  exigirCrm();
  return comTrava(function () {
    var k = contatoCrmLinha(id, kid);
    if (!String(k.pendencias || '').trim()) throw new Error('Este contato não tem pendência.');
    k.pendencia_ok = feito ? Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH:mm') : '';
    k.pendencia_ok_por = feito ? emailAtual() : '';
    atualizarLinha('CRM_Contatos', k._linha, k);
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
  exigirCrm();
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
