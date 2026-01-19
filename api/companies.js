// Vercel Serverless Function: 取得所有公司
import { getSupabaseClient, handleOptions, successResponse, errorResponse } from './_lib.js';

export async function GET(request) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('companies')
      .select('id, company_name')
      .order('company_name');

    if (error) {
      throw error;
    }

    const companies = data.map(row => ({
      id: row.id,
      name: row.company_name,
    }));

    return successResponse({ companies });
  } catch (error) {
    console.error('取得公司列表失敗:', error);
    return errorResponse('取得公司列表失敗', 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
