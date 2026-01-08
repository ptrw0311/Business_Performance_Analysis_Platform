// Vercel Serverless Function: 批量匯入財務資料
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
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: '資料格式錯誤' });
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

    // 使用交易處理批量匯入
    const newCompanies = new Set();
    let importCount = 0;

    for (const item of data) {
      const { company, year, revenue, profit } = item;

      if (!company || !year || revenue === undefined || profit === undefined) {
        continue;
      }

      // 確保公司存在
      const existingCompany = await client.execute({
        sql: 'SELECT id FROM companies WHERE name = ?',
        args: [company],
      });

      let companyId;
      if (existingCompany.rows.length === 0) {
        await client.execute({
          sql: 'INSERT INTO companies (name) VALUES (?)',
          args: [company],
        });
        const newCompanyResult = await client.execute({
          sql: 'SELECT id FROM companies WHERE name = ?',
          args: [company],
        });
        companyId = newCompanyResult.rows[0].id;
        newCompanies.add(company);
      } else {
        companyId = existingCompany.rows[0].id;
      }

      // 新增或更新財務資料
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

      importCount++;
    }

    res.status(200).json({
      success: true,
      imported: importCount,
      companies: Array.from(newCompanies),
    });
  } catch (error) {
    console.error('批量匯入失敗:', error);
    res.status(500).json({ error: '批量匯入失敗', message: error.message });
  }
}
