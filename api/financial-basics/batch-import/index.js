// Vercel Serverless Function: 財務報表批次匯入
import { createRepository, handleOptions, successResponse, errorResponse } from '../../_lib.js';

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

// 不需要數值轉換的文字欄位
const TEXT_FIELDS = new Set(['tax_id', 'company_name', 'account_item']);

function cleanRecord(record) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    if (!FINANCIAL_BASICS_COLUMNS.has(key)) continue;
    if (value === null || value === undefined || value === '') {
      cleaned[key] = null;
      continue;
    }
    if (key === 'fiscal_year') {
      cleaned[key] = parseInt(value);
    } else if (TEXT_FIELDS.has(key)) {
      cleaned[key] = String(value).trim();
    } else {
      // 數值欄位：確保為數字型別
      const num = typeof value === 'number' ? value : parseFloat(value);
      cleaned[key] = isNaN(num) ? null : num;
    }
  }
  return cleaned;
}

export async function POST(request) {
  try {
    const { records } = await request.json();

    if (!Array.isArray(records)) {
      return errorResponse('請求格式錯誤：records 必須是陣列', 400);
    }
    if (records.length === 0) {
      return errorResponse('請求格式錯誤：records 不可為空陣列', 400);
    }
    if (records.length > 1000) {
      return errorResponse('超過批次處理上限 1000 筆', 400);
    }

    const cleanRecords = records.map(cleanRecord);
    const repo = await createRepository();
    const results = await repo.batchUpsertFinancialBasics(cleanRecords);

    return successResponse({ success: true, data: results });
  } catch (error) {
    console.error('POST financial-basics/batch-import 錯誤:', error);
    return errorResponse('伺服器錯誤: ' + error.message, 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
