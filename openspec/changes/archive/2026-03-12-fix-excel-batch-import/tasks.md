## 1. Vercel Serverless Functions — 新增 batch-import 端點
- [x] 1.1 建立 `api/financial-basics/batch-import/index.js`，使用 `createRepository()` 呼叫 `batchUpsertFinancialBasics`
- [x] 1.2 建立 `api/pl-income/batch-import/index.js`，使用 `createRepository()` 呼叫 `batchUpsertPlIncome`
- [x] 1.3 兩端點皆需包含資料清理邏輯（只保留有效欄位、型別轉換 fiscal_year → int、tax_id → string trim、數值欄位 parseFloat）

## 2. Supabase Adapter — 修正數據型別處理
- [x] 2.1 `batchUpsertFinancialBasics` — 加入 `parseInt(fiscal_year)` + `String(tax_id).trim()` + `cleanRecord` 覆寫確保型別
- [x] 2.2 `batchUpsertPlIncome` — 同上處理

## 3. SQL Server Adapter — 修正參數衝突與型別問題
- [x] 3.1 `batchUpsertFinancialBasics` — SQL 參數名稱改用 `chk_`/`upd_` 前綴避免與資料欄位衝突；UPDATE 排除主鍵欄位；欄位名加 `[]` 括號
- [x] 3.2 `batchUpsertPlIncome` — 同上修正
- [x] 3.3 新增 `_normalizeRecord()` 方法（字串數值 → number）；改善 `inferSqlType()` 支援 BigInt、文字欄位辨識、null 預設型別

## 4. server.js — 同步更新 Express batch-import 路由
- [x] 4.1 `financial-basics/batch-import` — 完整型別轉換（fiscal_year → int、text fields → string、其餘 → parseFloat）
- [x] 4.2 `pl-income/batch-import` — 同上

## 5. 清理 — 移除已停用的 legacy 端點（Vercel Hobby 12 函數上限）
- [x] 5.1 刪除 `api/financial/bulk.js`（僅回傳 403，已停用）
- [x] 5.2 刪除 `api/financial/index.js`（僅回傳 403，已停用）

## 6. 部署與驗證
- [x] 6.1 Vercel 生產環境部署成功（https://bpap.vercel.app）
- [x] 6.2 Vercel (Supabase) 匯入驗證通過 — Excel 財務報表 21 筆 + 損益表 21 筆全部成功寫入，2025 年資料正確顯示於表格、圖表、KPI 卡片
- [ ] 6.3 Jenkins (SQL Server) 匯入驗證 — 待 commit/push 後在企業內網 Jenkins build 並測試
