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
const dashaChangeOf = (a, month) => (a?.dashaChanges || []).filter((c) => c.month === month).map((c) => `${c.level === 'maha' ? 'maha' : 'antar'}:${c.lord}`);

// 1 年分の決断カレンダー: 行動の種類ごとに「推す月」と「避ける月」を一つづつ。
// 全月を列挙すると同じ話が 12 回繰り返されるので、最高点（根拠あり・0 以上）と最低点（負）の月だけを選ぶ。同点なら他の行動でまだ使っていない月を取り、6 行動が同じ月に固まらないようにする。
const decisionCalendar = (a) => {
  const used = new Set();
  return DECISIONS.map((d) => {
    const rows = (a?.months || []).map((m) => ({ month: m.month, hit: scoreDecisions(m, dashaChangeOf(a, m.month)).find((x) => x.decision === d.label) })).filter((r) => r.hit && r.hit.why);
    const fmt = (r) => (r ? { month: r.month, why: r.hit.why, strong: r.hit.score >= 2 } : null);
    const pos = rows.filter((r) => r.hit.score >= 0);
    const top = Math.max(-1, ...pos.map((r) => r.hit.score));
    const tied = pos.filter((r) => r.hit.score === top);
    // 同点なら、他の行動が既に使った月から最も離れた月を取る（推し月が年の前半に固まらないように）
    const idx = (mo) => (a?.months || []).findIndex((m) => m.month === mo);
    const dist = (mo) => (used.size ? Math.min(...[...used].map((u) => Math.abs(idx(u) - idx(mo)))) : 0);
    const best = tied.slice().sort((x, y) => dist(y.month) - dist(x.month))[0];
    if (best) used.add(best.month);
    const worst = rows.filter((r) => r.hit.score < 0 && r.month !== best?.month).sort((x, y) => x.hit.score - y.hit.score)[0];
    return { decision: d.label, actMonth: fmt(best), avoidMonth: fmt(worst) };
  });
};

// 月別に渡すのは、その月がカレンダーの「推す月」に選ばれた行動だけ（各行動は 1 年に 1 回しか現れない）。
const decisionsForMonth = (calendar, month) => calendar.filter((c) => c.actMonth?.month === month).map((c) => ({ decision: c.decision, why: c.actMonth.why }));

// その月で最も強い配置を一つ選ぶ（出生惑星と重なる通過惑星をゆっくりの星から優先。無ければ木星）。月別はこの一つだけを書かせる。
const FOCUS_ORDER = ['Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Mars', 'Venus', 'Mercury', 'Sun'];
const focusOf = (planets) => {
  const byKey = (k) => planets.find((p) => p.key === k);
  const hit = FOCUS_ORDER.map(byKey).find((p) => p && p.overNatal.length);
  return hit || byKey('Jupiter') || planets[0];
};

const monthsCompact = (months, a) => {
  const natal = (a?.planets || []).filter((p) => p.key !== 'Ascendant');
  const moonKey = a?.moon?.signKey || natal.find((p) => p.key === 'Moon')?.signKey;
  const calendar = decisionCalendar(a);
  return months.map((m) => {
    const momentum = (a?.turningPoints?.monthlyMomentum || []).find((x) => x.month === m.month);
    const planets = m.planets.map((p) => ({
      key: p.key, planet: p.name, brings: PLANET_BRINGS[p.key], sign: p.sign, house: p.houseFromMoon, area: p.houseFromMoonLabel, retrograde: p.retrograde,
      overNatal: natal.filter((n) => n.signKey === p.signKey).map((n) => `${n.name}(出生でも月から${houseFromKeys(moonKey, n.signKey)}室)`),
      signLordNatal: (() => { const l = natal.find((n) => n.key === SIGN_LORD[p.signKey]); return l ? `${l.name}は出生で月から${houseFromKeys(moonKey, l.signKey)}室` : undefined; })()
    }));
    const f = focusOf(planets);
    return {
      month: m.month,
      momentum: momentum ? momentum.score : undefined,
      dashaChange: dashaChangeOf(a, m.month),
      focus: { planet: f.planet, brings: f.brings, house: f.house, area: f.area, overNatal: f.overNatal, signLordNatal: f.signLordNatal, retrograde: f.retrograde },
      decisions: decisionsForMonth(calendar, m.month),
      planets: planets.map(({ key, ...rest }) => rest)
    };
  });
};

const MONTH_SCHEMA = `{
      "overview": "この 3 か月の流れを、この人の出生図（月のサイン・現在のダシャー）に結びつけて。冒頭でこの章が扱う 3 か月（YYYY 年 M 月〜M 月）を明記し、前の四半期から何が変わるかを一文で言う（250文字程度）",
      "howToRead": "この章の月別ブロックの読み方を一文で。各月は『運の動き→星の根拠→この月に実行する行動→一手→逃す行動→あなたへ』の順で、その月に何が入り・決まり・離れるかに絞っていると伝える（100文字以内）",
      "months": [{
        "month": "確定データの YYYY-MM をそのまま",
        "theme": "focus の配置が動かす運を一言で（20文字以内）。領域は focus.area、中身は focus.brings から。生活態度の語は不可",
        "scene": "この月は focus の配置一つだけを書く（他の惑星には触れない）。その配置でこの人の運がどう動くかを『あなたは〜』と言い切る（250〜300文字。200文字未満は不可）。含めるのは (1) focus.area の領域で、focus.brings が入ってくるのか・決まるのか・離れるのか (2) それがこの人に特に強く起きる理由（focus.overNatal・signLordNatal・natalChart を日常語に直して『あなたは生まれつき〜』）。惑星名・室の数字は使わない。場面は一つ。読者の職業・家族構成・相手の属性は書かない。前の月と同じ領域なら『前月から続いて』と一言でつなぎ、同じ文を繰り返さない",
        "why": "根拠（100文字程度）。focus の惑星名・月から何室（area）・逆行・出生惑星との重なり（overNatal）・ダシャー切替を名指しする",
        "decision": "確定データ decisions がある月だけ、その行動を『〜するなら、この月に実行する』と一文で（60文字以内）。decisions が空の月はこのキーを省略する（何も書かない）。用意するもの・避ける行動・手続きの話は書かない",
        "move": "scene で言い切った運を取りに行く一手（100〜120文字）。いつ（上旬・中旬・下旬）・何を・どうするか。決断の手続き（退職・開業・解約・引き継ぎ・書類・契約）の話にしない。生活態度の助言は禁止。前月と同じ動詞・相手・手段なら書き直す",
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
5. 決断カレンダーが答えるのは「心の中で決める月」ではなく「実行する月」——退職を告げる・新しい立場に就く・開業する・引っ越す・約束を交わす・別れを告げる・申し込む・契約や支払いをする月。「決める」と「動く」を書き分けず、常に「実行する」の意味で書く。向き不向きは【確定データ】の decisions・decisionCalendar のとおりで、そこに無い行動を足さず、ある行動を省かない。行動ごとに推す月は actMonth の一つだけ・避ける月は avoidMonth の一つだけで、他の月を足さない（同じ話を何度も繰り返さない）。実行月は「〜するなら YYYY 年 M 月に実行する」と月を名指しで言い切る（actMonth.strong が false なら「強い後押しの月は無いが、実行するなら」）。避ける月は「YYYY 年 M 月には〜を実行しない」の意味であり、「その月まで待つ」「その月を待つ」とは決して書かない（意味が逆になる）。「準備を整える」「慎重に」「様子を見る」で終わる文は禁止。決断は月別では「この月に実行する行動」の一文だけで、月別の本文・一手・避けたいことは決断の手続き（退職・開業・解約・引き継ぎ・書類・契約）ではなく、その月の配置が示す運（何が入り・決まり・離れるか）を書く。読者が転職や別れを考えているとは仮定しない。転職と独立は同じ行動（働き方を変える）として一つにまとめ、why に「自分の名前で始める後押し」がある月は独立・開業にも向くと添える。断定を避けるのは相手の気持ちと成否の保証だけ。
6. 12 か月で同じ型の一手を繰り返さない。前月と同じ相手・同じ手段・同じ動詞なら書き直す。
7. 個人化は出生図からのみ。natalChart（出生惑星の月からの室・ナクシャトラ）・overNatal・signLordNatal を使い、毎月「あなたは生まれつき〜」の一文を必ず入れる（scene では日常語で、why では惑星名で）。誰にでも当たる一般論、複数の立場の列挙は禁止。
8. 読者の職業・雇用・婚姻・子ども・年齢・健康状態を仮定しない。相手を上司・同僚・部下・家族・子どもと固定しない。
9. 生活態度の助言（片づける・言葉に気をつける・体調を整える・見直す・意識する・心がける・慎重に・待つだけ）は禁止。
10. 「でしょう」「可能性があります」を乱用しない。断定を避けるのは健康・寿命・医療・法律・投資・具体的な出来事の成否のみ。
11. 【確定データ】にない惑星・月・配置を発明しない。内部名（momentum・overNatal・focus・strength・score・decisions・actMonth・avoidMonth）や数値を本文に出さない。根拠は惑星名・室・領域の言葉に言い換える。
12. momentum が高い月は強く、低い月は静かに。overNatal に出生惑星がある月は、その惑星の領域が個人的に強く動く月として必ず取り上げる。
13. 月の一覧は複数の章に出る（見取り図＝節目と今年の決断、第 1 章＝周期の切替、第 2 章＝大きな星のサイン移動、第 3〜6 章＝毎月の運と一手、第 8 章＝決断カレンダー、第 9 章＝追い風・慎重）。heading にはその一覧の内容を表す見出し（20 文字以内）、lead にはその一覧が他の章の月別と何が違うかを一文で書く。
14. 語りは古い寺院の占星術師が一人に語りかけるように、品格とです・ます調を維持。命令形は使わない。文字数の目安は下限。要約で埋めず、読者が翌月から使える具体を書く。`,
  en: `[Voice]
This is not an almanac but a one-year reading addressed to one person. People buy it because they want to decide, end or begin something within the year. Follow strictly:
1. The reader wants to know when, where and how their luck moves, and whether the decision they have in mind (changing work, going independent, moving home, marrying or moving in, ending a relationship, retraining, a large purchase) is right for this year and in which month. The monthly blocks and the decision chapter write only that.
2. The life area of each month follows the confirmed data: area (house from the Moon) combined with brings (what the planet carries). Never write an area the placements do not show. If the same area continues, let it continue; do not manufacture variety.
3. Planet meanings follow brings. Saturn is endurance, accumulation and what becomes lasting (never "restriction" or "trial").
4. Write money only in months where the placements point to the 2nd or 11th house or to Venus/Jupiter's gifts, and state it plainly as what comes in, goes out and stays. The only prohibition is advice on specific investments, timing of trades or returns.
5. The decision calendar answers the month to ACT — hand in the resignation, take the new post, open the business, move, make the vow, say goodbye, enrol, sign or pay — not the month to make up one's mind. Never split "decide" from "act"; always write in the sense of carrying it out. Fitness follows the confirmed decisions and decisionCalendar exactly; add nothing, drop nothing. Each action has exactly one actMonth and at most one avoidMonth; name only those, never other months (do not repeat the same story). Say plainly "if you move home, do it in <month>" (if actMonth.strong is false: "no strong push, but if you act, <month>"). An avoid month means "do not carry out X in <month>" — never write "wait until <month>", which reverses the meaning. Sentences that end in "prepare", "be careful" or "watch and see" are banned. In the monthly blocks the decision is a single sentence naming the action to carry out that month; scene, move and avoid describe the month's luck as shown by the placements (what comes in, gets settled, departs) — not the paperwork of resigning, opening a business, cancelling, handing over or signing. Do not assume the reader is contemplating a job change or a break-up. Changing jobs and going independent are one action (changing how one works); where why says the push is for starting under one's own name, add that the month also suits going independent. Reserve caution only for other people's feelings and guarantees of outcome.
6. Never repeat the same type of move across months. If the counterpart, means and verb match the previous month, rewrite it.
7. Individuality comes only from the birth chart. Using natalChart (natal planets by house from the Moon and nakshatra), overNatal and signLordNatal, every month contains one sentence "because you were born with ..." (everyday words in scene, planet names in why). Generic statements and scenes listing several walks of life are forbidden.
8. Never assume the reader's occupation, employment, marriage, children, age or health. Do not fix the counterpart as boss, colleague, subordinate, family or child.
9. Lifestyle advice is banned: tidy up, mind your words, look after your health, review, be aware, be careful, just wait.
10. Do not hedge everything with "may" and "possibly". Reserve caution for health, lifespan, medical, legal, financial matters and the outcome of specific events.
11. Never invent a planet, month or placement absent from the confirmed data. Never expose internal names or numbers (momentum, overNatal, focus, strength, score, decisions, actMonth, avoidMonth); translate evidence into planet, house and life-area words.
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
      "decisions": { "heading": "見出し（今年やってよい決断・待つ決断。20文字以内）", "lead": "この一覧は今年の大きな決断の可否を先に答えるもので、月ごとの根拠は第 8 章で読むと伝える（80文字以内）", "items": [{ "kind": "決断の種類（decisionCalendar の decision をそのまま）", "text": "『実行するなら YYYY 年 M 月』（actMonth。strong が false なら『強い後押しではないが』を添える）と、avoidMonth があれば『YYYY 年 M 月には実行しない』の二文だけ（80文字以内）。actMonth が無い場合だけ『今年は星が押しも止めもしない。自分の時計で実行していい』" }] },
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
      "calendar": { "heading": "見出し（20文字以内）", "lead": "この一覧は行動の種類ごとに今年『実行する月』と『実行しない月』を一つずつ答えるもの（心の中で決める月ではなく、告げる・契約する・移る月）で、第 3〜6 章の月別とは軸が違うと伝える（80文字以内）", "items": [{ "kind": "decisionCalendar の decision をそのまま", "text": "二段で書く。(1) 実行するなら何月か: actMonth の月を『〜するなら YYYY 年 M 月に実行する』（strong が false なら『強い後押しの月は無いが、実行するなら』）と、根拠（why の惑星名・室）を添えて言い切る。why に『自分の名前で始める後押し』がある月は独立・開業にも向くと添える。他の月は挙げない (2) 実行しない月: avoidMonth があれば『YYYY 年 M 月には〜を実行しない（理由）』の一文。無ければこの段は書かない（『避ける月は無い』とも書かない）。『その月まで待つ』とは書かない。actMonth が無い場合だけ『今年は星が押しも止めもしない。自分の時計で実行していい』（150文字程度）" }] },
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

// 相性鑑定書。中心の問いは「なぜ、この相手と伴になるために出逢ったのか」。
// 2 カテゴリ: romance（恋愛・結婚として見る）／general（関係は決めず、縁の種類から見る）。friend/business は general として扱う。
const who = (a) => (a.relation === 'romance' ? '恋愛・結婚として見る' : '関係は決めず、縁の種類から見る');
const dashaOf = (p) => ({ current: p.currentDasha, upcoming: p.dasha?.upcoming?.slice(0, 8), maha: p.dasha?.timeline?.filter((t) => t.end >= String(new Date().getUTCFullYear())).slice(0, 3) });
const longTermOf = (a) => (a.longTerm || []).map((y) => ({
  year: y.year,
  dashaA: `${y.dashaA.maha || ''}期／${y.dashaA.antar || ''}`, dashaB: `${y.dashaB.maha || ''}期／${y.dashaB.antar || ''}`,
  ...Object.fromEntries(y.planets.map((p) => [p.planet, `${p.sign}（A の月から ${p.houseFromMoonA} 室・B の月から ${p.houseFromMoonB} 室）`]))
}));

const COMPAT_CHAPTERS = [
  {
    id: 'summary',
    title: '二人の縁の見取り図',
    pick: (a) => ({
      category: who(a), personA: person(a.personA), personB: person(a.personB),
      moonDistance: a.moonDistance, lagnaDistance: a.lagnaDistance, karmic: a.karmic,
      dashaA: a.personA.currentDasha, dashaB: a.personB.currentDasha,
      matching: a.relation === 'romance' ? { total: a.matching.total, max: a.matching.max, band: a.matching.band } : undefined
    }),
    schema: `{
      "catchphrase": "この縁を一文で言い切る見出し（30文字以内。例:「生涯の伴走者として結ばれた縁」「仕事で互いを完成させる縁」「学び合うために交わった縁」）",
      "destiny": "冒頭のフック。この出逢いが偶然ではなく星廻りが結び付けたものだと、読者が相手に感じている運命の感覚を肯定しながら言い切る（350文字以上）。必ず確定データの配置を根拠として続け、配置の無い運命論は書かない",
      "evidence": ["偶然ではない根拠となる配置（各70文字以内。例:「お相手の月はあなたの月から7室——向かい合う位置で生まれている」。確定データにあるものだけ。3〜5件）", "", ""],
      "bondType": "この縁の種類を一つに絞って言い切る（400文字以上）。恋愛／生涯のパートナー・家族になる縁／同志・仕事の縁／師弟・学びの縁／短く深い転機の縁 のどれに最も近いか、根拠（お相手の月・太陽・金星があなたの月から何室か、7室に入る惑星、ラーフ・ケートゥの重なり、月同士の距離）を名指しして述べる。カテゴリが恋愛・結婚なら、恋愛としてどこまで進む縁かを言い切る",
      "whyNow": "なぜ今の時期にこの相手と出逢った（関わっている）のか——二人それぞれの現在の惑星期（ダシャー）から（350文字以上）",
      "strengths": ["この縁が持つ強み（各40文字以内）", "", "", ""],
      "tests": ["この縁が試される点（各40文字以内）", "", ""],
      "stance": "この縁を活かす基本姿勢（300文字以上）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 なぜ二人は出逢ったのか',
    pick: (a) => ({ category: who(a), karmic: a.karmic, moonDistance: a.moonDistance, lagnaDistance: a.lagnaDistance, nakshatraA: a.personA.nakshatra, nakshatraB: a.personB.nakshatra, rahuA: a.personA.rahu?.sign, ketuA: a.personA.ketu?.sign, rahuB: a.personB.rahu?.sign, ketuB: a.personB.ketu?.sign }),
    schema: `{
      "intro": "出逢いの意味を出生図のどこから読むか（お相手の月・太陽・金星があなたの月から何室か、7室、ラーフ・ケートゥ軸の重なり）の説明（250文字以上）",
      "whyMet": "この二人が出逢った理由を言い切る（600文字以上）。この出逢いが偶然ではなく星廻りが用意したものであることを、確定データの配置を一つずつ名指しして示し、それぞれが『何のために相手を必要としたか』を具体的な生活の場面（仕事・家庭・学び・回復・挑戦）で書く。前世の出来事は書かない",
      "whatYouBring": "あなたがお相手の人生に持ち込むもの（350文字以上。根拠の配置つき）",
      "whatTheyBring": "お相手があなたの人生に持ち込むもの（350文字以上。根拠の配置つき）",
      "bonds": [{ "name": "縁を結ぶ配置（確定データにあるものだけ。例: お相手の月があなたの月から7室）", "text": "その配置が二人に起こすこと（150文字以上）" }],
      "deeperThanLove": "この結び付きは恋愛という枠より深いか、恋愛そのものか、恋愛とは別の形か——を言い切る（350文字以上。カテゴリが恋愛・結婚なら、恋愛としての深さの到達点を書く）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 それぞれの設計図',
    pick: (a) => ({ category: who(a), personA: person(a.personA), personB: person(a.personB) }),
    schema: `{
      "personA": "あなたの本質（ラグナ・月・太陽・ナクシャトラから。500文字以上。生まれつきの気質、求めているもの、他人には見えにくい内側）",
      "personB": "お相手の本質（同じ観点で 500文字以上）",
      "contrast": "二人の気質の重なりと違い、違いが関係のどこで効くか（450文字以上。具体的な場面で）",
      "mirror": "お相手があなたに映し出すもの——相手を通して初めて見える自分の一面（300文字以上）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 心の噛み合わせ（月と月）',
    pick: (a) => ({ category: who(a), moonA: a.personA.moon, moonB: a.personB.moon, moonDistance: a.moonDistance, nakshatraA: a.personA.nakshatra, nakshatraB: a.personB.nakshatra, sameNakshatra: a.karmic.sameNakshatra }),
    schema: `{
      "intro": "月同士の距離（何番目のサインか）とナクシャトラが感情の相性を示すという説明（250文字以上）",
      "text": "二人の月の距離から見た、安心の与え方・受け取り方、黙っていても通じる領域と通じない領域（600文字以上。具体的な日常場面で）",
      "care": "感情がすれ違う典型的な場面と、その場でどうするか（400文字以上）",
      "home": "同じ空間・同じ時間を過ごすとき二人に起こること（300文字以上。同居・旅行・食事・沈黙など）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 相手が自分の人生のどこを動かすか',
    pick: (a) => ({ category: who(a), overlayAonB: a.overlayAonB, overlayBonA: a.overlayBonA }),
    schema: `{
      "intro": "相手の惑星が自分の月から見てどの室（領域）に入るかを見るという説明（250文字以上）",
      "aToB": "あなたの主要な惑星がお相手の生活のどの領域を動かすか（550文字以上。惑星名・室の領域は確定データのものだけ。領域ごとに実際に起こる出来事で書く）",
      "bToA": "お相手の主要な惑星があなたの生活のどの領域を動かすか（550文字以上）",
      "balance": "与えるものと受け取るものの釣り合い、どちらが先に変わるか（350文字以上）"
    }`
  },
  {
    id: 'ch5',
    title: '第5章 会話と価値観（水星・太陽・木星）',
    pick: (a) => ({ category: who(a), A: { sun: a.personA.sun, mercury: a.personA.mercury, jupiter: a.personA.planets?.find((p) => p.key === 'Jupiter') }, B: { sun: a.personB.sun, mercury: a.personB.mercury, jupiter: a.personB.planets?.find((p) => p.key === 'Jupiter') } }),
    schema: `{
      "communication": "話し方・考え方の型の違い、伝わる伝え方と伝わらない伝え方（500文字以上。具体的な会話場面で）",
      "values": "大切にしているもの・判断基準の重なりと差、意見が割れたとき誰が折れるか（450文字以上）",
      "beliefs": "人生観・信じているものの相性（木星から。350文字以上）",
      "tips": ["すれ違いを防ぐ具体的な工夫（各50文字以内）", "", "", ""]
    }`
  },
  {
    id: 'ch6',
    title: '第6章 情熱と行動（火星・金星）',
    pick: (a) => ({ category: who(a), A: { mars: a.personA.mars, venus: a.personA.venus, mangal: a.personA.mangalDosha }, B: { mars: a.personB.mars, venus: a.personB.venus, mangal: a.personB.mangalDosha } }),
    schema: `{
      "energy": "行動のテンポ・決断の仕方・怒り方の相性（450文字以上）",
      "affection": "好意・信頼・親密さの示し方の相性（450文字以上。カテゴリが恋愛・結婚なら恋愛感情と身体的な親密さの温度感まで、そうでなければ友情・協働・家族的な親しみの温度感として書く）",
      "friction": "衝突しやすいパターン、火種になる言葉・行動、その収め方（400文字以上）",
      "mars": "火星の傷（マンガラ・ドーシャ）の有無を二人同じ重みで扱い、関係にどう出るか（250文字以上。恐れを煽らない）"
    }`
  },
  {
    id: 'ch7',
    title: '第7章 責任と長続きの条件（土星）',
    pick: (a) => ({ category: who(a), saturnA: a.personA.saturn, saturnB: a.personB.saturn, saturnOnMoon: a.karmic.saturnOnMoon, dashaA: a.personA.currentDasha, dashaB: a.personB.currentDasha }),
    schema: `{
      "commitment": "責任の引き受け方・約束への姿勢の相性（450文字以上）",
      "weight": "どちらがこの関係の重さを背負いやすいか、土星が相手の月に重なっていればその意味（350文字以上）",
      "longevity": "関係を長く続ける土台になるもの、逆に長続きを妨げるもの（450文字以上）",
      "endurance": "この縁は時間に耐える縁か、季節の縁か——を言い切る（300文字以上）"
    }`
  },
  {
    id: 'ch8',
    title: '第8章 この縁はどこまで深められるか',
    pick: (a) => ({ category: who(a), karmic: a.karmic, moonDistance: a.moonDistance, lagnaDistance: a.lagnaDistance, overlayAonB: a.overlayAonB, overlayBonA: a.overlayBonA, matching: a.relation === 'romance' ? { total: a.matching.total, max: a.matching.max, band: a.matching.band } : undefined }),
    schema: `{
      "now": "今この縁がどの段階にあるか（300文字以上）",
      "potential": "この縁が到達しうる最も深い形を言い切る（600文字以上。カテゴリが恋愛・結婚なら『結婚・家庭を築く縁か、恋愛で完結する縁か、恋愛では収まらない縁か』を、そうでなければ『生涯の伴走者か、人生の一章を共にする同志か、家族になる縁か、学びを渡して離れる縁か』を、根拠の配置つきで）",
      "conditions": "その深さに至るために必要な条件（400文字以上。二人それぞれが手放すもの・引き受けるもの）",
      "limits": "この縁に無理に求めない方がよいもの（300文字以上。欠点ではなく縁の形として）",
      "sign": "この縁が次の段階へ進んだと分かる具体的な出来事・変化（250文字以上）"
    }`
  },
  {
    id: 'ch9',
    title: '第9章 二人の縁の長期の流れ（今後 10 年）',
    pick: (a) => ({ category: who(a), period: a.period, dashaA: dashaOf(a.personA), dashaB: dashaOf(a.personB), dashaChanges: a.dashaChanges, longTerm: longTermOf(a) }),
    schema: `{
      "intro": "縁は月単位では動かず、二人それぞれの惑星期（ダシャー）の重なりと、土星・木星の数年単位の移動で動くという説明（250文字以上）",
      "overview": "今後 10 年の二人の縁の大きな流れ（500文字以上。二人のダシャーの組み合わせがいつ変わり、関係の性格がどう変わるか）",
      "phases": [{ "name": "確定データの年を使った期間（例: 2026〜2028 年）", "phase": "局面の名前（15文字以内。例: 縁が形になる数年、試される数年、役割が入れ替わる数年、静かに深まる数年）", "text": "その数年に二人の間で起こること、根拠（どちらの何の期か、土星・木星が月から何室か）、その期間の過ごし方（350文字以上）" }],
      "turningPoints": [{ "name": "確定データにある切り替わりの年月（YYYY-MM または YYYY 年）", "text": "何が切り替わり、関係にどう出るか（150文字以上）" }],
      "best": "この縁を一段深める（決める・始める・形にする）のに最も向く年と理由（250文字以上。年を明記）",
      "care": "距離感を整えたい年と理由（250文字以上。年を明記。恐れを煽らない）"
    }`
  },
  {
    id: 'ch10',
    title: '第10章 これからどうすればよいか',
    pick: (a) => ({ category: who(a), karmic: a.karmic, moonDistance: a.moonDistance, overlayAonB: a.overlayAonB.slice(0, 4), overlayBonA: a.overlayBonA.slice(0, 4), dashaA: a.personA.currentDasha, dashaB: a.personB.currentDasha }),
    schema: `{
      "roles": "二人の自然な役割分担（450文字以上。誰が始め、誰が守り、誰が決め、誰が癒すか）",
      "doNow": ["今すぐできる具体的な行動（各60文字以内。『いつ・何を』まで）", "", "", ""],
      "avoid": ["この縁で避けること（各50文字以内）", "", ""],
      "whenHard": "うまくいかない時期の乗り越え方（400文字以上）",
      "promise": "この縁のために、あなたが一つだけ約束すること（250文字以上。根拠の配置つき）",
      "closing": "二人へのメッセージ——この相手との出逢いが偶然ではなく星廻りが結び付けたものであることを、確定データの配置を根拠にもう一度言い切って締める（400文字以上。保証や断定の予言はしない）"
    }`
  },
  {
    id: 'ch11',
    title: '第11章 恋愛・結婚として見る',
    pick: (a) => ({ A: { venus: a.personA.venus, mars: a.personA.mars, jupiter: a.personA.planets?.find((p) => p.key === 'Jupiter'), moon: a.personA.moon, seventh: a.karmic.seventhOfB }, B: { venus: a.personB.venus, mars: a.personB.mars, jupiter: a.personB.planets?.find((p) => p.key === 'Jupiter'), moon: a.personB.moon, seventh: a.karmic.seventhOfA }, moonDistance: a.moonDistance, matching: { total: a.matching.total, max: a.matching.max, band: a.matching.band }, dashaA: dashaOf(a.personA), dashaB: dashaOf(a.personB) }),
    schema: `{
      "attraction": "惹かれ合いの正体と、その持続性（450文字以上。金星・火星・7室に入る相手の惑星から）",
      "marriage": "結婚（生涯の約束）に向く縁かどうかを言い切る（500文字以上。7室に入る惑星・月の距離・金星と木星の状態から。性別による夫・妻の区別はせず、二人を対等に『パートナー』として書く）",
      "family": "家庭を築いたときの形——家の空気、役割、子ども・親との関わり方（400文字以上。子どもの有無は断定しない）",
      "timing": "恋愛・結婚が進む時期（350文字以上。二人のダシャーから年を明記）",
      "advice": "恋愛・結婚として育てるための具体的な助言（350文字以上）"
    }`
  },
  {
    id: 'ch12',
    title: '第12章 伝統的な相性指標（36 点法）',
    pick: (a) => ({ matching: a.matching }),
    schema: `{
      "intro": "36 点法（アシュタクータ）とは何か、結婚向けの伝統指標であること、古典は男女の婚姻を前提に組まれているため参考値として読むこと（250文字以上）",
      "total": "合計点の読み方（200文字以上。点数は確定データのものだけ）",
      "items": [{ "name": "確定データの項目名をそのまま", "text": "その項目の点数が示すこと（150文字以上）" }],
      "closing": "点数に振り回されないための視点（200文字以上）"
    }`
  }
];

// 恋愛・結婚として見る（romance）: 第11・12章を含む。それ以外（general。friend/business も同じ）: 縁の種類から見る 11 章構成
function compatChapterIdsFor(relation) {
  return COMPAT_CHAPTERS.filter((c) => (c.id !== 'ch11' && c.id !== 'ch12') || relation === 'romance').map((c) => c.id);
}

const COMPAT_VOICE = {
  ja: `【語り口】
これは「相性が良いか悪いか」を採点する書ではなく、目の前の一人に「なぜ、この相手と伴になるために出逢ったのか」を言い切る鑑定書です。読者はこの相手に何らかの運命を感じてここに来ています。その直感を、出生図の配置で裏づけ、縁の種類と行き先を名指しすることが仕事です。次を徹底してください。
1. 呼称は「あなた」（A）と「お相手」（B）に固定する。A・B・A様・B様・彼・彼女・夫・妻・旦那・奥さん・男性・女性 など、記号や性別に基づく呼び方は一切使わない。二人の性別は不明として扱い、同性でも異性でも成り立つ文にする。配偶者の象徴は「7室に入る惑星」で読み、金星＝妻・木星＝夫 の男女別の読み方はしない。
2. 縁の種類を言い切る。「恋愛」「生涯のパートナー・家族になる縁」「同志・仕事の縁」「師弟・学びの縁」「短く深い転機の縁」のどれに最も近いかを、各章で曖昧にせず断定する。「〜かもしれません」「〜でしょう」「人それぞれです」で逃げない。断定を避けるのは成否・健康・法律・金銭の保証、前世の出来事、子どもの有無、別れの予告だけ。
3. 具体で書く。抽象語（絆・信頼・成長・尊重）だけの文を禁止し、必ず生活の場面（食卓・移動・仕事の相談・金銭・病気のとき・沈黙・再会・家族の行事）に落として、二人の間に実際に起こる出来事として書く。
4. 根拠を毎段落に添える。「お相手の月があなたの月から7室」「あなたの土星がお相手の月に重なる」のように配置名を名指しし、【確定データ】にない惑星・室・年・点数は書かない。内部名（overlayAonB・karmic・band・houseFromMoonA 等）や英字キーは本文に出さない。
5. 厚く書く。各項目の文字数は下限であり、要約で埋めない。章をまたいで同じ内容を繰り返さず、章ごとに新しい具体を足す。
6. 時期は長期で見る。縁は月単位で近づいたり離れたりしない。二人の惑星期（ダシャー）の重なりと、土星・木星の数年単位の移動だけを根拠に、年単位で「形になる数年／試される数年／深まる数年」と区切る。
7. 語りは古い寺院の占星術師が二人のうちの一人に語りかけるように、品格とです・ます調を保つ。命令形は使わない。締めは読者が「だからこの人と出逢ったのか」と腑に落ちる文で終える。
8. この出逢いが偶然ではなく、星廻りが結び付けたものだと伝える。読者がこの相手に感じている「運命」を肯定し、その感覚の正体を配置で名指しする（例:「お相手の月があなたの月から7室——二人の心は向かい合う位置に置かれて生まれています」「あなたの土星期にお相手の金星期が、お相手の土星期にあなたの金星期が重なる——互いの時を鏡のように持って出逢っています」）。ただし星廻りに無いことは一切書かない。運命を語ってよいのは【確定データ】にある配置・年月の意味としてだけで、前世の物語・魂の約束・「必ず結ばれる」「離れられない」といった断定、成否や幸不幸の保証は書かない。偶然でないことは言い切り、未来は配置の意味として示す。`,
  en: `[Voice]
This is not a scorecard of "good or bad compatibility" but a reading addressed to one person, answering one question: why did you meet this particular person to walk beside them? The reader already senses destiny in this person; your work is to confirm that intuition from the chart and to name the kind of bond and where it leads.
1. Call them "you" (A) and "your partner" (B) throughout. Never use A/B, he/she, husband/wife, man/woman or any gendered word; treat both genders as unknown so the text holds for same-sex and opposite-sex pairs alike. Read the significator of a partner from planets in the 7th house, never from "Venus = wife / Jupiter = husband".
2. Name the kind of bond. State plainly in every chapter whether this is closest to romance, a lifelong partner / family bond, a comrade / work bond, a teacher-student / learning bond, or a brief, deep turning-point bond. Do not hedge with "perhaps", "might", "it depends". Avoid certainty only on guarantees of outcome, health, law, money, past-life events, children, or predictions of separation.
3. Write concretely. Forbid sentences made only of abstractions (bond, trust, growth, respect); anchor everything in scenes — meals, travel, asking for advice at work, money, illness, silence, reunions, family occasions — as events that actually happen between the two.
4. Cite the placement in every paragraph ("your partner's Moon falls in your 7th from the Moon", "your Saturn sits on your partner's Moon"). Never invent planets, houses, years or points absent from the fixed data; never print internal keys.
5. Write thickly: each length guide is a minimum. Never repeat a chapter's content elsewhere; add new concrete detail each chapter.
6. Timing is long-range. A bond does not approach and recede month by month; divide the years only by the overlap of the two people's dasha periods and the multi-year moves of Saturn and Jupiter.
7. Speak as an old temple astrologer addressing one of the two, with dignity and warmth, never in the imperative. End so the reader thinks: so that is why I met this person.
8. Tell the reader this meeting was not chance but arranged by the sky. Affirm the sense of destiny they already feel and name its source in the chart ("your partner's Moon stands in your 7th from the Moon — your hearts were placed facing each other at birth"; "your Saturn period carries their Venus, their Saturn period carries your Venus — you met holding each other's time like a mirror"). But never write what the sky does not show: speak of destiny only as the meaning of placements and dates in the fixed data — no past-life stories, soul contracts, "you will surely be united", "you cannot part", or guarantees of outcome or happiness. State plainly that it is not chance; show the future only as what the placements mean.`
};

const careerHouse = (a, n) => (a.careerHouses || []).find((h) => h.house === n) || null;
const planetOf = (a, k) => a.planets?.find((p) => p.key === k) || null;
const careerCore = (a) => ({
  ascendant: a.ascendant, moon: a.moon, sun: a.sun, nakshatra: a.nakshatra,
  first: careerHouse(a, 1), tenth: careerHouse(a, 10), second: careerHouse(a, 2), eleventh: careerHouse(a, 11),
  strongest: a.strength?.slice(0, 3), currentDasha: a.dasha?.current
});

// 仕事・金運鑑定書の語り口。中心軸は「自己一致＝天職」——出生図が示す資質と、日々やっている仕事・稼ぎ方が一致している状態を天職と呼び、
// その一致がどこで起き、どこでずれるかを具体的な職種名・作業・評価・金銭の流れで言い切る。
const CAREER_VOICE = {
  ja: `【語り口】
これは適性診断ではなく、目の前の一人に向けた「天職と金運」の鑑定書です。中心となる考えは一つ——自己一致感が天職である。出生図が示す資質と、日々やっている仕事・稼ぎ方が一致しているとき、人は苦労を苦労と感じず、周囲からも自然に評価され、お金もその一致の上に積み上がる。この鑑定書の仕事は、その一致がこの人の場合どこで起き、どこでずれるかを、具体的に言い当てることです。次を徹底してください。
1. 職種名を具体的に挙げる。この商品に限り、職種名・役割名（例: 編集者、建築設計、臨床心理士、営業マネージャー、料理人、通訳、個人事業の講師）を複数、根拠つきで書いてよい。ただし根拠を【確定データ】の室・支配星・品位・在住惑星・ナクシャトラ・ダシャーで必ず示し、出生図が支えない職種は書かない。企業名・団体名・資格名の断定は書かない。
2. 「向く職種」だけで終わらせない。何をしているときに力が出るか／何をしていれば苦にならないか／どんな環境・相手・速度・裁量なら自己一致が起きるか／逆に何が消耗の原因になるか——を、仕事の場面の具体（会議・制作・交渉・数字・現場・文章・人前・一人作業 など）で書く。
3. 人からどう見られているかを書く。周囲（依頼する側・一緒に働く人・顧客・部下にあたる人）がこの人をどう評価し、何を頼み、どこを誤解しやすいかを、1 室・7 室・10 室と在住惑星から言い切る。本人が自覚していない評価を一つ以上含める。
4. 金運は厚く書く。稼ぎ方の型（技能で稼ぐ・人を介して稼ぐ・仕組みで稼ぐ・名声で稼ぐ 等）、収入が入りやすい経路、何に値段がつくか、仕事と収入が結びつく条件、収入が増えやすい周期や月、漏れやすい癖と守り方、自己一致していると収入がどう変わるか、を 2 室・11 室・金星・木星・アシュタカヴァルガ・ダシャーから具体的に。禁止は投資の銘柄・売買時期・利回り・元本の保証、税務・契約の可否の断定だけで、お金の流れそのものは遠慮なく言い切る。
5. 厚く、熱く。要約で埋めず、各項目の文字数の目安は下限とする。同じ内容を章をまたいで繰り返さず、章ごとに新しい具体を足す。「〜かもしれません」「〜でしょう」の乱用を避け、惑星配置が示すことは言い切る。断定を避けるのは成否の保証・健康・法律・投資の助言のみ。
6. 個人化は出生図からのみ。毎章に「あなたは生まれつき〜」という文を根拠（惑星名・室・品位）つきで入れる。誰にでも当たる一般論、複数の立場の列挙は禁止。読者の年齢・現在の職業・雇用形態・婚姻を仮定しない（「今の会社」「転職活動中」などと書かない）。
7. 品位（高揚・減衰・自室など）は前向きな言葉に直す。減衰は「努力で獲得する分野」「遅咲きで深くなる分野」として扱い、弱点の羅列にしない。
8. 【確定データ】にない惑星・室・年月を書かない。内部名（lordPlacedIn・occupants・strength・score・careerWindows）や数値は本文に出さず、惑星名・室・領域の言葉で言い換える。
9. 語りは古い寺院の占星術師が一人に語りかけるように、品格とです・ます調を維持。命令形は使わない。締めは読者が「これが自分だ」と確認できる肯定で終える。`,
  en: `[Voice]
This is not an aptitude test but a reading on vocation and money addressed to one person. Its single guiding idea: self-congruence is vocation. When the gifts shown in the birth chart match what a person does every day and how they earn, effort stops feeling like effort, others recognise them naturally, and money accumulates on top of that congruence. Your job is to pinpoint where that congruence occurs for this person and where it slips. Follow strictly:
1. Name concrete occupations. For this product only, you may list several job titles and roles (e.g. editor, architectural designer, clinical psychologist, sales manager, chef, interpreter, independent instructor), each with its reason grounded in the confirmed data (houses, lords, dignity, occupants, nakshatra, dasha). Do not name occupations the chart does not support. Never assert company names, organisations or certifications.
2. Do not stop at "suitable jobs". Write what they are doing when their power shows, what never feels like toil, which environment, pace, counterpart and degree of autonomy create congruence, and what drains them — in concrete work scenes (meetings, making things, negotiating, numbers, field work, writing, speaking in public, solitary work).
3. Write how others see them: how clients, colleagues, those who commission them and those who report to them judge this person, what they ask of them and where they misread them — from the 1st, 7th and 10th houses and their occupants. Include at least one judgement the person is not aware of.
4. Write money thickly: the earning pattern (by skill, through people, through systems, through reputation…), the channels income arrives through, what gets a price tag, the conditions under which work turns into income, the periods and months when income tends to grow, leakage habits and how to keep money, and how income changes when they are self-congruent — from the 2nd and 11th houses, Venus, Jupiter, Ashtakavarga and dasha. The only prohibitions are named securities, buy/sell timing, yields, capital guarantees and definitive tax/contract advice; state the flow of money itself plainly.
5. Thick and warm. Character counts are minimums; never fill with summary. Do not repeat content across chapters — add new specifics each time. Avoid "may" and "might"; state what the placements show. Hedge only on guarantees of outcome, health, law and investment advice.
6. Personalise only from the birth chart. In every chapter include a sentence "You were born with…" with its evidence (planet, house, dignity). No generic statements, no lists of alternative situations. Do not assume age, current job, employment status or marriage.
7. Translate dignity into forward-looking language: debilitation is "a field earned through effort" or "a late-blooming field that deepens", never a list of weaknesses.
8. Never invent planets, houses or dates absent from the confirmed data. Do not print internal keys (lordPlacedIn, occupants, strength, score, careerWindows) or numbers; paraphrase as planet, house and domain.
9. Speak as an old temple astrologer addressing one person; keep dignity and warmth, no imperatives. End with an affirmation the reader can recognise as themselves.`
};

const CAREER_CHAPTERS = [
  {
    id: 'summary',
    title: 'あなたの天職の見取り図',
    pick: (a) => careerCore(a),
    schema: `{
      "catchphrase": "この人の働き方と稼ぎ方を一文で（40文字以内）",
      "essence": "ラグナ・10 室・2 室・11 室の支配星と在住惑星、最も強い惑星から読む、この人の仕事人生の全体像（700文字以上。具体的な職種名を 2〜3 挙げてよい）",
      "selfMatch": "この人にとっての自己一致とは何か——どんな仕事・働き方・稼ぎ方をしているときに「自分でいられる」と感じるか、逆に何をしていると自分から離れるか（500文字以上）",
      "callingType": "天職の型（創る／伝える／整える／導く／支える／探究する／結ぶ のうち主となる型と副となる型を『主: 〜／副: 〜』の形で。確定データに従う）",
      "gifts": ["仕事で武器になる資質と根拠の惑星（各50文字以内）", "", "", "", ""],
      "moneyLine": "金運の見取り図——稼ぎ方の型と、お金がどこから入りどこへ流れる人か（350文字以上）",
      "stance": "仕事とお金に向き合う基本姿勢（250文字以上）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 天職の型（10 室と支配星）',
    pick: (a) => ({ tenth: careerHouse(a, 10), first: careerHouse(a, 1), koto: a.boosters?.koto, sun: a.sun, saturn: planetOf(a, 'Saturn'), strongest: a.strength?.slice(0, 3), d10Available: Boolean(a.charts?.d10) }),
    schema: `{
      "intro": "10 室（仕事・社会的な立場）と、その支配星がどこに居るかを読む意味（250文字以上）",
      "text": "10 室のサイン・支配星・支配星の在住室と品位・在住惑星から、この人がどんな役割・立場で社会に立つと力が出るか（900文字以上。具体的な場面で）",
      "roles": [{ "name": "向いている役割・職種名（25文字以内）", "why": "その役割が合う根拠となる配置（150文字以上）", "how": "その役割の中でどう働くと自己一致が起きるか（150文字以上）" }],
      "fields": ["向いている仕事の領域（各40文字以内）", "", "", ""],
      "avoid": "消耗しやすい働き方・立場と、その配置上の理由（300文字以上）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 向いている職種——具体名で',
    pick: (a) => ({ ...careerCore(a), third: careerHouse(a, 3), fifth: careerHouse(a, 5), sixth: careerHouse(a, 6), seventh: careerHouse(a, 7), ninth: careerHouse(a, 9), mercury: planetOf(a, 'Mercury'), venus: planetOf(a, 'Venus'), mars: planetOf(a, 'Mars'), jupiter: planetOf(a, 'Jupiter') }),
    schema: `{
      "intro": "なぜ職種を具体名で挙げられるのか——10 室・2 室・11 室・3 室・5 室と最強の惑星を組み合わせる読み方（250文字以上）",
      "jobs": [{ "name": "職種名（25文字以内。6〜8 件）", "why": "その職種が合う根拠となる配置（150文字以上）", "how": "その職種で自己一致が起きる働き方（どの工程・どの相手・どの裁量で）（150文字以上）" }],
      "firstChoice": "上の中で最も自己一致が深い職種と、その理由（300文字以上）",
      "notFit": [{ "name": "合いにくい職種・役割（25文字以内。3 件）", "why": "合いにくい理由となる配置と、それでも就くなら何を足すか（120文字以上）" }],
      "environment": "合う環境——組織の規模・速度・人との距離・裁量の量・場所（屋内外・移動）（350文字以上）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 力が出る条件と、苦にならない作業',
    pick: (a) => ({ first: careerHouse(a, 1), third: careerHouse(a, 3), sixth: careerHouse(a, 6), tenth: careerHouse(a, 10), moon: a.moon, nakshatra: a.nakshatra, mars: planetOf(a, 'Mars'), mercury: planetOf(a, 'Mercury'), saturn: planetOf(a, 'Saturn'), strongest: a.strength?.slice(0, 3) }),
    schema: `{
      "intro": "力が出る条件は 1 室・月・火星・水星・土星・6 室から読む——その考え方（250文字以上）",
      "thrive": [{ "condition": "力が出る条件（30文字以内。4〜5 件）", "text": "その条件の根拠となる配置と、具体的な仕事の場面（180文字以上）" }],
      "effortless": "何をしていれば苦にならないか——長時間続けても消耗せず、むしろ整う作業・工程・相手（600文字以上。具体的な動詞で）",
      "flow": "没頭が起きる瞬間の描写——どんな課題・速度・一人か複数かのときに時間を忘れるか（350文字以上）",
      "drains": "逆に、何が消耗の原因になるか——作業・環境・相手の型と配置上の理由（400文字以上）",
      "dailyShape": "この人にとって自己一致が起きる 1 日の仕事の形（朝型か・まとまった時間か・人と会う比率・手を動かす比率）（300文字以上）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 人からどう見られているか——評価のされ方',
    pick: (a) => ({ first: careerHouse(a, 1), seventh: careerHouse(a, 7), tenth: careerHouse(a, 10), eleventh: careerHouse(a, 11), sun: a.sun, moon: a.moon, venus: planetOf(a, 'Venus'), rahu: planetOf(a, 'Rahu'), strongest: a.strength?.slice(0, 3) }),
    schema: `{
      "intro": "周囲からの評価は 1 室（第一印象）・7 室（向き合う相手）・10 室（社会的な顔）と太陽・金星・ラーフから読む——その考え方（250文字以上）",
      "seen": "依頼する側・一緒に働く人・顧客・部下にあたる人が、この人をどう見て、何を頼み、何を任せるか（600文字以上。相手の立場ごとに）",
      "praised": ["実際に評価されている点と、その根拠の惑星（各50文字以内。4〜5 件）", "", "", ""],
      "unaware": "本人が自覚していないが周囲が高く買っている点（300文字以上）",
      "misread": "誤解されやすい点と、なぜそう見えるか、どう振る舞うと一致して見えるか（350文字以上）",
      "reputation": "長い目で見て築かれる評判の形——何の人として覚えられるか（300文字以上）"
    }`
  },
  {
    id: 'ch5',
    title: '第5章 才能と技能（3 室・5 室・最強の惑星）',
    pick: (a) => ({ third: careerHouse(a, 3), fifth: careerHouse(a, 5), strength: a.strength, mercury: planetOf(a, 'Mercury'), mars: planetOf(a, 'Mars'), jupiter: planetOf(a, 'Jupiter'), nakshatra: a.nakshatra, yogas: a.yogas }),
    schema: `{
      "intro": "才能は 3 室（手と技）・5 室（創造と判断）・最も強い惑星・ナクシャトラから読む——その考え方（250文字以上）",
      "talents": [{ "name": "才能の名前（20文字以内。4〜5 件）", "text": "その才能の根拠となる配置と、仕事での具体的な使い方・活きる職種（200文字以上）" }],
      "weapon": "この人の最大の武器——仕事で一番お金と評価に変わる一つの能力（350文字以上）",
      "learning": "学び方・技能の伸ばし方の向き（独学か師につくか・体で覚えるか理屈か・何歳からでも伸びる領域）（350文字以上）",
      "hidden": "まだ使い切っていない才能と、それを仕事に出す入口（350文字以上）"
    }`
  },
  {
    id: 'ch6',
    title: '第6章 雇われるか、独立するか、組むか（6 室・7 室・10 室）',
    pick: (a) => ({ sixth: careerHouse(a, 6), seventh: careerHouse(a, 7), tenth: careerHouse(a, 10), eleventh: careerHouse(a, 11), saturn: planetOf(a, 'Saturn'), rahu: planetOf(a, 'Rahu'), sun: a.sun, currentDasha: a.dasha?.current }),
    schema: `{
      "intro": "6 室（勤め・奉仕・日々の仕事）と 7 室（取引・パートナー）と 10 室の力関係の読み方（250文字以上）",
      "text": "組織で働く・独立する・共同経営する・組織に居ながら自分の名前で動く のどれに適性が寄るか、根拠を示して（600文字以上。断定ではなく「寄る」）",
      "employed": "雇われる形を選ぶなら、どんな組織・役割・上下関係なら自己一致が起きるか（350文字以上）",
      "independent": "独立する形を選ぶなら、何を商品にし、誰を相手に、どの規模で始めると持続するか（350文字以上）",
      "partner": "組む形を選ぶなら、どんな相手と役割分担すると強いか（300文字以上）",
      "conditions": ["独立や働き方の変更を考えるときに満たしておきたい条件（各50文字以内）", "", "", ""],
      "team": "上司・同僚・取引相手との関わり方の型（300文字以上）"
    }`
  },
  {
    id: 'ch7',
    title: '第7章 お金の型——稼ぎ方・入る経路・増える時期・漏れる癖',
    pick: (a) => ({ second: careerHouse(a, 2), eleventh: careerHouse(a, 11), fifth: careerHouse(a, 5), eighth: careerHouse(a, 8), tenth: careerHouse(a, 10), ashtakavarga: a.ashtakavarga, venus: planetOf(a, 'Venus'), jupiter: planetOf(a, 'Jupiter'), mercury: planetOf(a, 'Mercury'), moon: a.moon, currentDasha: a.dasha?.current, upcoming: a.dasha?.upcoming?.slice(0, 3), careerWindows: a.careerWindows, yogas: a.yogas }),
    schema: `{
      "intro": "2 室（自分で稼ぐ・蓄える）・11 室（得る・人脈・大きな収入）・5 室（投機ではなく創造から入る実り）・8 室（他者の資産・継承）・金星・木星から金運を読む考え方（250文字以上）",
      "earningStyle": "この人の稼ぎ方の型——技能で稼ぐ・人を介して稼ぐ・仕組みで稼ぐ・名前（評判）で稼ぐ・育てて稼ぐ のうちどれが主でどれが副か、根拠つきで（500文字以上）",
      "channels": [{ "route": "収入が入りやすい経路（30文字以内。4 件）", "text": "その経路の根拠となる配置と、どんな形（報酬・手数料・継続・単発・印税的な積み上げ）で入るか（180文字以上）" }],
      "pricing": "この人の場合、何に値段がつくか——時間か、作品か、判断か、人を集める力か、信用か（350文字以上）",
      "linkToSelf": "自己一致と収入の関係——自分に合わない仕事で稼ぐときと、合った仕事で稼ぐときで、お金の入り方・残り方がどう変わる人か（400文字以上）",
      "growthTiming": "収入が増えやすい周期（ダシャーの支配星と 2 室・11 室の関係）と、今後 12 か月の中で財の室に木星・土星が入る月（確定データの年月のみ）（400文字以上）",
      "keeping": "貯める・守る力——お金が残る条件と、この人に合った蓄え方（持ち方・分け方・決める頻度）（400文字以上。投資助言は書かない）",
      "leaks": "お金が漏れやすい癖——どんな場面・感情・相手で支出が膨らむか、配置上の理由と止め方（400文字以上）",
      "scores": "アシュタカヴァルガの 2 室・10 室・11 室の点数（確定データのものだけ）が示す財の厚みと、点が高い室・低い室の意味（250文字以上）",
      "bigMoney": "この人の人生で大きなお金が動く形（自分で築く・人から受け取る・共同で得る・継承する）と、それが起きやすい周期（300文字以上）",
      "advice": ["金運を活かす具体的な行動（各50文字以内。5 件）", "", "", "", ""]
    }`
  },
  {
    id: 'ch8',
    title: '第8章 仕事人生の周期（ダシャー）',
    pick: (a) => ({ current: a.dasha?.current, upcoming: a.dasha?.upcoming, timeline: a.dasha?.timeline, tenth: careerHouse(a, 10), second: careerHouse(a, 2), eleventh: careerHouse(a, 11) }),
    schema: `{
      "intro": "ダシャー（運気の周期）が仕事と収入に与える影響の考え方（250文字以上）",
      "now": "現在の大周期・中周期の支配星が 10 室・2 室・11 室とどう関わり、仕事と収入の今をどう作っているか——この周期で自己一致しやすい働き方（600文字以上）",
      "periods": [{ "lord": "確定データの支配星名をそのまま", "text": "その周期に仕事・立場・収入がどう動きやすいか、何に力を注ぐと実るか（250文字以上。年は確定データのもの）" }],
      "golden": "仕事の上で最も実りやすい周期とその使い方（350文字以上）",
      "lateBloom": "年齢を重ねるほど深まる領域——後半生で評価と収入が厚くなる働き方（300文字以上）"
    }`
  },
  {
    id: 'ch9',
    title: '第9章 仕事と金運が動く時期（今後 12 か月）',
    pick: (a) => ({
      period: a.period, careerWindows: a.careerWindows, dashaChanges: a.dashaChanges, currentDasha: a.dasha?.current,
      transits: (a.careerTransits || []).map((m) => ({ month: m.month, ...Object.fromEntries(m.planets.map((p) => [p.planetKey, `L${p.houseFromLagna}/M${p.houseFromMoon}${p.retrograde ? ' R' : ''}`])) }))
    }),
    schema: `{
      "overview": "今後 12 か月の仕事と収入の大きな流れ（400文字以上。期間は確定データの年月のみ）",
      "windows": [{ "month": "確定データの YYYY-MM をそのまま", "kind": "働き方を変える・立場が上がる・評価される・収入が増える・収入の形を変える・学び直す など（30文字以内）", "text": "なぜその月か（木星・土星のラグナ・月からの室、ダシャー切替）と、その月に実行してよい具体的な行動（250文字以上）" }],
      "bestMonth": "仕事の大きな決断（働き方を変える・新しい立場に就く・自分の名前で始める）に最も向く月と根拠（250文字以上。該当が無ければ「この 12 か月は土台を厚くする期間」と正直に）",
      "moneyMonth": "収入が動きやすい月（財の室に木星・土星が入る月・ダシャー切替）と、その月に何が入りやすいか（250文字以上）",
      "holdMonth": "急がない方がよい月または領域と根拠（150文字以上。無ければ短く）"
    }`
  },
  {
    id: 'ch10',
    title: '第10章 天職に近づくための行動計画',
    pick: (a) => ({ strongest: a.strength?.slice(0, 3), tenth: careerHouse(a, 10), second: careerHouse(a, 2), koto: a.boosters?.koto, workStyle: a.boosters?.workStyle, careerWindows: a.careerWindows?.slice(0, 3), currentDasha: a.dasha?.current }),
    schema: `{
      "intro": "ここまでの章を一つに束ねる——この人の天職を一文で定義し直す（300文字以上）",
      "now": ["今から 3 か月でできること（各50文字以内。5 件）", "", "", "", ""],
      "year": ["この 1 年で整えること（各50文字以内。5 件）", "", "", "", ""],
      "threeYears": "3 年の視野で育てる柱——何を名乗れる人になるか、収入の柱をどう組むか（400文字以上）",
      "habit": "天職の型に合った働き方・稼ぎ方の習慣（350文字以上）",
      "checklist": ["自己一致が起きているかを確かめる問い（各50文字以内。5 件）", "", "", "", ""],
      "message": "決断を迫らず、しかし背中を押す締めの言葉——読者が「これが自分だ」と確認できる肯定で終える（350文字以上）"
    }`
  }
];
module.exports = { YEARLY_CHAPTERS, YEARLY_VOICE, COMPAT_CHAPTERS, COMPAT_VOICE, CAREER_CHAPTERS, CAREER_VOICE, compatChapterIdsFor, RELATION_JA };
