# Global Latency Dashboard

Real-time network latency monitoring dashboard built on Cloudflare Workers and D1.

## Features

- 🌍 Monitor latency across 12+ countries in real-time
- 📊 Interactive charts and statistics (P50, P75, P95, P99)
- 🗄️ Historical data retention (7 days)
- 🔄 Auto-refresh every 5 minutes
- 📱 Responsive design
- 🚀 Deployed on Cloudflare Workers

## Architecture

```
Cloudflare Workers
├── Scheduled Worker (Every 5 minutes)
│   └── Generate random latency data for each country
├── API Worker
│   ├── GET /api/latency (Query raw data)
│   ├── GET /api/stats (Get statistics)
│   └── GET /api/countries (List monitored countries)
└── Frontend (SPA)
    ├── Country/Time range filtering
    ├── Interactive charts
    └── Detailed statistics table
```

## Technologies

- **Compute**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: HTML5 + Chart.js
- **Infrastructure as Code**: Wrangler

## Setup & Deployment

### Prerequisites

- Node.js 16+
- Cloudflare account with Workers enabled
- GitHub account with access token

### Installation

```bash
# Clone the repository
git clone https://github.com/yourname/latency-dashboard.git
cd latency-dashboard

# Install dependencies
npm install

# Configure your Cloudflare account
wrangler login

# Create D1 database
wrangler d1 create latency-metrics

# Update wrangler.toml with your database ID
```

### Deploy

```bash
# Development
npm run dev

# Production
npm run deploy
```

### DNS Setup

Point your domain to Cloudflare:

```
latency.myzhangyujie.com → Cloudflare Workers route
```

## Configuration

Edit `wrangler.toml` to customize:

- **Database name**: Change `bucket_name`
- **Domain**: Update routes
- **Cron schedule**: Modify `*/5 * * * *` (currently every 5 minutes)
- **Countries**: Edit `src/types.ts` DEFAULT_COUNTRIES

## API Endpoints

### Get Latency Data

```bash
GET /api/latency?countries=US,CN&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z&limit=1000
```

Response:
```json
{
  "data": [
    {
      "id": 1,
      "country": "United States",
      "country_code": "US",
      "latency_ms": 125,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "count": 100
}
```

### Get Statistics

```bash
GET /api/stats?countries=US,CN&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z
```

Response:
```json
{
  "data": [
    {
      "country": "United States",
      "country_code": "US",
      "count": 288,
      "avg": 125,
      "p50": 120,
      "p75": 150,
      "p95": 180,
      "p99": 195,
      "min": 50,
      "max": 200
    }
  ]
}
```

### Get Countries

```bash
GET /api/countries
```

Response:
```json
{
  "data": [
    { "name": "United States", "code": "US" },
    { "name": "China", "code": "CN" },
    ...
  ]
}
```

## Data Retention

- Data older than 7 days is automatically deleted
- Cleanup runs every 5 minutes alongside data generation
- Adjust retention period in `src/db.ts` cleanup() method

## Monitored Countries

- United States (US)
- China (CN)
- Japan (JP)
- United Kingdom (UK)
- Germany (DE)
- France (FR)
- India (IN)
- Brazil (BR)
- Australia (AU)
- Canada (CA)
- Singapore (SG)
- South Korea (KR)

## Development

### Local Development

```bash
npm run dev
# Visit http://localhost:8787
```

### Build

```bash
npm run build
```

### Database Management

```bash
# List all databases
wrangler d1 list

# Query database
wrangler d1 execute latency-metrics --command "SELECT * FROM latency_metrics LIMIT 10"

# Backup database
wrangler d1 backup create latency-metrics
```

## Troubleshooting

### Database errors

```bash
# Reinitialize database
wrangler d1 execute latency-metrics --file=schema.sql
```

### No data appearing

1. Check scheduled worker logs: `wrangler tail`
2. Verify database binding in `wrangler.toml`
3. Ensure cron trigger is enabled: `wrangler deploy --env production`

## Performance Optimizations

- Database indexes on `country` and `timestamp` for fast queries
- Percentile calculations optimized with sorted arrays
- Frontend charts cached with Chart.js instance management
- 7-day data retention to balance storage vs historical data

## Security

- CORS enabled for cross-origin requests
- No authentication required (can be added)
- Database access limited to Workers environment
- All queries use parameterized statements to prevent SQL injection

## Future Enhancements

- [ ] Real latency data integration (ICMP/TCP probes)
- [ ] WebSocket updates for real-time data
- [ ] Custom alert thresholds
- [ ] Export data to CSV/JSON
- [ ] Multi-region deployment
- [ ] Advanced analytics (trends, anomalies)

## License

MIT

## Support

For issues or questions, please open a GitHub issue.

## Author

Created with Cloudflare Workers & D1
