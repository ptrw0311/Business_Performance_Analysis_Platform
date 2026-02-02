// Vercel Serverless Function: 財務報表單筆資料 CRUD API
// PUT: 更新指定 (taxId, year) 的財務報表資料
// DELETE: 刪除指定 (taxId, year) 的財務報表資料
import { getSupabaseClient, handleOptions, successResponse, errorResponse } from '../../../_lib.js';

export async function PUT(request, { params }) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    // 從路徑取得參數
    const taxId = params.taxId;
    const year = parseInt(params.year);

    // 驗證參數
    if (!taxId || !/^\d{8}$/.test(taxId)) {
      return errorResponse('統一編號格式錯誤', 400);
    }
    if (isNaN(year) || year < 1900 || year > 2100) {
      return errorResponse('年度格式錯誤', 400);
    }

    // 準備更新資料（移除 fiscal_year 和 tax_id，不允許修改主鍵）
    const { fiscal_year, tax_id, ...updateData } = body;

    // 執行更新
    const { data, error } = await supabase
      .from('financial_basics')
      .update(updateData)
      .eq('tax_id', taxId)
      .eq('fiscal_year', year)
      .select();

    if (error) {
      console.error('更新財務報表失敗:', error);
      return errorResponse('更新財務報表失敗: ' + error.message, 500);
    }

    if (!data || data.length === 0) {
      return errorResponse('找不到指定的財務報表資料', 404);
    }

    return successResponse({
      success: true,
      data: data[0],
      message: '財務報表更新成功'
    });
  } catch (error) {
    console.error('PUT financial-basics 錯誤:', error);
    return errorResponse('伺服器錯誤', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = getSupabaseClient();

    // 從路徑取得參數
    const taxId = params.taxId;
    const year = parseInt(params.year);

    // 驗證參數
    if (!taxId || !/^\d{8}$/.test(taxId)) {
      return errorResponse('統一編號格式錯誤', 400);
    }
    if (isNaN(year) || year < 1900 || year > 2100) {
      return errorResponse('年度格式錯誤', 400);
    }

    // 先查詢資料是否存在（用於復原功能）
    const { data: existingData } = await supabase
      .from('financial_basics')
      .select('*')
      .eq('tax_id', taxId)
      .eq('fiscal_year', year)
      .single();

    if (!existingData) {
      return errorResponse('找不到指定的財務報表資料', 404);
    }

    // 執行刪除
    const { error } = await supabase
      .from('financial_basics')
      .delete()
      .eq('tax_id', taxId)
      .eq('fiscal_year', year);

    if (error) {
      console.error('刪除財務報表失敗:', error);
      return errorResponse('刪除財務報表失敗: ' + error.message, 500);
    }

    return successResponse({
      success: true,
      deletedData: existingData,
      message: '財務報表刪除成功'
    });
  } catch (error) {
    console.error('DELETE financial-basics 錯誤:', error);
    return errorResponse('伺服器錯誤', 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
