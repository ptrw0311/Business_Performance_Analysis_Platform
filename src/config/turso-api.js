// Turso 資料庫連線設定
// 注意: 環境變數在 Vercel 中設定，本地開發使用 .env 檔案

export const tursoConfig = {
  // 從環境變數取得資料庫 URL 和 Auth Token
  url: import.meta.env.VITE_TURSO_DATABASE_URL || '',
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || '',

  // 檢查設定是否完整
  isValid() {
    return !!(this.url && this.authToken);
  },

  // 取得完整設定
  getConfig() {
    if (!this.isValid()) {
      console.warn('Turso 設定不完整，請檢查環境變數');
    }
    return {
      url: this.url,
      authToken: this.authToken,
    };
  },
};

export default tursoConfig;
