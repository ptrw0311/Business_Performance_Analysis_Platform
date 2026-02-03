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

// API: 取得所有財務報表資料 (financial_basics)
app.get('/api/financial-basics/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('financial_basics')
      .select('*')
      .order('fiscal_year', { ascending: false })
      .order('tax_id', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('查詢財務報表失敗:', error);
    res.status(500).json({ error: '查詢財務報表失敗: ' + error.message });
  }
});

// API: 新增或更新財務報表資料 (financial_basics upsert)
app.post('/api/financial-basics/', async (req, res) => {
  try {
    const body = req.body;

    // 驗證必填欄位
    if (!body.fiscal_year || !body.tax_id) {
      return res.status(400).json({ error: '缺少必填欄位: fiscal_year, tax_id' });
    }

    // 驗證年度格式
    const year = parseInt(body.fiscal_year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ error: '年度格式錯誤，必須為 1900-2100 之間的數字' });
    }

    // 驗證統一編號格式
    const taxId = String(body.tax_id).trim();
    if (!/^\d{8}$/.test(taxId)) {
      return res.status(400).json({ error: '統一編號格式錯誤，必須為 8 位數字' });
    }

    // 準備 upsert 資料
    const upsertData = {
      fiscal_year: year,
      tax_id: taxId,
      ...body
    };

    const { data, error } = await supabase
      .from('financial_basics')
      .upsert(upsertData, {
        onConflict: 'fiscal_year,tax_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data: data?.[0] || null,
      message: '財務報表儲存成功'
    });
  } catch (error) {
    console.error('Upsert 財務報表失敗:', error);
    res.status(500).json({ error: 'Upsert 財務報表失敗: ' + error.message });
  }
});

// API: 更新指定財務報表資料
app.put('/api/financial-basics/:taxId/:year', async (req, res) => {
  try {
    const { taxId, year } = req.params;
    const body = req.body;

    // 驗證參數
    if (!/^\d{8}$/.test(taxId)) {
      return res.status(400).json({ error: '統一編號格式錯誤' });
    }
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({ error: '年度格式錯誤' });
    }

    // 移除主鍵欄位
    const { fiscal_year, tax_id, ...updateData } = body;

    const { data, error } = await supabase
      .from('financial_basics')
      .update(updateData)
      .eq('tax_id', taxId)
      .eq('fiscal_year', yearNum)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: '找不到指定的財務報表資料' });
    }

    res.json({
      success: true,
      data: data[0],
      message: '財務報表更新成功'
    });
  } catch (error) {
    console.error('更新財務報表失敗:', error);
    res.status(500).json({ error: '更新財務報表失敗: ' + error.message });
  }
});

// API: 刪除指定財務報表資料
app.delete('/api/financial-basics/:taxId/:year', async (req, res) => {
  try {
    const { taxId, year } = req.params;

    // 先查詢資料是否存在
    const { data: existingData } = await supabase
      .from('financial_basics')
      .select('*')
      .eq('tax_id', taxId)
      .eq('fiscal_year', year)
      .single();

    if (!existingData) {
      return res.status(404).json({ error: '找不到指定的財務報表資料' });
    }

    const { error } = await supabase
      .from('financial_basics')
      .delete()
      .eq('tax_id', taxId)
      .eq('fiscal_year', year);

    if (error) throw error;

    res.json({
      success: true,
      deletedData: existingData,
      message: '財務報表刪除成功'
    });
  } catch (error) {
    console.error('刪除財務報表失敗:', error);
    res.status(500).json({ error: '刪除財務報表失敗: ' + error.message });
  }
});

// API: 取得所有損益表資料 (pl_income_basics)
app.get('/api/pl-income/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pl_income_basics')
      .select('*')
      .order('fiscal_year', { ascending: false })
      .order('tax_id', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('查詢損益表失敗:', error);
    res.status(500).json({ error: '查詢損益表失敗: ' + error.message });
  }
});

// API: 新增或更新損益表資料 (pl_income_basics upsert)
app.post('/api/pl-income/', async (req, res) => {
  try {
    const body = req.body;

    // 驗證必填欄位
    if (!body.fiscal_year || !body.tax_id) {
      return res.status(400).json({ error: '缺少必填欄位: fiscal_year, tax_id' });
    }

    // 驗證年度格式
    const year = parseInt(body.fiscal_year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ error: '年度格式錯誤，必須為 1900-2100 之間的數字' });
    }

    // 驗證統一編號格式
    const taxId = String(body.tax_id).trim();
    if (!/^\d{8}$/.test(taxId)) {
      return res.status(400).json({ error: '統一編號格式錯誤，必須為 8 位數字' });
    }

    // 準備 upsert 資料
    const upsertData = {
      fiscal_year: year,
      tax_id: taxId,
      ...body
    };

    const { data, error } = await supabase
      .from('pl_income_basics')
      .upsert(upsertData, {
        onConflict: 'fiscal_year,tax_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data: data?.[0] || null,
      message: '損益表儲存成功'
    });
  } catch (error) {
    console.error('Upsert 損益表失敗:', error);
    res.status(500).json({ error: 'Upsert 損益表失敗: ' + error.message });
  }
});

// API: 更新指定損益表資料
app.put('/api/pl-income/:taxId/:year', async (req, res) => {
  try {
    const { taxId, year } = req.params;
    const body = req.body;

    // 驗證參數
    if (!/^\d{8}$/.test(taxId)) {
      return res.status(400).json({ error: '統一編號格式錯誤' });
    }
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({ error: '年度格式錯誤' });
    }

    // 移除主鍵欄位
    const { fiscal_year, tax_id, ...updateData } = body;

    const { data, error } = await supabase
      .from('pl_income_basics')
      .update(updateData)
      .eq('tax_id', taxId)
      .eq('fiscal_year', yearNum)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: '找不到指定的損益表資料' });
    }

    res.json({
      success: true,
      data: data[0],
      message: '損益表更新成功'
    });
  } catch (error) {
    console.error('更新損益表失敗:', error);
    res.status(500).json({ error: '更新損益表失敗: ' + error.message });
  }
});

// API: 刪除指定損益表資料
app.delete('/api/pl-income/:taxId/:year', async (req, res) => {
  try {
    const { taxId, year } = req.params;

    // 先查詢資料是否存在
    const { data: existingData } = await supabase
      .from('pl_income_basics')
      .select('*')
      .eq('tax_id', taxId)
      .eq('fiscal_year', year)
      .single();

    if (!existingData) {
      return res.status(404).json({ error: '找不到指定的損益表資料' });
    }

    const { error } = await supabase
      .from('pl_income_basics')
      .delete()
      .eq('tax_id', taxId)
      .eq('fiscal_year', year);

    if (error) throw error;

    res.json({
      success: true,
      deletedData: existingData,
      message: '損益表刪除成功'
    });
  } catch (error) {
    console.error('刪除損益表失敗:', error);
    res.status(500).json({ error: '刪除損益表失敗: ' + error.message });
  }
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

// ========================================
//   Excel 批次匯入/匯出 API (本地開發用)
// ========================================

// financial_basics 資料表的有效欄位清單
const FINANCIAL_BASICS_COLUMNS = new Set([
  'fiscal_year', 'tax_id', 'company_name', 'account_item',
  'cash_equivalents', 'fvtpl_assets_current', 'fvoci_assets_current', 'amortized_assets_current',
  'hedging_assets_current', 'contract_assets_current', 'notes_receivable_net', 'ar_net',
  'ar_related_net', 'other_receivables_net', 'current_tax_assets', 'inventory', 'prepayments',
  'assets_held_for_sale_net', 'other_fin_assets_current', 'other_current_assets', 'total_current_assets',
  'fvtpl_assets_noncurrent', 'fvoci_assets_noncurrent', 'amortized_assets_noncurrent',
  'contract_assets_noncurrent', 'equity_method_investments', 'ppe', 'right_of_use_assets',
  'investment_properties_net', 'intangible_assets', 'deferred_tax_assets', 'other_noncurrent_assets',
  'total_noncurrent_assets', 'total_assets', 'prepayments_for_equip', 'guarantee_deposits_out',
  'short_term_borrowings', 'short_term_notes_payable',
  'financial_liabilities_at_fair_value_through_profit_or_loss_curr', 'hedging_liabilities_current',
  'contract_liabilities_current', 'notes_payable', 'ap', 'ap_related', 'other_payables',
  'income_tax_payable', 'provisions_current', 'lease_liabilities_current', 'other_current_liabilities',
  'total_current_liabilities', 'contract_liabilities_noncurrent', 'bonds_payable', 'long_term_borrowings',
  'provisions_noncurrent', 'deferred_tax_liabilities', 'lease_liabilities_noncurrent',
  'other_noncurrent_liabilities', 'total_noncurrent_liabilities', 'guarantee_deposits_in',
  'total_liabilities', 'common_stock', 'total_capital_stock', 'capital_reserves', 'legal_reserves',
  'special_reserves', 'retained_earnings_unappropriated', 'total_retained_earnings', 'other_equity',
  'treasury_stock', 'equity_attr_parent', 'nci', 'total_equity', 'liabilities_equity_total',
  'shares_to_be_cancelled', 'advance_receipts_shares', 'treasury_shares_held'
]);

const PL_INCOME_BASICS_COLUMNS = new Set([
  'fiscal_year', 'tax_id', 'company_name', 'account_item',
  'operating_revenue_total', 'operating_costs_total', 'gross_profit_loss', 'gross_profit_loss_net',
  'selling_expenses', 'general_admin_expenses', 'r_and_d_expenses', 'expected_credit_loss_net',
  'operating_expenses_total', 'other_income_expense_net', 'operating_income_loss', 'interest_income',
  'other_income', 'other_gains_losses_net', 'finance_costs_net', 'equity_method_share_net',
  'nonop_income_expense_total', 'profit_before_tax', 'income_tax_expense_total',
  'net_income_cont_ops', 'net_income'
]);

// API: 財務報表批次匯入
app.post('/api/financial-basics/batch-import', async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: '請求格式錯誤：records 必須是陣列' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: '請求格式錯誤：records 不可為空陣列' });
    }

    const maxBatchSize = 1000;
    if (records.length > maxBatchSize) {
      return res.status(400).json({ error: `超過批次處理上限 ${maxBatchSize} 筆` });
    }

    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 驗證必要欄位
      if (!record.fiscal_year || !record.tax_id) {
        results.skipped++;
        results.errors.push({
          row: i + 1,
          reason: '缺少必填欄位 fiscal_year 或 tax_id'
        });
        continue;
      }

      // 清理資料，只保留有效的欄位
      const cleanRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (FINANCIAL_BASICS_COLUMNS.has(key)) {
          cleanRecord[key] = value;
        }
      }

      cleanRecord.fiscal_year = parseInt(record.fiscal_year);
      cleanRecord.tax_id = String(record.tax_id).trim();

      // 檢查是否為新增或更新
      const { data: existing } = await supabase
        .from('financial_basics')
        .select('fiscal_year, tax_id')
        .eq('fiscal_year', cleanRecord.fiscal_year)
        .eq('tax_id', cleanRecord.tax_id)
        .maybeSingle();

      const isUpdate = !!existing;

      // 執行 upsert
      const { data: upsertData, error: upsertError } = await supabase
        .from('financial_basics')
        .upsert(cleanRecord, {
          onConflict: 'fiscal_year,tax_id',
          ignoreDuplicates: false
        })
        .select();

      if (upsertError) {
        results.skipped++;
        results.errors.push({
          row: i + 1,
          reason: upsertError.message
        });
        continue;
      }

      if (isUpdate) {
        results.updated++;
      } else {
        results.inserted++;
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('POST financial-basics/batch-import 錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤: ' + error.message });
  }
});

// API: 匯出完整財務資料 Excel (包含財務報表和損益表兩個 sheet)
// 格式參考 financial_data_complete 2.2.xlsx
app.get('/api/financial-basics/export', async (req, res) => {
  try {
    const taxId = req.query.taxId;
    const fiscalYear = req.query.fiscalYear;

const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '財務分析機器人';
    workbook.created = new Date();

    // === 財務報表欄位定義 ===
    const financialColumns = [
      'fiscal_year', 'tax_id', 'company_name', 'account_item',
      'cash_equivalents', 'fvtpl_assets_current', 'fvoci_assets_current', 'amortized_assets_current',
      'hedging_assets_current', 'contract_assets_current', 'notes_receivable_net', 'ar_net',
      'ar_related_net', 'other_receivables_net', 'current_tax_assets', 'inventory', 'prepayments',
      'assets_held_for_sale_net', 'other_fin_assets_current', 'other_current_assets', 'total_current_assets',
      'fvtpl_assets_noncurrent', 'fvoci_assets_noncurrent', 'amortized_assets_noncurrent', 'contract_assets_noncurrent',
      'equity_method_investments', 'ppe', 'right_of_use_assets', 'investment_properties_net', 'intangible_assets',
      'deferred_tax_assets', 'other_noncurrent_assets', 'total_noncurrent_assets', 'total_assets', 'prepayments_for_equip',
      'guarantee_deposits_out', 'short_term_borrowings', 'short_term_notes_payable', 'financial_liabilities_at_fair_value_through_profit_or_loss_curr',
      'hedging_liabilities_current', 'contract_liabilities_current', 'notes_payable', 'ap', 'ap_related',
      'other_payables', 'income_tax_payable', 'provisions_current', 'lease_liabilities_current', 'other_current_liabilities',
      'total_current_liabilities', 'contract_liabilities_noncurrent', 'bonds_payable', 'long_term_borrowings',
      'provisions_noncurrent', 'deferred_tax_liabilities', 'lease_liabilities_noncurrent', 'other_noncurrent_liabilities',
      'total_noncurrent_liabilities', 'guarantee_deposits_in', 'total_liabilities', 'common_stock', 'total_capital_stock',
      'capital_reserves', 'legal_reserves', 'special_reserves', 'retained_earnings_unappropriated', 'total_retained_earnings',
      'other_equity', 'treasury_stock', 'equity_attr_parent', 'nci', 'total_equity', 'liabilities_equity_total',
      'shares_to_be_cancelled', 'advance_receipts_shares', 'treasury_shares_held'
    ];

    const financialHeaders = [
      '年度', '統一編號', '公司名稱', '會計科目',
      '現金及約當現金', '透過損益按公允價值衡量之金融資產-流動', '透過其他綜合損益按公允價值衡量之金融資產-流動', '按攤銷後成本衡量之金融資產-流動',
      '避險之金融資產-流動', '合約資產-流動', '應收票據淨額', '應收帳款淨額',
      '應收帳款-關係人淨額', '其他應收款淨額', '本期所得稅資產', '存貨', '預付款項',
      '待出售非流動資產(或處分群組)淨額', '其他金融資產-流動', '其他流動資產', '流動資產合計',
      '透過損益按公允價值衡量之金融資產-非流動', '透過其他綜合損益按公允價值衡量之金融資產-非流動', '按攤銷後成本衡量之金融資產-非流動', '合約資產-非流動',
      '採用權益法之投資', '不動產、廠房及設備', '使用權資產', '投資性不動產淨額', '無形資產',
      '遞延所得稅資產', '其他非流動資產', '非流動資產合計', '資產總額', '預付設備款',
      '存出保證金', '短期借款', '應付短期票券', '透過損益按公允價值衡量之金融負債－流動',
      '避險之金融負債-流動', '合約負債-流動', '應付票據', '應付帳款', '應付帳款-關係人',
      '其他應付款', '本期所得稅負債', '負債準備-流動', '租賃負債-流動', '其他流動負債',
      '流動負債合計', '合約負債-非流動', '應付公司債', '長期借款',
      '負債準備-非流動', '遞延所得稅負債', '租賃負債-非流動', '其他非流動負債',
      '非流動負債合計', '存入保證金', '負債總額', '普通股股本', '股本合計',
      '資本公積合計', '法定盈餘公積', '特別盈餘公積', '未分配盈餘(或待彌補虧損)', '保留盈餘合計',
      '其他權益合計', '庫藏股票', '歸屬於母公司業主之權益合計', '非控制權益', '權益總額', '負債及權益總計',
      '待註銷股本股數(單位:股)', '預收股款(權益項下)之約當發行股數(單位:股)', '母公司暨子公司所持有之母公司庫藏股股數(單位:股)'
    ];

    // === 損益表欄位定義 ===
    const incomeColumns = [
      'fiscal_year', 'tax_id', 'company_name', 'account_item',
      'operating_revenue_total', 'operating_costs_total', 'gross_profit_loss', 'gross_profit_loss_net',
      'selling_expenses', 'general_admin_expenses', 'r_and_d_expenses', 'expected_credit_loss_net', 'operating_expenses_total',
      'other_income_expense_net', 'operating_income_loss', 'interest_income', 'other_income', 'other_gains_losses_net',
      'finance_costs_net', 'equity_method_share_net', 'nonop_income_expense_total', 'profit_before_tax',
      'income_tax_expense_total', 'net_income_cont_ops', 'net_income'
    ];

    const incomeHeaders = [
      '年度', '統一編號', '公司名稱', '會計科目',
      '營業收入合計', '營業成本合計', '營業毛利(毛損)', '營業毛利(毛損)淨額',
      '推銷費用', '管理費用', '研究發展費用', '預期信用減損損失(利益)', '營業費用合計',
      '其他收益及費損淨額', '營業利益(損失)', '利息收入', '其他收入', '其他利益及損失淨額',
      '財務成本淨額', '採用權益法認列之關聯企業及合資損益之份額淨額', '營業外收入及支出合計', '稅前淨利(淨損)',
      '所得稅費用(利益)合計', '繼續營業單位本期淨利(淨損)', '本期淨利(淨損)'
    ];

    // 查詢財務報表資料
    let fbQuery = supabase
      .from('financial_basics')
      .select('*')
      .order('fiscal_year', { ascending: false })
      .order('tax_id', { ascending: true });

    if (taxId) fbQuery = fbQuery.eq('tax_id', taxId);
    if (fiscalYear) fbQuery = fbQuery.eq('fiscal_year', parseInt(fiscalYear));

    const { data: fbData, error: fbError } = await fbQuery;
    if (fbError) throw fbError;

    // 建立「財務報表」工作表
    const financialSheet = workbook.addWorksheet('財務報表');

    // 第 1 列：中文標題
    const financialHeaderRow1 = financialSheet.addRow(financialHeaders);
    financialHeaderRow1.font = { bold: true, size: 12 };
    financialHeaderRow1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' }
    };
    financialHeaderRow1.alignment = { horizontal: 'center', vertical: 'middle' };
    financialHeaderRow1.height = 25;

    // 第 2 列：英文標題
    const financialHeaderRow2 = financialSheet.addRow(financialColumns);
    financialHeaderRow2.font = { italic: true, size: 10, color: { argb: 'FF808080' } };
    financialHeaderRow2.alignment = { horizontal: 'center', vertical: 'middle' };
    financialHeaderRow2.height = 20;

    // 資料列
    fbData.forEach(row => {
      const rowData = financialColumns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return value;
        return value;
      });
      financialSheet.addRow(rowData);
    });

    // 凍結前 2 列
    financialSheet.views = [{ state: 'frozen', ySplit: 2 }];

    // 查詢損益表資料
    let plQuery = supabase
      .from('pl_income_basics')
      .select('*')
      .order('fiscal_year', { ascending: false })
      .order('tax_id', { ascending: true });

    if (taxId) plQuery = plQuery.eq('tax_id', taxId);
    if (fiscalYear) plQuery = plQuery.eq('fiscal_year', parseInt(fiscalYear));

    const { data: plData, error: plError } = await plQuery;
    if (plError) throw plError;

    // 建立「損益表」工作表
    const incomeSheet = workbook.addWorksheet('損益表');

    // 第 1 列：中文標題
    const incomeHeaderRow1 = incomeSheet.addRow(incomeHeaders);
    incomeHeaderRow1.font = { bold: true, size: 12 };
    incomeHeaderRow1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' }
    };
    incomeHeaderRow1.alignment = { horizontal: 'center', vertical: 'middle' };
    incomeHeaderRow1.height = 25;

    // 第 2 列：英文標題
    const incomeHeaderRow2 = incomeSheet.addRow(incomeColumns);
    incomeHeaderRow2.font = { italic: true, size: 10, color: { argb: 'FF808080' } };
    incomeHeaderRow2.alignment = { horizontal: 'center', vertical: 'middle' };
    incomeHeaderRow2.height = 20;

    // 資料列
    plData.forEach(row => {
      const rowData = incomeColumns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return value;
        return value;
      });
      incomeSheet.addRow(rowData);
    });

    // 凍結前 2 列
    incomeSheet.views = [{ state: 'frozen', ySplit: 2 }];

    // 產生檔案
    const buffer = await workbook.xlsx.writeBuffer();

    const now = new Date();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const encodedFilename = encodeURIComponent(`財務資料_${timestamp}.xlsx`);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.send(buffer);
  } catch (error) {
    console.error('GET financial-basics/export 錯誤:', error);
    res.status(500).json({ error: '匯出失敗: ' + error.message });
  }
});

// API: 損益表批次匯入
app.post('/api/pl-income/batch-import', async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: '請求格式錯誤：records 必須是陣列' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: '請求格式錯�誤：records 不可為空陣列' });
    }

    const maxBatchSize = 1000;
    if (records.length > maxBatchSize) {
      return res.status(400).json({ error: `超過批次處理上限 ${maxBatchSize} 筆` });
    }

    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 驗證必要欄位
      if (!record.fiscal_year || !record.tax_id) {
        results.skipped++;
        results.errors.push({
          row: i + 1,
          reason: '缺少必填欄位 fiscal_year 或 tax_id'
        });
        continue;
      }

      // 清理資料，只保留有效的欄位
      const cleanRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (PL_INCOME_BASICS_COLUMNS.has(key)) {
          cleanRecord[key] = value;
        }
      }

      cleanRecord.fiscal_year = parseInt(record.fiscal_year);
      cleanRecord.tax_id = String(record.tax_id).trim();

      // 檢查是否為新增或更新
      const { data: existing } = await supabase
        .from('pl_income_basics')
        .select('fiscal_year, tax_id')
        .eq('fiscal_year', cleanRecord.fiscal_year)
        .eq('tax_id', cleanRecord.tax_id)
        .maybeSingle();

      const isUpdate = !!existing;

      // 執行 upsert
      const { data: upsertData, error: upsertError } = await supabase
        .from('pl_income_basics')
        .upsert(cleanRecord, {
          onConflict: 'fiscal_year,tax_id',
          ignoreDuplicates: false
        })
        .select();

      if (upsertError) {
        results.skipped++;
        results.errors.push({
          row: i + 1,
          reason: upsertError.message
        });
        continue;
      }

      if (isUpdate) {
        results.updated++;
      } else {
        results.inserted++;
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('POST pl-income/batch-import 錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤: ' + error.message });
  }
});

// API: 損益表匯出 Excel
app.get('/api/pl-income/export', async (req, res) => {
  try {
    const taxId = req.query.taxId;
    const fiscalYear = req.query.fiscalYear;

    let query = supabase
      .from('pl_income_basics')
      .select('*')
      .order('fiscal_year', { ascending: false })
      .order('tax_id', { ascending: true });

    if (taxId) query = query.eq('tax_id', taxId);
    if (fiscalYear) query = query.eq('fiscal_year', parseInt(fiscalYear));

    const { data, error } = await query;

    if (error) throw error;

    // 使用 XLSX 生成 Excel
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws_data = [];

    // 標題列
    ws_data.push([
      '年度', '統一編號', '公司名稱', '會計科目',
      '營業收入合計', '營業成本合計', '營業毛利(毛損)', '營業利益(損失)',
      '稅前淨利(淨損)', '本期淨利(淨損)'
    ]);

    data.forEach(row => {
      ws_data.push([
        row.fiscal_year,
        row.tax_id,
        row.company_name,
        row.account_item,
        row.operating_revenue_total,
        row.operating_costs_total,
        row.gross_profit_loss,
        row.operating_income_loss,
        row.profit_before_tax,
        row.net_income
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, '損益表');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const now = new Date();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // 編碼檔案名稱以支援中文
    const encodedFilename = encodeURIComponent(`財務資料_${timestamp}.xlsx`);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('GET pl-income/export 錯誤:', error);
    res.status(500).json({ error: '匯出失敗: ' + error.message });
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
