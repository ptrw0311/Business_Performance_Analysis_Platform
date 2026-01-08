// Vercel Serverless Function: 匯出所有資料為 Excel
import { createClient } from '@libsql/client';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  // 處理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (!tursoUrl || !tursoToken) {
      return res.status(500).json({ error: '資料庫設定不完整' });
    }

    const client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    // 查詢所有公司的財務資料
    const result = await client.execute({
      sql: `
        SELECT c.name as company, fd.year, fd.revenue, fd.profit
        FROM financial_data fd
        JOIN companies c ON c.id = fd.company_id
        ORDER BY c.name, fd.year
      `,
    });

    // 建立匯出資料
    const exportData = [['公司名稱', '年份', '營收', '稅前淨利']];
    result.rows.forEach(row => {
      exportData.push([row.company, row.year, row.revenue, row.profit]);
    });

    // 建立 Excel 檔案
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '所有公司績效數據');

    // 輸出為 buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 設定回應標頭
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="多公司績效數據庫_${new Date().toISOString().slice(0, 10)}.xlsx"`);

    res.status(200).send(excelBuffer);
  } catch (error) {
    console.error('匯出失敗:', error);
    res.status(500).json({ error: '匯出失敗', message: error.message });
  }
}
