// 毎日の鑑定プロンプト（api/jyotish.js）の例文の検査。
// Gemini は例文をそのまままねるので、例に仕事の場面や特定のハウスを書くと、その日のテーマに関係なく毎日そこへ寄る（#294・#320）。
//   npm run check:prompt
import { readFileSync } from 'node:fs';

const file = process.argv[2] || new URL('../api/jyotish.js', import.meta.url);
const src = readFileSync(file, 'utf8');
// ハウスごとの生活領域の表は、領域名として仕事の語を含んでよい
const body = src.replace(/const HOUSE_DOMAIN = \{[\s\S]*?\n\};/, '');

const SCENE = /上司|部下|同僚|職場|会議|仕事|取引先|指摘|残業|納期|商談|第\s*\d+\s*ハウス|ハウスへ移/;
const problems = [];
const lineOf = (i) => body.slice(0, i).split('\n').length;

// 「例:「…」」「（例: …）」の中身に、特定の生活場面・ハウスを書かない
for (const m of body.matchAll(/例[:：]?\s*[「『]?/g)) {
  const rest = body.slice(m.index + m[0].length, m.index + m[0].length + 160);
  const end = rest.search(/[」』）)]/);
  const example = end === -1 ? rest : rest.slice(0, end);
  if (SCENE.test(example)) problems.push(`行${lineOf(m.index)}付近の例文: ${example.slice(0, 60)}`);
}
// 例文の外でも、仕事の場面を名指しする語はプロンプトに入れない
for (const m of body.matchAll(/上司|部下|同僚|指摘|会議|残業|納期|商談|取引先/g)) {
  problems.push(`行${lineOf(m.index)}付近に「${m[0]}」`);
}

if (problems.length) {
  console.error('毎日の鑑定プロンプトに、特定の場面やハウスを書いた例文があります（例文は領域を限定しない書き方にしてください）:\n' + problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log('鑑定プロンプトの例文の検査に合格しました');
