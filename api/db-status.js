// Vercel Serverless Function: 資料庫狀態 API（UAT 暫時功能）
import { createRepository, handleOptions, successResponse } from '../_lib.js';

export async function GET() {
  try {
    const repo = await createRepository();
    const status = await repo.getDatabaseStatus();

    return successResponse(status);
  } catch (error) {
    console.error('取得資料庫狀態失敗:', error);
    return successResponse({
      databaseType: 'unknown',
      status: 'failed',
      message: `連線失敗: ${error.message}`
    });
  }
}

export async function OPTIONS() {
  return handleOptions();
}
