import { useState, useEffect, useCallback } from 'react';
import CompanySelector from '../components/CompanySelector';
import StatCards from '../components/StatCards';
import InsightPanel from '../components/InsightPanel';
import FinanceChart from '../components/FinanceChart';
import KPIAndChartsSection from '../components/KPIAndChartsSection';
import FinancialDataTable from '../components/FinancialDataTable';
import DataManagerTabs from '../components/DataManagerTabs';
import DataTable from '../components/DataTable';
import EditModal from '../components/EditModal';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import UndoToast from '../components/UndoToast';
import ImportPreviewModal from '../components/ImportPreviewModal';
import DatabaseStatusIndicator from '../components/DatabaseStatusIndicator';
import robotLogo from '../assets/robot.png';

// API 基礎 URL（開發時使用 proxy，生產時直接使用）
const API_BASE = '/api';

// 財務報表欄位定義
const financialBasicsColumns = [
  { key: 'company_name', label: '公司名稱', sticky: true, stickyIndex: 0 },
  { key: 'fiscal_year', label: '年度', sticky: true, stickyIndex: 1 },
  { key: 'cash_equivalents', label: '現金及約當現金' },
  { key: 'ar_net', label: '應收帳款淨額' },
  { key: 'inventory', label: '存貨' },
  { key: 'total_current_assets', label: '流動資產合計' },
  { key: 'ppe', label: '不動產廠房設備' },
  { key: 'total_assets', label: '資產總額' },
  { key: 'total_current_liabilities', label: '流動負債合計' },
  { key: 'total_liabilities', label: '負債總額' },
  { key: 'total_equity', label: '權益總額' },
];

// 損益表欄位定義
const plIncomeColumns = [
  { key: 'company_name', label: '公司名稱', sticky: true, stickyIndex: 0 },
  { key: 'fiscal_year', label: '年度', sticky: true, stickyIndex: 1 },
  { key: 'operating_revenue_total', label: '營業收入合計' },
  { key: 'operating_costs_total', label: '營業成本合計' },
  { key: 'gross_profit_loss', label: '營業毛利(毛損)' },
  { key: 'operating_income_loss', label: '營業利益(損失)' },
  { key: 'nonop_income_expense_total', label: '營業外收支合計' },
  { key: 'profit_before_tax', label: '稅前淨利(淨損)' },
  { key: 'net_income', label: '本期淨利(淨損)' },
];

function HomePage() {
  // 現有狀態
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [financialData, setFinancialData] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 數據管理狀態
  const [allFinancialData, setAllFinancialData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);

  // 新增多報表狀態
  const [activeReportTab, setActiveReportTab] = useState('financial-basics');
  const [financialBasicsData, setFinancialBasicsData] = useState([]);
  const [plIncomeData, setPlIncomeData] = useState([]);
  const [isLoadingReportData, setIsLoadingReportData] = useState(false);

  // Excel 匯入狀態
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [parsedImportData, setParsedImportData] = useState(null);
  const [importError, setImportError] = useState(null);

  // 載入公司列表
  useEffect(() => {
    fetchCompanies();
    fetchAllFinancialData();
    fetchFinancialBasicsData();
    fetchPlIncomeData();
  }, []);

  // 當選擇公司變更時，載入該公司的財務資料
  useEffect(() => {
    if (selectedCompany) {
      fetchFinancialData(selectedCompany);
    }
  }, [selectedCompany]);

  // 取得所有公司所有財務數據（簡化版用於圖表）
  const fetchAllFinancialData = async () => {
    try {
      const response = await fetch(`${API_BASE}/financial/all`);
      if (response.ok) {
        const result = await response.json();
        setAllFinancialData(result.data || []);
      }
    } catch (err) {
      console.error('載入所有數據失敗:', err);
    }
  };

  // 取得財務報表資料（financial_basics）
  const fetchFinancialBasicsData = async () => {
    try {
      setIsLoadingReportData(true);
      const response = await fetch(`${API_BASE}/financial-basics/`);
      if (response.ok) {
        const result = await response.json();
        setFinancialBasicsData(result.data || []);
      }
    } catch (err) {
      console.error('載入財務報表失敗:', err);
    } finally {
      setIsLoadingReportData(false);
    }
  };

  // 取得損益表資料（pl_income_basics）
  const fetchPlIncomeData = async () => {
    try {
      setIsLoadingReportData(true);
      const response = await fetch(`${API_BASE}/pl-income/`);
      if (response.ok) {
        const result = await response.json();
        setPlIncomeData(result.data || []);
      }
    } catch (err) {
      console.error('載入損益表失敗:', err);
    } finally {
      setIsLoadingReportData(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/companies`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        if (data.companies && data.companies.length > 0) {
          const defaultCompany = data.companies.find(c => c.name === '博弘雲端') || data.companies[0];
          setSelectedCompany(defaultCompany.name);
        }
      } else {
        throw new Error('無法載入公司列表');
      }
    } catch (err) {
      console.error('載入公司列表失敗:', err);
      const demoCompanies = [{ id: 1, name: '博弘雲端' }];
      setCompanies(demoCompanies);
      setSelectedCompany('博弘雲端');
      setFinancialData({
        labels: ['2021', '2022', '2023', '2024', '2025'],
        revenue: [3510, 5061, 4749, 4002, 4468],
        profit: [83, 79, 121, 161, 143],
      });
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFinancialData = async (companyName) => {
    try {
      const response = await fetch(`${API_BASE}/financial/by-name?company=${encodeURIComponent(companyName)}`);
      if (response.ok) {
        const data = await response.json();
        setFinancialData(data.data);
        if (data.data?.labels?.length > 0) {
          setSelectedYear(data.data.labels[data.data.labels.length - 1]);
        }
      } else {
        throw new Error('無法載入財務資料');
      }
    } catch (err) {
      console.error('載入財務資料失敗:', err);
      if (companyName === '博弘雲端') {
        setFinancialData({
          labels: ['2021', '2022', '2023', '2024', '2025'],
          revenue: [3510, 5061, 4749, 4002, 4468],
          profit: [83, 79, 121, 161, 143],
        });
        setSelectedYear('2025');
      }
    }
  };

  const handleCompanyChange = useCallback((companyName) => {
    setSelectedCompany(companyName);
  }, []);

  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
  }, []);

  const handleUpdateData = async (data) => {
    try {
      const response = await fetch(`${API_BASE}/financial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchFinancialData(data.company);
      } else {
        if (selectedCompany === '博弘雲端' && financialData) {
          const idx = financialData.labels.indexOf(data.year);
          const newLabels = [...financialData.labels];
          const newRevenue = [...financialData.revenue];
          const newProfit = [...financialData.profit];

          if (idx !== -1) {
            newRevenue[idx] = data.revenue;
            newProfit[idx] = data.profit;
          } else {
            newLabels.push(data.year);
            newRevenue.push(data.revenue);
            newProfit.push(data.profit);
          }

          setFinancialData({
            labels: newLabels,
            revenue: newRevenue,
            profit: newProfit,
          });
          setSelectedYear(data.year);
        }
      }
    } catch (err) {
      console.error('更新資料失敗:', err);
      alert('更新失敗，請稍後再試');
    }
  };

  const handleBulkImport = async (action, data) => {
    if (action === 'export') {
      try {
        const response = await fetch(`${API_BASE}/export`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `多公司績效數據庫_${new Date().toISOString().slice(0, 10)}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          return;
        }
      } catch (err) {
        console.error('匯出失敗:', err);
      }

      const exportData = [['公司名稱', '年份', '營收', '稅前淨利']];
      if (financialData) {
        financialData.labels.forEach((label, i) => {
          exportData.push([
            selectedCompany,
            label,
            financialData.revenue[i],
            financialData.profit[i],
          ]);
        });
      }
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '所有公司績效數據');
      XLSX.writeFile(wb, `多公司績效數據庫_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (action === 'import' && data) {
      try {
        const response = await fetch(`${API_BASE}/financial/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });

        if (response.ok) {
          const result = await response.json();
          await fetchCompanies();
          await fetchAllFinancialData();
          if (result.companies && result.companies.length > 0) {
            setSelectedCompany(result.companies[0]);
          }
        }
      } catch (err) {
        console.error('批量匯入失敗:', err);
        alert('API 連接失敗，使用本地模式');
      }
    }
  };

  // 開啟新增 Modal（支援多報表類型）
  const handleCreate = (reportType) => {
    setEditingRecord(null);
    setModalMode('create');
    setActiveReportTab(reportType);
    setIsModalOpen(true);
  };

  // 開啟編輯 Modal
  const handleEdit = (record) => {
    setEditingRecord(record);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // 開啟刪除確認
  const handleDelete = (record) => {
    setDeletingRecord(record);
    setDeleteConfirmOpen(true);
  };

  // 確認刪除（支援多報表類型）
  const confirmDelete = async () => {
    if (!deletingRecord) return;

    try {
      // 根據當前 Tab 決定呼叫哪個 API
      const apiUrl = activeReportTab === 'financial-basics'
        ? `${API_BASE}/financial-basics/${deletingRecord.tax_id}/${deletingRecord.fiscal_year}`
        : `${API_BASE}/pl-income/${deletingRecord.tax_id}/${deletingRecord.fiscal_year}`;

      const response = await fetch(apiUrl, { method: 'DELETE' });

      if (response.ok) {
        setRecentlyDeleted(deletingRecord);
        const timerId = setTimeout(() => setRecentlyDeleted(null), 5000);
        setUndoTimeoutId(timerId);

        // 重新載入對應的報表資料
        if (activeReportTab === 'financial-basics') {
          await fetchFinancialBasicsData();
        } else {
          await fetchPlIncomeData();
        }

        setDeleteConfirmOpen(false);
        setDeletingRecord(null);
      }
    } catch (err) {
      console.error('刪除失敗:', err);
      alert('刪除失敗');
    }
  };

  // 復原刪除
  const undoDelete = async () => {
    if (!recentlyDeleted) return;

    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }

    try {
      await handleSaveData(recentlyDeleted, activeReportTab);
      setRecentlyDeleted(null);
    } catch (err) {
      alert('復原失敗');
    }
  };

  // 儲存新增/編輯數據（支援多報表類型）
  const handleSaveData = async (data, reportType) => {
    try {
      const apiUrl = reportType === 'financial-basics'
        ? `${API_BASE}/financial-basics/`
        : `${API_BASE}/pl-income/`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        if (reportType === 'financial-basics') {
          await fetchFinancialBasicsData();
        } else {
          await fetchPlIncomeData();
        }
        setIsModalOpen(false);
      } else {
        throw new Error('儲存失敗');
      }
    } catch (err) {
      console.error('儲存失敗:', err);
      throw err;
    }
  };

  const getCurrentData = () => {
    return activeReportTab === 'financial-basics' ? financialBasicsData : plIncomeData;
  };

  const getCurrentColumns = () => {
    return activeReportTab === 'financial-basics' ? financialBasicsColumns : plIncomeColumns;
  };

  // Excel 匯入相關處理函式
  const handleImportStart = () => {
    setImportError(null);
  };

  const handleImportComplete = (data) => {
    setParsedImportData(data);
    setImportPreviewOpen(true);
  };

  const handleImportError = (error) => {
    setImportError(error);
    alert('匯入錯誤：' + error.message);
  };

  const handleImportConfirm = async (result) => {
    setImportPreviewOpen(false);
    setParsedImportData(null);

    // 重新載入資料
    await fetchFinancialBasicsData();
    await fetchPlIncomeData();
  };

  const handleImportCancel = () => {
    setImportPreviewOpen(false);
    setParsedImportData(null);
  };

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>❌ {error}</h2>
          <button onClick={fetchCompanies} className="btn-action btn-excel-in" style={{ marginTop: '15px' }}>
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" id="capture-area">
      {/* UAT 暫時功能：資料庫狀態顯示 */}
      <DatabaseStatusIndicator />
      <div className="title-box">
        <div className="title-row">
          <img src={robotLogo} alt="FinRobot" className="title-logo" />
          <h2>財務分析機器人</h2>
        </div>
        <p className="subtitle-text">Financial Analysis Bot</p>
      </div>

      <CompanySelector
        companies={companies}
        selectedCompany={selectedCompany}
        onCompanyChange={handleCompanyChange}
        isLoading={isLoading}
      />

      <div id="pdfCompanyHeader" style={{ display: 'none', textAlign: 'center', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold', color: '#1565c0' }}></div>

      {financialData && (
        <>
          <StatCards
            companyName={selectedCompany}
            labels={financialData.labels}
            revenue={financialData.revenue}
            profit={financialData.profit}
          />

          <InsightPanel
            labels={financialData.labels}
            revenue={financialData.revenue}
            profit={financialData.profit}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
          />

          <FinanceChart
            labels={financialData.labels}
            revenue={financialData.revenue}
            profit={financialData.profit}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
          />

          <KPIAndChartsSection company={selectedCompany} selectedYear={selectedYear} />
          <FinancialDataTable company={selectedCompany} />

          <div id="pdf-capture-area" style={{ position: 'absolute', left: '-9999px', top: '0', width: '794px', background: '#ffffff', padding: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                {selectedCompany}
              </h2>
              <div style={{ fontSize: '14px', color: '#64748b' }}>經營績效分析報告</div>
            </div>

            <div style={{ marginBottom: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#3b82f6' }}>
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.55-3 6v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3C6.19 13.55 5 11.38 5 9a7 7 0 0 1 7-7z"></path>
                  <path d="M9 21h6"></path>
                </svg>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>績效洞察 (Performance Insight)</span>
              </div>
              <div id="pdf-insight-content" style={{ fontSize: '14px', lineHeight: '1.8', color: '#475569' }}></div>
            </div>

            <div id="pdf-chart-container" style={{ marginBottom: '20px' }}></div>

            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
                淨利率 (Net profit margin)
              </div>
              <div id="pdf-margin-content" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}></div>
            </div>
          </div>
        </>
      )}

      {/* 數據管理區塊 */}
      <div className="data-manager-section">
        <div className="section-header">
          <h3>📊 數據與檔案管理</h3>
        </div>

        <DataManagerTabs
          activeReportTab={activeReportTab}
          onTabChange={setActiveReportTab}
          financialBasicsContent={
            <DataTable
              data={financialBasicsData}
              columns={financialBasicsColumns}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          }
          plIncomeContent={
            <DataTable
              data={plIncomeData}
              columns={plIncomeColumns}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          }
          onAddNew={handleCreate}
          onImportStart={handleImportStart}
          onImportComplete={handleImportComplete}
          onImportError={handleImportError}
        />
      </div>

      {/* Modal 組件 */}
      <EditModal
        isOpen={isModalOpen}
        mode={modalMode}
        reportType={activeReportTab}
        initialValues={editingRecord}
        companies={companies}
        onSave={handleSaveData}
        onClose={() => setIsModalOpen(false)}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        record={deletingRecord}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeletingRecord(null);
        }}
      />

      {recentlyDeleted && (
        <UndoToast
          message={`✓ 已刪除: ${recentlyDeleted.company_name || recentlyDeleted.company} ${recentlyDeleted.fiscal_year || recentlyDeleted.year} 年度數據`}
          onUndo={undoDelete}
        />
      )}

      {/* Excel 匯入預覽 Modal */}
      <ImportPreviewModal
        isOpen={importPreviewOpen}
        parsedData={parsedImportData}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
      />
    </div>
  );
}

export default HomePage;
