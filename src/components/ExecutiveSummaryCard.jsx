/**
 * 綜合分析評論卡片
 * 目前保留空白，未來將使用 LLM 產出財務分析摘要
 */
function ExecutiveSummaryCard({ metrics }) {
  if (!metrics || !metrics.years || metrics.years.length === 0) {
    return null;
  }

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
        <div className="kpi-card-empty">
          分析內容將由 AI 產生
        </div>
      </div>
    </div>
  );
}

export default ExecutiveSummaryCard;
