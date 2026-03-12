## MODIFIED Requirements
### Requirement: 批次匯入 API

系統 MUST 提供批次匯入 API 端點，同時支援 Vercel Serverless Functions 和 Express 本地伺服器。

#### Scenario: Vercel Serverless Function 批次匯入 API
- Given Vercel 部署環境存在 `api/financial-basics/batch-import/index.js` 和 `api/pl-income/batch-import/index.js`
- And 後端收到 POST /api/financial-basics/batch-import 請求
- And Request body 包含 records 陣列
- When 系統處理每筆記錄
- Then 系統 MUST 清理資料，只保留資料表定義的有效欄位
- And 系統 MUST 將 fiscal_year 轉換為 integer、tax_id 轉換為 trimmed string
- And 系統 MUST 使用 Repository 的 batchUpsertFinancialBasics 方法寫入資料
- And 系統 MUST 回傳 inserted/updated/skipped/errors 統計

#### Scenario: Express 本地伺服器批次匯入 API
- Given Express server.js 已註冊 POST /api/financial-basics/batch-import 和 POST /api/pl-income/batch-import 路由
- And Request body 包含 records 陣列
- When 系統處理每筆記錄
- Then 系統 MUST 使用與 Vercel 端點相同的資料清理和型別轉換邏輯
- And 系統 MUST 透過 Repository 正確寫入 Supabase 或 SQL Server

#### Scenario: SQL Server 批次匯入參數正確性
- Given 資料庫類型為 SQL Server
- And 系統收到批次匯入請求
- When 系統執行 MERGE/INSERT/UPDATE 操作
- Then 系統 MUST 避免 SQL 參數名稱衝突（如 @taxId 和 @tax_id 不可同時出現在同一 request）
- And 系統 MUST 正確推斷每個欄位的 SQL Server 資料型別
- And 系統 MUST 處理 Excel 解析後數字欄位為字串的情況
