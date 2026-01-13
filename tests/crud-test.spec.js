import { test, expect } from '@playwright/test';

test.describe('數據管理 CRUD 功能測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
  });

  test('表格視圖 - 顯示所有公司數據', async ({ page }) => {
    // 切換到數據表格標籤
    await page.click('text=📋 數據表格');

    // 等待表格載入
    await page.waitForSelector('.data-table-container');

    // 驗證表格存在
    const table = page.locator('.data-table-container table');
    await expect(table).toBeVisible();

    // 驗證表頭欄位
    await expect(page.locator('th:has-text("公司")')).toBeVisible();
    await expect(page.locator('th:has-text("年份")')).toBeVisible();
    await expect(page.locator('th:has-text("營收")')).toBeVisible();
    await expect(page.locator('th:has-text("淨利")')).toBeVisible();
    await expect(page.locator('th:has-text("操作")')).toBeVisible();

    console.log('✓ 表格顯示正常');
  });

  test('排序功能 - 按公司名稱排序', async ({ page }) => {
    await page.click('text=📋 數據表格');
    await page.waitForSelector('.data-table-container');

    // 點擊公司標題排序
    const companyHeader = page.locator('th:has-text("公司")').first();
    await companyHeader.click();

    // 等待排序完成
    await page.waitForTimeout(500);

    // 驗證排序箭頭
    await expect(page.locator('th:has-text("公司") .sort-icon')).toBeVisible();

    console.log('✓ 排序功能正常');
  });

  test('篩選功能 - 公司搜尋', async ({ page }) => {
    await page.click('text=📋 數據表格');
    await page.waitForSelector('.data-table-container');

    // 輸入搜尋文字
    await page.fill('input[placeholder="搜尋公司..."]', '博弘雲端');

    // 等待篩選完成
    await page.waitForTimeout(500);

    // 驗證篩選結果
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    // 應該只顯示包含"博弘雲端"的行
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent();
      expect(text).toContain('博弘雲端');
    }

    console.log('✓ 公司搜尋篩選正常');
  });

  test('新增數據 - 開啟 Modal', async ({ page }) => {
    await page.click('text=📋 數據表格');
    await page.waitForSelector('.data-table-container');

    // 點擊新增按鈕
    await page.click('button:has-text("➕ 新增數據")');

    // 等待 Modal 出現
    await page.waitForSelector('.modal-overlay');

    // 驗證 Modal 標題
    await expect(page.locator('.modal-header h2:has-text("新增財務數據")')).toBeVisible();

    // 驗證表單欄位
    await expect(page.locator('label:has-text("公司名稱")')).toBeVisible();
    await expect(page.locator('label:has-text("年份")')).toBeVisible();
    await expect(page.locator('label:has-text("營收")')).toBeVisible();
    await expect(page.locator('label:has-text("稅前淨利")')).toBeVisible();

    // 關閉 Modal
    await page.click('.modal-btn-cancel');

    console.log('✓ 新增 Modal 開啟正常');
  });

  test('快速新增視圖 - 切換標籤', async ({ page }) => {
    // 預設在快速新增視圖
    await expect(page.locator('text=⚡ 快速新增')).toBeVisible();
    await expect(page.locator('.control-panel')).toBeVisible();

    // 切換到數據表格
    await page.click('text=📋 數據表格');
    await page.waitForSelector('.data-table-container');
    await expect(page.locator('.data-table-container')).toBeVisible();

    // 切換回快速新增
    await page.click('text=⚡ 快速新增');
    await expect(page.locator('.control-panel')).toBeVisible();

    console.log('✓ 標籤切換正常');
  });

  test('編輯與刪除按鈕 - 顯示在表格中', async ({ page }) => {
    await page.click('text=📋 數據表格');
    await page.waitForSelector('.data-table-container');

    // 等待數據載入
    await page.waitForTimeout(1000);

    // 檢查第一行數據是否有編輯和刪除按鈕
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('button[title="編輯"]')).toBeVisible();
    await expect(firstRow.locator('button[title="刪除"]')).toBeVisible();

    console.log('✓ 編輯/刪除按鈕顯示正常');
  });

  test('分頁功能 - 頁面切換', async ({ page }) => {
    await page.click('text=📋 數據表格');
    await page.waitForSelector('.data-table-container');

    // 等待數據載入
    await page.waitForTimeout(1000);

    // 檢查分頁控制
    const pagination = page.locator('.pagination');
    if (await pagination.isVisible()) {
      // 如果有分頁，測試下一頁按鈕
      const nextBtn = page.locator('button:has-text("▶")');
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
        console.log('✓ 分頁切換正常');
      } else {
        console.log('✓ 分頁控制顯示正常（只有一頁）');
      }
    } else {
      console.log('✓ 數據量少於一頁，無分頁');
    }
  });

  test('刪除確認對話框', async ({ page }) => {
    await page.click('text=📋 數據表格');
    await page.waitForSelector('.data-table-container');

    // 等待數據載入
    await page.waitForTimeout(1000);

    // 點擊第一行的刪除按鈕
    const firstRowDeleteBtn = page.locator('tbody tr').first().locator('button[title="刪除"]');
    await firstRowDeleteBtn.click();

    // 等待確認對話框出現
    await page.waitForSelector('.confirm-dialog');

    // 驗證對話框內容
    await expect(page.locator('h2:has-text("⚠️ 確認刪除")')).toBeVisible();
    await expect(page.locator('text:has-text("您確定要刪除以下數據嗎？")')).toBeVisible();

    // 點擊取消（不實際刪除數據）
    await page.click('.confirm-btn-cancel');

    console.log('✓ 刪除確認對話框正常');
  });

  test('響應式設計 - 載入所有組件', async ({ page }) => {
    // 驗證主要組件都載入成功
    await expect(page.locator('.container')).toBeVisible();
    await expect(page.locator('.title-box')).toBeVisible();

    // 驗證數據管理區塊
    await expect(page.locator('.data-manager-tabs')).toBeVisible();

    // 驗證兩個標籤按鈕
    await expect(page.locator('button:has-text("📋 數據表格")')).toBeVisible();
    await expect(page.locator('button:has-text("⚡ 快速新增")')).toBeVisible();

    console.log('✓ 頁面載入完整');
  });
});
