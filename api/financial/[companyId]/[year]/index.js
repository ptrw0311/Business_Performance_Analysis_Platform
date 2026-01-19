// Vercel Serverless Function: 刪除特定財務數據
// 路由: /api/financial/:companyId/:year
// 注意：Supabase 模式下此功能已停用，資料庫為唯讀
import { handleOptions, successResponse, errorResponse } from '../../../../_lib.js';

export async function DELETE(request) {
  try {
    // Supabase 模式下不支援刪除功能（資料庫為唯讀）
    return errorResponse('Supabase 模式下不支援刪除功能，資料庫為唯讀', 403);
  } catch (error) {
    console.error('刪除財務數據失敗:', error);
    return errorResponse('刪除財務數據失敗', 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
