/**
 * Smoke test：单元测试（提取器/域名识别/mock 分类）+ 集成测试（HTTP API）
 * 运行：npm test（需先 npm start 启动服务）
 */
import { detectPlatform } from '../src/extractors/detect.js';
import { extractDouyin } from '../src/extractors/douyin.js';
import { extractXiaohongshu } from '../src/extractors/xiaohongshu.js';
import { extractBilibili } from '../src/extractors/bilibili.js';
import { classifyMock } from '../src/classifier/mock.js';

const nativeFetch = globalThis.fetch;
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

function stubFetch(html: string) {
  globalThis.fetch = (async () =>
    new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })) as unknown as typeof fetch;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://127.0.0.1:3000';

async function http(method: string, path: string, body?: unknown): Promise<any> {
  const res = await nativeFetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function pollItem(id: string): Promise<any> {
  for (let i = 0; i < 40; i++) {
    const item = await http('GET', `/api/items/${id}`);
    if (item.status === 'completed' || item.status === 'failed' || item.status === 'needs_review') return item;
    await sleep(500);
  }
  return http('GET', `/api/items/${id}`);
}

async function main() {
  // ===== 单元测试 =====
  console.log('\n[1] 单元测试：域名识别');
  check('抖音短链', detectPlatform('https://v.douyin.com/abc123/') === 'douyin');
  check('小红书短链', detectPlatform('https://xhslink.com/abc') === 'xiaohongshu');
  check('B站短链', detectPlatform('https://b23.tv/xyz') === 'bilibili');
  check('公众号', detectPlatform('https://mp.weixin.qq.com/s/xxx') === 'wechat');
  check('普通网页', detectPlatform('https://example.com/a') === 'web');
  check('非链接', detectPlatform('随便一段文字') === 'unknown');

  console.log('\n[2] 单元测试：抖音提取器（fixture）');
  stubFetch(
    `<html><head><meta property="og:title" content="空气炸锅做的脆皮五花肉绝了"><meta property="og:description" content="五花肉焯水后腌料，空气炸锅200度30分钟"><meta property="og:image" content="https://p3.douyinpic.com/c.jpg"></head><body></body></html>`,
  );
  const dy = await extractDouyin({ user_id: 'x', url: 'https://v.douyin.com/abc/' });
  check('抖音 sourcePlatform', dy.sourcePlatform === 'douyin', `实际=${dy.sourcePlatform}`);
  check('抖音标题', dy.title.includes('空气炸锅'));
  check('抖音文案', dy.text.includes('五花肉'));
  check('抖音封面', dy.coverUrl?.includes('douyinpic') === true);

  console.log('\n[3] 单元测试：小红书/B站提取器（fixture）');
  stubFetch(
    `<html><head><meta property="og:title" content="打工人一周通勤穿搭"><meta property="og:description" content="一周不重样的通勤穿搭分享"></head></html>`,
  );
  const xhs = await extractXiaohongshu({ user_id: 'x', url: 'https://xhslink.com/abc' });
  check('小红书 sourcePlatform', xhs.sourcePlatform === 'xiaohongshu', `实际=${xhs.sourcePlatform}`);
  check('小红书标题', xhs.title.includes('通勤穿搭'));

  stubFetch(`<html><head><title>某科普视频</title><meta property="og:description" content="量子计算入门科普"></head></html>`);
  const bili = await extractBilibili({ user_id: 'x', url: 'https://b23.tv/xyz' });
  check('B站 sourcePlatform', bili.sourcePlatform === 'bilibili', `实际=${bili.sourcePlatform}`);
  check('B站标题', bili.title.includes('科普'));

  console.log('\n[4] 单元测试：mock 分类器');
  check('美食', classifyMock('', '空气炸锅做的脆皮五花肉绝了').category === '美食');
  check('科技', classifyMock('', 'React 19 新特性，前端开发').category === '科技');
  check('搞笑', classifyMock('', '哈哈哈哈笑死我了').category === '搞笑娱乐');

  // ===== 集成测试 =====
  globalThis.fetch = nativeFetch;

  console.log('\n[5] 集成测试：纯文字分类');
  const food = await http('POST', '/api/ingest', { user_id: 'smoke', text: '空气炸锅做的脆皮五花肉，外酥里嫩' });
  check('ingest 返回 item_id', !!food.item_id);
  const foodItem = await pollItem(food.item_id);
  check('美食分类完成', foodItem.status === 'completed' && foodItem.category === '美食', `status=${foodItem.status} category=${foodItem.category}`);

  const tech = await http('POST', '/api/ingest', { user_id: 'smoke', text: 'React 19 新特性详解，前端开发必备' });
  const techItem = await pollItem(tech.item_id);
  check('科技分类完成', techItem.status === 'completed' && techItem.category === '科技', `status=${techItem.status} category=${techItem.category}`);

  console.log('\n[6] 集成测试：图片 OCR 管道（已配置 VISION_MODEL）');
  const img = await http('POST', '/api/ingest', {
    user_id: 'smoke',
    images: [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    ],
  });
  const imgItem = await pollItem(img.item_id);
  check(
    '图片进入终态（completed/needs_review/failed）',
    ['completed', 'needs_review', 'failed'].includes(imgItem.status),
    `status=${imgItem.status}`,
  );

  console.log('\n[7] 集成测试：手动改分类 + 筛选');
  const patched = await http('PATCH', `/api/items/${food.item_id}`, { category: '生活方式', tags: ['空气炸锅', '教程'] });
  check('PATCH 改分类', patched.category === '生活方式', `实际=${patched.category}`);
  const filtered = await http('GET', '/api/items?user_id=smoke&category=' + encodeURIComponent('生活方式'));
  check('按分类筛选命中', filtered.items?.some((i: any) => i.id === food.item_id) === true);

  console.log('\n[8] 集成测试：重试接口');
  const retried = await http('POST', `/api/items/${img.item_id}/retry`);
  check('retry 返回 pending', retried.status === 'pending', `实际=${retried.status}`);

  // ===== 汇总 =====
  console.log(`\n========================`);
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  console.log(`========================`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('测试异常：', e);
  process.exitCode = 1;
});
