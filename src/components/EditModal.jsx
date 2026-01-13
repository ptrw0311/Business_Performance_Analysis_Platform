import { useState, useEffect } from 'react';

/**
 * EditModal - 編輯/新增財務數據的彈窗組件
 * 支援新增與編輯兩種模式，包含表單驗證
 */
function EditModal({ isOpen, mode, initialValues, companies, onSave, onClose }) {
  const [formData, setFormData] = useState({
    company: '',
    year: '',
    revenue: '',
    profit: '',
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // 當 Modal 開啟或模式變更時，重置表單
  useEffect(() => {
    if (isOpen && mode === 'edit' && initialValues) {
      setFormData({
        company: initialValues.company,
        year: String(initialValues.year),
        revenue: String(initialValues.revenue),
        profit: String(initialValues.profit),
      });
    } else if (isOpen && mode === 'create') {
      setFormData({ company: '', year: '', revenue: '', profit: '' });
    }
    setErrors({});
  }, [isOpen, mode, initialValues]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.company.trim()) {
      newErrors.company = '請輸入公司名稱';
    }

    if (!formData.year.trim()) {
      newErrors.year = '請輸入年份';
    } else {
      const yearNum = parseInt(formData.year);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        newErrors.year = '請輸入有效的年份 (1900-2100)';
      }
    }

    if (!formData.revenue || isNaN(parseInt(formData.revenue))) {
      newErrors.revenue = '請輸入有效的營收';
    }

    if (!formData.profit || isNaN(parseInt(formData.profit))) {
      newErrors.profit = '請輸入有效的淨利';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        company: formData.company.trim(),
        year: formData.year.trim(),
        revenue: parseInt(formData.revenue),
        profit: parseInt(formData.profit),
      });
      // 成功後由父組件關閉 Modal
    } catch (error) {
      alert('儲存失敗: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const title = mode === 'create' ? '➕ 新增財務數據' : '✏️ 編輯財務數據';
  const buttonText = mode === 'create' ? '新增' : '儲存';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="modal-header">
          <h2>{title}</h2>
        </div>

        <div className="modal-body">
          {/* 公司名稱 */}
          <div className="modal-field">
            <label>公司名稱 *</label>
            {mode === 'edit' ? (
              <div style={{
                padding: '12px 14px',
                border: '2px solid var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}>
                {formData.company}
              </div>
            ) : (
              <>
                <select
                  value={formData.company}
                  onChange={(e) => {
                    setFormData({ ...formData, company: e.target.value });
                    setErrors({ ...errors, company: null });
                  }}
                  disabled={isSaving}
                >
                  <option value="">請選擇公司</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.company && <span className="error">{errors.company}</span>}
              </>
            )}
          </div>

          {/* 年份 */}
          <div className="modal-field">
            <label>年份 *</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => {
                setFormData({ ...formData, year: e.target.value });
                setErrors({ ...errors, year: null });
              }}
              disabled={isSaving}
              placeholder="例如: 2025"
              min="1900"
              max="2100"
            />
            {errors.year && <span className="error">{errors.year}</span>}
          </div>

          {/* 營收 */}
          <div className="modal-field">
            <label>營收 (百萬元) *</label>
            <input
              type="number"
              value={formData.revenue}
              onChange={(e) => {
                setFormData({ ...formData, revenue: e.target.value });
                setErrors({ ...errors, revenue: null });
              }}
              disabled={isSaving}
              placeholder="例如: 4468"
            />
            {errors.revenue && <span className="error">{errors.revenue}</span>}
          </div>

          {/* 淨利 */}
          <div className="modal-field">
            <label>稅前淨利 (百萬元) *</label>
            <input
              type="number"
              value={formData.profit}
              onChange={(e) => {
                setFormData({ ...formData, profit: e.target.value });
                setErrors({ ...errors, profit: null });
              }}
              disabled={isSaving}
              placeholder="例如: 143"
            />
            {errors.profit && <span className="error">{errors.profit}</span>}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            disabled={isSaving}
          >
            取消
          </button>
          <button
            className="modal-btn modal-btn-save"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? '儲存中...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
