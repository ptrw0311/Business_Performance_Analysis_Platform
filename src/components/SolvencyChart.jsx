import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';

/**
 * 償債結構圖表 (Solvency)
 * 顯示流動比率（長條圖）、負債比（折線圖）的趨勢
 * 使用雙 Y 軸設計
 */
function SolvencyChart({ metrics }) {
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">無資料</div>
      </div>
    );
  }

  // 準備資料
  const chartData = useMemo(() => {
    return metrics.years.map((year, index) => ({
      year: year,
      // 流動比用長條圖顯示
      currentRatio: metrics.currentRatio?.[index] !== null ? metrics.currentRatio[index] / 100 : null,
      // 負債比用折線圖顯示
      debtRatio: metrics.debtEquityRatio?.[index] !== null ? metrics.debtEquityRatio[index] / 100 : null,
    }));
  }, [metrics]);

  // 流動比的最大值
  const maxCurrentRatio = useMemo(() => {
    const values = chartData.map(d => d.currentRatio).filter(v => v !== null && !isNaN(v));
    return Math.max(...values, 0.1) * 1.2;
  }, [chartData]);

  // 負債比的最大值
  const maxDebtRatio = useMemo(() => {
    const values = chartData.map(d => d.debtRatio).filter(v => v !== null && !isNaN(v));
    return Math.max(...values, 0.1) * 1.2;
  }, [chartData]);

  // 折線圖資料格式
  const lineData = useMemo(() => {
    return [{
      id: '負債比',
      data: chartData.map(d => ({
        x: d.year,
        y: d.debtRatio,
      })),
    }];
  }, [chartData]);

  return (
    <div className="chart-container" style={{ height: '320px', position: 'relative' }}>
      <div className="chart-header">
        <h4 className="chart-title">償債結構 (Solvency)</h4>
      </div>

      {/* 長條圖層 - 流動比 */}
      <div style={{ position: 'absolute', top: 60, left: 20, right: 40, bottom: 60 }}>
        <ResponsiveBar
          data={chartData}
          keys={['currentRatio']}
          indexBy="year"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          yScale={{
            type: 'linear',
            min: 0,
            max: maxCurrentRatio,
          }}
          axisLeft={null}
          axisRight={null}
          axisBottom={null}
          enableGridX={false}
          enableGridY={false}
          colors={['#10b981']}
          borderRadius={4}
          barPadding={0.3}
          label={d => d.value !== null && d.value < 10 ? d.value.toFixed(2) : ''}
          labelSkipWidth={0}
          labelTextColor="#333"
          labelStyle={{ fontSize: '11px', fontWeight: '600' }}
          tooltip={({ id, value }) => (
            <div style={{ padding: '8px', background: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <strong>流動比</strong>: {value !== null ? value.toFixed(2) : '-'}
            </div>
          )}
          layers={['bars']}
        />
      </div>

      {/* 折線圖層 - 負債比 */}
      <div style={{ position: 'absolute', top: 60, left: 20, right: 40, bottom: 60 }}>
        <ResponsiveLine
          data={lineData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 0,
            max: maxDebtRatio,
          }}
          axisLeft={null}
          axisRight={null}
          axisBottom={null}
          enableGridX={false}
          enableGridY={false}
          useMesh={true}
          enableCrosshair={false}
          curve="monotoneX"
          colors={['#f59e0b']}
          lineWidth={4}
          pointSize={8}
          pointColor="#f59e0b"
          pointBorderWidth={2}
          pointBorderColor="#fff"
          tooltip={({ point }) => (
            <div style={{ padding: '8px', background: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <strong>負債比</strong>: {point.data.y !== null ? point.data.y.toFixed(2) : '-'}
            </div>
          )}
          layers={[
            'grid',
            'axes',
            'lines',
            'points',
            'mesh',
            'legends',
          ]}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              justify: 'center',
              translateX: 0,
              translateY: 45,
              itemsSpacing: 20,
              itemWidth: 60,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              symbolSize: 10,
              symbolShape: 'circle',
              data: [
                { id: '流動比', label: '流動比', color: '#10b981' },
                { id: '負債比', label: '負債比', color: '#f59e0b' },
              ],
            },
          ]}
        />
      </div>

      {/* X 軸標籤 */}
      <div style={{
        position: 'absolute',
        left: 20,
        right: 40,
        bottom: 40,
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: '11px',
        color: '#64748b'
      }}>
        {chartData.map(d => (
          <div key={d.year}>{d.year}</div>
        ))}
      </div>

      {/* 左側 Y 軸 - 流動比 */}
      <svg style={{ position: 'absolute', left: 10, top: 60, bottom: 60, width: 30, height: 'auto' }}>
        <text x={5} y={20} fontSize={10} fill="#10b981" fontWeight="bold">流動比</text>
        <line x1={15} y1={40} x2={15} y2={200} stroke="#10b981" strokeWidth={1} />
        <text x={10} y={55} fontSize={10} fill="#64748b" textAnchor="end">{maxCurrentRatio.toFixed(1)}</text>
        <text x={10} y={125} fontSize={10} fill="#64748b" textAnchor="end">{(maxCurrentRatio / 2).toFixed(1)}</text>
        <text x={10} y={200} fontSize={10} fill="#64748b" textAnchor="end">0</text>
      </svg>

      {/* 右側 Y 軸 - 負債比 */}
      <svg style={{ position: 'absolute', right: 10, top: 60, bottom: 60, width: 30, height: 'auto' }}>
        <text x={5} y={20} fontSize={10} fill="#f59e0b" fontWeight="bold">負債比</text>
        <line x1={5} y1={40} x2={5} y2={200} stroke="#f59e0b" strokeWidth={1} />
        <text x={10} y={55} fontSize={10} fill="#64748b">{maxDebtRatio.toFixed(1)}</text>
        <text x={10} y={125} fontSize={10} fill="#64748b">{(maxDebtRatio / 2).toFixed(1)}</text>
        <text x={10} y={200} fontSize={10} fill="#64748b">0</text>
      </svg>

      {/* 圖例 */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#10b981', borderRadius: '2px' }}></div>
          <span>流動比</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
          <span>負債比</span>
        </div>
      </div>
    </div>
  );
}

export default SolvencyChart;
