import { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { transformMetricsToNivoData, getChartColors, getCommonChartConfig, formatValue } from './charts/chartUtils';

/**
 * 費用率趨勢圖表 (Expense Trend)
 * 顯示推銷費用、管理費用、研發費用佔比的趨勢
 */
function ExpenseTrendChart({ metrics }) {
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">無資料</div>
      </div>
    );
  }

  const data = useMemo(() => {
    return transformMetricsToNivoData(metrics, ['sellingExpenseRatio', 'adminExpenseRatio', 'rdExpenseRatio'], metrics.years);
  }, [metrics]);

  const colors = useMemo(() => getChartColors('expense'), []);
  const commonConfig = useMemo(() => getCommonChartConfig(), []);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4 className="chart-title">費用率趨勢 (Expense Trend)</h4>
      </div>
      <ResponsiveLine
        {...commonConfig}
        data={data}
        yScale={{
          type: 'linear',
          min: 0,
          max: 'auto',
        }}
        axisLeft={{
          ...commonConfig.axisLeft,
          format: value => formatValue(value, 0) + '%',
          legend: '占比 (%)',
          legendOffset: -40,
        }}
        yFormat=">-.0f"
        curve="monotoneX"
        colors={colors}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'color' }}
        enableArea={false}
        useMesh={true}
        enableCrosshair={true}
        crosshairType="bottom"
        tooltip={({
          point }) => (
          <div style={{ color: 'inherit', fontSize: '12px' }}>
            <strong>{point.serieId}</strong>: {formatValue(point.data.y)}%
          </div>
        )}
        legends={[
          {
            anchor: 'top-right',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: -20,
            itemsSpacing: 4,
            itemWidth: 90,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            symbolSize: 8,
            symbolShape: 'circle',
          },
        ]}
      />
    </div>
  );
}

export default ExpenseTrendChart;
