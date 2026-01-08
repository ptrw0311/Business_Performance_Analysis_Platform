import { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// 註冊 Chart.js 元件
ChartJS.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels,
);

// 顏色設定
const colorRevDefault = 'rgba(233, 196, 200, 0.9)';
const colorRevDim = 'rgba(233, 196, 200, 0.3)';
const colorProDefault = '#e67e22';

function FinanceChart({ labels, revenue, profit, selectedYear, onYearChange }) {
  const chartRef = useRef(null);
  const wrapperRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // 自訂 Plugin: 底部淨利率列
  const bottomMarginPlugin = {
    id: 'bottomMarginPlugin',
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const xAxis = chart.scales.x;
      const bottomY = xAxis.bottom + 25;

      ctx.save();
      ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      ctx.fillText('淨利率', 0, bottomY - 8);
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText('(Net profit margin)', 0, bottomY + 8);

      if (revenue && profit && revenue.length === profit.length) {
        const margins = revenue.map((rev, i) => ((profit[i] / rev) * 100).toFixed(1) + '%');
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';

        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((bar, index) => {
          if (margins[index]) ctx.fillText(margins[index], bar.x, bottomY);
        });
      }
      ctx.restore();
    },
  };

  // 初始化圖表
  useEffect(() => {
    if (!chartRef.current || !labels || !revenue || !profit) return;

    // 清理舊的 chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = chartRef.current.getContext('2d');
    const maxProfit = Math.max(...profit, 10);

    // 計算背景色（根據選中年份）
    const backgroundColors = labels.map(year =>
      year === selectedYear ? colorRevDefault : colorRevDim
    );

    const newChart = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '營收',
            data: revenue,
            backgroundColor: backgroundColors,
            borderRadius: 0,
            order: 2,
            datalabels: {
              anchor: 'end',
              align: 'top',
              color: '#666',
              font: { weight: 'bold' },
              formatter: (v) => v.toLocaleString(),
            },
          },
          {
            label: '稅前淨利',
            data: profit,
            type: 'line',
            borderColor: colorProDefault,
            borderWidth: 3,
            pointBackgroundColor: '#fff',
            pointBorderColor: colorProDefault,
            pointRadius: 6,
            hoverRadius: 8,
            yAxisID: 'y1',
            order: 1,
            datalabels: {
              align: 'top',
              color: '#e67e22',
              font: { weight: 'bold' },
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 4,
              offset: 4,
              formatter: (value) => `${value}`,
              textAlign: 'center',
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 30, bottom: 40, left: 10, right: 10 },
        },
        onClick: (e, elements) => {
          if (elements.length > 0 && labels) {
            const idx = elements[0].index;
            const year = labels[idx];
            onYearChange(year);
          }
        },
        onHover: (event, chartElement) => {
          if (event.native) {
            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#555',
              font: { size: 14, weight: 'bold' },
              padding: 10,
            },
          },
          y: {
            display: false,
            beginAtZero: true,
          },
          y1: {
            display: false,
            beginAtZero: true,
            min: 0,
            max: maxProfit * 4.5,
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'start',
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} 百萬`,
              afterLabel: (ctx) => {
                const rev = ctx.chart.data.datasets[0].data[ctx.dataIndex];
                const pro = ctx.chart.data.datasets[1].data[ctx.dataIndex];
                return `淨利率: ${((pro / rev) * 100).toFixed(1)}%`;
              },
            },
          },
        },
      },
      plugins: [bottomMarginPlugin],
    });

    chartInstanceRef.current = newChart;

    // 清理函數
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [labels, revenue, profit, selectedYear]); // 當這些變數改變時重新建立圖表

  return (
    <div className="chart-container" ref={wrapperRef}>
      <div className="chart-unit-label">單位：百萬元</div>
      <canvas ref={chartRef} id="financeChart"></canvas>
    </div>
  );
}

export default FinanceChart;
