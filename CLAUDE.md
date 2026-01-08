# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是一個「多公司經營績效分析平台」,使用單一 HTML 檔案架構,提供財務資料視覺化和分析功能。專案使用原生 JavaScript 結合多個 CDN 函式庫,無需建置工具或後端服務。

## 技術架構

### 前端技術棧
- **原生 JavaScript** (ES6+): 無框架的模組化設計
- **Chart.js 3.x**: 圖表渲染(長條圖 + 折線圖混合圖表)
- **chartjs-plugin-datalabels**: 圖表資料標籤插件
- **html2canvas 1.4.1**: 截圖功能
- **jsPDF 2.5.1**: PDF 報表生成
- **xlsx 0.18.5**: Excel 檔案匯入匯出

### 專案結構
```
Business_Performance_Analysis_Platform/
├── 5-博弘財報 - 複製 - 複製.html  # 主應用程式(所有功能都在此單一檔案)
└── .claude/
    ├── .mcp.json                   # MCP 伺服器配置
    └── settings.local.json         # Claude 本地設定
```

## 核心架構

### 資料結構
所有公司資料儲存在 `companyDB` 物件中:
```javascript
let companyDB = {
    "公司名稱": {
        labels: ['2021', '2022', '2023', '2024', '2025'],
        revenue: [3510, 5061, 4749, 4002, 4468],  // 營收(百萬元)
        profit: [83, 79, 121, 161, 143]            // 利潤(百萬元)
    }
};
```

### 主要功能模組
1. **圖表渲染**: `updateChart()` - 使用 Chart.js 更新混合圖表
2. **統計分析**: 計算營收成長率、淨利率等指標
3. **資料管理**: 新增公司、更新資料、匯入 Excel
4. **報表匯出**: PDF/Excel 報表生成

### 欄位說明
- **labels**: 年份陣列,用於圖表 X 軸
- **revenue**: 營收資料(單位:百萬元)
- **profit**: 利潤資料(單位:百萬元)

## 開發工作流程

### 執行方式
直接在瀏覽器中開啟 HTML 檔案即可運行,無需建置步驟:
```bash
# Windows
start 5-博弘財報 - 複製 - 複製.html

# macOS
open 5-博弘財報 - 複製 - 複製.html

# Linux
xdg-open 5-博弘財報 - 複製 - 複製.html
```

### 開發流程
1. 直接編輯 HTML 檔案
2. 儲存後在瀏覽器重新載入(F5)即可看到變更
3. 使用瀏覽器開發者工具(F12)進行除錯

### 測試
無自動化測試,手動測試步驟:
1. 開啟 HTML 檔案
2. 選擇不同公司查看圖表變化
3. 測試新增/更新資料功能
4. 測試 PDF/Excel 匯出功能
5. 驗證統計數據正確性

## 重要設計原則

### 程式碼組織
- 所有程式碼都在單一 HTML 檔案中
- HTML 結構 → CSS 樣式 → JavaScript 邏輯
- JavaScript 功能分為:初始化、事件監聽、圖表更新、統計計算、匯出功能

### 資料流向
```
companyDB → updateChart() → 圖表渲染
companyDB → 統計計算 → 顯示指標
companyDB → PDF/Excel → 匯出報表
```

### 事件處理
- 公司選擇變更:重新載入資料並更新圖表
- 年份選擇變更:更新特定年份的統計數據
- 按鈕點擊:執行對應的功能(新增、匯入、匯出)

## 常見開發任務

### 新增公司資料
在 `companyDB` 物件中新增:
```javascript
companyDB["新公司名稱"] = {
    labels: ['2021', '2022', '2023', '2024', '2025'],
    revenue: [數據...],
    profit: [數據...]
};
```

### 修改圖表樣式
編輯 `updateChart()` 函數中的 Chart.js 配置物件,參考 Chart.js 官方文檔:https://www.chartjs.org/docs/

### 新增統計指標
1. 在統計計算區域新增計算邏輯
2. 在 HTML 中新增顯示元素的容器
3. 更新統計顯示函數

### 修改匯出格式
- **PDF**: 修改 `exportToPDF()` 函數中的 jsPDF 配置
- **Excel**: 修改 `exportToExcel()` 函數中的 XLSX 配置

## 外部依賴

所有函式庫通過 CDN 載入(無需本地安裝):
- Chart.js: https://cdn.jsdelivr.net/npm/chart.js
- chartjs-plugin-datalabels: https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0
- html2canvas: https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
- jsPDF: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
- xlsx: https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js

## 注意事項

1. **資料持久化**: 目前資料僅儲存在記憶體中,重新載入頁面會遺失變更
2. **瀏覽器相容性**: 使用現代 JavaScript 特性,需要支援 ES6+ 的瀏覽器
3. **單元測試**: 目前無單元測試框架
4. **版本控制**: 專案未使用 Git,建議初始化 Git 進行版本管理
5. **檔案編碼**: 使用 UTF-8 編碼,支援繁體中文

## MCP 伺服器整合

專案配置了以下 MCP 伺服器(位於 `.claude/.mcp.json`):
- **n8n-mcp**: 工作流自動化整合
- **playwright**: 瀏覽器自動化測試
- **turso**: 資料庫服務(未使用)
- **brave-search**: 搜尋功能整合

這些 MCP 伺服器可用於擴展功能,但非目前應用的核心依賴。
