import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? './data/clipbase.db',
  llm: {
    baseUrl: process.env.LLM_BASE_URL ?? '',
    apiKey: process.env.LLM_API_KEY ?? '',
    model: process.env.LLM_MODEL ?? 'deepseek-chat',
  },
  vision: {
    model: process.env.VISION_MODEL ?? '',
  },
  get useMock(): boolean {
    return this.llm.apiKey.trim() === '';
  },
  get useVision(): boolean {
    return this.vision.model.trim() !== '' && this.llm.apiKey.trim() !== '';
  },
};
