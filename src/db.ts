import { LatencyRecord, LatencyStats } from './types';

export class LatencyDB {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async init(): Promise<void> {
    try {
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS latency_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          country TEXT NOT NULL,
          country_code TEXT NOT NULL,
          latency_ms INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_country_timestamp 
          ON latency_metrics(country, timestamp);
        
        CREATE INDEX IF NOT EXISTS idx_timestamp 
          ON latency_metrics(timestamp);
      `);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  async insertRecord(record: LatencyRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO latency_metrics (country, country_code, latency_ms, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    
    const timestamp = record.timestamp || new Date().toISOString();
    await stmt.bind(
      record.country,
      record.country_code,
      record.latency_ms,
      timestamp
    ).run();
  }

  async insertBatch(records: LatencyRecord[]): Promise<void> {
    for (const record of records) {
      await this.insertRecord(record);
    }
  }

  async getRecords(
    countries?: string[],
    startTime?: string,
    endTime?: string,
    limit: number = 10000
  ): Promise<LatencyRecord[]> {
    let query = 'SELECT * FROM latency_metrics WHERE 1=1';
    const params: any[] = [];

    if (countries && countries.length > 0) {
      const placeholders = countries.map(() => '?').join(',');
      query += ` AND country_code IN (${placeholders})`;
      params.push(...countries);
    }

    if (startTime) {
      query += ' AND timestamp >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND timestamp <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all();
    
    return (result.results as any[]) || [];
  }

  async getStats(
    countries?: string[],
    startTime?: string,
    endTime?: string
  ): Promise<LatencyStats[]> {
    let query = `
      SELECT 
        country,
        country_code,
        COUNT(*) as count,
        AVG(latency_ms) as avg,
        MIN(latency_ms) as min,
        MAX(latency_ms) as max
      FROM latency_metrics
      WHERE 1=1
    `;
    const params: any[] = [];

    if (countries && countries.length > 0) {
      const placeholders = countries.map(() => '?').join(',');
      query += ` AND country_code IN (${placeholders})`;
      params.push(...countries);
    }

    if (startTime) {
      query += ' AND timestamp >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND timestamp <= ?';
      params.push(endTime);
    }

    query += ' GROUP BY country_code ORDER BY country';

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all();
    
    const rows = (result.results as any[]) || [];
    
    // 计算百分位数（需要获取所有值）
    const stats: LatencyStats[] = [];
    
    for (const row of rows) {
      // 获取该国家的所有延迟值
      let valuesQuery = `
        SELECT latency_ms FROM latency_metrics 
        WHERE country_code = ? AND 1=1
      `;
      const valueParams: any[] = [row.country_code];

      if (startTime) {
        valuesQuery += ' AND timestamp >= ?';
        valueParams.push(startTime);
      }

      if (endTime) {
        valuesQuery += ' AND timestamp <= ?';
        valueParams.push(endTime);
      }

      valuesQuery += ' ORDER BY latency_ms';

      const valuesStmt = this.db.prepare(valuesQuery);
      const valuesResult = await valuesStmt.bind(...valueParams).all();
      const values = ((valuesResult.results as any[]) || []).map(r => r.latency_ms).sort((a, b) => a - b);

      stats.push({
        country: row.country,
        country_code: row.country_code,
        count: row.count,
        avg: Math.round(row.avg),
        p50: this.percentile(values, 50),
        p75: this.percentile(values, 75),
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99),
        min: row.min,
        max: row.max
      });
    }

    return stats;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil((arr.length * p) / 100) - 1;
    return arr[Math.max(0, index)];
  }

  async cleanup(daysOld: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const stmt = this.db.prepare(`
      DELETE FROM latency_metrics WHERE timestamp < ?
    `);
    
    await stmt.bind(cutoffDate.toISOString()).run();
  }
}
