/**
 * ExcelExportButton - Excel 匯出按鈕組件
 * 呼叫後端 API 下載 Excel 檔案
 */
import { useState } from 'react';

function ExcelExportButton({
  tableType, // 'financial-basics' or 'pl-income'
  filters = {},
  disabled = false
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);

    try {
      // 建構查詢參數
      const params = new URLSearchParams();
      if (filters.taxId) params.append('taxId', filters.taxId);
      if (filters.fiscalYear) params.append('fiscalYear', filters.fiscalYear);

      // 呼叫匯出 API
      const endpoint = tableType === 'financial-basics'
        ? '/api/financial-basics/export'
        : '/api/pl-income/export';

      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error('匯出失敗');
      }

      // 取得檔案名稱
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '財務資料.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
        if (match) {
          filename = decodeURIComponent(match[1].replace(/"/g, ''));
        }
      }

      // 下載檔案
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('匯出錯誤:', error);
      alert('匯出失敗：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className="btn-secondary"
      onClick={handleExport}
      disabled={disabled || isLoading}
    >
      {isLoading ? '📤 匯出中...' : '📤 匯出 Excel'}
    </button>
  );
}

export default ExcelExportButton;
