import { useState, useEffect } from 'react';

const API_BASE = '/api';
const AI_API_URL = 'http://10.1.110.11:7814/v1/finance/analyze';

function ExecutiveSummaryCard({ company, selectedYear }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 當公司或年度變更時重新載入
  useEffect(() => {
    if (company && selectedYear) {
      fetchAISummary();
    } else {
      // 清除狀態
      setSummary(null);
      setError(null);
    }
  }, [company, selectedYear]);

  const fetchAISummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 步驟 1: 先從後端 API 查詢 tax_id
      const taxIdResponse = await fetch(
        `${API_BASE}/financial-basics/taxid?company=${encodeURIComponent(company)}`
      );

      if (!taxIdResponse.ok) {
        throw new Error('無法取得公司統一編號');
      }

      const taxIdResult = await taxIdResponse.json();

      if (!taxIdResult.success || !taxIdResult.data || !taxIdResult.data.tax_id) {
        throw new Error('找不到該公司的統一編號');
      }

      const taxId = taxIdResult.data.tax_id;

      // 步驟 2: 直接呼叫企業內 AI API（瀏覽器 → 內網）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const aiResponse = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_id: taxId,
          fiscal_year: parseInt(selectedYear),
          model_mode: 'local'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        throw new Error(`AI API 回應錯誤: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();

      if (aiResult.summary) {
        setSummary(aiResult.summary);
      } else {
        throw new Error('AI API 未返回摘要內容');
      }

    } catch (err) {
      console.error('載入 AI 摘要失敗:', err);

      // 根據錯誤類型顯示不同的錯誤訊息
      if (err.name === 'AbortError') {
        setError('AI 分析請求逾時');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('AI 分析服務無法連線（僅支援企業內網）');
      } else {
        setError(err.message || 'AI 分析服務暫時無法使用');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 載入狀態
  if (isLoading) {
    return (
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-card-icon summary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.55-3 6v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3C6.19 13.55 5 11.38 5 9a7 7 0 0 1 7-7z"></path>
              <path d="M9 21h6"></path>
            </svg>
          </div>
          <h3 className="kpi-card-title">綜合分析評論</h3>
        </div>
        <div className="kpi-card-content">
          <div className="ai-summary-loading">
            <div className="loading-spinner"></div>
            <span>AI 分析中...</span>
          </div>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-card-icon summary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.55-3 6v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3C6.19 13.55 5 11.38 5 9a7 7 0 0 1 7-7z"></path>
              <path d="M9 21h6"></path>
            </svg>
          </div>
          <h3 className="kpi-card-title">綜合分析評論</h3>
        </div>
        <div className="kpi-card-content">
          <div className="ai-summary-error">
            <span>⚠️ {error}</span>
            <button onClick={fetchAISummary} className="retry-button">重新載入</button>
          </div>
        </div>
      </div>
    );
  }

  // 成功狀態
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <div className="kpi-card-icon summary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.55-3 6v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3C6.19 13.55 5 11.38 5 9a7 7 0 0 1 7-7z"></path>
            <path d="M9 21h6"></path>
          </svg>
        </div>
        <h3 className="kpi-card-title">綜合分析評論</h3>
      </div>
      <div className="kpi-card-content">
        <div className="ai-summary-content">
          {renderMarkdown(summary)}
        </div>
      </div>
    </div>
  );
}

// 簡單的 Markdown 渲染函式
function renderMarkdown(text) {
  if (!text) return null;

  // 分段處理
  const paragraphs = text.split('\n\n');

  return paragraphs.map((paragraph, idx) => {
    // 處理標題 【XXX】
    if (paragraph.startsWith('【') && paragraph.endsWith('】')) {
      const title = paragraph;
      return <h4 key={idx} className="ai-summary-section-title">{title}</h4>;
    }

    // 處理清單項目
    const lines = paragraph.split('\n');
    if (lines.some(line => line.match(/^\d+\./) || line.match(/^-\s/))) {
      return (
        <ul key={idx} className="ai-summary-list">
          {lines.map((line, lineIdx) => {
            if (line.match(/^\d+\./)) {
              return <li key={lineIdx}>{line.replace(/^\d+\.\s*/, '')}</li>;
            }
            if (line.match(/^-\s/)) {
              return <li key={lineIdx}>{line.replace(/^-\s*/, '')}</li>;
            }
            return <p key={lineIdx}>{line}</p>;
          })}
        </ul>
      );
    }

    // 一般段落
    return <p key={idx}>{paragraph}</p>;
  });
}

export default ExecutiveSummaryCard;
