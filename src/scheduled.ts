import { LatencyRecord, DEFAULT_COUNTRIES } from './types';
import { LatencyDB } from './db';

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log('Scheduled event triggered at', new Date().toISOString());

  const db = new LatencyDB(env.DB);
  await db.init();

  // 生成随机延迟数据
  const records: LatencyRecord[] = DEFAULT_COUNTRIES.map(country => ({
    country: country.name,
    country_code: country.code,
    latency_ms: Math.floor(Math.random() * (200 - 50 + 1)) + 50, // 50-200ms
    timestamp: new Date().toISOString()
  }));

  console.log(`Inserting ${records.length} latency records`);
  await db.insertBatch(records);

  // 清理 7 天前的数据
  await db.cleanup(7);

  console.log('Scheduled task completed');
}

export interface Env {
  DB: D1Database;
}
