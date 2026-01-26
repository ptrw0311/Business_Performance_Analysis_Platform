import { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { transformMetricsToNivoData, getChartColors, getCommonChartConfig, formatValue } from './charts/chartUtils';

/**
 * 成長動能圖表 (Growth)
 * 顯示營收成長率、毛利成長率、稅前淨利成長率的趨勢
 * 負值用紅色，正值用綠色
 */
function GrowthChart({ metrics }) {
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">無資料</div>
      </div>
    );
  }

  const data = useMemo(() => {
    return transformMetricsToNivoData(metrics, ['revenueGrowth', 'grossProfitGrowth', 'profitBeforeTaxGrowth'], metrics.years);
  }, [metrics]);

  // 成長動能特殊顏色配置
  const colors = useMemo(() => getChartColors('growth'), []);

  // 根據數值正負設定顏色
  const getColor = (line) => {
    const colorMap = {
      revenueGrowth: (line) => {
        const lastValue = line.data[line.data.length - 1]?.y;
        return lastValue >= 0 ? '#10b981' : '#ef4444';
      },
      grossProfitGrowth: (line) => {
        const lastValue = line.data[line.data.length - 1]?.y;
        return lastValue >= 0 ? '#10b981' : '#ef4444';
      },
      profitBeforeTaxGrowth: (line) => {
        const lastValue = line.data[line.data.length - 1]?.y;
        return lastValue >= 0 ? '#10b981' : '#ef4444';
      },
    };
    return colorMap[line.id]?.(line) || '#3b82f6';
  };

  const commonConfig = useMemo(() => getCommonChartConfig(), []);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4 className="chart-title">成長動能 (Growth)</h4>
      </div>
      <ResponsiveLine
        {...commonConfig}
        data={data}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
        }}
        axisLeft={{
          ...commonConfig.axisLeft,
          format: value => formatValue(value, 0) + '%',
          legend: '成長率 (%)',
          legendOffset: -40,
        }}
        yFormat=">-.0f"
        curve="monotoneX"
        colors={getColor}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'color' }}
        enableArea={true}
        areaBaselineValue={0}
        areaOpacity={0.1}
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
            itemWidth: 85,
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

export default GrowthChart;
