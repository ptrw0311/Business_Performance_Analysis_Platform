import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { useChartResize } from '../hooks/useChartResize';

/**
 * FinanceChart - 使用 Nivo 建立混合圖表
 * 使用單一 ResponsiveBar + 自訂 layer 繪製折線圖
 * 確保長條圖與折線圖完美對齊
 */
function FinanceChart({ labels, revenue, profit, selectedYear, onYearChange }) {
  const containerRef = useRef(null);
  const resizeKey = useChartResize(containerRef);

  // 動態追蹤長條圖位置
  const [barPositions, setBarPositions] = useState([]);
  const [isPositionReady, setIsPositionReady] = useState(false);

  // 準備長條圖資料（營收）
  const barData = useMemo(() => {
    if (!labels || !revenue) return [];
    return labels.map((year, index) => ({
      year,
      revenue: revenue[index],
      profit: profit[index], // 加入 profit 以便在 layer 中使用
    }));
  }, [labels, revenue, profit]);

  // 淨利率資料
  const margins = useMemo(() => {
    if (!labels || !revenue || !profit) return [];
    return labels.map((year, i) => ({
      year,
      margin: revenue[i] > 0 ? ((profit[i] / revenue[i]) * 100).toFixed(1) + '%' : '0.0%',
    }));
  }, [labels, revenue, profit]);

  // 計算 Y 軸範圍（支援正負值）
  const maxProfit = useMemo(() => {
    if (!profit || profit.length === 0) return 100;
    const maxVal = Math.max(...profit, 0);
    const minVal = Math.min(...profit, 0);
    const range = maxVal - minVal;
    return maxVal + range * 0.2;
  }, [profit]);

  const minProfit = useMemo(() => {
    if (!profit || profit.length === 0) return 0;
    const minVal = Math.min(...profit, 0);
    if (minVal >= 0) return 0;
    return minVal - Math.abs(minVal) * 0.2;
  }, [profit]);

  // 計算折線圖的 Y 軸範圍
  const lineMaxValue = useMemo(() => {
    return maxProfit * 3;
  }, [maxProfit]);

  // 使用 useEffect 在圖表渲染後計算長條圖位置
  useEffect(() => {
    // 當 labels 改變時，重置狀態
    setIsPositionReady(false);
    setBarPositions([]);

    if (!containerRef.current || !labels.length) return;

    // 等待圖表渲染完成
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      // 獲取圖表容器和 SVG
      const chartContainer = container.querySelector('.chart-nivo-container');
      const svgElement = chartContainer?.querySelector('svg');
      if (!chartContainer || !svgElement) return;

      // 獲取淨利率標籤容器（作為百分比參考）
      const marginValuesContainer = container.querySelector('.margin-values-compact');
      if (!marginValuesContainer) return;

      // 獲取所有文本元素
      const allTexts = Array.from(svgElement.querySelectorAll('text'));

      // 使用實際位置來找出 X 軸標籤
      const textsWithPosition = allTexts.map(el => ({
        element: el,
        text: el.textContent,
        rect: el.getBoundingClientRect()
      }));

      // 找出最底部的 Y 位置
      const maxY = Math.max(...textsWithPosition.map(t => t.rect.bottom));
      const threshold = maxY - 30; // 底部 30px 範圍內

      // 過濾出底部區域的年份文本，且數量與 labels 相同
      const xLabels = textsWithPosition
        .filter(t => t.text.match(/^\d{4}$/) && t.rect.bottom >= threshold)
        .sort((a, b) => a.rect.left - b.rect.left)
        .slice(0, labels.length) // 確保只取與 labels 相同數量
        .map(t => t.element);

      if (!xLabels.length) return;

      // 獲取容器位置（用於計算相對位置）
      const containerRect = marginValuesContainer.getBoundingClientRect();

      // 計算每個標籤相對於 .margin-values-compact 的位置百分比
      const positions = xLabels.map((label) => {
        const labelRect = label.getBoundingClientRect();
        const labelCenter = labelRect.left + labelRect.width / 2;
        const relativeX = labelCenter - containerRect.left;

        return {
          year: label.textContent,
          percentage: (relativeX / containerRect.width) * 100
        };
      });

      setBarPositions(positions);
      setIsPositionReady(true);
    }, 100); // 短暫延遲確保圖表已渲染

    return () => clearTimeout(timer);
  }, [resizeKey, labels]);

  // 自訂 Tooltip
  const BarTooltip = ({ id, value, index, color }) => {
    const year = labels[index];
    const rev = revenue[index];
    const pro = profit[index];
    const margin = rev > 0 ? ((pro / rev) * 100).toFixed(1) : '0.0';

    return (
      <div
        style={{
          background: 'white',
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          color: '#0f172a',
          fontSize: '13px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
          {year} 年度
        </div>
        <div style={{ color: '#64748b' }}>營收: <span style={{ color: '#0f172a', fontWeight: '600' }}>{Math.round(rev).toLocaleString()}</span> 百萬</div>
        <div style={{ color: '#64748b' }}>淨利: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{Math.round(pro).toLocaleString()}</span> 百萬</div>
        <div style={{ color: '#64748b', marginTop: '4px' }}>淨利率: <span style={{ color: '#10b981', fontWeight: '600' }}>{margin}%</span></div>
      </div>
    );
  };

  if (!labels || labels.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>暂無資料</div>;
  }

  return (
    <div className="chart-nivo-wrapper" ref={containerRef}>
      {/* 圖例 */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color legend-color-bar"></span>
          <span className="legend-label">營收</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-color-line"></span>
          <span className="legend-label">淨利</span>
        </div>
      </div>

      {/* 單位標籤 */}
      <div className="chart-unit-label">單位：百萬元</div>

      {/* 單一圖表容器 */}
      <div className="chart-nivo-container">
        <ResponsiveBar
          key={resizeKey}
          data={barData}
          keys={['revenue']}
          indexBy="year"
          margin={{ top: 60, right: 20, bottom: 50, left: 65 }}
          padding={0.25}
          layout="vertical"
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          innerPadding={0}
          borderRadius={6}
          colors={(bar) => {
            const isSelected = bar.data.year === selectedYear;
            return isSelected ? '#3b82f6' : '#94a3b8';
          }}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 0.2]],
          }}
          axisTop={null}
          axisRight={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
            format: (value) => value.toLocaleString(),
            style: {
              tick: { fill: '#475569', fontSize: 12, fontWeight: '500' },
            },
          }}
          axisBottom={{
            tickSize: 0,
            tickPadding: 12,
            tickRotation: 0,
            style: {
              tick: { fill: '#475569', fontSize: 20, fontWeight: 600 },
            },
          }}
          enableGridY={true}
          gridYValues={5}
          gridYStyle={{
            stroke: '#f1f5f9',
            strokeWidth: 1,
            strokeDasharray: '4 4',
          }}
          enableLabel={false}
          animate={true}
          motionConfig="stiff"
          onClick={(node) => {
            onYearChange(node.data.year);
          }}
          tooltip={BarTooltip}
          layers={[
            'grid',
            'axes',
            'bars',
            'labels',
            'legends',
            // 自訂 layer：營收標籤
            ({ bars, xScale, yScale }) => {
              return bars.map((bar) => {
                const xPos = bar.x + bar.width / 2;
                const yPos = bar.y - 8;
                return (
                  <text
                    key={`label-${bar.data.year}`}
                    x={xPos}
                    y={yPos}
                    textAnchor="middle"
                    dominantBaseline="auto"
                    style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      fill: '#475569',
                      fontFamily: "'DM Mono', 'Roboto Mono', monospace",
                    }}
                  >
                    {Math.round(bar.data.value).toLocaleString()}
                  </text>
                );
              });
            },
            // 自訂 layer：折線圖
            ({ bars, xScale, yScale, innerWidth, innerHeight }) => {
              if (!bars || bars.length === 0) return null;

              // 計算折線圖的 Y 軸 scale
              const lineYScale = (value) => {
                const range = lineMaxValue - minProfit;
                const normalized = (value - minProfit) / range;
                return innerHeight - (normalized * innerHeight);
              };

              // 計算每個點的位置（使用原始 profit 陣列）
              const points = bars.map((bar, index) => {
                const centerX = bar.x + bar.width / 2;
                const profitValue = profit[index] || 0;
                const centerY = lineYScale(profitValue);
                return {
                  x: centerX,
                  y: centerY,
                  value: profitValue,
                  year: bar.data.year,
                };
              });

              // 生成折线路徑（monotoneX 曲線）
              let pathD = '';
              if (points.length === 1) {
                pathD = `M ${points[0].x} ${points[0].y}`;
              } else if (points.length >= 2) {
                pathD = `M ${points[0].x} ${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                  // 使用簡單的直線連接（可改為曲線）
                  pathD += ` L ${points[i].x} ${points[i].y}`;
                }
              }

              return (
                <g key="line-layer">
                  {/* 折線 */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#e67e22"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* 折線圖端點 */}
                  {points.map((point) => {
                    const isSelected = point.year === selectedYear;
                    const radius = isSelected ? 7 : 5;
                    return (
                      <g key={`point-${point.year}`}>
                        {/* 外圈（點擊區域） */}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={radius + 8}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onYearChange(point.year)}
                        />
                        {/* 白色內圈 */}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={radius}
                          fill="#ffffff"
                          stroke="#e67e22"
                          strokeWidth={3}
                          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                          onClick={() => onYearChange(point.year)}
                        />
                        {/* 淨利數字標籤 */}
                        <text
                          x={point.x}
                          y={point.y - 12}
                          textAnchor="middle"
                          dominantBaseline="auto"
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            fill: '#e67e22',
                            fontFamily: "'DM Mono', 'Roboto Mono', monospace",
                          }}
                        >
                          {Math.round(point.value).toLocaleString()}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            },
          ]}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: 12,
                  fontWeight: 600,
                },
              },
            },
            tooltip: {
              container: {
                background: 'white',
                color: '#0f172a',
                fontSize: '13px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              },
            },
          }}
        />
      </div>

      {/* 底部淨利率標籤區 - 精簡版 */}
      <div className="margin-labels-section-compact">
        <div className="margin-title-compact">淨利率%</div>
        <div className="margin-values-compact">
          {isPositionReady ? (
            <React.Fragment key="calculated-positions">
              {margins.map((item) => {
                const position = barPositions.find(p => p.year === item.year);
                if (!position) return null;

                return (
                  <div
                    key={item.year}
                    className={`margin-value-compact ${item.year === selectedYear ? 'margin-value-active' : ''}`}
                    onClick={() => onYearChange(item.year)}
                    style={{
                      position: 'absolute',
                      left: `${position.percentage}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="margin-percent-compact">{item.margin}</div>
                    <div className="margin-year-compact">{item.year}</div>
                  </div>
                );
              })}
            </React.Fragment>
          ) : (
            <React.Fragment key="fallback-positions">
              {margins.map((item, index) => (
                <div
                  key={item.year}
                  className={`margin-value-compact ${item.year === selectedYear ? 'margin-value-active' : ''}`}
                  onClick={() => onYearChange(item.year)}
                  style={{
                    position: 'absolute',
                    left: `${((index + 0.5) / labels.length) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="margin-percent-compact">{item.margin}</div>
                  <div className="margin-year-compact">{item.year}</div>
                </div>
              ))}
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinanceChart;
