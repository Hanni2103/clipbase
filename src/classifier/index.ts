import { config } from '../config.js';
import type { ClassifyResult } from '../types.js';
import { classifyMock } from './mock.js';
import { FEW_SHOT_EXAMPLES, SYSTEM_PROMPT, VALID_ATOM_TYPES, VALID_CATEGORIES, VALID_INTENTS } from './prompt.js';

/** 分类入口：未配置 LLM_API_KEY 时用 mock，否则走大模型 */
export async function classify(platform: string, title: string, text: string): Promise<ClassifyResult> {
  if (config.useMock) return classifyMock(title, text);
  return classifyLLM(platform, title, text);
}

async function classifyLLM(platform: string, title: string, text: string): Promise<ClassifyResult> {
  const user = `平台：${platform}\n标题：${title}\n文本：${text}`;
  const res = await fetch(`${config.llm.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${FEW_SHOT_EXAMPLES}` },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM 调用失败：HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const raw = data?.choices?.[0]?.message?.content ?? '';
  return parseResult(raw);
}

function parseResult(raw: string): ClassifyResult {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  let obj: any;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('LLM 返回无法解析为 JSON');
    obj = JSON.parse(m[0]);
  }

  const category = (VALID_CATEGORIES as readonly string[]).includes(obj?.category) ? obj.category : '其他';
  const tags = Array.isArray(obj?.tags) ? obj.tags.map(String).slice(0, 8) : [];
  const summary = typeof obj?.summary === 'string' ? obj.summary : '';
  const confidence = Math.min(Math.max(Number(obj?.confidence) || 0, 0), 1);

  const rawAtoms = Array.isArray(obj?.atoms) ? obj.atoms : [];
  const atoms = rawAtoms
    .filter((a: any) => a && typeof a.content === 'string' && a.content.trim().length > 0)
    .slice(0, 4)
    .map((a: any) => ({
      type: (VALID_ATOM_TYPES as readonly string[]).includes(a.type) ? a.type : 'key_point',
      content: String(a.content).trim(),
    }));

  const intent = (VALID_INTENTS as readonly string[]).includes(obj?.intent) ? obj.intent : 'insight';

  return { category, tags, summary, confidence, atoms, intent };
}
