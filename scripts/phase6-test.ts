/**
 * Phase 6 测试：Model / Relation / Insight / Recall / Compose Context
 * 运行：npx tsx scripts/phase6-test.ts（需先 npm start）
 */
const BASE = 'http://127.0.0.1:3000';
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, extra?: string) {
  if (cond) {
    pass += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    fail += 1;
    console.log(`  \u2717 ${name}${extra ? ` \u2014\u2014 ${extra}` : ''}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function http(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function pollItem(id: string): Promise<any> {
  for (let i = 0; i < 60; i++) {
    const item = await http('GET', `/api/items/${id}`);
    if (['completed', 'failed', 'needs_review'].includes(item.status)) return item;
    await sleep(500);
  }
  return http('GET', `/api/items/${id}`);
}

async function main() {
  const uid = 'phase6_' + Date.now();

  console.log('\n[1] Model：items 返回 memory 字段');
  const itemsRes = await http('GET', '/api/items?user_id=smoke&size=1');
  const it = itemsRes.items?.[0] ?? {};
  check('memory_strength 字段存在', 'memory_strength' in it);
  check('review_count 字段存在', 'review_count' in it);
  check('next_review_at 字段存在', 'next_review_at' in it);

  console.log('\n[2] Relation：相似内容生成关系 + 无重复 + 有 source');
  const a = await http('POST', '/api/ingest', { user_id: uid, text: 'React Hooks 使用技巧，useState 与 useEffect 详解' });
  const b = await http('POST', '/api/ingest', { user_id: uid, text: 'React Hooks 使用技巧，useState 与 useEffect 最佳实践' });
  await pollItem(a.item_id);
  await pollItem(b.item_id);
  const rel = await http('GET', `/api/relations?user_id=${uid}`);
  check('相似内容生成关系', rel.relations?.length >= 1, `relations=${rel.relations?.length}`);
  const keys = new Set((rel.relations ?? []).map((r: any) => [r.source_id, r.target_id].sort().join('|') + '|' + r.type));
  check('关系无重复', keys.size === (rel.relations?.length ?? 0));
  check('每条关系都有 source', (rel.relations ?? []).every((r: any) => !!r.source));

  console.log('\n[3] Insight：无关系不生成 + 有关系生成');
  const emptyUid = 'phase6_empty_' + Date.now();
  const genEmpty = await http('POST', '/api/insights/generate', { user_id: emptyUid });
  check('无关系不生成洞察', genEmpty.created === 0, `created=${genEmpty.created}`);
  const gen = await http('POST', '/api/insights/generate', { user_id: uid });
  check('有关系生成洞察', gen.created >= 1, `created=${gen.created}`);
  const ins = await http('GET', `/api/insights?user_id=${uid}`);
  check('洞察列表返回', ins.insights?.length >= 1);
  check('洞察有 related_ids', (ins.insights?.[0]?.related_ids?.length ?? 0) >= 2);

  console.log('\n[4] Recall：反馈影响 memory_strength');
  const recall = await http('GET', `/api/recall?user_id=${uid}&limit=1`);
  const target = recall.items?.[0];
  if (target) {
    const rv = await http('POST', `/api/recall/${target.id}/review`, { user_id: uid, feedback: 'again' });
    check('review 返回新强度', typeof rv.memory_strength === 'number');
    check('again 后强度下调', rv.memory_strength < 1, `strength=${rv.memory_strength}`);
    check('review_count 递增', rv.review_count >= 1, `count=${rv.review_count}`);
    const events = await http('GET', `/api/recall/events?user_id=${uid}&memory_id=${target.id}`);
    check('recall_event 已记录', events.events?.length >= 1);
  } else {
    check('recall 队列有内容', false, '无待回顾条目');
  }

  console.log('\n[5] Compose Context（确定性预览）');
  const ctx = await http('GET', `/api/compose/context?user_id=${uid}&type=article`);
  check('context 返回 memory_ids', Array.isArray(ctx.memory_ids));
  check('context 返回 token_estimate', typeof ctx.token_estimate === 'number');
  check('context 返回 selected_atoms', Array.isArray(ctx.selected_atoms));

  console.log('\n[6] Compose Generate（同 builder + cited_atoms 真实）');
  try {
    const comp = await http('POST', '/api/compose', { user_id: uid, type: 'article' });
    check('compose 返回 used_memory_ids', Array.isArray(comp.used_memory_ids));
    check('compose 返回 cited_atoms', Array.isArray(comp.cited_atoms));
    const ctxIds = [...(ctx.memory_ids ?? [])].sort().join('|');
    const compIds = [...(comp.used_memory_ids ?? [])].sort().join('|');
    check('preview 与 generate 同 builder', ctxIds === compIds, `ctx=${ctxIds} comp=${compIds}`);
    const usedSet = new Set(comp.used_memory_ids ?? []);
    check('cited_atoms 真实（memory_id ∈ used）', (comp.cited_atoms ?? []).every((c: any) => usedSet.has(c.memory_id)));
  } catch (e) {
    check('compose generate 成功', false, String(e));
  }

  console.log(`\n========================`);
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  console.log(`========================`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('测试异常：', e);
  process.exitCode = 1;
});
