const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 拉取网页 HTML（自动跟随短链跳转），返回最终 URL 和 HTML */
export async function fetchHtml(url: string): Promise<{ finalUrl: string; html: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`请求失败：HTTP ${res.status}`);
  const html = await res.text();
  return { finalUrl: res.url, html };
}
