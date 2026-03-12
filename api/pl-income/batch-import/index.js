// Vercel Serverless Function: 損益表批次匯入
import { createRepository, handleOptions, successResponse, errorResponse } from '../../_lib.js';

// pl_income_basics 資料表的有效欄位清單
const PL_INCOME_BASICS_COLUMNS = new Set([
  'fiscal_year', 'tax_id', 'company_name', 'account_item',
  'operating_revenue_total', 'operating_costs_total', 'gross_profit_loss', 'gross_profit_loss_net',
  'selling_expenses', 'general_admin_expenses', 'r_and_d_expenses', 'expected_credit_loss_net',
  'operating_expenses_total', 'other_income_expense_net', 'operating_income_loss', 'interest_income',
  'other_income', 'other_gains_losses_net', 'finance_costs_net', 'equity_method_share_net',
  'nonop_income_expense_total', 'profit_before_tax', 'income_tax_expense_total',
  'net_income_cont_ops', 'net_income'
]);

// 不需要數值轉換的文字欄位
const TEXT_FIELDS = new Set(['tax_id', 'company_name', 'account_item']);

function cleanRecord(record) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    if (!PL_INCOME_BASICS_COLUMNS.has(key)) continue;
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
    const results = await repo.batchUpsertPlIncome(cleanRecords);

    return successResponse({ success: true, data: results });
  } catch (error) {
    console.error('POST pl-income/batch-import 錯誤:', error);
    return errorResponse('伺服器錯誤: ' + error.message, 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
