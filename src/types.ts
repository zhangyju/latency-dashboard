export interface LatencyRecord {
  id?: number;
  country: string;
  country_code: string;
  latency_ms: number;
  timestamp: string;
}

export interface LatencyStats {
  country: string;
  country_code: string;
  count: number;
  avg: number;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface QueryParams {
  countries?: string[];
  startTime?: string;
  endTime?: string;
  limit?: number;
}

// 默认监测的国家列表
export const DEFAULT_COUNTRIES = [
  { name: 'United States', code: 'US' },
  { name: 'China', code: 'CN' },
  { name: 'Japan', code: 'JP' },
  { name: 'United Kingdom', code: 'UK' },
  { name: 'Germany', code: 'DE' },
  { name: 'France', code: 'FR' },
  { name: 'India', code: 'IN' },
  { name: 'Brazil', code: 'BR' },
  { name: 'Australia', code: 'AU' },
  { name: 'Canada', code: 'CA' },
  { name: 'Singapore', code: 'SG' },
  { name: 'South Korea', code: 'KR' }
];
