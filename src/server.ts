import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from './config.js';
import { initDb } from './db.js';
import { router } from './routes.js';

initDb(config.databasePath);

const app = express();
app.use(express.json({ limit: '2mb' }));

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, '../public')));

// 简单 CORS（方便网页调试 / 未来 Web 端）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, mock: config.useMock }));
app.use('/api', router);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[clipbase] 服务已启动: http://localhost:${config.port}`);
  console.log(`[clipbase] 局域网访问: http://192.168.3.36:${config.port}`);
  console.log(`[clipbase] 分类模式: ${config.useMock ? '内置 mock（未配置 LLM_API_KEY）' : `LLM: ${config.llm.model}`}`);
});
