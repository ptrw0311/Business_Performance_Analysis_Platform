// Vercel Serverless Function: 損益表匯出 API
// GET: 匯出損益表為 Excel 檔案
import { getSupabaseClient, handleOptions, errorResponse } from '../_lib.js';
import ExcelJS from 'exceljs';

// pl_income_basics 資料表的欄位定義（中文描述）
const COLUMN_DEFINITIONS = [
  { column_name: 'fiscal_year', column_description: '年度' },
  { column_name: 'tax_id', column_description: '統一編號' },
  { column_name: 'company_name', column_description: '公司名稱' },
  { column_name: 'account_item', column_description: '會計科目' },
  { column_name: 'operating_revenue_total', column_description: '營業收入合計' },
  { column_name: 'operating_costs_total', column_description: '營業成本合計' },
  { column_name: 'gross_profit_loss', column_description: '營業毛利(毛損)' },
  { column_name: 'gross_profit_loss_net', column_description: '營業毛利(毛損)淨額' },
  { column_name: 'selling_expenses', column_description: '推銷費用' },
  { column_name: 'general_admin_expenses', column_description: '管理費用' },
  { column_name: 'r_and_d_expenses', column_description: '研究發展費用' },
  { column_name: 'expected_credit_loss_net', column_description: '預期信用減損損失(利益)' },
  { column_name: 'operating_expenses_total', column_description: '營業費用合計' },
  { column_name: 'other_income_expense_net', column_description: '其他收益及費損淨額' },
  { column_name: 'operating_income_loss', column_description: '營業利益(損失)' },
  { column_name: 'interest_income', column_description: '利息收入' },
  { column_name: 'other_income', column_description: '其他收入' },
  { column_name: 'other_gains_losses_net', column_description: '其他利益及損失淨額' },
  { column_name: 'finance_costs_net', column_description: '財務成本淨額' },
  { column_name: 'equity_method_share_net', column_description: '採用權益法認列之關聯企業及合資損益之份額淨額' },
  { column_name: 'nonop_income_expense_total', column_description: '營業外收入及支出合計' },
  { column_name: 'profit_before_tax', column_description: '稅前淨利(淨損)' },
  { column_name: 'income_tax_expense_total', column_description: '所得稅費用(利益)合計' },
  { column_name: 'net_income_cont_ops', column_description: '繼續營業單位本期淨利(淨損)' },
  { column_name: 'net_income', column_description: '本期淨利(淨損)' }
];

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const taxId = url.searchParams.get('taxId');
    const fiscalYear = url.searchParams.get('fiscalYear');

    const supabase = getSupabaseClient();

    // 建構查詢條件
    let query = supabase
      .from('pl_income_basics')
      .select('*')
      .order('fiscal_year', { ascending: false })
      .order('tax_id', { ascending: true });

    if (taxId) {
      query = query.eq('tax_id', taxId);
    }
    if (fiscalYear) {
      query = query.eq('fiscal_year', parseInt(fiscalYear));
    }

    const { data, error } = await query;

    if (error) {
      console.error('查詢損益表失敗:', error);
      return errorResponse('查詢損益表失敗: ' + error.message, 500);
    }

    // 建立 Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('損益表');

    // 第 1 列：中文標題
    const headerRow1 = sheet.addRow(COLUMN_DEFINITIONS.map(c => c.column_description));
    headerRow1.font = { bold: true, size: 12 };
    headerRow1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' }
    };
    headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow1.height = 25;

    // 第 2 列：英文標題
    const headerRow2 = sheet.addRow(COLUMN_DEFINITIONS.map(c => c.column_name));
    headerRow2.font = { italic: true, size: 10, color: { argb: 'FF808080' } };
    headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow2.height = 20;

    // 資料列
    data.forEach(row => {
      const rowData = COLUMN_DEFINITIONS.map(col => {
        const value = row[col.column_name];
        // 處理數值格式
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'number') {
          return value;
        }
        return value;
      });
      sheet.addRow(rowData);
    });

    // 凍結前 2 列
    sheet.views = [{ state: 'frozen', ySplit: 2 }];

    // 設定欄寬
    COLUMN_DEFINITIONS.forEach((col, index) => {
      const width = Math.max(
        col.column_name.length,
        Math.ceil(col.column_description.length / 2)
      ) + 2;
      sheet.getColumn(index + 1).width = Math.min(Math.max(width, 12), 30);
    });

    // 產生檔案
    const buffer = await workbook.xlsx.writeBuffer();

    // 產生檔名
    const now = new Date();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const filename = `財務資料_${timestamp}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      }
    });
  } catch (error) {
    console.error('GET pl-income/export 錯誤:', error);
    return errorResponse('伺服器錯誤: ' + error.message, 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
