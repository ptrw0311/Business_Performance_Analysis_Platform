/**
 * DataManagerTabs - 數據管理視圖切換標籤
 * 提供表格視圖與快速新增視圖的切換
 */
function DataManagerTabs({ activeTab, onTabChange, tableContent, quickAddContent }) {
  return (
    <div>
      <div className="data-manager-tabs">
        <button
          className={`tab-button ${activeTab === 'quick-add' ? 'active' : ''}`}
          onClick={() => onTabChange('quick-add')}
        >
          ⚡ 快速新增
        </button>
        <button
          className={`tab-button ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => onTabChange('table')}
        >
          📋 數據表格
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'table' ? tableContent : quickAddContent}
      </div>
    </div>
  );
}

export default DataManagerTabs;
