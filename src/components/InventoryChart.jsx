import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { getChartColors, getCommonChartConfig, formatValue, filterOutliers } from './charts/chartUtils';

/**
 * 存貨週轉圖表 (Inventory)
 * 存貨周轉 - 混合圖 (長條圖)
 * 注意: 需處理異常值 (如 31331)
 */
function InventoryChart({ metrics }) {
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">無資料</div>
      </div>
    );
  }

  // 處理異常值
  const filteredInventory = useMemo(() => {
    return filterOutliers(metrics.inventoryTurnover, 3);
  }, [metrics.inventoryTurnover]);

  const data = useMemo(() => {
    return metrics.years.map((year, index) => ({
      year,
      value: filteredInventory[index] ?? null,
    }));
  }, [metrics.years, filteredInventory]);

  const colors = useMemo(() => ['#10b981'], []);
  const commonConfig = useMemo(() => getCommonChartConfig(), []);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4 className="chart-title">存貨週轉 (Inventory)</h4>
      </div>
      <ResponsiveBar
        {...commonConfig}
        data={data}
        keys={['value']}
        indexBy="year"
        groupMode="grouped"
        valueScale={{ type: 'linear', min: 0 }}
        indexScale={{ type: 'band', round: true }}
        colors={colors}
        borderRadius={4}
        padding={0.3}
        innerPadding={2}
        axisLeft={{
          ...commonConfig.axisLeft,
          format: value => formatValue(value, 0),
          legend: '次',
          legendOffset: -25,
        }}
        yFormat=">-.0f"
        axisBottom={{
          ...commonConfig.axisBottom,
          legend: '年度',
          legendOffset: -30,
        }}
        enableLabel={false}
        tooltip={({
          index, value
        }) => (
          <div style={{ color: 'inherit', fontSize: '12px' }}>
            <strong>{index}</strong>: {formatValue(value, 0)} 次
          </div>
        )}
      />
    </div>
  );
}

export default InventoryChart;
