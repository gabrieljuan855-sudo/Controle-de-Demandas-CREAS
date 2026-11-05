/* Junta os arquivos de src/ nos dois que vão para o Apps Script (pasta publicar/):
   - Codigo.gs: Util, Dados, Code e Migracao, nessa ordem;
   - Index.html: a página com o estilo e o código da tela já dentro.
   Rode depois de mudar qualquer arquivo de src/:  node tools/montar.js
   Com --conferir, só verifica se publicar/ está em dia (usado no GitHub). */
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..'), src = f => fs.readFileSync(path.join(raiz, 'src', f), 'utf8');
const AVISO = 'Gerado por tools/montar.js a partir da pasta src/. Não edite aqui: edite src/ e rode o script de novo.';

const gs = ['Util.gs', 'Dados.gs', 'Code.gs', 'Migracao.gs'];
const codigo = `/* ${AVISO} */\n\n` + gs.map(f => `/* ======================= ${f} ======================= */\n\n${src(f).trim()}\n`).join('\n');

let index = src('Index.html');
const incluir = (nome) => {
  const marca = `<?!= include('${nome}'); ?>`;
  if (!index.includes(marca)) throw new Error(`Index.html não tem ${marca}`);
  index = index.split(marca).join(src(nome + '.html').trim());
};
incluir('Estilo'); incluir('App');
if (/<\?/.test(index)) throw new Error('Sobrou <? na página: o Apps Script leria como código do modelo.');
index = index.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n<!-- ${AVISO} -->`);

const saida = { 'Codigo.gs': codigo, 'Index.html': index };
const conferir = process.argv.includes('--conferir');
let desatualizado = [];
fs.mkdirSync(path.join(raiz, 'publicar'), { recursive: true });
for (const [nome, txt] of Object.entries(saida)) {
  const arq = path.join(raiz, 'publicar', nome);
  const atual = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : null;
  if (atual === txt) continue;
  if (conferir) desatualizado.push(nome); else fs.writeFileSync(arq, txt);
}
if (desatualizado.length) {
  console.error(`publicar/ desatualizado (${desatualizado.join(', ')}): rode "node tools/montar.js" e faça o commit.`);
  process.exit(1);
}
console.log(conferir ? 'publicar/ em dia.' : 'publicar/Codigo.gs e publicar/Index.html montados.');
