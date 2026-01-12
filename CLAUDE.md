# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

多公司經營績效分析平台 — 使用 React + Vite + Express + Turso 的全端應用，提供財務資料視覺化與分析功能。

## 常用指令

```bash
# 開發（同時啟動前端與後端）
npm run dev

# 僅啟動 Vite 前端
npm run dev:sep

# 僅啟動 Express 後端
npm run server

# 建置
npm run build

# 建置（GitHub Pages）
npm run build:github

# 執行 Playwright 測試
npm test

# Lint
npm run lint
```

## 技術架構

### 前端
- **React 19.2.0** - 主框架
- **Vite 7.2.4** - 建置工具（dev server: `localhost:5173`）
- **React Router 7.10.1** - 客戶端路由
- **@nivo/bar, @nivo/line** - 圖表庫（長條圖 + 折線圖疊層）
- **html2canvas, jsPDF** - PDF 匯出
- **XLSX** - Excel 處理

### 後端
- **Express 4.22.1**（`localhost:3000`）
- **@libsql/client** - Turso SQLite 資料庫客戶端
- **CORS** - 跨域支援

### 測試
- **Playwright 1.49.1** - E2E 測試（測試目錄: `./tests`）

## 資料庫結構

### companies 表
| 欄位 | 說明 |
|------|------|
| id | 主鍵 |
| name | 公司名稱 |

### financial_data 表
| 欄位 | 說明 |
|------|------|
| company_id | 外鍵 → companies.id |
| year | 年份 |
| revenue | 營收（百萬元）|
| profit | 稅前淨利（百萬元）|

**約束**: `(company_id, year)` 為 UNIQUE，使用 `INSERT ... ON CONFLICT DO UPDATE` 進行 upsert。

## API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/companies` | 取得所有公司列表 |
| GET | `/api/financial/by-name?company={名稱}` | 取得特定公司財務資料（使用 query string 避免中文編碼問題）|
| GET | `/api/financial/:companyName` | 取得特定公司財務資料（URL 參數）|
| POST | `/api/financial` | 新增/更新單筆財務資料 |
| POST | `/api/financial/bulk` | 批量匯入財務資料 |
| GET | `/api/export` | 匯出所有資料為 Excel |

## 前端架構

### 組件樹
```
App.jsx (路由)
└── HomePage.jsx (主要頁面，全局狀態管理)
    ├── CompanySelector.jsx
    ├── StatCards.jsx
    ├── InsightPanel.jsx
    ├── FinanceChart.jsx
    └── ControlPanel.jsx
```

### 狀態管理模式
- **無外部狀態管理庫**（如 Redux）
- **HomePage** 作為容器組件，管理所有狀態並通過 props 傳遞
- 主要狀態：`companies`, `selectedCompany`, `financialData`, `selectedYear`

### 錯誤處理與降級
- API 失敗時自動降級到 **demo 模式**
- demo 模式僅顯示「博弘雲端」公司資料
- 確保應用在無後端時仍可運作

### 圖表設計
- 使用 **Nivo 圖表疊層技術**
- 底層：長條圖（營收）+ 上層：折線圖（淨利）
- 支援點擊圖表元素切換年份
- 自訂 Tooltip 顯示詳細財務數據

### PDF 匯出
- 專用的隱藏擷取區域 `#pdf-capture-area`
- 4K 解析度截圖（`width: 794px`）
- 動態填入內容：標題、績效洞察、圖表圖片、淨利率

## 開發配置

### 環境變數（`.env`）
```
VITE_TURSO_DATABASE_URL=libsql://your-database.turso.io
VITE_TURSO_AUTH_TOKEN=your-auth-token
```

### Vite Proxy
開發時 API 請求自動代理到後端：
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

### Playwright 測試
- 測試目錄：`./tests`
- 自動啟動 dev server
- CI 環境重試 2 次
