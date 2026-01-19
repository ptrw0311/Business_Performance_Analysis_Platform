// Vercel Serverless Function: 取得所有公司所有財務數據
import { getSupabaseClient, handleOptions, successResponse, errorResponse, convertToMillions } from '../_lib.js';

export async function GET(request) {
  try {
    const supabase = getSupabaseClient();

    // 查詢所有財務數據，並關聯公司資料
    const { data: financialData, error } = await supabase
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

    if (error) {
      throw error;
    }

    // 合併並轉換數據
    const result = financialData.map(row => {
      const companyId = row.companies?.id;
      const companyName = row.companies?.company_name;

      return {
        company_id: companyId,
        company: companyName || '未知公司',
        year: row.fiscal_year,
        revenue: convertToMillions(row.operating_revenue_total),
        profit: convertToMillions(row.profit_before_tax),
      };
    }).sort((a, b) => a.company.localeCompare(b.company) || b.year - a.year);

    return successResponse({ data: result });
  } catch (error) {
    console.error('取得所有數據失敗:', error);
    return errorResponse('取得所有數據失敗', 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
