import { LatencyDB } from './db';
import { DEFAULT_COUNTRIES } from './types';

export async function handleRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const db = new LatencyDB(env.DB);
  await db.init();

  try {
    // API 路由
    if (path === '/api/latency') {
      return await handleLatencyQuery(url, db, headers);
    } else if (path === '/api/stats') {
      return await handleStats(url, db, headers);
    } else if (path === '/api/countries') {
      return await handleCountries(headers);
    } else if (path === '/' || path === '') {
      return await handleFrontend(headers);
    } else {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers
      }
    );
  }
}

async function handleLatencyQuery(
  url: URL,
  db: LatencyDB,
  headers: Record<string, string>
): Promise<Response> {
  const countries = url.searchParams.get('countries')?.split(',').filter(Boolean);
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');
  const limit = parseInt(url.searchParams.get('limit') || '10000');

  const records = await db.getRecords(countries, startTime, endTime, limit);

  return new Response(JSON.stringify({ data: records, count: records.length }), {
    headers
  });
}

async function handleStats(
  url: URL,
  db: LatencyDB,
  headers: Record<string, string>
): Promise<Response> {
  const countries = url.searchParams.get('countries')?.split(',').filter(Boolean);
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');

  const stats = await db.getStats(countries, startTime, endTime);

  return new Response(JSON.stringify({ data: stats }), {
    headers
  });
}

async function handleCountries(
  headers: Record<string, string>
): Promise<Response> {
  return new Response(JSON.stringify({ data: DEFAULT_COUNTRIES }), {
    headers
  });
}

async function handleFrontend(
  headers: Record<string, string>
): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Latency Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }

    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .filters {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .filter-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 15px;
      margin-bottom: 15px;
    }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
      font-size: 0.9em;
    }

    input, select, button {
      padding: 10px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1em;
      transition: all 0.3s;
    }

    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    button {
      background: #667eea;
      color: white;
      border: none;
      cursor: pointer;
      font-weight: 600;
      align-self: flex-end;
    }

    button:hover {
      background: #764ba2;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
    }

    .stat-card h3 {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .stat-card .value {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
    }

    .stat-card .unit {
      color: #999;
      font-size: 0.9em;
      margin-top: 5px;
    }

    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .chart-container {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .chart-container h3 {
      margin-bottom: 15px;
      color: #333;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    thead {
      background: #667eea;
      color: white;
    }

    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    tbody tr:hover {
      background: #f5f5f5;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .loading {
      text-align: center;
      color: white;
      font-size: 1.2em;
      margin: 40px 0;
    }

    .spinner {
      display: inline-block;
      width: 30px;
      height: 30px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error {
      background: #ff6b6b;
      color: white;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .filter-row {
        grid-template-columns: 1fr;
      }

      .charts {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 1.8em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌍 Global Latency Dashboard</h1>
      <p>Real-time network latency monitoring across the world</p>
    </header>

    <div class="filters">
      <div class="filter-row">
        <div>
          <label for="countries">Countries:</label>
          <select id="countries" multiple size="6">
            <!-- 动态加载 -->
          </select>
          <small style="color: #999;">Hold Ctrl/Cmd to select multiple</small>
        </div>
        <div>
          <label for="startTime">Start Time:</label>
          <input type="datetime-local" id="startTime">
        </div>
        <div>
          <label for="endTime">End Time:</label>
          <input type="datetime-local" id="endTime">
        </div>
        <div style="display: flex; flex-direction: column; justify-content: flex-end;">
          <button onclick="fetchData()">Search</button>
        </div>
      </div>
    </div>

    <div id="error" class="error" style="display: none;"></div>

    <div id="loading" class="loading" style="display: none;">
      <div class="spinner"></div>
      <p>Loading data...</p>
    </div>

    <div id="content" style="display: none;">
      <div class="stats-grid" id="statsGrid"></div>

      <div class="charts">
        <div class="chart-container">
          <h3>Latency by Country</h3>
          <canvas id="latencyChart"></canvas>
        </div>
        <div class="chart-container">
          <h3>Latency Distribution (P50/P95/P99)</h3>
          <canvas id="percentileChart"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <h3>Detailed Stats</h3>
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Avg (ms)</th>
              <th>P50 (ms)</th>
              <th>P75 (ms)</th>
              <th>P95 (ms)</th>
              <th>P99 (ms)</th>
              <th>Min (ms)</th>
              <th>Max (ms)</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody id="statsTable"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    let chartInstance = null;
    let percentileChartInstance = null;

    async function loadCountries() {
      try {
        const res = await fetch('/api/countries');
        const json = await res.json();
        const select = document.getElementById('countries');
        
        json.data.forEach(country => {
          const option = document.createElement('option');
          option.value = country.code;
          option.textContent = \`\${country.name} (\${country.code})\`;
          option.selected = true; // 默认全选
          select.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load countries:', error);
      }
    }

    async function fetchData() {
      const select = document.getElementById('countries');
      const countries = Array.from(select.selectedOptions).map(opt => opt.value);
      const startTime = document.getElementById('startTime').value;
      const endTime = document.getElementById('endTime').value;

      if (countries.length === 0) {
        showError('Please select at least one country');
        return;
      }

      document.getElementById('loading').style.display = 'block';
      document.getElementById('content').style.display = 'none';
      document.getElementById('error').style.display = 'none';

      try {
        const params = new URLSearchParams({
          countries: countries.join(','),
          ...(startTime && { startTime: new Date(startTime).toISOString() }),
          ...(endTime && { endTime: new Date(endTime).toISOString() })
        });

        const [latencyRes, statsRes] = await Promise.all([
          fetch(\`/api/latency?\${params}\`),
          fetch(\`/api/stats?\${params}\`)
        ]);

        const latencyData = await latencyRes.json();
        const statsData = await statsRes.json();

        renderStats(statsData.data);
        renderCharts(statsData.data);
        renderTable(statsData.data);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
      } catch (error) {
        showError(\`Failed to fetch data: \${error.message}\`);
        document.getElementById('loading').style.display = 'none';
      }
    }

    function renderStats(data) {
      const grid = document.getElementById('statsGrid');
      grid.innerHTML = '';

      if (data.length === 0) return;

      const avgLatency = Math.round(data.reduce((sum, s) => sum + s.avg, 0) / data.length);
      const avgP95 = Math.round(data.reduce((sum, s) => sum + s.p95, 0) / data.length);
      const totalCount = data.reduce((sum, s) => sum + s.count, 0);

      const stats = [
        { label: 'Average Latency', value: avgLatency, unit: 'ms' },
        { label: 'Avg P95', value: avgP95, unit: 'ms' },
        { label: 'Countries', value: data.length, unit: '' },
        { label: 'Total Records', value: totalCount, unit: '' }
      ];

      stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = \`
          <h3>\${stat.label}</h3>
          <div class="value">\${stat.value}</div>
          <div class="unit">\${stat.unit}</div>
        \`;
        grid.appendChild(card);
      });
    }

    function renderCharts(data) {
      // 延迟图表
      const ctx = document.getElementById('latencyChart').getContext('2d');
      if (chartInstance) chartInstance.destroy();
      
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.map(s => s.country_code),
          datasets: [{
            label: 'Average Latency (ms)',
            data: data.map(s => s.avg),
            backgroundColor: '#667eea',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } }
        }
      });

      // 百分位数图表
      const pctx = document.getElementById('percentileChart').getContext('2d');
      if (percentileChartInstance) percentileChartInstance.destroy();
      
      percentileChartInstance = new Chart(pctx, {
        type: 'line',
        data: {
          labels: data.map(s => s.country_code),
          datasets: [
            { label: 'P50', data: data.map(s => s.p50), borderColor: '#667eea', tension: 0.3 },
            { label: 'P95', data: data.map(s => s.p95), borderColor: '#ff6b6b', tension: 0.3 },
            { label: 'P99', data: data.map(s => s.p99), borderColor: '#ffa500', tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top' } }
        }
      });
    }

    function renderTable(data) {
      const tbody = document.getElementById('statsTable');
      tbody.innerHTML = '';

      data.forEach(stat => {
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td><strong>\${stat.country}</strong></td>
          <td>\${stat.avg}</td>
          <td>\${stat.p50}</td>
          <td>\${stat.p75}</td>
          <td>\${stat.p95}</td>
          <td>\${stat.p99}</td>
          <td>\${stat.min}</td>
          <td>\${stat.max}</td>
          <td>\${stat.count}</td>
        \`;
        tbody.appendChild(row);
      });
    }

    function showError(message) {
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    // 初始化
    window.addEventListener('load', () => {
      loadCountries();
      // 设置默认时间范围（过去 7 天）
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      document.getElementById('startTime').value = startDate.toISOString().slice(0, 16);
      document.getElementById('endTime').value = endDate.toISOString().slice(0, 16);
      
      // 自动加载数据
      fetchData();
    });

    // 自动刷新（每 5 分钟）
    setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export interface Env {
  DB: D1Database;
}
