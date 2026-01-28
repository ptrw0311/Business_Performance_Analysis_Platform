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

  const rawData = useMemo(() => {
    return transformMetricsToNivoData(metrics, ['sellingExpenseRatio', 'adminExpenseRatio', 'rdExpenseRatio'], metrics.years);
  }, [metrics]);

  // 轉換 id 為中文顯示名稱
  const data = useMemo(() => {
    const idMap = {
      sellingExpenseRatio: '推銷%',
      adminExpenseRatio: '管理%',
      rdExpenseRatio: '研發%',
    };
    return rawData.map(serie => ({
      ...serie,
      id: idMap[serie.id] || serie.id,
    }));
  }, [rawData]);

  const colors = useMemo(() => getChartColors('expense'), []);
  const commonConfig = useMemo(() => getCommonChartConfig(), []);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4 className="chart-title">費用率趨勢 (Expense Trend)</h4>
      </div>
      <ResponsiveLine
        data={data}
        yScale={{
          type: 'linear',
          min: 0,
          max: 'auto',
        }}
        margin={{ top: 40, right: 30, bottom: 90, left: 30 }}
        axisBottom={commonConfig.axisBottom}
        axisLeft={null}
        yFormat=">-.0f"
        curve="monotoneX"
        colors={colors}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'color' }}
        enableArea={false}
        enableGridX={false}
        enableGridY={false}
        useMesh={true}
        enableCrosshair={true}
        crosshairType="bottom"
        layers={['grid', 'axes', 'areas', 'lines', 'points', 'slices', 'mesh', 'legends']}
        tooltip={({
          point }) => (
          <div style={{ color: 'inherit', fontSize: '12px' }}>
            <strong>{point.serieId}</strong>: {formatValue(point.data.y)}%
          </div>
        )}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: true,
            translateX: 0,
            translateY: 40,
            itemsSpacing: 30,
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
