/**
 * DataManagerTabs - 數據管理視圖切換標籤
 * 提供財務報表與損益表的切換
 */
function DataManagerTabs({
  activeReportTab = 'financial-basics',
  onTabChange,
  financialBasicsContent,
  plIncomeContent,
  onAddNew
}) {
  return (
    <div>
      <div className="data-manager-header">
        <div className="data-manager-tabs">
          <button
            className={`tab-button ${activeReportTab === 'financial-basics' ? 'active' : ''}`}
            onClick={() => onTabChange('financial-basics')}
          >
            📊 財務報表
          </button>
          <button
            className={`tab-button ${activeReportTab === 'pl-income' ? 'active' : ''}`}
            onClick={() => onTabChange('pl-income')}
          >
            💰 損益表
          </button>
        </div>

        <button
          className="btn-primary"
          onClick={() => onAddNew(activeReportTab)}
        >
          + 新增資料
        </button>
      </div>

      <div className="tab-content">
        {activeReportTab === 'financial-basics' ? financialBasicsContent : plIncomeContent}
      </div>
    </div>
  );
}

export default DataManagerTabs;
