// 初始化 Turso 資料庫
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

console.log('🔧 正在初始化 Turso 資料庫...\n');

try {
  // 建立 companies 資料表
  console.log('建立 companies 資料表...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ companies 資料表已建立');

  // 建立 financial_data 資料表
  console.log('建立 financial_data 資料表...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS financial_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      year TEXT NOT NULL,
      revenue REAL NOT NULL,
      profit REAL NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, year)
    )
  `);
  console.log('✅ financial_data 資料表已建立');

  // 檢查是否已有資料
  const existingCompanies = await client.execute('SELECT COUNT(*) as count FROM companies');
  if (existingCompanies.rows[0].count === 0) {
    console.log('\n📝 插入 demo 資料...');

    // 插入博弘雲端
    await client.execute({
      sql: "INSERT INTO companies (name) VALUES ('博弘雲端')",
    });

    const companyResult = await client.execute({
      sql: "SELECT id FROM companies WHERE name = '博弘雲端'",
    });
    const companyId = companyResult.rows[0].id;

    // 插入財務資料
    const financialData = [
      { year: '2021', revenue: 3510, profit: 83 },
      { year: '2022', revenue: 5061, profit: 79 },
      { year: '2023', revenue: 4749, profit: 121 },
      { year: '2024', revenue: 4002, profit: 161 },
      { year: '2025', revenue: 4468, profit: 143 },
    ];

    for (const data of financialData) {
      await client.execute({
        sql: 'INSERT INTO financial_data (company_id, year, revenue, profit) VALUES (?, ?, ?, ?)',
        args: [companyId, data.year, data.revenue, data.profit],
      });
    }

    console.log('✅ Demo 資料已插入 (博弘雲端, 5年財務資料)');
  } else {
    console.log('\nℹ️ 資料庫已有資料，跳過插入');
  }

  // 驗證資料
  const verifyCompanies = await client.execute('SELECT * FROM companies');
  const verifyData = await client.execute('SELECT c.name, fd.year, fd.revenue, fd.profit FROM financial_data fd JOIN companies c ON c.id = fd.company_id');

  console.log('\n📊 目前資料庫狀態:');
  console.log(`   - 公司數量: ${verifyCompanies.rows.length}`);
  console.log(`   - 財務資料筆數: ${verifyData.rows.length}`);

  console.log('\n🎉 資料庫初始化完成！\n');
} catch (error) {
  console.error('❌ 初始化失敗:', error);
  process.exit(1);
}
