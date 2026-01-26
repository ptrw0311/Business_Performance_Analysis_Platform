import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';

/**
 * 償債結構圖表 (Solvency)
 * 顯示流動比率（長條圖）、負債比（折線圖）的趨勢
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
      yearIndex: index,
      // 流動比用長條圖顯示
      '流動比': metrics.currentRatio?.[index] !== null ? metrics.currentRatio[index] / 100 : null,
      // 負債比額外存儲，用於折線圖
      debtRatio: metrics.debtEquityRatio?.[index] !== null ? metrics.debtEquityRatio[index] / 100 : null,
    }));
  }, [metrics]);

  // 找出最大值 - 必須考慮流動比和負債比
  const maxValue = useMemo(() => {
    const barValues = chartData.map(d => d['流動比']).filter(v => v !== null && !isNaN(v));
    const lineValues = chartData.map(d => d.debtRatio).filter(v => v !== null && !isNaN(v));
    const maxBar = Math.max(...barValues, 0.1);
    const maxLine = Math.max(...lineValues, 0.1);
    // 確保 Y 軸範圍涵蓋折線圖和標籤
    return Math.max(maxBar * 4, maxLine * 1.5);
  }, [chartData]);

  // 自訂主題
  const customTheme = {
    axis: {
      ticks: {
        text: { fill: '#64748b', fontSize: 11 },
      },
    },
    grid: {
      line: { stroke: 'transparent', strokeWidth: 0 },
    },
  };

  // 負債比折線圖層
  const DebtLineLayer = ({ bars, xScale, yScale }) => {
    if (!bars || bars.length === 0) return null;

    try {
      const validPoints = chartData
        .map((d) => {
          if (d.debtRatio === null) return null;
          // 使用 xScale 計算正確的 x 座標 (band 中心)
          const x = xScale(d.year) + xScale.bandwidth() / 2;
          const y = yScale(d.debtRatio);
          return {
            x,
            y,
            value: d.debtRatio,
            year: d.year,
          };
        })
        .filter(p => p !== null && p.y !== undefined && !isNaN(p.y) && p.x !== undefined);

      if (validPoints.length < 2) return null;

      const pathD = validPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
        .join(' ');

      return (
        <g style={{ pointerEvents: 'none' }}>
          <path
            d={pathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ mixBlendMode: 'multiply' }}
          />
          {validPoints.map((p) => (
            <g key={p.year}>
              <circle
                cx={p.x}
                cy={p.y}
                r={6}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                fill="#d97706"
                fontSize={13}
                fontWeight="bold"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              >
                {p.value.toFixed(2)}
              </text>
            </g>
          ))}
        </g>
      );
    } catch (error) {
      console.error('DebtLineLayer error:', error);
      return null;
    }
  };

  return (
    <div className="chart-container" style={{ height: '320px' }}>
      <div className="chart-header">
        <h4 className="chart-title">償債結構 (Solvency)</h4>
      </div>
      <ResponsiveBar
        data={chartData}
        keys={['流動比']}  // 只有流動比用長條圖顯示
        indexBy="year"
        margin={{ top: 60, right: 20, bottom: 60, left: 20 }}
        yScale={{
          type: 'linear',
          min: 0,
          max: maxValue,
          nice: false,
        }}
        axisLeft={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        enableGridX={false}
        enableGridY={false}
        colors={['#10b981']}
        borderRadius={4}
        barPadding={0.3}
        theme={customTheme}
        label={d => d.value !== null && d.value < 10 ? d.value.toFixed(2) : ''}
        labelSkipWidth={0}
        labelTextColor="#333"
        labelStyle={{ fontSize: '11px', fontWeight: '600' }}
        tooltip={({ id, value, color }) => (
          <div style={{ padding: '8px', background: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <strong>{id}</strong>: {value !== null ? value.toFixed(2) : '-'}
          </div>
        )}
        layers={[
          'grid',
          'axes',
          'bars',  // 使用內建的 bars layer 來渲染流動比長條圖
          DebtLineLayer,  // 疊加折線圖
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
            symbolShape: 'square',
            data: [
              { id: '流動比', label: '流動比', color: '#10b981' },
              { id: '負債比', label: '負債比', color: '#f59e0b' },
            ],
          },
        ]}
      />
    </div>
  );
}

export default SolvencyChart;
