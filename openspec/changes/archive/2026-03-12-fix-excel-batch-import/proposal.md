# Change: 修正 Excel 批次匯入功能（Supabase + SQL Server）

## Why
使用者透過網頁「從 Excel 匯入」功能上傳含 2025 年資料的 Excel 檔案，按下確認後資料未寫入資料庫。原因有二：

1. **Vercel (Supabase) 環境**：前端呼叫 `POST /api/financial-basics/batch-import` 和 `POST /api/pl-income/batch-import`，但 Vercel Serverless Functions 目錄下**完全沒有這兩個端點**。只有 `api/financial-basics/index.js` 和 `api/pl-income/index.js` 處理單筆 CRUD，batch-import 路由只存在於 `server.js`（Express 本地開發伺服器）。
2. **Jenkins (SQL Server) 環境**：`server.js` 有 batch-import 路由，`SqlServerAdapter` 也有 `batchUpsertFinancialBasics`/`batchUpsertPlIncome` 方法。但 SQL Server 的 `inferSqlType` 需要處理 Excel 解析後可能為字串的數值欄位，且 `batchUpsertFinancialBasics` 中 `tax_id` 和 `fiscal_year` 參數名稱與 `updateReq.input` 的 key 可能衝突（同時有 `@taxId` 和 `@tax_id`）。

## What Changes
- **新增** `api/financial-basics/batch-import/index.js` — Vercel Serverless Function 批次匯入財務報表端點
- **新增** `api/pl-income/batch-import/index.js` — Vercel Serverless Function 批次匯入損益表端點
- **修正** `lib/database/adapters/sqlserver-adapter.js` — 修正 `batchUpsertFinancialBasics` 和 `batchUpsertPlIncome` 中 SQL 參數名稱衝突問題，以及數值型別轉換
- **修正** `lib/database/adapters/supabase-adapter.js` — 確保 `batchUpsertFinancialBasics` 和 `batchUpsertPlIncome` 正確處理 Excel 解析後的數據型別（fiscal_year 為 string 時轉 int）

## Impact
- Affected specs: `excel-import-export`（修改 Requirement: 批次匯入 API）
- Affected code:
  - `api/financial-basics/batch-import/index.js` (新增)
  - `api/pl-income/batch-import/index.js` (新增)
  - `lib/database/adapters/sqlserver-adapter.js` (修正)
  - `lib/database/adapters/supabase-adapter.js` (修正)
  - `server.js` (確認一致性)
