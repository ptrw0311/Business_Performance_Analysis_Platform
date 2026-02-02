// Vercel Serverless Function: 損益表批次匯入 API
// POST: 批次匯入損益表資料（支援 upsert）
import { getSupabaseClient, handleOptions, successResponse, errorResponse } from '../_lib.js';

// pl_income_basics 資料表的有效欄位清單
const VALID_COLUMNS = new Set([
  'fiscal_year', 'tax_id', 'company_name', 'account_item',
  'operating_revenue_total', 'operating_costs_total', 'gross_profit_loss', 'gross_profit_loss_net',
  'selling_expenses', 'general_admin_expenses', 'r_and_d_expenses', 'expected_credit_loss_net',
  'operating_expenses_total', 'other_income_expense_net', 'operating_income_loss', 'interest_income',
  'other_income', 'other_gains_losses_net', 'finance_costs_net', 'equity_method_share_net',
  'nonop_income_expense_total', 'profit_before_tax', 'income_tax_expense_total',
  'net_income_cont_ops', 'net_income'
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
        .from('pl_income_basics')
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

    return successResponse({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('POST pl-income/batch-import 錯誤:', error);
    return errorResponse('伺服器錯誤: ' + error.message, 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
