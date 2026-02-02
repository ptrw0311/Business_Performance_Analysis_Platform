// Vercel Serverless Function: 財務報表匯出 API
// GET: 匯出財務報表為 Excel 檔案
import { getSupabaseClient, handleOptions, errorResponse } from '../_lib.js';
import ExcelJS from 'exceljs';

// financial_basics 資料表的欄位定義（中文描述）
const COLUMN_DEFINITIONS = [
  { column_name: 'fiscal_year', column_description: '年度' },
  { column_name: 'tax_id', column_description: '統一編號' },
  { column_name: 'company_name', column_description: '公司名稱' },
  { column_name: 'account_item', column_description: '會計科目' },
  { column_name: 'cash_equivalents', column_description: '現金及約當現金' },
  { column_name: 'fvtpl_assets_current', column_description: '透過損益按公允價值衡量之金融資產-流動' },
  { column_name: 'fvoci_assets_current', column_description: '透過其他綜合損益按公允價值衡量之金融資產-流動' },
  { column_name: 'amortized_assets_current', column_description: '按攤銷後成本衡量之金融資產-流動' },
  { column_name: 'hedging_assets_current', column_description: '避險之金融資產-流動' },
  { column_name: 'contract_assets_current', column_description: '合約資產-流動' },
  { column_name: 'notes_receivable_net', column_description: '應收票據淨額' },
  { column_name: 'ar_net', column_description: '應收帳款淨額' },
  { column_name: 'ar_related_net', column_description: '應收帳款-關係人淨額' },
  { column_name: 'other_receivables_net', column_description: '其他應收款淨額' },
  { column_name: 'current_tax_assets', column_description: '本期所得稅資產' },
  { column_name: 'inventory', column_description: '存貨' },
  { column_name: 'prepayments', column_description: '預付款項' },
  { column_name: 'assets_held_for_sale_net', column_description: '待出售非流動資產(或處分群組)淨額' },
  { column_name: 'other_fin_assets_current', column_description: '其他金融資產-流動' },
  { column_name: 'other_current_assets', column_description: '其他流動資產' },
  { column_name: 'total_current_assets', column_description: '流動資產合計' },
  { column_name: 'fvtpl_assets_noncurrent', column_description: '透過損益按公允價值衡量之金融資產-非流動' },
  { column_name: 'fvoci_assets_noncurrent', column_description: '透過其他綜合損益按公允價值衡量之金融資產-非流動' },
  { column_name: 'amortized_assets_noncurrent', column_description: '按攤銷後成本衡量之金融資產-非流動' },
  { column_name: 'contract_assets_noncurrent', column_description: '合約資產-非流動' },
  { column_name: 'equity_method_investments', column_description: '採用權益法之投資' },
  { column_name: 'ppe', column_description: '不動產、廠房及設備' },
  { column_name: 'right_of_use_assets', column_description: '使用權資產' },
  { column_name: 'investment_properties_net', column_description: '投資性不動產淨額' },
  { column_name: 'intangible_assets', column_description: '無形資產' },
  { column_name: 'deferred_tax_assets', column_description: '遞延所得稅資產' },
  { column_name: 'other_noncurrent_assets', column_description: '其他非流動資產' },
  { column_name: 'total_noncurrent_assets', column_description: '非流動資產合計' },
  { column_name: 'total_assets', column_description: '資產總額' },
  { column_name: 'prepayments_for_equip', column_description: '預付設備款' },
  { column_name: 'guarantee_deposits_out', column_description: '存出保證金' },
  { column_name: 'short_term_borrowings', column_description: '短期借款' },
  { column_name: 'short_term_notes_payable', column_description: '應付短期票券' },
  { column_name: 'financial_liabilities_at_fair_value_through_profit_or_loss_curr', column_description: '透過損益按公允價值衡量之金融負債－流動' },
  { column_name: 'hedging_liabilities_current', column_description: '避險之金融負債-流動' },
  { column_name: 'contract_liabilities_current', column_description: '合約負債-流動' },
  { column_name: 'notes_payable', column_description: '應付票據' },
  { column_name: 'ap', column_description: '應付帳款' },
  { column_name: 'ap_related', column_description: '應付帳款-關係人' },
  { column_name: 'other_payables', column_description: '其他應付款' },
  { column_name: 'income_tax_payable', column_description: '本期所得稅負債' },
  { column_name: 'provisions_current', column_description: '負債準備-流動' },
  { column_name: 'lease_liabilities_current', column_description: '租賃負債-流動' },
  { column_name: 'other_current_liabilities', column_description: '其他流動負債' },
  { column_name: 'total_current_liabilities', column_description: '流動負債合計' },
  { column_name: 'contract_liabilities_noncurrent', column_description: '合約負債-非流動' },
  { column_name: 'bonds_payable', column_description: '應付公司債' },
  { column_name: 'long_term_borrowings', column_description: '長期借款' },
  { column_name: 'provisions_noncurrent', column_description: '負債準備-非流動' },
  { column_name: 'deferred_tax_liabilities', column_description: '遞延所得稅負債' },
  { column_name: 'lease_liabilities_noncurrent', column_description: '租賃負債-非流動' },
  { column_name: 'other_noncurrent_liabilities', column_description: '其他非流動負債' },
  { column_name: 'total_noncurrent_liabilities', column_description: '非流動負債合計' },
  { column_name: 'guarantee_deposits_in', column_description: '存入保證金' },
  { column_name: 'total_liabilities', column_description: '負債總額' },
  { column_name: 'common_stock', column_description: '普通股股本' },
  { column_name: 'total_capital_stock', column_description: '股本合計' },
  { column_name: 'capital_reserves', column_description: '資本公積合計' },
  { column_name: 'legal_reserves', column_description: '法定盈餘公積' },
  { column_name: 'special_reserves', column_description: '特別盈餘公積' },
  { column_name: 'retained_earnings_unappropriated', column_description: '未分配盈餘(或待彌補虧損)' },
  { column_name: 'total_retained_earnings', column_description: '保留盈餘合計' },
  { column_name: 'other_equity', column_description: '其他權益合計' },
  { column_name: 'treasury_stock', column_description: '庫藏股票' },
  { column_name: 'equity_attr_parent', column_description: '歸屬於母公司業主之權益合計' },
  { column_name: 'nci', column_description: '非控制權益' },
  { column_name: 'total_equity', column_description: '權益總額' },
  { column_name: 'liabilities_equity_total', column_description: '負債及權益總計' },
  { column_name: 'shares_to_be_cancelled', column_description: '待註銷股本股數(單位:股)' },
  { column_name: 'advance_receipts_shares', column_description: '預收股款(權益項下)之約當發行股數(單位:股)' },
  { column_name: 'treasury_shares_held', column_description: '母公司暨子公司所持有之母公司庫藏股股數(單位:股)' }
];

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const taxId = url.searchParams.get('taxId');
    const fiscalYear = url.searchParams.get('fiscalYear');

    const supabase = getSupabaseClient();

    // 建構查詢條件
    let query = supabase
      .from('financial_basics')
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
      console.error('查詢財務報表失敗:', error);
      return errorResponse('查詢財務報表失敗: ' + error.message, 500);
    }

    // 建立 Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('財務報表');

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
    console.error('GET financial-basics/export 錯誤:', error);
    return errorResponse('伺服器錯誤: ' + error.message, 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}
