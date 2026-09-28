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
