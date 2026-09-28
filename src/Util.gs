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
