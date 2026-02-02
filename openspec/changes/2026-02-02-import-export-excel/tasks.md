# 實作任務：Excel 匯入/匯出功能

## 階段一：環境準備與 API 設計

- [x] **Task 1.1**：安裝後端依賴 `exceljs`
- [x] **Task 1.2**：設計批次匯入 API payload 格式
- [x] **Task 1.3**：設計匯出 API 回應格式

## 階段二：後端 API 實作

### 財務報表 (financial_basics)

- [x] **Task 2.1**：實作 `POST /api/financial-basics/batch-import`
  - 接收 Excel 資料
  - PK 判斷 (fiscal_year + tax_id)
  - Upsert 邏輯
  - 錯誤處理與回應

- [x] **Task 2.2**：實作 `GET /api/financial-basics/export`
  - 查詢資料（支援篩選）
  - 生成 Excel（雙列標題格式）
  - 回傳檔案串流

### 損益表 (pl_income_basics)

- [x] **Task 2.3**：實作 `POST /api/pl-income/batch-import`
  - 接收 Excel 資料
  - PK 判斷 (fiscal_year + tax_id)
  - Upsert 邏輯
  - 錯誤處理與回應

- [x] **Task 2.4**：實作 `GET /api/pl-income/export`
  - 查詢資料（支援篩選）
  - 生成 Excel（雙列標題格式）
  - 回傳檔案串流

## 階段三：前端組件實作

### 工具函式

- [x] **Task 3.1**：實作 `src/utils/excelParser.js`
  - 解析 Excel 檔案
  - 欄位對應（主要規則：英文名稱 → column_name）
  - 欄位對應（次要規則：中文名稱 → column_description）
  - 驗證必要欄位

- [x] **Task 3.2**：實作 `src/utils/excelGenerator.js`（可選，使用後端匯出）

### UI 組件

- [x] **Task 3.3**：實作 `src/components/ExcelImportButton.jsx`
  - 檔案選擇器
  - 與 ImportPreviewModal 整合

- [x] **Task 3.4**：實作 `src/components/ExcelExportButton.jsx`
  - 呼叫後端 API 下載檔案

- [x] **Task 3.5**：實作 `src/components/ImportPreviewModal.jsx`
  - 顯示將新增/更新的筆數
  - 顯示無法對應的欄位警告
  - 確認後執行匯入
  - 顯示匯入結果

- [x] **Task 3.6**：實作匯入結果通知（整合在 ImportPreviewModal）

### 整合

- [x] **Task 3.7**：修改 `src/components/DataManagerTabs.jsx`
  - 新增「從 Excel 匯入」按鈕
  - 新增「匯出 Excel」按鈕

- [x] **Task 3.8**：修改 `src/pages/HomePage.jsx`
  - 新增匯入/匯出狀態管理
  - 匯入後重新整理資料

## 階段四：測試

- [ ] **Task 4.1**：單元測試 - Excel 解析器
- [ ] **Task 4.2**：單元測試 - 欄位對應邏輯
- [ ] **Task 4.3**：整合測試 - 匯入流程
- [ ] **Task 4.4**：整合測試 - 匯出流程
- [ ] **Task 4.5**：E2E 測試（使用 Playwright）

## 階段五：文件與部署

- [ ] **Task 5.1**：更新使用者文件（操作說明）
- [ ] **Task 5.2**：更新 API 文件
- [ ] **Task 5.3**：部署到 Vercel

## 檢查清單

### 功能完整性
- [x] 支援「財務報表」匯入/匯出
- [x] 支援「損益表」匯入/匯出
- [x] 欄位對應（主要規則 + 次要規則）
- [x] PK 判斷與 Upsert 邏輯
- [x] 錯誤處理與使用者提示

### 測試覆蓋
- [ ] 正常情況測試
- [ ] 邊界情況測試
- [ ] 錯誤情況測試

### 程式碼品質
- [ ] TypeScript 類型定義（若使用 TS）
- [x] 錯誤處理完整
- [x] 程式碼符合專案風格
