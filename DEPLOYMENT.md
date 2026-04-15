# Deployment Guide: Latency Dashboard on Cloudflare

这是一份完整的部署指南，将帮助你在 Cloudflare 账户中部署延迟监控仪表板。

## 📋 前置条件

- Cloudflare 账户（已激活 Workers）
- 拥有的域名（如 `myzhangyujie.com`）
- Node.js 16+ 和 npm
- Git

## 🚀 部署步骤

### 1. 克隆项目

```bash
git clone https://github.com/zhangyju/latency-dashboard.git
cd latency-dashboard
```

### 2. 安装依赖

```bash
npm install
```

### 3. Cloudflare 认证

```bash
npm install -g wrangler
wrangler login
```

按照提示登录你的 Cloudflare 账户。

### 4. 创建 D1 数据库

```bash
wrangler d1 create latency-metrics
```

输出将显示类似：
```
Database created!
Binding name: DB
Database ID: <YOUR_DATABASE_ID>
```

### 5. 更新 wrangler.toml

打开 `wrangler.toml`，更新以下部分：

```toml
# 替换为你的账户 ID（从 Cloudflare Dashboard 获取）
account_id = "YOUR_ACCOUNT_ID"

# 替换为你的数据库 ID（从上一步获得）
[[d1_databases]]
binding = "DB"
database_name = "latency-metrics"
database_id = "YOUR_DATABASE_ID"

# 更新你的域名
[env.production]
routes = [
  { pattern = "latency.myzhangyujie.com/api/*", zone_name = "myzhangyujie.com" },
  { pattern = "latency.myzhangyujie.com", zone_name = "myzhangyujie.com" }
]
```

### 6. 初始化数据库

```bash
wrangler d1 execute latency-metrics --file=schema.sql
```

验证表已创建：
```bash
wrangler d1 execute latency-metrics --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### 7. 部署到 Cloudflare

```bash
wrangler deploy --env production
```

成功部署后，你会看到：
```
✓ Deployed to https://latency.myzhangyujie.com
```

### 8. 配置 DNS（在 Cloudflare Dashboard）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名
3. 进入 **DNS** → **Records**
4. 添加 CNAME 记录：
   - **Name**: `latency`
   - **Target**: `latency-dashboard.<your-account>.workers.dev`
   - **Proxy status**: ✓ Proxied
5. 保存

或者，如果你想使用 Workers Route，可以在 Dashboard 的 **Workers & Pages** 中配置。

### 9. 测试部署

```bash
# 查看实时日志
wrangler tail --env production

# 在另一个终端测试
curl https://latency.myzhangyujie.com/api/countries
```

你应该看到：
```json
{
  "data": [
    { "name": "United States", "code": "US" },
    ...
  ]
}
```

## 📊 验证数据流

### 1. 手动触发一次数据生成

```bash
wrangler execute --name latency-dashboard --env production
```

### 2. 检查数据

```bash
wrangler d1 execute latency-metrics --command "SELECT COUNT(*) FROM latency_metrics;"
```

### 3. 查询 API

打开浏览器访问：
```
https://latency.myzhangyujie.com
```

## 📈 预期行为

- **每 5 分钟**：Scheduled Worker 自动生成新的延迟数据
- **实时刷新**：前端每 5 分钟自动刷新数据
- **数据保留**：7 天历史数据自动清理
- **图表展示**：展示 Average / P50 / P95 / P99 延迟

## 🔧 常见问题

### Q1: 部署后看不到数据

**解决方案**：
1. 等待 5 分钟，让 Scheduled Worker 运行一次
2. 检查日志：`wrangler tail --env production`
3. 验证数据库有数据：
   ```bash
   wrangler d1 execute latency-metrics --command "SELECT COUNT(*) as count FROM latency_metrics;"
   ```

### Q2: 404 错误访问不到网站

**解决方案**：
1. 确认 DNS 记录已正确配置
2. 检查 `wrangler.toml` 中的 routes 是否与你的域名匹配
3. 验证部署成功：
   ```bash
   wrangler deployments list
   ```

### Q3: 数据库错误 "no table named latency_metrics"

**解决方案**：
```bash
# 重新初始化数据库
wrangler d1 execute latency-metrics --file=schema.sql

# 验证表已创建
wrangler d1 execute latency-metrics --command "SELECT * FROM latency_metrics LIMIT 1;"
```

### Q4: 如何修改监测的国家？

编辑 `src/types.ts` 中的 `DEFAULT_COUNTRIES` 数组：

```typescript
export const DEFAULT_COUNTRIES = [
  { name: 'Your Country', code: 'XX' },
  // 添加更多国家
];
```

然后重新部署：
```bash
wrangler deploy --env production
```

### Q5: 如何查看实时日志？

```bash
wrangler tail --env production
```

## 📊 数据库管理

### 查看所有表

```bash
wrangler d1 execute latency-metrics --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### 查询数据

```bash
wrangler d1 execute latency-metrics --command "SELECT * FROM latency_metrics ORDER BY timestamp DESC LIMIT 10;"
```

### 删除所有数据（重置）

```bash
wrangler d1 execute latency-metrics --command "DELETE FROM latency_metrics;"
```

### 备份数据库

```bash
wrangler d1 backup create latency-metrics
```

## 🔐 安全性

- CORS 已启用（允许跨域请求）
- 所有查询使用参数化语句防止 SQL 注入
- 数据存储在 Cloudflare D1（加密）
- 无认证要求（可选添加）

## 📈 性能优化

- 数据库索引优化查询速度
- 前端图表实例缓存
- 7 天数据自动清理节省存储空间
- 每 5 分钟增量数据（可调整）

## 🚨 监控和告警

### 设置告警（可选）

编辑 `src/scheduled.ts` 添加告警逻辑：

```typescript
// 例如，如果某国家延迟 > 300ms 就告警
const HIGH_LATENCY_THRESHOLD = 300;

const highLatencyCountries = records.filter(r => r.latency_ms > HIGH_LATENCY_THRESHOLD);
if (highLatencyCountries.length > 0) {
  // 发送通知（Slack, 邮件等）
}
```

## 💰 成本估算

**Cloudflare Workers**:
- 每月 100 万请求免费
- 超出部分：$0.15/百万请求

**D1 数据库**:
- 免费套餐：10 GB 存储，10 亿行读取，100 万行写入

**估计成本**（中等使用）:
- 每 5 分钟生成 12 条记录 = 每天 3,456 条
- 7 天保留 = 最多 24,192 条记录（远低于免费额度）
- API 查询：假设 100 用户/天，每人查询 10 次 = 1,000 查询/天
- **月成本**：基本免费

## 🔄 更新部署

当代码有更新时：

```bash
git pull origin main
npm install
wrangler deploy --env production
```

## 📚 更多资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 参考](https://developers.cloudflare.com/workers/wrangler/)

## 支持

遇到问题？

1. 检查 [GitHub Issues](https://github.com/zhangyju/latency-dashboard/issues)
2. 查看 Cloudflare 状态页面：https://www.cloudflarestatus.com/
3. 查看部署日志：`wrangler tail --env production`

---

祝你部署顺利！🎉
