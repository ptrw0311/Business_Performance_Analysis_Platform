# Spec：Excel 匯入/匯出功能

## 概述

本規範定義數據與檔案管理區塊的 Excel 匯入/匯出功能，包含前端組件、後端 API、Excel 檔案格式等詳細規格。

## Excel 檔案格式規範

### 檔案結構

| Sheet 名稱 | 對應資料表 | 欄位數量 | 說明 |
|-----------|-----------|---------|------|
| 財務報表 | financial_basics | 80+ | 資產負債表完整欄位 |
| 損益表 | pl_income_basics | 26 | 損益表完整欄位 |
| 驗證機制 | (不處理) | - | 供參考，不匯入 |

### 列結構

```
第 1 列：中文欄位名稱（column_description）
第 2 列：英文欄位名稱（column_name）
第 3 列起：資料內容
```

### 範例：財務報表

```
│ A          │ B          │ C             │ D             │ E                 │ ...
├────────────┼────────────┼───────────────┼───────────────┼───────────────────┼────
│ 年度       │ 統一編號    │ 公司名稱      │ 會計科目      │ 現金及約當現金     │ ...
├────────────┼────────────┼───────────────┼───────────────┼───────────────────┼────
│ fiscal_year│ tax_id     │ company_name  │ account_item  │ cash_equivalents  │ ...
├────────────┼────────────┼───────────────┼───────────────┼───────────────────┼────
│ 2024       │ 28497918   │ 博弘雲端      │ 6997 博弘     │ 720946            │ ...
│ 2024       │ 96979933   │ 中華電信      │ 2412 中華電   │ 36259000          │ ...
```

## 欄位對應規則

### 主要規則（優先）

以第 2 列的**英文名稱**直接對應 Supabase 的 `column_name`：

```javascript
const mapping = {};
headersRow2.forEach((engName, index) => {
  if (engName && columnNames.includes(engName)) {
    mapping[engName] = index;
  }
});
```

### 次要規則（備用）

若第 2 列無法對應，以第 1 列的**中文欄位名稱**對應 Supabase 的 `column_description`：

```javascript
// 從資料庫查詢欄位描述對應
const columnDescriptions = await db.query(`
  SELECT column_name, column_description
  FROM information_schema.columns
  WHERE table_name = 'financial_basics'
`);

headersRow1.forEach((chiName, index) => {
  const match = columnDescriptions.find(col => col.column_description === chiName);
  if (match && !mapping[match.column_name]) {
    mapping[match.column_name] = index;
  }
});
```

### financial_basics 欄位清單

```sql
-- 主要欄位（必填）
fiscal_year INTEGER NOT NULL
tax_id TEXT NOT NULL
company_name TEXT
account_item TEXT

-- 流動資產
cash_equivalents NUMERIC
fvtpl_assets_current NUMERIC
fvoci_assets_current NUMERIC
amortized_assets_current NUMERIC
hedging_assets_current NUMERIC
contract_assets_current NUMERIC
notes_receivable_net NUMERIC
ar_net NUMERIC
ar_related_net NUMERIC
other_receivables_net NUMERIC
current_tax_assets NUMERIC
inventory NUMERIC
prepayments NUMERIC
assets_held_for_sale_net NUMERIC
other_fin_assets_current NUMERIC
other_current_assets NUMERIC
total_current_assets NUMERIC

-- 非流動資產
fvtpl_assets_noncurrent NUMERIC
fvoci_assets_noncurrent NUMERIC
amortized_assets_noncurrent NUMERIC
contract_assets_noncurrent NUMERIC
equity_method_investments NUMERIC
ppe NUMERIC
right_of_use_assets NUMERIC
investment_properties_net NUMERIC
intangible_assets NUMERIC
deferred_tax_assets NUMERIC
other_noncurrent_assets NUMERIC
total_noncurrent_assets NUMERIC
total_assets NUMERIC

-- 流動負債
prepayments_for_equip NUMERIC
guarantee_deposits_out NUMERIC
short_term_borrowings NUMERIC
short_term_notes_payable NUMERIC
financial_liabilities_at_fair_value_through_profit_or_loss_curr NUMERIC
hedging_liabilities_current NUMERIC
contract_liabilities_current NUMERIC
notes_payable NUMERIC
ap NUMERIC
ap_related NUMERIC
other_payables NUMERIC
income_tax_payable NUMERIC
provisions_current NUMERIC
lease_liabilities_current NUMERIC
other_current_liabilities NUMERIC
total_current_liabilities NUMERIC

-- 非流動負債
contract_liabilities_noncurrent NUMERIC
bonds_payable NUMERIC
long_term_borrowings NUMERIC
provisions_noncurrent NUMERIC
deferred_tax_liabilities NUMERIC
lease_liabilities_noncurrent NUMERIC
other_noncurrent_liabilities NUMERIC
total_noncurrent_liabilities NUMERIC

-- 其他
guarantee_deposits_in NUMERIC
total_liabilities NUMERIC
common_stock NUMERIC
total_capital_stock NUMERIC
capital_reserves NUMERIC
legal_reserves NUMERIC
special_reserves NUMERIC
retained_earnings_unappropriated NUMERIC
total_retained_earnings NUMERIC
other_equity NUMERIC
treasury_stock NUMERIC
equity_attr_parent NUMERIC
nci NUMERIC
total_equity NUMERIC
liabilities_equity_total NUMERIC
shares_to_be_cancelled BIGINT
advance_receipts_shares BIGINT
treasury_shares_held BIGINT
```

### pl_income_basics 欄位清單

```sql
-- 主要欄位（必填）
fiscal_year INTEGER NOT NULL
tax_id TEXT NOT NULL
company_name TEXT NOT NULL
account_item TEXT

-- 損益表欄位
operating_revenue_total NUMERIC
operating_costs_total NUMERIC
gross_profit_loss NUMERIC
gross_profit_loss_net NUMERIC
selling_expenses NUMERIC
general_admin_expenses NUMERIC
r_and_d_expenses NUMERIC
expected_credit_loss_net NUMERIC
operating_expenses_total NUMERIC
other_income_expense_net NUMERIC
operating_income_loss NUMERIC
interest_income NUMERIC
other_income NUMERIC
other_gains_losses_net NUMERIC
finance_costs_net NUMERIC
equity_method_share_net NUMERIC
nonop_income_expense_total NUMERIC
profit_before_tax NUMERIC
income_tax_expense_total NUMERIC
net_income_cont_ops NUMERIC
net_income NUMERIC
```

## API 規範

### POST /api/financial-basics/batch-import

批次匯入財務報表資料。

#### Request

```json
{
  "records": [
    {
      "fiscal_year": 2024,
      "tax_id": "28497918",
      "company_name": "博弘雲端",
      "account_item": "6997 博弘",
      "cash_equivalents": 720946,
      "ar_net": 708366,
      ...
    }
  ],
  "options": {
    "upsert": true,
    "skipErrors": false
  }
}
```

#### Response（成功）

```json
{
  "success": true,
  "data": {
    "inserted": 12,
    "updated": 5,
    "skipped": 0,
    "errors": []
  }
}
```

#### Response（部分失敗）

```json
{
  "success": true,
  "data": {
    "inserted": 11,
    "updated": 5,
    "skipped": 1,
    "errors": [
      {
        "row": 14,
        "reason": "缺少必要欄位 fiscal_year",
        "data": { "tax_id": "12345678", ... }
      }
    ]
  }
}
```

### GET /api/financial-basics/export

匯出財務報表為 Excel 檔案。

#### Query Parameters

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| taxId | string | 否 | 篩選特定統一編號 |
| fiscalYear | number | 否 | 篩選特定年度 |
| format | string | 否 | 輸出格式，預設 `xlsx` |

#### Response

Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

二進位 Excel 檔案串流。

### POST /api/pl-income/batch-import

批次匯入損益表資料。格式同 financial-basics。

### GET /api/pl-income/export

匯出損益表為 Excel 檔案。格式同 financial-basics。

## 前端組件規範

### ExcelImportButton.jsx

```jsx
<ExcelImportButton
  onImportStart={() => {}}
  onImportComplete={(result) => {}}
  onError={(error) => {}}
/>
```

#### Props

| Prop | 類型 | 必填 | 說明 |
|------|------|------|------|
| onImportStart | function | 否 | 開始匯入時回呼 |
| onImportComplete | function | 否 | 匯入完成時回呼，參數為結果物件 |
| onError | function | 否 | 發生錯誤時回呼 |

#### 行為

1. 點擊後開啟檔案選擇器（只接受 .xlsx）
2. 解析 Excel 檔案
3. 顯示 ImportPreviewModal

### ExcelExportButton.jsx

```jsx
<ExcelExportButton
  tableType="financial-basics" // or "pl-income"
  filters={{ taxId: "28497918", fiscalYear: 2024 }}
  disabled={false}
/>
```

#### Props

| Prop | 類型 | 必要 | 說明 |
|------|------|------|------|
| tableType | string | 是 | `"financial-basics"` 或 `"pl-income"` |
| filters | object | 否 | 篩選條件 |
| disabled | boolean | 否 | 是否禁用 |

#### 行為

1. 點擊後呼叫對應的 export API
2. 下載生成的 Excel 檔案
3. 檔名格式：`財務資料_YYYYMMDD_HHMMSS.xlsx`

### ImportPreviewModal.jsx

```jsx
<ImportPreviewModal
  isOpen={true}
  parsedData={{
    financialBasics: { toInsert: 12, toUpdate: 5, errors: [] },
    plIncome: { toInsert: 12, toUpdate: 5, errors: [] }
  }}
  onConfirm={() => {}}
  onCancel={() => {}}
/>
```

#### Props

| Prop | 類型 | 必要 | 說明 |
|------|------|------|------|
| isOpen | boolean | 是 | 是否顯示 Modal |
| parsedData | object | 是 | 解析後的資料統計 |
| onConfirm | function | 是 | 確認匯入回呼 |
| onCancel | function | 是 | 取消匯入回呼 |

### ImportResultToast.jsx

```jsx
<ImportResultToast
  results={{
    financialBasics: { success: 17, failed: 0 },
    plIncome: { success: 17, failed: 0 }
  }}
  onClose={() => {}}
/>
```

## 錯誤處理規範

### 錯誤類型

| 錯誤代碼 | 說明 | 處理方式 |
|----------|------|----------|
| INVALID_FILE_FORMAT | 檔案不是 .xlsx 格式 | 顯示錯誤訊息，不執行匯入 |
| MISSING_REQUIRED_SHEET | 缺少必要的 Sheet | 顯示警告，跳過該 Sheet |
| MISSING_REQUIRED_FIELD | 缺少必要欄位 | 跳過該筆資料，記錄錯誤 |
| FIELD_MAPPING_FAILED | 欄位對應失敗 | 記錄警告，跳過該欄位 |
| INVALID_DATA_FORMAT | 資料格式錯誤 | 跳過該筆資料，記錄錯誤 |
| API_ERROR | API 呼叫失敗 | 顯示錯誤訊息，支援重新嘗試 |

## 檔名規則

### 匯出檔案

格式：`財務資料_YYYYMMDD_HHMMSS.xlsx`

範例：
- `財務資料_20260202_143052.xlsx`
- `財務資料_20260202_153000.xlsx`

### 匯入檔案

無嚴格限制，但建議使用相同格式以便識別。

## 測試規範

### 單元測試

#### excelParser.js 測試

```javascript
describe('ExcelParser', () => {
  test('應正確解析雙列標題格式', () => {
    // 測試第 1 列中文、第 2 列英文的解析
  });

  test('應正確對應英文名稱到 column_name', () => {
    // 測試主要規則
  });

  test('應正確對應中文名稱到 column_description', () => {
    // 測試次要規則
  });

  test('應跳過無法對應的欄位', () => {
    // 測試錯誤處理
  });
});
```

### E2E 測試

```javascript
test('完整匯入流程', async ({ page }) => {
  // 1. 開啟數據管理頁面
  await page.goto('/data-management');

  // 2. 點擊匯入按鈕
  await page.click('[data-testid="excel-import-button"]');

  // 3. 選擇檔案
  await page.setInputFiles('input[type="file"]', 'test-data.xlsx');

  // 4. 確認預覽
  await page.click('[data-testid="confirm-import"]');

  // 5. 驗證結果
  await expect(page.locator('[data-testid="import-success-toast"]')).toBeVisible();
});
```
