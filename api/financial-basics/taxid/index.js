// Vercel Serverless Function: 取得公司統一編號
// GET: 根據公司名稱查詢統一編號
import { createRepository, handleOptions, successResponse, errorResponse } from '../_lib.js';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const companyName = url.searchParams.get('company');

    // 1. 驗證參數
    if (!companyName) {
      return errorResponse('缺少必填參數: company', 400);
    }

    // 2. 查詢公司的 tax_id（從 financial_basics 表）
    const repo = await createRepository();
    const financialData = await repo.getFinancialBasics({ companyName });

    if (!financialData || financialData.length === 0) {
      return errorResponse('找不到該公司的財務資料', 404);
    }

    // 使用第一筆資料的 tax_id（同公司不同年度的 tax_id 相同）
    const taxId = financialData[0].tax_id;

    // 3. 回傳結果
    return successResponse({
      success: true,
      data: {
        company: companyName,
        tax_id: taxId
      }
    });

  } catch (error) {
    console.error('查詢統一編號失敗:', error);
    return errorResponse('查詢統一編號失敗: ' + error.message, 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
