# Tasks: 加入「詳細財務數據表」

## Implementation Tasks

### Phase 1: 後端 API

- [ ] **Task 1.1**: 建立 `api/financial/basics.js` API 端點
  - 實作 GET 方法處理
  - 接收 `company` 查詢參數
  - 呼叫 Supabase 查詢 `pl_income_basics` 和 `financial_basics`

- [ ] **Task 1.2**: 實作指標計算邏輯
  - 淨利率、毛利率、ROA
  - 流動比率、速動比率、負債淨值比
  - 應收帳款週轉率、存貨周轉率
  - 營收成長率、毛利成長率、稅前淨利成長率
  - 推銷費用占比、管理費用佔比、研發費用佔比
  - 處理除以零和 null 值情況

- [ ] **Task 1.3**: 單位轉換
  - 將 Supabase 千元單位除以 1000 轉為百萬元
  - 確保與現有圖表單位一致

- [ ] **Task 1.4**: 錯誤處理
  - 公司不存在時回傳錯誤
  - API 失敗時回傳適當錯誤訊息

### Phase 2: 前端組件

- [ ] **Task 2.1**: 建立 `FinancialDataTable.jsx` 組件
  - 定義 Props 介面（company, metrics, isLoading, error）
  - 實作表格渲染邏輯
  - 處理載入狀態

- [ ] **Task 2.2**: 實作表格樣式
  - 15 欄 × 15 列表格布局
  - 指標名稱欄位固定左側（sticky）
  - 響應式橫向捲動
  - 與現有設計風格一致

- [ ] **Task 2.3**: 數值格式化
  - 百分比顯示至小數點後兩位
  - 週轉率顯示至小數點後兩位
  - null 值顯示「-」

- [ ] **Task 2.4**: 整合至 `HomePage.jsx`
  - 在 `FinanceChart` 之後、`DataManagerTabs` 之前插入組件
  - 加入載入狀態管理
  - 加入 API 呼叫邏輯

### Phase 3: 測試與驗證

- [ ] **Task 3.1**: 手動測試
  - 驗證各指標計算正確性
  - 測試 null 值顯示
  - 測試響應式布局

- [ ] **Task 3.2**: 撰寫 E2E 測試（可選）
  - 測試表格渲染
  - 測試資料載入

### Phase 4: 部署

- [ ] **Task 4.1**: 本地驗收
  - 確認所有功能正常
  - 確認設計一致性

- [ ] **Task 4.2**: 提交程式碼
  - Commit 變更
  - Push 至 GitHub

- [ ] **Task 4.3**: 部署至 Vercel
  - 執行 `npx vercel --prod`
  - 驗證生產環境

## Dependencies

- Task 1.2 必須在 Task 1.1 之後完成
- Task 2.4 必須在 Task 2.1-2.3 之後完成
- Task 4.x 必須在 Phase 1-3 完成後執行

## Estimated Completion

- Phase 1: 後端 API - ~3 小時
- Phase 2: 前端組件 - ~4 小時
- Phase 3: 測試驗證 - ~1 小時
- Phase 4: 部署 - ~0.5 小時
- **Total**: ~8.5 小時
