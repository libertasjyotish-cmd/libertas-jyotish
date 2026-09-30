// 年間運勢・相性鑑定の章定義（CommonJS）。生成の仕組み・安全規則は _report.js と共通。
// 章 id は台帳の列（summary, ch1〜ch12）に順番で対応させるため、どの商品も summary + ch1〜 の形にする。

const RELATION_JA = {
  romance: '恋愛・結婚のパートナー',
  friend: '友人',
  business: '仕事・ビジネスのパートナー',
  general: '種類を特定しない二人の関係'
};

// 月別データ: 月から見たハウスに加えて、出生図の惑星と同じサインに重なる通過惑星（natalHits）と、
// 木星・土星の位置から機械的に出した「動きやすさ」（momentum）を渡し、月ごとの読みに固有の根拠を持たせる。
const { SIGN_LORD, HOUSE_DOMAIN } = require('./_dictionaries.js');

// 惑星がその室に持ち込むもの（前向きな軸で。土星は「引き締め」ではなく「長く残る形にする」）
const PLANET_BRINGS = {
  Sun: '役割・自信・表に出ること', Moon: '気持ち・暮らし・人気', Mars: '行動・決着・勝ち取る力', Mercury: '言葉・学び・やり取り・判断',
  Jupiter: '広がり・恵み・後押し', Venus: '豊かさ・楽しみ・魅力・実入り', Saturn: '持続・積み上げ・長く残る形',
  Rahu: '新しい欲求・拡張・未知の領域', Ketu: '手放し・熟練・身軽さ'
};

const SIGN_ORDER = Object.keys(SIGN_LORD);
const houseFromKeys = (from, to) => (from && to ? ((SIGN_ORDER.indexOf(to) - SIGN_ORDER.indexOf(from) + 12) % 12) + 1 : null);

// 出生図の各惑星を「月から何室にあるか」で要約（月別の根拠を「あなたの出生の○○は○室」と名指しできるように）
const natalCompact = (a) => {
  const natal = (a?.planets || []).filter((p) => p.key !== 'Ascendant');
  const moonKey = a?.moon?.signKey || natal.find((p) => p.key === 'Moon')?.signKey;
  return natal.map((n) => ({
    planet: n.name, sign: n.sign, houseFromMoon: houseFromKeys(moonKey, n.signKey),
    area: HOUSE_DOMAIN.find((h) => h.house === houseFromKeys(moonKey, n.signKey))?.label, nakshatra: n.nakshatra, brings: PLANET_BRINGS[n.key]
  }));
};

// 読者が 1 年以内に「実行したい」行動の種類。判定するのは心の中の決断ではなく、退職を告げる・開業する・契約する・引っ越す・別れを告げる、という実行の月。
// 各月の通過惑星（月からの室）から「実行／避ける」を機械的に判定し、根拠を添えて渡す。
// 木星は在住室と 5・7・9 番目のアスペクト先を照らす。土星は始める行動には時間をかけさせ、終える行動には形を与える。
// solo: その室に支援惑星が入る月は、勤め先を変えるだけでなく自分の名前で始める（独立・開業）後押しでもある。
const DECISIONS = [
  { key: 'work', label: '転職・独立（退職を告げる・新しい立場に就く・開業する）', houses: [10, 6, 1], support: ['Sun', 'Mars', 'Mercury'], solo: [1], contract: true, dasha: true },
  { key: 'move_home', label: '引っ越し（転居・住まいの契約）', houses: [4], support: ['Mars', 'Venus'], contract: true },
  { key: 'partnership', label: '結婚・同居・パートナーとの約束を交わす', houses: [7], support: ['Venus'], contract: true, saturnNeutral: true },
  { key: 'end', label: '別れ・手放す（縁や持ち物の終わりを告げる）', houses: [12, 8], support: ['Mars'], ending: true, dasha: true, jupiterWeak: true },
  { key: 'study', label: '学び直し・資格・遠方へ出る（申し込む・出発する）', houses: [9, 5], support: ['Mercury', 'Sun'] },
  { key: 'money', label: '大きな買い物・借入・資産の動き（契約・支払い）', houses: [2, 11], support: ['Venus', 'Mercury'], contract: true, rahuWary: true }
];
const jupiterLights = (h) => [0, 4, 6, 8].map((d) => ((h - 1 + d) % 12) + 1);

// 各行動について月ごとの得点と根拠を返す（fit: 実行／避ける／null）
const scoreDecisions = (m, dashaChange) => {
  const at = (key) => m.planets.find((p) => p.key === key);
  const out = [];
  for (const d of DECISIONS) {
    let score = 0;
    const why = [];
    const j = at('Jupiter');
    if (j && d.houses.includes(j.houseFromMoon)) { score += d.jupiterWeak ? 1 : 2; why.push(`木星が月から${j.houseFromMoon}室`); }
    else if (j && d.houses.some((h) => jupiterLights(j.houseFromMoon).includes(h))) { score += 1; why.push(`木星（月から${j.houseFromMoon}室）が${d.houses.find((h) => jupiterLights(j.houseFromMoon).includes(h))}室を照らす`); }
    for (const key of d.support) {
      const p = at(key);
      if (p && d.houses.includes(p.houseFromMoon)) { score += 1; why.push(`${p.name}が月から${p.houseFromMoon}室${d.solo?.includes(p.houseFromMoon) ? '（自分の名前で始める後押し）' : ''}`); }
    }
    const s = at('Saturn');
    if (s && d.houses.includes(s.houseFromMoon)) {
      if (d.ending) { score += 1; why.push(`土星が月から${s.houseFromMoon}室（区切りが長く残る形になる）`); }
      else if (!d.saturnNeutral) { score -= 1; why.push(`土星が月から${s.houseFromMoon}室（時間をかけて固める配置）`); }
    }
    const k = at('Ketu');
    if (k && d.houses.includes(k.houseFromMoon)) {
      if (d.ending) { score += 1; why.push(`ケートゥが月から${k.houseFromMoon}室`); }
      else { score -= 1; why.push(`ケートゥが月から${k.houseFromMoon}室（手放しの配置）`); }
    }
    const r = at('Rahu');
    if (d.rahuWary && r && d.houses.includes(r.houseFromMoon)) { score -= 1; why.push(`ラーフが月から${r.houseFromMoon}室（欲が先に立つ配置）`); }
    const me = at('Mercury');
    if (d.contract && me?.retrograde) { score -= 1; why.push('水星が逆行（決めごとは逆行明けに）'); }
    if (d.dasha && dashaChange.length) { score += 1; why.push(`ダシャー切替（${dashaChange.join('・')}）`); }
    out.push({ decision: d.label, score, why: why.join('、'), fit: score >= 2 ? '実行' : score <= -1 ? '避ける' : null });
  }
  return out;
};
// 月別に渡すのは「実行する月」だけ。避ける月と用意するものは第 8 章で扱う（月別に混ぜると本文が手続きの話に乗っ取られる）。
const decisionsForMonth = (m, dashaChange) => scoreDecisions(m, dashaChange).filter((x) => x.fit === '実行').map(({ decision, why }) => ({ decision, why }));

const dashaChangeOf = (a, month) => (a?.dashaChanges || []).filter((c) => c.month === month).map((c) => `${c.level === 'maha' ? 'maha' : 'antar'}:${c.lord}`);

// 1 年分の決断カレンダー: 行動の種類ごとに「実行する月」「避ける月」を列挙する。
// 強く押す月が無い行動でも、読者が知りたいのは「では何月か」なので、得点が最も高い月（負でなく根拠のあるもの）を bestMonths として必ず答える。
const decisionCalendar = (a) => DECISIONS.map((d) => {
  const rows = (a?.months || []).map((m) => ({ month: m.month, hit: scoreDecisions(m, dashaChangeOf(a, m.month)).find((x) => x.decision === d.label) })).filter((r) => r.hit);
  const fmt = (r) => `${r.month}（${r.hit.why}）`;
  const actMonths = rows.filter((r) => r.hit.fit === '実行').map(fmt);
  const avoidMonths = rows.filter((r) => r.hit.fit === '避ける').map(fmt);
  let bestMonths = [];
  if (!actMonths.length) {
    const top = Math.max(...rows.map((r) => r.hit.score));
    if (top >= 0) bestMonths = rows.filter((r) => r.hit.score === top && r.hit.why).slice(0, 3).map(fmt);
  }
  return { decision: d.label, actMonths, bestMonths, avoidMonths };
});

const monthsCompact = (months, a) => months.map((m) => {
  const natal = (a?.planets || []).filter((p) => p.key !== 'Ascendant');
  const moonKey = a?.moon?.signKey || natal.find((p) => p.key === 'Moon')?.signKey;
  const momentum = (a?.turningPoints?.monthlyMomentum || []).find((x) => x.month === m.month);
  const dashaChange = dashaChangeOf(a, m.month);
  return {
    month: m.month,
    momentum: momentum ? momentum.score : undefined,
    dashaChange,
    decisions: decisionsForMonth(m, dashaChange),
    planets: m.planets.map((p) => ({
      planet: p.name, brings: PLANET_BRINGS[p.key], sign: p.sign, house: p.houseFromMoon, area: p.houseFromMoonLabel, retrograde: p.retrograde,
      overNatal: natal.filter((n) => n.signKey === p.signKey).map((n) => `${n.name}(出生でも月から${houseFromKeys(moonKey, n.signKey)}室)`),
      signLordNatal: (() => { const l = natal.find((n) => n.key === SIGN_LORD[p.signKey]); return l ? `${l.name}は出生で月から${houseFromKeys(moonKey, l.signKey)}室` : undefined; })()
    }))
  };
});

const MONTH_SCHEMA = `{
      "overview": "この 3 か月の流れを、この人の出生図（月のサイン・現在のダシャー）に結びつけて。冒頭でこの章が扱う 3 か月（YYYY 年 M 月〜M 月）を明記し、前の四半期から何が変わるかを一文で言う（250文字程度）",
      "howToRead": "この章の月別ブロックの読み方を一文で。各月は『運の動き→星の根拠→この月に実行する行動→一手→逃す行動→あなたへ』の順で、その月に何が入り・決まり・離れるかに絞っていると伝える（100文字以内）",
      "months": [{
        "month": "確定データの YYYY-MM をそのまま",
        "theme": "その月に動く運を一言で（20文字以内）。動く領域は確定データの area と brings から取る。生活態度の語は不可",
        "scene": "その月にこの人の運がどう動くかを『あなたは〜』と言い切る（300文字程度）。必ず含めるのは三つ。(1) 入ってくるもの・決まるもの・離れていくもののうち、配置が示すもの (2) それが起きる生活の場所（area が示す領域そのまま） (3) それがこの人に特に強く起きる理由（natalChart・overNatal・signLordNatal を日常語に直して『あなたは生まれつき〜』）。惑星名・室の数字は使わない。場面は一つ。読者の職業・家族構成・相手の属性は書かない",
        "why": "根拠（150文字程度）。ここだけで惑星名・月から何室（area）・逆行・出生惑星との重なり（overNatal、出生での室も）・ダシャー切替を名指しする",
        "decision": "確定データ decisions にある行動だけを『〜するなら、この月に実行する』と一文で（60文字以内）。decisions が空なら『大きな行動を実行する月ではない』の一文だけ。用意するもの・避ける行動・手続きの話は書かない（第 8 章で扱う）。decisions に無い行動を足さない",
        "move": "scene で言い切った『入る・決まる・離れる』を取りに行く一手（120文字程度）。いつ（上旬・中旬・下旬）・何を・どうするか。決断の手続き（退職・開業・解約・引き継ぎ・書類・契約）の話にしない——それは decision の一文で済んでいる。生活態度の助言は禁止",
        "avoid": "その月の運を取り逃がす行動一つと、逃すと何を失うか（80文字以内）",
        "push": "出生図の強みから背中を押す一言（80文字以内。惑星名は使わない）"
      }]
    }`;

// 年間運勢の語り口。一般的な暦の解説ではなく「この人のこの 1 年」を当てて背中を押す。
const YEARLY_VOICE = {
  ja: `【語り口】
これは暦の解説ではなく、目の前の一人に向けた 1 年の鑑定書です。読者がこれを買うのは、1 年以内に何かを決断し、終え、始めたいからです。次を徹底してください。
1. 読者が知りたいのは「自分の運がいつ・どこで・どう動くか」「やりたい行動（転職・独立・引っ越し・結婚や同居・別れ・学び直し・大きな買い物）を今年やっていいか、何月に実行するか」。月別と決断の章はそれだけを書く。
2. 領域は【確定データ】の area（月から何室）と brings（惑星が持ち込むもの）の掛け合わせで決める。配置が示していない領域は書かない。同じ領域が続くなら続けてよい。変化の演出はしない。
3. 惑星の意味は brings のとおり。土星は持続・積み上げ・長く残る形（引き締め・試練とは書かない）。
4. 金運は配置が財の室（2 室・11 室）や金星・木星の恵みを示す月にだけ、入る・出る・残るの流れとして言い切る。禁止は投資の銘柄・売買時期・利回りの助言のみ。
5. 決断カレンダーが答えるのは「心の中で決める月」ではなく「実行する月」——退職を告げる・新しい立場に就く・開業する・引っ越す・約束を交わす・別れを告げる・申し込む・契約や支払いをする月。「決める」と「動く」を書き分けず、常に「実行する」の意味で書く。向き不向きは【確定データ】の decisions・decisionCalendar のとおりで、そこに無い行動を足さず、ある行動を省かない。実行月は「〜するなら YYYY 年 M 月に実行する」と月を名指しで言い切る（actMonths、無ければ bestMonths を「強い後押しの月は無いが、実行するなら」で）。避ける月は「YYYY 年 M 月には〜を実行しない」の意味であり、「その月まで待つ」「その月を待つ」とは決して書かない（意味が逆になる）。第 8 章では実行月までに手元に要るものを、その行動を実行する当日に無いと困る物一つとして名指しする（同じ物を複数の行動で繰り返さない）。「準備を整える」「慎重に」「様子を見る」で終わる文は禁止。決断は月別では「この月に実行する行動」の一文だけで、月別の本文・一手・避けたいことは決断の手続き（退職・開業・解約・引き継ぎ・書類・契約）ではなく、その月の配置が示す運（何が入り・決まり・離れるか）を書く。読者が転職や別れを考えているとは仮定しない。転職と独立は同じ行動（働き方を変える）として一つにまとめ、why に「自分の名前で始める後押し」がある月は独立・開業にも向くと添える。断定を避けるのは相手の気持ちと成否の保証だけ。
6. 12 か月で同じ型の一手を繰り返さない。前月と同じ相手・同じ手段・同じ動詞なら書き直す。
7. 個人化は出生図からのみ。natalChart（出生惑星の月からの室・ナクシャトラ）・overNatal・signLordNatal を使い、毎月「あなたは生まれつき〜」の一文を必ず入れる（scene では日常語で、why では惑星名で）。誰にでも当たる一般論、複数の立場の列挙は禁止。
8. 読者の職業・雇用・婚姻・子ども・年齢・健康状態を仮定しない。相手を上司・同僚・部下・家族・子どもと固定しない。
9. 生活態度の助言（片づける・言葉に気をつける・体調を整える・見直す・意識する・心がける・慎重に・待つだけ）は禁止。
10. 「でしょう」「可能性があります」を乱用しない。断定を避けるのは健康・寿命・医療・法律・投資・具体的な出来事の成否のみ。
11. 【確定データ】にない惑星・月・配置を発明しない。内部名（momentum・overNatal・strength・score・decisions・fit・actMonths・bestMonths・avoidMonths）や数値を本文に出さない。根拠は惑星名・室・領域の言葉に言い換える。
12. momentum が高い月は強く、低い月は静かに。overNatal に出生惑星がある月は、その惑星の領域が個人的に強く動く月として必ず取り上げる。
13. 月の一覧は複数の章に出る（見取り図＝節目と今年の決断、第 1 章＝周期の切替、第 2 章＝大きな星のサイン移動、第 3〜6 章＝毎月の運と一手、第 8 章＝決断カレンダー、第 9 章＝追い風・慎重）。heading にはその一覧の内容を表す見出し（20 文字以内）、lead にはその一覧が他の章の月別と何が違うかを一文で書く。
14. 語りは古い寺院の占星術師が一人に語りかけるように、品格とです・ます調を維持。命令形は使わない。文字数の目安は下限。要約で埋めず、読者が翌月から使える具体を書く。`,
  en: `[Voice]
This is not an almanac but a one-year reading addressed to one person. People buy it because they want to decide, end or begin something within the year. Follow strictly:
1. The reader wants to know when, where and how their luck moves, and whether the decision they have in mind (changing work, going independent, moving home, marrying or moving in, ending a relationship, retraining, a large purchase) is right for this year and in which month. The monthly blocks and the decision chapter write only that.
2. The life area of each month follows the confirmed data: area (house from the Moon) combined with brings (what the planet carries). Never write an area the placements do not show. If the same area continues, let it continue; do not manufacture variety.
3. Planet meanings follow brings. Saturn is endurance, accumulation and what becomes lasting (never "restriction" or "trial").
4. Write money only in months where the placements point to the 2nd or 11th house or to Venus/Jupiter's gifts, and state it plainly as what comes in, goes out and stays. The only prohibition is advice on specific investments, timing of trades or returns.
5. The decision calendar answers the month to ACT — hand in the resignation, take the new post, open the business, move, make the vow, say goodbye, enrol, sign or pay — not the month to make up one's mind. Never split "decide" from "act"; always write in the sense of carrying it out. Fitness follows the confirmed decisions and decisionCalendar exactly; add nothing, drop nothing. Say plainly "if you move home, do it in <month>" (actMonths, else bestMonths as "no strong push, but if you act, <month>"). An avoid month means "do not carry out X in <month>" — never write "wait until <month>", which reverses the meaning. In chapter 8 only, name the one thing that must be in hand on the day the action is carried out (never the same item for two actions). Sentences that end in "prepare", "be careful" or "watch and see" are banned. In the monthly blocks the decision is a single sentence naming the action to carry out that month; scene, move and avoid describe the month's luck as shown by the placements (what comes in, gets settled, departs) — not the paperwork of resigning, opening a business, cancelling, handing over or signing. Do not assume the reader is contemplating a job change or a break-up. Changing jobs and going independent are one action (changing how one works); where why says the push is for starting under one's own name, add that the month also suits going independent. Reserve caution only for other people's feelings and guarantees of outcome.
6. Never repeat the same type of move across months. If the counterpart, means and verb match the previous month, rewrite it.
7. Individuality comes only from the birth chart. Using natalChart (natal planets by house from the Moon and nakshatra), overNatal and signLordNatal, every month contains one sentence "because you were born with ..." (everyday words in scene, planet names in why). Generic statements and scenes listing several walks of life are forbidden.
8. Never assume the reader's occupation, employment, marriage, children, age or health. Do not fix the counterpart as boss, colleague, subordinate, family or child.
9. Lifestyle advice is banned: tidy up, mind your words, look after your health, review, be aware, be careful, just wait.
10. Do not hedge everything with "may" and "possibly". Reserve caution for health, lifespan, medical, legal, financial matters and the outcome of specific events.
11. Never invent a planet, month or placement absent from the confirmed data. Never expose internal names or numbers (momentum, overNatal, strength, score, decisions, fit, actMonths, bestMonths, avoidMonths); translate evidence into planet, house and life-area words.
12. High-momentum months are written strongly, low-momentum months quietly. When overNatal lists a natal planet, that month stirs that planet's domain personally; say so.
13. Month lists appear in several chapters (overview = turning points and this year's decisions, ch.1 = cycle changes, ch.2 = sign changes of slow planets, ch.3-6 = monthly luck and moves, ch.8 = decision calendar, ch.9 = tailwind/caution). In "heading" name the list (under 6 words); in "lead" say in one sentence how it differs from the other monthly lists.
14. Speak as an old temple astrologer addressing one person, dignified and polite, no imperatives. Character counts are minimums; write specifics the reader can use next month.`
};


const YEARLY_CHAPTERS = [
  {
    id: 'summary',
    title: 'この 1 年の見取り図',
    pick: (a) => ({
      period: a.period, moon: a.moon, ascendant: a.ascendant, currentDasha: a.dasha?.current,
      dashaChanges: a.dashaChanges, slowPlanetsNow: a.slowPlanetsNow, keyShifts: a.keyShifts, sadeSati: a.sadeSati,
      decisionCalendar: decisionCalendar(a)
    }),
    schema: `{
      "catchphrase": "この 1 年のテーマを一文で（30文字以内）",
      "essence": "この 1 年の全体像（250文字程度。期間は確定データの年月のみ）",
      "themes": ["今年の主題（各30文字以内）", "", ""],
      "decisions": { "heading": "見出し（今年やってよい決断・待つ決断。20文字以内）", "lead": "この一覧は今年の大きな決断の可否を先に答えるもので、月ごとの根拠は第 8 章で読むと伝える（80文字以内）", "items": [{ "kind": "決断の種類（decisionCalendar の decision をそのまま）", "text": "必ず『実行するなら YYYY 年 M 月』を先に書く。actMonths があればその月、無ければ bestMonths の月を『強い後押しではないが、実行するならこの月』の趣旨で。avoidMonths は『YYYY 年 M 月には実行しない』と書く。actMonths・bestMonths ともに無い場合だけ『今年は星が押しも止めもしない。自分の時計で実行していい』（100文字以内）" }] },
      "keyMonths": { "heading": "見出し（例: 節目になる月。20文字以内）", "lead": "この一覧が何を示すか。年を大きく動かす月だけを拾ったもので、毎月の詳細は第 3〜6 章で読む、と伝える（80文字以内）", "items": [{ "month": "確定データの YYYY-MM をそのまま", "text": "その月が節目になる理由（80文字以内）" }] },
      "structure": { "heading": "見出し（例: この鑑定書の読み進め方。20文字以内）", "text": "章の役割分担を読者に案内する：第 1 章は運気の周期（ダシャー）とその切替月、第 2 章は木星・土星・ラーフ・ケートゥの位置とサイン移動の月（年の背景）、第 3〜6 章は 12 か月を毎月の場面と一手で（ここが本体）、第 7 章は領域別に縦に読み直し、第 8 章は転職・引っ越しなどの行動を実行する月と実行しない月、第 9 章は追い風・慎重の月と今年の約束。同じ月が複数の章に出るのは角度が違うためだと短く断りを入れる（200文字程度）" },
      "stance": "この 1 年を過ごす基本姿勢（150文字程度）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 いま流れている周期',
    pick: (a) => ({ currentDasha: a.dasha?.current, upcoming: a.dasha?.upcoming, dashaChanges: a.dashaChanges, strength: a.strength?.slice(0, 3) }),
    schema: `{
      "intro": "ダシャー（運気の周期）の考え方と、今年の周期の位置づけ（250文字程度）",
      "current": "現在の大周期・中周期が今年にもたらす主題（400文字程度）",
      "changes": { "heading": "見出し（例: 周期が切り替わる月。20文字以内）", "lead": "この一覧はダシャー（運気の周期）の支配星が交代する月であって、毎月の星の移動とは別であること、切替がない年はその旨を伝える（80文字以内）", "items": [{ "month": "確定データの YYYY-MM をそのまま", "text": "その切り替わりで変わる空気と準備（150文字程度）" }] },
      "closing": "周期の流れを味方にする心構え（150文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 今年の大きな星の動き',
    pick: (a) => ({ slowPlanetsNow: a.slowPlanetsNow, keyShifts: a.keyShifts, sadeSati: a.sadeSati, moon: a.moon }),
    schema: `{
      "intro": "木星・土星・ラーフ・ケートゥの位置が 1 年の背景を作るという説明（200文字程度）",
      "jupiter": "木星の位置（月から見たハウス）が広げてくれる領域（300文字程度）",
      "saturn": "土星の位置が鍛える領域と、サディサティの該当状況（300文字程度。該当が無ければその旨を短く）",
      "nodes": "ラーフ・ケートゥの軸が示す、追いかけるものと手放すもの（250文字程度）",
      "shifts": { "heading": "見出し（例: 大きな星がサインを移る月。20文字以内）", "lead": "この一覧は木星・土星・ラーフ・ケートゥがサインを跨ぐ月（年の背景が変わる節）であって、毎月の場面は第 3〜6 章で読むと伝える（80文字以内）", "items": [{ "month": "確定データの YYYY-MM をそのまま", "text": "そのサイン移動が生活のどこに効くか（150文字程度）" }] }
    }`
  },
  {
    id: 'ch3',
    title: '第3章 第1四半期（最初の 3 か月）',
    pick: (a) => ({ months: monthsCompact(a.quarters[0].months, a), natalChart: natalCompact(a), moon: a.moon, currentDasha: a.dasha?.current, strength: a.strength?.slice(0, 3) }),
    schema: MONTH_SCHEMA
  },
  {
    id: 'ch4',
    title: '第4章 第2四半期',
    pick: (a) => ({ months: monthsCompact(a.quarters[1].months, a), natalChart: natalCompact(a), moon: a.moon, currentDasha: a.dasha?.current, strength: a.strength?.slice(0, 3) }),
    schema: MONTH_SCHEMA
  },
  {
    id: 'ch5',
    title: '第5章 第3四半期',
    pick: (a) => ({ months: monthsCompact(a.quarters[2].months, a), natalChart: natalCompact(a), moon: a.moon, currentDasha: a.dasha?.current, strength: a.strength?.slice(0, 3) }),
    schema: MONTH_SCHEMA
  },
  {
    id: 'ch6',
    title: '第6章 第4四半期',
    pick: (a) => ({ months: monthsCompact(a.quarters[3].months, a), natalChart: natalCompact(a), moon: a.moon, currentDasha: a.dasha?.current, strength: a.strength?.slice(0, 3) }),
    schema: MONTH_SCHEMA
  },
  {
    id: 'ch7',
    title: '第7章 テーマ別の 1 年（仕事・お金・人間関係・心身）',
    pick: (a) => ({
      slowPlanetsNow: a.slowPlanetsNow, keyShifts: a.keyShifts, currentDasha: a.dasha?.current,
      months: a.months.map((m) => ({ month: m.month, jupiter: m.planets.find((p) => p.key === 'Jupiter')?.houseFromMoonLabel, saturn: m.planets.find((p) => p.key === 'Saturn')?.houseFromMoonLabel, venus: m.planets.find((p) => p.key === 'Venus')?.houseFromMoonLabel, mars: m.planets.find((p) => p.key === 'Mars')?.houseFromMoonLabel }))
    }),
    schema: `{
      "intro": "この章の役割：第 3〜6 章で月順に読んだ同じ 1 年を、今度は領域別に縦に読み直すと伝える（80文字以内）",
      "work": { "heading": "見出し（例: 仕事・外での役割。20文字以内）", "text": "仕事・社会的な立場（働いていない人なら外での役割・人からの評価・引き受けごと）の 1 年の流れと、力を入れる時期（350文字程度。職種名や雇用の形は断定しない）" },
      "money": { "heading": "見出し（例: お金。20文字以内）", "text": "収入と支出の流れ、整えるべき時期（300文字程度。投資助言は書かない）" },
      "relationships": { "heading": "見出し（例: 人間関係・パートナー。20文字以内）", "text": "人間関係・パートナーシップの流れ（300文字程度）" },
      "wellbeing": { "heading": "見出し（例: 心と体。20文字以内）", "text": "心身のリズムと休息を優先したい時期（250文字程度。医療的な表現は書かない）" }
    }`
  },
  {
    id: 'ch8',
    title: '第8章 決断カレンダー（転職・独立・引っ越し・縁・別れ・学び・大きな買い物）',
    pick: (a) => ({
      period: a.period, currentDasha: a.dasha?.current, sadeSati: a.sadeSati,
      scale: a.turningPoints?.scale, turningEvents: a.turningPoints?.events,
      decisionCalendar: decisionCalendar(a), natalChart: natalCompact(a),
      strength: a.strength?.slice(0, 3)
    }),
    schema: `{
      "verdict": "scale が major なら「動く年」、moderate なら「一部の領域で動く年」、preparation なら「次の転機に向けて仕込む年」と確定データのまま判定し、根拠の配置（惑星名・月から何室・切替のダシャー）を名指しする（250文字程度）",
      "calendar": { "heading": "見出し（20文字以内）", "lead": "この一覧は行動の種類ごとに今年『実行する月』『実行しない月』を答えるもの（心の中で決める月ではなく、告げる・契約する・移る月）で、第 3〜6 章の月別とは軸が違うと伝える（80文字以内）", "items": [{ "kind": "decisionCalendar の decision をそのまま", "text": "三段で書く。(1) 実行するなら何月か: actMonths があれば『〜するなら YYYY 年 M 月に実行する』、無ければ bestMonths の月を『強い後押しの月は無いが、実行するなら YYYY 年 M 月』と、根拠（why の惑星名・室）を添えて言い切る。why に『自分の名前で始める後押し』がある月は独立・開業にも向くと添える (2) 実行しない月: avoidMonths を『YYYY 年 M 月には〜を実行しない（理由）』の形で。『その月まで待つ』とは書かない (3) 実行月までに手元に要るもの: その行動を実行する当日に無いと困る物を、この人の出生図（natalChart）の弱い所から一つ名指しする（行動ごとに別の物）。『準備を整える』『慎重に』で終えない。actMonths・bestMonths・avoidMonths がすべて無い場合だけ『今年は星が押しも止めもしない』とし、(3) だけ書く（280文字程度）" }] },
      "prepare": "この人の出生図で最も弱い領域（natalChart）を補うために年内に手に入れておくもの一つ（200文字程度。items で挙げた物を繰り返さない）",
      "message": "決断を迫らず、しかし背中を押す締めの言葉（150文字程度）"
    }`
  },
  {
    id: 'ch9',
    title: '第9章 この 1 年を最大限に活かすために',
    pick: (a) => ({ keyShifts: a.keyShifts, dashaChanges: a.dashaChanges, strength: a.strength?.slice(0, 3), period: a.period }),
    schema: `{
      "bestMonths": { "heading": "見出し（例: 追い風の月。20文字以内）", "lead": "この一覧は 1 年を通して最も動きやすい月を 2〜3 つに絞ったものだと伝える（60文字以内）", "items": [{ "month": "確定データの YYYY-MM をそのまま", "text": "追い風になる理由と使い方（100文字以内）" }] },
      "careMonths": { "heading": "見出し（例: 慎重に進めたい月。20文字以内）", "lead": "この一覧は止まる月ではなく整える月だと伝える（60文字以内）", "items": [{ "month": "確定データの YYYY-MM をそのまま", "text": "慎重に進めたい理由と整え方（100文字以内）" }] },
      "actions": ["今年の具体的な行動指針（各60文字以内。『いつ・何を』まで書く）", "", ""],
      "oneThing": "今年これだけは、と一つに絞った約束（100文字程度。根拠の配置を添える）",
      "closing": "1 年の終わりにこの人がどこに立っているか、その姿を描いて背中を押す（250文字程度）"
    }`
  }
];

const relationOf = (a) => RELATION_JA[a.relation] || RELATION_JA.general;
const person = (p) => ({ label: p.label, ascendant: p.ascendant, moon: p.moon, sun: p.sun, nakshatra: p.nakshatra, strength: p.strength });

const COMPAT_CHAPTERS = [
  {
    id: 'summary',
    title: '二人の関係の見取り図',
    pick: (a) => ({
      relation: relationOf(a), personA: person(a.personA), personB: person(a.personB),
      moonDistance: a.moonDistance, lagnaDistance: a.lagnaDistance,
      matching: a.relation === 'romance' ? { total: a.matching.total, max: a.matching.max, band: a.matching.band } : undefined
    }),
    schema: `{
      "catchphrase": "この二人の関係を一文で表す見出し（30文字以内）",
      "essence": "関係の本質（250文字程度。関係の種類に沿って書く。性別には触れない）",
      "strengths": ["二人の強み（各30文字以内）", "", ""],
      "growth": ["育てていける領域（各30文字以内）", ""],
      "stance": "この関係を良くする基本姿勢（150文字程度）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 それぞれの設計図',
    pick: (a) => ({ relation: relationOf(a), personA: person(a.personA), personB: person(a.personB) }),
    schema: `{
      "personA": "A の本質（ラグナ・月・太陽から。300文字程度）",
      "personB": "B の本質（ラグナ・月・太陽から。300文字程度）",
      "contrast": "二人の気質の似ている点と異なる点（300文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 心の噛み合わせ（月と月）',
    pick: (a) => ({ relation: relationOf(a), moonA: a.personA.moon, moonB: a.personB.moon, moonDistance: a.moonDistance, nakshatraA: a.personA.nakshatra, nakshatraB: a.personB.nakshatra }),
    schema: `{
      "intro": "月同士の位置関係（何番目のサインか）が感情の相性を示すという説明（200文字程度）",
      "text": "二人の月の関係から見た、安心の与え方・受け取り方（400文字程度）",
      "care": "感情がすれ違いやすい場面と、その整え方（250文字程度）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 相手が自分にもたらすもの',
    pick: (a) => ({ relation: relationOf(a), overlayAonB: a.overlayAonB, overlayBonA: a.overlayBonA }),
    schema: `{
      "intro": "相手の惑星が自分のどのハウス（領域）に入るかを見るという説明（200文字程度）",
      "aToB": "A の主要な惑星が B の生活のどの領域を動かすか（350文字程度。惑星名・領域は確定データのものだけ）",
      "bToA": "B の主要な惑星が A の生活のどの領域を動かすか（350文字程度）",
      "balance": "与えるものと受け取るものの釣り合い（200文字程度）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 会話と価値観（水星・太陽・木星）',
    pick: (a) => ({ relation: relationOf(a), A: { sun: a.personA.sun, mercury: a.personA.mercury, jupiter: a.personA.planets?.find((p) => p.key === 'Jupiter') }, B: { sun: a.personB.sun, mercury: a.personB.mercury, jupiter: a.personB.planets?.find((p) => p.key === 'Jupiter') } }),
    schema: `{
      "communication": "話し方・考え方の型の違いと、伝わりやすい伝え方（350文字程度）",
      "values": "大切にしているもの・判断基準の重なりと差（300文字程度）",
      "tips": ["すれ違いを防ぐ具体的な工夫（各40文字以内）", "", ""]
    }`
  },
  {
    id: 'ch5',
    title: '第5章 行動と情熱（火星・金星）',
    pick: (a) => ({ relation: relationOf(a), A: { mars: a.personA.mars, venus: a.personA.venus }, B: { mars: a.personB.mars, venus: a.personB.venus } }),
    schema: `{
      "energy": "行動のテンポ・決断の仕方の相性（300文字程度）",
      "affection": "関係の種類に沿った「好意・信頼の示し方」の相性（300文字程度。恋愛以外では友情・協働の温度感として書く）",
      "friction": "衝突しやすいパターンと、その収め方（250文字程度）"
    }`
  },
  {
    id: 'ch6',
    title: '第6章 責任と長続きの条件（土星）',
    pick: (a) => ({ relation: relationOf(a), saturnA: a.personA.saturn, saturnB: a.personB.saturn, mangalA: a.personA.mangalDosha, mangalB: a.personB.mangalDosha, dashaA: a.personA.currentDasha, dashaB: a.personB.currentDasha }),
    schema: `{
      "commitment": "責任の引き受け方・約束への姿勢の相性（300文字程度）",
      "timing": "二人が今それぞれどの周期にいて、関係にどう影響するか（300文字程度）",
      "longevity": "関係を長く続けるための土台（250文字程度）"
    }`
  },
  {
    id: 'ch7',
    title: '第7章 この縁の意味（二人が出会った理由）',
    pick: (a) => ({
      relation: relationOf(a), karmic: a.karmic, moonDistance: a.moonDistance, lagnaDistance: a.lagnaDistance,
      nakshatraA: a.personA.nakshatra, nakshatraB: a.personB.nakshatra,
      rahuA: a.personA.rahu?.sign, ketuA: a.personA.ketu?.sign, rahuB: a.personB.rahu?.sign, ketuB: a.personB.ketu?.sign
    }),
    schema: `{
      "whyMet": "確定データ（相手の月・太陽・金星が自分の月から何室か、ラーフ・ケートゥ軸の重なり）から読む、この二人が出会った意味（350文字程度。前世の断定はしない。関係の種類に沿って書く）",
      "lesson": "この関係がそれぞれに教えてくれること（AとBそれぞれについて、合計300文字程度）",
      "bonds": ["この縁を結ぶ具体的な配置とその意味（各 60 文字以内。確定データにあるものだけ）", "", ""],
      "destiny": "この縁を活かしたときに二人が到達できる場所（250文字程度。希望を持てる語調で、断定はしない）"
    }`
  },
  {
    id: 'ch8',
    title: '第8章 関係が動く時期（今後 12 か月）',
    pick: (a) => ({
      relation: relationOf(a), period: a.period, dashaChanges: a.dashaChanges,
      currentDashaA: a.personA.currentDasha, currentDashaB: a.personB.currentDasha,
      timeline: a.timeline.map((m) => ({
        month: m.month,
        ...Object.fromEntries(m.planets.map((p) => [p.planetKey, `A:${p.houseFromMoonA}室 B:${p.houseFromMoonB}室${p.retrograde ? ' R' : ''}`]))
      }))
    }),
    schema: `{
      "overview": "今後 12 か月の二人の関係の大きな流れ（250文字程度。二人のダシャーと木星・土星の位置から）",
      "phases": [{ "month": "確定データの YYYY-MM をそのまま", "phase": "局面の名前（15文字以内。例: 近づく時期、試される時期、決める時期）", "text": "その月に何が起こりやすく、二人がどう動くと良いか（120文字以内。金星・木星・土星のハウスやダシャー切替を根拠に）" }],
      "bestWindow": "関係を一歩進める（深める・始める・決める）のに最も向く月とその理由（150文字程度。YYYY-MM を明記）",
      "careWindow": "話し合いを急がず、距離を整えたい月とその理由（150文字程度。YYYY-MM を明記。恐れを煽る表現は使わない）"
    }`
  },
  {
    id: 'ch9',
    title: '第9章 この関係を育てるために',
    pick: (a) => ({ relation: relationOf(a), moonDistance: a.moonDistance, overlayAonB: a.overlayAonB.slice(0, 3), overlayBonA: a.overlayBonA.slice(0, 3), band: a.matching.band }),
    schema: `{
      "roles": "二人の自然な役割分担（300文字程度。関係の種類に沿って書く）",
      "rituals": ["関係を良く保つ習慣・約束ごと（各40文字以内）", "", ""],
      "whenHard": "うまくいかない時期の乗り越え方（250文字程度）",
      "closing": "二人へのメッセージ（200文字程度）"
    }`
  },
  {
    id: 'ch10',
    title: '第10章 伝統的な相性指標（36 点法）',
    pick: (a) => ({ relation: relationOf(a), matching: a.matching }),
    schema: `{
      "intro": "36 点法（アシュタクータ）とは何か、結婚向けの伝統指標であり関係の種類によっては参考程度に読むこと（200文字程度）",
      "total": "合計点の読み方（150文字程度。点数は確定データのものだけ）",
      "items": [{ "name": "確定データの項目名をそのまま", "text": "その項目の点数が示すこと（120文字程度）" }],
      "closing": "点数に振り回されないための視点（150文字程度）"
    }`
  }
];

// 36 点法（第10章）は結婚向けの伝統指標なので、恋愛・結婚以外の関係では省く
function compatChapterIdsFor(relation) {
  return COMPAT_CHAPTERS.filter((c) => c.id !== 'ch10' || relation === 'romance').map((c) => c.id);
}

const careerHouse = (a, n) => (a.careerHouses || []).find((h) => h.house === n) || null;

const CAREER_CHAPTERS = [
  {
    id: 'summary',
    title: 'あなたの天職の見取り図',
    pick: (a) => ({
      ascendant: a.ascendant, moon: a.moon, sun: a.sun, nakshatra: a.nakshatra,
      tenth: careerHouse(a, 10), second: careerHouse(a, 2), eleventh: careerHouse(a, 11),
      strongest: a.strength?.slice(0, 3), currentDasha: a.dasha?.current
    }),
    schema: `{
      "catchphrase": "この人の働き方を一文で（30文字以内）",
      "essence": "10 室・2 室・11 室の支配星と在住惑星、最も強い惑星から読む、仕事人生の全体像（300文字程度。職種名は断定しない）",
      "callingType": "天職の型（創る／伝える／整える／導く／支える／探究する のいずれか。確定データに従う）",
      "gifts": ["仕事で武器になる資質（各30文字以内）", "", ""],
      "stance": "仕事とお金に向き合う基本姿勢（150文字程度）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 天職の型（10 室と支配星）',
    pick: (a) => ({ tenth: careerHouse(a, 10), koto: a.boosters?.koto, sun: a.sun, strongest: a.strength?.slice(0, 3), d10Available: Boolean(a.charts?.d10) }),
    schema: `{
      "intro": "10 室（仕事・社会的な立場）の読み方（150文字程度）",
      "text": "10 室のサイン・支配星・その支配星の在住ハウスと品位から、どんな役割で力が出るか（500文字程度。職種名は断定せず、向く仕事の性質で書く）",
      "fields": ["向いている仕事の領域・性質（各40文字以内。例: 人に教える・伝える仕事）", "", ""],
      "avoid": "消耗しやすい働き方（200文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 才能と技能（3 室・5 室・最強の惑星）',
    pick: (a) => ({ third: careerHouse(a, 3), fifth: careerHouse(a, 5), strength: a.strength, mercury: a.planets?.find((p) => p.key === 'Mercury'), mars: a.planets?.find((p) => p.key === 'Mars') }),
    schema: `{
      "talents": [{ "name": "才能の名前（20文字以内）", "text": "その才能の根拠となる配置と、仕事での使い方（150文字程度）" }],
      "learning": "学び方・スキルの伸ばし方の向き（250文字程度）",
      "hidden": "まだ使い切っていない才能（200文字程度）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 雇われるか、独立するか（6 室・7 室・10 室）',
    pick: (a) => ({ sixth: careerHouse(a, 6), seventh: careerHouse(a, 7), tenth: careerHouse(a, 10), saturn: a.planets?.find((p) => p.key === 'Saturn'), rahu: a.planets?.find((p) => p.key === 'Rahu') }),
    schema: `{
      "intro": "6 室（勤め・奉仕）と 7 室（取引・パートナー）と 10 室の力関係の読み方（150文字程度）",
      "text": "組織で働く・独立する・共同経営するのどれに適性が寄るか、確定データの根拠を示して（450文字程度。断定ではなく「寄る」）",
      "conditions": ["独立や転職を考えるときに満たしておきたい条件（各40文字以内）", "", ""],
      "team": "上司・同僚・取引相手との関わり方の型（200文字程度）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 お金の型（2 室・11 室・アシュタカヴァルガ）',
    pick: (a) => ({ second: careerHouse(a, 2), eleventh: careerHouse(a, 11), ashtakavarga: a.ashtakavarga, venus: a.planets?.find((p) => p.key === 'Venus'), jupiter: a.planets?.find((p) => p.key === 'Jupiter') }),
    schema: `{
      "intro": "2 室（自分で稼ぐ・蓄える）と 11 室（得る・人脈）の読み方（150文字程度）",
      "earning": "収入が入りやすい経路（労働・専門技能・人脈・仕組み など）と根拠（350文字程度。投資助言は書かない）",
      "keeping": "貯める・守る力と、支出が膨らみやすい条件（300文字程度）",
      "scores": "アシュタカヴァルガの 2 室・10 室・11 室の点数（確定データのものだけ）が示す厚み（200文字程度）",
      "advice": ["金運を活かす行動（各40文字以内）", "", ""]
    }`
  },
  {
    id: 'ch5',
    title: '第5章 仕事人生の周期（ダシャー）',
    pick: (a) => ({ current: a.dasha?.current, upcoming: a.dasha?.upcoming, timeline: a.dasha?.timeline, tenth: careerHouse(a, 10), second: careerHouse(a, 2) }),
    schema: `{
      "intro": "ダシャー（運気の周期）が仕事に与える影響の考え方（200文字程度）",
      "now": "現在の大周期・中周期の支配星が 10 室・2 室とどう関わり、仕事の今をどう作っているか（400文字程度）",
      "periods": [{ "lord": "確定データの支配星名をそのまま", "text": "その周期に仕事・収入がどう動きやすいか（150文字程度。年は確定データのもの）" }],
      "golden": "仕事の上で最も実りやすい周期とその使い方（250文字程度）"
    }`
  },
  {
    id: 'ch6',
    title: '第6章 キャリアが動く時期（今後 12 か月）',
    pick: (a) => ({
      period: a.period, careerWindows: a.careerWindows, dashaChanges: a.dashaChanges, currentDasha: a.dasha?.current,
      transits: (a.careerTransits || []).map((m) => ({ month: m.month, ...Object.fromEntries(m.planets.map((p) => [p.planetKey, `L${p.houseFromLagna}/M${p.houseFromMoon}${p.retrograde ? ' R' : ''}`])) }))
    }),
    schema: `{
      "overview": "今後 12 か月のキャリアの大きな流れ（250文字程度。期間は確定データの年月のみ）",
      "windows": [{ "month": "確定データの YYYY-MM をそのまま", "kind": "転職に向く・独立の準備・昇進や評価・収入の見直し・学び直し など（30文字以内）", "text": "なぜその月か（木星・土星のハウス、ダシャー切替）と、どう動くとよいか（180文字程度）" }],
      "bestMonth": "大きな決断に最も向く月とその根拠（150文字程度。該当が無ければ「今期は準備期」と正直に）",
      "holdMonth": "急がない方がよい月または領域と根拠（120文字程度。無ければ短く）"
    }`
  },
  {
    id: 'ch7',
    title: '第7章 天職に近づくための行動計画',
    pick: (a) => ({ strongest: a.strength?.slice(0, 3), tenth: careerHouse(a, 10), koto: a.boosters?.koto, careerWindows: a.careerWindows?.slice(0, 3) }),
    schema: `{
      "now": ["今から 3 か月でできること（各40文字以内）", "", ""],
      "year": ["この 1 年で整えること（各40文字以内）", "", ""],
      "habit": "天職の型に合った働き方の習慣（250文字程度）",
      "message": "決断を迫らず、しかし背中を押す締めの言葉（200文字程度）"
    }`
  }
];

module.exports = { YEARLY_CHAPTERS, YEARLY_VOICE, COMPAT_CHAPTERS, CAREER_CHAPTERS, compatChapterIdsFor, RELATION_JA };
