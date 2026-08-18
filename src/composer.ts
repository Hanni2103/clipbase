import { config } from './config.js';

export interface ComposeItem {
  title: string | null;
  category: string | null;
  summary: string | null;
  tags: string[];
  atoms: { type: string; content: string }[];
}

export type ComposeType =
  | 'article'
  | 'copywriting'
  | 'xiaohongshu'
  | 'video_script'
  | 'weekly'
  | 'business'
  | 'mindmap';

const TYPE_INSTRUCTIONS: Record<ComposeType, string> = {
  article: '写一篇结构化深度文章：标题、开头、分小节、结尾总结。',
  copywriting: '写一段营销/种草文案：抓人标题 + 卖点 + 行动号召，口语化有感染力。',
  xiaohongshu: '写成小红书风格笔记：吸睛标题 + 短段落 + emoji 点缀 + 结尾带 3~5 个话题标签（#）。',
  video_script: '写成视频脚本：分「开场钩子 / 主体分镜 / 结尾」几部分，每部分标注画面和口播文案。',
  weekly: '总结成周报「我这一周学到的 N 件事」：提炼 3~5 件最有价值的事，每条一句话点题再展开。',
  business: '写成商业分析报告：现状、机会、风险、结论与建议，结构化。',
  mindmap: '输出思维导图结构：Markdown 嵌套列表，中心主题 + 一级分支 + 二级要点。',
};

const BASE_SYSTEM = `你是一个个人知识整理助手。用户收藏了一批内容，请你把它们消化、重组，输出属于用户自己的内容（不是原文拼贴）。
要求：
1. 用第一人称「我」或中立口吻。
2. 只基于用户提供的内容，不编造、不夸大。
3. 把零散的「原子卡片」串成连贯内容，去重、合并同类。
4. 用 Markdown 输出。`;

function atomTypeLabel(t: string): string {
  return ({ key_point: '要点', step: '步骤', quote: '金句', fact: '数据' })[t] || t;
}

function buildUserPrompt(items: ComposeItem[]): string {
  return items
    .map((it, i) => {
      const atoms = (it.atoms || [])
        .map((a) => `    - [${atomTypeLabel(a.type)}] ${a.content}`)
        .join('\n');
      const title = it.title || it.summary || '(无标题)';
      const head = `${i + 1}. ${title}${it.category ? `（${it.category}）` : ''}`;
      const summary = it.summary && it.summary !== title ? `   摘要：${it.summary}` : '';
      return [head, summary, atoms].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

async function callLLM(system: string, user: string): Promise<string> {
  const res = await fetch(`${config.llm.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llm.apiKey}` },
    body: JSON.stringify({
      model: config.llm.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`LLM 调用失败：HTTP ${res.status}`);
  const data = (await res.json()) as any;
  return data?.choices?.[0]?.message?.content ?? '';
}

function composeMock(items: ComposeItem[], type: ComposeType, topic?: string): string {
  if (items.length === 0) return '（没有可整理的内容）';
  if (type === 'weekly') {
    return '# 我这一周学到的\n\n' + items.slice(0, 5).map((it) => `- **${it.title || it.summary || '(无标题)'}**：${it.summary || ''}`).join('\n');
  }
  const title = topic || ({ article: '深度文章', copywriting: '营销文案', xiaohongshu: '小红书笔记', video_script: '视频脚本', business: '商业分析', mindmap: '思维导图' }[type] ?? '我的整理');
  return (
    `# ${title}\n\n` +
    items.map((it) => {
      const head = `## ${it.title || '(无标题)'}`;
      const body = it.summary ? `${it.summary}\n` : '';
      const atoms = (it.atoms || []).map((a) => `- [${atomTypeLabel(a.type)}] ${a.content}`).join('\n');
      return [head, body, atoms].filter(Boolean).join('\n');
    }).join('\n\n')
  );
}

export interface ComposeOptions {
  tone?: string;
  audience?: string;
  length?: string;
}

/** 一键创作：把用户收藏消化重组成指定类型的内容 */
export async function composeDocument(
  items: ComposeItem[],
  type: ComposeType,
  topic?: string,
  opts?: ComposeOptions,
): Promise<string> {
  if (config.useMock) return composeMock(items, type, topic);
  const extra = [opts?.tone ? `语气：${opts.tone}` : '', opts?.audience ? `目标读者：${opts.audience}` : '', opts?.length ? `篇幅：${opts.length}` : '']
    .filter(Boolean)
    .join('\n');
  const system = `${BASE_SYSTEM}\n\n本次创作类型：${TYPE_INSTRUCTIONS[type] ?? TYPE_INSTRUCTIONS.article}${extra ? `\n${extra}` : ''}`;
  const user = buildUserPrompt(items) + (topic ? `\n\n主题：${topic}` : '');
  return callLLM(system, user);
}

export const COMPOSE_TYPES: { key: ComposeType; label: string; emoji: string }[] = [
  { key: 'article', label: '深度文章', emoji: '📄' },
  { key: 'copywriting', label: '文案写作', emoji: '✍️' },
  { key: 'xiaohongshu', label: '小红书笔记', emoji: '📕' },
  { key: 'video_script', label: '视频脚本', emoji: '🎬' },
  { key: 'weekly', label: '周报总结', emoji: '📊' },
  { key: 'business', label: '商业分析', emoji: '📈' },
  { key: 'mindmap', label: '思维导图', emoji: '🧠' },
];
