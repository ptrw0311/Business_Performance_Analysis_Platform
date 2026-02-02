// Vercel Serverless Function: 財務報表批次匯入 API
// POST: 批次匯入財務報表資料（支援 upsert）
import { getSupabaseClient, handleOptions, successResponse, errorResponse } from '../_lib.js';

// financial_basics 資料表的有效欄位清單
const VALID_COLUMNS = new Set([
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

// 驗證單筆資料
function validateRecord(record, index) {
  const errors = [];

  if (record.fiscal_year === null || record.fiscal_year === undefined) {
    errors.push('缺少 fiscal_year');
  }
  if (!record.tax_id) {
    errors.push('缺少 tax_id');
  }

  // 驗證年度格式
  if (record.fiscal_year !== undefined && record.fiscal_year !== null) {
    const year = parseInt(record.fiscal_year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      errors.push('年度格式錯誤');
    }
  }

  // 驗證統一編號格式（8位數字）
  if (record.tax_id) {
    const taxId = String(record.tax_id).trim();
    if (!/^\d{8}$/.test(taxId)) {
      errors.push('統一編號格式錯誤');
    }
  }

  return errors;
}

export async function POST(request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { records, options = {} } = body;

    if (!Array.isArray(records)) {
      return errorResponse('請求格式錯誤：records 必須是陣列', 400);
    }

    if (records.length === 0) {
      return errorResponse('請求格式錯誤：records 不可為空陣列', 400);
    }

    // 限制批次處理筆數
    const maxBatchSize = 1000;
    if (records.length > maxBatchSize) {
      return errorResponse(`超過批次處理上限 ${maxBatchSize} 筆`, 400);
    }

    // 執行結果
    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // 逐一處理每筆資料
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 驗證必要欄位
      const validationErrors = validateRecord(record, i);
      if (validationErrors.length > 0) {
        results.skipped++;
        results.errors.push({
          row: i + 1,
          reason: validationErrors.join('; ')
        });
        continue;
      }

      // 清理資料，只保留有效的欄位
      const cleanRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (VALID_COLUMNS.has(key)) {
          cleanRecord[key] = value;
        }
      }

      // 確保必填欄位存在
      cleanRecord.fiscal_year = parseInt(record.fiscal_year);
      cleanRecord.tax_id = String(record.tax_id).trim();

      // 檢查是否為新增或更新（查詢現有資料）
      const { data: existing, error: queryError } = await supabase
        .from('financial_basics')
        .select('fiscal_year, tax_id')
        .eq('fiscal_year', cleanRecord.fiscal_year)
        .eq('tax_id', cleanRecord.tax_id)
        .maybeSingle();

      if (queryError && queryError.code !== 'PGRST116') {
        results.skipped++;
        results.errors.push({
          row: i + 1,
          reason: '查詢失敗: ' + queryError.message
        });
        continue;
      }

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

    return successResponse({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('POST financial-basics/batch-import 錯誤:', error);
    return errorResponse('伺服器錯誤: ' + error.message, 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
