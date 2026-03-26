import { useState, useEffect, useCallback } from 'react';

// API 基礎 URL
const API_BASE = '/api';

// 指標定義
// displayFormat: 'percentInt' (整數%), 'ratio' (小數), 'turnoverInt' (整數次), 'percentIntColor' (整數%帶顏色)
const METRICS = [
  { key: 'netProfitMargin', name: '淨利率', unit: '', displayFormat: 'percentInt' },
  { key: 'grossMargin', name: '毛利率', unit: '', displayFormat: 'percentInt' },
  { key: 'roa', name: 'ROA', unit: '', displayFormat: 'percentInt' },
  { key: 'currentRatio', name: '流動比率', unit: '', displayFormat: 'ratio' },
  { key: 'quickRatio', name: '速動比率', unit: '', displayFormat: 'ratio' },
  { key: 'debtEquityRatio', name: '負債淨值比', unit: '', displayFormat: 'ratio' },
  { key: 'arTurnover', name: '應收週轉', unit: '次', displayFormat: 'turnoverInt' },
  { key: 'inventoryTurnover', name: '存貨週轉', unit: '次', displayFormat: 'turnoverInt' },
  { key: 'revenueGrowth', name: '營收成長率', unit: '', displayFormat: 'percentIntColor' },
  { key: 'grossProfitGrowth', name: '毛利成長率', unit: '', displayFormat: 'percentInt' },
  { key: 'profitBeforeTaxGrowth', name: '稅前淨利成長率', unit: '', displayFormat: 'percentInt' },
  { key: 'sellingExpenseRatio', name: '推銷費用占比', unit: '', displayFormat: 'percentInt' },
  { key: 'adminExpenseRatio', name: '管理費用占比', unit: '', displayFormat: 'percentInt' },
  { key: 'rdExpenseRatio', name: '研發費用占比', unit: '', displayFormat: 'percentInt' },
];

/**
 * 格式化數值
 * @param {number|null} value - 數值
 * @param {string} displayFormat - 格式類型
 * @returns {string} 格式化後的字串
 */
function formatValue(value, displayFormat) {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  switch (displayFormat) {
    case 'percentInt':
      // 4捨5入到整數，加上 "%" 符號
      return Math.round(value) + '%';

    case 'percentIntColor':
      // 4捲5入到整數，加上 "%" 符號（顏色由 CSS 處理）
      return Math.round(value) + '%';

    case 'ratio':
      // 除以100後，4捨5入到小數第2位
      return (value / 100).toFixed(2);

    case 'turnoverInt':
      // 4捨5入到整數
      return Math.round(value).toString();

    default:
      return value.toFixed(2);
  }
}

/**
 * 取得數值的顏色類別（用於成長率指標）
 * @param {number|null} value - 數值
 * @returns {string|null} CSS 類別名稱
 */
function getValueColorClass(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (value > 0) {
    return 'metric-positive';
  }
  if (value < 0) {
    return 'metric-negative';
  }
  return null;
}

function FinancialDataTable({ company }) {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 取得財務指標資料
  const fetchFinancialBasics = useCallback(async (companyName) => {
    if (!companyName) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/financial/basics?company=${encodeURIComponent(companyName)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMetrics(result.data);
        } else {
          setMetrics(null);
        }
      } else {
        throw new Error('無法載入財務指標資料');
      }
    } catch (err) {
      console.error('載入財務指標失敗:', err);
      setError(err.message);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 當公司變更時重新載入
  useEffect(() => {
    fetchFinancialBasics(company);
  }, [company, fetchFinancialBasics]);

  // 載入狀態
  if (isLoading) {
    return (
      <div className="financial-data-table-container">
        <div className="financial-table-header">
          <h3>📊 詳細財務數據表</h3>
        </div>
        <div className="financial-table-loading">
          <div className="loading-spinner"></div>
          <span>載入中...</span>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="financial-data-table-container">
        <div className="financial-table-header">
          <h3>📊 詳細財務數據表</h3>
        </div>
        <div className="financial-table-error">
          <p>⚠️ {error}</p>
          <button
            className="btn-retry"
            onClick={() => fetchFinancialBasics(company)}
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // 無資料狀態
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return null;
  }

  const { years, metrics: metricData } = metrics;

  // 年度倒序（最新到最舊）
  const sortedYears = [...years].sort((a, b) => b - a);

  // 建立年度索引映射
  const yearIndexMap = {};
  sortedYears.forEach((year, idx) => {
    yearIndexMap[year] = idx;
  });

  return (
    <div className="financial-data-table-container">
      <div className="financial-table-header">
        <h3>📊 詳細財務數據表</h3>
        <span className="financial-table-subtitle">14 項財務指標跨年度比較</span>
      </div>

      <div className="financial-table-scroll">
        <table className="financial-data-table">
          <thead>
            <tr>
              <th className="year-header">年度</th>
              {METRICS.map((metric) => (
                <th key={metric.key} className="metric-header">
                  {metric.name}
                  {metric.unit && <span className="metric-unit">({metric.unit})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedYears.map((year) => {
              // 找到該年度在原始 years 陣列中的索引
              const originalYearIdx = years.indexOf(year);

              return (
                <tr key={year}>
                  <td className="year-value">{year}</td>
                  {METRICS.map((metric) => {
                    const value = (metricData[metric.key] || [])[originalYearIdx];
                    const formattedValue = formatValue(value, metric.displayFormat);
                    const colorClass = metric.displayFormat === 'percentIntColor'
                      ? getValueColorClass(value)
                      : null;

                    return (
                      <td key={metric.key} className={`metric-value ${colorClass || ''}`}>
                        {formattedValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="financial-table-footer">
        <span className="footer-note">※ 「-」表示資料不足或無法計算</span>
      </div>
    </div>
  );
}

export default FinancialDataTable;
