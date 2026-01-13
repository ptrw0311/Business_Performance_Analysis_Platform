import { useState, useMemo } from 'react';

/**
 * DataTable - 數據表格組件
 * 顯示所有公司的財務數據，支援排序、篩選、分頁
 */
function DataTable({ data, onEdit, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('company');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState({ company: '', year: '' });

  const itemsPerPage = 10;

  // 排序與篩選邏輯
  const processedData = useMemo(() => {
    // 確保 data 是陣列
    if (!Array.isArray(data)) {
      return [];
    }

    let result = [...data];

    // 篩選
    if (filters.company) {
      result = result.filter((item) =>
        item.company.includes(filters.company)
      );
    }
    if (filters.year) {
      result = result.filter((item) =>
        String(item.year).includes(filters.year)
      );
    }

    // 排序
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, filters, sortBy, sortOrder]);

  // 分頁邏輯
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIndicator = (column) => {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? '▲' : '▼';
  };

  if (!data || data.length === 0) {
    return (
      <div className="data-table-container">
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          暫無數據
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      {/* 篩選器 */}
      <div className="table-filters">
        <input
          type="text"
          placeholder="搜尋公司..."
          value={filters.company}
          onChange={(e) => {
            setFilters({ ...filters, company: e.target.value });
            setCurrentPage(1);
          }}
        />
        <input
          type="text"
          placeholder="篩選年份..."
          value={filters.year}
          onChange={(e) => {
            setFilters({ ...filters, year: e.target.value });
            setCurrentPage(1);
          }}
        />
      </div>

      {/* 表格 */}
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('company')}>
              公司 {getSortIndicator('company')}
            </th>
            <th onClick={() => handleSort('year')}>
              年份 {getSortIndicator('year')}
            </th>
            <th onClick={() => handleSort('revenue')}>
              營收 {getSortIndicator('revenue')}
            </th>
            <th onClick={() => handleSort('profit')}>
              淨利 {getSortIndicator('profit')}
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, idx) => (
            <tr key={`${row.company_id}-${row.year}-${idx}`}>
              <td>{row.company}</td>
              <td>{row.year}</td>
              <td>{row.revenue.toLocaleString()}</td>
              <td>{row.profit.toLocaleString()}</td>
              <td>
                <button
                  className="table-action-btn edit"
                  onClick={() => onEdit(row)}
                  title="編輯"
                >
                  ✏️
                </button>
                <button
                  className="table-action-btn delete"
                  onClick={() => onDelete(row)}
                  title="刪除"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="table-pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            上一頁
          </button>
          <span>
            第 {currentPage} 頁，共 {totalPages} 頁
            {processedData.length > itemsPerPage && ` (共 ${processedData.length} 筆)`}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            下一頁
          </button>
        </div>
      )}

      {processedData.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
          沒有符合條件的數據
        </div>
      )}
    </div>
  );
}

export default DataTable;
