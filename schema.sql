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
