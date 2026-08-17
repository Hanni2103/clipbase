import type { ClassifyResult } from '../types.js';

/** 各分类的关键词表（mock 模式用，未配置 LLM_API_KEY 时兜底） */
const KEYWORDS: Record<string, string[]> = {
  美食: ['菜', '食谱', '做法', '好吃', '美食', '餐厅', '探店', '食材', '烹饪', '烘焙', '五花肉', '空气炸锅', '家常菜', '火锅', '奶茶', '早餐', '午餐', '晚餐', '甜点'],
  科技: ['AI', '人工智能', '大模型', '代码', '编程', '程序员', '前端', '后端', 'Python', 'JavaScript', 'React', '软件', '硬件', '芯片', '手机', '电脑', '算法', '开发', '开源', 'GitHub', '数码', '科技', '互联网'],
  搞笑娱乐: ['搞笑', '段子', '笑死', '哈哈', '沙雕', '梗', '吐槽', '娱乐', '综艺', '明星', '八卦', '神评论', '精神状态'],
  学习成长: ['学习', '教程', '课程', '读书', '笔记', '干货', '方法', '技巧', '知识', '考证', '考试', '英语', '自我提升', '成长', '思维', '认知', '习惯'],
  职场: ['职场', '工作', '面试', '简历', '晋升', '薪资', '打工人', '同事', '老板', '加班', '跳槽', '副业', '管理', '办公'],
  生活方式: ['穿搭', '美妆', '护肤', '家居', '装修', '旅行', '旅游', '健身', '运动', '宠物', '摄影', '生活', '好物', '测评', '购物', '收纳'],
  健康: ['健康', '养生', '减肥', '瘦身', '睡眠', '医生', '疾病', '体检', '营养', '中医', '运动损伤'],
  财经商业: ['财经', '股票', '基金', '投资', '理财', '商业', '创业', '经济', '央行', '利率', '市场', '公司', '融资', '赚钱', '降准', '宏观经济'],
  新闻资讯: ['新闻', '资讯', '政策', '发布', '宣布', '通报', '事件', '热点', '官方'],
};

/** 各分类默认的收藏动机（mock 模式用） */
const INTENT_BY_CATEGORY: Record<string, string> = {
  美食: 'do_it',
  学习成长: 'insight',
  科技: 'insight',
  搞笑娱乐: 'fun',
  职场: 'do_it',
  生活方式: 'inspiration',
  健康: 'do_it',
  财经商业: 'insight',
  新闻资讯: 'insight',
  其他: 'insight',
};

export function classifyMock(title: string, text: string): ClassifyResult {
  const source = `${title}\n${text}`;
  let best = '其他';
  let bestScore = 0;
  const hits: string[] = [];

  for (const [cat, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      if (source.includes(w)) {
        score += 1;
        hits.push(w);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  const tags = [...new Set(hits)].slice(0, 8);
  const summary = (title || text).replace(/\s+/g, ' ').trim().slice(0, 80);
  const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.15, 0.9) : 0.4;

  // mock 模式只产出一个「要点」原子；真实大模型会产出 1~4 个更丰富的原子
  const atoms = summary ? [{ type: 'key_point', content: summary }] : [];

  return {
    category: best,
    tags: tags.length ? tags : ['未分类'],
    summary: summary || '（无内容）',
    confidence,
    atoms,
    intent: INTENT_BY_CATEGORY[best] ?? 'insight',
  };
}
