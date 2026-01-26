import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { getChartColors, getCommonChartConfig, formatValue } from './charts/chartUtils';

/**
 * 經營效率圖表 (AR Efficiency)
 * 應收週轉 - 混合圖 (長條圖 + 折線)
 */
function AREfficiencyChart({ metrics }) {
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">無資料</div>
      </div>
    );
  }

  const arTurnoverData = useMemo(() => {
    return metrics.years.map((year, index) => ({
      year,
      value: metrics.arTurnover?.[index] ?? null,
    }));
  }, [metrics]);

  const lineData = useMemo(() => [{
    id: '應收週轉',
    data: metrics.years.map((year, index) => ({
      x: year,
      y: metrics.arTurnover?.[index] ?? null,
    })),
  }], [metrics]);

  const colors = useMemo(() => ['#3b82f6'], []);
  const commonConfig = useMemo(() => getCommonChartConfig(), []);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4 className="chart-title">經營效率 (AR Efficiency)</h4>
      </div>
      <ResponsiveBar
        {...commonConfig}
        data={arTurnoverData}
        keys={['value']}
        indexBy="year"
        groupMode="grouped"
        valueScale={{ type: 'linear' }}
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

export default AREfficiencyChart;
