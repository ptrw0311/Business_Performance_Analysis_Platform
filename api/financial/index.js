// Vercel Serverless Function: 新增/更新財務資料
import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  // 處理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { company, year, revenue, profit } = req.body;

    if (!company || !year || revenue === undefined || profit === undefined) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }

    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (!tursoUrl || !tursoToken) {
      return res.status(500).json({ error: '資料庫設定不完整' });
    }

    const client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    // 確保公司存在，不存在則建立
    await client.execute({
      sql: 'INSERT OR IGNORE INTO companies (name) VALUES (?)',
      args: [company],
    });

    // 取得公司 ID
    const companyResult = await client.execute({
      sql: 'SELECT id FROM companies WHERE name = ?',
      args: [company],
    });

    if (companyResult.rows.length === 0) {
      return res.status(500).json({ error: '無法建立公司' });
    }

    const companyId = companyResult.rows[0].id;

    // 新增或更新財務資料 (使用 UPSERT)
    await client.execute({
      sql: `
        INSERT INTO financial_data (company_id, year, revenue, profit)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(company_id, year) DO UPDATE SET
          revenue = excluded.revenue,
          profit = excluded.profit
      `,
      args: [companyId, year, revenue, profit],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('更新財務資料失敗:', error);
    res.status(500).json({ error: '更新財務資料失敗', message: error.message });
  }
}
