// Vercel Serverless Function: 取得特定公司財務資料 (使用 query string)
import { getSupabaseClient, handleOptions, successResponse, errorResponse, convertToMillions } from '../_lib.js';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const company = url.searchParams.get('company');

    if (!company) {
      return errorResponse('缺少 company 參數', 400);
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('pl_income_basics')
      .select('fiscal_year, operating_revenue_total, profit_before_tax')
      .eq('company_name', company)
      .order('fiscal_year');

    if (error) {
      throw error;
    }

    const labels = [];
    const revenue = [];
    const profit = [];

    data.forEach(row => {
      labels.push(String(row.fiscal_year));
      revenue.push(convertToMillions(row.operating_revenue_total));
      profit.push(convertToMillions(row.profit_before_tax));
    });

    return successResponse({
      company: company,
      data: { labels, revenue, profit },
    });
  } catch (error) {
    console.error('取得財務資料失敗:', error);
    return errorResponse('取得財務資料失敗', 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
