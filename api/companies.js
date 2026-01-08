// Vercel Serverless Function: 取得所有公司列表
import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  // 處理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 從環境變數取得 Turso 設定
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (!tursoUrl || !tursoToken) {
      console.error('Turso 設定不完整');
      return res.status(500).json({ error: '資料庫設定不完整' });
    }

    // 建立 Turso 客戶端
    const client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    // 查詢所有公司
    const result = await client.execute('SELECT id, name FROM companies ORDER BY name');

    const companies = result.rows.map(row => ({
      id: row.id,
      name: row.name,
    }));

    res.status(200).json({ companies });
  } catch (error) {
    console.error('取得公司列表失敗:', error);
    res.status(500).json({ error: '取得公司列表失敗', message: error.message });
  }
}
