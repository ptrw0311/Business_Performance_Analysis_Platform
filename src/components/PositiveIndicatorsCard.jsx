/**
 * 正面指標卡片
 * 根據「財務分析指標.xlsx > 財務比率說明」的判斷邏輯自動識別正面指標
 */

// 輔助函式：取得最新年度資料
function getLatestYear(metrics) {
  const lastIndex = metrics.years.length - 1;
  return {
    year: metrics.years[lastIndex],
    netProfitMargin: metrics.netProfitMargin[lastIndex],
    grossMargin: metrics.grossMargin[lastIndex],
    roa: metrics.roa[lastIndex],
    currentRatio: metrics.currentRatio[lastIndex],
    quickRatio: metrics.quickRatio[lastIndex],
    debtEquityRatio: metrics.debtEquityRatio[lastIndex],
    arTurnover: metrics.arTurnover[lastIndex],
    inventoryTurnover: metrics.inventoryTurnover[lastIndex],
    revenueGrowth: metrics.revenueGrowth[lastIndex],
    grossProfitGrowth: metrics.grossProfitGrowth[lastIndex],
    profitBeforeTaxGrowth: metrics.profitBeforeTaxGrowth[lastIndex],
    sellingExpenseRatio: metrics.sellingExpenseRatio[lastIndex],
    adminExpenseRatio: metrics.adminExpenseRatio[lastIndex],
    rdExpenseRatio: metrics.rdExpenseRatio[lastIndex],
  };
}

// 輔助函式：取得前一年度資料
function getPreviousYear(metrics) {
  const prevIndex = metrics.years.length - 2;
  if (prevIndex < 0) return null;
  return {
    year: metrics.years[prevIndex],
    netProfitMargin: metrics.netProfitMargin[prevIndex],
    grossMargin: metrics.grossMargin[prevIndex],
    roa: metrics.roa[prevIndex],
    currentRatio: metrics.currentRatio[prevIndex],
    quickRatio: metrics.quickRatio[prevIndex],
    debtEquityRatio: metrics.debtEquityRatio[prevIndex],
    arTurnover: metrics.arTurnover[prevIndex],
    inventoryTurnover: metrics.inventoryTurnover[prevIndex],
    revenueGrowth: metrics.revenueGrowth[prevIndex],
    grossProfitGrowth: metrics.grossProfitGrowth[prevIndex],
    profitBeforeTaxGrowth: metrics.profitBeforeTaxGrowth[prevIndex],
    sellingExpenseRatio: metrics.sellingExpenseRatio[prevIndex],
    adminExpenseRatio: metrics.adminExpenseRatio[prevIndex],
    rdExpenseRatio: metrics.rdExpenseRatio[prevIndex],
  };
}

// 輔助函式：檢查連續三年皆呈現正成長
function isThreeYearPositiveGrowth(metrics, metricKey) {
  const arr = metrics[metricKey];
  if (!arr || arr.length < 3) return false;
  const last3 = arr.slice(-3);
  return last3.every((v, i) => i === 0 || v > last3[i - 1]);
}

// 輔助函式：檢查連續三年皆高於某值
function isThreeYearAbove(metrics, metricKey, threshold) {
  const arr = metrics[metricKey];
  if (!arr || arr.length < 3) return false;
  return arr.slice(-3).every(v => v != null && v > threshold);
}

// 輔助函式：安全數值比較
function safeValue(val) {
  return val === null || val === undefined ? null : val;
}

// 輔助函式：格式化數值
function formatValue(value, unit = '') {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    return value.toFixed(1) + unit;
  }
  return value + unit;
}

/**
 * 計算正面指標
 */
function getPositiveIndicators(metrics) {
  const latest = getLatestYear(metrics);
  const previous = getPreviousYear(metrics);
  const positives = [];

  // 1. 淨利率: 大於10%
  if (safeValue(latest.netProfitMargin) > 10) {
    positives.push({
      metric: '淨利率',
      value: latest.netProfitMargin,
      unit: '%',
      criteria: '>10%',
      reason: '獲利能力優異'
    });
  }

  // 2. 淨利率: 前一年度<0%，本年度>0% (轉虧為盈)
  if (previous && safeValue(previous.netProfitMargin) < 0 && safeValue(latest.netProfitMargin) > 0) {
    positives.push({
      metric: '淨利率',
      value: latest.netProfitMargin,
      unit: '%',
      criteria: '轉虧為盈',
      reason: '由虧轉盈'
    });
  }

  // 3. 毛利率: 大於10%
  if (safeValue(latest.grossMargin) > 10) {
    positives.push({
      metric: '毛利率',
      value: latest.grossMargin,
      unit: '%',
      criteria: '>10%',
      reason: '毛利表現良好'
    });
  }

  // 4. 毛利率: 本年度 > 前一年度
  if (previous && safeValue(latest.grossMargin) > safeValue(previous.grossMargin)) {
    positives.push({
      metric: '毛利率',
      value: latest.grossMargin,
      unit: '%',
      criteria: '優於去年',
      reason: '毛利率改善'
    });
  }

  // 5. ROA: 連續三年皆呈現正成長
  if (isThreeYearPositiveGrowth(metrics, 'roa')) {
    positives.push({
      metric: 'ROA',
      value: latest.roa,
      unit: '%',
      criteria: '連續三年正成長',
      reason: '資產報酬率持續提升'
    });
  }

  // 6. 流動比率: 大於2
  if (safeValue(latest.currentRatio) > 200) {
    positives.push({
      metric: '流動比率',
      value: latest.currentRatio / 100,
      unit: '',
      criteria: '>2',
      reason: '短期償債能力強'
    });
  }

  // 7. 流動比率: 大於1且速動比率>0.8
  if (safeValue(latest.currentRatio) > 100 && safeValue(latest.quickRatio) > 80) {
    positives.push({
      metric: '流動/速動比率',
      value: `${(latest.currentRatio / 100).toFixed(2)}/${(latest.quickRatio / 100).toFixed(2)}`,
      unit: '',
      criteria: '流動>1 且 速動>0.8',
      reason: '償債結構健康'
    });
  }

  // 8. 流動比率: 前一年度<1，本年度>1 (改善)
  if (previous && safeValue(previous.currentRatio) < 100 && safeValue(latest.currentRatio) > 100) {
    positives.push({
      metric: '流動比率',
      value: latest.currentRatio / 100,
      unit: '',
      criteria: '改善',
      reason: '流動比率改善至1以上'
    });
  }

  // 9. 速動比率: 大於0.8
  if (safeValue(latest.quickRatio) > 80) {
    positives.push({
      metric: '速動比率',
      value: latest.quickRatio / 100,
      unit: '',
      criteria: '>0.8',
      reason: '速動資產充足'
    });
  }

  // 10. 速動比率: 前一年度<0.8，本年度>0.8
  if (previous && safeValue(previous.quickRatio) < 80 && safeValue(latest.quickRatio) > 80) {
    positives.push({
      metric: '速動比率',
      value: latest.quickRatio / 100,
      unit: '',
      criteria: '改善',
      reason: '速動比率改善'
    });
  }

  // 11. 負債淨值比: 小於100%
  if (safeValue(latest.debtEquityRatio) < 100) {
    positives.push({
      metric: '負債淨值比',
      value: latest.debtEquityRatio / 100,
      unit: '',
      criteria: '<100%',
      reason: '槓桿比例保守'
    });
  }

  // 12. 應收帳款週轉率: 大於6
  if (safeValue(latest.arTurnover) > 6) {
    positives.push({
      metric: '應收週轉',
      value: latest.arTurnover,
      unit: '次',
      criteria: '>6次',
      reason: '收款效率良好'
    });
  }

  // 13. 存貨周轉率: 大於4
  if (safeValue(latest.inventoryTurnover) > 4) {
    positives.push({
      metric: '存貨周轉',
      value: latest.inventoryTurnover,
      unit: '次',
      criteria: '>4次',
      reason: '存貨管理效率良好'
    });
  }

  // 14. 營收成長率: 大於10%
  if (safeValue(latest.revenueGrowth) > 10) {
    positives.push({
      metric: '營收成長',
      value: latest.revenueGrowth,
      unit: '%',
      criteria: '>10%',
      reason: '營收強勁成長'
    });
  }

  // 15. 營收成長率: 連續三年>10%
  if (isThreeYearAbove(metrics, 'revenueGrowth', 10)) {
    positives.push({
      metric: '營收成長',
      value: latest.revenueGrowth,
      unit: '%',
      criteria: '連續三年>10%',
      reason: '營收持續強勁成長'
    });
  }

  // 16. 毛利成長率: 連續三年皆呈現正成長
  if (isThreeYearPositiveGrowth(metrics, 'grossProfitGrowth')) {
    positives.push({
      metric: '毛利成長',
      value: latest.grossProfitGrowth,
      unit: '%',
      criteria: '連續三年正成長',
      reason: '毛利持續成長'
    });
  }

  // 17. 毛利成長率: 成長幅度超過5%
  if (safeValue(latest.grossProfitGrowth) > 5) {
    positives.push({
      metric: '毛利成長',
      value: latest.grossProfitGrowth,
      unit: '%',
      criteria: '>5%',
      reason: '毛利成長幅度佳'
    });
  }

  // 18. 稅前淨利成長率: 連續三年皆呈現正成長
  if (isThreeYearPositiveGrowth(metrics, 'profitBeforeTaxGrowth')) {
    positives.push({
      metric: '稅前淨利成長',
      value: latest.profitBeforeTaxGrowth,
      unit: '%',
      criteria: '連續三年正成長',
      reason: '獲利持續成長'
    });
  }

  // 19. 稅前淨利成長率: 成長幅度超過5%
  if (safeValue(latest.profitBeforeTaxGrowth) > 5) {
    positives.push({
      metric: '稅前淨利成長',
      value: latest.profitBeforeTaxGrowth,
      unit: '%',
      criteria: '>5%',
      reason: '獲利成長幅度佳'
    });
  }

  return positives;
}

function PositiveIndicatorsCard({ metrics }) {
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return null;
  }

  const positives = getPositiveIndicators(metrics);

  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <div className="kpi-card-icon positive">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 className="kpi-card-title">正面指標</h3>
      </div>
      <div className="kpi-card-content">
        {positives.length === 0 ? (
          <div className="indicator-empty">尚無正面指標</div>
        ) : (
          <ul className="indicator-list">
            {positives.map((item, index) => (
              <li key={index} className="indicator-item">
                <div className="indicator-item-header">
                  <span className="indicator-name">{item.metric}</span>
                  <span className="indicator-value positive">
                    {formatValue(item.value, item.unit)}
                  </span>
                </div>
                <div className="indicator-reason">
                  <span className="indicator-criteria">{item.criteria}</span>
                  {' · '}{item.reason}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PositiveIndicatorsCard;
