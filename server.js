// 本地開發 API Server
// 使用: node server.js
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

// --- ADDED: Imports for path handling in ES Modules ---
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// --- ADDED: Recreate __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 取得 Supabase 設定
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('錯誤: 請設定 SUPABASE_URL 和 SUPABASE_ANON_KEY 環境變數');
  process.exit(1);
}

// 建立 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 單位轉換函式：千元 → 百萬元
function convertToMillions(valueInThousands) {
  if (valueInThousands === null || valueInThousands === undefined) {
    return 0;
  }
  const numValue = typeof valueInThousands === 'string'
    ? parseFloat(valueInThousands)
    : valueInThousands;
  return numValue / 1000;
}

// API: 取得所有公司
app.get('/api/companies', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, company_name')
      .order('company_name');

    if (error) throw error;

    const companies = data.map(row => ({
      id: row.id,
      name: row.company_name,
    }));
    res.json({ companies });
  } catch (error) {
    console.error('取得公司列表失敗:', error);
    res.status(500).json({ error: '取得公司列表失敗', message: error.message });
  }
});

// API: 取得特定公司財務資料 (使用 query string 避免中文編碼問題)
app.get('/api/financial/by-name', async (req, res) => {
  try {
    const company = req.query.company;
    if (!company) {
      return res.status(400).json({ error: '缺少 company 參數' });
    }

    const { data, error } = await supabase
      .from('pl_income_basics')
      .select('fiscal_year, operating_revenue_total, profit_before_tax')
      .eq('company_name', company)
      .order('fiscal_year');

    if (error) throw error;

    const labels = [];
    const revenue = [];
    const profit = [];

    data.forEach(row => {
      labels.push(String(row.fiscal_year));
      revenue.push(convertToMillions(row.operating_revenue_total));
      profit.push(convertToMillions(row.profit_before_tax));
    });

    res.json({
      company: company,
      data: { labels, revenue, profit },
    });
  } catch (error) {
    console.error('取得財務資料失敗:', error);
    res.status(500).json({ error: '取得財務資料失敗', message: error.message });
  }
});

// API: 取得詳細財務指標資料 (給 KPI 和圖表使用)
app.get('/api/financial/basics', async (req, res) => {
  try {
    const company = req.query.company;
    if (!company) {
      return res.status(400).json({ error: '缺少 company 參數' });
    }

    // 同時查詢損益表和資產負債表
    const [incomeResult, balanceResult] = await Promise.all([
      supabase
        .from('pl_income_basics')
        .select('*')
        .eq('company_name', company)
        .order('fiscal_year'),
      supabase
        .from('financial_basics')
        .select('*')
        .eq('company_name', company)
        .order('fiscal_year'),
    ]);

    if (incomeResult.error) throw incomeResult.error;
    if (balanceResult.error) throw balanceResult.error;

    if (!incomeResult.data || incomeResult.data.length === 0) {
      return res.status(404).json({ error: '公司資料不存在' });
    }

    // 計算財務指標
    const metrics = calculateMetrics(incomeResult.data, balanceResult.data);

    res.json({
      success: true,
      data: {
        company: company,
        years: metrics.years,
        metrics: metrics,
      },
    });
  } catch (error) {
    console.error('取得財務指標失敗:', error);
    res.status(500).json({ error: '取得財務指標失敗', message: error.message });
  }
});

// 計算財務指標的函式
function calculateMetrics(incomeData, balanceData) {
  const incomeByYear = {};
  const balanceByYear = {};

  incomeData.forEach(row => {
    incomeByYear[row.fiscal_year] = row;
  });

  balanceData.forEach(row => {
    balanceByYear[row.fiscal_year] = row;
  });

  const years = [...new Set([
    ...incomeData.map(r => r.fiscal_year),
    ...balanceData.map(r => r.fiscal_year)
  ])].sort((a, b) => a - b);

  const result = {
    years: years.map(String),
    netProfitMargin: [],
    grossMargin: [],
    roa: [],
    currentRatio: [],
    quickRatio: [],
    debtEquityRatio: [],
    arTurnover: [],
    inventoryTurnover: [],
    revenueGrowth: [],
    grossProfitGrowth: [],
    profitBeforeTaxGrowth: [],
    sellingExpenseRatio: [],
    adminExpenseRatio: [],
    rdExpenseRatio: [],
  };

  const safeDivide = (numerator, denominator) => {
    if (denominator === null || denominator === undefined || denominator === 0) return null;
    if (numerator === null || numerator === undefined) return null;
    return numerator / denominator;
  };

  const getPreviousYear = (dataMap, year) => dataMap[year - 1] || null;

  years.forEach((year) => {
    const income = incomeByYear[year];
    const balance = balanceByYear[year];
    const prevIncome = getPreviousYear(incomeByYear, year);
    const prevBalance = getPreviousYear(balanceByYear, year);

    result.netProfitMargin.push(safeDivide(income?.profit_before_tax, income?.operating_revenue_total) * 100 || null);
    result.grossMargin.push(safeDivide(income?.gross_profit_loss, income?.operating_revenue_total) * 100 || null);

    if (balance?.total_assets && prevBalance?.total_assets) {
      const avgAssets = (balance.total_assets + prevBalance.total_assets) / 2;
      result.roa.push(safeDivide(income?.net_income, avgAssets) * 100 || null);
    } else {
      result.roa.push(null);
    }

    result.currentRatio.push(safeDivide(balance?.total_current_assets, balance?.total_current_liabilities) * 100 || null);

    if (balance?.total_current_assets && balance?.total_current_liabilities) {
      const quickAssets = (parseFloat(balance.total_current_assets) || 0) -
        (parseFloat(balance.inventory) || 0) -
        (parseFloat(balance.prepayments) || 0);
      result.quickRatio.push(safeDivide(quickAssets, balance.total_current_liabilities) * 100 || null);
    } else {
      result.quickRatio.push(null);
    }

    result.debtEquityRatio.push(safeDivide(balance?.total_liabilities, balance?.total_equity) * 100 || null);

    const currentAR = (parseFloat(balance?.notes_receivable_net) || 0) +
      (parseFloat(balance?.ar_net) || 0) +
      (parseFloat(balance?.ar_related_net) || 0);
    const prevAR = (parseFloat(prevBalance?.notes_receivable_net) || 0) +
      (parseFloat(prevBalance?.ar_net) || 0) +
      (parseFloat(prevBalance?.ar_related_net) || 0);
    const avgAR = (currentAR + prevAR) / 2;
    result.arTurnover.push(safeDivide(income?.operating_revenue_total, avgAR) || null);

    const currentInventory = parseFloat(balance?.inventory) || 0;
    const prevInventory = parseFloat(prevBalance?.inventory) || 0;
    const avgInventory = (currentInventory + prevInventory) / 2;
    result.inventoryTurnover.push(safeDivide(income?.operating_costs_total, avgInventory) || null);

    if (prevIncome?.operating_revenue_total) {
      result.revenueGrowth.push((safeDivide(income?.operating_revenue_total, prevIncome.operating_revenue_total) - 1) * 100 || null);
    } else {
      result.revenueGrowth.push(null);
    }

    if (prevIncome?.gross_profit_loss) {
      result.grossProfitGrowth.push((safeDivide(income?.gross_profit_loss, prevIncome.gross_profit_loss) - 1) * 100 || null);
    } else {
      result.grossProfitGrowth.push(null);
    }

    if (prevIncome?.profit_before_tax) {
      result.profitBeforeTaxGrowth.push((safeDivide(income?.profit_before_tax, prevIncome.profit_before_tax) - 1) * 100 || null);
    } else {
      result.profitBeforeTaxGrowth.push(null);
    }

    result.sellingExpenseRatio.push(safeDivide(income?.selling_expenses, income?.operating_revenue_total) * 100 || null);
    result.adminExpenseRatio.push(safeDivide(income?.general_admin_expenses, income?.operating_revenue_total) * 100 || null);
    result.rdExpenseRatio.push(safeDivide(income?.r_and_d_expenses, income?.operating_revenue_total) * 100 || null);
  });

  return result;
}

// API: 取得所有公司所有財務數據
app.get('/api/financial/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pl_income_basics')
      .select(`
        fiscal_year,
        operating_revenue_total,
        profit_before_tax,
        companies!inner (
          id,
          company_name
        )
      `);

    if (error) throw error;

    const result = data.map(row => ({
      company_id: row.companies?.id,
      company: row.companies?.company_name || '未知公司',
      year: row.fiscal_year,
      revenue: convertToMillions(row.operating_revenue_total),
      profit: convertToMillions(row.profit_before_tax),
    })).sort((a, b) => a.company.localeCompare(b.company) || b.year - a.year);

    res.json({ data: result });
  } catch (error) {
    console.error('取得所有數據失敗:', error);
    res.status(500).json({ error: '取得所有數據失敗', message: error.message });
  }
});

// API: 新增/更新財務資料 (Supabase 模式下已停用)
app.post('/api/financial', async (req, res) => {
  res.status(403).json({ error: 'Supabase 模式下不支援新增/更新功能，資料庫為唯讀' });
});

// API: 批量匯入 (Supabase 模式下已停用)
app.post('/api/financial/bulk', async (req, res) => {
  res.status(403).json({ error: 'Supabase 模式下不支援批量匯入功能，資料庫為唯讀' });
});

// API: 刪除特定財務數據 (Supabase 模式下已停用)
app.delete('/api/financial/:companyId/:year', async (req, res) => {
  res.status(403).json({ error: 'Supabase 模式下不支援刪除功能，資料庫為唯讀' });
});

// API: 批量刪除 (Supabase 模式下已停用)
app.delete('/api/financial/bulk', async (req, res) => {
  res.status(403).json({ error: 'Supabase 模式下不支援刪除功能，資料庫為唯讀' });
});

// API: 匯出 Excel
app.get('/api/export', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pl_income_basics')
      .select(`
        fiscal_year,
        operating_revenue_total,
        profit_before_tax,
        companies!inner (
          company_name
        )
      `)
      .order('fiscal_year');

    if (error) throw error;

    const exportData = [['公司名稱', '年份', '營收', '稅前淨利']];
    data.forEach(row => {
      exportData.push([
        row.companies.company_name,
        row.fiscal_year,
        convertToMillions(row.operating_revenue_total),
        convertToMillions(row.profit_before_tax),
      ]);
    });

    // 排序
    exportData.sort((a, b) => {
      if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '所有公司績效數據');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="多公司績效數據庫_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('匯出失敗:', error);
    res.status(500).json({ error: '匯出失敗', message: error.message });
  }
});

// --- ADDED: Serve Static Files ---
// Serve the files generated by 'vite build' from the 'dist' folder
app.use(express.static(path.join(__dirname, 'dist')));

// --- ADDED: Catch-All Route for React Router ---
// Any request that doesn't match an API route above gets sent to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`\n🚀 本地 API Server 運行在 http://localhost:${PORT}`);
  console.log(`📊 Supabase 資料庫: ${SUPABASE_URL}\n`);
});
